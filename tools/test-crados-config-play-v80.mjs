import assert from "node:assert/strict";
import fs from "node:fs";

const cfg = fs.readFileSync(new URL("../src/pages/newModes/NewDartsModeConfig.tsx", import.meta.url), "utf8");
const cradosCfg = fs.readFileSync(new URL("../src/pages/CradosConfig.tsx", import.meta.url), "utf8");
const play = fs.readFileSync(new URL("../src/pages/CradosPlay.tsx", import.meta.url), "utf8");
const landscape = fs.readFileSync(new URL("../src/styles/responsive-landscape.css", import.meta.url), "utf8");

assert.match(cfg, /import \{ BotTeamsSection, PillButton, X01_PRO_BOTS, TeamsSection \} from "\.\.\/X01ConfigV3"/, "CRADOS doit réutiliser les vrais composants équipes X01");
assert.match(cfg, /<TeamsSection[\s\S]*sourceMode=\{cradosTeamsSourceMode as any\}/, "Le sélecteur équipes CRADOS doit passer par TeamsSection");
assert.match(cfg, /<BotTeamsSection[\s\S]*botTeams=\{cradosBotTeamOptions\}/, "Les familles BOTS CRADOS doivent passer par BotTeamsSection comme dans X01");
assert.match(cfg, /<PillButton label="Manuel"[\s\S]*<PillButton label="Équipes enregistrées"[\s\S]*<PillButton label="Brassage auto"/, "Les choix de source équipes doivent reprendre les boutons X01");
assert.match(cfg, /PlayerPagedSelector[\s\S]*modalTitle="Choisir des joueurs"/, "Le sélecteur joueurs partagé doit rester utilisé");
assert.match(cfg, /\["Mode", cradosTeamMode \? "Équipes" : "Joueurs", "Crasse", "Format", "Saisie", "Résumé"\]/, "Le mode guidé CRADOS doit être découpé en 6 étapes");
assert.match(cfg, /goGuidedStep[\s\S]*scrollTo\(\{ top: 0/, "Chaque changement d'étape doit remonter en haut de la configuration");
assert.match(cfg, /const cradosSelectedBotTeams = React\.useMemo\(\(\) => \{[\s\S]*if \(!cradosBotTeamsPanelEnabled\) return \[\]/, "Le ON\/OFF des équipes BOTS doit suivre le comportement X01");
assert.match(cfg, /const activeCradosTeams = cradosTeamsSourceMode === "manual"[\s\S]*cradosManualTeams[\s\S]*cradosSelectedBotTeams/, "En manuel, les équipes BOTS doivent s'ajouter aux équipes Gold\/Pink\/Blue\/Green comme dans X01");
assert.match(cradosCfg, /maxPlayers: 10/, "CRADOS doit respecter la limite de 10 joueurs");
assert.match(play, /className="crados-play" data-mss-native-play-layout="1"/, "La page PLAY CRADOS doit déclarer son layout natif");
assert.match(landscape, /> :first-child:not\(\.crados-play\):has\(/, "Le premier auto-split paysage ne doit plus capturer CRADOS");
assert.match(landscape, /> :first-child:has\([^\n]+\):not\(\.killer-play-screen\):not\(\.crados-play\):not\(\[data-mss-native-play-layout="1"\]\)/, "Le filet de sécurité legacy V64B ne doit plus capturer CRADOS");

console.log("✅ CRADOS V80 config/play regression OK: sélecteurs X01 complets, guidage 6 étapes, 10 joueurs max et double protection du Play paysage.");
