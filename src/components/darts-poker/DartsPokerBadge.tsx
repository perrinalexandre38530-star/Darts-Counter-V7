import React from "react";
import badgePremiereDonne from "../../assets/darts-poker/badges/premiere-donne.webp";
import badgeHabitueDeLaTable from "../../assets/darts-poker/badges/habitue-de-la-table.webp";
import badgeShark from "../../assets/darts-poker/badges/shark.webp";
import badgeSniper from "../../assets/darts-poker/badges/sniper.webp";
import badgeContractMaster from "../../assets/darts-poker/badges/contract-master.webp";
import badgePowerPlayer from "../../assets/darts-poker/badges/power-player.webp";
import badgeJokerMaster from "../../assets/darts-poker/badges/joker-master.webp";
import badgeMainPremium from "../../assets/darts-poker/badges/main-premium.webp";
import badgeLeaderDeTable from "../../assets/darts-poker/badges/leader-de-la-table.webp";
import badgeDealerGagnant from "../../assets/darts-poker/badges/dealer-gagnant.webp";
import badgeCloser from "../../assets/darts-poker/badges/closer.webp";
import badgeRoyal from "../../assets/darts-poker/badges/royal.webp";
import badgeTableRegular from "../../assets/darts-poker/badges/table-regular.webp";
import badgeTableLeader from "../../assets/darts-poker/badges/table-leader.webp";
import badgeWinningDealer from "../../assets/darts-poker/badges/winning-dealer.webp";

export type DartsPokerBadgeId =
  | "first_deal"
  | "table_regular"
  | "shark"
  | "sniper"
  | "contract_master"
  | "power_player"
  | "joker_master"
  | "premium_hand"
  | "table_leader"
  | "winning_dealer"
  | "closer"
  | "royal";

export type DartsPokerBadgeDefinition = {
  id: DartsPokerBadgeId;
  labelFr: string;
  labelEn: string;
  artFr: string;
  artEn?: string;
};

export const DARTS_POKER_BADGES: Record<DartsPokerBadgeId, DartsPokerBadgeDefinition> = {
  first_deal: { id: "first_deal", labelFr: "PREMIÈRE DONNE", labelEn: "FIRST DEAL", artFr: badgePremiereDonne },
  table_regular: { id: "table_regular", labelFr: "HABITUÉ DE LA TABLE", labelEn: "TABLE REGULAR", artFr: badgeHabitueDeLaTable, artEn: badgeTableRegular },
  shark: { id: "shark", labelFr: "SHARK", labelEn: "SHARK", artFr: badgeShark },
  sniper: { id: "sniper", labelFr: "SNIPER", labelEn: "SNIPER", artFr: badgeSniper },
  contract_master: { id: "contract_master", labelFr: "CONTRACT MASTER", labelEn: "CONTRACT MASTER", artFr: badgeContractMaster },
  power_player: { id: "power_player", labelFr: "POWER PLAYER", labelEn: "POWER PLAYER", artFr: badgePowerPlayer },
  joker_master: { id: "joker_master", labelFr: "JOKER MASTER", labelEn: "JOKER MASTER", artFr: badgeJokerMaster },
  premium_hand: { id: "premium_hand", labelFr: "MAIN PREMIUM", labelEn: "PREMIUM HAND", artFr: badgeMainPremium },
  table_leader: { id: "table_leader", labelFr: "LEADER DE TABLE", labelEn: "TABLE LEADER", artFr: badgeLeaderDeTable, artEn: badgeTableLeader },
  winning_dealer: { id: "winning_dealer", labelFr: "DEALER GAGNANT", labelEn: "WINNING DEALER", artFr: badgeDealerGagnant, artEn: badgeWinningDealer },
  closer: { id: "closer", labelFr: "CLOSER", labelEn: "CLOSER", artFr: badgeCloser },
  royal: { id: "royal", labelFr: "ROYAL", labelEn: "ROYAL", artFr: badgeRoyal },
};

export function currentDartsPokerLanguage(): string {
  try {
    return String(localStorage.getItem("dc_lang_v1") || navigator.language || "fr").toLowerCase();
  } catch {
    return "fr";
  }
}

export function getDartsPokerBadgeDefinition(id: DartsPokerBadgeId): DartsPokerBadgeDefinition {
  return DARTS_POKER_BADGES[id];
}

export function getDartsPokerBadgeArt(id: DartsPokerBadgeId, language = currentDartsPokerLanguage()): string {
  const badge = DARTS_POKER_BADGES[id];
  const isFrench = String(language || "fr").toLowerCase().startsWith("fr");
  return !isFrench && badge.artEn ? badge.artEn : badge.artFr;
}

export function getDartsPokerBadgeLabel(id: DartsPokerBadgeId, language = currentDartsPokerLanguage()): string {
  const badge = DARTS_POKER_BADGES[id];
  return String(language || "fr").toLowerCase().startsWith("fr") ? badge.labelFr : badge.labelEn;
}

export default function DartsPokerBadge({
  id,
  size = 64,
  unlocked = true,
  title,
  style,
}: {
  id: DartsPokerBadgeId;
  size?: number | string;
  unlocked?: boolean;
  title?: string;
  style?: React.CSSProperties;
}) {
  const src = getDartsPokerBadgeArt(id);
  const label = title || getDartsPokerBadgeLabel(id);
  return <img
    src={src}
    alt={label}
    title={label}
    draggable={false}
    style={{
      width: size,
      height: size,
      objectFit: "contain",
      display: "block",
      opacity: unlocked ? 1 : .55,
      filter: unlocked ? "none" : "grayscale(.55) saturate(.55) brightness(.72)",
      transition: "filter .18s ease, opacity .18s ease, transform .18s ease",
      ...style,
    }}
  />;
}
