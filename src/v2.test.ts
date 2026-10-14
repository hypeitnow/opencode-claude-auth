import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it, mock } from "node:test"
import defaultExport, { ClaudeAuthPlugin } from "./index.ts"
import {
  createClaudeAuthV2,
  METHOD_CLAUDE_CODE,
  METHOD_OAUTH_FALLBACK,
  PROVIDER_ID,
  V2_PLUGIN_ID,
  type V2Deps,
} from "./v2.ts"
import {
  addExcludedBeta,
  getExcludedBetas,
  resetExcludedBetas,
} from "./betas.ts"
import { isEnable1mContext, resetPluginSettings } from "./plugin-config.ts"
import { transformBody } from "./transforms.ts"
import type { ClaudeAccount } from "./keychain.ts"
import type {
  V2Context,
  V2HookScope,
  V2OAuthMethodRegistration,
  V2Registration,
} from "./v2-types.ts"

const registration: V2Registration = { dispose: async () => {} }

function makeAccount(
  source: string,
  label: string,
  expiresInMs = 3_600_000,
): ClaudeAccount {
  return {
    source,
    label,
    credentials: {
      accessToken: `at-${source}`,
      refreshToken: `rt-${source}`,
      expiresAt: Date.now() + expiresInMs,
    },
  }
}

interface Calls {
  invalidated: number
  setActive: string[]
  saved: string[]
  fetch: Array<{ url: string; init: RequestInit }>
}

function makeDeps(
  accounts: ClaudeAccount[],
  over: Partial<V2Deps> = {},
  fetchQueue: Array<() => Response> = [],
): { deps: Partial<V2Deps>; calls: Calls; readCount: () => number } {
  const calls: Calls = { invalidated: 0, setActive: [], saved: [], fetch: [] }
  let reads = 0
  const deps: Partial<V2Deps> = {
    readAllClaudeAccounts: () => {
      reads += 1
      return accounts
    },
    refreshAccountsList: () => accounts,
    initAccounts: () => {},
    getCachedCredentials: () => accounts[0]?.credentials ?? null,
    invalidateCredentialCache: () => {
      calls.invalidated += 1
    },
    setActiveAccountSource: (source) => {
      calls.setActive.push(source)
    },
    loadPersistedAccountSource: () => null,
    saveAccountSource: (source) => {
      calls.saved.push(source)
    },
    buildAuthorizationUrl: async () => ({
      url: "https://example.test/authorize?x=1",
      verifier: "verifier",
      state: "state-123",
      redirectUri: "https://example.test/callback",
    }),
    exchangeCode: async () => ({
      type: "success",
      access: "oauth-access",
      refresh: "oauth-refresh",
      expires: Date.now() + 3_600_000,
    }),
    refreshTokens: async () => ({
      type: "success",
      access: "oauth-access-2",
      refresh: "oauth-refresh-2",
      expires: Date.now() + 3_600_000,
    }),
    fetch: async (input, init) => {
      calls.fetch.push({ url: String(input), init: init ?? {} })
      const next = fetchQueue.shift()
      return next ? next() : new Response("{}", { status: 200 })
    },
    ...over,
  }
  return { deps, calls, readCount: () => reads }
}

interface RecordedHook {
  name: string
  callback: (event: never) => unknown
  scope?: V2HookScope
}

interface ModelRow {
  id: string
  providerID: string
  cost?: unknown
}

