import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { convertAndroidReferencedWav } from './convert-android-referenced-wav.mjs';

const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
const ffprobe = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
if (ffmpeg.status !== 0 || ffprobe.status !== 0) {
  console.warn('SKIP Android WAV conversion test: ffmpeg/ffprobe required');
  process.exit(0);
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mss-android-wav-test-'));
const dist = path.join(root, 'dist');
const dir = path.join(dist, 'sounds', 'darts-firefighter');
fs.mkdirSync(dir, { recursive: true });

function makeWav(seconds = 4) {
  const sampleRate = 44100;
  const samples = sampleRate * seconds;
  const pcm = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    const sample = Math.floor(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 18000);
    pcm.writeInt16LE(sample, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(pcm.length + 36, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
try {
  const oldPath = path.join(dir, 'water_1.wav');
  const newPath = path.join(dir, 'water_1.mp3');
  const untouched = path.join(dir, 'never-used.wav');
  const wav = makeWav();
  fs.writeFileSync(oldPath, wav);
  fs.writeFileSync(untouched, wav);
  const oldRef = 'sounds/darts-firefighter/water_1.wav';
  const newRef = 'sounds/darts-firefighter/water_1.mp3';
  fs.writeFileSync(path.join(dist, 'index.html'), '<audio src="/' + oldRef + '"></audio>');
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'assets', 'main.js'), 'new Audio("/' + oldRef + '");');
  fs.writeFileSync(path.join(dist, 'assets', 'main.js.map'), JSON.stringify({ files: [oldRef] }));
  const result = convertAndroidReferencedWav({ dist });
  assert.equal(result.converted, 1, 'one referenced WAV must convert');
  assert(result.savedBytes > 0, 'actual file size must shrink');
  assert(!fs.existsSync(oldPath), 'old WAV must be removed after successful conversion');
  assert(fs.existsSync(newPath), 'new offline MP3 must exist');
  assert(fs.existsSync(untouched), 'unreferenced WAV must remain intact');
  for (const file of ['index.html', 'assets/main.js', 'assets/main.js.map']) {
    const content = fs.readFileSync(path.join(dist, file), 'utf8');
    assert(content.includes(newRef), file + ' should use MP3');
    assert(!content.includes(oldRef), file + ' retains a stale WAV reference');
  }
  const read = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name',
    '-of', 'default=noprint_wrappers=1:nokey=1', newPath,
  ], { encoding: 'utf8' });
  assert.equal(read.status, 0);
  assert.equal(read.stdout.trim(), 'mp3');
  console.log('OK Android WAV/MP3: decode, path rewrite and offline safety');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
