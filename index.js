// Entry for OpenCode 2 local-directory plugins: it only discovers a directory whose
// entry file is named index.js. Use it as `"plugins": ["/path/to/this/checkout"]`.
// Installs from npm use package.json "exports" and do not need this file.
export { ClaudeAuthPlugin, default } from "./opencode-claude-auth.js"
