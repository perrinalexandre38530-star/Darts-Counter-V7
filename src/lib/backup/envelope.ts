import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from "./base64";
import { sha256Hex } from "./hash";
import { gzipCompressString, gzipDecompressToString } from "./gzip";
import { aesDecryptBytes, aesEncryptBytes, type AesMeta } from "./aes";

export type BackupKind = "recovery" | "full" | "match";

export type BackupEnvelopeV1 = {
  kind: "dc_backup_envelope_v1";
  payloadKind: BackupKind;
  exportedAt: string;
  appVersion?: string;
  encoding: {
    compressed: boolean;
    encrypted: boolean;
  };
  integritySha256: string; // hash of the original JSON payload string
  crypto?: AesMeta;
  dataB64: string; // bytes (plain/gzip/aes) base64
};

export type BuildEnvelopeOptions = {
  compress?: boolean; // gzip
  encryptPassword?: string; // AES-GCM if provided (non-empty)
  appVersion?: string;
};

export async function buildBackupEnvelope(payloadKind: BackupKind, payloadObj: any, opts: BuildEnvelopeOptions = {}): Promise<BackupEnvelopeV1> {
  const payloadJson = typeof payloadObj === "string" ? payloadObj : JSON.stringify(payloadObj);
  const integritySha256 = await sha256Hex(payloadJson);

  // In embedded contexts (StackBlitz/WebContainer iframe), CompressionStream can behave poorly
  // on large payloads and appear to "freeze". We disable gzip there.
  const isIframed = (() => {
    try {
      return typeof window !== "undefined" && window.top !== window.self;
    } catch {
      return true;
    }
  })();

  const compress = !!opts.compress && !isIframed;
  const encryptPassword = (opts.encryptPassword ?? "").trim();
  const encrypted = encryptPassword.length > 0;

  let bytes: Uint8Array;
  if (compress) {
    bytes = await gzipCompressString(payloadJson);
  } else {
    bytes = utf8ToBytes(payloadJson);
  }

  let cryptoMeta: AesMeta | undefined;
  if (encrypted) {
    const enc = await aesEncryptBytes(bytes, encryptPassword);
    bytes = enc.cipher;
    cryptoMeta = enc.meta;
  }

  return {
    kind: "dc_backup_envelope_v1",
    payloadKind,
    exportedAt: new Date().toISOString(),
    appVersion: opts.appVersion,
    encoding: { compressed: compress, encrypted },
    integritySha256,
    crypto: cryptoMeta,
    dataB64: bytesToBase64(bytes),
  };
}

export async function unpackBackupEnvelope(env: any, opts: { decryptPassword?: string } = {}): Promise<{ payloadKind: BackupKind; payloadObj: any }> {
  if (!env || env.kind !== "dc_backup_envelope_v1" || !env.dataB64) {
    throw new Error("Envelope invalide");
  }

  const payloadKind: BackupKind = env.payloadKind;
  if (!payloadKind) throw new Error("Envelope sans payloadKind");

  const compressed = !!env.encoding?.compressed;
  const encrypted = !!env.encoding?.encrypted;

  let bytes = base64ToBytes(env.dataB64);

  if (encrypted) {
    const pwd = (opts.decryptPassword ?? "").trim();
    if (!pwd) throw new Error("Mot de passe requis");
    bytes = await aesDecryptBytes(bytes, pwd, env.crypto);
  }

  let payloadJson: string;
  if (compressed) {
    payloadJson = await gzipDecompressToString(bytes);
  } else {
    payloadJson = bytesToUtf8(bytes);
  }

  const integrity = await sha256Hex(payloadJson);
  if (env.integritySha256 && integrity !== env.integritySha256) {
    throw new Error("Intégrité invalide (SHA-256 mismatch)");
  }

  const payloadObj = JSON.parse(payloadJson);
  return { payloadKind, payloadObj };
}
