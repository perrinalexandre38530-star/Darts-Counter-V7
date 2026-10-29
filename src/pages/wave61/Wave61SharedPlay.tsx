// @ts-nocheck
// Architecture V10+ : socle partagé Wave61 conservé et enrichi par passes successives.
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { History } from "../lib/history";
import { getTicker } from "../lib/tickers";
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
import { MistigriPanel, RadinPanel } from "./wave61/Wave61FablePartyPanels";

function familyRules(spec: any, preset: any) {
  const signature: Record<string, string> = {
    align_4: "Chaque impact choisit une colonne 1–7. Les jetons tombent dans la grille 7×6 et le premier alignement de quatre gagne.",
    demineur: "Les secteurs 1–20 forment une grille 5×4. Les cases sûres donnent des indices voisins ; BULL scanne une case sûre et DBULL en scanne deux.",
    codebreaker: "Trois secteurs composent une tentative. L'application indique les valeurs exactes et les valeurs présentes mais déplacées. Trois exactes déverrouillent le code.",
    face_mystere: "Chaque secteur représente un suspect. Une mauvaise accusation révèle un nouvel indice et élimine automatiquement les suspects incompatibles.",
    colin_maillard: "Mémorise une séquence cachée de six secteurs. Utilise l'aperçu de 2 secondes avant de lancer puis reproduis la suite dans l'ordre.",
    replicat: "Le premier joueur crée la référence. Ensuite chaque volée doit copier la précédente : numéros en Facile, segments exacts en Normal, séquence parfaite en Difficile.",
    double_down: "Départ classique à 40. Parcours 15 · 16 · DOUBLE · 17 · 18 · TRIPLE · 19 · 20 · BULL. Seules les touches du contrat scorent ; 0/3 divise le score cumulé par deux.",
    nine_dart_century: "Trois volées / neuf fléchettes pour faire 100 exact ou s’en approcher. Les scores ≤100 sont prioritaires ; si tout le monde dépasse, le plus petit dépassement gagne.",
    shove_a_penny: "Ferme dans l’ordre 15, 16, 17, 18, 19, 20 puis BULL. Trois marques ferment une case ; les surplus au-delà de la fermeture sont poussés au joueur suivant en règle classique.",
    green_vs_red: "Duel à 2 joueurs. Vert suit 1·4·6·15·17·19·16·11·9·5 ; Rouge suit 20·12·14·8·7·3·2·10·13·18. Seuls D/T du numéro courant marquent ; la cible adverse retire des points. Finale au BULL.",
    hi_score: "Huit rounds par défaut. Chaque dart vaut sa valeur normale, sans checkout ni bust. Le plus gros total final gagne ; Fat Bull et pénalités MISS restent des variantes optionnelles.",
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

  const connectLength = Math.max(3, Math.min(5, Number(state?.config?.modeOptions?.connectLength || 4)));
  const moves = Array.isArray(state?.special?.align4Moves) ? state.special.align4Moves : [];
  const lastMove = moves[moves.length - 1];
  const activePlayer = state?.players?.[state?.activePlayerIndex || 0];
  const isTeams = state?.config?.participantMode === "teams";
  const tokenForPlayer = (playerId: string) => isTeams ? String(state?.config?.teamByPlayer?.[playerId] || "A") : playerId;
  const activeToken = activePlayer ? tokenForPlayer(activePlayer.id) : null;

  const orderedTokens: string[] = [];
  for (const p of state?.players || []) {
    const token = tokenForPlayer(p.id);
    if (token && !orderedTokens.includes(token)) orderedTokens.push(token);
  }
  for (const row of board) for (const token of row) if (token && !orderedTokens.includes(token)) orderedTokens.push(token);

  const palette = [accent, "#ff5e78", "#ffd166", "#8a7dff", "#66e4ff", "#9be564", "#ff9f5c", "#e17cff"];
  const tokenColors: Record<string, string> = {};
  orderedTokens.forEach((token, idx) => { tokenColors[token] = palette[idx % palette.length]; });

  const tokenLabel = (token: string) => {
    if (isTeams) return `ÉQUIPE ${token}`;
    const player = (state?.players || []).find((p: any) => p.id === token);
    return player ? playerName(player) : "JOUEUR";
  };

  const countToken = (token: string) => board.reduce((sum: number, row: any[]) => sum + row.filter((cell: string | null) => cell === token).length, 0);
  const columnHeights = Array.from({ length: 7 }, (_, c) => board.reduce((n: number, row: any[]) => n + (row[c] ? 1 : 0), 0));

  const longestRun = (token: string) => {
    const H = board.length, W = board[0]?.length || 0;
    let best = 0;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (board[r][c] === token) {
      for (const [dr, dc] of [[1,0],[0,1],[1,1],[1,-1]]) {
        let n = 1;
        while (r + dr * n >= 0 && r + dr * n < H && c + dc * n >= 0 && c + dc * n < W && board[r + dr * n][c + dc * n] === token) n++;
        best = Math.max(best, n);
      }
    }
    return best;
  };

  const leader = orderedTokens.map((token) => ({ token, run: longestRun(token), discs: countToken(token) }))
    .sort((a, b) => b.run - a.run || b.discs - a.discs)[0];
  const phaseFinished = state?.phase === "finished";
  const totalDiscs = moves.length;
  const boardFill = Math.min(100, Math.round((totalDiscs / 42) * 100));
  const bullColumn = Math.max(1, Math.min(7, Number(state?.config?.modeOptions?.bullColumn || 7)));

  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display: "grid", gap: 9 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>🔴 ALIGN {connectLength} · PLATEAU EN DIRECT</div>
        <div style={{ color: SOFT, fontSize: 8.8, marginTop: 2 }}>Chaque impact choisit une colonne 1–7 · BULL = colonne {bullColumn}</div>
      </div>
      <div style={{ borderRadius: 999, padding: "5px 8px", background: phaseFinished ? `${accent}22` : "rgba(255,255,255,.045)", border: `1px solid ${phaseFinished ? accent + "77" : "rgba(255,255,255,.09)"}`, color: phaseFinished ? accent : "#e7ebf4", fontSize: 8.6, fontWeight: 1100, whiteSpace: "nowrap" }}>{phaseFinished ? "ALIGNEMENT GAGNANT" : `${totalDiscs}/42 JETONS`}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, maxWidth: 460, width: "100%", margin: "0 auto", padding: 7, borderRadius: 14, background: "rgba(22,58,122,.35)", border: "1px solid rgba(90,150,255,.18)", boxShadow: "inset 0 0 30px rgba(0,0,0,.26)" }}>
      {board.flatMap((row: any[], r: number) => row.map((token: string | null, c: number) => {
        const isLast = !!lastMove && Number(lastMove.col) === c + 1 && Number(lastMove.row) === r + 1;
        const color = token ? tokenColors[token] || accent : "transparent";
        return <div key={`${r}-${c}`} title={token ? tokenLabel(token) : `Colonne ${c + 1}`} style={{ aspectRatio: "1", borderRadius: 999, border: `2px solid ${isLast ? "#fff" : token ? color + "aa" : "rgba(255,255,255,.12)"}`, background: token ? color : "rgba(2,8,20,.62)", boxShadow: isLast ? `0 0 0 2px ${color}66, 0 0 18px ${color}` : token ? `0 3px 10px ${color}55` : "inset 0 2px 8px rgba(0,0,0,.65)", transform: isLast ? "scale(1.05)" : "none", transition: "transform .16s ease" }} />;
      }))}
      {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => <div key={`col-${n}`} style={{ textAlign: "center", color: columnHeights[n - 1] >= 6 ? "#ff8e8e" : n === bullColumn ? "#ffd36a" : SOFT, fontSize: 8.2, fontWeight: 1000 }}>{columnHeights[n - 1] >= 6 ? "PLEIN" : n === bullColumn ? `BULL·${n}` : `COL ${n}`}</div>)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
      {orderedTokens.map((token) => {
        const color = tokenColors[token] || accent;
        const run = longestRun(token);
        const active = token === activeToken && !phaseFinished;
        return <div key={token} style={{ padding: "7px 8px", borderRadius: 11, background: active ? `${color}14` : "rgba(255,255,255,.035)", border: `1px solid ${active ? color + "66" : "rgba(255,255,255,.08)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}>
            <span style={{ color: "#fff", fontSize: 8.8, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>● {tokenLabel(token)}</span>
            <span style={{ color, fontSize: 8.4, fontWeight: 1100 }}>{active ? "À TOI" : `${countToken(token)} J`}</span>
          </div>
          <div style={{ marginTop: 5, height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (run / connectLength) * 100)}%`, height: "100%", borderRadius: 999, background: color }} /></div>
          <div style={{ marginTop: 3, color: run >= connectLength - 1 && !phaseFinished ? "#ffd36a" : SOFT, fontSize: 8.1 }}>{run >= connectLength ? "ALIGNEMENT COMPLET" : `Meilleure série : ${run}/${connectLength}`}</div>
        </div>;
      })}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <div style={{ padding: "7px 8px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ color: SOFT, fontSize: 8 }}>DERNIER COUP</div>
        <div style={{ color: lastMove ? tokenColors[lastMove.token] || accent : "#fff", fontSize: 9.4, fontWeight: 1050, marginTop: 2 }}>{lastMove ? `${tokenLabel(lastMove.token)} · COLONNE ${lastMove.col}` : "Aucun jeton posé"}</div>
      </div>
      <div style={{ padding: "7px 8px", borderRadius: 10, background: leader?.run >= connectLength - 1 && !phaseFinished ? "rgba(255,190,80,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${leader?.run >= connectLength - 1 && !phaseFinished ? "rgba(255,190,80,.25)" : "rgba(255,255,255,.07)"}` }}>
        <div style={{ color: SOFT, fontSize: 8 }}>MENACE ACTUELLE</div>
        <div style={{ color: leader ? tokenColors[leader.token] || accent : "#fff", fontSize: 9.4, fontWeight: 1050, marginTop: 2 }}>{leader ? `${tokenLabel(leader.token)} · ${leader.run}/${connectLength}` : "Plateau vide"}</div>
      </div>
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><div style={{ width: `${boardFill}%`, height: "100%", background: accent, borderRadius: 999 }} /></div>
      <div style={{ color: SOFT, fontSize: 8.2, whiteSpace: "nowrap" }}>{boardFill}% rempli</div>
    </div>
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
  const candidateList = (state?.special?.faceCandidates || []).map(Number);
  const candidates = new Set(candidateList);
  const clues = state?.special?.faceClues || [];
  const history = state?.special?.faceHistory || [];
  const secret = Number(state?.special?.faceSecret || 0);
  const remaining = candidates.size;
  const eliminated = Math.max(0, 20 - remaining);
  const investigationPct = Math.min(100, Math.max(0, Math.round((eliminated / 19) * 100)));
  const solved = state?.phase === "finished";
  const finalCandidate = remaining === 1 ? candidateList[0] : null;
  const latestGuesses = history.slice(-5).reverse();
  const faceFor = (n: number) => ["🧔","👩","👨","👩‍🦱","👨‍🦲","👩‍🦰","👨‍🦱","👩‍🦳","👨‍🦳","🧑"][Math.abs(n - 1) % 10];

  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
      <div>
        <div style={{ color: accent, fontSize: 10, fontWeight: 1100 }}>🎭 FACE MYSTÈRE · ENQUÊTE EN DIRECT</div>
        <div style={{ color: SOFT, fontSize: 8.8, marginTop: 2 }}>Accuse un portrait avec son secteur · une erreur révèle un indice et élimine les incompatibles.</div>
      </div>
      <div style={{ borderRadius: 999, padding: "5px 8px", background: solved ? `${accent}22` : remaining <= 3 ? "rgba(255,190,80,.12)" : "rgba(255,255,255,.045)", border: `1px solid ${solved ? accent + "77" : remaining <= 3 ? "rgba(255,190,80,.38)" : "rgba(255,255,255,.09)"}`, color: solved ? accent : remaining <= 3 ? "#ffd06a" : "#e7ebf4", fontSize: 8.6, fontWeight: 1100, whiteSpace: "nowrap" }}>{solved ? "AFFAIRE RÉSOLUE" : `${remaining} SUSPECT${remaining > 1 ? "S" : ""}`}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(150px,.8fr)", gap: 8, marginTop: 8 }}>
      <div style={{ borderRadius: 12, padding: 8, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <b style={{ color: "#fff", fontSize: 9.2 }}>MUR DES SUSPECTS</b>
          <span style={{ color: SOFT, fontSize: 8.5 }}>{eliminated}/20 écarté(s)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const alive = candidates.has(n);
            const guilty = solved && n === secret;
            const lastGuess = latestGuesses[0] && Number(latestGuesses[0].guess) === n;
            return <div key={n} style={{ position: "relative", minHeight: 49, borderRadius: 9, display: "grid", placeItems: "center", padding: "3px 2px", overflow: "hidden", border: `1px solid ${guilty ? accent : alive ? (lastGuess ? "#ffd06a88" : "rgba(255,255,255,.13)") : "rgba(255,255,255,.045)"}`, background: guilty ? `linear-gradient(145deg,${accent}28,${accent}0d)` : alive ? (finalCandidate === n ? "rgba(255,190,80,.12)" : "rgba(255,255,255,.045)") : "rgba(255,255,255,.012)", opacity: alive || guilty ? 1 : .38, boxShadow: guilty ? `0 0 18px ${accent}38` : finalCandidate === n ? "0 0 14px rgba(255,190,80,.18)" : "none" }}>
              <div style={{ fontSize: 20, lineHeight: 1 }}>{faceFor(n)}</div>
              <div style={{ color: guilty ? accent : alive ? "#fff" : "#757b86", fontSize: 8.8, fontWeight: 1100 }}>#{n}</div>
              {!alive && !guilty ? <div style={{ position: "absolute", left: "12%", right: "12%", top: "50%", height: 1, background: "#ff6f72aa", transform: "rotate(-14deg)" }} /> : null}
              {guilty ? <div style={{ position: "absolute", top: 2, right: 3, fontSize: 9 }}>✅</div> : null}
              {finalCandidate === n && !solved ? <div style={{ position: "absolute", top: 2, right: 3, fontSize: 8 }}>🎯</div> : null}
            </div>;
          })}
        </div>
      </div>

      <div style={{ display: "grid", gap: 7, alignContent: "start" }}>
        <div style={{ borderRadius: 11, padding: 8, background: `${accent}0b`, border: `1px solid ${accent}35` }}>
          <div style={{ color: SOFT, fontSize: 8.3, fontWeight: 1000 }}>PROGRESSION ENQUÊTE</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 }}><b style={{ color: "#fff", fontSize: 18 }}>{investigationPct}%</b><span style={{ color: SOFT, fontSize: 8.2 }}>{eliminated} éliminés</span></div>
          <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden", marginTop: 4 }}><div style={{ width: `${investigationPct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${accent}88,${accent})`, transition: "width .25s ease" }} /></div>
        </div>

        <div style={{ borderRadius: 11, padding: 8, background: remaining === 1 && !solved ? "rgba(255,190,80,.09)" : "rgba(255,255,255,.025)", border: `1px solid ${remaining === 1 && !solved ? "rgba(255,190,80,.35)" : "rgba(255,255,255,.07)"}` }}>
          <div style={{ color: SOFT, fontSize: 8.3, fontWeight: 1000 }}>{solved ? "COUPABLE IDENTIFIÉ" : remaining === 1 ? "DERNIER SUSPECT" : "PROCHAINE ACTION"}</div>
          <div style={{ color: solved ? accent : remaining === 1 ? "#ffd06a" : "#fff", fontSize: 13, fontWeight: 1100, marginTop: 4 }}>{solved ? `SUSPECT #${secret}` : remaining === 1 ? `VISE LE ${finalCandidate}` : "VISE UN SUSPECT ACTIF"}</div>
          <div style={{ color: SOFT, fontSize: 8.3, marginTop: 3 }}>{solved ? "L’enquête est terminée." : remaining === 1 ? "Un seul portrait reste compatible avec tous les indices." : "Chaque erreur utile resserre l’étau."}</div>
        </div>

        <div style={{ borderRadius: 11, padding: 8, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ color: SOFT, fontSize: 8.3, fontWeight: 1000, marginBottom: 4 }}>DERNIÈRES ACCUSATIONS</div>
          {latestGuesses.length ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{latestGuesses.map((h: any, i: number) => <span key={`${h.playerId}-${h.guess}-${i}`} style={{ borderRadius: 999, padding: "3px 6px", background: Number(h.guess) === secret && solved ? `${accent}20` : "rgba(255,255,255,.04)", border: `1px solid ${Number(h.guess) === secret && solved ? accent + "55" : "rgba(255,255,255,.08)"}`, color: Number(h.guess) === secret && solved ? accent : "#dce1ec", fontSize: 8.2, fontWeight: 950 }}>#{h.guess}</span>)}</div> : <div style={{ color: SOFT, fontSize: 8.4 }}>Aucune accusation.</div>}
        </div>
      </div>
    </div>

    <div style={{ marginTop: 8, borderRadius: 11, padding: 8, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><b style={{ color: "#fff", fontSize: 9 }}>📁 DOSSIER D’INDICES</b><span style={{ color: SOFT, fontSize: 8.3 }}>{clues.length} indice(s)</span></div>
      {clues.length ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>{clues.map((c: any, i: number) => <span key={`${c.key}-${i}`} style={{ borderRadius: 8, padding: "5px 7px", background: `${accent}0c`, border: `1px solid ${accent}2e`, color: "#e7ebf4", fontSize: 8.5, fontWeight: 900 }}>🔎 {c.label}</span>)}</div> : <div style={{ color: SOFT, fontSize: 8.6, marginTop: 5 }}>Aucun indice pour l’instant. Lance une première accusation.</div>}
    </div>

    <div style={{ marginTop: 7, borderRadius: 10, padding: "7px 9px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: SOFT, fontSize: 8.6, lineHeight: 1.45 }}><b style={{ color: "#fff" }}>RÉFLEXE ENQUÊTE :</b> secteur = accusation · erreur = suspect éliminé + nouvel indice · <b style={{ color: accent }}>bon suspect = affaire résolue immédiatement</b>.</div>
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
  const active = state.players?.[state.activePlayerIndex];
  const history = (state.special?.doubleDownHistory || []).filter((h:any)=>h.playerId===active?.id);
  const last = history[history.length - 1];
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid", gap:9 }}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}>
      <div><b style={{ color: accent, fontSize: 10 }}>DOUBLE DOWN · 9 CONTRATS</b><div style={{color:SOFT,fontSize:8.6}}>Départ {state.config?.modeOptions?.startScore ?? 40} pts · 0 touche = score sanctionné</div></div>
      <div style={{borderRadius:12,padding:"7px 10px",background:`${accent}12`,border:`1px solid ${accent}55`,textAlign:"right"}}><div style={{fontSize:8,color:SOFT}}>CONTRAT ACTIF</div><b style={{color:"#fff",fontSize:15}}>{target?.label || seq[round]}</b></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(9,minmax(38px,1fr))", gap: 4, overflowX:"auto" }}>{seq.map((x,i)=><div key={x+i} style={{ minHeight: 40, borderRadius: 9, display:"grid", placeItems:"center", border:`1px solid ${i===round?accent+"aa":"rgba(255,255,255,.08)"}`, background:i<round?`${accent}16`:i===round?`${accent}28`:"rgba(255,255,255,.025)", color:i<=round?"#fff":"#697181", fontSize:8.6, fontWeight:1100, boxShadow:i===round?`0 0 18px ${accent}22`:"none" }}>{i<round?"✓":x}</div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <div style={{borderRadius:10,padding:"7px 8px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)"}}><span style={{fontSize:8,color:SOFT}}>DERNIÈRE VALIDATION</span><div style={{fontWeight:1000,fontSize:11,color:last?.hits?accent:"#ff8d98"}}>{last ? `${last.hits}/3 touche(s)` : "—"}</div></div>
      <div style={{borderRadius:10,padding:"7px 8px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)"}}><span style={{fontSize:8,color:SOFT}}>SCORE JOUEUR ACTIF</span><div style={{fontWeight:1100,fontSize:17}}>{Math.round(Number(state.scores?.[active?.id]||0))}</div></div>
    </div>
  </div>;
}

function CenturyPanel({ state, accent }: any) {
  const goal=Number(state?.config?.goal||100);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid", gap:8 }}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><b style={{ color: accent, fontSize: 10 }}>9 DART CENTURY · OBJECTIF {goal}</b><div style={{color:SOFT,fontSize:8.5}}>≤100 : le plus haut gagne · si tous dépassent : le plus petit dépassement gagne</div></div><span style={{borderRadius:999,padding:"5px 8px",border:`1px solid ${accent}55`,color:accent,fontSize:8.5,fontWeight:1000}}>3 ROUNDS · 9 DARTS</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 6 }}>{state.players.map((p:any)=>{ const st=state.statsByPlayer?.[p.id]||{}; const score=Number(state.scores?.[p.id]||0); const over=score>goal; const exact=score===goal; const remain=Math.max(0,goal-score); const pct=Math.min(100,(Math.min(score,goal)/goal)*100); return <div key={p.id} style={{borderRadius:12,padding:"8px",background:exact?`${accent}18`:over?"rgba(255,75,90,.08)":"rgba(255,255,255,.035)",border:`1px solid ${exact?accent+"77":over?"rgba(255,90,100,.35)":"rgba(255,255,255,.08)"}`,display:"grid",gap:4}}><div style={{display:"flex",justifyContent:"space-between",gap:6}}><b style={{fontSize:9,color:"#fff"}}>{p.name}</b><span style={{fontSize:8,color:exact?accent:over?"#ff8d98":SOFT}}>{exact?"EXACT":over?"BUST":`${remain} À FAIRE`}</span></div><div style={{fontSize:22,color:over?"#ff9ca6":"#fff",fontWeight:1200}}>{score}<span style={{fontSize:9,color:SOFT}}> / {goal}</span></div><div style={{height:5,borderRadius:999,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:exact?accent:over?"#ff6575":accent}}/></div><div style={{fontSize:8.3,color:SOFT}}>{Math.min(9,Number(st.darts||0))}/9 darts{state.special?.centuryDartsAtLockByPlayer?.[p.id]?` · verrouillé au dart ${state.special.centuryDartsAtLockByPlayer[p.id]}`:""}</div></div>})}</div>
  </div>;
}

function ShovePennyPanel({ state, accent }: any) {
  const targets = [15,16,17,18,19,20,25];
  const need=Math.max(2,Number(state.config?.modeOptions?.marksPerBox||3));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}>
    <div><b style={{ color: accent, fontSize: 10 }}>SHOVE A PENNY · PARCOURS ORDONNÉ</b><div style={{color:SOFT,fontSize:8.5}}>15 → 16 → 17 → 18 → 19 → 20 → BULL · {need} marques par case</div></div>
    <div style={{ overflowX:"auto" }}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:4,fontSize:9}}><thead><tr><th style={{color:SOFT,textAlign:"left"}}>JOUEUR</th>{targets.map(n=><th key={n} style={{color:SOFT}}>{n===25?"BULL":n}</th>)}</tr></thead><tbody>{state.players.map((p:any)=>{ const marks=state.special?.shoveMarksByPlayer?.[p.id]||{}; const current=targets.find(n=>Number(marks[String(n)]||0)<need); return <tr key={p.id}><td style={{color:"#fff",fontWeight:1000,whiteSpace:"nowrap"}}>{p.name}</td>{targets.map(n=>{const m=Number(marks[String(n)]||0); const closed=m>=need; const active=n===current; return <td key={n} style={{textAlign:"center",minWidth:38,borderRadius:8,padding:"7px 4px",background:closed?`${accent}1c`:active?`${accent}0e`:"rgba(255,255,255,.025)",border:`1px solid ${active?accent+"aa":closed?accent+"55":"rgba(255,255,255,.07)"}`,color:closed?accent:active?"#fff":"#6d7483",fontWeight:1100,boxShadow:active?`0 0 14px ${accent}20`:"none"}}>{closed?"✓":`${m}/${need}`}</td>})}</tr>})}</tbody></table></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:8.5,color:SOFT}}><span>Simple = 1 marque</span><span>·</span><span>Double = 2</span><span>·</span><span>Triple = 3</span><span>·</span><span>BULL/DBULL = 1/2</span></div>
  </div>;
}

function GreenRedPanel({ state, accent }: any) {
  const red=[20,12,14,8,7,3,2,10,13,18];
  const green=[1,4,6,15,17,19,16,11,9,5];
  const step=Math.min(10,Number(state.roundIndex||0));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><b style={{color:accent,fontSize:10}}>GREEN VS RED · DUEL ÉLECTRONIQUE</b><div style={{color:SOFT,fontSize:8.5}}>D/T du numéro courant · un D et un T maximum · mauvaise couleur = points retirés</div></div><span style={{fontSize:9,fontWeight:1100,color:step>=10?accent:"#fff"}}>ÉTAPE {step+1}/11</span></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>{state.players.slice(0,2).map((p:any)=>{const color=String(state.special?.greenRedColorByPlayer?.[p.id]||"RED"); const path=color==="GREEN"?green:red; const c=color==="GREEN"?"#67e59b":"#ff6b72"; const target=step>=10?"BULL":path[step]; return <div key={p.id} style={{borderRadius:13,padding:"9px",border:`1px solid ${c}55`,background:`${c}0d`,display:"grid",gap:6}}><div style={{display:"flex",justifyContent:"space-between",gap:6}}><b style={{color:c,fontSize:10}}>{p.name} · {color}</b><b style={{fontSize:13}}>{Math.round(Number(state.scores?.[p.id]||0))} PTS</b></div><div style={{fontSize:23,fontWeight:1200,color:"#fff"}}>{target}</div><div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:2}}>{path.map((n,i)=><span key={n} style={{height:20,borderRadius:5,display:"grid",placeItems:"center",fontSize:7.2,fontWeight:900,background:i===step?`${c}30`:i<step?`${c}14`:"rgba(255,255,255,.025)",border:`1px solid ${i===step?c+"aa":"rgba(255,255,255,.05)"}`,color:i<=step?"#fff":"#626a78"}}>{n}</span>)}</div></div>})}</div>
  </div>;
}

