import { getAudioPreferences } from "./audioPreferences";
import type { CollectibleCollectionId } from "./collectibleCards";

// Mélodies arcade originales synthétisées localement : aucun asset réseau,
// et respect du volume / des interrupteurs dans Réglages > Audio.
const MELODIES: Record<CollectibleCollectionId, Array<[number, number, number]>> = {
  awena: [[523.25, 0, .10], [659.25, .11, .10], [783.99, .23, .12], [1046.50, .38, .25]],
  firefighter: [[392, 0, .11], [523.25, .12, .09], [659.25, .24, .10], [783.99, .36, .10], [1046.50, .49, .22]],
  loterie: [[659.25, 0, .08], [880, .11, .11], [1174.66, .27, .11], [1567.98, .43, .20]],
  killer: [[293.66, 0, .08], [349.23, .10, .08], [440, .20, .09], [587.33, .33, .10], [880, .48, .20]],
  legends: [[392, 0, .09], [523.25, .10, .09], [659.25, .21, .10], [783.99, .33, .13], [1046.50, .49, .24]],
};

// Fanfares spécialement composées pour les 3 variantes holographiques.
// La musique des familles standard reste inchangée.
const ULTRA_MELODIES: Record<string, Array<[number, number, number]>> = {
  legend_ultra_the_power: [[523.25,0,.12],[659.25,.13,.12],[783.99,.27,.15],[1046.5,.43,.18],[1318.51,.65,.22],[1567.98,.88,.32]],
  legend_ultra_green_machine: [[587.33,0,.09],[783.99,.11,.12],[987.77,.25,.12],[1174.66,.40,.15],[1567.98,.60,.24],[1975.53,.89,.32]],
  legend_ultra_the_flying_scotsman: [[440,0,.14],[587.33,.15,.12],[783.99,.32,.15],[880,.49,.15],[1174.66,.70,.22],[1760,.97,.29]],
};

export function playCollectibleUnlockSound(collection: CollectibleCollectionId, ultraCardId?: string): void {
  try {
    const prefs = getAudioPreferences();
    if (!prefs.masterEnabled || !prefs.arcadeSfxEnabled || !prefs.uiSfxEnabled) return;
    if (typeof window === "undefined") return;
    const BrowserAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!BrowserAudioContext) return;
    const audio = new BrowserAudioContext();
    const baseTime = audio.currentTime + .022;
    const volume = Math.min(.12, .12 * prefs.uiSfxVolume * prefs.gameplaySfxVolume);
    if (volume <= 0) { void audio.close().catch(() => {}); return; }
    const notes = (ultraCardId && ULTRA_MELODIES[ultraCardId]) || MELODIES[collection] || MELODIES.legends;
    notes.forEach(([frequency, offset, duration], index) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = ultraCardId ? "triangle" : collection === "killer" ? "square" : collection === "loterie" ? "sine" : "triangle";
      osc.frequency.setValueAtTime(frequency, baseTime + offset);
      if (collection === "firefighter") osc.frequency.exponentialRampToValueAtTime(frequency * 1.08, baseTime + offset + duration);
      gain.gain.setValueAtTime(.0001, baseTime + offset);
      gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume * (index === notes.length - 1 ? 1 : .75)), baseTime + offset + .014);
      gain.gain.exponentialRampToValueAtTime(.0001, baseTime + offset + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(baseTime + offset);
      osc.stop(baseTime + offset + duration + .02);
    });
    // Le navigateur peut interdire l'autoplay ; dans ce cas la récompense
    // reste visible et on ne relance pas un son au clic de façon intrusive.
    void audio.resume().catch(() => {});
    window.setTimeout(() => { void audio.close().catch(() => {}); }, ultraCardId ? 1850 : 1300);
  } catch { /* Pas de blocage du scoring si l'audio échoue. */ }
}
