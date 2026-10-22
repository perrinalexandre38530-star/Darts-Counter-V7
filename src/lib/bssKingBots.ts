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
  botLevel: number;
  profileStarring: number;
};

// Classement officiel BSS KING demandé : CHAUVE le plus fort, OUINX le moins fort.
// Tous restent des adversaires relevés : la plage IA va de 96 % à 72 % de réussite
// sur l'objectif choisi par le moteur, avec une décroissance régulière par rang.
const RAW = [
  ["chauve", "CHAUVE", chauveAvatar],
  ["jm_pz", "J-M PZ", jmPzAvatar],
  ["alexauto", "ALEXAUTO", alexautoAvatar],
  ["giraille", "GIRAILLE", girailleAvatar],
  ["pablo", "PABLO", pabloAvatar],
  ["brissaille", "BRISSAILLE", brissailleAvatar],
  ["trunk", "TRUNK", trunkAvatar],
  ["mimo", "MIMO", mimoAvatar],
  ["richkard", "RICHKARD", richkardAvatar],
  ["yoyo", "YOYO", yoyoAvatar],
  ["pepito", "PEPITO", pepitoAvatar],
  ["pat", "PAT", patAvatar],
  ["agent_k", "AGENT K", agentKAvatar],
  ["coco", "COCO", cocoAvatar],
  ["billy_boy", "BILLY BOY", billyBoyAvatar],
  ["ouinx", "OUINX", ouinxAvatar],
] as const;

function starsForRank(rank: number) {
  if (rank <= 4) return 5;
  if (rank <= 8) return 4.5;
  if (rank <= 12) return 4;
  return 3.5;
}

export const BSS_KING_BOTS: BssKingBot[] = RAW.map(([slug, name, avatarDataUrl], index) => {
  const rank = index + 1;
  const hitRate = Number((0.96 - index * (0.24 / 15)).toFixed(3));
  const stars = starsForRank(rank);
  return {
    id: `bss_${slug}`,
    name,
    avatarDataUrl,
    isBot: true,
    source: "bss_king_official",
    groupLabel: "BSS KING",
    sortOrder: rank,
    bssRank: rank,
    bssHitRate: hitRate,
    botLevel: stars,
    profileStarring: stars,
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
