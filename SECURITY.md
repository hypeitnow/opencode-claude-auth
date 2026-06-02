# Security Policy

## Supported versions

Only the latest published version on npm receives security updates. Older versions are unsupported.

| Version        | Supported      |
| -------------- | -------------- |
| `latest` (npm) | ✅ Active      |
| Older          | ❌ End of life |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security-sensitive reports.

Use GitHub's [private vulnerability reporting](https://github.com/hypeitnow/opencode-claude-auth/security/advisories/new) on the **Security** tab. You'll get an acknowledgement within 72 hours.

Include:

- A clear description of the vulnerability and its impact
- Reproduction steps (keychain entry type, model, headers, etc.)
- The plugin version + opencode version
- The macOS / Linux / Windows version

## What to expect

- Initial acknowledgement within 72 hours
- Triage decision (accepted / won't fix / duplicate) within 7 days
- Patch timeline: 30 days for high-severity, 90 days for medium/low
- Public advisory disclosure only after a fix is shipped, unless the vulnerability is already public

## Threat model

This plugin reads OAuth tokens and console API keys from local storage (macOS Keychain / `~/.claude/.credentials.json`) and forwards them to Anthropic's API.

In-scope vulnerabilities:

- Token leakage to unintended destinations (logs, network, disk)
- Bypass of keychain access controls (privilege escalation on macOS)
- OAuth flow bypass (token theft via crafted callback URL)
- Code execution from a maliciously crafted credential blob
- 401 handler logic that causes infinite token refresh or denial of service

Out of scope:

- The Anthropic API itself (report to Anthropic)
- The `claude` CLI binary (report to Anthropic)
- The `opencode` runtime (report to sst/opencode)
- Compromise of the user's macOS keychain password

## Local credential handling

- All secrets are redacted from `~/.local/share/opencode/claude-auth-debug.log` (gated by `CLAUDE_AUTH_DEBUG=1`)
- Auth state lives in `~/.local/share/opencode/auth.json` (mode 0600) — never commit this file
- macOS Keychain entries are only read; the plugin never writes raw `sk-ant-*` keys back to the Keychain (would corrupt the entry)
- Linux/Windows: credentials are read from `~/.claude/.credentials.json` and re-written on OAuth refresh (refresh tokens rotate on use)
