import { readAllClaudeAccounts, type ClaudeAccount } from "./keychain.ts"
import { initLogger, log } from "./logger.ts"
import {
  addExcludedBeta,
  getExcludedBetas,
  getNextBetaToExclude,
  isLongContextError,
  LONG_CONTEXT_BETAS,
} from "./betas.ts"
import { transformBody, transformResponseStream } from "./transforms.ts"
import { applyPluginOptions } from "./plugin-config.ts"
import {
  getCachedCredentials,
  initAccounts,
  invalidateCredentialCache,
  loadPersistedAccountSource,
  refreshAccountsList,
  saveAccountSource,
  setActiveAccountSource,
  type ClaudeCredentials,
} from "./credentials.ts"
import {
  buildAuthorizationUrl,
  exchangeCode,
  parseCallback,
  refreshTokens,
} from "./oauth.ts"
import { applyClaudeCodeHeaders, SYSTEM_IDENTITY_PREFIX } from "./request.ts"
import type {
  V2Context,
  V2FormAnswer,
  V2HttpRequestEvent,
  V2HttpResponseEvent,
  V2OAuthAuthorization,
  V2OAuthCredential,
  V2OAuthMethodRegistration,
  V2PluginDefinition,
  V2StringField,
  V2SystemHookEvent,
} from "./v2-types.ts"

export type { V2Context, V2PluginDefinition } from "./v2-types.ts"

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

export const V2_PLUGIN_ID = "opencode-claude-auth"
export const PROVIDER_ID = "anthropic"
export const METHOD_CLAUDE_CODE = "claude-code"
export const METHOD_OAUTH_FALLBACK = "claude-oauth"

const AUTO_CONNECT_TIMEOUT_MS = 10_000
const PENDING_TTL_MS = 10 * 60 * 1000

// Headers the V2 host adds that identify OpenCode. V1 never sent these to
// Anthropic, so they are removed to keep the wire format unchanged.
const HOST_HEADER_PATTERNS = [
  /^x-opencode-/i,
  /^x-session-affinity$/i,
  /^x-session-id$/i,
]

export interface V2Deps {
  readAllClaudeAccounts: () => ClaudeAccount[]
  refreshAccountsList: () => ClaudeAccount[]
  initAccounts: (accounts: ClaudeAccount[]) => void
  getCachedCredentials: () => ClaudeCredentials | null
  invalidateCredentialCache: () => void
  setActiveAccountSource: (source: string) => void
  loadPersistedAccountSource: () => string | null
  saveAccountSource: (source: string) => void
  buildAuthorizationUrl: typeof buildAuthorizationUrl
  exchangeCode: typeof exchangeCode
  parseCallback: typeof parseCallback
  refreshTokens: typeof refreshTokens
  fetch: typeof fetch
}

const defaultDeps: V2Deps = {
  readAllClaudeAccounts,
  refreshAccountsList,
  initAccounts,
  getCachedCredentials,
  invalidateCredentialCache,
  setActiveAccountSource,
  loadPersistedAccountSource,
  saveAccountSource,
  buildAuthorizationUrl,
  exchangeCode,
  parseCallback,
  refreshTokens,
  fetch: (input, init) => fetch(input, init),
}

