import type { Plugin } from "@opencode-ai/plugin"
import crypto from "node:crypto"
import { config } from "./model-config.ts"
import { readAllClaudeAccounts, type ClaudeAccount } from "./keychain.ts"
import { initLogger, log } from "./logger.ts"
import {
  addExcludedBeta,
  getExcludedBetas,
  getModelBetas,
  getNextBetaToExclude,
  isLongContextError,
  LONG_CONTEXT_BETAS,
} from "./betas.ts"
import { transformBody, transformResponseStream } from "./transforms.ts"
import { applyOpencodeConfig } from "./plugin-config.ts"
import {
  getCachedCredentials,
  getCredentialsForSync,
  syncAuthJson,
  initAccounts,
  setActiveAccountSource,
  loadPersistedAccountSource,
  saveAccountSource,
  refreshAccountsList,
  type ClaudeCredentials,
} from "./credentials.ts"
import { buildAuthorizationUrl, exchangeCode, parseCallback, refreshTokens } from "./oauth.ts"

export {
  addExcludedBeta,
  getExcludedBetas,
  getModelBetas,
  getNextBetaToExclude,
  isLongContextError,
  LONG_CONTEXT_BETAS,
} from "./betas.ts"
export { resetExcludedBetas } from "./betas.ts"
export {
  stripToolPrefix,
  transformBody,
  transformResponseStream,
} from "./transforms.ts"
export {
  getCachedCredentials,
  syncAuthJson,
  refreshAccountsList,
  type ClaudeCredentials,
} from "./credentials.ts"
export { isEnable1mContext, type PluginSettings } from "./plugin-config.ts"
export {
  buildBillingHeaderValue,
  computeCch,
  computeVersionSuffix,
  extractFirstUserMessageText,
} from "./signing.ts"

const SYSTEM_IDENTITY_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude."

function getCliVersion(): string {
  return process.env.ANTHROPIC_CLI_VERSION ?? config.ccVersion
}

function getUserAgent(): string {
  return (
    process.env.ANTHROPIC_USER_AGENT ??
    `claude-cli/${getCliVersion()} (external, sdk-cli)`
  )
}

function getStainlessHeaders(): Record<string, string> {
  return {
    "x-stainless-arch": process.arch === "arm64" ? "arm64" : process.arch,
    "x-stainless-lang": "js",
    "x-stainless-os":
      process.platform === "darwin" ? "MacOS" : process.platform,
    "x-stainless-package-version": "0.81.0",
    "x-stainless-retry-count": "0",
    "x-stainless-runtime": "node",
    "x-stainless-runtime-version": process.version,
    "x-stainless-timeout": "600",
  }
}

function buildRequestUrl(input: RequestInfo | URL): string | URL {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  const url = new URL(raw)
  if (url.pathname === "/v1/messages" && !url.searchParams.has("beta")) {
    url.searchParams.set("beta", "true")
  }

  return typeof input === "string" ? url.toString() : url
}

// Stable per-process session ID, matching Claude Code's X-Claude-Code-Session-Id
const sessionId = crypto.randomUUID()

type FetchFn = typeof fetch

// Maximum delay before we give up retrying and surface the error.
// A retry-after longer than this signals a quota/usage-limit reset (hours away)
// rather than a transient rate limit — retrying would hang indefinitely.
// Override with OPENCODE_CLAUDE_AUTH_MAX_RETRY_MS for longer retry windows.
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000