function makeHarness(
  options: Record<string, unknown> = {},
  models: ModelRow[] = [],
) {
  const methods: V2OAuthMethodRegistration[] = []
  const hooks: RecordedHook[] = []
  const connectCalls: Array<Record<string, unknown>> = []
  const state: { active: unknown; activeDelayMs: number } = {
    active: undefined,
    activeDelayMs: 0,
  }

  const ctx = {
    options,
    integration: {
      transform: async (cb) => {
        cb({ method: { update: (m) => methods.push(m) } })
        return registration
      },
      connection: {
        active: async () => {
          if (state.activeDelayMs) {
            await new Promise((r) => setTimeout(r, state.activeDelayMs))
          }
          return state.active
        },
      },
      oauth: {
        connect: async (input) => {
          connectCalls.push(input as Record<string, unknown>)
          return {}
        },
      },
    },
    model: {
      transform: async (cb) => {
        cb({
          list: (providerID?: string) =>
            models.filter((m) => !providerID || m.providerID === providerID),
          update: (providerID, modelID, fn) => {
            const row = models.find(
              (m) => m.providerID === providerID && m.id === modelID,
            )
            if (row) fn(row as never)
          },
        })
        return registration
      },
    },
    session: {
      hook: async (name, callback, scope) => {
        hooks.push({ name, callback: callback as never, scope })
        return registration
      },
    },
  } as V2Context

  const hook = (name: string) => {
    const found = hooks.find((h) => h.name === name)
    assert.ok(found, `hook ${name} was not registered`)
    return found.callback as (event: unknown) => Promise<void> | void
  }

  return { ctx, methods, hooks, hook, connectCalls, state, models }
}

const baseBody = {
  model: "claude-sonnet-4-5",
  stream: true,
  system: [{ type: "text", text: "You are an agent." }],
  tools: [
    { name: "bash", description: "run", input_schema: { type: "object" } },
  ],
  messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
}

function requestEvent(
  opts: {
    token?: string
    apiKey?: string
    model?: string
    method?: string
  } = {},
) {
  const headers = new Headers({
    "content-type": "application/json",
    "content-length": "999",
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "interleaved-thinking-2025-05-14",
    "user-agent": "opencode/latest/2.0.29/cli",
    "x-opencode-client": "cli",
    "x-opencode-session": "ses_1",
    "x-session-id": "ses_1",
    "x-session-affinity": "ses_1",
    "x-keep-me": "yes",
  })
  if (opts.token) headers.set("authorization", `Bearer ${opts.token}`)
  if (opts.apiKey) headers.set("x-api-key", opts.apiKey)
  const request = new Request(
    "https://api.anthropic.com/v1/messages?beta=true",
    { method: opts.method ?? "POST", headers, body: JSON.stringify(baseBody) },
  )
  return {
    model: { providerID: PROVIDER_ID, id: opts.model ?? "claude-sonnet-4-5" },
    kind: "primary",
    request,
  }
}

describe("OpenCode V2: default export shape", () => {
  it("is a V2 definition ({ id, setup }) that also carries the V1 server()", () => {
    assert.equal(typeof defaultExport, "object")
    assert.equal(defaultExport.id, V2_PLUGIN_ID)
    assert.equal(typeof defaultExport.setup, "function")
    assert.equal(typeof defaultExport.server, "function")
  })

  it("keeps the V1 function export for older OpenCode V1 releases", () => {
    assert.equal(typeof ClaudeAuthPlugin, "function")
    assert.equal(defaultExport.server, ClaudeAuthPlugin)
  })
})