function HiScorePanel({ state, accent }: any) {
  const active=state.players?.[state.activePlayerIndex];
  const totals=state.players.map((p:any)=>Number(state.scores?.[p.id]||0));
  const leader=Math.max(0,...totals);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b style={{color:accent,fontSize:10}}>HI SCORE · TABLEAU DE RENDEMENT</b><div style={{color:SOFT,fontSize:8.5}}>Chaque dart compte · meilleur total après {state.config?.rounds||8} rounds</div></div><span style={{fontSize:9,color:accent,fontWeight:1100}}>LEADER {leader}</span></div>
    <div style={{display:"grid",gap:6}}>{state.players.map((p:any)=>{const visits=(state.visits||[]).filter((v:any)=>v.playerId===p.id); const scores=visits.map((v:any)=>Number(v.delta||0)); const best=Math.max(0,...scores); const avg=scores.length?scores.reduce((a:number,b:number)=>a+b,0)/scores.length:0; const total=Number(state.scores?.[p.id]||0); const gap=leader-total; return <div key={p.id} style={{borderRadius:11,padding:"7px 8px",background:p.id===active?.id?`${accent}0f`:"rgba(255,255,255,.025)",border:`1px solid ${p.id===active?.id?accent+"55":"rgba(255,255,255,.07)"}`,display:"grid",gap:5}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:9,color:"#fff"}}>{p.name}</b><b style={{fontSize:14,color:gap===0?accent:"#fff"}}>{Math.round(total)} PTS</b></div><div style={{display:"grid",gridTemplateColumns:`repeat(${Math.max(1,state.config?.rounds||8)},minmax(16px,1fr))`,gap:2,alignItems:"end",minHeight:32}}>{Array.from({length:state.config?.rounds||8}).map((_,i)=>{const v=scores[i]||0; const h=Math.max(3,Math.round((v/180)*28)); return <div key={i} title={`R${i+1}: ${v}`} style={{height:h,borderRadius:3,background:v===best&&v>0?accent:"rgba(255,255,255,.16)"}}/>})}</div><div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:SOFT}}><span>Moy. {avg.toFixed(1)} / volée</span><span>Best {best}</span><span>{gap===0?"EN TÊTE":`−${Math.round(gap)}`}</span></div></div>})}</div>
  </div>;
}

