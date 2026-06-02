import { test, describe } from "node:test"
import { strict as assert } from "node:assert"
import { generatePKCE } from "./pkce.ts"

describe("generatePKCE", () => {
  test("returns S256 method", async () => {
    const pkce = await generatePKCE()
    assert.equal(pkce.method, "S256")
  })

  test("verifier is URL-safe base64 (no +, /, =)", async () => {
    const pkce = await generatePKCE()
    assert.equal(
      !!pkce.verifier.match(/^[A-Za-z0-9_-]+$/),
      true,
      "verifier has unsafe chars",
    )
    assert.equal(pkce.verifier.includes("+"), false)
    assert.equal(pkce.verifier.includes("/"), false)
    assert.equal(pkce.verifier.includes("="), false)
  })

  test("verifier is 64 bytes of randomness → ~86 base64 chars", async () => {
    const pkce = await generatePKCE()
    assert.ok(
      pkce.verifier.length > 80,
      `verifier length ${pkce.verifier.length} too short`,
    )
    assert.ok(
      pkce.verifier.length < 100,
      `verifier length ${pkce.verifier.length} too long`,
    )
  })

  test("challenge is URL-safe base64", async () => {
    const pkce = await generatePKCE()
    assert.equal(!!pkce.challenge.match(/^[A-Za-z0-9_-]+$/), true)
  })

  test("challenge is 43 chars (SHA-256 = 32 bytes → ~43 base64)", async () => {
    const pkce = await generatePKCE()
    assert.equal(pkce.challenge.length, 43)
  })

  test("verifier differs across calls (cryptographic randomness)", async () => {
    const a = await generatePKCE()
    const b = await generatePKCE()
    assert.notEqual(a.verifier, b.verifier)
    assert.notEqual(a.challenge, b.challenge)
  })

  test("challenge is deterministic for the same verifier", async () => {
    // We can't reuse a verifier, but we can verify the structure: the
    // challenge for any given verifier must be SHA-256(verifier) base64url'd.
    // Re-implementing the digest here to cross-check.
    const pkce = await generatePKCE()
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(pkce.verifier),
    )
    const bytes = new Uint8Array(digest)
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    const expected = btoa(bin)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
    assert.equal(pkce.challenge, expected)
  })
})
