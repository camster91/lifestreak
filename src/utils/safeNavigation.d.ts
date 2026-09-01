export type UrlValidationResult = { ok: true; href: string } | { ok: false; reason: string };

export type OllamaUrlValidationResult = { ok: true; url: URL } | { ok: false; reason: string };

export declare function sanitizeSameOriginPath(url: unknown, origin?: string): string;
export declare function validateExternalUrl(url: unknown): UrlValidationResult;
export declare function validateOllamaBaseUrl(baseUrl: unknown): OllamaUrlValidationResult;