function SniperPanel({ state, accent }: any) {
  const p=state.players[state.activePlayerIndex]; const contracts=state.special?.sniperContracts||[]; const step=Number(state.special?.sniperStepByPlayer?.[p?.id]||0);
  const goal=Math.min(contracts.length,Number(state.config.goal||contracts.length)); const current=contracts[Math.min(step,Math.max(0,contracts.length-1))];
  const label=(c:any)=>!c?"—":c.bed==="IB"?"DBULL":c.bed==="OB"?"BULL":`${c.bed}${c.number||""}`;
  const history=(state.special?.sniperHistory||[]).filter((h:any)=>h.playerId===p?.id); const completed=Math.min(step,goal); const pct=goal?Math.round(completed/goal*100):0;
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid", gap:8 }}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><b style={{color:accent,fontSize:10}}>🎯 SNIPER · TABLEAU DES CONTRATS</b><div style={{color:SOFT,fontSize:8.5}}>Précision exacte requise selon la difficulté · T/DBULL = HEADSHOT</div></div><span style={{color:accent,fontSize:10,fontWeight:1100}}>{completed}/{goal}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:7}}><div style={{borderRadius:13,padding:9,background:`${accent}10`,border:`1px solid ${accent}55`,display:"grid",gap:4}}><span style={{color:SOFT,fontSize:8,fontWeight:900}}>CONTRAT ACTIF</span><b style={{fontSize:24,color:"#fff"}}>{step>=goal?"✅ MISSION TERMINÉE":label(current)}</b><span style={{color:accent,fontSize:9,fontWeight:1000}}>Progression {pct}%</span></div><div style={{borderRadius:13,padding:9,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.08)",display:"grid",gap:4}}><span style={{color:SOFT,fontSize:8,fontWeight:900}}>DERNIÈRE SÉRIE</span><b style={{fontSize:17}}>{history.length?`+${Number(history[history.length-1]?.completed||0)} contrat(s)`:"—"}</b><span style={{color:SOFT,fontSize:8.5}}>Score {Math.round(Number(state.scores?.[p?.id]||0))}</span></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>{contracts.slice(0,goal).map((c:any,i:number)=><div key={i} style={{minHeight:42,borderRadius:8,display:"grid",placeItems:"center",background:i<step?`${accent}16`:i===step?`${accent}2b`:"rgba(255,255,255,.025)",border:`1px solid ${i===step?accent+"aa":i<step?accent+"44":"rgba(255,255,255,.07)"}`,color:i<=step?"#fff":"#667080",fontSize:9,fontWeight:1100,boxShadow:i===step?`0 0 15px ${accent}22`:"none"}}>{i<step?"✓ ":""}{label(c)}</div>)}</div>
  </div>;
}

