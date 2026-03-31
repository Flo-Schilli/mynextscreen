export declare function generateApiKey(): string;
export declare function hashApiKey(plaintext: string): Promise<string>;
export declare function verifyApiKey(plaintext: string, hash: string): Promise<boolean>;
