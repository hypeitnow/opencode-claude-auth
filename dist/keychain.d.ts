export interface ClaudeCredentials {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    subscriptionType?: string;
}
export interface ClaudeAccount {
    label: string;
    source: string;
    credentials: ClaudeCredentials;
}
export declare function buildAccountLabels(credsList: ClaudeCredentials[]): string[];
export declare function readAllClaudeAccounts(): ClaudeAccount[];
export declare function updateCredentialBlob(existingJson: string, newCreds: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}): string | null;
export declare function writeBackCredentials(source: string, creds: ClaudeCredentials): boolean;
export declare function refreshAccount(source: string): ClaudeCredentials | null;
/** @deprecated Use readAllClaudeAccounts() instead */
export declare function readClaudeCredentials(): ClaudeCredentials | null;
//# sourceMappingURL=keychain.d.ts.map