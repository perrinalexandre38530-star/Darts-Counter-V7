// @ts-nocheck
// Architecture V10+ : socle Wave61 partagé, enrichi par passes dédiées.
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { useViewport } from "../hooks/useViewport";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { History } from "../lib/history";
import { getTicker } from "../lib/tickers";
import {
  buildWave61Advice,
  buildWave61VisitComment,
  playWave61FeedbackTone,
  wave61ToneForVisit,
} from "../lib/wave61Feedback";
import type { Dart as UIDart } from "../lib/types";
import {
  cloneWave61State,
  createWave61State,
  getWave61Target,
  normalizeWave61Config,
  pickWave61BotDarts,
  playWave61Visit,
  wave61DartLabel,
  wave61MineNeighborCount,
  wave61PrimaryMetric,
  wave61LucioleTarget,
  wave61GoldenTarget,
  WAVE61_ENGINE_VERSION,
  type Wave61State,
} from "../lib/gameEngines/wave61Engine";
import {
  Meter,
  ModeEndPanel,
  NewModeInput,
  PlayerCard,
  SOFT,
  VisitTimeline,
  actionStyle,
  isBotProfile,
  panelStyle,
  playerName,
  resolveModeProfiles,
  uiToGameDart,
} from "./newModes/newModePlayShared";
import {
  AthleticsPanel,
  ChatSourisPanel,
  ChienChatPanel,
  FreefallPanel,
  JumpRopePanel,
  MazeChasePanel,
  RollerCoasterPanel,
  SoleilPanel,
  TugRushPanel,
  TyrolienPanel,
} from "./wave61/Wave61RacePanels";
import {
  ApocalypsePanel,
  CosmoKnightsPanel,
  DodgeballPanel,
  EperviersPanel,
  HotPotatoPanel,
  IcebergPanel,
  JurassicPanel,
  KnockbackPanel,
  LoupPanel,
  SpartacusPanel,
  ZombieSiegePanel,
} from "./wave61/Wave61SurvivalCombatPanels";
import {
  DisjonctePanel,
  DracoSpheresPanel,
  EscapeGamePanel,
  Heist180Panel,
  HollywoodPanel,
  JardinierPanel,
  MayaPanel,
  MicroscopiaPanel,
  MythologiePanel,
  ObjectifLunePanel,
  PetitBacPanel,
  PyramidesPanel,
} from "./wave61/Wave61MissionAdventurePanels";
import {
  AttilaPanel,
  BlackFlagPanel,
  ChevalTroiePanel,
  GalaxiesPanel,
  MenhirMayhemPanel,
  PoseidonPanel,
  SabaudiaDauphinePanel,
  VikingsPanel,
} from "./wave61/Wave61ConquestPanels";
import {
  EverestPanel,
  MontBlancPanel,
  Summit14Panel,
} from "./wave61/Wave61AscentPanels";
import {
  FinalBuzzerPanel,
  JackpotPanel,
  MafiaPanel,
} from "./wave61/Wave61PartyArcadePanels";
import {
  MistigriPanel,
  RadinPanel,
  CorbeauRenardPanel,
  DartsImpossiblePanel,
} from "./wave61/Wave61FablePartyPanels";
import Wave61EndSummary, { buildWave61EndRows, buildWave61MatchStats } from "./wave61/Wave61EndSummary";

function familyRules(spec: any, preset: any) {
  const signature: Record<string, string> = {
    align_4: "Chaque impact choisit une colonne 1–7. Les jetons tombent dans la grille 7×6 et le premier alignement de quatre gagne.",
    demineur: "Les secteurs 1–20 forment une grille 5×4. Les cases sûres donnent des indices voisins ; BULL scanne une case sûre et DBULL en scanne deux.",
    codebreaker: "Trois secteurs composent une tentative. L'application indique les valeurs exactes et les valeurs présentes mais déplacées. Trois exactes déverrouillent le code.",
    face_mystere: "Chaque secteur représente un suspect. Une mauvaise accusation révèle un nouvel indice et élimine automatiquement les suspects incompatibles.",
    colin_maillard: "Mémorise une séquence cachée de six secteurs. Utilise l'aperçu de 2 secondes avant de lancer puis reproduis la suite dans l'ordre.",
    replicat: "Le premier joueur crée la référence. Ensuite chaque volée doit copier la précédente : numéros en Facile, segments exacts en Normal, séquence parfaite en Difficile.",
    double_down: "Parcours 15 · 16 · DOUBLE · 17 · 18 · TRIPLE · 19 · 20 · BULL. Si aucun dart ne valide le contrat du round, le score est divisé par deux.",
    nine_dart_century: "Neuf fléchettes maximum pour viser 100. À la fin, 100 exact est parfait ; sinon le plus proche sans dépasser gagne. Si tous dépassent, le plus petit dépassement l’emporte.",
    shove_a_penny: "Complète trois marques sur 15, 16, 17, 18, 19, 20 et BULL. Les surplus au-delà de trois sont poussés vers l'adversaire suivant.",
    green_vs_red: "Trois formats : DUEL à 2, TEAM VERTE vs TEAM ROUGE à 4/6/8, ou MULTI aléatoire jusqu’à 10 joueurs. VERT suit 1·4·6·15·17·19·16·11·9·5·BULL ; ROUGE suit 20·12·14·8·7·3·2·10·13·18·BULL. Seuls DOUBLE/TRIPLE du secteur courant marquent, les D/T adverses pénalisent, et la finale BULL suit la variante choisie.",
    hi_score: "Nombre de rounds configurable : additionne simplement le score de toutes les volées. Le meilleur total à la fin gagne.",
    sniper: "Une série de contrats de précision s'enchaîne. Plus la difficulté monte, plus le lit exact S/D/T/BULL devient obligatoire.",
    luciole: "La cible s'illumine brièvement au début du tour puis disparaît. Mémorise le secteur et touche-le avant que la luciole suivante apparaisse.",
    golden_dart: "Une cible dorée secrète se cache parmi les 20 secteurs. Chaque erreur révèle un indice ; trouve-la pour gagner une marque d'or et passer à la suivante.",
    final_buzzer: "Huit défis sous pression. Le buzzer coupe la volée après 1, 2 ou 3 darts selon le tour ; réussir sur la dernière fléchette autorisée déclenche un bonus Clutch.",
    jackpot: "Chaque volée devient trois rouleaux de machine à sous. Les secteurs produisent des symboles, BULL agit comme WILD et trois SEVEN déclenchent le jackpot progressif.",
    mafia: "Alternance Nuit/Jour avec rôles cachés. La Mafia attaque la nuit, le Détective enquête, le Médecin protège ; le jour, les darts deviennent des votes d'élimination.",
    heist_180: "Quatre phases de casse : repérage, effraction, coffre, fuite. Les bons lits font avancer, les BULL réduisent la chaleur et une alarme à 100 % fait perdre une phase.",
    escape_game: "Cinq verrous à franchir dans l'ordre. Le secteur demandé ouvre le verrou courant ; BULL/DBULL servent de jokers et les erreurs ajoutent des pénalités.",
    objectif_lune: "Remplis le carburant, décolle, stabilise l'orbite puis alunis. Les BULL alimentent la fusée et sécurisent la trajectoire.",
    hollywood: "Tourne six scènes successives : casting, action, cascade, drame, première et Oscars. Multiplicateurs et BULL rapportent des étoiles.",
    calendrier_maya: "Active cinq sceaux avant que la jauge de fin du cycle n'atteigne 100 %. Les BULL stabilisent le calendrier.",
    pyramides: "Traverse cinq chambres jusqu'au sarcophage. La torche s'épuise sur les erreurs, les BULL la rechargent et l'obscurité peut faire reculer.",
    draco_spheres: "Retrouve sept orbes dans l'ordre. Les BULL et triples chargent l'énergie ; à 100 %, une sphère bonus est invoquée.",
    mythologie: "Affronte six épreuves divines. Les BULL augmentent la faveur des dieux et peuvent offrir une marque bonus.",
    jardinier: "Fais pousser puis récolte cinq cultures. Les bonnes cibles accélèrent la croissance, BULL arrose et les erreurs assèchent le jardin.",
    microscopia: "Isole six échantillons microscopiques tout en contrôlant la contamination. BULL désinfecte le laboratoire.",
    disjoncte: "Alimente six circuits sans faire sauter l'installation. Doubles/triples sont puissants mais font grimper la surcharge ; BULL met à la terre.",
    petit_bac: "Six catégories et une lettre liée au secteur. Touche la lettre demandée pour valider la catégorie ; BULL sert de joker. La saisie des mots sera ajoutée dans le Play dédié.",
    hot_potato: "La mèche descend à chaque tour. Touche le secteur demandé pour transmettre proprement la patate ; une mèche à zéro provoque une explosion et coûte une vie.",
    zombie_siege: "Un camp commence infecté. Les zombies propagent la contamination, les survivants renforcent leurs barricades et les BULL permettent de réduire l'infection.",
    le_loup: "Le loup doit toucher sa cible pour attraper un joueur et transmettre le rôle. Les fuyards progressent et peuvent obtenir une protection au BULL.",
    eperviers: "Les coureurs doivent traverser le terrain jusqu'à 100. Les Éperviers capturent les coureurs ; après plusieurs touches, un coureur rejoint le camp des Éperviers.",
    ballon_prisonnier: "Les impacts exacts attaquent un adversaire. À 0 PV il devient prisonnier ; BULL/DBULL permet de libérer un allié ou de renforcer l'esquive.",
    iceberg: "Sécurise cinq compartiments avant que l'eau et les impacts ne détruisent la coque. Les BULL activent les pompes et les bonnes zones réparent le navire.",
    jurassic_dart: "Progresse dans l'expédition tout en contrôlant la menace des dinosaures. Les BULL servent de tranquillisants ; une menace trop élevée déclenche une attaque.",
    apocalypse: "Collecte des ressources, consolide ton refuge et traverse les catastrophes. Les zones sûres font progresser le refuge et les BULL servent de medkits.",
    mistigri: "Le mauvais rôle circule entre les joueurs. Touche la cible du tour pour transmettre la pression, évite les pénalités et garde le Mistigri le moins longtemps possible.",
    radin: "Chaque impact doit rapporter sans trop exposer ton capital. Les bonnes zones sécurisent ton pactole tandis que les erreurs t'obligent à payer plus cher.",
    corbeau_renard: "Ruse, bluff et opportunisme : sécurise ton butin, fais tomber l'adversaire dans le piège et profite des ouvertures créées par les bons impacts.",
    darts_impossible: "Suite de contrats ultra-précis sous tension. Les erreurs déclenchent l'alarme ; les BULL sécurisent l'infiltration et les impacts exacts valident la mission.",
    knockback: "Pars de 0 et atteins exactement l'objectif. Si ton nouveau score égale celui d'un adversaire, il est renvoyé à 0. Un dépassement provoque un BUST.",
    spartacus: "Combats d'arène avec PV, armure, garde et gloire. Les bonnes fenêtres déclenchent les attaques, tandis que les BULL renforcent la garde.",
    cosmo_knights: "Les impacts sur la constellation chargent le Cosmos. À 100 %, un COSMO BURST frappe l'adversaire ; BULL charge aussi le bouclier.",
    vikings: "Conquiers des territoires nordiques. Les impacts sur le secteur actif créent de la pression, les fortifications adverses absorbent les attaques et la Fureur déclenche un Raid du Jarl.",
    black_flag: "Pars à la conquête d'un archipel pirate. Les îles peuvent changer de propriétaire, les fortifications protègent les positions et le Butin chargé à 100 % déclenche une Bordée.",
    menhir_mayhem: "Capture villages, carrières et camps. Les triples chargent davantage la Potion et une jauge pleine déclenche un Menhir géant pour accélérer la conquête.",
    attila: "La marche des Huns traverse sept territoires. Les volées parfaites renforcent la charge et la Terreur permet de lancer une offensive massive.",
    poseidon: "Domine récifs, ports, détroits et abysses. Les BULL renforcent la Marée et le Trident ajoute une poussée de conquête supplémentaire.",
    cheval_de_troie: "Construis le cheval, mène le siège, infiltre la cité puis prends la citadelle. Les erreurs font monter l'alerte ; BULL améliore la discrétion.",
    sabaudia_dauphine: "Conquête territoriale alpine entre Sabaudia et Dauphiné. Les positions peuvent être fortifiées et une Influence pleine renforce les territoires déjà contrôlés.",
    galaxies: "Colonise des systèmes stellaires. Doubles/triples accélèrent l'expansion, l'Énergie alimente l'Hyperdrive et les systèmes fortifiés résistent aux invasions.",
    mont_blanc: "Monte jusqu'à 4 809 m en franchissant refuge, glacier et arête. La météo réduit la progression, les erreurs augmentent la fatigue et les BULL ouvrent une fenêtre de récupération.",
    everest: "Expédition haute altitude jusqu'à 8 849 m avec camps successifs, oxygène, acclimatation, fatigue et météo. Un manque d'oxygène ou une fatigue extrême force le repli.",
    summit_14: "Enchaîne les quatorze sommets de plus de 8 000 m. Chaque sommet demande plusieurs marques, tandis que fatigue, oxygène et météo persistent sur toute la campagne.",
    tug_rush: "Deux camps tirent une corde virtuelle. Le secteur demandé donne de la traction, doubles/triples renforcent le tir et les BULL déclenchent les plus gros coups.",
    un_deux_trois_soleil: "Phase verte : touche le secteur demandé pour avancer. Phase SOLEIL : reste immobile avec MISS ou sécurise au BULL ; tout autre impact fait reculer.",
    chat_souris: "Le chat part en chasse tandis que les souris disposent d'avance. Le chat capture en rattrapant leur position ; une souris gagne si elle atteint le refuge.",
    maze_chase: "Suis le chemin du labyrinthe, collecte les couloirs dans l'ordre et utilise BULL comme power mode pour repousser le poursuivant.",
    chien_chat: "Deux pistes parallèles : chiens et chats progressent chacun vers l'arrivée avec leurs propres bonus. Secteur 5 = os, secteur 17 = poisson, BULL = raccourci.",
    roller_coaster: "Gère vitesse et progression sur cinq sections. Les bons secteurs accélèrent ; trop de vitesse dans un looping ou virage provoque une pénalité.",
    athletisme: "Meeting en six épreuves : Sprint, Haies, Longueur, Hauteur, Javelot et Relais. Chaque discipline transforme les darts en points spécifiques.",
    chute_libre: "Descends depuis 4000 m et ouvre le parachute au bon moment avec BULL/DBULL. Trop tôt ne sert à rien ; trop tard entraîne le crash.",
    tyrolien: "Franchis cinq sections de câble en maintenant ta vitesse. Les secteurs de checkpoint font progresser, BULL booste la glisse et le vent peut faire reculer.",
    saut_a_la_corde: "Enchaîne les secteurs dans le rythme. S/D/T valent 1/2/3 sauts, BULL donne un gros bonus et une erreur casse le combo.",
  };
  return <div style={{ display: "grid", gap: 9, fontSize: 12.5, lineHeight: 1.5 }}>
    <div><b style={{ color: preset.accent }}>CONCEPT</b><br />{spec.infoBody}</div>
    <div><b style={{ color: preset.accent }}>MOTEUR V{WAVE61_ENGINE_VERSION}</b><br />{signature[spec.id] || `Famille ${preset.label}. Scoring par dart, progression, historique, bots et Undo sont mutualisés.`}</div>
    <div><b style={{ color: "#ffcc80" }}>ARCHITECTURE</b><br />Chaque mode dispose maintenant de son fichier Play dédié et peut recevoir ses propres réglages sans casser les autres jeux.</div>
  </div>;
}

