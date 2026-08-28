export function hasDuplicateJsonObjectKeys(raw: string): boolean;
// Mirrors JSON.parse at the legacy call sites; validators narrow the result before mutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJsonWithoutDuplicateKeys(raw: string): any;
