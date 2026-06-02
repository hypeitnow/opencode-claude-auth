#!/usr/bin/env node
// Build script: compile TypeScript and copy anthropic-prompt.txt to dist/
// Resolves tsc from any node_modules/typescript in the resolution path so it
// works whether the package is installed via npm, bun, pnpm, or yarn.
import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, "..")
const require = createRequire(import.meta.url)

let tscPath
try {
  tscPath = require.resolve("typescript/bin/tsc")
} catch {
  console.error("build.mjs: cannot find typescript in node_modules")
  process.exit(1)
}

execFileSync(process.execPath, [tscPath], {
  cwd: packageRoot,
  stdio: "inherit",
})

const distDir = join(packageRoot, "dist")
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true })
copyFileSync(
  join(packageRoot, "src", "anthropic-prompt.txt"),
  join(distDir, "anthropic-prompt.txt"),
)

console.log("build.mjs: ok")
