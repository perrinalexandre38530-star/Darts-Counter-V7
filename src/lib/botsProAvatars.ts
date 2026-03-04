// ============================================
// src/lib/botsProAvatars.ts
// Mapping des bots IA "PRO" (src/lib/botsPro.ts) vers leurs avatars (assets)
// Utilisé par les configs (GOLF / SCRAM / etc.) pour afficher les images.
// ============================================

import avatarGreenMachine from "../assets-webp/avatars/bots-pro/green-machine.webp";
import avatarSnakeKing from "../assets-webp/avatars/bots-pro/snake-king.webp";
import avatarWonderKid from "../assets-webp/avatars/bots-pro/wonder-kid.webp";
import avatarIceMan from "../assets-webp/avatars/bots-pro/ice-man.webp";
import avatarFlyingScotsman from "../assets-webp/avatars/bots-pro/flying-scotsman.webp";
import avatarCoolHand from "../assets-webp/avatars/bots-pro/cool-hand.webp";
import avatarThePower from "../assets-webp/avatars/bots-pro/the-power.webp";
import avatarBullyBoy from "../assets-webp/avatars/bots-pro/bully-boy.webp";
import avatarTheAsp from "../assets-webp/avatars/bots-pro/the-asp.webp";
import avatarHollywood from "../assets-webp/avatars/bots-pro/hollywood.webp";
import avatarTheFerret from "../assets-webp/avatars/bots-pro/the-ferret.webp";

export type ProBotAvatarKey =
  | "pro_mvg"
  | "pro_wright"
  | "pro_littler"
  | "pro_price"
  | "pro_anderson"
  | "pro_humphries"
  | "pro_taylor"
  | "pro_smith"
  | "pro_aspinall"
  | "pro_dobey"
  | "pro_clayton";

/**
 * Map avatarKey -> image (import png)
 * NOTE: ProfileAvatar accepte les imports PNG (objet {default}).
 */
export const PRO_BOT_AVATARS: Record<ProBotAvatarKey, any> = {
  pro_mvg: avatarGreenMachine,
  pro_wright: avatarSnakeKing,
  pro_littler: avatarWonderKid,
  pro_price: avatarIceMan,
  pro_anderson: avatarFlyingScotsman,
  pro_humphries: avatarCoolHand,
  pro_taylor: avatarThePower,
  pro_smith: avatarBullyBoy,
  pro_aspinall: avatarTheAsp,
  pro_dobey: avatarHollywood,
  pro_clayton: avatarTheFerret,
};

export function getProBotAvatar(avatarKey: string | null | undefined): any | null {
  if (!avatarKey) return null;
  return (PRO_BOT_AVATARS as any)[avatarKey] ?? null;
}
