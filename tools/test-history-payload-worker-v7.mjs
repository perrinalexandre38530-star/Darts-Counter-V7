import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const historyPath = path.join(root, 'src/lib/history.ts');
const workerPath = path.join(root, 'src/lib/historyPayloadDecode.worker.ts');
const history = fs.readFileSync(historyPath, 'utf8');
const worker = fs.readFileSync(workerPath, 'utf8');

const checks = [
  ['worker file exists', fs.existsSync(workerPath)],
  ['history uses Vite module Worker', history.includes('new Worker(new URL("./historyPayloadDecode.worker.ts", import.meta.url), { type: "module" })')],
  ['Android decode goes off main thread', history.includes('decodePayloadCompressedOffMainThread')],
  ['global decode lane remains serialized', history.includes('let __historyDecodeLane: Promise<void> = Promise.resolve()')],
  ['old misleading active decode marker removed from get path', !history.includes('beginFreezeOperation("history.payload.decode", {')],
  ['worker records decompress timing', worker.includes('decompressMs')],
  ['worker records parse timing', worker.includes('parseMs')],
  ['worker supports UTF16 LZ decode', worker.includes('decompressFromUTF16')],
  ['large worker failure does not sync-decode on UI', history.includes('if (payloadCompressed.length > 220_000) return null;')],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`✅ ${name}`);
  else { console.error(`❌ ${name}`); failed++; }
}
if (failed) process.exit(1);
console.log('✅ History payload worker V7 contract OK');