function LuciolePanel({ state, accent, reveal }: any) {
  const p=state.players[state.activePlayerIndex]; const step=Number(state.special?.lucioleStepByPlayer?.[p?.id]||0); const target=wave61LucioleTarget(state,p?.id); const goal=Number(state.config.goal||10);
  const wrongPenalty=Number(state.config?.modeOptions?.wrongPenalty??(state.config.difficulty==="hard"?1:0)); const hist=(state.special?.lucioleHistory||[]).filter((h:any)=>h.playerId===p?.id).slice(-5);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10, display:"grid",gap:8 }}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>✨ LUCIOLE · MÉMOIRE LUMINEUSE</b><span style={{color:SOFT,fontSize:9}}>{step}/{goal} CAPTURÉES</span></div>
    <div style={{display:"grid",gridTemplateColumns:"1.25fr .75fr",gap:7}}><div style={{minHeight:86,borderRadius:16,display:"grid",placeItems:"center",border:`1px solid ${reveal?accent+"bb":"rgba(255,255,255,.08)"}`,background:reveal?`radial-gradient(circle,${accent}3d,${accent}0b 55%,transparent 73%)`:"rgba(255,255,255,.02)",boxShadow:reveal?`0 0 34px ${accent}44`:"inset 0 0 30px rgba(0,0,0,.3)",fontSize:reveal?38:26,fontWeight:1200,color:reveal?"#fff":"#4c5360"}}>{reveal?target:"✦"}</div><div style={{borderRadius:13,padding:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)",display:"grid",gap:5}}><span style={{color:SOFT,fontSize:8,fontWeight:900}}>RÈGLE MÉMOIRE</span><b style={{fontSize:11,color:reveal?accent:"#fff"}}>{reveal?"MÉMORISE LE SECTEUR":"LUCIOLE ÉTEINTE"}</b><span style={{color:SOFT,fontSize:8.4}}>Erreur : {wrongPenalty?`−${wrongPenalty} étape(s)`:"pas de recul"}</span></div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>{Array.from({length:5}).map((_,i)=>{const h=hist[i];return <div key={i} style={{borderRadius:8,minHeight:30,display:"grid",placeItems:"center",border:"1px solid rgba(255,255,255,.07)",background:h?(h.hit?`${accent}16`:"rgba(255,90,90,.08)"):"rgba(255,255,255,.02)",color:h?(h.hit?accent:"#ff8585"):SOFT,fontSize:8.5,fontWeight:1000}}>{h?`${h.hit?"✓":"×"} ${h.expected}`:"·"}</div>})}</div>
  </div>;
}

