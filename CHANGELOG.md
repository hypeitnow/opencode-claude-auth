# Changelog

## 1.0.0 (2026-06-02)


### ⚠ BREAKING CHANGES

* context-1m-2025-08-07 is no longer sent by default. Claude Max users who relied on automatic 1M context must set the env var.

### Features

* add Claude Opus 4.7 model support ([#203](https://github.com/hypeitnow/opencode-claude-auth/issues/203)) ([cc96338](https://github.com/hypeitnow/opencode-claude-auth/commit/cc963387b7a6d95c9dbdd1782c2e594b5aa3d6ba))
* add CLI-based token refresh, file credential fallback, and session prompt injection ([cf37b3e](https://github.com/hypeitnow/opencode-claude-auth/commit/cf37b3e2cb4fe0eda742bfd25a63258f186a945c))
* add CLI-based token refresh, file credential fallback, and session prompt injection ([a122e95](https://github.com/hypeitnow/opencode-claude-auth/commit/a122e95577c7ada7b81fe5995a0465c1de288620))
* add env var overrides and retry logic with backoff ([#45](https://github.com/hypeitnow/opencode-claude-auth/issues/45)) ([1335286](https://github.com/hypeitnow/opencode-claude-auth/commit/13352867a1472fe29bc859e66328ff93e75713ff))
* add Homebrew formula for brew install support ([#68](https://github.com/hypeitnow/opencode-claude-auth/issues/68)) ([6beb56e](https://github.com/hypeitnow/opencode-claude-auth/commit/6beb56e7f56da35d9fa5724d9cc7d86d4b590c51))
* add macOS keychain credential reader ([15ace34](https://github.com/hypeitnow/opencode-claude-auth/commit/15ace34dbdb8708906939edd80b5537c5bab012e))
* add release workflow with auto-tagging ([#2](https://github.com/hypeitnow/opencode-claude-auth/issues/2)) ([6fdba54](https://github.com/hypeitnow/opencode-claude-auth/commit/6fdba54ac60d2f09972183990e876cf927bfee7e))
* add semantic PR validation ([3e9aa24](https://github.com/hypeitnow/opencode-claude-auth/commit/3e9aa2415823c34f51ab59b8f19498c8ef44496b))
* config file alternative for 1M context setting ([#90](https://github.com/hypeitnow/opencode-claude-auth/issues/90)) ([d27382f](https://github.com/hypeitnow/opencode-claude-auth/commit/d27382f59b17b172b6c33831e585a25e21ab943f))
* implement auth hook with custom fetch wrapper and token refresh ([aa88bf9](https://github.com/hypeitnow/opencode-claude-auth/commit/aa88bf990001ff8903176361d30006bfd8a37c01))
* macOS support multiple Claude Code accounts from keychain ([#63](https://github.com/hypeitnow/opencode-claude-auth/issues/63)) ([4594b36](https://github.com/hypeitnow/opencode-claude-auth/commit/4594b36f2c732d6a27ccd798112019ea4bc748b8))
* model config refactor and Claude CLI intercept script ([#78](https://github.com/hypeitnow/opencode-claude-auth/issues/78)) ([89f23fe](https://github.com/hypeitnow/opencode-claude-auth/commit/89f23fec38810e4839cfb576d94f21da1330886d))
* **oauth:** add Claude OAuth fallback when raw key returns 401 ([d02628e](https://github.com/hypeitnow/opencode-claude-auth/commit/d02628e5968c138c30fe0c3a1c3d0221eec2ce63))
* **oauth:** request all 7 API-required scopes ([7d6937f](https://github.com/hypeitnow/opencode-claude-auth/commit/7d6937fe96c1ba0d4162d4c0968f06e20de60d97))
* read raw 'Claude Code' Keychain entry as long-lived API key ([2713d40](https://github.com/hypeitnow/opencode-claude-auth/commit/2713d40adae18b0699d63a2cc9d1cabf3c4997ca))
* self-contained auth provider (no builtin dependency, anti-fingerprint) ([#38](https://github.com/hypeitnow/opencode-claude-auth/issues/38)) ([34ae5df](https://github.com/hypeitnow/opencode-claude-auth/commit/34ae5dfe1bbae4c57cc5be86a2dcf25579d85a06))


### Bug Fixes

* add -g flag to npm install and preferGlobal ([#22](https://github.com/hypeitnow/opencode-claude-auth/issues/22)) ([fba53ef](https://github.com/hypeitnow/opencode-claude-auth/commit/fba53ef30afd4e15f95afa10e2e0a2f98d49c938))
* add debug logger for auth flow diagnostics ([#84](https://github.com/hypeitnow/opencode-claude-auth/issues/84)) ([#85](https://github.com/hypeitnow/opencode-claude-auth/issues/85)) ([0fc246a](https://github.com/hypeitnow/opencode-claude-auth/commit/0fc246a4362f642c5f0be59b31d3b9430c0d1869))
* add exports["./server"] for opencode 1.3.8 plugin loader compatibility ([#102](https://github.com/hypeitnow/opencode-claude-auth/issues/102)) ([efecefd](https://github.com/hypeitnow/opencode-claude-auth/commit/efecefda9fd7d63b8c42466a6277fc03b0057faa))
* add issues write permission for labels ([#15](https://github.com/hypeitnow/opencode-claude-auth/issues/15)) ([0fc57a6](https://github.com/hypeitnow/opencode-claude-auth/commit/0fc57a61fda3df2550f9b4890211897ac745e365))
* add logging to refresh failure path for diagnostics ([#94](https://github.com/hypeitnow/opencode-claude-auth/issues/94)) ([5d80a59](https://github.com/hypeitnow/opencode-claude-auth/commit/5d80a59be04fb385941f7c20349746b69b7a2393))
* add missing API request headers for parity with Claude Code ([#109](https://github.com/hypeitnow/opencode-claude-auth/issues/109)) ([5d6455d](https://github.com/hypeitnow/opencode-claude-auth/commit/5d6455da3c41e40f16c65e7378eb31d500da27b7))
* **auth:** write raw key as type:api and preserve user api entries ([e273493](https://github.com/hypeitnow/opencode-claude-auth/commit/e2734930037e80ac844aed1ad58048b1837584a5))
* auto-retry with beta flag fallback for long context errors ([#52](https://github.com/hypeitnow/opencode-claude-auth/issues/52)) ([a6664f4](https://github.com/hypeitnow/opencode-claude-auth/commit/a6664f461cc103c51eff9fca9ebc38aeb6e97a36)), closes [#51](https://github.com/hypeitnow/opencode-claude-auth/issues/51)
* avoid duplicating cache_control when splitting identity system entry ([#131](https://github.com/hypeitnow/opencode-claude-auth/issues/131)) ([adcfd61](https://github.com/hypeitnow/opencode-claude-auth/commit/adcfd61b62401b82bc65bd34b7b2276ebd89ae2f))
* clear anthropic entry from auth.json before setting credentials ([#8](https://github.com/hypeitnow/opencode-claude-auth/issues/8)) ([1851524](https://github.com/hypeitnow/opencode-claude-auth/commit/18515249415fa7ca6544b11306ed039f44d35eb7))
* combine release and npm publish in single workflow ([#19](https://github.com/hypeitnow/opencode-claude-auth/issues/19)) ([e36ae44](https://github.com/hypeitnow/opencode-claude-auth/commit/e36ae44c85da4e91f6d1e45edb94805add4a1ff9))
* compute CCH signing for billing header, fix system prompt splitting ([#116](https://github.com/hypeitnow/opencode-claude-auth/issues/116)) ([f2e101a](https://github.com/hypeitnow/opencode-claude-auth/commit/f2e101ae241388d3e2e1fd747230d6ce73d34b75))
* convert lightweight tags to annotated tags after release ([#10](https://github.com/hypeitnow/opencode-claude-auth/issues/10)) ([7b21f8a](https://github.com/hypeitnow/opencode-claude-auth/commit/7b21f8a64ae001cde16127f93491049b1d9cb9b1))
* detect out-of-extra-usage error and cap retry-after delay ([#211](https://github.com/hypeitnow/opencode-claude-auth/issues/211)) ([88a114e](https://github.com/hypeitnow/opencode-claude-auth/commit/88a114efd273d3f32908a31494363adce30cd9de))
* eliminate idle token consumption via direct OAuth refresh ([#104](https://github.com/hypeitnow/opencode-claude-auth/issues/104)) ([e7483d7](https://github.com/hypeitnow/opencode-claude-auth/commit/e7483d7108d1d00f4bccc11d540fb375d7361d5f))
* exclude CHANGELOG.md from oxfmt formatting checks ([ddcd97e](https://github.com/hypeitnow/opencode-claude-auth/commit/ddcd97e99864ca434cb3f9961802ae4567b5aef5))
* exclude interleaved-thinking beta for haiku models ([#120](https://github.com/hypeitnow/opencode-claude-auth/issues/120)) ([de5d806](https://github.com/hypeitnow/opencode-claude-auth/commit/de5d806b995a31d5840c11a0cac1198e08eafbea))
* fetch tags in checkout and script for annotated tag conversion ([#12](https://github.com/hypeitnow/opencode-claude-auth/issues/12)) ([7a56103](https://github.com/hypeitnow/opencode-claude-auth/commit/7a561031bd8cd44ea75967a64a9881495da4e1a1))
* handle date-suffixed model IDs and additional long context error message ([4d790a9](https://github.com/hypeitnow/opencode-claude-auth/commit/4d790a9bf0f862a1a547705ec2cd0584cf98d402))
* increase max buffer for reading keychain dump ([#201](https://github.com/hypeitnow/opencode-claude-auth/issues/201)) ([2f97161](https://github.com/hypeitnow/opencode-claude-auth/commit/2f97161d36810ee0d9c7be6de95c66bf844eee2f))
* make context-1m beta opt-in to fix long context billing errors ([#64](https://github.com/hypeitnow/opencode-claude-auth/issues/64)) ([#65](https://github.com/hypeitnow/opencode-claude-auth/issues/65)) ([f8cb63d](https://github.com/hypeitnow/opencode-claude-auth/commit/f8cb63d69dab178dc3fe9ca4bf7d849e7d0a661a))
* **oauth:** add reason to refreshTokens network-error return ([d4a615c](https://github.com/hypeitnow/opencode-claude-auth/commit/d4a615cc8cfde6d60dbdc4b2414dad1345b4e438))
* **oauth:** add reason to state-mismatch return ([9b8371d](https://github.com/hypeitnow/opencode-claude-auth/commit/9b8371d92e3c5fedca73bb6aa5c9e07c0eed3f75))
* **oauth:** also log exchange failure to stderr for visibility ([0cac5ca](https://github.com/hypeitnow/opencode-claude-auth/commit/0cac5cae1fcd0937f8616d04347685c111ae23bd))
* **oauth:** drop 4 scopes not registered with this app ([fede8ca](https://github.com/hypeitnow/opencode-claude-auth/commit/fede8ca899ef6335bdc03ce27fff979385235abc))
* **oauth:** drop user:ccr_inference (rejected as 'Unknown scope' by OAuth server) ([36c0df3](https://github.com/hypeitnow/opencode-claude-auth/commit/36c0df3582b577c79847819195eed7177a68762d))
* **oauth:** drop workspace:inference (rejected as 'Unknown scope' by OAuth server) ([e7d4390](https://github.com/hypeitnow/opencode-claude-auth/commit/e7d4390644d3c30054bcf0d13de85bdb6f2610e2))
* **oauth:** parse code#state input in callback (was passing the whole string as code) ([395a9a9](https://github.com/hypeitnow/opencode-claude-auth/commit/395a9a9b60626e6e6b899632490d37f194086d8c))
* **oauth:** prefer auth.json OAuth over keychain raw key on every fetch ([51b8ed5](https://github.com/hypeitnow/opencode-claude-auth/commit/51b8ed5aff788240148a034c3023b8f09c3396ba))
* **oauth:** show full response body in error message ([d52e1dc](https://github.com/hypeitnow/opencode-claude-auth/commit/d52e1dc92d52fe585a0d37f38fedf7164e16eb9e))
* **oauth:** stringify object error fields instead of templating [object Object] ([05220a6](https://github.com/hypeitnow/opencode-claude-auth/commit/05220a65d281f8cf3bfe9b1b7db519b984884ecb))
* **oauth:** surface the actual server error from the token exchange ([7c20107](https://github.com/hypeitnow/opencode-claude-auth/commit/7c2010709566f14a0dd534198b7e425e948c52dc))
* PascalCase tool names after mcp_ prefix to match Claude Code convention ([#191](https://github.com/hypeitnow/opencode-claude-auth/issues/191)) ([9121ca4](https://github.com/hypeitnow/opencode-claude-auth/commit/9121ca47a5e9757e041aea240a29c10e4dfabf95))
* re-trigger npm publish after failed v1.4.8 release ([#150](https://github.com/hypeitnow/opencode-claude-auth/issues/150)) ([5412711](https://github.com/hypeitnow/opencode-claude-auth/commit/5412711bca7e5596c3784573d249d4db53ef9427))
* register transform hook even when no OAuth accounts exist ([#111](https://github.com/hypeitnow/opencode-claude-auth/issues/111)) ([ac8b780](https://github.com/hypeitnow/opencode-claude-auth/commit/ac8b7808183561b6c7b9fde8bcdb1b930b9993bb))
* release workflow permissions and restore npm badge ([f65d8ca](https://github.com/hypeitnow/opencode-claude-auth/commit/f65d8ca481d0ba332e7dfdfb688b739f16561c30))
* reload .credentials.json on cache miss to detect external updates ([#220](https://github.com/hypeitnow/opencode-claude-auth/issues/220)) ([6ff5dc7](https://github.com/hypeitnow/opencode-claude-auth/commit/6ff5dc76536cd0fbc5dd1b1a456cba968e642787))
* relocate system prompt to user message to avoid OAuth 400 rejection ([#148](https://github.com/hypeitnow/opencode-claude-auth/issues/148)) ([bb6320c](https://github.com/hypeitnow/opencode-claude-auth/commit/bb6320cbe9c985a89258bf2ca1e027f2be7cd923))
* repair orphaned tool_use/tool_result pairs before API request ([#136](https://github.com/hypeitnow/opencode-claude-auth/issues/136)) ([ceaf742](https://github.com/hypeitnow/opencode-claude-auth/commit/ceaf742c6249a898fcf5617383e6c1a6a71770e5)), closes [#133](https://github.com/hypeitnow/opencode-claude-auth/issues/133)
* restore Claude subscription auth parity for Claude Code 2.1.112 ([#207](https://github.com/hypeitnow/opencode-claude-auth/issues/207)) ([572f94c](https://github.com/hypeitnow/opencode-claude-auth/commit/572f94c3869eb2d17c87f2d6f6f8e87d05b21af5))
* restore package root shim for plugin resolution ([#61](https://github.com/hypeitnow/opencode-claude-auth/issues/61)) ([cc02950](https://github.com/hypeitnow/opencode-claude-auth/commit/cc02950d789f24bf29b99a33efc13a8dca7a535e))
* run CLI token refresh in tmpdir instead of inheriting cwd ([#96](https://github.com/hypeitnow/opencode-claude-auth/issues/96)) ([7db98a1](https://github.com/hypeitnow/opencode-claude-auth/commit/7db98a1e36fd8ffd775e14c2bd6c4f76c7a141b8))
* strip effort parameter from request body for haiku models ([#126](https://github.com/hypeitnow/opencode-claude-auth/issues/126)) ([d163938](https://github.com/hypeitnow/opencode-claude-auth/commit/d1639387ca35391c6516f79d7121dad33544f69b))
* sync Claude Code credentials to auth.json directly ([#25](https://github.com/hypeitnow/opencode-claude-auth/issues/25)) ([98ac5b7](https://github.com/hypeitnow/opencode-claude-auth/commit/98ac5b79ffa2f51e860e8e28e08321f34624fa51))
* trigger v0.5.4 release ([0429da5](https://github.com/hypeitnow/opencode-claude-auth/commit/0429da5bb205fbf195ac87aa4cc671a0ab1e653d))
* update repository URL to griffinmartin ([14da192](https://github.com/hypeitnow/opencode-claude-auth/commit/14da1926a6e2dcdbac42bba74100c3709a7598cc))
* update semantic PR action to v6 with pull_request_target ([47b7955](https://github.com/hypeitnow/opencode-claude-auth/commit/47b79554fefcd761ca552b4929223bcd966b5cd2))
* use LOCALAPPDATA for auth.json path on native Windows ([#30](https://github.com/hypeitnow/opencode-claude-auth/issues/30)) ([916a2fe](https://github.com/hypeitnow/opencode-claude-auth/commit/916a2fe21096e4f7d8c253a875e8b9e6aad7aab4))
* use Object.keys guard for thinking cleanup instead of budget_tokens sentinel ([#129](https://github.com/hypeitnow/opencode-claude-auth/issues/129)) ([174875a](https://github.com/hypeitnow/opencode-claude-auth/commit/174875acbad15b9ea6fc37fdb37872516664ef2d))
* use stable haiku alias for CLI token refresh ([#35](https://github.com/hypeitnow/opencode-claude-auth/issues/35)) ([d284762](https://github.com/hypeitnow/opencode-claude-auth/commit/d2847621bd315b2d7f5d2ae8fba8009ee6853781))
* version-gate context-1m beta to opus/sonnet 4.6+ only ([#44](https://github.com/hypeitnow/opencode-claude-auth/issues/44)) ([#47](https://github.com/hypeitnow/opencode-claude-auth/issues/47)) ([75bce64](https://github.com/hypeitnow/opencode-claude-auth/commit/75bce64fef0952fe76076f4ab0b4256b60d8129a))
* write auth.json to both Windows paths to cover all install methods ([#41](https://github.com/hypeitnow/opencode-claude-auth/issues/41)) ([a2c585a](https://github.com/hypeitnow/opencode-claude-auth/commit/a2c585a8a0ebfb7b766be19f51c39294990e11b9)), closes [#33](https://github.com/hypeitnow/opencode-claude-auth/issues/33)

## [1.5.4](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.5.3...v1.5.4) (2026-05-15)


### Bug Fixes

* reload .credentials.json on cache miss to detect external updates ([#220](https://github.com/griffinmartin/opencode-claude-auth/issues/220)) ([6ff5dc7](https://github.com/griffinmartin/opencode-claude-auth/commit/6ff5dc76536cd0fbc5dd1b1a456cba968e642787))

## [1.5.3](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.5.2...v1.5.3) (2026-04-30)


### Bug Fixes

* increase max buffer for reading keychain dump ([#201](https://github.com/griffinmartin/opencode-claude-auth/issues/201)) ([2f97161](https://github.com/griffinmartin/opencode-claude-auth/commit/2f97161d36810ee0d9c7be6de95c66bf844eee2f))

## [1.5.2](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.5.1...v1.5.2) (2026-04-30)


### Bug Fixes

* detect out-of-extra-usage error and cap retry-after delay ([#211](https://github.com/griffinmartin/opencode-claude-auth/issues/211)) ([88a114e](https://github.com/griffinmartin/opencode-claude-auth/commit/88a114efd273d3f32908a31494363adce30cd9de))

## [1.5.1](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.5.0...v1.5.1) (2026-04-30)


### Bug Fixes

* restore Claude subscription auth parity for Claude Code 2.1.112 ([#207](https://github.com/griffinmartin/opencode-claude-auth/issues/207)) ([572f94c](https://github.com/griffinmartin/opencode-claude-auth/commit/572f94c3869eb2d17c87f2d6f6f8e87d05b21af5))

## [1.5.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.10...v1.5.0) (2026-04-16)


### Features

* add Claude Opus 4.7 model support ([#203](https://github.com/griffinmartin/opencode-claude-auth/issues/203)) ([cc96338](https://github.com/griffinmartin/opencode-claude-auth/commit/cc963387b7a6d95c9dbdd1782c2e594b5aa3d6ba))

## [1.4.10](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.9...v1.4.10) (2026-04-14)


### Bug Fixes

* PascalCase tool names after mcp_ prefix to match Claude Code convention ([#191](https://github.com/griffinmartin/opencode-claude-auth/issues/191)) ([9121ca4](https://github.com/griffinmartin/opencode-claude-auth/commit/9121ca47a5e9757e041aea240a29c10e4dfabf95))

## [1.4.9](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.8...v1.4.9) (2026-04-08)


### Bug Fixes

* re-trigger npm publish after failed v1.4.8 release ([#150](https://github.com/griffinmartin/opencode-claude-auth/issues/150)) ([5412711](https://github.com/griffinmartin/opencode-claude-auth/commit/5412711bca7e5596c3784573d249d4db53ef9427))

## [1.4.8](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.7...v1.4.8) (2026-04-08)


### Bug Fixes

* relocate system prompt to user message to avoid OAuth 400 rejection ([#148](https://github.com/griffinmartin/opencode-claude-auth/issues/148)) ([bb6320c](https://github.com/griffinmartin/opencode-claude-auth/commit/bb6320cbe9c985a89258bf2ca1e027f2be7cd923))

## [1.4.7](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.6...v1.4.7) (2026-04-05)


### Bug Fixes

* repair orphaned tool_use/tool_result pairs before API request ([#136](https://github.com/griffinmartin/opencode-claude-auth/issues/136)) ([ceaf742](https://github.com/griffinmartin/opencode-claude-auth/commit/ceaf742c6249a898fcf5617383e6c1a6a71770e5)), closes [#133](https://github.com/griffinmartin/opencode-claude-auth/issues/133)

## [1.4.6](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.5...v1.4.6) (2026-04-04)


### Bug Fixes

* avoid duplicating cache_control when splitting identity system entry ([#131](https://github.com/griffinmartin/opencode-claude-auth/issues/131)) ([adcfd61](https://github.com/griffinmartin/opencode-claude-auth/commit/adcfd61b62401b82bc65bd34b7b2276ebd89ae2f))

## [1.4.5](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.4...v1.4.5) (2026-04-04)


### Bug Fixes

* strip effort parameter from request body for haiku models ([#126](https://github.com/griffinmartin/opencode-claude-auth/issues/126)) ([d163938](https://github.com/griffinmartin/opencode-claude-auth/commit/d1639387ca35391c6516f79d7121dad33544f69b))
* use Object.keys guard for thinking cleanup instead of budget_tokens sentinel ([#129](https://github.com/griffinmartin/opencode-claude-auth/issues/129)) ([174875a](https://github.com/griffinmartin/opencode-claude-auth/commit/174875acbad15b9ea6fc37fdb37872516664ef2d))

## [1.4.4](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.3...v1.4.4) (2026-04-03)


### Bug Fixes

* exclude interleaved-thinking beta for haiku models ([#120](https://github.com/griffinmartin/opencode-claude-auth/issues/120)) ([de5d806](https://github.com/griffinmartin/opencode-claude-auth/commit/de5d806b995a31d5840c11a0cac1198e08eafbea))

## [1.4.3](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.2...v1.4.3) (2026-04-03)


### Bug Fixes

* compute CCH signing for billing header, fix system prompt splitting ([#116](https://github.com/griffinmartin/opencode-claude-auth/issues/116)) ([f2e101a](https://github.com/griffinmartin/opencode-claude-auth/commit/f2e101ae241388d3e2e1fd747230d6ce73d34b75))

## [1.4.2](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.1...v1.4.2) (2026-03-31)


### Bug Fixes

* add missing API request headers for parity with Claude Code ([#109](https://github.com/griffinmartin/opencode-claude-auth/issues/109)) ([5d6455d](https://github.com/griffinmartin/opencode-claude-auth/commit/5d6455da3c41e40f16c65e7378eb31d500da27b7))

## [1.4.1](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.4.0...v1.4.1) (2026-03-31)


### Bug Fixes

* register transform hook even when no OAuth accounts exist ([#111](https://github.com/griffinmartin/opencode-claude-auth/issues/111)) ([ac8b780](https://github.com/griffinmartin/opencode-claude-auth/commit/ac8b7808183561b6c7b9fde8bcdb1b930b9993bb))

## [1.4.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.5...v1.4.0) (2026-03-31)


### Features

* config file alternative for 1M context setting ([#90](https://github.com/griffinmartin/opencode-claude-auth/issues/90)) ([d27382f](https://github.com/griffinmartin/opencode-claude-auth/commit/d27382f59b17b172b6c33831e585a25e21ab943f))

## [1.3.5](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.4...v1.3.5) (2026-03-31)


### Bug Fixes

* eliminate idle token consumption via direct OAuth refresh ([#104](https://github.com/griffinmartin/opencode-claude-auth/issues/104)) ([e7483d7](https://github.com/griffinmartin/opencode-claude-auth/commit/e7483d7108d1d00f4bccc11d540fb375d7361d5f))

## [1.3.4](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.3...v1.3.4) (2026-03-30)


### Bug Fixes

* add exports["./server"] for opencode 1.3.8 plugin loader compatibility ([#102](https://github.com/griffinmartin/opencode-claude-auth/issues/102)) ([efecefd](https://github.com/griffinmartin/opencode-claude-auth/commit/efecefda9fd7d63b8c42466a6277fc03b0057faa))

## [1.3.3](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.2...v1.3.3) (2026-03-27)


### Bug Fixes

* run CLI token refresh in tmpdir instead of inheriting cwd ([#96](https://github.com/griffinmartin/opencode-claude-auth/issues/96)) ([7db98a1](https://github.com/griffinmartin/opencode-claude-auth/commit/7db98a1e36fd8ffd775e14c2bd6c4f76c7a141b8))

## [1.3.2](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.1...v1.3.2) (2026-03-26)


### Bug Fixes

* add logging to refresh failure path for diagnostics ([#94](https://github.com/griffinmartin/opencode-claude-auth/issues/94)) ([5d80a59](https://github.com/griffinmartin/opencode-claude-auth/commit/5d80a59be04fb385941f7c20349746b69b7a2393))

## [1.3.1](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.3.0...v1.3.1) (2026-03-25)


### Bug Fixes

* add debug logger for auth flow diagnostics ([#84](https://github.com/griffinmartin/opencode-claude-auth/issues/84)) ([#85](https://github.com/griffinmartin/opencode-claude-auth/issues/85)) ([0fc246a](https://github.com/griffinmartin/opencode-claude-auth/commit/0fc246a4362f642c5f0be59b31d3b9430c0d1869))

## [1.3.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.2.0...v1.3.0) (2026-03-24)


### Features

* model config refactor and Claude CLI intercept script ([#78](https://github.com/griffinmartin/opencode-claude-auth/issues/78)) ([89f23fe](https://github.com/griffinmartin/opencode-claude-auth/commit/89f23fec38810e4839cfb576d94f21da1330886d))

## [1.2.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.1.1...v1.2.0) (2026-03-24)


### Features

* macOS support multiple Claude Code accounts from keychain ([#63](https://github.com/griffinmartin/opencode-claude-auth/issues/63)) ([4594b36](https://github.com/griffinmartin/opencode-claude-auth/commit/4594b36f2c732d6a27ccd798112019ea4bc748b8))

## [1.1.1](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.1.0...v1.1.1) (2026-03-23)


### Bug Fixes

* exclude CHANGELOG.md from oxfmt formatting checks ([ddcd97e](https://github.com/griffinmartin/opencode-claude-auth/commit/ddcd97e99864ca434cb3f9961802ae4567b5aef5))

## [1.1.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v1.0.0...v1.1.0) (2026-03-22)


### Features

* add Homebrew formula for brew install support ([#68](https://github.com/griffinmartin/opencode-claude-auth/issues/68)) ([6beb56e](https://github.com/griffinmartin/opencode-claude-auth/commit/6beb56e7f56da35d9fa5724d9cc7d86d4b590c51))

## [1.0.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.7.4...v1.0.0) (2026-03-22)

### ⚠ BREAKING CHANGES

- context-1m-2025-08-07 is no longer sent by default. Claude Max users who relied on automatic 1M context must set the env var.

### Bug Fixes

- make context-1m beta opt-in to fix long context billing errors ([#64](https://github.com/griffinmartin/opencode-claude-auth/issues/64)) ([#65](https://github.com/griffinmartin/opencode-claude-auth/issues/65)) ([f8cb63d](https://github.com/griffinmartin/opencode-claude-auth/commit/f8cb63d69dab178dc3fe9ca4bf7d849e7d0a661a))

## [0.7.4](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.7.3...v0.7.4) (2026-03-21)

### Bug Fixes

- restore package root shim for plugin resolution ([#61](https://github.com/griffinmartin/opencode-claude-auth/issues/61)) ([cc02950](https://github.com/griffinmartin/opencode-claude-auth/commit/cc02950d789f24bf29b99a33efc13a8dca7a535e))

## [0.7.3](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.7.2...v0.7.3) (2026-03-20)

### Bug Fixes

- handle date-suffixed model IDs and additional long context error message ([4d790a9](https://github.com/griffinmartin/opencode-claude-auth/commit/4d790a9bf0f862a1a547705ec2cd0584cf98d402))

## [0.7.2](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.7.1...v0.7.2) (2026-03-20)

### Bug Fixes

- auto-retry with beta flag fallback for long context errors ([#52](https://github.com/griffinmartin/opencode-claude-auth/issues/52)) ([a6664f4](https://github.com/griffinmartin/opencode-claude-auth/commit/a6664f461cc103c51eff9fca9ebc38aeb6e97a36)), closes [#51](https://github.com/griffinmartin/opencode-claude-auth/issues/51)

## [0.7.1](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.7.0...v0.7.1) (2026-03-20)

### Bug Fixes

- version-gate context-1m beta to opus/sonnet 4.6+ only ([#44](https://github.com/griffinmartin/opencode-claude-auth/issues/44)) ([#47](https://github.com/griffinmartin/opencode-claude-auth/issues/47)) ([75bce64](https://github.com/griffinmartin/opencode-claude-auth/commit/75bce64fef0952fe76076f4ab0b4256b60d8129a))

## [0.7.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.6.0...v0.7.0) (2026-03-20)

### Features

- add env var overrides and retry logic with backoff ([#45](https://github.com/griffinmartin/opencode-claude-auth/issues/45)) ([1335286](https://github.com/griffinmartin/opencode-claude-auth/commit/13352867a1472fe29bc859e66328ff93e75713ff))

## [0.6.0](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.5.7...v0.6.0) (2026-03-20)

### Features

- self-contained auth provider (no builtin dependency, anti-fingerprint) ([#38](https://github.com/griffinmartin/opencode-claude-auth/issues/38)) ([34ae5df](https://github.com/griffinmartin/opencode-claude-auth/commit/34ae5dfe1bbae4c57cc5be86a2dcf25579d85a06))

## [0.5.7](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.5.6...v0.5.7) (2026-03-20)

### Bug Fixes

- write auth.json to both Windows paths to cover all install methods ([#41](https://github.com/griffinmartin/opencode-claude-auth/issues/41)) ([a2c585a](https://github.com/griffinmartin/opencode-claude-auth/commit/a2c585a8a0ebfb7b766be19f51c39294990e11b9)), closes [#33](https://github.com/griffinmartin/opencode-claude-auth/issues/33)

## [0.5.6](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.5.5...v0.5.6) (2026-03-20)

### Bug Fixes

- use stable haiku alias for CLI token refresh ([#35](https://github.com/griffinmartin/opencode-claude-auth/issues/35)) ([d284762](https://github.com/griffinmartin/opencode-claude-auth/commit/d2847621bd315b2d7f5d2ae8fba8009ee6853781))

## [0.5.5](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.5.4...v0.5.5) (2026-03-20)

### Bug Fixes

- use LOCALAPPDATA for auth.json path on native Windows ([#30](https://github.com/griffinmartin/opencode-claude-auth/issues/30)) ([916a2fe](https://github.com/griffinmartin/opencode-claude-auth/commit/916a2fe21096e4f7d8c253a875e8b9e6aad7aab4))

## [0.5.4](https://github.com/griffinmartin/opencode-claude-auth/compare/v0.5.3...v0.5.4) (2026-03-20)

### Bug Fixes

- trigger v0.5.4 release ([0429da5](https://github.com/griffinmartin/opencode-claude-auth/commit/0429da5bb205fbf195ac87aa4cc671a0ab1e653d))
