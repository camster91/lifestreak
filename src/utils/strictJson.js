export function hasDuplicateJsonObjectKeys(raw) {
  const stack = [];
  let index = 0;
  const skipWhitespace = () => {
    while (/\s/.test(raw[index] || '')) index += 1;
  };

  while (index < raw.length) {
    const character = raw[index];
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < raw.length) {
        if (raw[index] === '\\') {
          index += 2;
          continue;
        }
        if (raw[index] === '"') break;
        index += 1;
      }
      if (index >= raw.length) return false;
      const end = index;
      index += 1;
      const context = stack.at(-1);
      if (context?.type === 'object' && context.expectingKey) {
        skipWhitespace();
        if (raw[index] === ':') {
          const key = JSON.parse(raw.slice(start, end + 1));
          if (context.keys.has(key)) return true;
          context.keys.add(key);
          context.expectingKey = false;
        }
      }
      continue;
    }
    if (character === '{') {
      stack.push({ type: 'object', keys: new Set(), expectingKey: true });
    } else if (character === '[') {
      stack.push({ type: 'array' });
    } else if (character === '}' || character === ']') {
      stack.pop();
    } else if (character === ',') {
      const context = stack.at(-1);
      if (context?.type === 'object') context.expectingKey = true;
    }
    index += 1;
  }
  return false;
}

export function parseJsonWithoutDuplicateKeys(raw) {
  const parsed = JSON.parse(raw);
  if (hasDuplicateJsonObjectKeys(raw)) {
    throw new Error('The JSON contains duplicate object keys and cannot be interpreted safely.');
  }
  return parsed;
}