function GoldenDartPanel({ state, accent }: any) {
  const clues=state.special?.goldenClues||[]; const target=wave61GoldenTarget(state);
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>GOLDEN DART · CIBLE SECRÈTE</b><span style={{color:SOFT,fontSize:9}}>{state.special?.goldenIndex||0}+ trouvée(s)</span></div><div style={{minHeight:54,marginTop:8,borderRadius:13,border:`1px solid ${accent}55`,background:`linear-gradient(135deg,${accent}15,rgba(255,255,255,.02))`,display:"grid",placeItems:"center",color:accent,fontSize:20,fontWeight:1200}}>🌟 {state.phase==="finished"?`SECTEUR ${target}`:"???"}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>{clues.length?clues.slice(-4).map((c:any,i:number)=><span key={i} style={{borderRadius:999,padding:"5px 8px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",color:"#e7ebf4",fontSize:8.8,fontWeight:900}}>🔎 {c.label}</span>):<span style={{color:SOFT,fontSize:9.2}}>Aucun indice : tente un secteur de 1 à 20.</span>}</div></div>;
}


export default function Wave61SharedPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: false });
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const rawModeId = String(props?.forcedModeId || props?.params?.gameId || props?.gameId || resumeRecord?.modeId || resumeRecord?.game?.modeId || "");
  const modeId = rawModeId === "galaxyes" ? "galaxies" : rawModeId;
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const preset = getWave61Preset(spec.id);
  const rawConfig = props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {};
  const config = React.useMemo(() => normalizeWave61Config(spec.id, rawConfig), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i+1}`), name: playerName(p, i) })), [profiles]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null;
  const [state, setState] = React.useState<Wave61State>(() => restored?.mode === "wave61" && restored?.modeId === spec.id ? cloneWave61State(restored) : createWave61State(players, spec.id, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undo, setUndo] = React.useState<Wave61State[]>([]);
  const [notice, setNotice] = React.useState("");
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

  const buildRecord = React.useCallback((s: Wave61State, status: "in_progress" | "finished") => ({
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
    players: profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null })),
    game: { mode: spec.id, modeId: spec.id, engineFamily: s.family, engineVersion: WAVE61_ENGINE_VERSION },
    summary: { mode: spec.id, modeId: spec.id, family: s.family, winnerId: s.winnerId, winnerTeamId: s.winnerTeamId, finalScores: s.scores, finalProgress: s.progress, health: s.health, statsByPlayer: s.statsByPlayer, config: s.config },
    resume: { mode: "wave61", modeId: spec.id, config: s.config, state: cloneWave61State(s), updatedAt: Date.now() },
    payload: { kind: spec.id, mode: spec.id, modeId: spec.id, sport: "darts", config: s.config, stateSnapshot: cloneWave61State(s), visits: s.visits, stats: { players: s.statsByPlayer } },
  }), [profiles, spec.id]);

  const persist = React.useCallback((s: Wave61State) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      void History.upsert(buildRecord(s, "finished")).catch(() => {});
    } else void History.upsert(buildRecord(s, "in_progress")).catch(() => {});
  }, [buildRecord]);

  const commit = React.useCallback((next: Wave61State, previous = state) => {
    setUndo((u) => [...u.slice(-39), cloneWave61State(previous)]);
    setState(next);
    setCurrentThrow([]);
    setMultiplier(1);
    const last = next.visits[next.visits.length - 1];
    setNotice(next.phase === "finished" ? `🏆 ${next.players.find((p) => p.id === next.winnerId)?.name || "Victoire"} remporte ${spec.label}` : (last?.events || []).join(" · "));
    persist(next);
  }, [state, spec.label, persist]);

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

  React.useEffect(() => {
    setMemoryReveal(false);
    if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current);
    return () => { if (memoryTimerRef.current) window.clearTimeout(memoryTimerRef.current); };
  }, [activePlayer?.id, state.roundIndex]);

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
    setCurrentThrow([]);
    setMultiplier(1);
    setState(createWave61State(players, spec.id, config));
  }

  const roundLabel = Math.min(config.rounds, state.roundIndex + 1);
  const teamMode = config.participantMode === "teams";

  return <div style={{ minHeight: "calc(var(--vh,1vh) * 100)", paddingBottom: 18, background: `radial-gradient(circle at 50% 0%,${accent}13,transparent 35%)` }}>
    <PageHeader title={spec.label} subtitle={`${preset.label} · moteur V${WAVE61_ENGINE_VERSION}`} left={<BackDot onClick={() => go?.("wave61_config", { gameId: spec.id })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — règles`} color={accent} glow={`${accent}77`} content={familyRules(spec, preset)} />} />
    {modeTicker ? <div style={{ padding: "5px 8px 1px", maxWidth: 1040, margin: "0 auto" }}><img src={modeTicker} alt={spec.label} style={{ width: "100%", maxHeight: 210, aspectRatio: "800 / 230", objectFit: "cover", borderRadius: 14, display: "block", border: `1px solid ${accent}44`, boxShadow: `0 10px 30px rgba(0,0,0,.36)` }} /></div> : null}
    <div style={{ padding: "7px 8px 18px", maxWidth: 1040, margin: "0 auto", display: "grid", gap: 8 }}>
      <div style={{ ...panelStyle(accent + "45"), padding: 9, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
        <div><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: 1 }}>ROUND {roundLabel}/{config.rounds} · {preset.label.toUpperCase()}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 14, fontWeight: 1000 }}>{state.phase === "finished" ? "Partie terminée" : `${activePlayer?.name || "—"} joue`}</div>{dedicatedPlayHint ? <div style={{ marginTop: 3, color: SOFT, fontSize: 9.2, lineHeight: 1.3 }}>{dedicatedPlayHint}</div> : null}</div>
        <button type="button" onClick={doUndo} disabled={!undo.length} style={actionStyle(accent, !undo.length)}>↶ UNDO</button>
      </div>

      {notice ? <div style={{ borderRadius: 12, padding: "7px 10px", background: `${accent}0d`, border: `1px solid ${accent}2f`, color: "#e9ecf5", fontSize: 10.5, fontWeight: 850 }}>{notice}</div> : null}

      {config?.modeOptions && Object.keys(config.modeOptions).length ? <div style={{ ...panelStyle(accent + "2d"), padding: "7px 9px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: accent, fontSize: 8.8, fontWeight: 1100, letterSpacing: .8 }}>RÉGLAGES MODE</span>
        {Object.entries(config.modeOptions).map(([key, value]: any) => {
          const labels: Record<string,string> = { mineCount: "MINES", scannerStrength: "SCANNER", mineDamage: "DÉGÂTS", connectLength: "ALIGNEMENT", bullColumn: "BULL→COL", codeLength: "CODE", allowRepeats: "RÉPÉTITIONS", cluesPerMiss: "INDICES/ERREUR", sequenceLength: "SÉQUENCE", previewMs: "APERÇU", revealMs: "LUMIÈRE", wrongPenalty: "PÉNALITÉ", headshotBonus: "HEADSHOT", nightDamage: "NUIT", dayVoteMultiplier: "VOTES", medicShield: "BOUCLIER", captureThreshold: "SEUIL", territoryGoal: "OBJECTIF", resourceBoost: "RESSOURCE", baseFort: "FORT", torchStart: "TORCHE", torchDrain: "USURE", chamberNeed: "SALLE", weatherSeverity: "MÉTÉO", oxygenReserve: "OXYGÈNE", climbPower: "ASCENSION", peakThreshold: "SOMMET", burstThreshold: "BURST", burstDamage: "PUISSANCE", shieldCap: "BOUCLIER MAX", energyThreshold: "ÉNERGIE", bullEnergy: "BULL→ÉNERGIE", tripleEnergy: "TRIPLE→ÉNERGIE", trialNeed: "ÉPREUVE", favorThreshold: "FAVEUR", bullFavor: "BULL→FAVEUR", alertGain: "ALERTE", bullStealth: "DISCRÉTION", phaseNeedBonus: "PHASES", attackThreshold: "MENACE", tranquilizerPower: "TRANQUILLISANT", securityDamage: "ATTAQUE" }
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
      {spec.id === "green_vs_red" ? <GreenRedPanel state={state} accent={accent} /> : null}
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
      </> : <ModeEndPanel title={spec.label} winner={state.winnerId} profiles={profiles} legWins={{ [state.winnerId || ""]: 1 }} accent={accent} onReplay={replay} onConfig={() => go?.("wave61_config", { gameId: spec.id })} onGames={() => go?.("games", { gamesView: "all" })} extra={<div style={{ color: SOFT, fontSize: 10.5, lineHeight: 1.5 }}>{state.winnerTeamId ? `Team ${state.winnerTeamId} victorieuse · ` : ""}{preset.label} · {state.visits.length} volées enregistrées</div>} />}
    </div>
  </div>;
}
