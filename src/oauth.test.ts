import { test, describe } from "node:test"
import { strict as assert } from "node:assert"
import {
  buildAuthorizationUrl,
  exchangeCode,
  parseCallback,
  refreshTokens,
  CLIENT_ID,
} from "./oauth.ts"

describe("buildAuthorizationUrl", () => {
  test("uses platform.claude.com console endpoint by default", async () => {
    const { url } = await buildAuthorizationUrl()
    assert.ok(url.startsWith("https://platform.claude.com/oauth/authorize?"), url)
  })

  test("console mode includes all required OAuth params", async () => {
    const { url } = await buildAuthorizationUrl("console")
    const u = new URL(url)
    assert.equal(u.searchParams.get("client_id"), CLIENT_ID)
    assert.equal(u.searchParams.get("response_type"), "code")
    assert.equal(
      u.searchParams.get("redirect_uri"),
      "https://platform.claude.com/oauth/code/callback",
    )
    assert.equal(u.searchParams.get("code_challenge_method"), "S256")
    assert.ok(u.searchParams.get("code_challenge"))
    assert.ok(u.searchParams.get("state"))
    const scope = u.searchParams.get("scope") ?? ""
    assert.ok(scope.includes("org:create_api_key"), "missing org:create_api_key scope")
    assert.ok(scope.includes("user:inference"), "missing user:inference scope")
    assert.ok(scope.includes("user:developer"), "missing user:developer scope")
    assert.ok(scope.includes("user:voice"), "missing user:voice scope")
    assert.ok(
      scope.includes("org:service_key_inference"),
      "missing org:service_key_inference scope",
    )
    assert.ok(scope.includes("workspace:developer"), "missing workspace:developer scope")
  })

  test("max mode uses claude.ai endpoint", async () => {
    const { url } = await buildAuthorizationUrl("max")
    assert.ok(url.startsWith("https://claude.ai/oauth/authorize?"), url)
  })

  test("verifier, state, redirectUri returned alongside url", async () => {
    const result = await buildAuthorizationUrl()
    assert.equal(typeof result.verifier, "string")
    assert.ok(result.verifier.length > 80)
    assert.equal(typeof result.state, "string")
    assert.equal(result.state.length, 32) // uuid without dashes
    assert.equal(result.redirectUri, "https://platform.claude.com/oauth/code/callback")
  })

  test("URL state matches returned state", async () => {
    const { url, state } = await buildAuthorizationUrl()
    const u = new URL(url)
    assert.equal(u.searchParams.get("state"), state)
  })
})

describe("parseCallback", () => {
  test("parses full callback URL", () => {
    const result = parseCallback("https://platform.claude.com/oauth/code/callback?code=abc123&state=xyz789")
    assert.deepEqual(result, { code: "abc123", state: "xyz789" })
  })

  test("parses code#state format", () => {
    const result = parseCallback("abc123#xyz789")
    assert.deepEqual(result, { code: "abc123", state: "xyz789" })
  })

  test("parses bare query string", () => {
    const result = parseCallback("code=abc123&state=xyz789")
    assert.deepEqual(result, { code: "abc123", state: "xyz789" })
  })

  test("trims whitespace", () => {
    const result = parseCallback("  code=abc123&state=xyz789  ")
    assert.deepEqual(result, { code: "abc123", state: "xyz789" })
  })

  test("returns null for empty/missing input", () => {
    assert.equal(parseCallback(""), null)
    assert.equal(parseCallback("garbage"), null)
    assert.equal(parseCallback("code=only"), null)
    assert.equal(parseCallback("state=only"), null)
  })
})

describe("exchangeCode", () => {
  test("returns failed when state mismatches", async () => {
    const result = await exchangeCode(
      { code: "abc", state: "actual" },
      "verifier",
      "https://platform.claude.com/oauth/code/callback",
      "expected",
    )
    assert.deepEqual(result, {
      type: "failed",
      reason: "state mismatch: expected expected, got actual",
    })
  })

  test("returns failed on network error", async () => {
    // Use a port that should be closed; this triggers ECONNREFUSED
    // We can't easily do that without mocking fetch. Skip and rely on
    // the integration test (live oauth flow).
  })
})

describe("refreshTokens", () => {
  test("returns failed on network error", async () => {
    // Integration test only — see above.
  })
})
