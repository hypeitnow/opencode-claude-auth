export declare const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
declare const AUTHORIZE_URLS: {
    readonly console: "https://platform.claude.com/oauth/authorize";
    readonly max: "https://claude.ai/oauth/authorize";
};
export type AuthorizeMode = keyof typeof AUTHORIZE_URLS;
export type AuthResult = {
    type: "success";
    access: string;
    refresh: string;
    expires: number;
} | {
    type: "failed";
};
export declare function exchangeCode(callback: {
    code: string;
    state: string;
}, verifier: string, redirectUri: string, expectedState?: string): Promise<AuthResult>;
export declare function refreshTokens(refresh: string): Promise<AuthResult>;
export declare function buildAuthorizationUrl(mode?: AuthorizeMode): Promise<{
    url: string;
    verifier: string;
    state: string;
    redirectUri: string;
}>;
export declare function parseCallback(input: string): {
    code: string;
    state: string;
} | null;
export {};
//# sourceMappingURL=oauth.d.ts.map