interface PendingRequest {
  url: string
  method: string
  // Headers as the host built them, before Claude Code headers were applied.
  // Retries rebuild from these so excluded betas are not merged back in.
  originalHeaders: Headers
  body?: string
  modelId: string
  token: string
  signal: AbortSignal
  createdAt: number
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function isRawApiKey(token: string): boolean {
  // Console API keys (sk-ant-api03-...) must be sent as x-api-key; Anthropic
  // rejects them as Bearer tokens. OAuth access tokens are sk-ant-oat01-...
  return token.startsWith("sk-ant-api")
}

function describeSource(source: string): string {
  return source === "file"
    ? "credentials file (~/.claude/.credentials.json)"
    : "macOS Keychain"
}

function toCredential(
  methodID: string,
  creds: ClaudeCredentials,
  metadata: Record<string, unknown>,
): V2OAuthCredential {
  return {
    type: "oauth",
    methodID,
    access: creds.accessToken,
    refresh: creds.refreshToken ?? "",
    expires: creds.expiresAt,
    metadata,
  }
}

function credentialLabel(credential: V2OAuthCredential): string | undefined {
  const label = credential.metadata?.label
  return typeof label === "string" ? label : undefined
}

function accountForm(
  accounts: ClaudeAccount[],
  activeSource: string | null,
): V2StringField[] | undefined {
  if (accounts.length <= 1) return undefined
  return [
    {
      type: "string",
      key: "account",
      title: "Claude Code account",
      description: "Select which Claude Code account to use",
      required: true,
      default: activeSource ?? accounts[0].source,
      options: accounts.map((a) => ({
        value: a.source,
        label: a.label,
        description:
          a.source === activeSource ? `${a.source} (active)` : a.source,
      })),
    },
  ]
}

function stripHostHeaders(headers: Headers): void {
  // Snapshot the names first: deleting while iterating a Headers object is
  // not reliable.
  const doomed: string[] = []
  headers.forEach((_value, name) => {
    if (HOST_HEADER_PATTERNS.some((re) => re.test(name))) doomed.push(name)
  })
  for (const name of doomed) headers.delete(name)
}

/**
 * The V2 host adds its own `anthropic-beta` values (for example
 * interleaved-thinking). Betas excluded after a long-context error must be
 * removed from that host-provided list too, or the retry repeats the
 * failing request.
 */
function dropExcludedBetas(headers: Headers, excluded: Set<string>): void {
  if (excluded.size === 0) return
  const incoming = headers.get("anthropic-beta")
  if (!incoming) return
  const kept = incoming
    .split(",")
    .map((beta) => beta.trim())
    .filter((beta) => beta && !excluded.has(beta))
  if (kept.length > 0) headers.set("anthropic-beta", kept.join(","))
  else headers.delete("anthropic-beta")
}

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // Best effort: the response is being replaced.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms)
    timer.unref?.()
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export function createClaudeAuthV2(
  overrides: Partial<V2Deps> = {},
): V2PluginDefinition {
  const deps: V2Deps = { ...defaultDeps, ...overrides }

  // Plugin instances are created once per project location, but credentials
  // and the logger are process-wide: read Claude Code accounts once, and only
  // initialise the logger once (initLogger truncates the debug log file).
  let loggerReady = false
  let cachedAccounts: ClaudeAccount[] | undefined
  let autoConnectInFlight: Promise<void> | undefined
  const pending = new Map<string, PendingRequest>()

  function loadAccounts(): ClaudeAccount[] {
    if (cachedAccounts && cachedAccounts.length > 0) return cachedAccounts

    let accounts: ClaudeAccount[] = []
    try {
      accounts = deps.readAllClaudeAccounts()
    } catch (err) {
      const error = errorMessage(err)
      log("plugin_init_error", { error })
      console.warn(
        "opencode-claude-auth: Failed to read Claude Code credentials:",
        error,
      )
      return []
    }

    deps.initAccounts(accounts)

    if (accounts.length > 0) {
      const persisted = deps.loadPersistedAccountSource()
      const active =
        (persisted && accounts.find((a) => a.source === persisted)) ||
        accounts[0]
      deps.setActiveAccountSource(active.source)
      log("plugin_init", {
        accountCount: accounts.length,
        sources: accounts.map((a) => a.source),
        activeSource: active.source,
      })
      cachedAccounts = accounts
    } else {
      log("plugin_init_no_accounts", { reason: "no credentials found" })
      console.warn(
        "opencode-claude-auth: No Claude Code credentials found. Sign in with the `claude` CLI, or connect Anthropic with an API key.",
      )
    }
    return accounts
  }

  function claudeCodeMethod(
    accounts: ClaudeAccount[],
  ): V2OAuthMethodRegistration {
    const activeSource = deps.loadPersistedAccountSource()
    const form = accountForm(accounts, activeSource)

    return {
      integrationID: PROVIDER_ID,
      method: {
        id: METHOD_CLAUDE_CODE,
        type: "oauth",
        label: "Claude Code credentials",
        ...(form ? { form } : {}),
      },

      async authorize(answer: V2FormAnswer): Promise<V2OAuthAuthorization> {
        const latest = deps.refreshAccountsList()
        if (latest.length === 0) {
          throw new Error(
            "No Claude Code credentials found. Sign in with the `claude` CLI first, then try again.",
          )
        }

        const requested =
          typeof answer?.account === "string" ? answer.account : undefined
        const persisted = deps.loadPersistedAccountSource()
        const chosen =
          latest.find((a) => a.source === requested) ??
          latest.find((a) => a.source === persisted) ??
          latest[0]

        deps.setActiveAccountSource(chosen.source)
        const creds = deps.getCachedCredentials() ?? chosen.credentials
        deps.saveAccountSource(chosen.source)

        const credential = toCredential(METHOD_CLAUDE_CODE, creds, {
          source: chosen.source,
          label: chosen.label,
          ...(creds.subscriptionType
            ? { subscriptionType: creds.subscriptionType }
            : {}),
        })

        return {
          url: "",
          instructions: `Using ${chosen.label} — credentials loaded from ${describeSource(chosen.source)}.`,
          mode: "auto",
          callback: Promise.resolve(credential),
        }
      },

      async refresh(credential: V2OAuthCredential): Promise<V2OAuthCredential> {
        const source =
          typeof credential.metadata?.source === "string"
            ? credential.metadata.source
            : undefined

        // Pick up a `claude` re-login / token rotation before refreshing.
        try {
          deps.invalidateCredentialCache()
          deps.refreshAccountsList()
        } catch (err) {
          log("refresh_accounts_list_failed", { error: errorMessage(err) })
        }
        if (source) deps.setActiveAccountSource(source)

        const fresh = deps.getCachedCredentials()
        if (!fresh) {
          throw new Error(
            "Claude Code credentials are unavailable or expired. Run `claude` to refresh them.",
          )
        }
        return {
          ...credential,
          access: fresh.accessToken,
          refresh: fresh.refreshToken ?? "",
          expires: fresh.expiresAt,
        }
      },

      label: credentialLabel,
    }
  }

  function oauthFallbackMethod(): V2OAuthMethodRegistration {
    return {
      integrationID: PROVIDER_ID,
      method: {
        id: METHOD_OAUTH_FALLBACK,
        type: "oauth",
        label: "Claude OAuth (fallback)",
      },

      async authorize(): Promise<V2OAuthAuthorization> {
        log("oauth_fallback_authorize_started", {})
        const { url, verifier, state, redirectUri } =
          await deps.buildAuthorizationUrl("console")

        return {
          url,
          instructions:
            "Open the URL above, authorize with your Claude account, then paste the full callback URL (or just `code#state`) here:",
          mode: "code",
          async callback(code: string): Promise<V2OAuthCredential> {
            log("oauth_fallback_callback_received", { length: code.length })
            const parsed = deps.parseCallback(code)
            if (!parsed) {
              log("oauth_fallback_callback_parse_failed", {
                input: code.slice(0, 64),
              })
              throw new Error(
                "Could not extract code and state from input. Paste the full callback URL (e.g. https://platform.claude.com/oauth/code/callback?code=...&state=...) or the `code#state` pair.",
              )
            }
            const result = await deps.exchangeCode(
              parsed,
              verifier,
              redirectUri,
              state,
            )
            if (result.type === "failed") {
              log("oauth_fallback_exchange_failed", { reason: result.reason })
              console.error(
                `opencode-claude-auth: OAuth exchange failed: ${result.reason}`,
              )
              throw new Error(
                `OAuth code exchange failed: ${result.reason}. The code may have expired (single-use, ~30s lifetime) or the state did not match.`,
              )
            }
            log("oauth_fallback_exchange_success", {
              expiresIn: result.expires - Date.now(),
            })
            return {
              type: "oauth",
              methodID: METHOD_OAUTH_FALLBACK,
              access: result.access,
              refresh: result.refresh,
              expires: result.expires,
              metadata: { source: "oauth", label: "Claude OAuth" },
            }
          },
        }
      },

      async refresh(credential: V2OAuthCredential): Promise<V2OAuthCredential> {
        const result = await deps.refreshTokens(credential.refresh)
        if (result.type !== "success") {
          log("oauth_fallback_refresh_failed", { reason: result.reason })
          throw new Error(
            `Claude OAuth refresh failed: ${result.reason}. Sign in again with "Claude OAuth (fallback)".`,
          )
        }
        return {
          ...credential,
          access: result.access,
          refresh: result.refresh,
          expires: result.expires,
        }
      },

      label: credentialLabel,
    }
  }

  function prefixIdentity(event: V2SystemHookEvent): void {
    if (event.model?.providerID !== PROVIDER_ID) return
    const present = event.system.some(
      (part) =>
        typeof part.text === "string" &&
        part.text.includes(SYSTEM_IDENTITY_PREFIX),
    )
    if (!present) {
      event.system.unshift({ type: "text", text: SYSTEM_IDENTITY_PREFIX })
    }
  }

  function prunePending(now: number): void {
    for (const [id, entry] of pending) {
      if (now - entry.createdAt > PENDING_TTL_MS) pending.delete(id)
    }
  }

  async function onRequest(event: V2HttpRequestEvent): Promise<void> {
    try {
      const request = event.request
      const bearer = request.headers
        .get("authorization")
        ?.match(/^Bearer\s+(.+)$/i)?.[1]

      // API-key credentials use x-api-key: leave the host's request alone.
      if (!bearer) return

      if (isRawApiKey(bearer)) {
        request.headers.delete("authorization")
        request.headers.set("x-api-key", bearer)
        log("v2_request_raw_api_key", { modelId: event.model.id })
        return
      }

      const modelId = event.model.id
      const originalHeaders = new Headers(request.headers)

      stripHostHeaders(request.headers)
      const excluded = getExcludedBetas(modelId)
      dropExcludedBetas(request.headers, excluded)
      applyClaudeCodeHeaders(request.headers, bearer, modelId, excluded)

      let body: string | undefined
      if (
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        request.body
      ) {
        const raw = await request.clone().text()
        const transformed = transformBody(raw)
        body = typeof transformed === "string" ? transformed : raw
        // The body length changes; let the runtime recompute it.
        request.headers.delete("content-length")
        event.request = new Request(request, { method: request.method, body })
      }

      const id = request.headers.get("x-client-request-id")
      if (id) {
        const now = Date.now()
        prunePending(now)
        pending.set(id, {
          url: request.url,
          method: request.method,
          originalHeaders,
          body,
          modelId,
          token: bearer,
          signal: request.signal,
          createdAt: now,
        })
      }

      log("v2_request_prepared", {
        modelId,
        betas: (request.headers.get("anthropic-beta") ?? "")
          .split(",")
          .filter(Boolean),
        bodyTransformed: body !== undefined,
      })
    } catch (err) {
      log("v2_request_hook_error", { error: errorMessage(err) })
    }
  }

  async function reissue(
    state: PendingRequest,
    token: string,
  ): Promise<Response> {
    const headers = new Headers(state.originalHeaders)
    stripHostHeaders(headers)
    const excluded = getExcludedBetas(state.modelId)
    dropExcludedBetas(headers, excluded)
    applyClaudeCodeHeaders(headers, token, state.modelId, excluded)
    headers.delete("content-length")
    return deps.fetch(state.url, {
      method: state.method,
      headers,
      body: state.body,
      signal: state.signal,
    })
  }

  function warnOnError(response: Response, modelId: string): void {
    const status = response.status
    response
      .clone()
      .text()
      .then((errorBody) => {
        let message = errorBody
        try {
          const parsed = JSON.parse(errorBody) as {
            error?: { type?: string; message?: string }
          }
          message = parsed.error?.message ?? parsed.error?.type ?? errorBody
        } catch {}
        log("fetch_error_response", { status, modelId, message })
        console.warn(
          `opencode-claude-auth: API ${status} for ${modelId}: ${message}`,
        )
      })
      .catch(() => {})
  }

  async function onResponse(event: V2HttpResponseEvent): Promise<void> {
    const id = event.request.headers.get("x-client-request-id")
    const state = id ? pending.get(id) : undefined
    if (!id || !state) return
    pending.delete(id)

    try {
      let response = event.response

      // On 401, re-read Claude Code credentials (the user may have run
      // `claude` again) and retry once with a different token.
      if (response.status === 401) {
        log("fetch_401_retry", { modelId: state.modelId })
        let retryToken: string | undefined
        try {
          deps.invalidateCredentialCache()
          deps.refreshAccountsList()
          retryToken = deps.getCachedCredentials()?.accessToken
        } catch (err) {
          log("fetch_401_reread_failed", { error: errorMessage(err) })
        }
        if (retryToken && retryToken !== state.token) {
          const previous = response
          response = await reissue(state, retryToken)
          state.token = retryToken
          await discard(previous)
          log("fetch_401_retry_result", {
            status: response.status,
            modelId: state.modelId,
            path: "keychain_reread",
          })
        } else {
          log("fetch_401_no_refresh_available", { modelId: state.modelId })
          console.warn(
            `opencode-claude-auth: API 401 for ${state.modelId}. Run \`claude\` to re-authenticate, or reconnect Anthropic ("Claude OAuth (fallback)").`,
          )
        }
      }

      // Long-context beta errors: exclude one more beta per attempt and retry.
      for (let attempt = 0; attempt < LONG_CONTEXT_BETAS.length; attempt++) {
        if (response.status !== 400 && response.status !== 429) break

        const responseBody = await response.clone().text()
        if (!isLongContextError(responseBody)) break

        const betaToExclude = getNextBetaToExclude(state.modelId)
        if (!betaToExclude) break

        addExcludedBeta(state.modelId, betaToExclude)
        log("fetch_beta_excluded", {
          modelId: state.modelId,
          excludedBeta: betaToExclude,
        })

        const previous = response
        response = await reissue(state, state.token)
        await discard(previous)
      }

      if (!response.ok) warnOnError(response, state.modelId)

      event.response = transformResponseStream(response)
    } catch (err) {
      log("v2_response_hook_error", { error: errorMessage(err) })
    }
  }

  async function autoConnect(
    ctx: V2Context,
    accounts: ClaudeAccount[],
  ): Promise<void> {
    if (ctx.options?.autoConnect === false) return
    if (accounts.length === 0) return

    if (!autoConnectInFlight) {
      const attempt = (async () => {
        try {
          const active = await ctx.integration.connection.active(PROVIDER_ID)
          if (active) {
            log("auto_connect_skipped", { reason: "connection_exists" })
            return
          }
          await ctx.integration.oauth.connect({
            integrationID: PROVIDER_ID,
            methodID: METHOD_CLAUDE_CODE,
          })
          log("auto_connect_done", {})
        } catch (err) {
          const error = errorMessage(err)
          log("auto_connect_failed", { error })
          console.warn(
            `opencode-claude-auth: Could not connect Claude Code credentials automatically: ${error}. Connect manually: Anthropic → "Claude Code credentials".`,
          )
        }
      })().finally(() => {
        if (autoConnectInFlight === attempt) autoConnectInFlight = undefined
      })
      autoConnectInFlight = attempt
    }

    // Do not let a hung Keychain stall plugin startup indefinitely.
    await withTimeout(autoConnectInFlight, AUTO_CONNECT_TIMEOUT_MS)
  }

  return {
    id: V2_PLUGIN_ID,

    async setup(ctx: V2Context): Promise<void> {
      if (!loggerReady) {
        initLogger()
        loggerReady = true
      }
      applyPluginOptions(ctx.options)

      const accounts = loadAccounts()

      await ctx.integration.transform((editor) => {
        editor.method.update(claudeCodeMethod(accounts))
        editor.method.update(oauthFallbackMethod())
      })

      const scope = { providerID: PROVIDER_ID }
      await ctx.session.hook("context", prefixIdentity, scope)
      await ctx.session.hook("compaction", prefixIdentity, scope)
      await ctx.session.hook("generate", prefixIdentity, scope)
      await ctx.session.hook("title", prefixIdentity, scope)
      await ctx.session.hook("http.request", onRequest, scope)
      await ctx.session.hook("http.response", onResponse, scope)

      // V1 zeroed model costs for subscription-backed Anthropic models.
      await ctx.model.transform((editor) => {
        for (const model of editor.list(PROVIDER_ID)) {
          try {
            editor.update(model.providerID, model.id, (draft) => {
              if (!Array.isArray(draft.cost)) return
              draft.cost = draft.cost.map((tier) => ({
                ...tier,
                input: 0,
                output: 0,
                cache: { read: 0, write: 0 },
              }))
            })
          } catch (err) {
            log("v2_model_cost_update_failed", {
              modelId: model.id,
              error: errorMessage(err),
            })
          }
        }
      })

      await autoConnect(ctx, accounts)
    },
  }
}
