import type { Plugin } from "@opencode-ai/plugin";
export { addExcludedBeta, getExcludedBetas, getModelBetas, getNextBetaToExclude, isLongContextError, LONG_CONTEXT_BETAS, } from "./betas.ts";
export { resetExcludedBetas } from "./betas.ts";
export { stripToolPrefix, transformBody, transformResponseStream, } from "./transforms.ts";
export { getCachedCredentials, syncAuthJson, refreshAccountsList, type ClaudeCredentials, } from "./credentials.ts";
export { isEnable1mContext, type PluginSettings } from "./plugin-config.ts";
export { buildBillingHeaderValue, computeCch, computeVersionSuffix, extractFirstUserMessageText, } from "./signing.ts";
export { buildRequestHeaders, fetchWithRetry } from "./request.ts";
export { createClaudeAuthV2 } from "./v2.ts";
export declare const ClaudeAuthPlugin: Plugin;
declare const _default: {
    server: Plugin;
    id: string;
    setup: (context: import("./v2-types.ts").V2Context) => Promise<import("./v2-types.ts").V2Cleanup | void>;
};
export default _default;
//# sourceMappingURL=index.d.ts.map