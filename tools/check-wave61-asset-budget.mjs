import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalogPath = path.join(root, 'src', 'games', 'dartsWave61.ts');
const tickerDir = path.join(root, 'src', 'assets', 'tickers');
const maxTotalMb = Number(process.env.MSS_WAVE61_TICKERS_MAX_MB || 6);
const maxFileKb = Number(process.env.MSS_WAVE61_TICKER_MAX_KB || 160);
const expectedWidth = 800;
const expectedHeight = 230;

function read24le(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
}

function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`WEBP invalide: ${path.relative(root, file)}`);
  }
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: read24le(b, 24) + 1, height: read24le(b, 27) + 1 };
  if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
    return { width: 1 + b0 + ((b1 & 0x3f) << 8), height: 1 + (b1 >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10) };
  }
  throw new Error(`Chunk WEBP non géré (${chunk}) : ${path.relative(root, file)}`);
}

const catalog = fs.readFileSync(catalogPath, 'utf8');
const ids = [...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map((m) => m[1]);
const rows = ids.map((id) => {
  const full = path.join(tickerDir, `ticker_${id}.webp`);
  if (!fs.existsSync(full)) return { id, full, missing: true, bytes: 0, width: 0, height: 0 };
  const st = fs.statSync(full);
  const size = webpSize(full);
  return { id, full, missing: false, bytes: st.size, ...size };
});

const missing = rows.filter((r) => r.missing);
const invalidSize = rows.filter((r) => !r.missing && (r.width !== expectedWidth || r.height !== expectedHeight));
const oversize = rows.filter((r) => !r.missing && r.bytes > maxFileKb * 1024);
const total = rows.reduce((sum, r) => sum + r.bytes, 0);
const totalMb = total / 1024 / 1024;

console.log(`Wave61 tickers: ${rows.length - missing.length}/${ids.length} présents`);
console.log(`Wave61 tickers locaux: ${totalMb.toFixed(2)} MB / ${maxTotalMb} MB max`);
console.log(`Limite par ticker: ${maxFileKb} KB · format attendu ${expectedWidth}×${expectedHeight} WEBP`);

for (const row of missing) console.error(`❌ ticker manquant: ${row.id}`);
for (const row of invalidSize) console.error(`❌ dimensions ${row.width}×${row.height}: ${row.id}`);
for (const row of oversize) console.error(`❌ ${(row.bytes / 1024).toFixed(0)} KB: ${row.id}`);
if (totalMb > maxTotalMb) console.error(`❌ Budget global dépassé: ${totalMb.toFixed(2)} MB > ${maxTotalMb} MB`);

if (missing.length || invalidSize.length || oversize.length || totalMb > maxTotalMb) process.exit(1);
console.log('✅ Budget réel des tickers Wave61 respecté.');
