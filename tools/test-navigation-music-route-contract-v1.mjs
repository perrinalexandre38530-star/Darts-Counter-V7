import fs from 'node:fs';
import { isGameplayRouteName } from '../src/lib/gameplayRoutes.ts';

const component = fs.readFileSync(new URL('../src/components/NavigationBackgroundMusic.tsx', import.meta.url), 'utf8');

const navigationRoutes = [
  'home',
  'games',
  'profiles',
  'tournaments',
  'tournament_view',
  'stats',
  'statsHub',
  'settings',
  'cast_host',
  'viewer_host',
  'messages',
  'online',
  'killer_config',
  'x01_online_setup',
  'training_x01',
];

const gameplayRoutes = [
  'x01',
  'x01_play_v3',
  'cricket',
  'killer_play',
  'shanghai_play',
  'training_clock',
  'training_mode',
  'tournament_match_play',
  'petanque.play',
  'babyfoot_play',
];

for (const route of navigationRoutes) {
  if (isGameplayRouteName(route)) throw new Error(`Navigation route misclassified as gameplay: ${route}`);
}
for (const route of gameplayRoutes) {
  if (!isGameplayRouteName(route)) throw new Error(`Gameplay route not classified as gameplay: ${route}`);
}

if (/pausedByVideoRef|activeVideoRefs|isAudibleVideo|document\.addEventListener\(["']play["']/.test(component)) {
  throw new Error('Navigation music still contains a global media/video pause gate.');
}
if (!component.includes('hardStopForGameplay')) {
  throw new Error('Gameplay hard stop is missing.');
}
if (!component.includes('NAVIGATION_MUSIC_PREVIEW_EVENT')) {
  throw new Error('Explicit Settings music preview support is missing.');
}

console.log('NAVIGATION MUSIC ROUTE CONTRACT V1 = OK');