describe("OpenCode V2: setup", () => {
  beforeEach(() => {
    resetExcludedBetas()
    resetPluginSettings()
    mock.method(console, "warn", () => {})
  })
  afterEach(() => {
    mock.restoreAll()
    resetPluginSettings()
  })

  it("registers both OAuth login methods on the anthropic integration", async () => {
    const h = makeHarness()
    const { deps } = makeDeps([makeAccount("file", "Claude Max")])
    await createClaudeAuthV2(deps).setup(h.ctx)

    assert.deepEqual(
      h.methods.map((m) => [m.integrationID, m.method.id, m.method.type]),
      [
        [PROVIDER_ID, METHOD_CLAUDE_CODE, "oauth"],
        [PROVIDER_ID, METHOD_OAUTH_FALLBACK, "oauth"],
      ],
    )
    assert.equal(h.methods[0].method.label, "Claude Code credentials")
    assert.equal(h.methods[1].method.label, "Claude OAuth (fallback)")
  })

  it("registers every hook scoped to the anthropic provider", async () => {
    const h = makeHarness()
    const { deps } = makeDeps([makeAccount("file", "Claude Max")])
    await createClaudeAuthV2(deps).setup(h.ctx)

    assert.deepEqual(h.hooks.map((x) => x.name).sort(), [
      "compaction",
      "context",
      "generate",
      "http.request",
      "http.response",
      "title",
    ])
    for (const hook of h.hooks) {
      assert.deepEqual(hook.scope, { providerID: PROVIDER_ID })
    }
  })

  it("only shows the account selector when there are several accounts", async () => {
    const one = makeHarness()
    await createClaudeAuthV2(
      makeDeps([makeAccount("file", "Claude")]).deps,
    ).setup(one.ctx)
    assert.equal(one.methods[0].method.form, undefined)

    const many = makeHarness()
    await createClaudeAuthV2(
      makeDeps([
        makeAccount("Claude Code-credentials", "Claude Max 1"),
        makeAccount("Claude Code-credentials-b2", "Claude Max 2"),
      ]).deps,
    ).setup(many.ctx)
    const form = many.methods[0].method.form
    assert.ok(form)
    assert.equal(form[0].key, "account")
    assert.deepEqual(
      form[0].options?.map((o) => o.value),
      ["Claude Code-credentials", "Claude Code-credentials-b2"],
    )
  })

  it("does not fail when Claude Code credentials cannot be read", async () => {
    const h = makeHarness()
    const { deps } = makeDeps([], {
      readAllClaudeAccounts: () => {
        throw new Error("keychain locked")
      },
    })
    await createClaudeAuthV2(deps).setup(h.ctx)

    assert.equal(h.methods.length, 2, "login methods are still registered")
    assert.equal(h.connectCalls.length, 0, "no auto-connect without accounts")
  })

  it("reads Claude Code accounts once even if setup runs per project location", async () => {
    const { deps, readCount } = makeDeps([makeAccount("file", "Claude")])
    const plugin = createClaudeAuthV2(deps)
    await plugin.setup(makeHarness().ctx)
    await plugin.setup(makeHarness().ctx)
    await plugin.setup(makeHarness().ctx)
    assert.equal(readCount(), 1)
  })

  it("applies the enable1mContext plugin option", async () => {
    const saved = process.env.ANTHROPIC_ENABLE_1M_CONTEXT
    delete process.env.ANTHROPIC_ENABLE_1M_CONTEXT
    try {
      assert.equal(isEnable1mContext(), false)
      const h = makeHarness({ enable1mContext: true })
      await createClaudeAuthV2(
        makeDeps([makeAccount("file", "Claude")]).deps,
      ).setup(h.ctx)
      assert.equal(isEnable1mContext(), true)
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_ENABLE_1M_CONTEXT = saved
    }
  })

  it("zeroes Anthropic model costs and leaves other providers alone", async () => {
    const tier = { input: 3, output: 15, cache: { read: 0.3, write: 3.75 } }
    const models: ModelRow[] = [
      { id: "claude-sonnet-4-5", providerID: PROVIDER_ID, cost: [{ ...tier }] },
      { id: "no-cost", providerID: PROVIDER_ID },
      { id: "gpt", providerID: "openai", cost: [{ ...tier }] },
    ]
    const h = makeHarness({}, models)
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )

    assert.deepEqual(models[0].cost, [
      { input: 0, output: 0, cache: { read: 0, write: 0 } },
    ])
    assert.equal(models[1].cost, undefined)
    assert.deepEqual(models[2].cost, [tier])
  })
})

