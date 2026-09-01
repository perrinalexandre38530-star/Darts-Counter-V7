import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const need = (ok, msg) => { if (!ok) throw new Error(`E-SPORTS V0.6: ${msg}`); };

const api = read("src/esports/networkV6.ts");
const ui = read("src/pages/esports/EsportsNetworkV6.tsx");
const v5 = read("src/pages/esports/EsportsNetworkV5.tsx");
const css = read("src/pages/esports/esportsHub.css");
const hub = read("src/pages/esports/EsportsHub.tsx");
const sql = read("supabase/migrations/20260901191600_esports_ranked_progression_v6.sql");

for (const token of [
  "ms_esports_rating_profile_v6",
  "ms_esports_rating_history_v6",
  "ms_esports_ranked_history_v6",
  "ms_esports_forfeit_competitive_match_v6",
  "ms_esports_request_rematch_v6",
  "ms_esports_open_dispute_v6",
  "ms_esports_withdraw_dispute_v6",
]) need(api.includes(token), `API manquante ${token}`);

for (const token of ["PLACEMENT", "GRANDMASTER", "CHAMPION", "COURBE MMR", "CONTRÔLE DU MATCH", "HISTORIQUE CLASSÉ", "Déclarer forfait", "Demander un rematch", "CENTRE DE LITIGE"])
  need(ui.includes(token), `UI manquante ${token}`);

need(v5.includes('EsportsRankedProgressV6'), "V0.6 non branchée à la session V0.5");
need(sql.includes("placement_matches") && sql.includes("peak_rating") && sql.includes("streak"), "colonnes de progression absentes");
need(sql.includes("v_matches<5 then 48 else 32"), "K placement 48 / établi 32 absent");
need(sql.includes("unique(match_id,user_id)"), "anti double-comptage historique absent");
need(sql.includes("DISPUTE_OPEN"), "gel du MMR en litige absent");
need(sql.includes("rematch:") && sql.includes("on conflict(source_pair_key) do nothing"), "rematch canonique anti-doublon absent");
need(sql.includes("reason,'forfeit'") || sql.includes("'forfeit'"), "forfait classé absent");

need(css.includes(".esports-room-master-grid") && css.includes("grid-template-columns: minmax(0,1fr) !important"), "grille salons non sécurisée mobile");
need(css.includes(".esports-root *") && css.includes("min-width: 0"), "contrat descendants min-width absent");
need(css.includes("@media (max-width: 330px)"), "petits téléphones non couverts");
need(hub.includes('className="esports-room-master-grid"'), "grille salons V85 non raccordée au responsive");
need(!hub.includes('minmax(220px,.75fr) minmax(300px,1.25fr)'), "ancienne grille salons débordante encore présente");
need(!hub.includes('repeat(auto-fit,minmax(170px,1fr))'), "ancienne grille résultat 170px non bornée encore présente");
need(!hub.includes('minmax(220px,.65fr) minmax(340px,1.35fr)'), "ancienne grille tournois débordante encore présente");
need(!hub.includes('minmax(90px,.6fr) minmax(200px,1.5fr) minmax(100px,.7fr)'), "ancienne ligne historique débordante encore présente");
need(!/minmax\([1-9][0-9]{2}px,1fr\)/.test(hub), "minimum pixel non borné encore présent dans le hub");
need(css.includes('.esports-tournament-master-grid') && css.includes('.esports-manual-history-row'), "responsive tournois/historique absent");

console.log("E-SPORTS V0.6 ranked progression + strict mobile contract: OK");
