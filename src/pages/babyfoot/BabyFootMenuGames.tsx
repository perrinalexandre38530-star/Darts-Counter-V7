// ============================================
// src/pages/babyfoot/BabyFootMenuGames.tsx
// Entry point Baby-Foot — route App.tsx "babyfoot_menu"
// ✅ Affiche le HUB (Match / Fun / Défis / Training)
// ✅ Délègue aux sous-menus (menus/*)
// ✅ Back depuis le HUB => Home BabyFoot
// ============================================

import React from "react";
import BabyFootGamesHub from "./BabyFootGamesHub";
import BabyFootTeams from "./BabyFootTeams";

import BabyFootMenuMatch from "./menus/BabyFootMenuMatch";
import BabyFootMenuFun from "./menus/BabyFootMenuFun";
import BabyFootMenuDefis from "./menus/BabyFootMenuDefis";
import BabyFootMenuTraining from "./menus/BabyFootMenuTraining";
import BabyFootMenuTournoi from "./menus/BabyFootMenuTournoi";

type Props = {
  go: (tab: any, params?: any) => void;
};

type Section = "hub" | "match" | "fun" | "defis" | "training" | "tournoi" | "teams";

export default function BabyFootMenuGames({ go }: Props) {
  const [section, setSection] = React.useState<Section>("hub");

  const backToHub = () => setSection("hub");

  // Back HUB -> Home BabyFoot (et fallback hash)
  const backToHome = () => {
    try {
      // si App.tsx a une route dédiée
      go("babyfoot");
      return;
    } catch {}
    try {
      // HashRouter fallback (Stackblitz)
      window.location.hash = "#/babyfoot";
    } catch {}
  };

  if (section === "match")
    return <BabyFootMenuMatch onBack={backToHub} go={go} />;
  if (section === "training")
    return <BabyFootMenuTraining onBack={backToHub} go={go} />;
  if (section === "fun") return <BabyFootMenuFun onBack={backToHub} go={go} />;
  if (section === "defis")
    return <BabyFootMenuDefis onBack={backToHub} go={go} />;
  if (section === "teams") return <BabyFootTeams go={go} params={{}} />;
  if (section === "tournoi")
    return <BabyFootMenuTournoi onBack={backToHub} go={go} />;

  return (
    <BabyFootGamesHub
      onBack={backToHome}
      onSelect={(s: any) => {
        if (s === "match") return setSection("match");
        if (s === "training") return setSection("training");
        if (s === "fun") return setSection("fun");
        if (s === "defis") return setSection("defis");
        if (s === "teams") return setSection("teams");
        if (s === "tournoi") return setSection("tournoi");
      }}
    />
  );
}