describe("OpenCode V2: Claude Code credentials method", () => {
  beforeEach(() => mock.method(console, "warn", () => {}))
  afterEach(() => mock.restoreAll())

  async function methodFor(
    accounts: ClaudeAccount[],
    over: Partial<V2Deps> = {},
  ) {
    const h = makeHarness()
    const made = makeDeps(accounts, over)
    await createClaudeAuthV2(made.deps).setup(h.ctx)
    return { method: h.methods[0], ...made }
  }

  it("authorize returns an auto flow with the active account's credential", async () => {
    const { method, calls } = await methodFor([
      makeAccount("file", "Claude Max"),
    ])
    const auth = await method.authorize({})

    assert.equal(auth.mode, "auto")
    const credential = await (auth.callback as Promise<unknown>)
    assert.deepEqual(credential, {
      type: "oauth",
      methodID: METHOD_CLAUDE_CODE,
      access: "at-file",
      refresh: "rt-file",
      expires: (credential as { expires: number }).expires,
      metadata: { source: "file", label: "Claude Max" },
    })
    assert.match(auth.instructions, /Claude Max/)
    assert.match(auth.instructions, /credentials file/)
    assert.ok(calls.setActive.includes("file"))
    assert.deepEqual(calls.saved, ["file"])
  })

  it("authorize honours the selected account", async () => {
    const accounts = [
      makeAccount("Claude Code-credentials", "Claude Max 1"),
      makeAccount("Claude Code-credentials-b2", "Claude Max 2"),
    ]
    const { method, calls } = await methodFor(accounts, {
      getCachedCredentials: () => accounts[1].credentials,
    })
    const auth = await method.authorize({
      account: "Claude Code-credentials-b2",
    })
    const credential = (await auth.callback) as {
      access: string
      metadata: unknown
    }

    assert.equal(credential.access, "at-Claude Code-credentials-b2")
    assert.deepEqual(credential.metadata, {
      source: "Claude Code-credentials-b2",
      label: "Claude Max 2",
    })
    assert.deepEqual(calls.saved, ["Claude Code-credentials-b2"])
    assert.match(auth.instructions, /macOS Keychain/)
  })

  it("authorize fails with a clear message when no credentials exist", async () => {
    const { method } = await methodFor([makeAccount("file", "C")], {
      refreshAccountsList: () => [],
    })
    await assert.rejects(
      () => method.authorize({}),
      /No Claude Code credentials found/,
    )
  })

  it("refresh returns the freshly read credentials and keeps the source", async () => {
    const accounts = [makeAccount("file", "Claude Max")]
    const fresh = {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: Date.now() + 7_200_000,
    }
    const { method, calls } = await methodFor(accounts, {
      getCachedCredentials: () => fresh,
    })
    assert.ok(method.refresh)
    const refreshed = await method.refresh({
      type: "oauth",
      methodID: METHOD_CLAUDE_CODE,
      access: "old",
      refresh: "old-refresh",
      expires: 1,
      metadata: { source: "file", label: "Claude Max" },
    })

    assert.equal(refreshed.access, "new-access")
    assert.equal(refreshed.refresh, "new-refresh")
    assert.equal(refreshed.expires, fresh.expiresAt)
    assert.deepEqual(refreshed.metadata, {
      source: "file",
      label: "Claude Max",
    })
    assert.ok(calls.setActive.includes("file"))
  })

  it("refresh fails clearly when Claude Code credentials are unavailable", async () => {
    const { method } = await methodFor([makeAccount("file", "C")], {
      getCachedCredentials: () => null,
    })
    assert.ok(method.refresh)
    await assert.rejects(
      () =>
        method.refresh!({
          type: "oauth",
          methodID: METHOD_CLAUDE_CODE,
          access: "a",
          refresh: "r",
          expires: 1,
        }),
      /unavailable or expired/,
    )
  })

  it("labels a connection from its metadata", async () => {
    const { method } = await methodFor([makeAccount("file", "C")])
    assert.ok(method.label)
    const base = {
      type: "oauth" as const,
      methodID: "m",
      access: "a",
      refresh: "r",
      expires: 1,
    }
    assert.equal(
      method.label({ ...base, metadata: { label: "Claude Max" } }),
      "Claude Max",
    )
    assert.equal(method.label(base), undefined)
  })
})

