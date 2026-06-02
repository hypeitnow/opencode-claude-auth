import { log } from "./logger.js";
let settings = {};
/**
 * Extract plugin settings from the opencode Config object.
 *
 * Scans all agent configs for our plugin-specific keys. AgentConfig has
 * a catch-all `[key: string]: unknown` index signature, so arbitrary
 * keys placed in agent configs are preserved through OpenCode's
 * config parser and passed to the plugin via the `config` hook.
 *
 * NOTE: OpenCode's Zod schema may relocate unknown top-level agent keys
 * into `agent.options`. We check both locations defensively so this
 * survives future config parser changes.
 *
 * The first boolean value found (in any agent) wins — even if `false`.
 */
export function applyOpencodeConfig(config) {
    if (!config || typeof config !== "object")
        return;
    const cfg = config;
    const agents = cfg.agent;
    if (!agents || typeof agents !== "object")
        return;
    for (const agentConfig of Object.values(agents)) {
        if (!agentConfig || typeof agentConfig !== "object")
            continue;
        const agent = agentConfig;
        // Check top-level first, then fall back to options (where OpenCode's
        // Zod transform may relocate unknown keys)
        const val = agent.enable1mContext ??
            agent.options?.enable1mContext;
        if (typeof val === "boolean") {
            settings.enable1mContext = val;
            log("config_loaded", { enable1mContext: val });
            return;
        }
        if (val !== undefined) {
            log("config_invalid_type", {
                key: "enable1mContext",
                expectedType: "boolean",
                actualType: typeof val,
            });
        }
    }
    log("config_no_plugin_keys", {
        agentCount: Object.keys(agents).length,
    });
}
/**
 * Whether 1M context should be enabled.
 *
 * Priority: ANTHROPIC_ENABLE_1M_CONTEXT env var > opencode.json > false
 */
export function isEnable1mContext() {
    const envVal = process.env.ANTHROPIC_ENABLE_1M_CONTEXT;
    if (envVal !== undefined)
        return envVal === "true";
    return settings.enable1mContext === true;
}
export function resetPluginSettings() {
    settings = {};
}
export function getPluginSettings() {
    return { ...settings };
}
//# sourceMappingURL=plugin-config.js.map