function Align4Board({ state, accent }: any) {
  const board = state?.special?.board;
  if (!Array.isArray(board)) return null;
  const tokenColors: Record<string, string> = {};
  let idx = 0;
  for (const row of board) for (const token of row) if (token && !tokenColors[token]) tokenColors[token] = idx++ % 2 ? "#ff5e78" : accent;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>ALIGN {state?.config?.modeOptions?.connectLength || 4} · GRILLE 7 × 6</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, maxWidth: 430, margin: "0 auto" }}>
      {board.flatMap((row: any[], r: number) => row.map((token: string | null, c: number) => <div key={`${r}-${c}`} style={{ aspectRatio: "1", borderRadius: 999, border: "1px solid rgba(255,255,255,.13)", background: token ? tokenColors[token] || accent : "rgba(255,255,255,.045)", boxShadow: token ? `0 0 12px ${tokenColors[token] || accent}66` : "inset 0 2px 8px rgba(0,0,0,.4)" }} />))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 5, color: SOFT, fontSize: 8.5, textAlign: "center" }}>{[1,2,3,4,5,6,7].map((n)=><span key={n}>COL {n}</span>)}</div>
  </div>;
}

function MineBoard({ state, accent }: any) {
  const revealed = new Set((state?.special?.revealed || []).map(Number));
  const exploded = new Set((state?.special?.exploded || []).map(Number));
  const mines = new Set((state?.special?.mines || []).map(Number));
  const finished = state?.phase === "finished";
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>DÉMINEUR · GRILLE 5 × 4</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{Math.max(0, 20 - revealed.size)} case(s) cachée(s)</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const shown = revealed.has(n) || finished;
        const mine = mines.has(n);
        const explodedMine = exploded.has(n);
        const around = shown && !mine ? wave61MineNeighborCount(state, n) : 0;
        return <div key={n} style={{ minHeight: 44, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${shown ? (mine ? "rgba(255,84,84,.55)" : accent + "55") : "rgba(255,255,255,.10)"}`, background: shown ? (mine ? "rgba(255,70,70,.12)" : `${accent}0d`) : "rgba(255,255,255,.035)", color: shown ? (mine ? "#ff8e8e" : "#fff") : "#7d8495", fontWeight: 1100, boxShadow: explodedMine ? "0 0 16px rgba(255,74,74,.26)" : "none" }}>
          {shown ? (mine ? (explodedMine ? "💥" : "💣") : <span>{around ? <b style={{ color: around >= 3 ? "#ff9d8a" : around === 2 ? "#ffd36a" : accent }}>{around}</b> : "·"}</span>) : "?"}
        </div>;
      })}
    </div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.2, lineHeight: 1.45 }}>Les chiffres indiquent le nombre de mines autour de la case. {Number(state?.config?.modeOptions?.scannerStrength ?? 1) <= 0 ? "Scanner BULL désactivé." : `BULL = scanner ${Number(state?.config?.modeOptions?.scannerStrength ?? 1)} case(s) sûre(s) · DBULL = ${Number(state?.config?.modeOptions?.scannerStrength ?? 1) + 1}.`}</div>
  </div>;
}

function CodebreakerPanel({ state, accent }: any) {
  const history = (state?.special?.codeHistory || []).slice(-6).reverse();
  const secret = state?.special?.secretCode || [];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>CODEBREAKER · CODE À {secret.length || state?.config?.modeOptions?.codeLength || 3} SECTEURS</div>
      <div style={{ color: SOFT, fontSize: 9 }}>{state?.phase === "finished" ? `CODE ${secret.join(" · ")}` : "CODE MASQUÉ"}</div>
    </div>
    <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
      {history.length ? history.map((h: any, i: number) => <div key={`${h.playerId}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 10, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", fontSize: 9.5 }}>
        <b style={{ color: "#fff" }}>{(h.guess || []).map((n: number) => n || "—").join(" · ")}</b>
        <span style={{ color: accent, fontWeight: 1000 }}>● {h.exact} exact</span>
        <span style={{ color: "#ffd36a", fontWeight: 1000 }}>◐ {h.present} déplacé</span>
      </div>) : <div style={{ color: SOFT, fontSize: 9.5 }}>Aucune tentative. Lance {secret.length || state?.config?.modeOptions?.codeLength || 3} fléchette(s) pour proposer le code.</div>}
    </div>
  </div>;
}

function FaceMysterePanel({ state, accent }: any) {
  const candidates = new Set((state?.special?.faceCandidates || []).map(Number));
  const clues = state?.special?.faceClues || [];
  const secret = Number(state?.special?.faceSecret || 0);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>FACE MYSTÈRE · SUSPECTS</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{candidates.size} encore possible(s)</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4 }}>
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const alive = candidates.has(n);
        const reveal = state?.phase === "finished" && n === secret;
        return <div key={n} style={{ minHeight: 34, borderRadius: 9, display: "grid", placeItems: "center", border: `1px solid ${reveal ? accent : alive ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.045)"}`, background: reveal ? `${accent}24` : alive ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.015)", color: reveal ? "#fff" : alive ? "#dce1ec" : "#4d5360", fontSize: 9.5, fontWeight: 1000, textDecoration: alive ? "none" : "line-through" }}>{n}</div>;
      })}
    </div>
    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
      {clues.slice(-4).map((c: any, i: number) => <div key={`${c.key}-${i}`} style={{ color: "#dce1ec", fontSize: 9.5 }}>🔎 {c.label}</div>)}
      {!clues.length ? <div style={{ color: SOFT, fontSize: 9.5 }}>Vise un suspect. Une erreur révélera un indice et réduira la liste.</div> : null}
    </div>
  </div>;
}

