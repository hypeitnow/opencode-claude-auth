// OAuth 2.0 + PKCE flow for Anthropic's platform console.
// Ported from ex-machina/opencode-anthropic-auth to add a fallback auth
// method: when the raw `sk-ant-` Keychain key is rejected by Anthropic's
// API (typical for org-locked accounts where direct console API keys are
// unavailable), the plugin can prompt the user to authorize via the
// `org:create_api_key` / `user:inference` OAuth flow. The resulting
// {access, refresh, expires} triple is what Anthropic accepts.
//
// Two authorisation modes:
//   - "console": full org scope, can create API keys (default for fallback)
//   - "max":     claude.ai Pro/Max subscription
//
// Tokens are exchanged at platform.claude.com/v1/oauth/token. The user
// pastes the callback URL (or just the `code#state` pair) into opencode's
// auth prompt, and the plugin exchanges it for the access/refresh pair.
import { generatePKCE } from "./pkce.js";
import { log } from "./logger.js";
export const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const AUTHORIZE_URLS = {
    console: "https://platform.claude.com/oauth/authorize",
    max: "https://claude.ai/oauth/authorize",
};
const CODE_CALLBACK_URL = "https://platform.claude.com/oauth/code/callback";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const OAUTH_SCOPES = [
    "org:create_api_key",
    "user:profile",
    "user:inference",
    "user:developer",
    "user:voice",
    "user:sessions:claude_code",
    "user:mcp_servers",
    "user:file_upload",
    "org:service_key_inference",
    "workspace:developer",
];
function generateState() {
    return crypto.randomUUID().replace(/-/g, "");
}
function parseCallbackInput(input) {
    const trimmed = input.trim();
    try {
        const url = new URL(trimmed);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (code && state)
            return { code, state };
    }
    catch {
        // Not a URL; try legacy formats below.
    }
    const hashSplits = trimmed.split("#");
    if (hashSplits.length === 2 && hashSplits[0] && hashSplits[1]) {
        return { code: hashSplits[0], state: hashSplits[1] };
    }
    const params = new URLSearchParams(trimmed);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state)
        return { code, state };
    return null;
}
export async function exchangeCode(callback, verifier, redirectUri, expectedState) {
    if (expectedState && callback.state !== expectedState) {
        log("oauth_state_mismatch", { expected: expectedState, got: callback.state });
        return {
            type: "failed",
            reason: `state mismatch: expected ${expectedState}, got ${callback.state}`,
        };
    }
    let response;
    try {
        response = await fetch(TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "User-Agent": "axios/1.13.6",
            },
            body: JSON.stringify({
                code: callback.code,
                state: callback.state,
                grant_type: "authorization_code",
                client_id: CLIENT_ID,
                redirect_uri: redirectUri,
                code_verifier: verifier,
            }),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log("oauth_exchange_network_error", { error: message });
        return { type: "failed", reason: `network error: ${message}` };
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        log("oauth_exchange_failed", { status: response.status, body });
        let parsedError = null;
        try {
            const json = JSON.parse(body);
            const stringify = (v) => {
                if (typeof v === "string")
                    return v;
                if (v == null)
                    return null;
                if (typeof v === "object")
                    return JSON.stringify(v);
                return String(v);
            };
            parsedError =
                stringify(json.error_description) ?? stringify(json.error) ?? stringify(json.message) ?? null;
        }
        catch {
            // body wasn't JSON
        }
        const reason = parsedError
            ? `HTTP ${response.status}: ${parsedError}`
            : `HTTP ${response.status} (body=${body.slice(0, 500) || "(empty)"})`;
        return { type: "failed", reason };
    }
    const json = (await response.json());
    return {
        type: "success",
        access: json.access_token,
        refresh: json.refresh_token,
        expires: Date.now() + json.expires_in * 1000,
    };
}
export async function refreshTokens(refresh) {
    let response;
    try {
        response = await fetch(TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/plain, */*",
                "User-Agent": "axios/1.13.6",
            },
            body: JSON.stringify({
                grant_type: "refresh_token",
                refresh_token: refresh,
                client_id: CLIENT_ID,
            }),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log("oauth_refresh_network_error", { error: message });
        return { type: "failed", reason: `network error: ${message}` };
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        log("oauth_refresh_failed", { status: response.status, body });
        let parsedError = null;
        try {
            const json = JSON.parse(body);
            const stringify = (v) => {
                if (typeof v === "string")
                    return v;
                if (v == null)
                    return null;
                if (typeof v === "object")
                    return JSON.stringify(v);
                return String(v);
            };
            parsedError =
                stringify(json.error_description) ?? stringify(json.error) ?? stringify(json.message) ?? null;
        }
        catch { }
        const reason = parsedError
            ? `HTTP ${response.status}: ${parsedError}`
            : `HTTP ${response.status} (body=${body.slice(0, 500) || "(empty)"})`;
        return { type: "failed", reason };
    }
    const json = (await response.json());
    return {
        type: "success",
        access: json.access_token,
        refresh: json.refresh_token,
        expires: Date.now() + json.expires_in * 1000,
    };
}
export async function buildAuthorizationUrl(mode = "console") {
    const pkce = await generatePKCE();
    const state = generateState();
    const url = new URL(AUTHORIZE_URLS[mode]);
    url.searchParams.set("code", "true");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", CODE_CALLBACK_URL);
    url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
    url.searchParams.set("code_challenge", pkce.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    return {
        url: url.toString(),
        verifier: pkce.verifier,
        state,
        redirectUri: CODE_CALLBACK_URL,
    };
}
export function parseCallback(input) {
    return parseCallbackInput(input);
}
//# sourceMappingURL=oauth.js.map