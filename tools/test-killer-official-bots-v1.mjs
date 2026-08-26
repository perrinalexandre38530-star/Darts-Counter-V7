import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const lib = fs.readFileSync(path.join(root, 'src/lib/dartsKillerBots.ts'), 'utf8');
const config = fs.readFileSync(path.join(root, 'src/pages/KillerConfig.tsx'), 'utf8');
const play = fs.readFileSync(path.join(root, 'src/pages/KillerPlay.tsx'), 'utf8');

const expected = ['MORROW','VELVET','BRUTUS','DJUNO','THORN','MIASMA','RAZE','NOZ','ZENO','BRAT','VIPER','WEST','BATUGA','SKULL'];
const entries = [...lib.matchAll(/bot\("bot_killer_[^"]+",\s*"([^"]+)"/g)].map((m) => m[1]);
if (entries.length !== 14) throw new Error(`Expected 14 Killer IA bots, got ${entries.length}`);
for (const name of expected) {
  if (!entries.includes(name)) throw new Error(`Missing Killer IA bot: ${name}`);
}

const assetsDir = path.join(root, 'src/assets/avatars/killer-bots');
const assets = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.webp'));
if (assets.length < 14) throw new Error(`Expected at least 14 Killer avatar assets, got ${assets.length}`);

if (/assets\/avatars\/bots-pro\//.test(config)) throw new Error('KillerConfig still imports generic PRO bot avatars');
if (/Green Machine|Wonder Kid|Cool Hand|The Power/.test(config)) throw new Error('KillerConfig still contains generic PRO bot names');
if (!config.includes('DARTS_KILLER_BOTS')) throw new Error('KillerConfig does not use official Killer roster');
if (!config.includes('CPU Home') || !config.includes('isUserBot: true')) throw new Error('User CPU bot preservation/grouping missing');
if (!config.includes('!isNonUserSystemBot')) throw new Error('Legacy/system bot filtering missing');
if (!play.includes('Math.round(parsed)')) throw new Error('Killer half-star level projection missing');

console.log('OK — Killer has 14 exclusive IA bots, generic PRO bots are removed, and user CPU bots remain selectable.');
