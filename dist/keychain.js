import { execFileSync, execSync } from "node:child_process";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { log } from "./logger.js";
const PRIMARY_SERVICE = "Claude Code-credentials";
const RAW_KEY_SERVICE = "Claude Code";
// Long-lived credentials synthesised from a raw `sk-ant-api03-...` API key in the
// macOS Keychain have no embedded expiry or refresh token. We treat them as
// valid for 1 year from first read, which matches the observed lifetime of
// Anthropic-issued console API keys. The token is only rotated by the user
// re-running `claude` (or manually editing the Keychain entry), so the next
// keychain read will pick up the new value.
const RAW_KEY_DEFAULT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
function parseRawApiKey(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    if (!trimmed.startsWith("sk-ant-"))
        return null;
    return {
        accessToken: trimmed,
        refreshToken: "",
        expiresAt: Date.now() + RAW_KEY_DEFAULT_TTL_MS,
    };
}
function parseCredentials(raw) {
    let parsed;
    let parsedAsJson = true;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        parsedAsJson = false;
        parsed = null;
    }
    // Raw API keys in the `Claude Code` Keychain service are not wrapped in JSON.
    // They are issued by the Anthropic console and are long-lived (no refresh
    // token, no expiry). See `parseRawApiKey` for the exact format.
    if (!parsedAsJson) {
        const rawKey = parseRawApiKey(raw);
        if (rawKey) {
            log("credentials_parsed", {
                format: "raw_api_key",
                hasAccessToken: true,
                hasRefreshToken: false,
                hasExpiry: true,
            });
        }
        else {
            log("credentials_parsed", {
                format: "unrecognised",
                hasAccessToken: false,
                hasRefreshToken: false,
                hasExpiry: false,
            });
        }
        return rawKey;
    }
    const data = parsed.claudeAiOauth ?? parsed;
    const creds = data;
    // Entries that only contain mcpOAuth are MCP server credentials, not user accounts
    if (parsed.mcpOAuth && !creds.accessToken) {
        return null;
    }
    if (typeof creds.accessToken !== "string" ||
        typeof creds.refreshToken !== "string" ||
        typeof creds.expiresAt !== "number") {
        log("credentials_parsed", {
            hasAccessToken: typeof creds.accessToken === "string",
            hasRefreshToken: typeof creds.refreshToken === "string",
            hasExpiry: typeof creds.expiresAt === "number",
            isMcpOnly: false,
        });
        return null;
    }
    log("credentials_parsed", {
        hasAccessToken: true,
        hasRefreshToken: true,
        hasExpiry: true,
        isMcpOnly: false,
    });
    return {
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        expiresAt: creds.expiresAt,
        subscriptionType: typeof creds.subscriptionType === "string"
            ? creds.subscriptionType
            : undefined,
    };
}
function readKeychainService(serviceName) {
    try {
        const result = execSync(`security find-generic-password -s "${serviceName}" -w`, {
            timeout: 2000,
            encoding: "utf-8",
        }).trim();
        log("keychain_read", { service: serviceName, success: true });
        return result;
    }
    catch (err) {
        const error = err;
        if (error.killed || error.code === "ETIMEDOUT") {
            log("keychain_read_error", {
                service: serviceName,
                errorType: "timeout",
            });
            throw new Error("Keychain read timed out. This can happen on macOS Tahoe. Try restarting Keychain Access.", { cause: err });
        }
        if (error.status === 36) {
            log("keychain_read_error", {
                service: serviceName,
                errorType: "locked",
            });
            throw new Error("macOS Keychain is locked. Please unlock it or run: security unlock-keychain ~/Library/Keychains/login.keychain-db", { cause: err });
        }
        if (error.status === 128) {
            log("keychain_read_error", {
                service: serviceName,
                errorType: "denied",
            });
            throw new Error("Keychain access was denied. Please grant access when prompted by macOS.", { cause: err });
        }
        if (error.status === 44) {
            log("keychain_read_error", {
                service: serviceName,
                errorType: "not_found",
            });
            return null; // item not found
        }
        log("keychain_read_error", {
            service: serviceName,
            errorType: `exit_${error.status ?? "unknown"}`,
        });
        throw new Error(`Failed to read Keychain entry "${serviceName}" (exit ${error.status ?? "unknown"}). Try re-authenticating with Claude Code.`, { cause: err });
    }
}
function listClaudeKeychainServices() {
    try {
        const dump = execSync("security dump-keychain", {
            timeout: 5000,
            maxBuffer: 1024 * 1024 * 10, // 10 MB
            encoding: "utf-8",
        });
        const services = [];
        const seen = new Set();
        // OAuth credentials live under `Claude Code-credentials` (with optional
        // hex suffix for multi-account setups). Match exact and suffixed names
        // only — uppercase hex or word suffixes are intentionally rejected.
        const oauthRe = /"Claude Code-credentials(?:-[0-9a-f]+)?"/g;
        let m = oauthRe.exec(dump);
        while (m !== null) {
            const svc = m[0].slice(1, -1);
            if (!seen.has(svc)) {
                seen.add(svc);
                services.push(svc);
            }
            m = oauthRe.exec(dump);
        }
        // Raw API keys (e.g. `sk-ant-api03-...`) issued by `claude` live under
        // the bare `Claude Code` service. Some claude CLI versions also stash
        // additional metadata here, so we attempt to parse it on the read path.
        if (!seen.has(RAW_KEY_SERVICE)) {
            const rawKeyRe = new RegExp(`"${RAW_KEY_SERVICE}"`, "g");
            if (rawKeyRe.test(dump)) {
                seen.add(RAW_KEY_SERVICE);
                services.push(RAW_KEY_SERVICE);
            }
        }
        const ordered = [];
        if (seen.has(PRIMARY_SERVICE))
            ordered.push(PRIMARY_SERVICE);
        for (const svc of services) {
            if (svc !== PRIMARY_SERVICE)
                ordered.push(svc);
        }
        log("keychain_list", { servicesFound: ordered });
        return ordered;
    }
    catch (err) {
        log("keychain_list", {
            error: "Failed to list keychain services",
            message: err instanceof Error ? err.message : String(err),
        });
        return [PRIMARY_SERVICE, RAW_KEY_SERVICE];
    }
}
function readCredentialsFile() {
    try {
        const credPath = join(homedir(), ".claude", ".credentials.json");
        const raw = readFileSync(credPath, "utf-8");
        const creds = parseCredentials(raw);
        log("credentials_file_read", { success: creds !== null });
        return creds;
    }
    catch {
        log("credentials_file_read", { success: false });
        return null;
    }
}
export function buildAccountLabels(credsList) {
    const baseLabels = credsList.map((c) => {
        if (c.subscriptionType) {
            const tier = c.subscriptionType.charAt(0).toUpperCase() + c.subscriptionType.slice(1);
            return `Claude ${tier}`;
        }
        return "Claude";
    });
    const counts = new Map();
    for (const l of baseLabels)
        counts.set(l, (counts.get(l) ?? 0) + 1);
    const seen = new Map();
    return baseLabels.map((base) => {
        if ((counts.get(base) ?? 0) <= 1)
            return base;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        return `${base} ${n}`;
    });
}
export function readAllClaudeAccounts() {
    if (process.platform !== "darwin") {
        const creds = readCredentialsFile();
        if (!creds)
            return [];
        const [label] = buildAccountLabels([creds]);
        return [{ label, source: "file", credentials: creds }];
    }
    const services = listClaudeKeychainServices();
    const rawAccounts = [];
    for (const svc of services) {
        const raw = readKeychainService(svc);
        if (!raw)
            continue;
        const creds = parseCredentials(raw);
        if (!creds)
            continue;
        rawAccounts.push({ source: svc, credentials: creds });
    }
    if (rawAccounts.length === 0) {
        const creds = readCredentialsFile();
        if (creds)
            rawAccounts.push({ source: "file", credentials: creds });
    }
    const labels = buildAccountLabels(rawAccounts.map((a) => a.credentials));
    return rawAccounts.map((a, i) => ({
        label: labels[i],
        source: a.source,
        credentials: a.credentials,
    }));
}
export function updateCredentialBlob(existingJson, newCreds) {
    let parsed;
    try {
        parsed = JSON.parse(existingJson);
    }
    catch {
        return null;
    }
    const wrapper = parsed.claudeAiOauth;
    const target = wrapper ?? parsed;
    target.accessToken = newCreds.accessToken;
    target.refreshToken = newCreds.refreshToken;
    target.expiresAt = newCreds.expiresAt;
    return JSON.stringify(parsed);
}
function getKeychainAccountName(serviceName) {
    try {
        const output = execFileSync("/usr/bin/security", ["find-generic-password", "-s", serviceName], { timeout: 2000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
        const match = /"acct"<blob>="([^"]*)"/.exec(output);
        if (match) {
            log("keychain_account_name", {
                service: serviceName,
                account: match[1],
            });
            return match[1];
        }
        return null;
    }
    catch {
        return null;
    }
}
export function writeBackCredentials(source, creds) {
    const newCreds = {
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        expiresAt: creds.expiresAt,
    };
    // The `Claude Code` Keychain service stores a raw `sk-ant-api03-...` API
    // key, not a JSON OAuth blob. There is no refresh-token rotation to
    // perform — the user has to regenerate the key out-of-band via `claude` or
    // the Anthropic console — so writeback is intentionally a no-op for this
    // source. A future `security add-generic-password` call would silently
    // overwrite the user's real key with a JSON blob and break auth.
    if (source === RAW_KEY_SERVICE) {
        log("writeback_skipped", { source, reason: "raw_api_key" });
        return false;
    }
    if (source === "file") {
        try {
            const credPath = join(homedir(), ".claude", ".credentials.json");
            const raw = readFileSync(credPath, "utf-8");
            const updated = updateCredentialBlob(raw, newCreds);
            if (!updated)
                return false;
            writeFileSync(credPath, updated, { encoding: "utf-8", mode: 0o600 });
            if (process.platform !== "win32") {
                chmodSync(credPath, 0o600);
            }
            log("writeback_success", { source });
            return true;
        }
        catch {
            log("writeback_failed", { source });
            return false;
        }
    }
    if (process.platform === "darwin") {
        try {
            const raw = readKeychainService(source);
            if (!raw)
                return false;
            const updated = updateCredentialBlob(raw, newCreds);
            if (!updated)
                return false;
            // Discover the actual account name from the existing Keychain entry.
            // Claude CLI uses the macOS username (e.g. "gmartin"), not the service name.
            // Using the wrong account name creates a duplicate entry instead of updating.
            const accountName = getKeychainAccountName(source) ?? source;
            execFileSync("/usr/bin/security", [
                "add-generic-password",
                "-s",
                source,
                "-a",
                accountName,
                "-w",
                updated,
                "-U",
            ], { timeout: 2000, stdio: "ignore" });
            log("writeback_success", { source, accountName });
            return true;
        }
        catch {
            log("writeback_failed", { source });
            return false;
        }
    }
    return false;
}
export function refreshAccount(source) {
    if (source === "file") {
        return readCredentialsFile();
    }
    const raw = readKeychainService(source);
    if (!raw)
        return null;
    return parseCredentials(raw);
}
/** @deprecated Use readAllClaudeAccounts() instead */
export function readClaudeCredentials() {
    const accounts = readAllClaudeAccounts();
    return accounts.length > 0 ? accounts[0].credentials : null;
}
//# sourceMappingURL=keychain.js.map