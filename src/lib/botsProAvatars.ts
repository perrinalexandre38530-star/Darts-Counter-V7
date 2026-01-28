// ============================================
// src/lib/botsProAvatars.ts
// Mapping des bots IA "PRO" (src/lib/botsPro.ts) vers leurs avatars (assets)
// Utilisé par les configs (GOLF / SCRAM / etc.) pour afficher les images.
// ============================================

import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";

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
