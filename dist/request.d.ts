export declare const SYSTEM_IDENTITY_PREFIX = "You are Claude Code, Anthropic's official CLI for Claude.";
export declare function getCliVersion(): string;
export declare function getUserAgent(): string;
export declare function getStainlessHeaders(): Record<string, string>;
export declare function buildRequestUrl(input: RequestInfo | URL): string | URL;
export declare const sessionId: `${string}-${string}-${string}-${string}-${string}`;
type FetchFn = typeof fetch;
export declare function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries?: number, fetchImpl?: FetchFn): Promise<Response>;
/**
 * Applies the Claude Code request identity to an existing Headers object, in
 * place: Bearer auth, merged anthropic-beta list, client identification and
 * Stainless SDK headers. Any x-api-key header is removed.
 *
 * Shared by the V1 fetch wrapper (via buildRequestHeaders) and the V2
 * http.request hook.
 */
export declare function applyClaudeCodeHeaders(headers: Headers, accessToken: string, modelId?: string, excludedBetas?: Set<string>): Headers;
export declare function buildRequestHeaders(input: RequestInfo | URL, init: RequestInit, accessToken: string, modelId?: string, excludedBetas?: Set<string>): Headers;
export {};
//# sourceMappingURL=request.d.ts.map