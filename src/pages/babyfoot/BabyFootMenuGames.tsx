// ============================================
// src/pages/babyfoot/BabyFootMenuGames.tsx
// Entry point Baby-Foot — garde la route App.tsx "babyfoot_menu"
// ✅ Affiche le HUB (Match / Fun / Défis / Training / Tournoi / Stats)
// ✅ N'écrase rien côté Darts / Pétanque / PingPong
// ============================================

import React from "react";
import BabyFootGamesHub from "./BabyFootGamesHub";

import BabyFootMenuMatch from "./menus/BabyFootMenuMatch";
import BabyFootMenuFun from "./menus/BabyFootMenuFun";
import BabyFootMenuDefis from "./menus/BabyFootMenuDefis";
import BabyFootMenuTraining from "./menus/BabyFootMenuTraining";
import BabyFootMenuTournoi from "./menus/BabyFootMenuTournoi";

type Props = {
  go: (tab: any, params?: any) => void;
};

type Section = "hub" | "match" | "fun" | "defis" | "training" | "tournoi";

export default function BabyFootMenuGames({ go }: Props) {
  const [section, setSection] = React.useState<Section>("hub");

  if (section === "match") return <BabyFootMenuMatch go={go} />;
  if (section === "training") return <BabyFootMenuTraining go={go} />;
  if (section === "fun") return <BabyFootMenuFun go={go} />;
  if (section === "defis") return <BabyFootMenuDefis go={go} />;
  if (section === "tournoi") return <BabyFootMenuTournoi go={go} />;

  return (
    <BabyFootGamesHub
      onBack={() => go("games")}
      onSelect={(s) => {
        if (s === "stats") {
          go("babyfoot_stats_history");
          return;
        }
        if (s === "match") setSection("match");
        else if (s === "training") setSection("training");
        else if (s === "fun") setSection("fun");
        else if (s === "defis") setSection("defis");
        else if (s === "tournoi") setSection("tournoi");
      }}
    />
  );
}
