/**
 * Minimal structural types for the parts of the OpenCode V2 plugin context
 * this plugin uses.
 *
 * They are declared locally on purpose: depending on `@opencode/plugin` at
 * runtime would make installs heavier and reintroduce the "cannot resolve the
 * SDK from the plugin's install directory" failure mode. `Plugin.define` in the
 * SDK is an identity function, so a plain `{ id, setup }` object is a valid V2
 * plugin definition.
 *
 * Contracts were taken from `@opencode/plugin` 2.0.29 and verified against a
 * running OpenCode 2.0.29 server.
 */
export {};
//# sourceMappingURL=v2-types.js.map