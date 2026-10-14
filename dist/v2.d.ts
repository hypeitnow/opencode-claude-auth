import { type ClaudeAccount } from "./keychain.ts";
import { type ClaudeCredentials } from "./credentials.ts";
import { buildAuthorizationUrl, exchangeCode, parseCallback, refreshTokens } from "./oauth.ts";
import type { V2PluginDefinition } from "./v2-types.ts";
export type { V2Context, V2PluginDefinition } from "./v2-types.ts";
/**
 * OpenCode V2 implementation of the plugin.
 *
 * V1 hooked a custom `fetch` into the provider's `auth` loader and synced
 * OpenCode's `auth.json`. V2 splits those concerns:
 *
 *  - the host stores and refreshes the credential (we register two OAuth
 *    login methods on the `anthropic` integration, each with a `refresh`);
 *  - the host already authenticates OAuth credentials with a Bearer header;
 *  - this plugin adds the Claude Code specifics through session hooks:
 *    identity system prompt, request headers/body, response stream
 *    transform and the long-context beta / 401 retries.
 */
export declare const V2_PLUGIN_ID = "opencode-claude-auth";
export declare const PROVIDER_ID = "anthropic";
export declare const METHOD_CLAUDE_CODE = "claude-code";
export declare const METHOD_OAUTH_FALLBACK = "claude-oauth";
export interface V2Deps {
    readAllClaudeAccounts: () => ClaudeAccount[];
    refreshAccountsList: () => ClaudeAccount[];
    initAccounts: (accounts: ClaudeAccount[]) => void;
    getCachedCredentials: () => ClaudeCredentials | null;
    invalidateCredentialCache: () => void;
    setActiveAccountSource: (source: string) => void;
    loadPersistedAccountSource: () => string | null;
    saveAccountSource: (source: string) => void;
    buildAuthorizationUrl: typeof buildAuthorizationUrl;
    exchangeCode: typeof exchangeCode;
    parseCallback: typeof parseCallback;
    refreshTokens: typeof refreshTokens;
    fetch: typeof fetch;
}
export declare function createClaudeAuthV2(overrides?: Partial<V2Deps>): V2PluginDefinition;
//# sourceMappingURL=v2.d.ts.map