describe("OpenCode V2: Claude OAuth (fallback) method", () => {
  beforeEach(() => mock.method(console, "warn", () => {}))
  afterEach(() => mock.restoreAll())

  async function fallbackFor(over: Partial<V2Deps> = {}) {
    const h = makeHarness()
    const made = makeDeps([makeAccount("file", "C")], over)
    await createClaudeAuthV2(made.deps).setup(h.ctx)
    return h.methods[1]
  }

  it("authorize returns a code flow with the authorization URL", async () => {
    const method = await fallbackFor()
    const auth = await method.authorize({})
    assert.equal(auth.mode, "code")
    assert.equal(auth.url, "https://example.test/authorize?x=1")
    assert.match(auth.instructions, /paste the full callback URL/)
  })

  it("callback exchanges the pasted code for a credential", async () => {
    const exchanged: unknown[] = []
    const method = await fallbackFor({
      exchangeCode: async (parsed, verifier, redirectUri, state) => {
        exchanged.push({ parsed, verifier, redirectUri, state })
        return {
          type: "success",
          access: "acc",
          refresh: "ref",
          expires: 123_456,
        }
      },
    })
    const auth = await method.authorize({})
    assert.equal(auth.mode, "code")
    const credential = await auth.callback(
      "https://x.test/cb?code=CODE&state=state-123",
    )

    assert.deepEqual(credential, {
      type: "oauth",
      methodID: METHOD_OAUTH_FALLBACK,
      access: "acc",
      refresh: "ref",
      expires: 123_456,
      metadata: { source: "oauth", label: "Claude OAuth" },
    })
    assert.deepEqual(exchanged, [
      {
        parsed: { code: "CODE", state: "state-123" },
        verifier: "verifier",
        redirectUri: "https://example.test/callback",
        state: "state-123",
      },
    ])
  })

  it("callback rejects input it cannot parse", async () => {
    const method = await fallbackFor()
    const auth = await method.authorize({})
    assert.equal(auth.mode, "code")
    await assert.rejects(
      () => auth.callback("garbage"),
      /Could not extract code and state/,
    )
  })

  it("callback surfaces an exchange failure with the server's reason", async () => {
    mock.method(console, "error", () => {})
    const method = await fallbackFor({
      exchangeCode: async () => ({ type: "failed", reason: "invalid_grant" }),
    })
    const auth = await method.authorize({})
    assert.equal(auth.mode, "code")
    await assert.rejects(
      () => auth.callback("CODE#state-123"),
      /OAuth code exchange failed: invalid_grant/,
    )
  })

  it("refresh rotates tokens through the OAuth refresh endpoint", async () => {
    const seen: string[] = []
    const method = await fallbackFor({
      refreshTokens: async (token) => {
        seen.push(token)
        return { type: "success", access: "a2", refresh: "r2", expires: 99 }
      },
    })
    assert.ok(method.refresh)
    const refreshed = await method.refresh({
      type: "oauth",
      methodID: METHOD_OAUTH_FALLBACK,
      access: "a1",
      refresh: "r1",
      expires: 1,
      metadata: { source: "oauth" },
    })
    assert.deepEqual(seen, ["r1"])
    assert.deepEqual(
      [refreshed.access, refreshed.refresh, refreshed.expires],
      ["a2", "r2", 99],
    )
  })

  it("refresh reports failure and tells the user how to recover", async () => {
    const method = await fallbackFor({
      refreshTokens: async () => ({ type: "failed", reason: "invalid_grant" }),
    })
    assert.ok(method.refresh)
    await assert.rejects(
      () =>
        method.refresh!({
          type: "oauth",
          methodID: METHOD_OAUTH_FALLBACK,
          access: "a",
          refresh: "r",
          expires: 1,
        }),
      /Sign in again with "Claude OAuth \(fallback\)"/,
    )
  })
})