function ColinBoard({ state, accent, reveal, onReveal, previewMs = 2000 }: any) {
  const sequence = state?.special?.colinSequence || [];
  const player = state?.players?.[state?.activePlayerIndex];
  const step = Number(state?.special?.colinStepByPlayer?.[player?.id] || 0);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>COLIN-MAILLARD · MÉMOIRE</div><div style={{ color: SOFT, fontSize: 9, marginTop: 2 }}>Progression actuelle : {Math.min(step, sequence.length)}/{sequence.length}</div></div>
      <button type="button" onClick={onReveal} title="APERÇU 2s" style={actionStyle(accent, false)}>{`👁 APERÇU ${(Math.max(500, Number(previewMs || 2000)) / 1000).toFixed(1).replace(".0", "")}s`}</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, sequence.length)},1fr)`, gap: 5, marginTop: 8 }}>
      {sequence.map((n: number, i: number) => <div key={`${n}-${i}`} style={{ minHeight: 42, borderRadius: 10, display: "grid", placeItems: "center", border: `1px solid ${i < step ? accent + "77" : "rgba(255,255,255,.10)"}`, background: i < step ? `${accent}18` : "rgba(255,255,255,.03)", color: i < step ? accent : "#fff", fontWeight: 1100 }}>{reveal ? n : i < step ? "✓" : "?"}</div>)}
    </div>
  </div>;
}


function ReplicatPanel({ state, accent }: any) {
  const ref = state?.special?.lastVisitDarts || [];
  const level = state?.config?.difficulty || "normal";
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>REPLICAT · RÉFÉRENCE À COPIER</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 8 }}>
      {[0,1,2].map((i) => <div key={i} style={{ minHeight: 46, borderRadius: 11, display: "grid", placeItems: "center", border: `1px solid ${accent}44`, background: `${accent}0b`, color: "#fff", fontWeight: 1100 }}>{ref[i] ? wave61DartLabel(ref[i]) : "—"}</div>)}
    </div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.5 }}>{!ref.length ? "La première volée crée la référence sans marquer de copie." : level === "easy" ? "FACILE · même numéro, multiplicateur libre" : level === "hard" ? "DIFFICILE · les 3 darts doivent reproduire la séquence parfaite" : "NORMAL · segment et multiplicateur exacts"}</div>
  </div>;
}

function DoubleDownPanel({ state, accent, target }: any) {
  const seq = ["15", "16", "DOUBLE", "17", "18", "TRIPLE", "19", "20", "BULL"];
  const round = Math.min(seq.length - 1, Number(state?.roundIndex || 0));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ color: accent, fontSize: 10 }}>DOUBLE DOWN · CONTRATS</b><span style={{ color: SOFT, fontSize: 9 }}>{target?.label || seq[round]}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(9,1fr)", gap: 4, marginTop: 8 }}>{seq.map((x,i)=><div key={x+i} style={{ minHeight: 34, borderRadius: 8, display:"grid", placeItems:"center", border:`1px solid ${i===round?accent+"88":"rgba(255,255,255,.08)"}`, background:i<round?`${accent}14`:i===round?`${accent}20`:"rgba(255,255,255,.025)", color:i<=round?"#fff":"#697181", fontSize:8.5, fontWeight:1000 }}>{i<round?"✓":x}</div>)}</div>
    <div style={{ marginTop: 7, color: SOFT, fontSize: 9.3 }}>Aucun hit sur le contrat = score ÷ 2.</div>
  </div>;
}

function CenturyPanel({ state, accent }: any) {
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>9 DART CENTURY · OBJECTIF {state?.config?.goal || 100}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginTop: 8 }}>{state.players.map((p:any)=>{ const st=state.statsByPlayer?.[p.id]||{}; const score=Number(state.scores?.[p.id]||0); return <div key={p.id} style={{borderRadius:10,padding:"7px 8px",background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.08)"}}><div style={{fontSize:9,color:SOFT,fontWeight:900}}>{p.name}</div><div style={{fontSize:18,color:"#fff",fontWeight:1100}}>{score}<span style={{fontSize:9,color:SOFT}}> / {state.config.goal}</span></div><div style={{fontSize:8.5,color:score>state.config.goal?"#ff8d8d":accent}}>{Math.min(9,Number(st.darts||0))}/9 darts · {state.special?.centuryBustsByPlayer?.[p.id]||0} bust</div></div>})}</div>
  </div>;
}

function ShovePennyPanel({ state, accent }: any) {
  const targets = [15,16,17,18,19,20,25];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100, marginBottom: 7 }}>SHOVE A PENNY · 3 MARQUES PAR CASE</div>
    <div style={{ overflowX:"auto" }}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:4,fontSize:9}}><thead><tr><th style={{color:SOFT,textAlign:"left"}}>JOUEUR</th>{targets.map(n=><th key={n} style={{color:SOFT}}>{n===25?"BULL":n}</th>)}</tr></thead><tbody>{state.players.map((p:any)=>{ const marks=state.special?.shoveMarksByPlayer?.[p.id]||{}; return <tr key={p.id}><td style={{color:"#fff",fontWeight:1000,whiteSpace:"nowrap"}}>{p.name}</td>{targets.map(n=>{const m=Number(marks[String(n)]||0);return <td key={n} style={{textAlign:"center",minWidth:34,borderRadius:8,padding:"6px 4px",background:m>=3?`${accent}1c`:"rgba(255,255,255,.035)",border:`1px solid ${m>=3?accent+"66":"rgba(255,255,255,.08)"}`,color:m>=3?accent:"#fff",fontWeight:1100}}>{m}/3</td>})}</tr>})}</tbody></table></div>
  </div>;
}

const GVR_GREEN_PATH = [1, 4, 6, 15, 17, 19, 16, 11, 9, 5] as const;
const GVR_RED_PATH = [20, 12, 14, 8, 7, 3, 2, 10, 13, 18] as const;
const GVR_GREEN = "#44e58f";
const GVR_RED = "#ff5c69";


function greenRedSeriesSpec(stateOrConfig: any) {
  const cfg = stateOrConfig?.config || stateOrConfig || {};
  const raw = String(cfg?.modeOptions?.seriesFormat || "single").toLowerCase();
  if (raw === "single") return { raw, label: "1 MANCHE", winsTo: 1, enabled: false };
  const n = Math.max(1, Number(raw.replace(/\D/g, "")) || 1);
  if (raw.startsWith("bo")) return { raw, label: `BO ${n}`, winsTo: Math.floor(n / 2) + 1, enabled: n > 1 };
  if (raw.startsWith("ft")) return { raw, label: `FT ${n}`, winsTo: n, enabled: n > 1 };
  return { raw: "single", label: "1 MANCHE", winsTo: 1, enabled: false };
}

function greenRedToneFor(state: any, playerId: any) {
  const color = String(state?.special?.greenRedColorByPlayer?.[String(playerId)] || "GREEN");
  return color === "RED" ? GVR_RED : GVR_GREEN;
}

function GreenRedDuelScoreboard({ state, profiles }: any) {
  const series = greenRedSeriesSpec(state);
  if (!series.enabled || !state || state.players?.length !== 2 || String(state?.config?.modeOptions?.matchFormat || "duel") !== "duel") return null;
  const byId = new Map((profiles || []).map((p:any) => [String(p.id), p]));
  const [left, right] = state.players;
  const wins = state?.special?.greenRedMatchWins || {};
  const side = (p:any, align:"left"|"right") => {
    const id = String(p?.id || "");
    const profile:any = byId.get(id) || p;
    const tone = greenRedToneFor(state, id);
    const avatar = profile?.avatarDataUrl || profile?.avatarUrl || profile?.avatar || null;
    return <div style={{display:"flex",alignItems:"center",justifyContent:align==="left"?"flex-start":"flex-end",gap:6,minWidth:0}}>
      {align==="left" ? <div style={{width:24,height:24,borderRadius:999,overflow:"hidden",border:`1.5px solid ${tone}`,background:`${tone}18`,display:"grid",placeItems:"center",fontSize:9,fontWeight:1100}}>{avatar?<img src={avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:String(p?.name||"?").slice(0,1).toUpperCase()}</div> : null}
      <b style={{color:tone,fontSize:8.5,fontWeight:1100,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p?.name || "—"}</b>
      {align==="right" ? <div style={{width:24,height:24,borderRadius:999,overflow:"hidden",border:`1.5px solid ${tone}`,background:`${tone}18`,display:"grid",placeItems:"center",fontSize:9,fontWeight:1100}}>{avatar?<img src={avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:String(p?.name||"?").slice(0,1).toUpperCase()}</div> : null}
    </div>;
  };
  return <div data-green-red-series-scoreboard="1" data-green-red-duel-scoreboard="1" style={{height:34,flex:"0 0 34px",margin:"0 8px 4px",padding:"3px 8px",borderRadius:11,border:"1px solid rgba(255,255,255,.09)",background:"linear-gradient(180deg,rgba(13,17,25,.98),rgba(5,8,14,.99))",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",gap:8,alignItems:"center",boxShadow:"0 5px 16px rgba(0,0,0,.24)"}}>
    {side(left,"left")}
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:5,minWidth:82}}>
      <strong style={{color:"#fff",fontSize:16,lineHeight:1,fontWeight:1200}}>{Number(wins?.[String(left?.id)] || 0)}</strong>
      <span style={{color:"#7f8999",fontSize:7.2,fontWeight:1000,letterSpacing:.7}}>{series.label}</span>
      <strong style={{color:"#fff",fontSize:16,lineHeight:1,fontWeight:1200}}>{Number(wins?.[String(right?.id)] || 0)}</strong>
    </div>
    {side(right,"right")}
  </div>;
}

function GreenRedPanel({ state }: any) {
  const active = state?.players?.[state?.activePlayerIndex];
  const activeId = String(active?.id || "");
  const color = String(state?.special?.greenRedColorByPlayer?.[activeId] || "GREEN");
  const path = color === "GREEN" ? GVR_GREEN_PATH : GVR_RED_PATH;
  const tone = color === "RED" ? GVR_RED : GVR_GREEN;
  const step = Math.min(10, Number(state?.special?.greenRedStepByPlayer?.[activeId] || 0));
  const cells = [...path, "BULL"] as any[];

  return <section data-green-red-objective-rail="1" style={{...panelStyle(tone+"55"),padding:"8px 9px",background:`linear-gradient(145deg,${tone}0d,rgba(5,8,14,.98))`}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
      <div style={{color:tone,fontSize:8.8,fontWeight:1100,letterSpacing:.65}}>FRISE D'OBJECTIFS · {color}</div>
      <div style={{color:SOFT,fontSize:7.5,fontWeight:950}}>ÉTAPE {step+1}/11</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(11,minmax(0,1fr))",gap:3,marginTop:5}}>
      {cells.map((n:any,i:number)=><div key={`${n}-${i}`} style={{minHeight:31,borderRadius:7,display:"grid",placeItems:"center",background:i<step?`${tone}20`:i===step?`${tone}16`:"rgba(255,255,255,.022)",border:`1px solid ${i===step?tone+"cc":i<step?tone+"55":"rgba(255,255,255,.055)"}`,color:i<=step?"#fff":"#59616e",fontSize:i===10?6.7:8.4,fontWeight:1100,boxShadow:i===step?`0 0 13px ${tone}25`:"none"}}>{i<step?"✓":n}</div>)}
    </div>
  </section>;
}

function GreenVsRedInput({ state, activePlayer, currentThrow, setCurrentThrow, multiplier, setMultiplier, onValidate }: any) {
  const playerId = String(activePlayer?.id || "");
  const ownColor = String(state?.special?.greenRedColorByPlayer?.[playerId] || "GREEN") as "GREEN" | "RED";
  const step = Math.min(10, Number(state?.special?.greenRedStepByPlayer?.[playerId] || 0));
  const isBullStage = step >= 10;
  const ownPath = ownColor === "GREEN" ? GVR_GREEN_PATH : GVR_RED_PATH;
  const ownTone = ownColor === "GREEN" ? GVR_GREEN : GVR_RED;
  const targetNumber = !isBullStage ? Number(ownPath[step]) : null;
  const full = currentThrow.length >= 3;
  const multiplierReady = multiplier === 2 || multiplier === 3;
  const bullRule = String(state?.config?.modeOptions?.bullRule || "classic");
  const greenBullBonus = Number(state?.config?.modeOptions?.greenBullBonus || 0);
  const redBullBonus = Number(state?.config?.modeOptions?.redBullBonus || 0);
  const ownBullBed = ownColor === "GREEN" ? "OB" : "IB";

  React.useEffect(() => { setMultiplier(1); }, [playerId, ownColor, step]);

  const appendNumber = (n:number) => {
    if (full || !multiplierReady || isBullStage) return;
    setCurrentThrow((prev:UIDart[]) => prev.length >= 3 ? prev : [...prev, { v:n, mult:multiplier }]);
    setMultiplier(1);
  };
  const appendMiss = () => {
    if (full) return;
    setCurrentThrow((prev:UIDart[]) => prev.length >= 3 ? prev : [...prev, { v:0, mult:1 }]);
    setMultiplier(1);
  };
  const appendBull = (inner:boolean) => {
    if (full || !isBullStage) return;
    setCurrentThrow((prev:UIDart[]) => prev.length >= 3 ? prev : [...prev, { v:25, mult:inner ? 2 : 1 }]);
    setMultiplier(1);
  };
  const cancelLast = () => {
    if (multiplier !== 1) { setMultiplier(1); return; }
    setCurrentThrow((prev:UIDart[]) => prev.slice(0,-1));
  };
  const dartLabel = (d:any) => {
    if (!d) return "—";
    if (Number(d.v) === 0) return "MISS";
    if (Number(d.v) === 25) return Number(d.mult) === 2 ? "BULL 50" : "1/2 BULL 25";
    return `${Number(d.mult) === 3 ? "T" : Number(d.mult) === 2 ? "D" : "S"}${d.v}`;
  };
  const dartTone = (d:any) => {
    if (!d) return "#4d5665";
    if (Number(d.v) === 0) return "#ff5c69";
    if (Number(d.v) === 25) return Number(d.mult) === 2 ? "#ff4655" : "#3fd88a";
    if (Number(d.mult) === 3) return "#d85ed3";
    if (Number(d.mult) === 2) return "#4ebfe7";
    return ownTone;
  };
  const keyStyle = (tone:string, active=false, solid=false):React.CSSProperties => ({
    minHeight:40,borderRadius:12,border:`1px solid ${active?tone+"dd":tone+"66"}`,
    background:solid?`linear-gradient(180deg,${tone},${tone}cc)`:active?`linear-gradient(180deg,${tone}32,${tone}17)`:`linear-gradient(180deg,rgba(20,24,34,.98),rgba(7,10,16,.99))`,
    color:solid?"#111":"#fff",fontWeight:1100,fontSize:10.5,cursor:"pointer",boxShadow:active?`0 0 14px ${tone}30`:"none",touchAction:"manipulation"
  });

  return <div data-green-red-keypad="1" style={{...panelStyle(ownTone+"55"),height:"100%",minHeight:0,overflow:"hidden",padding:8,display:"flex",flexDirection:"column",gap:6,background:`linear-gradient(180deg,${ownTone}08,rgba(5,7,12,.995) 25%)`}}>
    <div data-green-red-visit-preview="1" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5}}>
      {Array.from({length:3},(_,i)=>currentThrow[i]).map((d:any,i:number)=>{const tone=dartTone(d);return <div key={i} style={{minHeight:32,borderRadius:10,border:`1px solid ${d?tone+"88":"rgba(255,255,255,.07)"}`,background:d?`${tone}16`:"rgba(255,255,255,.025)",display:"grid",placeItems:"center",color:d?tone:"#59616e",fontSize:9.5,fontWeight:1150,boxShadow:d?`inset 0 -2px 0 ${tone}55`:"none"}}>{dartLabel(d)}</div>})}
    </div>

    {!isBullStage ? <>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5}}>
        <button type="button" onClick={()=>setMultiplier(multiplier===2?1:2)} style={keyStyle("#4ebfe7",multiplier===2)}>DOUBLE</button>
        <button type="button" onClick={()=>setMultiplier(multiplier===3?1:3)} style={keyStyle("#d85ed3",multiplier===3)}>TRIPLE</button>
        <button type="button" onClick={appendMiss} disabled={full} style={{...keyStyle("#ff5c69",false),opacity:full?.45:1}}>MISS</button>
        <button type="button" onClick={cancelLast} disabled={!currentThrow.length&&multiplier===1} style={{...keyStyle("#f5b522",false,true),opacity:(!currentThrow.length&&multiplier===1)?.45:1}}>ANNULER</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:5,flex:"1 1 auto",minHeight:0}}>
        {ownPath.map((n:number)=>{
          const current=Number(n)===targetNumber;
          return <button key={n} type="button" disabled={!multiplierReady||full} onClick={()=>appendNumber(Number(n))} style={{minHeight:39,borderRadius:11,border:`1px solid ${current?ownTone:ownTone+"55"}`,background:current?`linear-gradient(180deg,${ownTone}38,${ownTone}19)`:`linear-gradient(180deg,${ownTone}10,rgba(7,10,16,.98))`,color:(!multiplierReady||full)?"#56606f":"#fff",fontSize:13,fontWeight:1150,cursor:(!multiplierReady||full)?"not-allowed":"pointer",boxShadow:current?`0 0 15px ${ownTone}34`:"none",position:"relative"}}>{n}{current?<span style={{position:"absolute",right:4,top:2,fontSize:5.8,color:ownTone}}>CIBLE</span>:null}</button>
        })}
      </div>
    </> : <>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
        <button type="button" onClick={appendMiss} disabled={full} style={{...keyStyle("#ff5c69",false),opacity:full?.45:1}}>MISS</button>
        <button type="button" onClick={cancelLast} disabled={!currentThrow.length} style={{...keyStyle("#f5b522",false,true),opacity:!currentThrow.length?.45:1}}>ANNULER</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:bullRule==="color_lock"?"1fr":"1fr 1fr",gap:7,flex:"1 1 auto",minHeight:0}}>
        {bullRule!=="color_lock"||ownBullBed==="OB"?<button type="button" onClick={()=>appendBull(false)} disabled={full} style={{...keyStyle("#3fd88a",false),minHeight:68,fontSize:13}}>1/2 BULL<div style={{fontSize:8.2,marginTop:2,color:"#63efaa"}}>25{bullRule==="color_bonus"&&ownColor==="GREEN"&&greenBullBonus?` +${greenBullBonus}`:""}</div></button>:null}
        {bullRule!=="color_lock"||ownBullBed==="IB"?<button type="button" onClick={()=>appendBull(true)} disabled={full} style={{...keyStyle("#ff4655",false),minHeight:68,fontSize:13}}>BULL<div style={{fontSize:8.2,marginTop:2,color:"#ff7c86"}}>50{bullRule==="color_bonus"&&ownColor==="RED"&&redBullBonus?` +${redBullBonus}`:""}</div></button>:null}
      </div>
    </>}
    <button type="button" onClick={onValidate} disabled={!currentThrow.length} style={{minHeight:42,borderRadius:13,border:`1px solid ${currentThrow.length?ownTone+"aa":"rgba(255,255,255,.08)"}`,background:currentThrow.length?`linear-gradient(180deg,${ownTone}34,${ownTone}18)`:"rgba(255,255,255,.03)",color:currentThrow.length?"#fff":"#59616e",fontWeight:1150,fontSize:10.8,letterSpacing:.45,cursor:currentThrow.length?"pointer":"not-allowed"}}>VALIDER LA VOLÉE</button>
  </div>;
}

function HiScorePanel({ state, accent }: any) {
  const rows = state.players.map((p:any) => {
    const visits = (state.visits || []).filter((v:any) => String(v.playerId) === String(p.id));
    const visitScores = visits.map((v:any) => Number(v.scoreDelta ?? v.score ?? 0));
    const best = visitScores.length ? Math.max(...visitScores) : 0;
    const total = Number(state.scores?.[p.id] || 0);
    const avg = visits.length ? Math.round((total / visits.length) * 10) / 10 : 0;
    return { p, total, best, avg, count: visits.length };
  }).sort((a:any,b:any)=>b.total-a.total);
  const leader = rows[0]?.total || 0;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>HI SCORE · CLASSEMENT LIVE</div>
    <div style={{ display:"grid", gap:6, marginTop:8 }}>
      {rows.map((row:any, i:number) => <div key={row.p.id} style={{ display:"grid", gridTemplateColumns:"24px minmax(0,1fr) auto", gap:8, alignItems:"center", borderRadius:10, padding:"7px 8px", background:i===0?`${accent}12`:"rgba(255,255,255,.028)", border:`1px solid ${i===0?accent+"55":"rgba(255,255,255,.07)"}` }}>
        <div style={{ color:i===0?accent:SOFT, fontSize:11, fontWeight:1100 }}>#{i+1}</div>
        <div style={{ minWidth:0 }}><div style={{ color:"#fff", fontSize:10, fontWeight:1000, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{row.p.name}</div><div style={{ marginTop:2, color:SOFT, fontSize:8.2 }}>AVG/volée {row.avg} · BEST {row.best} · {row.count} volée{row.count>1?"s":""}</div></div>
        <div style={{ textAlign:"right" }}><div style={{ color:i===0?accent:"#fff", fontSize:19, fontWeight:1150, lineHeight:1 }}>{row.total}</div><div style={{ marginTop:2, color:SOFT, fontSize:7.8 }}>{i===0?"LEADER":`-${Math.max(0,leader-row.total)}`}</div></div>
      </div>)}
    </div>
  </div>;
}

function SniperPanel({ state, accent }: any) {
  const p=state.players[state.activePlayerIndex]; const contracts=state.special?.sniperContracts||[]; const step=Number(state.special?.sniperStepByPlayer?.[p?.id]||0);
  const label=(c:any)=>!c?"—":c.bed==="IB"?"DBULL":c.bed==="OB"?"BULL":`${c.bed}${c.number||""}`;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>SNIPER · CONTRATS</b><span style={{color:SOFT,fontSize:9}}>MISSION {Math.min(step+1,contracts.length)}/{Math.min(contracts.length,state.config.goal||contracts.length)}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,marginTop:8}}>{contracts.slice(0,Math.min(12,state.config.goal||12)).map((c:any,i:number)=><div key={i} style={{minHeight:38,borderRadius:8,display:"grid",placeItems:"center",background:i<step?`${accent}14`:i===step?`${accent}25`:"rgba(255,255,255,.025)",border:`1px solid ${i===step?accent+"88":"rgba(255,255,255,.07)"}`,color:i<=step?"#fff":"#667080",fontSize:9,fontWeight:1100}}>{i<step?"✓":label(c)}</div>)}</div></div>;
}

function LuciolePanel({ state, accent, reveal }: any) {
  const p=state.players[state.activePlayerIndex]; const step=Number(state.special?.lucioleStepByPlayer?.[p?.id]||0); const target=wave61LucioleTarget(state,p?.id);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, textAlign:"center" }}><div style={{color:accent,fontSize:10,fontWeight:1100}}>LUCIOLE · FLASH MÉMOIRE</div><div style={{marginTop:8,minHeight:72,borderRadius:16,display:"grid",placeItems:"center",border:`1px solid ${reveal?accent+"aa":"rgba(255,255,255,.08)"}`,background:reveal?`radial-gradient(circle,${accent}33,${accent}09 52%,transparent 70%)`:"rgba(255,255,255,.025)",boxShadow:reveal?`0 0 28px ${accent}44`:"none",fontSize:reveal?34:28,fontWeight:1200,color:reveal?"#fff":"#4c5360"}}>{reveal?target:"✦"}</div><div style={{marginTop:6,color:SOFT,fontSize:9.3}}>La luciole s'affiche 1,6 s au changement de tour · progression {step}/{state.config.goal}</div></div>;
}

function GoldenDartPanel({ state, accent }: any) {
  const clues=state.special?.goldenClues||[]; const target=wave61GoldenTarget(state);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>GOLDEN DART · CIBLE SECRÈTE</b><span style={{color:SOFT,fontSize:9}}>{state.special?.goldenIndex||0}+ trouvée(s)</span></div><div style={{minHeight:54,marginTop:8,borderRadius:13,border:`1px solid ${accent}55`,background:`linear-gradient(135deg,${accent}15,rgba(255,255,255,.02))`,display:"grid",placeItems:"center",color:accent,fontSize:20,fontWeight:1200}}>🌟 {state.phase==="finished"?`SECTEUR ${target}`:"???"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>{clues.length?clues.slice(-4).map((c:any,i:number)=><span key={i} style={{borderRadius:999,padding:"5px 8px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#e7ebf4",fontSize:8.8,fontWeight:900}}>🔎 {c.label}</span>):<span style={{color:SOFT,fontSize:9.2}}>Aucun indice : tente un secteur de 1 à 20.</span>}</div></div>;
}


export default function Wave61SharedPlay(props: any) {
  const { w: viewportW, h: viewportH, isLandscapeTablet } = useViewport();
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const rawModeId = String(props?.forcedModeId || props?.params?.gameId || props?.gameId || resumeRecord?.modeId || resumeRecord?.game?.modeId || "");
  const modeId = rawModeId === "galaxyes" ? "galaxies" : rawModeId;
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const classicFiveMode = ["double_down", "nine_dart_century", "shove_a_penny", "green_vs_red", "hi_score"].includes(spec.id);
  useFullscreenPlay({ enabled: true, lockBodyScroll: classicFiveMode });
  const preset = getWave61Preset(spec.id);
  const rawConfig = props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {};
  const config = React.useMemo(() => normalizeWave61Config(spec.id, rawConfig), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i+1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null;
  const [state, setState] = React.useState<Wave61State>(() => restored?.mode === "wave61" && restored?.modeId === spec.id ? cloneWave61State(restored) : createWave61State(players, spec.id, config));
  const restoredThrow = resumeRecord?.resume?.currentThrow || resumeRecord?.payload?.currentThrow || [];
  const restoredMultiplier = Number(resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier ?? 1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(restoredThrow) ? restoredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => restoredMultiplier === 2 || restoredMultiplier === 3 ? restoredMultiplier : 1);
  const [undo, setUndo] = React.useState<Wave61State[]>([]);
  const [notice, setNotice] = React.useState("");
  const [adviceText, setAdviceText] = React.useState("");
  const [quickPanel, setQuickPanel] = React.useState<null | "rules" | "settings" | "players" | "history" | "ranking" | "stats" | "objective">(null);
  const adviceTimerRef = React.useRef<number | null>(null);
  const adviceSpeechTimerRef = React.useRef<number | null>(null);
  const lastAdviceKeyRef = React.useRef("");
  const lastVoiceAtRef = React.useRef(0);
  const [memoryReveal, setMemoryReveal] = React.useState(false);
  const memoryTimerRef = React.useRef<number | null>(null);
  const [lucioleReveal, setLucioleReveal] = React.useState(spec.id === "luciole");
  const lucioleTimerRef = React.useRef<number | null>(null);
  const botBusy = React.useRef(false);
  const finishedRef = React.useRef(false);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const target = getWave61Target(state);
  const accent = preset.accent;
  const modeTicker = React.useMemo(() => getTicker(spec.id), [spec.id]);
  const dedicatedPlayHint = String(props?.dedicatedPlayHint || "");
  const targetAdviceEnabled = config?.targetAdviceEnabled !== false;
  const awenaCommentaryEnabled = config?.awenaCommentaryEnabled !== false;
  const wave61SfxEnabled = config?.wave61SfxEnabled !== false;

  const buildRecord = React.useCallback((s: Wave61State, status: "in_progress" | "finished") => {
    const rankings = buildWave61EndRows(s, profiles);
    const matchStats = buildWave61MatchStats(s);
    const winnerIds = rankings.filter((row: any) => row.winner).map((row: any) => row.id);
    const playerStats = Object.fromEntries(rankings.map((row: any) => [row.id, {
      id: row.id,
      name: row.name,
      rank: row.rank,
      isWinner: row.winner,
      team: row.team,
      score: row.score,
      progress: row.progress,
      health: row.health,
      lives: row.lives,
      darts: row.darts,
      visits: row.visits,
      hits: row.hits,
      misses: row.misses,
      bulls: row.bulls,
      doubles: row.doubles,
      triples: row.triples,
      bestVisit: row.bestVisit,
      bestCombo: row.bestCombo,
      damage: row.damage,
      damageTaken: row.damageTaken,
      safeReveals: row.safeReveals,
      accuracy: row.accuracy,
    }]));
    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      resumeId: matchIdRef.current,
      kind: spec.id,
      mode: spec.id,
      modeId: spec.id,
      sport: "darts",
      status,
      createdAt: s.startedAt,
      updatedAt: Date.now(),
      finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined,
      winnerId: s.winnerId,
      winnerIds,
      winnerTeamId: s.winnerTeamId,
      players: s.players.map((player: any, index: number) => {
        const profile: any = profileById.get(String(player.id)) || player;
        return {
          id: String(player.id),
          name: playerName(profile, index) || String(player.name || `Joueur ${index + 1}`),
          avatarDataUrl: profile?.avatarDataUrl ?? null,
        };
      }),
      game: { mode: spec.id, modeId: spec.id, engineFamily: s.family, engineVersion: WAVE61_ENGINE_VERSION, resumeRoute: "wave61_play" },
      summary: { mode: spec.id, modeId: spec.id, family: s.family, winnerId: s.winnerId, winnerIds, winnerTeamId: s.winnerTeamId, finalScores: s.scores, finalProgress: s.progress, health: s.health, lives: s.lives, rankings, playerStats, statsByPlayer: s.statsByPlayer, matchStats, config: s.config },
      resume: { mode: "wave61", modeId: spec.id, config: s.config, state: cloneWave61State(s), route: "wave61_play", currentThrow: currentThrow.slice(0, 3), multiplier, updatedAt: Date.now() },
      payload: { kind: spec.id, mode: spec.id, modeId: spec.id, sport: "darts", winnerId: s.winnerId, winnerIds, winnerTeamId: s.winnerTeamId, config: s.config, stateSnapshot: cloneWave61State(s), currentThrow: currentThrow.slice(0, 3), multiplier, visits: s.visits, stats: { players: playerStats, match: matchStats } },
    };
  }, [profiles, profileById, spec.id, currentThrow, multiplier]);

  const persist = React.useCallback((s: Wave61State) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      void History.upsert(buildRecord(s, "finished")).catch(() => {});
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord]);

  const commit = React.useCallback((next: Wave61State, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneWave61State(previous)]);

    let committed = next;
    let seriesNotice = "";
    if (spec.id === "green_vs_red" && next.phase === "finished") {
      const series = greenRedSeriesSpec(config);
      if (series.enabled) {
        const winnerKey = String(next.winnerTeamId ? `team:${next.winnerTeamId}` : (next.winnerId || ""));
        const previousWins = { ...(previous.special?.greenRedMatchWins || {}) };
        if (winnerKey) previousWins[winnerKey] = Number(previousWins[winnerKey] || 0) + 1;
        const matchWon = winnerKey && Number(previousWins[winnerKey] || 0) >= series.winsTo;

        if (!matchWon) {
          const fresh = createWave61State(players, spec.id, config);
          fresh.startedAt = previous.startedAt;
          fresh.visits = [...(next.visits || [])];
          fresh.statsByPlayer = JSON.parse(JSON.stringify(next.statsByPlayer || {}));
          fresh.special = {
            ...(fresh.special || {}),
            greenRedMatchWins: previousWins,
            greenRedGameIndex: Number(previous.special?.greenRedGameIndex || 1) + 1,
          };
          committed = fresh;
          finishedRef.current = false;
          seriesNotice = `🏁 Manche gagnée · ${series.label} : ${Math.max(...Object.values(previousWins).map((v:any)=>Number(v)||0),0)}/${series.winsTo}`;
        } else {
          committed = cloneWave61State(next);
          committed.special = {
            ...(committed.special || {}),
            greenRedMatchWins: previousWins,
            greenRedGameIndex: Number(previous.special?.greenRedGameIndex || 1),
          };
        }
      }
    }

    setState(committed);
    setCurrentThrow([]);
    setMultiplier(1);
    const last = next.visits[next.visits.length - 1];
    setNotice(seriesNotice || (committed.phase === "finished" ? `🏆 ${next.players.find((p) => p.id === next.winnerId)?.name || "Victoire"} remporte ${spec.label}` : (last?.events || []).join(" · ")));
    playWave61FeedbackTone(wave61ToneForVisit(next, last), wave61SfxEnabled);
    if (awenaCommentaryEnabled) {
      const comment = buildWave61VisitComment(next, last);
      if (comment && awena?.say) {
        lastVoiceAtRef.current = Date.now();
        void awena.say(comment).catch(() => undefined);
      }
    }
    persist(committed);
  }, [state, spec.id, spec.label, config, players, persist, wave61SfxEnabled, awenaCommentaryEnabled, awena]);

  const validate = () => {
    if (!currentThrow.length || state.phase === "finished" || activeIsBot) return;
    commit(playWave61Visit(state, currentThrow.map(uiToGameDart)));
  };

  const doUndo = () => setUndo((u) => {
    if (!u.length) return u;
    const prev = u[u.length - 1];
    finishedRef.current = false;
    setState(cloneWave61State(prev));
    setCurrentThrow([]);
    setMultiplier(1);
    setNotice("Dernière volée annulée");
    persist(prev);
    return u.slice(0, -1);
  });

  React.useEffect(() => {
    if (!activeIsBot || state.phase === "finished" || botBusy.current) return;
    botBusy.current = true;
    const timer = window.setTimeout(() => {
      try { commit(playWave61Visit(state, pickWave61BotDarts(state, config.botLevel))); }
      finally { botBusy.current = false; }
    }, 620);
    return () => window.clearTimeout(timer);
  }, [state, activeIsBot, activePlayer?.id]);

  React.useEffect(() => { if (state.phase === "playing") persist(state); }, []);

  // Reprise Wave61 exacte : même les fléchettes déjà saisies mais pas encore validées
  // sont enregistrées. Toutes les pages Wave61 profitent de ce garde-fou.
  React.useEffect(() => {
    if (state.phase !== "playing") return;
    const timer = window.setTimeout(() => persist(state), 120);
    return () => window.clearTimeout(timer);
  }, [currentThrow, multiplier]);

  React.useEffect(() => {
    setMemoryReveal(false);
    if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current);
    return () => { if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current); };
  }, [activePlayer?.id, state.roundIndex]);

  React.useEffect(() => {
    if (adviceTimerRef.current) window.clearTimeout(adviceTimerRef.current);
    if (adviceSpeechTimerRef.current) window.clearTimeout(adviceSpeechTimerRef.current);
    if (!targetAdviceEnabled || state.phase !== "playing" || activeIsBot) {
      setAdviceText("");
      return;
    }
    const adviceKey = `${spec.id}:${state.turnIndex}:${state.roundIndex}:${activePlayer?.id || ""}`;
    if (lastAdviceKeyRef.current === adviceKey) return;
    lastAdviceKeyRef.current = adviceKey;
    const advice = buildWave61Advice(state);
    if (!advice) return;
    setAdviceText(advice);
    playWave61FeedbackTone("turn", wave61SfxEnabled);
    adviceTimerRef.current = window.setTimeout(() => setAdviceText(""), 3000);
    if (awenaCommentaryEnabled && awena?.say) {
      const elapsed = Date.now() - lastVoiceAtRef.current;
      const delay = Math.max(220, 1650 - Math.max(0, elapsed));
      adviceSpeechTimerRef.current = window.setTimeout(() => {
        lastVoiceAtRef.current = Date.now();
        void awena.say(advice).catch(() => undefined);
      }, delay);
    }
    return () => {
      if (adviceTimerRef.current) window.clearTimeout(adviceTimerRef.current);
      if (adviceSpeechTimerRef.current) window.clearTimeout(adviceSpeechTimerRef.current);
    };
  }, [spec.id, state.turnIndex, state.roundIndex, state.phase, activePlayer?.id, activeIsBot, targetAdviceEnabled, awenaCommentaryEnabled, wave61SfxEnabled]);

  React.useEffect(() => {
    return () => {
      if (adviceTimerRef.current) window.clearTimeout(adviceTimerRef.current);
      if (adviceSpeechTimerRef.current) window.clearTimeout(adviceSpeechTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (spec.id !== "luciole" || state.phase !== "playing") return;
    setLucioleReveal(true);
    if (lucioleTimerRef.current) window.clearTimeout(lucioleTimerRef.current);
    const revealMs = Math.max(500, Number(config?.modeOptions?.revealMs || 1600));
    lucioleTimerRef.current = window.setTimeout(() => setLucioleReveal(false), revealMs);
    return () => { if (lucioleTimerRef.current) window.clearTimeout(lucioleTimerRef.current); };
  }, [spec.id, activePlayer?.id, state.turnIndex, state.phase]);

  function revealMemory() {
    setMemoryReveal(true);
    if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current);
    const previewMs = Math.max(500, Number(config?.modeOptions?.previewMs || 2000));
    memoryTimerRef.current = window.setTimeout(() => setMemoryReveal(false), previewMs);
  }

  function replay() {
    matchIdRef.current = `wave61-${spec.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    finishedRef.current = false;
    setUndo([]);
    setNotice("");
    setAdviceText("");
    lastAdviceKeyRef.current = "";
    setCurrentThrow([]);
    setMultiplier(1);
    setState(createWave61State(players, spec.id, config));
  }

  const roundLabel = Math.min(config.rounds, state.roundIndex + 1);
  const teamMode = config.participantMode === "teams";

  const renderModeSpecificPanel = () => <>
    {spec.id === "align_4" ? <Align4Board state={state} accent={accent} /> : null}
    {spec.id === "demineur" ? <MineBoard state={state} accent={accent} /> : null}
    {spec.id === "codebreaker" ? <CodebreakerPanel state={state} accent={accent} /> : null}
    {spec.id === "face_mystere" ? <FaceMysterePanel state={state} accent={accent} /> : null}
    {spec.id === "colin_maillard" ? <ColinBoard state={state} accent={accent} reveal={memoryReveal} onReveal={revealMemory} previewMs={config?.modeOptions?.previewMs || 2000} /> : null}
    {spec.id === "replicat" ? <ReplicatPanel state={state} accent={accent} /> : null}
    {spec.id === "double_down" ? <DoubleDownPanel state={state} accent={accent} target={target} /> : null}
    {spec.id === "nine_dart_century" ? <CenturyPanel state={state} accent={accent} /> : null}
    {spec.id === "shove_a_penny" ? <ShovePennyPanel state={state} accent={accent} /> : null}
    {spec.id === "green_vs_red" ? <GreenRedPanel state={state} /> : null}
    {spec.id === "hi_score" ? <HiScorePanel state={state} accent={accent} /> : null}
    {spec.id === "sniper" ? <SniperPanel state={state} accent={accent} /> : null}
    {spec.id === "luciole" ? <LuciolePanel state={state} accent={accent} reveal={lucioleReveal} /> : null}
    {spec.id === "golden_dart" ? <GoldenDartPanel state={state} accent={accent} /> : null}
    {spec.id === "final_buzzer" ? <FinalBuzzerPanel state={state} accent={accent} /> : null}
    {spec.id === "jackpot" ? <JackpotPanel state={state} accent={accent} /> : null}
    {spec.id === "mafia" ? <MafiaPanel state={state} accent={accent} /> : null}
    {spec.id === "tug_rush" ? <TugRushPanel state={state} accent={accent} /> : null}
    {spec.id === "un_deux_trois_soleil" ? <SoleilPanel state={state} accent={accent} /> : null}
    {spec.id === "chat_souris" ? <ChatSourisPanel state={state} accent={accent} /> : null}
    {spec.id === "maze_chase" ? <MazeChasePanel state={state} accent={accent} /> : null}
    {spec.id === "chien_chat" ? <ChienChatPanel state={state} accent={accent} /> : null}
    {spec.id === "roller_coaster" ? <RollerCoasterPanel state={state} accent={accent} /> : null}
    {spec.id === "athletisme" ? <AthleticsPanel state={state} accent={accent} /> : null}
    {spec.id === "chute_libre" ? <FreefallPanel state={state} accent={accent} /> : null}
    {spec.id === "tyrolien" ? <TyrolienPanel state={state} accent={accent} /> : null}
    {spec.id === "saut_a_la_corde" ? <JumpRopePanel state={state} accent={accent} /> : null}
    {spec.id === "heist_180" ? <Heist180Panel state={state} accent={accent} /> : null}
    {spec.id === "escape_game" ? <EscapeGamePanel state={state} accent={accent} /> : null}
    {spec.id === "objectif_lune" ? <ObjectifLunePanel state={state} accent={accent} /> : null}
    {spec.id === "hollywood" ? <HollywoodPanel state={state} accent={accent} /> : null}
    {spec.id === "calendrier_maya" ? <MayaPanel state={state} accent={accent} /> : null}
    {spec.id === "pyramides" ? <PyramidesPanel state={state} accent={accent} /> : null}
    {spec.id === "draco_spheres" ? <DracoSpheresPanel state={state} accent={accent} /> : null}
    {spec.id === "mythologie" ? <MythologiePanel state={state} accent={accent} /> : null}
    {spec.id === "jardinier" ? <JardinierPanel state={state} accent={accent} /> : null}
    {spec.id === "microscopia" ? <MicroscopiaPanel state={state} accent={accent} /> : null}
    {spec.id === "disjoncte" ? <DisjonctePanel state={state} accent={accent} /> : null}
    {spec.id === "petit_bac" ? <PetitBacPanel state={state} accent={accent} /> : null}
    {spec.id === "hot_potato" ? <HotPotatoPanel state={state} accent={accent} /> : null}
    {spec.id === "zombie_siege" ? <ZombieSiegePanel state={state} accent={accent} /> : null}
    {spec.id === "le_loup" ? <LoupPanel state={state} accent={accent} /> : null}
    {spec.id === "eperviers" ? <EperviersPanel state={state} accent={accent} /> : null}
    {spec.id === "ballon_prisonnier" ? <DodgeballPanel state={state} accent={accent} /> : null}
    {spec.id === "iceberg" ? <IcebergPanel state={state} accent={accent} /> : null}
    {spec.id === "jurassic_dart" ? <JurassicPanel state={state} accent={accent} /> : null}
    {spec.id === "apocalypse" ? <ApocalypsePanel state={state} accent={accent} /> : null}
    {spec.id === "mistigri" ? <MistigriPanel state={state} accent={accent} /> : null}
    {spec.id === "radin" ? <RadinPanel state={state} accent={accent} /> : null}
    {spec.id === "corbeau_renard" ? <CorbeauRenardPanel state={state} accent={accent} /> : null}
    {spec.id === "darts_impossible" ? <DartsImpossiblePanel state={state} accent={accent} /> : null}
    {spec.id === "knockback" ? <KnockbackPanel state={state} accent={accent} /> : null}
    {spec.id === "spartacus" ? <SpartacusPanel state={state} accent={accent} /> : null}
    {spec.id === "cosmo_knights" ? <CosmoKnightsPanel state={state} accent={accent} /> : null}
    {spec.id === "vikings" ? <VikingsPanel state={state} accent={accent} /> : null}
    {spec.id === "black_flag" ? <BlackFlagPanel state={state} accent={accent} /> : null}
    {spec.id === "menhir_mayhem" ? <MenhirMayhemPanel state={state} accent={accent} /> : null}
    {spec.id === "attila" ? <AttilaPanel state={state} accent={accent} /> : null}
    {spec.id === "poseidon" ? <PoseidonPanel state={state} accent={accent} /> : null}
    {spec.id === "cheval_de_troie" ? <ChevalTroiePanel state={state} accent={accent} /> : null}
    {spec.id === "sabaudia_dauphine" ? <SabaudiaDauphinePanel state={state} accent={accent} /> : null}
    {spec.id === "galaxies" ? <GalaxiesPanel state={state} accent={accent} /> : null}
    {spec.id === "mont_blanc" ? <MontBlancPanel state={state} accent={accent} /> : null}
    {spec.id === "everest" ? <EverestPanel state={state} accent={accent} /> : null}
    {spec.id === "summit_14" ? <Summit14Panel state={state} accent={accent} /> : null}
  </>;


  const isClassicFive = classicFiveMode;

  const classicObjective = (() => {
    if (spec.id === "double_down") return target?.label || "Contrat du round";
    if (spec.id === "nine_dart_century") return "100 en 9 fléchettes";
    if (spec.id === "shove_a_penny") return target?.label || "Fermer la case courante";
    if (spec.id === "green_vs_red") return target?.label || "D/T du numéro courant · finale BULL";
    if (spec.id === "hi_score") return "Faire le plus gros score";
    return target?.label || "Objectif";
  })();

  const classicInputHeight = spec.id === "green_vs_red"
    ? "clamp(292px,43dvh,340px)"
    : viewportH > 0 && viewportH < 700
      ? "clamp(265px,39dvh,315px)"
      : "clamp(290px,41dvh,355px)";

  const renderClassicQuickModal = () => {
    if (!quickPanel) return null;
    const titles: Record<string,string> = {
      rules: "RÈGLES DU MODE",
      settings: "RÉGLAGES DE LA PARTIE",
      players: "LISTE DES JOUEURS",
      history: "LOGS · ACTIONS",
      ranking: "CLASSEMENT LIVE",
      stats: "STATISTIQUES DE LA PARTIE",
      objective: "OBJECTIFS DÉTAILLÉS",
    };
    const optionRows = Object.entries(config?.modeOptions || {});
    return <div
      role="dialog"
      aria-modal="true"
      aria-label={titles[quickPanel] || "Informations"}
      onClick={() => setQuickPanel(null)}
      style={{ position:"fixed", inset:0, zIndex:1200, background:"rgba(0,0,0,.76)", backdropFilter:"blur(8px)", display:"grid", placeItems:"center", padding:14 }}
    >
      <div onClick={(e)=>e.stopPropagation()} style={{ width:"min(560px,96vw)", maxHeight:"78dvh", overflow:"auto", borderRadius:20, border:`1px solid ${accent}66`, background:"linear-gradient(155deg,rgba(14,18,29,.99),rgba(5,7,13,.99))", boxShadow:`0 22px 70px rgba(0,0,0,.7),0 0 34px ${accent}20`, padding:13 }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 38px", gap:8, alignItems:"center" }}>
          <div><div style={{ color:accent, fontSize:9, fontWeight:1100, letterSpacing:1.05 }}>{titles[quickPanel]}</div><div style={{ marginTop:2, color:"#fff", fontSize:16, fontWeight:1100 }}>{spec.label}</div></div>
          <button type="button" onClick={()=>setQuickPanel(null)} aria-label="Fermer" style={{ width:38, height:38, borderRadius:12, border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.04)", color:"#fff", fontSize:18, cursor:"pointer" }}>×</button>
        </div>

        {quickPanel === "rules" ? <div style={{ marginTop:12, display:"grid", gap:9 }}>
          <div style={{ ...panelStyle(accent+"44"), padding:11, color:"#e9edf7", fontSize:11.5, lineHeight:1.55 }}>{familyRules(spec,preset)}</div>
          {dedicatedPlayHint ? <div style={{ ...panelStyle("rgba(255,255,255,.09)"), padding:10, color:SOFT, fontSize:10.5, lineHeight:1.45 }}>{dedicatedPlayHint}</div> : null}
        </div> : null}

        {quickPanel === "settings" ? <div style={{ marginTop:12, display:"grid", gap:6 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:6 }}>
            <div style={{ ...panelStyle(accent+"35"), padding:8, textAlign:"center" }}><div style={{ color:accent, fontSize:15, fontWeight:1150 }}>{config.rounds}</div><div style={{ color:SOFT, fontSize:7.5, fontWeight:950 }}>ROUNDS</div></div>
            <div style={{ ...panelStyle(accent+"35"), padding:8, textAlign:"center" }}><div style={{ color:accent, fontSize:15, fontWeight:1150 }}>{state.players.length}</div><div style={{ color:SOFT, fontSize:7.5, fontWeight:950 }}>JOUEURS</div></div>
            <div style={{ ...panelStyle(accent+"35"), padding:8, textAlign:"center" }}><div style={{ color:accent, fontSize:15, fontWeight:1150 }}>{String(config.difficulty || "normal").toUpperCase()}</div><div style={{ color:SOFT, fontSize:7.5, fontWeight:950 }}>DIFFICULTÉ</div></div>
          </div>
          {optionRows.length ? optionRows.map(([key,value]:any)=><div key={key} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:10, padding:"8px 4px", borderBottom:"1px solid rgba(255,255,255,.06)", alignItems:"center" }}><span style={{ color:"#dfe4ef", fontSize:10, fontWeight:850 }}>{String(key).replace(/([A-Z])/g," $1").toUpperCase()}</span><b style={{ color:accent, fontSize:10 }}>{typeof value==="boolean"?(value?"ON":"OFF"):String(value)}</b></div>) : <div style={{ color:SOFT, fontSize:10.5 }}>Aucun réglage avancé pour cette partie.</div>}
        </div> : null}

        {quickPanel === "objective" && spec.id === "green_vs_red" ? <div style={{ marginTop:12, display:"grid", gap:8 }}>
          {(() => {
            const id=String(activePlayer?.id||"");
            const color=String(state.special?.greenRedColorByPlayer?.[id]||"GREEN");
            const tone=color==="RED"?GVR_RED:GVR_GREEN;
            const path=color==="RED"?GVR_RED_PATH:GVR_GREEN_PATH;
            const step=Math.min(10,Number(state.special?.greenRedStepByPlayer?.[id]||0));
            const bull=String(config?.modeOptions?.bullRule||"classic");
            const targetLabel=step>=10?"BULL":`D/T ${path[step]}`;
            return <><div style={{...panelStyle(tone+"55"),padding:12,textAlign:"center"}}><div style={{color:tone,fontSize:9,fontWeight:1100,letterSpacing:.8}}>PISTE ACTUELLE · {color}</div><div style={{color:"#fff",fontSize:28,fontWeight:1200,marginTop:4}}>{targetLabel}</div><div style={{color:SOFT,fontSize:9.5,marginTop:4}}>Étape {step+1}/11 · Score {Number(state.scores?.[id]||0)}</div></div><div style={{...panelStyle("rgba(255,255,255,.10)"),padding:11,color:"#dce2ed",fontSize:10.5,lineHeight:1.55}}>Sur les 10 secteurs, seuls DOUBLE et TRIPLE du secteur courant font progresser. La frise suit l'ordre officiel de la couleur du joueur. À l'étape finale : {bull==="color_lock"?"BULL DE COULEUR — Vert=25, Rouge=50.":bull==="color_bonus"?"BULL BONUS — les deux Bulls sont valables, celui de ta couleur reçoit le bonus configuré.":"CLASSIQUE — 1/2 BULL 25 et BULL 50 sont valables."}</div></>;
          })()}
        </div> : null}

        {quickPanel === "ranking" ? <div style={{ marginTop:12, display:"grid", gap:6 }}>
          {[...(state.players||[])].sort((a:any,b:any)=>Number(state.scores?.[b.id]||0)-Number(state.scores?.[a.id]||0)).map((p:any,i:number)=>{const id=String(p.id);const tone=spec.id==="green_vs_red"?greenRedToneFor(state,id):accent;return <div key={id} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"8px 9px",borderRadius:12,border:`1px solid ${tone}45`,background:"rgba(255,255,255,.025)"}}><b style={{color:tone}}>#{i+1}</b><div><b style={{color:"#fff",fontSize:10}}>{p.name}</b>{spec.id==="green_vs_red"?<div style={{color:tone,fontSize:8,marginTop:1}}>{String(state.special?.greenRedColorByPlayer?.[id]||"GREEN")} · étape {Number(state.special?.greenRedStepByPlayer?.[id]||0)}/11</div>:null}</div><strong style={{color:tone,fontSize:18}}>{Math.round(Number(state.scores?.[id]||0))}</strong></div>})}
        </div> : null}

        {quickPanel === "stats" ? <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:7 }}>
          {(() => {
            const id=String(activePlayer?.id||"");
            const s:any=state.statsByPlayer?.[id]||{};
            const penalty=Number(state.special?.greenRedPenaltyByPlayer?.[id]||0);
            const bonus=Number(state.special?.greenRedBullBonusByPlayer?.[id]||0);
            const items=[["SCORE",Number(state.scores?.[id]||0)],["FLÉCHETTES",Number(s.darts||0)],["VOLÉES",(state.visits||[]).filter((v:any)=>String(v.playerId)===id).length],["DOUBLES",Number(s.doubles||0)],["TRIPLES",Number(s.triples||0)],["BULLS",Number(s.bulls||0)],["PÉNALITÉS",penalty],["BONUS BULL",bonus]];
            return items.map(([label,value]:any)=><div key={label} style={{...panelStyle(accent+"30"),padding:10,textAlign:"center"}}><div style={{color:SOFT,fontSize:7.5,fontWeight:950}}>{label}</div><b style={{display:"block",marginTop:3,color:label==="PÉNALITÉS"?GVR_RED:label==="BONUS BULL"?GVR_GREEN:accent,fontSize:20}}>{value}</b></div>);
          })()}
        </div> : null}

        {quickPanel === "players" ? <div style={{ marginTop:12, display:"grid", gap:7 }}>
          {state.players.map((p:any,i:number)=>{
            const prof=profileById.get(String(p.id))||p;
            const metric=wave61PrimaryMetric(state,p.id);
            const gvrC=spec.id==="green_vs_red"?String(state.special?.greenRedColorByPlayer?.[p.id]||"GREEN"):"";
            const gvrTeam=spec.id==="green_vs_red"&&String(config?.modeOptions?.matchFormat||"duel")==="teams"?(gvrC==="GREEN"?"TEAM VERTE":"TEAM ROUGE"):"";
            return <PlayerCard key={p.id} profile={prof} active={state.activePlayerIndex===i} accent={spec.id==="green_vs_red"?(gvrC==="RED"?GVR_RED:GVR_GREEN):accent} value={metric.value} subValue={spec.id==="green_vs_red"?`${gvrC}${gvrTeam?` · ${gvrTeam}`:""} · étape ${Number(state.special?.greenRedStepByPlayer?.[p.id]||0)}/11`:`${metric.label} · ${metric.sub}`} />;
          })}
        </div> : null}

        {quickPanel === "history" ? <div style={{ marginTop:12 }}>
          {state.visits?.length ? <VisitTimeline visits={state.visits} profiles={profiles} accent={accent} title="DERNIÈRES ACTIONS" limit={10} /> : <div style={{ color:SOFT, fontSize:10.5, textAlign:"center", padding:18 }}>Aucune volée enregistrée.</div>}
        </div> : null}
      </div>
    </div>;
  };

  if (isClassicFive) {
    const activeMetric = activePlayer ? wave61PrimaryMetric(state, activePlayer.id) : { value:"—", label:"", sub:"" };
    const activeStats = activePlayer ? (state.statsByPlayer?.[activePlayer.id] || {}) : {};
    const dartsPlayed = Number(activeStats?.darts || 0);
    const visitCount = activePlayer ? (state.visits || []).filter((v:any)=>String(v.playerId)===String(activePlayer.id)).length : 0;
    const tickerHeight = isLandscapeTablet ? 54 : 82;
    const quickButtons = (spec.id === "green_vs_red" ? [
      { id:"ranking", icon:"🏆", label:"CLASSEMENT" },
      { id:"players", icon:"👥", label:"JOUEURS", wide:true },
      { id:"stats", icon:"▥", label:"STATS" },
      { id:"history", icon:"↺", label:"LOGS" },
    ] : [
      { id:"rules", icon:"◎", label:"RÈGLES" },
      { id:"settings", icon:"⚙", label:"RÉGLAGES" },
      { id:"players", icon:"◉", label:"JOUEURS" },
      { id:"history", icon:"↺", label:"ACTIONS" },
    ]) as any[];
    const gvrActiveId = String(activePlayer?.id || "");
    const gvrColor = spec.id === "green_vs_red" ? String(state.special?.greenRedColorByPlayer?.[gvrActiveId] || "GREEN") : "";
    const gvrTone = gvrColor === "RED" ? GVR_RED : GVR_GREEN;
    const gvrPath = gvrColor === "RED" ? GVR_RED_PATH : GVR_GREEN_PATH;
    const gvrStep = spec.id === "green_vs_red" ? Math.min(10, Number(state.special?.greenRedStepByPlayer?.[gvrActiveId] || 0)) : 0;
    const gvrTargetLabel = spec.id === "green_vs_red" ? (gvrStep >= 10 ? "BULL" : `D/T ${gvrPath[gvrStep]}`) : classicObjective;
    const gvrAvatar = activeProfile?.avatarDataUrl || activeProfile?.avatarUrl || activeProfile?.avatar || null;

    return <div data-wave61-classic-five={spec.id} data-green-red-ui-version={spec.id === "green_vs_red" ? "v6" : undefined} style={{ height:"calc(var(--vh,1vh) * 100 - 18px)", minHeight:0, overflow:"hidden", display:"flex", flexDirection:"column", background:`radial-gradient(circle at 50% 0%,${accent}14,transparent 34%),#070a11` }}>
      <PageHeader
        tickerSrc={modeTicker || undefined}
        tickerAlt={spec.label}
        tickerHeight={tickerHeight}
        tickerBottomGap={isLandscapeTablet?3:5}
        tickerFit="cover"
        left={<BackDot onClick={()=>go?.("wave61_config",{gameId:spec.id})} color={spec.id==="green_vs_red"?gvrTone:accent} glow={`${spec.id==="green_vs_red"?gvrTone:accent}88`} />}
        right={<InfoDot title={`${spec.label} — règles`} color={spec.id==="green_vs_red"?gvrTone:accent} glow={`${spec.id==="green_vs_red"?gvrTone:accent}77`} content={familyRules(spec,preset)} />}
      />
      {spec.id === "green_vs_red" ? <GreenRedDuelScoreboard state={state} profiles={profiles} /> : null}

      {adviceText && spec.id !== "green_vs_red" ? <div role="status" aria-live="polite" style={{ position:"fixed", zIndex:95, top:tickerHeight+10, right:8, width:"min(330px,calc(100vw - 16px))", borderRadius:14, padding:"7px 8px", display:"grid", gridTemplateColumns:"34px minmax(0,1fr)", gap:7, alignItems:"center", border:`1px solid ${accent}70`, background:"rgba(8,11,19,.97)", boxShadow:`0 12px 30px rgba(0,0,0,.5),0 0 20px ${accent}18` }}>
        <img src="/awena/awena-avatar.webp" alt="Awena" style={{ width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`1px solid ${accent}88` }}/>
        <div><div style={{ color:accent,fontSize:7.5,fontWeight:1100,letterSpacing:.8 }}>AWENA · CONSEIL</div><div style={{ color:"#fff",fontSize:9,lineHeight:1.3,fontWeight:850,marginTop:1 }}>{adviceText}</div></div>
      </div> : null}

      {state.phase === "finished" ? <div style={{ flex:1,minHeight:0,overflowY:"auto",padding:10,display:"grid",placeItems:"start center" }}>
        <div style={{ width:"min(720px,100%)" }}><ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{[state.winnerId||""]:1}} accent={accent} onReplay={replay} onStats={()=>go?.("darts_mode_summary",{rec:buildRecord(state,"finished"),mode:spec.id,from:"game_end"})} onHistory={()=>go?.("statsHub",{tab:"history",mode:spec.id,focusMatchId:matchIdRef.current})} onConfig={()=>go?.("wave61_config",{gameId:spec.id})} onGames={()=>go?.("games",{gamesView:"all"})} extra={<Wave61EndSummary state={state} profiles={profiles} accent={accent} familyLabel={preset.label}/>} /></div>
      </div> : <div style={isLandscapeTablet
        ? { flex:1,minHeight:0,display:"grid",gridTemplateColumns:"minmax(0,.92fr) minmax(440px,1.08fr)",gap:8,padding:"5px 7px 7px",overflow:"hidden" }
        : { flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden" }
      }>
        <section data-wave61-classic-info="1" style={isLandscapeTablet
          ? { minWidth:0,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:"0 2px 8px",display:"grid",gap:7,alignContent:"start" }
          : { flex:"1 1 auto",minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:"5px 8px 7px",display:"grid",gap:7,alignContent:"start" }
        }>
          {spec.id === "green_vs_red" ? <section data-green-red-active-player="1" style={{ position:"relative",overflow:"hidden",minHeight:118,borderRadius:18,border:`1px solid ${gvrTone}70`,background:`radial-gradient(circle at 12% 50%,${gvrTone}24,transparent 35%),linear-gradient(145deg,${gvrTone}10,rgba(5,8,14,.98))`,boxShadow:`inset 0 0 38px ${gvrTone}0c,0 12px 28px rgba(0,0,0,.28)`,display:"grid",gridTemplateColumns:"minmax(0,1fr) 112px",gap:8,alignItems:"stretch",padding:8 }}>
            <div aria-hidden style={{position:"absolute",left:-24,top:"50%",transform:"translateY(-50%)",width:132,height:132,opacity:.18,filter:"saturate(.9)",pointerEvents:"none"}}>{gvrAvatar?<img src={gvrAvatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:999}}/>:<div style={{width:"100%",height:"100%",borderRadius:999,display:"grid",placeItems:"center",fontSize:58,fontWeight:1200,color:gvrTone,border:`2px solid ${gvrTone}55`}}>{String(activePlayer?.name||"?").slice(0,1).toUpperCase()}</div>}</div>
            <div style={{position:"relative",zIndex:1,minWidth:0,display:"grid",placeItems:"center",alignContent:"center",paddingLeft:44,textAlign:"center"}}>
              <div style={{color:gvrTone,fontSize:8,fontWeight:1100,letterSpacing:1}}>{gvrColor} · ÉTAPE {gvrStep+1}/11</div>
              <div style={{color:"#fff",fontSize:12,fontWeight:1100,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%"}}>{activePlayer?.name || "—"}</div>
              <div style={{color:gvrTone,fontSize:40,lineHeight:1,fontWeight:1250,letterSpacing:-1.4,textShadow:`0 0 18px ${gvrTone}45`,marginTop:2}}>{Math.round(Number(state.scores?.[gvrActiveId]||0))}</div>
              <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:4,color:SOFT,fontSize:7,fontWeight:950}}><span>{dartsPlayed} FLÉCHETTES</span><span>{visitCount} VOLÉES</span></div>
            </div>
            <button type="button" onClick={()=>setQuickPanel("objective")} style={{position:"relative",zIndex:1,minWidth:0,borderRadius:15,border:`1px solid ${gvrTone}70`,background:`linear-gradient(180deg,${gvrTone}22,rgba(7,10,16,.95))`,color:"#fff",display:"grid",placeItems:"center",alignContent:"center",gap:3,padding:7,cursor:"pointer",boxShadow:`inset 0 0 20px ${gvrTone}0e`}}>
              <span style={{color:gvrTone,fontSize:7.2,fontWeight:1100,letterSpacing:.7}}>OBJECTIF</span>
              <strong style={{fontSize:gvrStep>=10?15:20,lineHeight:1,color:"#fff"}}>{gvrTargetLabel}</strong>
              <small style={{fontSize:6.7,color:gvrTone,fontWeight:1000}}>PISTE {gvrColor}</small>
              <span style={{fontSize:14,color:gvrTone,lineHeight:1}}>›</span>
            </button>
            <button type="button" onClick={doUndo} disabled={!undo.length} aria-label="Annuler la dernière volée" style={{position:"absolute",right:7,top:7,zIndex:2,width:29,height:29,borderRadius:10,border:"1px solid rgba(255,255,255,.10)",background:"rgba(0,0,0,.34)",color:undo.length?gvrTone:"#56606d",fontSize:13,cursor:undo.length?"pointer":"default"}}>↶</button>
          </section> : <div style={{ ...panelStyle(accent+"62"), padding:9, background:`linear-gradient(145deg,${accent}12,rgba(5,8,14,.97))` }}>
            <div style={{ display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",marginBottom:6 }}>
              <div><div style={{ color:accent,fontSize:8.5,fontWeight:1100,letterSpacing:.9 }}>{spec.label.toUpperCase()} · ROUND {roundLabel}/{config.rounds}</div><div style={{ color:"#fff",fontSize:13.5,fontWeight:1100,marginTop:2 }}>{activePlayer?.name || "—"} joue</div></div>
              <button type="button" onClick={doUndo} disabled={!undo.length} style={{ ...actionStyle(accent,!undo.length),minHeight:36,padding:"0 10px",fontSize:9 }}>↶ UNDO</button>
            </div>
            {activePlayer ? <PlayerCard profile={activeProfile} active accent={accent} value={activeMetric.value} subValue={`${activeMetric.label} · ${activeMetric.sub}`} /> : null}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5,marginTop:6 }}>
              <div style={{ borderRadius:10,padding:"6px 5px",textAlign:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)" }}><div style={{ color:accent,fontWeight:1150,fontSize:13 }}>{dartsPlayed}</div><div style={{ color:SOFT,fontSize:7,fontWeight:950 }}>FLÉCHETTES</div></div>
              <div style={{ borderRadius:10,padding:"6px 5px",textAlign:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)" }}><div style={{ color:accent,fontWeight:1150,fontSize:13 }}>{visitCount}</div><div style={{ color:SOFT,fontSize:7,fontWeight:950 }}>VOLÉES</div></div>
              <div style={{ borderRadius:10,padding:"6px 5px",textAlign:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",minWidth:0 }}><div style={{ color:accent,fontWeight:1150,fontSize:10.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{classicObjective}</div><div style={{ color:SOFT,fontSize:7,fontWeight:950 }}>OBJECTIF</div></div>
            </div>
          </div>}

          <div style={{ display:"grid",gridTemplateColumns:spec.id==="green_vs_red"?"1fr 1.55fr 1fr 1fr":"repeat(4,minmax(0,1fr))",gap:6 }}>
            {quickButtons.map((b:any)=>{const toolTone=spec.id==="green_vs_red"?gvrTone:accent;return <button key={b.id} type="button" onClick={()=>setQuickPanel(b.id as any)} style={{ minHeight:48,borderRadius:13,border:`1px solid ${toolTone}32`,background:`linear-gradient(180deg,${toolTone}08,rgba(7,10,16,.96))`,color:"#dfe5ef",display:"grid",placeItems:"center",alignContent:"center",gap:1,cursor:"pointer",minWidth:0 }}><span style={{ color:toolTone,fontSize:17,lineHeight:1 }}>{b.icon}</span><span style={{ fontSize:6.6,fontWeight:1000,letterSpacing:.4,whiteSpace:"nowrap" }}>{b.label}</span></button>})}
          </div>

          {notice ? <div style={{ borderRadius:11,padding:"6px 8px",background:`${accent}0d`,border:`1px solid ${accent}2d`,color:"#eef1f8",fontSize:9.2,fontWeight:850,lineHeight:1.25 }}>{notice}</div> : null}

          {renderModeSpecificPanel()}

          {spec.id !== "green_vs_red" ? <div style={{ ...panelStyle(accent+"3d"), padding:8, display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:8, alignItems:"center" }}>
            <div style={{ minWidth:0 }}><div style={{ color:accent,fontSize:8,fontWeight:1100,letterSpacing:.7 }}>OBJECTIF ACTIF</div><div style={{ color:"#fff",fontSize:14,fontWeight:1100,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{classicObjective}</div>{dedicatedPlayHint ? <div style={{ color:SOFT,fontSize:8.6,lineHeight:1.3,marginTop:2 }}>{dedicatedPlayHint}</div> : null}</div>
            <div style={{ width:54,height:54,borderRadius:15,border:`1px solid ${accent}55`,background:`${accent}0d`,display:"grid",placeItems:"center",color:accent,fontSize:20 }}>🎯</div>
          </div> : null}
        </section>

        <section data-wave61-classic-input="fixed" style={isLandscapeTablet
          ? { minWidth:0,minHeight:0,overflow:"hidden",display:"flex",flexDirection:"column" }
          : { flex:`0 0 ${classicInputHeight}`,height:classicInputHeight,minHeight:0,overflow:"hidden",padding:"0 8px max(6px,env(safe-area-inset-bottom))",background:"linear-gradient(180deg,rgba(4,7,12,.88),rgba(4,7,12,1))",borderTop:"1px solid rgba(255,255,255,.07)",boxShadow:"0 -12px 28px rgba(0,0,0,.42)" }
        }>
          {!activeIsBot ? (spec.id === "green_vs_red" && config.scoreInputMethod !== "dartboard" ? <GreenVsRedInput state={state} activePlayer={activePlayer} currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} accent={accent} /> : <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={accent} fitMinScale={isLandscapeTablet?0.30:0.36} guideSegmentNumbers={spec.id === "green_vs_red" && target?.kind === "number" ? [target.value] : null} guideBull={spec.id === "green_vs_red" && target?.kind === "bull"} />) : <div style={{ ...panelStyle(accent+"35"),height:"100%",display:"grid",placeItems:"center",textAlign:"center",color:SOFT,fontSize:11,padding:12 }}><div><div style={{fontSize:32}}>🤖</div><b style={{color:accent}}>{activePlayer?.name}</b><div style={{marginTop:5}}>calcule son prochain lancer…</div></div></div>}
        </section>
      </div>}
      {renderClassicQuickModal()}
    </div>;
  }

  if (isLandscapeTablet) {
    const compactHeight = viewportH > 0 && viewportH <= 560;
    const activeMetric = activePlayer ? wave61PrimaryMetric(state, activePlayer.id) : { value: "—", label: "", sub: "" };
    const activeProfile = activePlayer ? (profileById.get(String(activePlayer.id)) || activePlayer) : null;
    const tickerHeight = compactHeight ? 48 : Math.max(58, Math.min(82, Math.round(viewportH * 0.105)));
    const familyBadge = state.family === "survival" || state.family === "combat" ? "⚔️ SURVIE" : state.family === "ascent" ? "⛰️ ASCENSION" : state.family === "conquest" ? "🗺️ CONQUÊTE" : state.family === "deduction" ? "🧩 INDICES" : state.family === "rhythm" ? "⚡ COMBO" : state.family === "race" ? "🏁 COURSE" : state.family === "mission" ? "🗝️ MISSION" : "🎯 ACTION";

    return <div data-wave61-landscape="three-zone" style={{ height: "100dvh", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", background: `radial-gradient(circle at 50% 0%,${accent}13,transparent 35%)` }}>
      <PageHeader title={spec.label} subtitle={`${preset.label} · moteur V${WAVE61_ENGINE_VERSION}`} left={<BackDot onClick={() => go?.("wave61_config", { gameId: spec.id })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — règles`} color={accent} glow={`${accent}77`} content={familyRules(spec, preset)} />} />
      {modeTicker ? <div data-wave61-landscape-ticker="1" style={{ flex: `0 0 ${tickerHeight}px`, minHeight: 0, padding: "3px 8px 2px", display: "grid", placeItems: "center" }}><img src={modeTicker} alt={spec.label} style={{ width: "min(760px,58vw)", height: tickerHeight - 5, objectFit: "cover", borderRadius: 13, display: "block", border: `1px solid ${accent}44`, boxShadow: `0 8px 24px rgba(0,0,0,.34)` }} /></div> : null}
      {adviceText && spec.id !== "green_vs_red" ? <div role="status" aria-live="polite" style={{ position: "fixed", zIndex: 95, top: compactHeight ? 56 : 76, right: 10, width: "min(350px,34vw)", borderRadius: 14, padding: "7px 9px", display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", gap: 7, alignItems: "center", border: `1px solid ${accent}70`, background: "linear-gradient(145deg,rgba(12,15,26,.97),rgba(5,7,13,.98))", boxShadow: `0 14px 34px rgba(0,0,0,.48),0 0 22px ${accent}20` }}>
        <img src="/awena/awena-avatar.webp" alt="Awena" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accent}88` }} />
        <div><div style={{ color: accent, fontSize: 7.8, fontWeight: 1100, letterSpacing: .8 }}>AWENA · CONSEIL</div><div style={{ marginTop: 1, color: "#fff", fontSize: 9.2, fontWeight: 850, lineHeight: 1.28 }}>{adviceText}</div></div>
        {awenaCommentaryEnabled ? <button type="button" aria-label="Répéter le conseil Awena" onClick={() => { lastVoiceAtRef.current = Date.now(); void awena?.say?.(adviceText).catch(() => undefined); }} style={{ width: 28, height: 28, borderRadius: 9, border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, cursor: "pointer" }}>🔊</button> : null}
      </div> : null}

      {state.phase === "finished" ? <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "grid", placeItems: "start center" }}><div style={{ width: "min(980px,94vw)" }}><ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{ [state.winnerId || ""]: 1 }} accent={accent} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: spec.id, from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: spec.id, focusMatchId: matchIdRef.current })} onConfig={() => go?.("wave61_config", { gameId: spec.id })} onGames={() => go?.("games", { gamesView: "all" })} extra={<Wave61EndSummary state={state} profiles={profiles} accent={accent} familyLabel={preset.label} />} /></div></div> : <div data-wave61-play-grid="three-zone" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateColumns: viewportW >= 1180 ? "minmax(0,.78fr) minmax(0,1.05fr) minmax(0,1.17fr)" : "minmax(0,.82fr) minmax(0,1.03fr) minmax(0,1.15fr)", gap: compactHeight ? 6 : 8, padding: compactHeight ? "5px 7px 7px" : "7px 9px 9px" }}>
        <section data-wave61-zone="players" style={{ minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...panelStyle(accent + "45"), padding: compactHeight ? 7 : 9, flex: "0 0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 7, alignItems: "center" }}><div><div style={{ color: accent, fontSize: compactHeight ? 8.4 : 9.5, fontWeight: 1100, letterSpacing: .8 }}>ROUND {roundLabel}/{config.rounds}</div><div style={{ marginTop: 2, color: "#fff", fontSize: compactHeight ? 12 : 14, fontWeight: 1000 }}>{activePlayer?.name || "—"}</div></div><button type="button" onClick={doUndo} disabled={!undo.length} style={{ ...actionStyle(accent, !undo.length), minHeight: compactHeight ? 32 : 36, padding: "0 8px", fontSize: 9 }}>↶ UNDO</button></div>
            {activeProfile ? <div style={{ marginTop: 6 }}><PlayerCard profile={activeProfile} active accent={accent} value={activeMetric.value} subValue={`${activeMetric.label} · ${activeMetric.sub}${teamMode ? ` · Team ${config.teamByPlayer?.[activePlayer?.id] || "?"}` : ""}`} badge={state.eliminated?.[activePlayer?.id || ""] ? "OUT" : null} muted={!!state.eliminated?.[activePlayer?.id || ""]} /></div> : null}
          </div>
          {teamMode ? <div style={{ ...panelStyle("rgba(255,255,255,.08)"), padding: 6, display: "flex", gap: 5, flexWrap: "wrap", flex: "0 0 auto" }}>{Object.entries(state.teamScores || {}).map(([team, score]: any) => <span key={team} style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${team === "A" ? accent + "55" : "#ff657d55"}`, color: team === "A" ? accent : "#ff8fa0", fontSize: 8.5, fontWeight: 1000 }}>TEAM {team} · {Math.round(Number(score || 0))}</span>)}</div> : null}
          <div data-wave61-player-list="scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 5, paddingRight: 2 }}>
            {state.players.map((p: any, i: number) => { const prof = profileById.get(String(p.id)) || p; const metric = wave61PrimaryMetric(state, p.id); const eliminated = !!state.eliminated[p.id]; return <div key={p.id} style={{ opacity: state.activePlayerIndex === i ? .72 : 1 }}><PlayerCard profile={prof} active={state.activePlayerIndex === i} accent={accent} value={metric.value} subValue={`${metric.label} · ${metric.sub}${teamMode ? ` · Team ${config.teamByPlayer?.[p.id] || "?"}` : ""}`} badge={eliminated ? "OUT" : null} muted={eliminated} /></div>; })}
          </div>
        </section>

        <section data-wave61-zone="mission" style={{ minWidth: 0, minHeight: 0, overflowY: "auto", display: "grid", alignContent: "start", gap: 6, paddingRight: 2 }}>
          {notice ? <div style={{ borderRadius: 11, padding: "6px 8px", background: `${accent}0d`, border: `1px solid ${accent}2f`, color: "#e9ecf5", fontSize: 9.2, fontWeight: 850 }}>{notice}</div> : null}
          {config?.modeOptions && Object.keys(config.modeOptions).length ? <div style={{ ...panelStyle(accent + "2d"), padding: "6px 7px", display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}><span style={{ color: accent, fontSize: 7.8, fontWeight: 1100 }}>RÉGLAGES</span>{Object.entries(config.modeOptions).slice(0, compactHeight ? 5 : 9).map(([key, value]: any) => <span key={key} style={{ borderRadius: 999, padding: "3px 5px", border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.03)", color: "#cfd5e4", fontSize: 7.4, fontWeight: 850 }}>{key.replace(/([A-Z])/g, " $1").toUpperCase()} · {key.endsWith("Ms") ? `${Number(value) / 1000}s` : typeof value === "boolean" ? (value ? "ON" : "OFF") : String(value)}</span>)}</div> : null}
          {renderModeSpecificPanel()}
          <div style={{ ...panelStyle(accent + "3d"), padding: compactHeight ? 8 : 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
            <div><div style={{ color: accent, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>{target ? "OBJECTIF ACTIF" : "OBJECTIF LIBRE"}</div><div style={{ marginTop: 3, color: "#fff", fontSize: compactHeight ? 14 : 17, fontWeight: 1100, lineHeight: 1.12 }}>{spec.id === "golden_dart" ? "Trouve le secteur doré grâce aux indices" : spec.id === "luciole" ? "Mémorise la luciole avant qu'elle s'éteigne" : target?.label || (state.family === "score" ? "Marque le maximum" : spec.id === "align_4" ? "Choisis ta colonne avec le secteur" : "Fais progresser ta mission")}</div>{!compactHeight ? <div style={{ marginTop: 4, color: SOFT, fontSize: 8.8, lineHeight: 1.35 }}>{spec.infoBody}</div> : null}</div>
            <div style={{ minWidth: compactHeight ? 58 : 70, minHeight: compactHeight ? 54 : 68, borderRadius: 15, border: `1px solid ${accent}66`, background: `${accent}0d`, display: "grid", placeItems: "center", textAlign: "center", color: accent, fontWeight: 1100, fontSize: compactHeight ? 8.5 : 9.5 }}>{familyBadge}</div>
          </div>
          <VisitTimeline visits={state.visits} profiles={profiles} accent={accent} title="ACTIONS DU MOTEUR" limit={compactHeight ? 2 : 3} />
        </section>

        <section data-wave61-zone="input" style={{ minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={accent} fitMinScale={compactHeight ? 0.28 : 0.34} /> : <div style={{ ...panelStyle(accent + "35"), height: "100%", display: "grid", placeItems: "center", textAlign: "center", color: SOFT, fontSize: 12, padding: 14 }}><div><div style={{ fontSize: 34 }}>🤖</div><b style={{ color: accent }}>{activePlayer?.name}</b><div style={{ marginTop: 6 }}>calcule son prochain lancer…</div></div></div>}
        </section>
      </div>}
    </div>;
  }

  return <div style={{ minHeight: "calc(var(--vh,1vh) * 100)", paddingBottom: 18, background: `radial-gradient(circle at 50% 0%,${accent}13,transparent 35%)` }}>
    <PageHeader title={spec.label} subtitle={`${preset.label} · moteur V${WAVE61_ENGINE_VERSION}`} left={<BackDot onClick={() => go?.("wave61_config", { gameId: spec.id })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — règles`} color={accent} glow={`${accent}77`} content={familyRules(spec, preset)} />} />
    {modeTicker ? <div style={{ padding: "5px 8px 1px", maxWidth: 1040, margin: "0 auto" }}><img src={modeTicker} alt={spec.label} style={{ width: "100%", maxHeight: 210, aspectRatio: "800 / 230", objectFit: "cover", borderRadius: 14, display: "block", border: `1px solid ${accent}44`, boxShadow: `0 10px 30px rgba(0,0,0,.36)` }} /></div> : null}
    {adviceText && spec.id !== "green_vs_red" ? <div role="status" aria-live="polite" style={{ position: "fixed", zIndex: 95, top: 86, right: 12, width: "min(360px,calc(100vw - 24px))", borderRadius: 16, padding: "9px 10px", display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 9, alignItems: "center", border: `1px solid ${accent}70`, background: "linear-gradient(145deg,rgba(12,15,26,.97),rgba(5,7,13,.98))", boxShadow: `0 16px 42px rgba(0,0,0,.48),0 0 26px ${accent}20` }}>
      <img src="/awena/awena-avatar.webp" alt="Awena" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: `1px solid ${accent}88`, boxShadow: `0 0 14px ${accent}35` }} />
      <div><div style={{ color: accent, fontSize: 8.8, fontWeight: 1100, letterSpacing: 1 }}>AWENA · CONSEIL CIBLE</div><div style={{ marginTop: 2, color: "#fff", fontSize: 10.4, fontWeight: 850, lineHeight: 1.35 }}>{adviceText}</div></div>
      {awenaCommentaryEnabled ? <button type="button" aria-label="Répéter le conseil Awena" onClick={() => { lastVoiceAtRef.current = Date.now(); void awena?.say?.(adviceText).catch(() => undefined); }} style={{ width: 32, height: 32, borderRadius: 10, border: `1px solid ${accent}55`, background: `${accent}12`, color: accent, fontWeight: 1100, cursor: "pointer" }}>🔊</button> : null}
    </div> : null}
    <div style={{ padding: "7px 8px 18px", maxWidth: 1040, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(accent + "45"), padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>ROUND {roundLabel}/{config.rounds} · {preset.label.toUpperCase()}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Partie terminée" : `${activePlayer?.name || "—"} joue`}</div>{dedicatedPlayHint ? <div style={{ marginTop: 3, color: SOFT, fontSize: 9.2, lineHeight: 1.3 }}>{dedicatedPlayHint}</div> : null}</div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(accent, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: `${accent}0d`, border: `1px solid ${accent}2f`, color: "#e9ecf5", fontSize: 10.5, fontWeight: 850 }}>{notice}</div> : null}

      {config?.modeOptions && Object.keys(config.modeOptions).length ? <div style={{ ...panelStyle(accent + "2d"), padding: "7px 9px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: accent, fontSize: 8.8, fontWeight: 1100, letterSpacing: .8 }}>RÉGLAGES MODE</span>
        {Object.entries(config.modeOptions).map(([key, value]: any) => {
          const labels: Record<string,string> = { mineCount: "MINES", scannerStrength: "SCANNER", mineDamage: "DÉGÂTS", connectLength: "ALIGNEMENT", bullColumn: "BULL→COL", codeLength: "CODE", allowRepeats: "RÉPÉTITIONS", cluesPerMiss: "INDICES/ERREUR", sequenceLength: "SÉQUENCE", previewMs: "APERÇU", revealMs: "LUMIÈRE", wrongPenalty: "PÉNALITÉ", headshotBonus: "HEADSHOT", nightDamage: "NUIT", dayVoteMultiplier: "VOTES", medicShield: "BOUCLIER", captureThreshold: "SEUIL", territoryGoal: "OBJECTIF", resourceBoost: "RESSOURCE", baseFort: "FORT", torchStart: "TORCHE", torchDrain: "USURE", chamberNeed: "SALLE", weatherSeverity: "MÉTÉO", oxygenReserve: "OXYGÈNE", climbPower: "ASCENSION", peakThreshold: "SOMMET", burstThreshold: "COSMO", burstDamage: "BURST", shieldCap: "BOUCLIER", energyThreshold: "ÉNERGIE", bullEnergy: "BULL ÉNERGIE", tripleEnergy: "TRIPLE ÉNERGIE", trialNeed: "ÉPREUVE", favorThreshold: "FAVEUR", bullFavor: "BULL FAVEUR", alertGain: "ALERTE", bullStealth: "DISCRÉTION", phaseNeedBonus: "PHASE", attackThreshold: "ATTAQUE", tranquilizerPower: "TRANQ.", securityDamage: "SÉCURITÉ", pullPowerPct: "TRACTION", slipPenalty: "RECUL", bullBoostPct: "BULL", copyPoints: "COPIE", perfectBonus: "PARFAIT", failurePenalty: "ERREUR", missPenaltyPercent: "SANCTION", hitMultiplierPct: "TOUCHES", bustBack: "BUST", bustResetAfter: "RESET BUST", marksPerBox: "MARQUES", overflowRule: "SURPLUS", overflowBonus: "BONUS SURPLUS", finishSteps: "PISTE", tripleAdvance: "TRIPLE", wrongColorAdvance: "MAUV. COULEUR", scoreMultiplierPct: "SCORE", bullBonus: "BULL BONUS", missPenalty: "MISS", collisionResetPct: "COLLISION", collisionScoreBonus: "KNOCK BONUS", fuseLength: "MÈCHE", passFuseBonus: "BONUS PASSE", explosionDamage: "EXPLOSION", infectionPowerPct: "INFECTION", barricadePowerPct: "BARRICADE", curePowerPct: "SOIN", catchLives: "CAPTURE", escapePowerPct: "FUITE", bullProtectionCharges: "PROTECTION", catchThreshold: "SEUIL CAPTURE", crossingGoal: "TRAVERSÉE", runPowerPct: "COURSE", damagePowerPct: "DÉGÂTS", releaseHealth: "LIBÉRATION", compartmentGoal: "COMPART.", floodPowerPct: "INONDATION", pumpPowerPct: "POMPES", refugeGoal: "REFUGE", disasterThreshold: "CATASTROPHE", medkitPowerPct: "MEDKIT", startingArmor: "ARMURE", guardCap: "GARDE", attackPowerPct: "ATTAQUE", movePowerPct: "AVANCÉE", stopPenalty: "STOP", freezeBonus: "FIGÉ", mouseHeadStart: "AVANCE SOURIS", movementPowerPct: "DÉPLACEMENT", bullShortcutPct: "BULL RACCOURCI", ghostGap: "ÉCART FANTÔME", ghostAdvance: "VITESSE FANTÔME", bullPowerCharge: "POWER BULL", bonusMove: "BONUS PISTE", bullShortcut: "RACCOURCI", routePowerPct: "PISTE", dangerLimit: "LIMITE", missSpeedLoss: "PERTE VITESSE", sprintTripleBonus: "TRIPLE SPRINT", relayPerfectBonus: "RELAIS PARFAIT", startAltitude: "ALTITUDE", fallSpeedPct: "CHUTE", parachuteWindowPct: "FENÊTRE", startSpeed: "VITESSE DÉPART", boostPowerPct: "BOOST", windPenalty: "VENT", missJumpPenalty: "FAUTE", paceStep: "RYTHME", bullJumpBonusPct: "BULL SAUT", fixedCutoff: "BUZZER", clutchBonus: "CLUTCH", streakCap: "SÉRIE", phaseNeed: "PHASE", heatGain: "CHALEUR", bullCooling: "REFROID.", directStepPower: "VERROUS", bullJokerPower: "JOKER BULL", penaltyBackAfter: "ERREURS", fuelGainPct: "CARBURANT", stabilityLoss: "STABILITÉ", fuelMinimum: "MIN FUEL", sceneNeed: "PRISES", starPowerPct: "ÉTOILES", boxOfficePct: "BOX-OFFICE", sealNeed: "SCEAU", doomGain: "CYCLE", bullDoomRelief: "BULL CYCLE", waterStart: "EAU DÉPART", waterDrain: "EAU/ERREUR", harvestGoal: "RÉCOLTES", contaminationGain: "CONTAM.", bullDecontam: "DÉCONTAM.", qualityPowerPct: "QUALITÉ", hitOverloadPct: "CHARGE", wrongOverload: "ERREUR ÉLEC.", directAdvance: "CATÉGORIES", bullAdvance: "JOKER BAC", validationBonus: "VALIDATION", basePot: "POT", potGrowth: "CROISSANCE", payoutMultiplierPct: "GAINS", dangerThreshold: "DANGER", dangerPerMiss: "DANGER/ÉCHEC", bullShield: "BULL BOUCLIER", startWallet: "CAISSE DÉPART", targetWallet: "CAISSE CIBLE", missFee: "COÛT MISS", bullRebate: "COUPON BULL", startingCheese: "FROMAGES DÉPART", cheeseGoal: "FROMAGES CIBLE", fableThreshold: "RUSE", bullGuard: "GARDE BULL", missionCount: "MISSIONS", alarmGain: "ALARME/ERREUR", alarmThreshold: "SEUIL ALARME", failBack: "RECUL" };
          const shown = key.endsWith("Ms") ? `${Number(value) / 1000}s` : typeof value === "boolean" ? (value ? "ON" : "OFF") : String(value);
          return <span key={key} style={{ borderRadius: 999, padding: "4px 7px", border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", color: "#cfd5e4", fontSize: 8.5, fontWeight: 900 }}>{labels[key] || key.toUpperCase()} · {shown}</span>;
        })}
      </div> : null}

      {teamMode ? <div style={{ ...panelStyle("rgba(255,255,255,.08)"), padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>{Object.entries(state.teamScores || {}).map(([team, score]: any) => <span key={team} style={{ borderRadius: 999, padding: "5px 9px", border: `1px solid ${team === "A" ? accent + "55" : "#ff657d55"}`, color: team === "A" ? accent : "#ff8fa0", fontSize: 10, fontWeight: 1000 }}>TEAM {team} · {Math.round(Number(score || 0))}</span>)}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
        {state.players.map((p: any, i: number) => {
          const prof = profileById.get(String(p.id)) || p;
          const metric = wave61PrimaryMetric(state, p.id);
          const eliminated = !!state.eliminated[p.id];
          const pct = preset.defaultGoal > 0 ? Math.min(100, (Number(state.progress[p.id] || state.scores[p.id] || 0) / Math.max(1, config.goal)) * 100) : 0;
          return <div key={p.id} style={{ display: "grid", gap: 4 }}><PlayerCard profile={prof} active={state.phase !== "finished" && state.activePlayerIndex === i} accent={accent} value={metric.value} subValue={`${metric.label} · ${metric.sub}${teamMode ? ` · Team ${config.teamByPlayer?.[p.id] || "?"}` : ""}`} badge={eliminated ? "OUT" : null} muted={eliminated} />{preset.defaultGoal > 0 && state.family !== "survival" && state.family !== "combat" ? <Meter value={state.progress[p.id] || state.scores[p.id] || 0} max={config.goal} accent={accent} /> : null}</div>;
        })}
      </div>

      {spec.id === "align_4" ? <Align4Board state={state} accent={accent} /> : null}
      {spec.id === "demineur" ? <MineBoard state={state} accent={accent} /> : null}
      {spec.id === "codebreaker" ? <CodebreakerPanel state={state} accent={accent} /> : null}
      {spec.id === "face_mystere" ? <FaceMysterePanel state={state} accent={accent} /> : null}
      {spec.id === "colin_maillard" ? <ColinBoard state={state} accent={accent} reveal={memoryReveal} onReveal={revealMemory} previewMs={config?.modeOptions?.previewMs || 2000} /> : null}
      {spec.id === "replicat" ? <ReplicatPanel state={state} accent={accent} /> : null}
      {spec.id === "double_down" ? <DoubleDownPanel state={state} accent={accent} target={target} /> : null}
      {spec.id === "nine_dart_century" ? <CenturyPanel state={state} accent={accent} /> : null}
      {spec.id === "shove_a_penny" ? <ShovePennyPanel state={state} accent={accent} /> : null}
      {spec.id === "green_vs_red" ? <><GreenRedDuelScoreboard state={state} profiles={profiles} accent={accent} /><GreenRedPanel state={state} accent={accent} /></> : null}
      {spec.id === "sniper" ? <SniperPanel state={state} accent={accent} /> : null}
      {spec.id === "luciole" ? <LuciolePanel state={state} accent={accent} reveal={lucioleReveal} /> : null}
      {spec.id === "golden_dart" ? <GoldenDartPanel state={state} accent={accent} /> : null}
      {spec.id === "final_buzzer" ? <FinalBuzzerPanel state={state} accent={accent} /> : null}
      {spec.id === "jackpot" ? <JackpotPanel state={state} accent={accent} /> : null}
      {spec.id === "mafia" ? <MafiaPanel state={state} accent={accent} /> : null}
      {spec.id === "tug_rush" ? <TugRushPanel state={state} accent={accent} /> : null}
      {spec.id === "un_deux_trois_soleil" ? <SoleilPanel state={state} accent={accent} /> : null}
      {spec.id === "chat_souris" ? <ChatSourisPanel state={state} accent={accent} /> : null}
      {spec.id === "maze_chase" ? <MazeChasePanel state={state} accent={accent} /> : null}
      {spec.id === "chien_chat" ? <ChienChatPanel state={state} accent={accent} /> : null}
      {spec.id === "roller_coaster" ? <RollerCoasterPanel state={state} accent={accent} /> : null}
      {spec.id === "athletisme" ? <AthleticsPanel state={state} accent={accent} /> : null}
      {spec.id === "chute_libre" ? <FreefallPanel state={state} accent={accent} /> : null}
      {spec.id === "tyrolien" ? <TyrolienPanel state={state} accent={accent} /> : null}
      {spec.id === "saut_a_la_corde" ? <JumpRopePanel state={state} accent={accent} /> : null}
      {spec.id === "heist_180" ? <Heist180Panel state={state} accent={accent} /> : null}
      {spec.id === "escape_game" ? <EscapeGamePanel state={state} accent={accent} /> : null}
      {spec.id === "objectif_lune" ? <ObjectifLunePanel state={state} accent={accent} /> : null}
      {spec.id === "hollywood" ? <HollywoodPanel state={state} accent={accent} /> : null}
      {spec.id === "calendrier_maya" ? <MayaPanel state={state} accent={accent} /> : null}
      {spec.id === "pyramides" ? <PyramidesPanel state={state} accent={accent} /> : null}
      {spec.id === "draco_spheres" ? <DracoSpheresPanel state={state} accent={accent} /> : null}
      {spec.id === "mythologie" ? <MythologiePanel state={state} accent={accent} /> : null}
      {spec.id === "jardinier" ? <JardinierPanel state={state} accent={accent} /> : null}
      {spec.id === "microscopia" ? <MicroscopiaPanel state={state} accent={accent} /> : null}
      {spec.id === "disjoncte" ? <DisjonctePanel state={state} accent={accent} /> : null}
      {spec.id === "petit_bac" ? <PetitBacPanel state={state} accent={accent} /> : null}
      {spec.id === "hot_potato" ? <HotPotatoPanel state={state} accent={accent} /> : null}
      {spec.id === "zombie_siege" ? <ZombieSiegePanel state={state} accent={accent} /> : null}
      {spec.id === "le_loup" ? <LoupPanel state={state} accent={accent} /> : null}
      {spec.id === "eperviers" ? <EperviersPanel state={state} accent={accent} /> : null}
      {spec.id === "ballon_prisonnier" ? <DodgeballPanel state={state} accent={accent} /> : null}
      {spec.id === "iceberg" ? <IcebergPanel state={state} accent={accent} /> : null}
      {spec.id === "jurassic_dart" ? <JurassicPanel state={state} accent={accent} /> : null}
      {spec.id === "apocalypse" ? <ApocalypsePanel state={state} accent={accent} /> : null}
      {spec.id === "mistigri" ? <MistigriPanel state={state} accent={accent} /> : null}
      {spec.id === "radin" ? <RadinPanel state={state} accent={accent} /> : null}
      {spec.id === "corbeau_renard" ? <CorbeauRenardPanel state={state} accent={accent} /> : null}
      {spec.id === "darts_impossible" ? <DartsImpossiblePanel state={state} accent={accent} /> : null}
      {spec.id === "knockback" ? <KnockbackPanel state={state} accent={accent} /> : null}
      {spec.id === "spartacus" ? <SpartacusPanel state={state} accent={accent} /> : null}
      {spec.id === "cosmo_knights" ? <CosmoKnightsPanel state={state} accent={accent} /> : null}
      {spec.id === "vikings" ? <VikingsPanel state={state} accent={accent} /> : null}
      {spec.id === "black_flag" ? <BlackFlagPanel state={state} accent={accent} /> : null}
      {spec.id === "menhir_mayhem" ? <MenhirMayhemPanel state={state} accent={accent} /> : null}
      {spec.id === "attila" ? <AttilaPanel state={state} accent={accent} /> : null}
      {spec.id === "poseidon" ? <PoseidonPanel state={state} accent={accent} /> : null}
      {spec.id === "cheval_de_troie" ? <ChevalTroiePanel state={state} accent={accent} /> : null}
      {spec.id === "sabaudia_dauphine" ? <SabaudiaDauphinePanel state={state} accent={accent} /> : null}
      {spec.id === "galaxies" ? <GalaxiesPanel state={state} accent={accent} /> : null}
      {spec.id === "mont_blanc" ? <MontBlancPanel state={state} accent={accent} /> : null}
      {spec.id === "everest" ? <EverestPanel state={state} accent={accent} /> : null}
      {spec.id === "summit_14" ? <Summit14Panel state={state} accent={accent} /> : null}

      {state.phase !== "finished" ? <>
        <div style={{ ...panelStyle(accent + "3d"), padding: 10, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
          <div><div style={{ color: accent, fontSize: 9.5, fontWeight: 1100, letterSpacing: .8 }}>{target ? "OBJECTIF ACTIF" : "OBJECTIF LIBRE"}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 18, fontWeight: 1100 }}>{spec.id === "golden_dart" ? "Trouve le secteur doré grâce aux indices" : spec.id === "luciole" ? "Mémorise la luciole avant qu'elle s'éteigne" : target?.label || (state.family === "score" ? "Marque le maximum" : spec.id === "align_4" ? "Choisis ta colonne avec le secteur" : "Fais progresser ta mission")}</div><div style={{ marginTop: 4, color: SOFT, fontSize: 9.8, lineHeight: 1.4 }}>{spec.infoBody}</div></div>
          <div style={{ minWidth: 76, minHeight: 76, borderRadius: 18, border: `1px solid ${accent}66`, background: `${accent}0d`, display: "grid", placeItems: "center", textAlign: "center", color: accent, fontWeight: 1100, fontSize: 11 }}>{state.family === "survival" || state.family === "combat" ? "⚔️\nSURVIE" : state.family === "ascent" ? "⛰️\nASCENSION" : state.family === "conquest" ? "🗺️\nCONQUÊTE" : state.family === "deduction" ? "🧩\nINDICES" : state.family === "rhythm" ? "⚡\nCOMBO" : state.family === "race" ? "🏁\nCOURSE" : state.family === "mission" ? "🗝️\nMISSION" : "🎯\nACTION"}</div>
        </div>

        {!activeIsBot ? <NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} preferredMethod={config.scoreInputMethod} validateLabel="VALIDER LA VOLÉE" accent={accent} /> : <div style={{ ...panelStyle(accent + "35"), textAlign: "center", color: SOFT, fontSize: 11, padding: 14 }}><b style={{ color: accent }}>{activePlayer?.name}</b> calcule son prochain lancer…</div>}
        <VisitTimeline visits={state.visits} profiles={profiles} accent={accent} title="ACTIONS DU MOTEUR" limit={5} />
      </> : <ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{ [state.winnerId || ""]: 1 }} accent={accent} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec: buildRecord(state, "finished"), mode: spec.id, from: "game_end" })} onHistory={() => go?.("statsHub", { tab: "history", mode: spec.id, focusMatchId: matchIdRef.current })} onConfig={() => go?.("wave61_config", { gameId: spec.id })} onGames={() => go?.("games", { gamesView: "all" })} extra={<Wave61EndSummary state={state} profiles={profiles} accent={accent} familyLabel={preset.label} />} />}
    </div>
  </div>;
}
