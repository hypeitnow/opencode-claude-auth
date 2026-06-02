// PKCE (Proof Key for Code Exchange) helper for OAuth 2.0 flows.
// Ported from ex-machina/opencode-anthropic-auth to support the fallback
// "Claude OAuth" authorization method that triggers when the raw `sk-ant-`
// Keychain key is rejected by Anthropic's API (e.g. for org-locked accounts
// where the only direct auth method is OAuth, not a console API key).

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = ""
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export async function generatePKCE(): Promise<{
  verifier: string
  challenge: string
  method: "S256"
}> {
  const buf = new Uint8Array(64)
  crypto.getRandomValues(buf)
  const verifier = base64UrlEncode(buf)
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  )
  return {
    verifier,
    challenge: base64UrlEncode(new Uint8Array(digest)),
    method: "S256",
  }
}