describe("OpenCode V2: system prompt identity", () => {
  async function setupHooks() {
    const h = makeHarness()
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    return h
  }

  it("prepends the Claude Code identity exactly once, in every request kind", async () => {
    const h = await setupHooks()
    for (const name of ["context", "compaction", "generate", "title"]) {
      const event = {
        model: { providerID: PROVIDER_ID, id: "claude-sonnet-4-5" },
        system: [{ type: "text", text: "Be helpful." }],
      }
      await h.hook(name)(event)
      await h.hook(name)(event)
      assert.equal(event.system.length, 2, `${name}: added once`)
      assert.match(
        event.system[0].text,
        /^You are Claude Code, Anthropic's official CLI/,
      )
    }
  })

  it("does not touch other providers", async () => {
    const h = await setupHooks()
    const event = {
      model: { providerID: "openai", id: "gpt" },
      system: [{ type: "text", text: "Be helpful." }],
    }
    await h.hook("context")(event)
    assert.equal(event.system.length, 1)
  })
})

describe("OpenCode V2: http.request hook", () => {
  beforeEach(() => {
    resetExcludedBetas()
    mock.method(console, "warn", () => {})
  })
  afterEach(() => mock.restoreAll())

  async function requestHook() {
    const h = makeHarness()
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    return h.hook("http.request")
  }

  it("leaves API-key (x-api-key) requests exactly as the host built them", async () => {
    const hook = await requestHook()
    const event = requestEvent({ apiKey: "sk-ant-api03-secret" })
    const original = event.request
    await hook(event)

    assert.equal(event.request, original)
    assert.equal(event.request.headers.get("x-api-key"), "sk-ant-api03-secret")
    assert.equal(event.request.headers.get("x-opencode-session"), "ses_1")
  })

  it("sends a raw console API key as x-api-key instead of a Bearer token", async () => {
    const hook = await requestHook()
    const event = requestEvent({ token: "sk-ant-api03-rawkey" })
    await hook(event)

    assert.equal(event.request.headers.get("authorization"), null)
    assert.equal(event.request.headers.get("x-api-key"), "sk-ant-api03-rawkey")
    assert.equal(event.request.headers.get("x-app"), null)
  })

  it("applies Claude Code headers to an OAuth Bearer request", async () => {
    const hook = await requestHook()
    const event = requestEvent({ token: "sk-ant-oat01-token" })
    await hook(event)
    const h = event.request.headers

    assert.equal(h.get("authorization"), "Bearer sk-ant-oat01-token")
    assert.equal(h.get("x-api-key"), null)
    assert.equal(h.get("x-app"), "cli")
    assert.match(h.get("user-agent") ?? "", /^claude-cli\//)
    assert.ok(h.get("x-claude-code-session-id"))
    assert.ok(h.get("x-client-request-id"))
    assert.equal(h.get("anthropic-version"), "2023-06-01")
    const betas = (h.get("anthropic-beta") ?? "").split(",")
    assert.ok(betas.includes("claude-code-20250219"))
    assert.ok(betas.includes("oauth-2025-04-20"))
    assert.ok(
      betas.includes("interleaved-thinking-2025-05-14"),
      "host beta is merged",
    )
  })

  it("drops OpenCode-identifying headers but keeps unrelated ones", async () => {
    const hook = await requestHook()
    const event = requestEvent({ token: "sk-ant-oat01-token" })
    await hook(event)
    const h = event.request.headers

    assert.equal(h.get("x-opencode-client"), null)
    assert.equal(h.get("x-opencode-session"), null)
    assert.equal(h.get("x-session-id"), null)
    assert.equal(h.get("x-session-affinity"), null)
    assert.equal(h.get("x-keep-me"), "yes")
  })

  it("replaces the request with the transformed body and a recomputed length", async () => {
    const hook = await requestHook()
    const event = requestEvent({ token: "sk-ant-oat01-token" })
    const original = event.request
    await hook(event)

    assert.notEqual(event.request, original)
    assert.equal(event.request.method, "POST")
    assert.equal(event.request.url, original.url)
    assert.equal(event.request.headers.get("content-length"), null)

    const sent = JSON.parse(await event.request.text()) as {
      tools: Array<{ name: string }>
      system: Array<{ text: string }>
    }
    const expected = JSON.parse(
      transformBody(JSON.stringify(baseBody)) as string,
    ) as typeof sent
    assert.equal(sent.tools[0].name, "mcp_Bash")
    assert.match(sent.system[0].text, /^x-anthropic-billing-header/)
    assert.deepEqual(sent.tools, expected.tools)
  })

  it("applies previously excluded betas to later requests, including the host's own", async () => {
    addExcludedBeta("claude-sonnet-4-5", "interleaved-thinking-2025-05-14")
    const hook = await requestHook()
    const event = requestEvent({ token: "sk-ant-oat01-token" })
    await hook(event)

    const betas = (event.request.headers.get("anthropic-beta") ?? "").split(",")
    assert.ok(
      !betas.includes("interleaved-thinking-2025-05-14"),
      betas.join(","),
    )
    assert.ok(betas.includes("claude-code-20250219"))
  })

  it("never throws into the host if the event is malformed", async () => {
    const hook = await requestHook()
    await assert.doesNotReject(async () => {
      await hook({ model: { providerID: PROVIDER_ID, id: "m" }, request: {} })
    })
  })
})

const longContext = () =>
  new Response(
    '{"error":{"message":"Extra usage is required for long context requests."}}',
    { status: 400 },
  )

describe("OpenCode V2: http.response hook", () => {
  beforeEach(() => {
    resetExcludedBetas()
    mock.method(console, "warn", () => {})
  })
  afterEach(() => mock.restoreAll())

  async function flow(
    token: string,
    response: Response,
    over: Partial<V2Deps> = {},
    model = "claude-sonnet-4-5",
    fetchQueue: Array<() => Response> = [],
  ) {
    const h = makeHarness()
    const made = makeDeps([makeAccount("file", "C")], over, fetchQueue)
    await createClaudeAuthV2(made.deps).setup(h.ctx)

    const reqEvent = requestEvent({ token, model })
    await h.hook("http.request")(reqEvent)

    const respEvent = {
      model: reqEvent.model,
      kind: "primary",
      request: reqEvent.request,
      response,
    }
    await h.hook("http.response")(respEvent)
    return { respEvent, ...made }
  }

  it("ignores responses for requests this plugin did not prepare", async () => {
    const h = makeHarness()
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    const response = new Response("x", { status: 200 })
    const event = { request: requestEvent({ apiKey: "k" }).request, response }
    await h.hook("http.response")(event)
    assert.equal(event.response, response)
  })

  it("strips the mcp_ tool prefix from a streamed response", async () => {
    const sse =
      'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"t1","name":"mcp_Bash","input":{}}}\n\n'
    const { respEvent } = await flow(
      "sk-ant-oat01-token",
      new Response(sse, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    )
    const text = await respEvent.response.text()
    assert.ok(!text.includes("mcp_"), text)
    assert.match(text, /"name": ?"bash"/)
  })

  it("retries once with a different token after a 401", async () => {
    const rotated = {
      accessToken: "sk-ant-oat01-ROTATED",
      refreshToken: "r",
      expiresAt: Date.now() + 3_600_000,
    }
    const { respEvent, calls } = await flow(
      "sk-ant-oat01-old",
      new Response('{"error":{"message":"bad token"}}', { status: 401 }),
      { getCachedCredentials: () => rotated },
    )

    assert.equal(calls.fetch.length, 1)
    assert.ok(
      calls.invalidated >= 1,
      "cache must be bypassed before re-reading",
    )
    const headers = new Headers(calls.fetch[0].init.headers)
    assert.equal(headers.get("authorization"), "Bearer sk-ant-oat01-ROTATED")
    assert.equal(headers.get("x-api-key"), null)
    assert.equal(calls.fetch[0].init.method, "POST")
    assert.equal(respEvent.response.status, 200)
  })

  it("does not retry a 401 when no newer token is available", async () => {
    const { respEvent, calls } = await flow(
      "sk-ant-oat01-same",
      new Response('{"error":{"message":"bad token"}}', { status: 401 }),
      {
        getCachedCredentials: () => ({
          accessToken: "sk-ant-oat01-same",
          refreshToken: "r",
          expiresAt: Date.now() + 3_600_000,
        }),
      },
    )
    assert.equal(calls.fetch.length, 0)
    assert.equal(respEvent.response.status, 401)
  })

  it("excludes a long-context beta and retries on a long-context 400", async () => {
    const { respEvent, calls } = await flow("sk-ant-oat01-token", longContext())

    assert.equal(calls.fetch.length, 1)
    assert.equal(respEvent.response.status, 200)
    assert.ok(
      getExcludedBetas("claude-sonnet-4-5").has("context-1m-2025-08-07"),
    )
  })

  it("keeps excluding betas, rebuilding from the original headers, across retries", async () => {
    const { respEvent, calls } = await flow(
      "sk-ant-oat01-token",
      new Response(
        '{"error":{"message":"Extra usage is required for long context requests."}}',
        { status: 400 },
      ),
      {},
      "claude-sonnet-4-5",
      [
        () =>
          new Response('{"error":{"message":"You\'re out of extra usage"}}', {
            status: 429,
          }),
        () => new Response("{}", { status: 200 }),
      ],
    )

    // First retry excluded context-1m, second excluded interleaved-thinking.
    assert.equal(calls.fetch.length, 2)
    const lastBetas = (
      new Headers(calls.fetch[1].init.headers).get("anthropic-beta") ?? ""
    ).split(",")
    assert.ok(
      !lastBetas.includes("interleaved-thinking-2025-05-14"),
      lastBetas.join(","),
    )
    assert.ok(lastBetas.includes("claude-code-20250219"))
    assert.equal(respEvent.response.status, 200)
  })

  it("passes ordinary errors through and does not retry them", async () => {
    const { respEvent, calls } = await flow(
      "sk-ant-oat01-token",
      new Response('{"error":{"message":"overloaded"}}', { status: 529 }),
    )
    assert.equal(calls.fetch.length, 0)
    assert.equal(respEvent.response.status, 529)
    assert.match(await respEvent.response.text(), /overloaded/)
  })
})

describe("OpenCode V2: auto-connect", () => {
  beforeEach(() => mock.method(console, "warn", () => {}))
  afterEach(() => mock.restoreAll())

  it("connects Claude Code credentials when Anthropic has no connection", async () => {
    const h = makeHarness()
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    assert.deepEqual(h.connectCalls, [
      { integrationID: PROVIDER_ID, methodID: METHOD_CLAUDE_CODE },
    ])
  })

  it("never overrides an existing Anthropic connection", async () => {
    const h = makeHarness()
    h.state.active = { type: "credential", id: "cred_1" }
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    assert.equal(h.connectCalls.length, 0)
  })

  it("can be disabled with the autoConnect option", async () => {
    const h = makeHarness({ autoConnect: false })
    await createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
      h.ctx,
    )
    assert.equal(h.connectCalls.length, 0)
  })

  it("does nothing when there are no Claude Code accounts", async () => {
    const h = makeHarness()
    await createClaudeAuthV2(makeDeps([]).deps).setup(h.ctx)
    assert.equal(h.connectCalls.length, 0)
  })

  it("connects only once when several locations start at the same time", async () => {
    const a = makeHarness()
    const b = makeHarness()
    a.state.activeDelayMs = 30
    b.state.activeDelayMs = 30
    const plugin = createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps)
    await Promise.all([plugin.setup(a.ctx), plugin.setup(b.ctx)])
    assert.equal(a.connectCalls.length + b.connectCalls.length, 1)
  })

  it("survives a connect failure without breaking plugin setup", async () => {
    const h = makeHarness()
    ;(h.ctx.integration.oauth as { connect: unknown }).connect = async () => {
      throw new Error("host unavailable")
    }
    await assert.doesNotReject(() =>
      createClaudeAuthV2(makeDeps([makeAccount("file", "C")]).deps).setup(
        h.ctx,
      ),
    )
  })
})
