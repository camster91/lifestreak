export interface PortableBackup {
  product: 'LifeStreak';
  formatVersion: 1;
  exportedAt: string;
  storeSchemas: Record<string, number>;
  stores: Record<string, unknown>;
}

export declare function createPortableBackup(storage?: Storage): PortableBackup;
export declare function validatePortableBackup(
  payload: unknown
): { ok: true; sanitized: Record<string, unknown> } | { ok: false; reason: string };
export declare function restorePortableBackup(
  payload: unknown,
  storage?: Storage
): { recoveryKey: string; importedKeys: string[] };
