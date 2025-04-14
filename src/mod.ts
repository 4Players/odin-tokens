import { decodeBase64, encodeBase64, encodeBase64Url } from "@std/encoding";
import * as ed25119 from "@noble/ed25519";

export type SecretKey = ed25119.Bytes;

/**
 * Generates a new ODIN access, which is a 44 character long Base64-String that consists of an
 * internal version number, a set of random bytes and a checksum.
 *
 * @returns The new ODIN access key.
 */
export function generateAccessKey(): string {
  const key = new Uint8Array(33);
  // version
  key[0] = 0x01;
  // seed
  crypto.getRandomValues(key.subarray(1, 32));
  // checksum
  key[32] = crc8(key.subarray(1, 32));
  return encodeBase64(key);
}

/**
 * Validates an ODIN access key and loads its key pair.
 *
 * @param accessKey - The ODIN access key as a Base64-encoded string from which to load a key pair.
 * @returns The loaded key pair.
 */
export function loadAccessKey(accessKey: string): Promise<SecretKey> {
  const bytes = decodeBase64(accessKey);
  if (
    bytes[0] !== 0x01 ||
    bytes.length !== 33 ||
    crc8(bytes.subarray(1)) !== 0
  ) {
    throw new TypeError("invalid access key");
  }
  return Promise.resolve(bytes.subarray(1));
}

/**
 * Generates a key ID from a given public key.
 *
 * @param publicKey - The public key as a Uint8Array from which to generate a key ID.
 * @returns The generated key ID as a Base64-encoded string.
 */
export async function getKeyId(key: SecretKey): Promise<string> {
  const publicKey = await ed25119.getPublicKeyAsync(key);
  const hash = await ed25119.etc.sha512Async(publicKey);
  const result = new Uint8Array(9);
  result[0] = 0x01;
  for (let i = 0, x = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++, x++) {
      result[1 + j] ^= hash[x];
    }
  }
  return encodeBase64(result);
}

export interface TokenOptions {
  /** set the customer identification */
  customer?: string;
  /** restrict who can accept the token */
  audience?: "gateway" | "sfu";
  /** restrict the purpose of the token */
  subject?: string | string[];
  /** set the specific server address to use */
  address?: string;
  /** set optional tags to assign to the client */
  tags?: string[];
  /** set the specific upstream address to use */
  upstream?: string;
  /** how long the token remains valid */
  lifetime?: number;
  /** custom properties to store */
  internal?: Record<string, unknown>;
}

/**
 * Generates tokens that can be used to access the ODIN network.
 */
export class TokenGenerator {
  private readonly keyId: Promise<string>;
  private readonly secretKey: Promise<SecretKey>;

  /**
   * Creates a TokenGenerator.
   *
   * @param accessKey used to sign the generated tokens
   */
  constructor(accessKey: string);

  /**
   * Creates a TokenGenerator.
   *
   * @param keyPair used to sign the generated tokens
   */
  constructor(keyPair: SecretKey);

  constructor(credentials: string | SecretKey) {
    const secretKey = this.secretKey =
      (async () =>
        typeof credentials === "string"
          ? await loadAccessKey(credentials)
          : credentials)();
    this.keyId = (async () => getKeyId(await secretKey))();
  }

  /**
   * Creates a signed JWT to grant access to an ODIN room using the EdDSA signature scheme.
   *
   * @param roomId - The room ID(s) for which the token is being generated.
   * @param userId - The ID of the user for whom the token is being generated.
   * @param options - An optional object containing additional token parameters.
   * @returns A signed token string.
   */
  async createToken(
    roomId: string | string[],
    userId: string,
    options?: TokenOptions,
  ): Promise<string> {
    const nbf = Math.floor(Date.now() / 1000); /* now in unix-time */
    const claims = {
      rid: roomId,
      uid: userId,
      adr: options?.address,
      tgs: options?.tags,
      ups: options?.upstream,
      cid: options?.customer,
      sub: options?.subject ?? "connect",
      aud: options?.audience,
      exp: nbf + (options?.lifetime ?? 300),
      nbf,
      // internal use only
      internal: options?.internal,
    };

    const header = { alg: "EdDSA", kid: await this.keyId };
    const body = `${base64EncodeObject(header)}.${base64EncodeObject(claims)}`;
    const message = new TextEncoder().encode(body);
    const signature = await ed25119.signAsync(message, await this.secretKey);

    return `${body}.${encodeBase64Url(signature)}`;
  }
}

/**
 * Calculates the 8-bit Cyclic Redundancy Check (CRC-8) of a given data array.
 *
 * @param data - The input data as a Uint8Array to compute the CRC for.
 * @returns The computed CRC-8 of the input data as a number.
 */
function crc8(data: Uint8Array): number {
  let crc = 0xff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x80) !== 0) crc = (crc << 1) ^ 0x31;
      else crc <<= 1;
    }
    crc = 0xff & crc;
  }
  return crc;
}

/**
 * Converts a JavaScript object into a Base64-encoded string representation.
 *
 * @param object - The JavaScript object to be encoded into a Base64 string.
 * @returns The Base64-encoded string representation of the input object.
 */
function base64EncodeObject(object: unknown): string {
  return encodeBase64Url(JSON.stringify(object));
}
