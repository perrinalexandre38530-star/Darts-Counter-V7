import React from "react";
import TopTicker from "./TopTicker";
import BackDot from "./BackDot";
import InfoDot from "./InfoDot";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerClassements from "../assets/tickers/ticker_classements.webp";
import tickerRankings from "../assets/tickers/ticker_rankings.webp";

type Props = {
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  infoTitle?: string;
  infoContent?: React.ReactNode | string;
  maxWidth?: number | string;
  marginBottom?: number;
  backTitle?: string;
};

export default function RankingsTickerHeader({
  onBack,
  rightSlot,
  infoTitle,
  infoContent,
  maxWidth = "100%",
  marginBottom = 10,
  backTitle,
}: Props) {
  const { lang } = useLang();
  const { theme } = useTheme();
  const isFr = lang === "fr";
  const primary = (theme as any)?.primary || (theme as any)?.accent || "#28eaff";

  return (
    <TopTicker
      src={isFr ? tickerClassements : tickerRankings}
      alt={isFr ? "Classements" : "Rankings"}
      maxWidth={maxWidth}
      marginBottom={marginBottom}
      startSlot={
        <BackDot
          onClick={onBack}
          size={42}
          color={primary}
          title={backTitle || (isFr ? "Retour à la page précédente" : "Back to the previous page")}
        />
      }
      endSlot={
        rightSlot || (
          <InfoDot
            size={42}
            color={primary}
            title={infoTitle || (isFr ? "Informations sur les classements" : "Rankings information")}
            content={
              infoContent ||
              (isFr
                ? "Cette page présente les classements globaux du sport actif. Utilise les filtres de période, de mode et de statistique pour comparer les joueurs, équipes ou profils disponibles."
                : "This page shows the global rankings for the active sport. Use the period, mode and statistic filters to compare available players, teams or profiles.")
            }
          />
        )
      }
    />
  );
}
