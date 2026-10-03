import { describe, expect, it } from 'vitest';
import {
  dependabotEcosystems,
  hasReadOnlyWorkflowDefault,
} from '../../scripts/supply-chain-config.mjs';

describe('workflow default permissions', () => {
  it('accepts read-only defaults with LF and CRLF', () => {
    const source = 'permissions:\n  contents: read\njobs:\n  verify:\n';
    expect(hasReadOnlyWorkflowDefault(source)).toBe(true);
    expect(hasReadOnlyWorkflowDefault(source.replaceAll('\n', '\r\n'))).toBe(true);
  });

  it('rejects job-only, missing and writable defaults', () => {
    expect(hasReadOnlyWorkflowDefault('jobs:\n  permissions:\n    contents: read\n')).toBe(false);
    expect(hasReadOnlyWorkflowDefault('permissions:\n  contents: write\njobs:\n')).toBe(false);
    expect(hasReadOnlyWorkflowDefault('jobs:\n')).toBe(false);
  });
});

describe('Dependabot ecosystem coverage', () => {
  it('accepts double-quoted, single-quoted and bare YAML values', () => {
    const source = `updates:
  - package-ecosystem: "npm"
  - package-ecosystem: 'github-actions'
  - package-ecosystem: docker # supported
`;
    expect([...dependabotEcosystems(source)]).toEqual(['npm', 'github-actions', 'docker']);
    expect([...dependabotEcosystems(source.replaceAll('\n', '\r\n'))]).toEqual([
      'npm',
      'github-actions',
      'docker',
    ]);
  });

  it('rejects commented, mismatched and unrelated values', () => {
    const source = `# - package-ecosystem: npm
  - package-ecosystem: "docker'
  - description: package-ecosystem: github-actions
`;
    expect([...dependabotEcosystems(source)]).toEqual([]);
  });
});
