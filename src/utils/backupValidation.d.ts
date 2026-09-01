export declare const BACKUP_STORAGE_KEYS: readonly string[];
export declare const MAX_BACKUP_BYTES: number;

export type BackupValidationResult =
  { ok: true; sanitized: Record<string, unknown> } | { ok: false; reason: string };

export declare function unwrapPersistPayload(value: unknown): Record<string, unknown> | null;
export declare function validateBackupStoreData(storeData: unknown): BackupValidationResult;
export declare function validateLegacyBackup(storeData: unknown): BackupValidationResult;
