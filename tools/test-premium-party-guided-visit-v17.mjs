import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const ui=read("src/pages/newModes/PremiumPartyModeUi.tsx");
for(const marker of ["AimAssistCard","VisitRoadmap","DecisionRail","party-mode-roadmap__steps","party-mode-decision-rail"]) {
  assert(ui.includes(marker),`UI V17: ${marker} absent`);
}

const css=read("src/pages/newModes/PremiumPartyModeUi.css");
for(const marker of ["V16 — aide cible / route de volée","V17 — VOLÉE GUIDÉE / ROADMAP LIVE",".party-mode-roadmap",".party-mode-decision-rail"]) {
  assert(css.includes(marker),`CSS V17: ${marker} absent`);
}

const pages={
  castle:["src/pages/CastlePlay.tsx","VisitRoadmap","PLAN DE VOLÉE","castleDartLabel(uiToGameDart"],
  gotcha:["src/pages/GotchaPlay.tsx","VisitRoadmap","ROUTE GOTCHA / FINISH","gotchaDartLabel(uiToGameDart"],
  hare:["src/pages/HareHoundsPlay.tsx","VisitRoadmap","POURSUITE DART PAR DART","hareDartLabel(uiToGameDart"],
  pendu:["src/pages/PenduPlay.tsx","VisitRoadmap","OBJECTIF DART PAR DART","La route tient compte de la malédiction active."],
  menteur:["src/pages/MenteurPlay.tsx","VisitRoadmap","PREUVE DART PAR DART","DecisionRail","PRUDENT, PRESSION OU BLUFF ?"],
};
for(const [mode,[file,...markers]] of Object.entries(pages)){
  const src=read(file);
  for(const marker of markers) assert(src.includes(marker),`${mode}: ${marker} absent`);
}

console.log("✅ PREMIUM PARTY GUIDED VISIT V17 — roadmap live / prise de décision / V16 réparé : OK");
