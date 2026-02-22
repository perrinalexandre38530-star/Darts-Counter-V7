import { bytesToUtf8, utf8ToBytes } from "./base64";

export async function gzipCompressString(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    // Fallback: no compression
    return utf8ToBytes(text);
  }
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  await writer.write(utf8ToBytes(text));
  await writer.close();
  const ab = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(ab);
}

export async function gzipDecompressToString(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    // Fallback: treat as plain UTF-8
    return bytesToUtf8(bytes);
  }
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  const ab = await new Response(ds.readable).arrayBuffer();
  return bytesToUtf8(new Uint8Array(ab));
}
