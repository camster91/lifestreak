export function hasReadOnlyWorkflowDefault(source) {
  const normalized = source.replace(/\r\n/g, '\n');
  const jobsIndex = normalized.search(/^jobs:/m);
  const permissionsIndex = normalized.search(/^permissions:\n\s+contents:\s+read\s*(?:#.*)?$/m);
  return permissionsIndex >= 0 && (jobsIndex < 0 || permissionsIndex < jobsIndex);
}

export function dependabotEcosystems(source) {
  const entries = source.replace(/\r\n/g, '\n').matchAll(
    /^\s*-\s+package-ecosystem:\s*(?:"([^"]+)"|'([^']+)'|([a-z0-9-]+))\s*(?:#.*)?$/gm
  );
  return new Set([...entries].map((entry) => entry[1] || entry[2] || entry[3]));
}
