import * as nacl from "tweetnacl";
import { Base64 } from "js-base64";

export interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
};

/**
 * Generates a new api key
 * @returns a api key
 */
export function generateApiKey(): string {
    const key = new Uint8Array(33);
    key[0] = 0x01;
    // seed is 32byte long, 31 of them are random.
    key.set(nacl.randomBytes(31), 1);
    // and the last one is a checksum.
    key[31] = crc8(key.subarray(1, 31));
    return Base64.fromUint8Array(key);
}

/**
 * Validates and loads an api-key.
 * @param apiKey a odin-api-key
 * @returns a key-pair derived from the api-key.
 */
export function loadApiKey(apiKey: string): KeyPair {
    if (!Base64.isValid(apiKey)) throw new Error("invalid api key");
    const bytes = Base64.toUint8Array(apiKey);
    if (bytes[0] !== 0x01 || bytes.length !== 33 || crc8(bytes.subarray(1)) !== 0) throw new Error("invalid api key");
    return nacl.sign.keyPair.fromSeed(bytes.subarray(1));
}

/**
 * Derives the key-id from public-key
 * @param publicKey a public-key from a api-key
 * @returns a key-id
 */
export function getKeyId(publicKey: Uint8Array): string {
    const hash = nacl.hash(publicKey);
    const result = new Uint8Array(9);
    result[0] = 0x01;
    for (let i = 0, x = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++, x++) {
            result[1 + j] ^= hash[x];
        }
    }
    return Base64.fromUint8Array(result);
}

export interface TokenOptions {
    /** set the customer identification */
    customer?: string,
    /** restrict who can accept the token */
    audience?: "gateway" | "sfu",
    /** how long the token remains valid */
    lifetime?: number,
};

/**
 * Generates Tokens that can be used to connect to the Odin-Network.
 */
export class TokenGenerator {
    private keyId: string;
    private secretKey: Uint8Array;

    /**
     * Creates a TokenGenerator.
     * @param apiKey used to sign the generated tokens
     */
    constructor(apiKey: string);
    /**7
     * Creates a TokenGenerator.
     * @param keyPair used to sign the generated tokens
     */
    constructor(keyPair: KeyPair);

    constructor(credentials: string | KeyPair) {
        const { publicKey, secretKey } = typeof credentials === "string" ? loadApiKey(credentials) : credentials;
        this.keyId = getKeyId(publicKey);
        this.secretKey = secretKey;
    }

    /**
     * Create a new token.
     * 
     * @param roomId id of the odin-room to join
     * @param userId the user-id of the client in the odin-room
     * @param options additional options
     * @returns a new token
     */
    createToken(roomId: string, userId: string, options?: TokenOptions): string {
        const nbf = Math.floor(Date.now() / 1000) /* now in unix-time */;
        const claimSet = {
            rid: roomId,
            uid: userId,
            cid: options?.customer,
            sub: "connect",
            aud: options?.audience,
            exp: nbf + (options?.lifetime ?? 300) /* 5min default */,
            nbf,
        };

        const header = { "alg": "EdDSA", kid: this.keyId };
        const body = `${base64EncodeObject(header)}.${base64EncodeObject(claimSet)}`;
        const message = new TextEncoder().encode(body);
        const signature = nacl.sign.detached(message, this.secretKey);
        
        return `${body}.${Base64.fromUint8Array(signature, true)}`;
    }
}

function crc8(data: Uint8Array): number
{
    let crc = 0xFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x80) != 0)
                crc = (crc << 1) ^ 0x31;
            else
                crc <<= 1;
        }
        crc = 0xFF & crc;
    }
    return crc;
}

function base64EncodeObject(object: Object): string {
    return Base64.encode(JSON.stringify(object), true);
}