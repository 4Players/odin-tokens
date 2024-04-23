import * as nacl from 'tweetnacl';
import { Base64 } from 'js-base64';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

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
  key.set(nacl.randomBytes(31), 1);
  // checksum
  key[32] = crc8(key.subarray(1, 32));
  return Base64.fromUint8Array(key);
}

/**
 * Validates an ODIN access key and loads its key pair.
 *
 * @param accessKey - The ODIN access key as a Base64-encoded string from which to load a key pair.
 * @returns The loaded key pair.
 */
export function loadAccessKey(accessKey: string): KeyPair {
  if (!Base64.isValid(accessKey)) throw new Error('invalid access key');
  const bytes = Base64.toUint8Array(accessKey);
  if (
    bytes[0] !== 0x01 ||
    bytes.length !== 33 ||
    crc8(bytes.subarray(1)) !== 0
  ) {
    throw new Error('invalid access key');
  }
  return nacl.sign.keyPair.fromSeed(bytes.subarray(1));
}

/**
 * Generates a key ID from a given public key.
 *
 * @param publicKey - The public key as a Uint8Array from which to generate a key ID.
 * @returns The generated key ID as a Base64-encoded string.
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
  customer?: string;
  /** restrict who can accept the token */
  audience?: 'gateway' | 'sfu';
  /** restrict the purpose of the token */
  subject?: string | string[];
  /** set the specific server address to use */
  address?: string;
  /** set the specific upstream address to use */
  upstream?: string;
  /** how long the token remains valid */
  lifetime?: number;
}

/**
 * Generates tokens that can be used to access the ODIN network.
 */
export class TokenGenerator {
  private keyId: string;
  private secretKey: Uint8Array;

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
  constructor(keyPair: KeyPair);

  constructor(credentials: string | KeyPair) {
    const { publicKey, secretKey } =
      typeof credentials === 'string'
        ? loadAccessKey(credentials)
        : credentials;
    this.keyId = getKeyId(publicKey);
    this.secretKey = secretKey;
  }

  /**
   * Creates a signed JWT to grant access to an ODIN room using the EdDSA signature scheme.
   *
   * @param roomId - The room ID(s) for which the token is being generated.
   * @param userId - The ID of the user for whom the token is being generated.
   * @param options - An optional object containing additional token parameters.
   * @returns A signed token string.
   */
  createToken(
    roomId: string | string[],
    userId: string,
    options?: TokenOptions
  ): string {
    const nbf = Math.floor(Date.now() / 1000); /* now in unix-time */
    const claims = {
      rid: roomId,
      uid: userId,
      adr: options?.address,
      ups: options?.upstream,
      cid: options?.customer,
      sub: options?.subject ?? 'connect',
      aud: options?.audience,
      exp: nbf + (options?.lifetime ?? 300),
      nbf,
    };

    const header = { alg: 'EdDSA', kid: this.keyId };
    const body = `${base64EncodeObject(header)}.${base64EncodeObject(claims)}`;
    const message = new TextEncoder().encode(body);
    const signature = nacl.sign.detached(message, this.secretKey);

    return `${body}.${Base64.fromUint8Array(signature, true)}`;
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
function base64EncodeObject(object: Object): string {
  return Base64.encode(JSON.stringify(object), true);
}