function getMaxRetryDelayMs(): number {
  const env = process.env.OPENCODE_CLAUDE_AUTH_MAX_RETRY_MS
  if (env) {
    const parsed = parseInt(env, 10)
    if (!Number.isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_MAX_RETRY_DELAY_MS
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  fetchImpl: FetchFn = fetch,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetchImpl(input, init)
    if ((res.status === 429 || res.status === 529) && i < retries - 1) {
      const retryAfter = res.headers.get("retry-after")
      const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN
      const delay = Number.isNaN(parsed) ? (i + 1) * 2000 : parsed * 1000
      // If delay exceeds the cap, the server is signalling a quota/usage-limit
      // reset far in the future. Return immediately so the error surfaces to
      // the user rather than silently hanging until the reset time.
      if (delay > getMaxRetryDelayMs()) {
        log("fetch_rate_limited_quota", {
          status: res.status,
          retryAfter: retryAfter ?? "none",
          delayMs: delay,
        })
        return res
      }
      log("fetch_rate_limited", {
        status: res.status,
        attempt: i + 1,
        retryAfter: retryAfter ?? "none",
        delayMs: delay,
      })
      await new Promise((r) => setTimeout(r, delay))
      continue
    }
    return res
  }
  return fetchImpl(input, init)
}

export function buildRequestHeaders(
  input: RequestInfo | URL,
  init: RequestInit,
  accessToken: string,
  modelId = "unknown",
  excludedBetas?: Set<string>,
): Headers {
  const headers = new Headers()

  if (input instanceof Request) {
    input.headers.forEach((value, key) => {
      headers.set(key, value)
    })
  }

  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      headers.set(key, value)
    })
  } else if (Array.isArray(init.headers)) {
    for (const [key, value] of init.headers) {
      if (typeof value !== "undefined") {
        headers.set(key, String(value))
      }
    }
  } else if (init.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      if (typeof value !== "undefined") {
        headers.set(key, String(value))
      }
    }
  }

  const modelBetas = getModelBetas(modelId, excludedBetas)
  const incomingBeta = headers.get("anthropic-beta") ?? ""
  const mergedBetas = [
    ...new Set([
      ...modelBetas,
      ...incomingBeta
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ]),
  ]

  headers.set("authorization", `Bearer ${accessToken}`)
  headers.set("anthropic-version", "2023-06-01")
  headers.set("anthropic-beta", mergedBetas.join(","))
  headers.set("anthropic-dangerous-direct-browser-access", "true")
  headers.set("x-app", "cli")
  headers.set("user-agent", getUserAgent())
  headers.set("x-client-request-id", crypto.randomUUID())
  headers.set("X-Claude-Code-Session-Id", sessionId)
  for (const [key, value] of Object.entries(getStainlessHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }
  headers.delete("x-api-key")

  return headers
}

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

