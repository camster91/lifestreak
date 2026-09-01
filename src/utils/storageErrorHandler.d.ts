export declare function createStorageErrorHandler(storeName: string): (error: any) => void;
export declare const STORAGE_STATUS_EVENT: string;
export declare function getStorageRecovery(storeName: string): unknown | null;
export declare function getLatestStorageFailure(): unknown | null;
export declare function exportStorageRecovery(storeName: string): string | null;
export declare function retryStorageWrite(storeName: string): boolean;
export declare function clearStorageRecoveryForTests(): void;
export declare function createSafeStorage(storeName: string): {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};
