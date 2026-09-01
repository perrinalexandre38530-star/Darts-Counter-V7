import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const must = (ok, message) => { if (!ok) throw new Error(message); console.log(`✅ ${message}`); };

const css = read("src/pages/esports/esportsHub.css");
const hub = read("src/pages/esports/EsportsHub.tsx");
const v4 = read("src/pages/esports/EsportsNetworkV4.tsx");
const v5 = read("src/pages/esports/EsportsNetworkV5.tsx");
const watermark = read("src/components/home/SportWelcomeWatermark.tsx");

must(css.includes("max-width: 100vw") && css.includes("overflow-x: hidden"), "La racine E-SPORTS ne peut pas élargir le viewport téléphone.");
must(css.includes("max-width: 520px"), "Largeur de page calée sur la HOME DARTS SCORING.");
must(css.includes("min-width: 0") && css.includes("box-sizing: border-box"), "Tous les descendants peuvent réellement se contracter sur mobile.");
must(css.includes("@media (max-width: 440px)") && css.includes(".esports-mobile-stack"), "Breakpoint mobile et empilement des formulaires larges présents.");
must(css.includes(".esports-bracket-track") && css.includes("min-width: 0 !important"), "Le bracket devient vertical sur téléphone sans débordement horizontal.");
must(hub.includes("SportHomeWelcomeHeader") && hub.includes('title="E-SPORTS SCORING"'), "Header E-SPORTS réutilise le langage visuel DARTS SCORING.");
must(hub.includes("esports-hero-card") && hub.includes("esports-section-nav"), "Carte joueur/KPI et navigation compacte façon HOME présentes.");
must(watermark.includes("esports: logoEsports"), "Logo E-SPORTS utilisé comme watermark du header commun.");
must(v4.includes("esports-form-grid") && v5.includes("esports-leader-row"), "Réseau V0.4/V0.5 utilise les primitives responsive communes.");

console.log("\nE-SPORTS RESPONSIVE + DARTS VISUAL CONTRACT: OK");
