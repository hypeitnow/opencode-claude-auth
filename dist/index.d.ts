import type { Plugin } from "@opencode-ai/plugin";
export { addExcludedBeta, getExcludedBetas, getModelBetas, getNextBetaToExclude, isLongContextError, LONG_CONTEXT_BETAS, } from "./betas.ts";
export { resetExcludedBetas } from "./betas.ts";
export { stripToolPrefix, transformBody, transformResponseStream, } from "./transforms.ts";
export { getCachedCredentials, syncAuthJson, refreshAccountsList, type ClaudeCredentials, } from "./credentials.ts";
export { isEnable1mContext, type PluginSettings } from "./plugin-config.ts";
export { buildBillingHeaderValue, computeCch, computeVersionSuffix, extractFirstUserMessageText, } from "./signing.ts";
type FetchFn = typeof fetch;
export declare function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit, retries?: number, fetchImpl?: FetchFn): Promise<Response>;
export declare function buildRequestHeaders(input: RequestInfo | URL, init: RequestInit, accessToken: string, modelId?: string, excludedBetas?: Set<string>): Headers;
declare const plugin: Plugin;
export declare const ClaudeAuthPlugin: Plugin;
export default plugin;
//# sourceMappingURL=index.d.ts.map