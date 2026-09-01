export interface DiagnosticRecord {
  schemaVersion: 1;
  recordedAt: string;
  kind: string;
  errorClass: string;
  fingerprint: string;
  route: string;
  platform: 'web' | 'android' | 'ios';
  appVersion: string;
  releaseRevision: string;
}

export declare function recordDiagnostic(
  kind: string,
  error: unknown,
  options?: { storage?: Storage; now?: Date; appVersion?: string; releaseRevision?: string }
): DiagnosticRecord | null;
export declare function createDiagnosticsExport(storage?: Storage): {
  product: 'LifeStreak';
  diagnosticSchemaVersion: 1;
  exportedAt: string;
  privacy: string;
  records: DiagnosticRecord[];
};
export declare function clearDiagnostics(storage?: Storage): void;
