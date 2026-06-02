import { type ClaudeCredentials, type ClaudeAccount } from "./keychain.ts";
export type { ClaudeCredentials } from "./keychain.ts";
export type { ClaudeAccount } from "./keychain.ts";
export declare function initAccounts(accounts: ClaudeAccount[]): void;
export declare function getAccounts(): ClaudeAccount[];
export declare function setActiveAccountSource(source: string): void;
export declare function refreshAccountsList(): ClaudeAccount[];
export declare function loadPersistedAccountSource(): string | null;
export declare function saveAccountSource(source: string): void;
export declare function syncAuthJson(creds: ClaudeCredentials): void;
export declare const OAUTH_TOKEN_URL = "https://claude.ai/v1/oauth/token";
export declare const OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
/**
 * Parse a raw OAuth token response into ClaudeCredentials.
 * Returns null if the response is missing a valid access_token.
 * Defaults expires_in to 36000s (10h) to match observed Claude token lifetime.
 */
export declare function parseOAuthResponse(raw: string, currentRefreshToken: string, now?: number): ClaudeCredentials | null;
export declare function refreshViaOAuth(refreshToken: string): ClaudeCredentials | null;
export declare function refreshIfNeeded(account?: ClaudeAccount): ClaudeCredentials | null;
/**
 * Returns the active account's credentials for auth.json sync purposes.
 * Unlike getCachedCredentials(), this does NOT trigger a refresh.
 * It returns the account's current in-memory credentials if they're still valid.
 * Returns null if no account or credentials are expired.
 */
export declare function getCredentialsForSync(): ClaudeCredentials | null;
export declare function getCachedCredentials(): ClaudeCredentials | null;
//# sourceMappingURL=credentials.d.ts.map