import { base64ToBytes, bytesToBase64, utf8ToBytes } from "./base64";

export type AesMeta = {
  ivB64: string;
  saltB64: string;
  iterations: number;
};

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    utf8ToBytes(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function aesEncryptBytes(plain: Uint8Array, password: string): Promise<{ cipher: Uint8Array; meta: AesMeta }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 120_000;

  const key = await deriveKey(password, salt, iterations);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  return {
    cipher: new Uint8Array(cipherBuf),
    meta: {
      ivB64: bytesToBase64(iv),
      saltB64: bytesToBase64(salt),
      iterations,
    },
  };
}

export async function aesDecryptBytes(cipher: Uint8Array, password: string, meta: AesMeta): Promise<Uint8Array> {
  const iv = base64ToBytes(meta.ivB64);
  const salt = base64ToBytes(meta.saltB64);
  const key = await deriveKey(password, salt, meta.iterations);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new Uint8Array(plainBuf);
}
