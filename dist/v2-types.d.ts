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
export interface V2Registration {
    dispose(): Promise<void>;
}
export type V2Cleanup = () => Promise<void> | void;
export interface V2OAuthCredential {
    type: "oauth";
    methodID: string;
    access: string;
    refresh: string;
    expires: number;
    metadata?: Record<string, unknown>;
}
export interface V2FormOption {
    value: string;
    label: string;
    description?: string;
}
export interface V2StringField {
    type: "string";
    key: string;
    title?: string;
    description?: string;
    required?: boolean;
    default?: string;
    options?: V2FormOption[];
}
export type V2FormAnswer = Record<string, unknown>;
export type V2OAuthAuthorization = {
    url: string;
    instructions: string;
    expiresAt?: number;
} & ({
    mode: "auto";
    callback: Promise<V2OAuthCredential>;
} | {
    mode: "code";
    callback: (code: string) => Promise<V2OAuthCredential>;
});
export interface V2OAuthMethodRegistration {
    integrationID: string;
    method: {
        id: string;
        type: "oauth";
        label: string;
        form?: V2StringField[];
    };
    authorize(answer: V2FormAnswer): Promise<V2OAuthAuthorization>;
    refresh?(credential: V2OAuthCredential): Promise<V2OAuthCredential>;
    label?(credential: V2OAuthCredential): string | undefined;
}
export interface V2IntegrationEditor {
    method: {
        update(input: V2OAuthMethodRegistration): void;
    };
}
export interface V2ModelRef {
    providerID: string;
    id: string;
    variant?: string;
}
export interface V2SystemPart {
    type: string;
    text?: string;
    [key: string]: unknown;
}
/** `context`, `compaction`, `generate` and `title` hooks. */
export interface V2SystemHookEvent {
    readonly model: V2ModelRef;
    system: V2SystemPart[];
}
export interface V2HttpRequestEvent {
    readonly model: V2ModelRef;
    readonly kind?: string;
    request: Request;
}
export interface V2HttpResponseEvent {
    readonly model: V2ModelRef;
    readonly kind?: string;
    readonly request: Request;
    response: Response;
}
export interface V2CostTier {
    input: number;
    output: number;
    cache: {
        read: number;
        write: number;
    };
    [key: string]: unknown;
}
export interface V2ModelDraft {
    cost?: V2CostTier[];
    [key: string]: unknown;
}
export interface V2ModelInfo {
    id: string;
    providerID: string;
}
export interface V2ModelEditor {
    list(providerID?: string): readonly V2ModelInfo[];
    update(providerID: string, modelID: string, update: (model: V2ModelDraft) => void): void;
}
export interface V2HookScope {
    providerID?: string;
}
export interface V2SessionDomain {
    hook(name: "context" | "compaction" | "generate" | "title", callback: (event: V2SystemHookEvent) => Promise<void> | void, scope?: V2HookScope): Promise<V2Registration>;
    hook(name: "http.request", callback: (event: V2HttpRequestEvent) => Promise<void> | void, scope?: V2HookScope): Promise<V2Registration>;
    hook(name: "http.response", callback: (event: V2HttpResponseEvent) => Promise<void> | void, scope?: V2HookScope): Promise<V2Registration>;
}
export interface V2IntegrationDomain {
    transform(callback: (editor: V2IntegrationEditor) => void): Promise<V2Registration>;
    connection: {
        active(integrationID: string): Promise<unknown | undefined>;
    };
    oauth: {
        connect(input: {
            integrationID: string;
            methodID: string;
            answer?: V2FormAnswer | null;
            label?: string | null;
        }): Promise<unknown>;
    };
}
export interface V2Context {
    readonly options: Record<string, unknown>;
    readonly integration: V2IntegrationDomain;
    readonly model: {
        transform(callback: (editor: V2ModelEditor) => void): Promise<V2Registration>;
    };
    readonly session: V2SessionDomain;
}
export interface V2PluginDefinition {
    readonly id: string;
    readonly setup: (context: V2Context) => Promise<V2Cleanup | void>;
}
//# sourceMappingURL=v2-types.d.ts.map