const plugin: Plugin = async ({ client }: { client: any }) => {
  initLogger()

  let accounts: ClaudeAccount[] = []
  try {
    accounts = readAllClaudeAccounts()
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log("plugin_init_error", { error })
    console.warn(
      "opencode-claude-auth: Failed to read Claude Code credentials:",
      error,
    )
    return {}
  }

  initAccounts(accounts)

  const defaultAccountSource = accounts[0]?.source ?? null

  if (accounts.length > 0) {
    const persistedSource = loadPersistedAccountSource()
    const defaultAccount =
      (persistedSource && accounts.find((a) => a.source === persistedSource)) ||
      accounts[0]

    setActiveAccountSource(defaultAccount.source)

    log("plugin_init", {
      accountCount: accounts.length,
      sources: accounts.map((a) => a.source),
      activeSource: defaultAccount.source,
    })

    const initialCreds = getCachedCredentials()
    if (initialCreds) {
      syncAuthJson(initialCreds)
    } else {
      console.warn(
        "opencode-claude-auth: Claude credentials are expired and could not be refreshed. Run `claude` to re-authenticate.",
      )
    }

    // Keep auth.json synced with current credentials (no refresh triggered)
    const syncTimer = setInterval(() => {
      try {
        const creds = getCredentialsForSync()
        if (creds) syncAuthJson(creds)
      } catch {
        // Non-fatal
      }
    }, SYNC_INTERVAL)
    syncTimer.unref()
  } else {
    log("plugin_init_no_accounts", { reason: "no credentials found" })
    console.warn(
      "opencode-claude-auth: No Claude Code credentials found. Running in API key mode with transform hook enabled.",
    )
  }

  return {
    config: async (opencodeConfig) => {
      applyOpencodeConfig(opencodeConfig)
    },
    "experimental.chat.system.transform": async (input, output) => {
      if (input.model?.providerID !== "anthropic") {
        return
      }

      const hasIdentityPrefix = output.system.some((entry) =>
        entry.includes(SYSTEM_IDENTITY_PREFIX),
      )
      if (!hasIdentityPrefix) {
        output.system.unshift(SYSTEM_IDENTITY_PREFIX)
      }
    },
    auth: {
      provider: "anthropic",
      async loader(getAuth, provider) {
        const auth = await getAuth()
        log("auth_loader_called", { authType: auth.type })
        if (auth.type !== "oauth") {
          log("auth_loader_skipped", {
            authType: auth.type,
            reason: "auth type is not oauth",
          })
          return {}
        }

        for (const model of Object.values(provider.models)) {
          model.cost = {
            input: 0,
            output: 0,
            cache: { read: 0, write: 0 },
          }
        }

        log("auth_loader_ready", {
          modelCount: Object.keys(provider.models).length,
        })

        return {
          apiKey: "",
          baseURL: "https://api.anthropic.com/v1",
          async fetch(input: RequestInfo | URL, init?: RequestInit) {
            // Source of truth order:
            //   1. auth.json (set by the "Claude OAuth (fallback)" auth method
            //      or opencode auth login — the real OAuth tokens with refresh)
            //   2. Keychain "Claude Code" service (raw `sk-ant-api03-...`
            //      console API key — long-lived but may be rejected with 401
            //      on org-locked accounts)
            //
            // Without this split the plugin's in-memory keychain value would
            // shadow a freshly-authorised OAuth result on the very next
            // request.
            const currentAuth = await getAuth()
            let bearerToken: string
            let source: "auth_json_oauth" | "auth_json_raw" | "keychain"
            if (
              currentAuth.type === "oauth" &&
              typeof currentAuth.access === "string" &&
              currentAuth.access.length > 0
            ) {
              bearerToken = currentAuth.access
              source = currentAuth.refresh
                ? "auth_json_oauth"
                : "auth_json_raw"
            } else {
              const latest = getCachedCredentials()
              if (!latest) {
                log("fetch_no_credentials", { modelId: "unknown" })
                throw new Error(
                  "Claude Code credentials are unavailable or expired. Run `claude` to refresh them.",
                )
              }
              bearerToken = latest.accessToken
              source = "keychain"
            }

            const requestInit = init ?? {}
            const bodyStr =
              typeof requestInit.body === "string"
                ? requestInit.body
                : undefined
            let modelId = "unknown"
            if (bodyStr) {
              try {
                modelId =
                  (JSON.parse(bodyStr) as { model?: string }).model ?? "unknown"
              } catch {}
            }

            log("fetch_credentials", {
              modelId,
              source,
              accessToken: bearerToken,
            })

            // Get excluded betas for this model (from previous failed requests)
            const excluded = getExcludedBetas(modelId)
            const requestUrl = buildRequestUrl(input)
            const headers = buildRequestHeaders(
              input,
              requestInit,
              bearerToken,
              modelId,
              excluded,
            )
            const body = transformBody(requestInit.body)

            const headerKeys: string[] = []
            headers.forEach((_, key) => headerKeys.push(key))
            const betas = (headers.get("anthropic-beta") ?? "")
              .split(",")
              .filter(Boolean)
            log("fetch_headers_built", { headerKeys, betas, modelId })

            let response = await fetchWithRetry(requestUrl, {
              ...requestInit,
              body,
              headers,
            })

            log("fetch_response", {
              status: response.status,
              modelId,
              retryAttempt: 0,
            })

            // On 401, force a credential refresh and retry once.
            // Two refresh paths are attempted in order:
            //   1. Refresh via stored OAuth refresh token (if available)
            //   2. Re-read credentials from Keychain (in case the user ran
            //      `claude` to re-authenticate and a new value is now in
            //      the keychain)
            // After both fail, the user is instructed to run `opencode auth`
            // and pick "Claude OAuth (fallback)" to authorize via OAuth.
            if (response.status === 401) {
              log("fetch_401_retry", { modelId, source })

              // Path 1: OAuth refresh-token flow (only if we have a refresh
              // token and the access token we just used was a real OAuth
              // token, not a raw keychain value).
              const currentAuth = await getAuth()
              if (
                source === "auth_json_oauth" &&
                currentAuth.type === "oauth" &&
                currentAuth.refresh
              ) {
                // Real OAuth token rejected — try to refresh.
                const refreshed = await refreshTokens(currentAuth.refresh)
                if (refreshed.type === "success") {
                  await client.auth.set({
                    path: { id: "anthropic" },
                    body: {
                      type: "oauth",
                      access: refreshed.access,
                      refresh: refreshed.refresh,
                      expires: refreshed.expires,
                    },
                  })
                  log("fetch_401_oauth_refreshed", { modelId })
                  const retryHeaders = buildRequestHeaders(
                    input,
                    requestInit,
                    refreshed.access,
                    modelId,
                    excluded,
                  )
                  response = await fetchWithRetry(requestUrl, {
                    ...requestInit,
                    body,
                    headers: retryHeaders,
                  })
                  log("fetch_401_retry_result", {
                    status: response.status,
                    modelId,
                    path: "oauth_refresh",
                  })
                } else {
                  log("fetch_401_oauth_refresh_failed", { modelId })
                }
              } else {
                // Path 2: re-read keychain in case the user re-ran `claude`
                // mid-session (raw key path).
                const refreshed = getCachedCredentials()
                if (refreshed && refreshed.accessToken !== bearerToken) {
                  const retryHeaders = buildRequestHeaders(
                    input,
                    requestInit,
                    refreshed.accessToken,
                    modelId,
                    excluded,
                  )
                  response = await fetchWithRetry(requestUrl, {
                    ...requestInit,
                    body,
                    headers: retryHeaders,
                  })
                  log("fetch_401_retry_result", {
                    status: response.status,
                    modelId,
                    path: "keychain_reread",
                  })
                } else {
                  log("fetch_401_no_refresh_available", { modelId })
                  console.warn(
                    `opencode-claude-auth: API 401 for ${modelId}. The raw Keychain key was rejected. Run \`opencode auth\` and pick "Claude OAuth (fallback)" to authorize via OAuth.`,
                  )
                }
              }
            }

            // Check for long-context beta errors and retry with betas excluded
            // Try up to LONG_CONTEXT_BETAS.length times, excluding one more beta each time
            for (
              let attempt = 0;
              attempt < LONG_CONTEXT_BETAS.length;
              attempt++
            ) {
              if (response.status !== 400 && response.status !== 429) {
                break
              }

              const cloned = response.clone()
              const responseBody = await cloned.text()

              if (!isLongContextError(responseBody)) {
                break
              }

              const betaToExclude = getNextBetaToExclude(modelId)
              if (!betaToExclude) {
                break // All long-context betas already excluded
              }

              addExcludedBeta(modelId, betaToExclude)
              log("fetch_beta_excluded", {
                modelId,
                excludedBeta: betaToExclude,
              })

              // Rebuild headers without the excluded beta and retry
              const currentCreds = getCachedCredentials()
              const retryToken = currentCreds?.accessToken ?? bearerToken
              const newExcluded = getExcludedBetas(modelId)
              const newHeaders = buildRequestHeaders(
                input,
                requestInit,
                retryToken,
                modelId,
                newExcluded,
              )

              response = await fetchWithRetry(requestUrl, {
                ...requestInit,
                body,
                headers: newHeaders,
              })
            }

            // Log non-200 responses at warn level so they're visible in OpenCode
            if (!response.ok) {
              const status = response.status
              const cloned = response.clone()
              cloned
                .text()
                .then((errorBody) => {
                  let message = errorBody
                  try {
                    const parsed = JSON.parse(errorBody) as {
                      error?: { type?: string; message?: string }
                    }
                    message =
                      parsed.error?.message ?? parsed.error?.type ?? errorBody
                  } catch {}
                  log("fetch_error_response", { status, modelId, message })
                  console.warn(
                    `opencode-claude-auth: API ${status} for ${modelId}: ${message}`,
                  )
                })
                .catch(() => {})
            }

            return transformResponseStream(response)
          },
        }
      },
      methods: [
        {
          type: "oauth",
          label: "Switch Claude Code account",

          get prompts() {
            const currentAccounts = refreshAccountsList()
            const currentSource =
              loadPersistedAccountSource() ?? defaultAccountSource
            if (currentAccounts.length <= 1) return []
            return [
              {
                type: "select" as const,
                key: "account",
                message: "Select which Claude Code account to use:",
                options: currentAccounts.map((a) => ({
                  label: a.label,
                  value: a.source,
                  hint:
                    a.source === currentSource
                      ? `${a.source} (active)`
                      : a.source,
                })),
              },
            ]
          },

          async authorize(inputs) {
            const latestAccounts = refreshAccountsList()

            const source =
              inputs?.account ?? latestAccounts[0]?.source ?? accounts[0].source
            const chosen =
              latestAccounts.find((a) => a.source === source) ??
              accounts.find((a) => a.source === source) ??
              latestAccounts[0] ??
              accounts[0]

            setActiveAccountSource(chosen.source)
            const creds = getCachedCredentials() ?? chosen.credentials

            syncAuthJson(creds)
            saveAccountSource(chosen.source)

            const sourceDescription =
              chosen.source === "file"
                ? "credentials file (~/.claude/.credentials.json)"
                : "macOS Keychain"

            return {
              url: "",
              instructions: `Using ${chosen.label} — credentials loaded from ${sourceDescription}.`,
              method: "auto",
              async callback() {
                return {
                  type: "success",
                  provider: "anthropic",
                  access: creds.accessToken,
                  refresh: creds.refreshToken,
                  expires: creds.expiresAt,
                }
              },
            }
          },
        },
        {
          type: "oauth",
          label: "Claude OAuth (fallback)",

          async authorize() {
            log("oauth_fallback_authorize_started", {})
            const { url, verifier, state, redirectUri } =
              await buildAuthorizationUrl("console")

            return {
              url,
              instructions:
                "Open the URL above, authorize with your Claude account, then paste the full callback URL (or just `code#state`) here:",
              method: "code",
              async callback(code: string) {
                log("oauth_fallback_callback_received", { length: code.length })
                const parsed = parseCallback(code)
                if (!parsed) {
                  log("oauth_fallback_callback_parse_failed", {
                    input: code.slice(0, 64),
                  })
                  return {
                    type: "failed" as const,
                    error:
                      "Could not extract code and state from input. Paste the full callback URL (e.g. https://platform.claude.com/oauth/code/callback?code=...&state=...) or the `code#state` pair.",
                  }
                }
                const result = await exchangeCode(
                  parsed,
                  verifier,
                  redirectUri,
                  state,
                )
                if (result.type === "failed") {
                  log("oauth_fallback_exchange_failed", { reason: result.reason })
                  return {
                    type: "failed" as const,
                    error: `OAuth code exchange failed: ${result.reason}. The code may have expired (single-use, ~30s lifetime) or the state did not match.`,
                  }
                }
                log("oauth_fallback_exchange_success", {
                  expiresIn: result.expires - Date.now(),
                })
                return {
                  type: "success" as const,
                  provider: "anthropic",
                  access: result.access,
                  refresh: result.refresh,
                  expires: result.expires,
                }
              },
            }
          },
        },
      ],
    },
  }
}

export const ClaudeAuthPlugin = plugin
export default plugin
