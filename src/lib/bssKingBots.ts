// @ts-nocheck
import chauveAvatar from "../assets/bss/bots/bss_chauve.webp";
import jmPzAvatar from "../assets/bss/bots/bss_jm_pz.webp";
import alexautoAvatar from "../assets/bss/bots/bss_alexauto.webp";
import girailleAvatar from "../assets/bss/bots/bss_giraille.webp";
import pabloAvatar from "../assets/bss/bots/bss_pablo.webp";
import brissailleAvatar from "../assets/bss/bots/bss_brissaille.webp";
import trunkAvatar from "../assets/bss/bots/bss_trunk.webp";
import mimoAvatar from "../assets/bss/bots/bss_mimo.webp";
import richkardAvatar from "../assets/bss/bots/bss_richkard.webp";
import yoyoAvatar from "../assets/bss/bots/bss_yoyo.webp";
import pepitoAvatar from "../assets/bss/bots/bss_pepito.webp";
import patAvatar from "../assets/bss/bots/bss_pat.webp";
import agentKAvatar from "../assets/bss/bots/bss_agent_k.webp";
import cocoAvatar from "../assets/bss/bots/bss_coco.webp";
import billyBoyAvatar from "../assets/bss/bots/bss_billy_boy.webp";
import ouinxAvatar from "../assets/bss/bots/bss_ouinx.webp";

export type BssKingBot = {
  id: string;
  name: string;
  avatarDataUrl: string;
  isBot: true;
  source: "bss_king_official";
  groupLabel: "BSS KING";
  sortOrder: number;
  bssRank: number;
  bssHitRate: number;
  /** Nombre d'étoiles humaines visées sur la couronne (AVG3D ~= étoiles x 10). */
  bssStars: number;
  /** Compatibilité sélecteur historique /5. */
  botLevel: number;
  profileStarring: number;
  avg3d: number;
};

// Classement officiel BSS KING demandé : CHAUVE le plus fort, OUINX le moins fort.
// V113 : le niveau n'est plus une plage artificielle 72–96 %.
// Les étoiles BSS sont désormais comparables aux étoiles d'un joueur humain :
// 4★ ~= AVG3D actuel 40, 6★ ~= AVG3D 60, etc.
const RAW = [
  ["chauve", "CHAUVE", chauveAvatar, 10],
  ["jm_pz", "J-M PZ", jmPzAvatar, 9.5],
  ["alexauto", "ALEXAUTO", alexautoAvatar, 9],
  ["giraille", "GIRAILLE", girailleAvatar, 8],
  ["pablo", "PABLO", pabloAvatar, 7.5],
  ["brissaille", "BRISSAILLE", brissailleAvatar, 7],
  ["trunk", "TRUNK", trunkAvatar, 6.5],
  ["mimo", "MIMO", mimoAvatar, 6],
  ["richkard", "RICHKARD", richkardAvatar, 5.5],
  ["yoyo", "YOYO", yoyoAvatar, 5],
  ["pepito", "PEPITO", pepitoAvatar, 4.5],
  ["pat", "PAT", patAvatar, 4],
  ["agent_k", "AGENT K", agentKAvatar, 3.5],
  ["coco", "COCO", cocoAvatar, 3],
  ["billy_boy", "BILLY BOY", billyBoyAvatar, 2],
  ["ouinx", "OUINX", ouinxAvatar, 1],
] as const;

function hitRateForStars(stars: number) {
  const clamped = Math.max(1, Math.min(10, Number(stars) || 1));
  const t = (clamped - 1) / 9;
  // 1★ ~22 %, 4★ ~43 %, 6★ ~57 %, 8★ ~71 %, 10★ ~84 % de touche EXACTE.
  // Le reste devient surtout une touche proche, puis un vrai MISS.
  return Number((0.22 + 0.62 * Math.pow(t, 0.9)).toFixed(3));
}

export const BSS_KING_BOTS: BssKingBot[] = RAW.map(([slug, name, avatarDataUrl, stars], index) => {
  const rank = index + 1;
  const avg3d = Number(stars) * 10;
  const legacyLevel = Number((Number(stars) / 2).toFixed(2));
  return {
    id: `bss_${slug}`,
    name,
    avatarDataUrl,
    isBot: true,
    source: "bss_king_official",
    groupLabel: "BSS KING",
    sortOrder: rank,
    bssRank: rank,
    bssHitRate: hitRateForStars(Number(stars)),
    bssStars: Number(stars),
    botLevel: legacyLevel,
    profileStarring: legacyLevel,
    avg3d,
  };
});

// En PARTIE RAPIDE ces mêmes personnages deviennent des avatars jouables :
// ils ne sont volontairement PAS marqués comme BOTS pour laisser la saisie au joueur humain.
export const BSS_KING_PLAYABLE_CHARACTERS = BSS_KING_BOTS.map((bot) => ({
  id: bot.id,
  name: bot.name,
  avatarDataUrl: bot.avatarDataUrl,
  source: "bss_king_quick",
  groupLabel: "BSS KING",
  sortOrder: bot.sortOrder,
  bssRank: bot.bssRank,
  bssHitRate: bot.bssHitRate,
  temporaryParticipant: true,
  temporaryPlayerId: bot.id,
  isBot: false,
}));

export function bssKingBotHitRate(profile: any): number | null {
  const n = Number(profile?.bssHitRate);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
}
