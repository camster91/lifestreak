import { describe, expect, it } from 'vitest';
import { hasDuplicateJsonObjectKeys, parseJsonWithoutDuplicateKeys } from './strictJson';

describe('strict JSON parsing', () => {
  it('detects duplicates at any object depth', () => {
    expect(hasDuplicateJsonObjectKeys('{"same":1,"same":2}')).toBe(true);
    expect(hasDuplicateJsonObjectKeys('{"nested":{"same":1,"same":2}}')).toBe(true);
  });

  it('allows the same key in different objects and repeated array values', () => {
    expect(hasDuplicateJsonObjectKeys('{"left":{"same":1},"right":{"same":2}}')).toBe(false);
    expect(hasDuplicateJsonObjectKeys('{"values":["same","same"],"escaped\\"key":1}')).toBe(false);
  });

  it('refuses duplicate keys before a caller can use JSON.parse last-value semantics', () => {
    expect(() => parseJsonWithoutDuplicateKeys('{"enabled":true,"enabled":false}')).toThrow(
      /duplicate object keys/i
    );
  });

  it('retains ordinary JSON.parse validation', () => {
    expect(parseJsonWithoutDuplicateKeys('{"enabled":true}')).toEqual({ enabled: true });
    expect(() => parseJsonWithoutDuplicateKeys('{broken')).toThrow();
  });
});
