// @ts-nocheck
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import React from "react";
import MssSelectorIconButton from "../components/MssSelectorIconButton";
import { HeartLivesChoice, VariantIconChoice } from "../components/config/MssFiveLivesChoices";
import { quickPartyAvatar } from "../lib/quickPartyAvatars";
import teamGoldLogo from "../ui_assets/teams/team_gold.png";
import teamPinkLogo from "../ui_assets/teams/team_pink.png";
import MssParticipantModeIcon from "../components/config/MssParticipantModeIcon";
import { MssQuickPanel, MssQuickChoices, MssQuickRecap, MssQuickStart } from "../components/config/MssQuickClassicControls";
import { useTheme } from "../contexts/ThemeContext";
import MssKillerQuickSettings, { DEFAULT_KILLER_QUICK_RULES } from "../components/config/MssKillerQuickSettings";
import MssKillerQuickAwenaTip from "../components/config/MssKillerQuickAwenaTip";
import MssFiveLivesQuickAwenaTip from "../components/config/MssFiveLivesQuickAwenaTip";
import MssCricketAwenaTip from "../components/config/MssCricketAwenaTip";
import { MssInputMethodChoice } from "../components/config/MssPremiumConfig";

type ModeId = "cricket" | "killer" | "five_lives" | "shanghai" | "halve_it" | "shooter" | "bowling" | "baseball" | "president";
type LayoutMode = "solo" | "duel" | "teams" | "multi";

type Props = {
  modeId: ModeId;
  title?: string;
  params?: any;
  onBack: () => void;
  onStart: (result: { route: string; params: any }) => void;
};

type ModeSpec = {
  title: string;
  minPlayers: number;
  maxPlayers: number;
  defaultPlayers: number;
  allowSolo?: boolean;
  allowTeams?: boolean;
  maxQuickPlayers?: number;
};

const SPECS: Record<ModeId, ModeSpec> = {
  cricket: { title: "CRICKET", minPlayers: 2, maxPlayers: 4, defaultPlayers: 2, allowTeams: true, maxQuickPlayers: 4 },
  killer: { title: "KILLER", minPlayers: 2, maxPlayers: 20, defaultPlayers: 2, allowTeams: true, maxQuickPlayers: 20 },
  five_lives: { title: "5 VIES", minPlayers: 2, maxPlayers: 10, defaultPlayers: 2, allowTeams: true, maxQuickPlayers: 10 },
  shanghai: { title: "SHANGHAI", minPlayers: 2, maxPlayers: 10, defaultPlayers: 2, maxQuickPlayers: 10 },
  halve_it: { title: "HALVE-IT", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  shooter: { title: "SHOOTER", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  bowling: { title: "BOWLING", minPlayers: 1, maxPlayers: 8, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 8 },
  baseball: { title: "BASEBALL", minPlayers: 1, maxPlayers: 12, defaultPlayers: 2, allowSolo: true, allowTeams: true, maxQuickPlayers: 12 },
  president: { title: "PRÉSIDENT", minPlayers: 3, maxPlayers: 8, defaultPlayers: 4, allowSolo: false, allowTeams: false, maxQuickPlayers: 8 },
};

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, Math.round(n))); }
function shuffle<T>(rows: T[]) { const out = [...rows]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function buildTempPlayers(names: string[], count: number, sessionId: string) {
  return Array.from({ length: count }, (_, index) => {
    const id = `${sessionId}-p${index + 1}`;
    return {
      id,
      profileId: null,
      temporaryPlayerId: id,
      isTemporary: true,
      name: String(names[index] || "").trim() || `J${index + 1}`,
      avatarDataUrl: quickPartyAvatar(index, sessionId),
      avatarUrl: quickPartyAvatar(index, sessionId),
      dartSetId: null,
      isBot: false,
    };
  });
}

function quickMeta() {
  return {
    quickParty: true,
    partyMode: "quick",
    profileStatsDeferred: true,
    temporaryParticipants: true,
    sfxEnabled: false,
    voiceEnabled: false,
    sfx: false,
    voice: false,
    audio: { arcadeEnabled: false, hitEnabled: false, voiceEnabled: false, sfxVolume: 0 },
  };
}

export default function QuickPartyModeConfig({ modeId, title, params, onBack, onStart }: Props) {
  const { theme } = useTheme();
  const spec = SPECS[modeId];
  const accent = theme?.primary || "#55e6ff";
  const [layout, setLayout] = React.useState<LayoutMode>(spec.minPlayers > 2 ? "multi" : "duel");
  const [multiCount, setMultiCount] = React.useState(spec.defaultPlayers || 2);
  const [names, setNames] = React.useState<string[]>(() => Array.from({ length: 20 }, (_, i) => `J${i + 1}`));
  const [quickSessionId] = React.useState(() => `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const [killerRules, setKillerRules] = React.useState(DEFAULT_KILLER_QUICK_RULES);
  const [killerQuickStep, setKillerQuickStep] = React.useState(0);
  const isKillerQuick = modeId === "killer";
  const isCricketQuick = modeId === "cricket";
  const [cricketQuickStep,setCricketQuickStep] = React.useState(0);
  const cricketQuickSteps = ["Participants","Scoring","Manches","Départ et saisie","Récapitulatif"];
  const changeCricketQuickStep = (next:number) => {
    setCricketQuickStep(Math.max(0,Math.min(cricketQuickSteps.length-1,next)));
    try { window.scrollTo({top:0,behavior:"auto"}); } catch {}
  };
  const [cricketQuickOrder,setCricketQuickOrder] = React.useState<"selected"|"random">("selected");
  const [cricketQuickInput,setCricketQuickInput] = React.useState<"keypad"|"dartboard">("keypad");
  const isFiveLivesQuick = modeId === "five_lives";
  const [fiveQuickStep,setFiveQuickStep] = React.useState(0);
  const fiveStepNames = ["Participants", "Variante", "Vies de départ", "Ordre de départ", "Récapitulatif"];
  const changeFiveQuickStep = (next:number) => {
    setFiveQuickStep(Math.max(0,Math.min(fiveStepNames.length-1,next)));
    try { window.scrollTo({top:0,behavior:"auto"}); } catch {}
  };
  const killerStepNames = ["Participants", "Règles", "Départ et saisie", "Variantes et audio", "Récapitulatif"];
  const changeKillerQuickStep = (next: number) => {
    setKillerQuickStep(Math.max(0, Math.min(killerStepNames.length - 1, next)));
    try { window.scrollTo({ top: 0, behavior: "auto" }); } catch {}
  };
  const [fiveLives, setFiveLives] = React.useState(5);
  const [fiveAllowEqualScore, setFiveAllowEqualScore] = React.useState(false);
  const [fiveStartOrder, setFiveStartOrder] = React.useState<"random" | "alternate" | "manual" | "bull">("random");
  const [shanghaiRounds, setShanghaiRounds] = React.useState(20);
  const [cricketPoints, setCricketPoints] = React.useState(true);
  const [cricketRounds, setCricketRounds] = React.useState(20);
  const [halvePreset, setHalvePreset] = React.useState<"classic7" | "numbers7" | "extended9" | "expert12">("classic7");
  const [shooterMarks, setShooterMarks] = React.useState(3);
  const [bowlingSets, setBowlingSets] = React.useState(1);
  const [baseballInnings, setBaseballInnings] = React.useState(9);
  const [presidentRounds, setPresidentRounds] = React.useState(5);

  const availableLayouts = React.useMemo(() => {
    const rows: Array<[LayoutMode, string]> = [];
    if (spec.allowSolo) rows.push(["solo", "SOLO"]);
    if (spec.minPlayers <= 2) rows.push(["duel", modeId === "killer" ? "DUEL" : "1 VS 1"]);
    if (spec.allowTeams) rows.push(["teams", modeId === "killer" ? "ÉQUIPES" : "2 VS 2"]);
    rows.push(["multi", "MULTI"]);
    return rows;
  }, [modeId, spec.allowSolo, spec.allowTeams]);

  const playerCount = layout === "solo" ? 1 : layout === "duel" ? 2 : layout === "teams" ? 4 : clamp(multiCount, Math.max(3, spec.minPlayers), spec.maxQuickPlayers || spec.maxPlayers);
  React.useEffect(() => {
    if (layout === "teams" && spec.maxPlayers < 4) setLayout("duel");
    if (layout === "solo" && !spec.allowSolo) setLayout("duel");
  }, [layout, spec]);

  const chip = (active: boolean, color = accent): React.CSSProperties => ({ borderRadius: 12, border: `1px solid ${active ? color : "rgba(255,255,255,.13)"}`, background: active ? `${color}22` : "rgba(255,255,255,.035)", color: active ? color : "rgba(255,255,255,.78)", fontWeight: 950, minHeight: 40, padding: "8px 12px", cursor: "pointer" });

  function updateName(index: number, value: string) { setNames((prev) => { const next = [...prev]; next[index] = value; return next; }); }

  function moveQuickParticipant(index: number, direction: -1 | 1) {
    setNames(prev => {
      const next = [...prev];
      const teamMode = modeId === "killer" && layout === "teams";
      const i = teamMode ? (index < 2 ? 0 : 2) : index;
      const j = i + direction * (teamMode ? 2 : 1);
      if (j < 0 || j + (teamMode ? 1 : 0) >= playerCount) return prev;
      if (teamMode) {
        [next[i], next[j]] = [next[j], next[i]];
        [next[i + 1], next[j + 1]] = [next[j + 1], next[i + 1]];
      } else [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function start() {
    const players = buildTempPlayers(names, playerCount, quickSessionId);
    const meta = quickMeta();
    const teamConfigs = layout === "teams" ? [
      { id: `${players[0].id}-team1`, name: "ÉQUIPE 1", playerIds: [players[0].id, players[1].id], players: [players[0].id, players[1].id], color: "#f7c85c" },
      { id: `${players[2].id}-team2`, name: "ÉQUIPE 2", playerIds: [players[2].id, players[3].id], players: [players[2].id, players[3].id], color: "#4fc3ff" },
    ] : undefined;

    if (modeId === "cricket") {
      onStart({ route: "cricket", params: { ...params, ...meta, launchMode: "quick_play", quickPlayers: players, quickPartyPlayers: players, autoQuickStart: true, quickTeamMode: layout === "teams", quickScoreMode: cricketPoints ? "points" : "no-points", quickMaxRounds: cricketRounds, quickRandomStart: cricketQuickOrder === "random", quickInputMethod: cricketQuickInput } });
      return;
    }

    if (modeId === "killer") {
      const progressive = String(params?.variantId || params?.gameId || "").toLowerCase().includes("progressive");
      const km = { ...meta, sfxEnabled: killerRules.arcadeEnabled || killerRules.hitEnabled, voiceEnabled: killerRules.voiceEnabled,
        sfx: killerRules.arcadeEnabled || killerRules.hitEnabled, voice: killerRules.voiceEnabled,
        audio: { arcadeEnabled: killerRules.arcadeEnabled, hitEnabled: killerRules.hitEnabled, voiceEnabled: killerRules.voiceEnabled, voiceId: "default", sfxVolume: 0.8 } };
      const numbers = shuffle(Array.from({ length: 20 }, (_, i) => i + 1));
      // Même contrat que KILLER Arcade : en 2v2, une entité KILLER par équipe
      // et deux tireurs temporaires qui alternent au fil des passages.
      // Ne jamais envoyer les 4 membres comme 4 adversaires indépendants.
      const killerPlayEntities = layout === "teams"
        ? (teamConfigs || []).map((team, index) => ({
            id: `killer-quick-team-${Date.now()}-${index + 1}`,
            teamId: team.id,
            name: team.name,
            avatarDataUrl: index === 0 ? teamGoldLogo : teamPinkLogo,
            avatarUrl: index === 0 ? teamGoldLogo : teamPinkLogo,
            isBot: false,
            teamMembers: players.slice(index * 2, index * 2 + 2).map((member) => ({
              id: member.id, name: member.name, avatarDataUrl: member.avatarDataUrl, avatarUrl: member.avatarUrl, isBot: false,
            })),
          }))
        : players;
      // Le manuel et le départ à la BULL reprennent l’ordre des tireurs affichés.
      // Pour modifier l’ordre, on déplace les noms dans la section Participants.
      const orderedEntities = killerRules.startOrderMode === "random" ? shuffle(killerPlayEntities) : killerPlayEntities;
      const config: any = {
        id: `killer-quick-${Date.now()}`, mode: "killer", createdAt: Date.now(), variantId: progressive ? "progressive" : "classic", gameId: progressive ? "killer_progressive" : "killer",
        participantMode: layout === "teams" ? "teams" : "players",
        playerFormat: layout === "duel" ? "duel" : layout === "multi" ? "multi" : undefined,
        inputMode: killerRules.inputMode,
        teamCount: layout === "teams" ? 2 : undefined,
        teamSize: layout === "teams" ? 2 : undefined,
        teamNames: layout === "teams" ? ["ÉQUIPE 1", "ÉQUIPE 2"] : undefined,
        progressiveTarget: progressive ? 5 : undefined,
        lives: progressive ? 5 : killerRules.lives,
        becomeRule: progressive ? "single" : killerRules.becomeRule, damageRule: progressive ? "multiplier" : killerRules.damageRule,
        numberAssignMode: progressive ? "throw" : killerRules.numberAssignMode, randomStartOrder: killerRules.startOrderMode === "random", startOrderMode: killerRules.startOrderMode,
        selfHitWhileKiller: !progressive && killerRules.selfHitWhileKiller, selfHitUsesMultiplier: !progressive && killerRules.selfHitWhileKiller && killerRules.selfHitUsesMultiplier,
        lifeSteal: !progressive && killerRules.lifeSteal, blindKiller: !progressive && killerRules.numberAssignMode !== "throw" && killerRules.blindKiller,
        bullSplash: !progressive && killerRules.bullSplash, bullHeal: !progressive && killerRules.bullHeal, bullHealLives: killerRules.bullHealLives, bullHealFull: !progressive && killerRules.bullHealFull,
        bullRotate: !progressive && killerRules.bullRotate, dbullRotate: !progressive && killerRules.bullRotate,
        bullRotationMode: killerRules.bullRotationMode, bullRotationTurns: killerRules.bullRotationTurns,
        shieldOnDBull: !progressive && killerRules.shieldOnDBull, disarmOnDBull: !progressive && killerRules.disarmOnDBull, shieldTurns: killerRules.shieldTurns,
        selectBonusShield: !progressive && killerRules.numberAssignMode === "throw" && killerRules.selectBonusShield, missAutoHit: !progressive && killerRules.missAutoHit,
        resurrectionMode: progressive ? "off" : killerRules.resurrectionMode, resurrectionEnabled: !progressive && killerRules.resurrectionMode !== "off",
        resurrection: !progressive && killerRules.resurrectionMode !== "off", resurrectionLives: killerRules.resurrectionLives,
        players: orderedEntities.map((p, i) => ({ ...p, number: killerRules.numberAssignMode === "throw" || progressive ? 0 : numbers[i] })),
        ...km,
      };
      onStart({ route: "killer_play", params: { ...params, ...km, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "five_lives") {
      const config: any = {
        id: `fiveLives-quick-${Date.now()}`,
        mode: "five_lives",
        createdAt: Date.now(),
        startingLives: fiveLives,
        randomStartOrder: fiveStartOrder === "random",
        startOrderSource: fiveStartOrder === "bull" ? "bull" : fiveStartOrder === "random" ? "random" : "selection",
        startOrderMode: fiveStartOrder,
        allowEqualScore: fiveAllowEqualScore,
        scoreInputMethod: "keypad",
        // Le moteur 5 VIES joue actuellement les quatre membres individuellement.
        // Ces métadonnées conservent la composition Gold/Pink sans prétendre
        // activer un calcul collectif des vies qui n'existe pas encore.
        participantMode: layout === "teams" ? "teams" : "players",
        teamCount: layout === "teams" ? 2 : undefined,
        teamSize: layout === "teams" ? 2 : undefined,
        teamConfigs: layout === "teams" ? teamConfigs : undefined,
        teamAssignments: layout === "teams" ? Object.fromEntries(players.map((p, i) => [p.id, i < 2 ? "gold" : "pink"])) : undefined,
        players,
        ...meta,
      };
      onStart({ route: "five_lives_play", params: { ...params, ...meta, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "shanghai") {
      const targetOrder = Array.from({ length: shanghaiRounds }, (_, i) => i + 1);
      const config: any = { players, maxRounds: shanghaiRounds, winRule: "shanghai_or_points", targetOrderMode: "chronological", targetOrder, ...meta };
      onStart({ route: "shanghai_play", params: { ...params, ...meta, launchMode: "quick_play", config } });
      return;
    }

    if (modeId === "shooter") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "shooter", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", sequencePreset: "classic", randomTargetCount: 10, includeBull: true, hitZone: "any", marksToClear: shooterMarks, maxRounds: 15, penaltyRule: "none", randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "shooter_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "bowling") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "bowling", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", setsToWin: bowlingSets, difficulty: "normal", bullStrike: true, doubleSpare: true, randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "bowling_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "baseball") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "baseball", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players, teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", innings: baseballInnings, extraInnings: true, maxExtraInnings: 3, seventhInningRule: "none", gameVariant: "target", bullTargetMode: "off", bullBonusPoints: 4, missEndsTurn: true, randomOrder: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "baseball_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "president") {
      const selectedIds = players.map((p) => p.id);
      const config: any = { mode: "president", players: selectedIds.length, selectedIds, playersList: players, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", rounds: presidentRounds, handSize: 10, deckCopies: 4, variant: "classic", randomOrder: true, bullJoker: false, coupEtat: false, revolution: false, scoreInputMethod: "keypad", ...meta };
      onStart({ route: "president_play", params: { ...params, ...config, config } });
      return;
    }

    if (modeId === "halve_it") {
      const selectedIds = players.map((p) => p.id);
      const config: any = {
        mode: "halve_it", participantMode: layout === "teams" ? "teams" : "players", players: selectedIds.length, selectedIds, playersList: players,
        teamConfigs, playerDartSets: {}, botIds: [], botsEnabled: false, botLevel: "normal", sequencePreset: halvePreset, startMode: "zero", fixedStartingScore: 40, rounding: "floor", randomOrder: false, scoreInputMethod: "keypad", ...meta,
      };
      onStart({ route: "halve_it_play", params: { ...params, ...config, config } });
    }
  }

  const progressive = String(params?.variantId || params?.gameId || "").toLowerCase().includes("progressive");
  const modeOptions = modeId === "killer" ? (
    <MssKillerQuickSettings rules={killerRules} setRules={setKillerRules} accent={accent} progressive={progressive} section={killerQuickStep === 1 ? "rules" : killerQuickStep === 2 ? "options" : "advanced"} />
  ) : modeId === "five_lives" ? (
    null
  ) : modeId === "shanghai" ? (
    <MssQuickPanel title="Règles · Shanghai">
      <MssQuickChoices label="Nombre de manches" options={[7,10,15,20].map(value => ({ value, label: String(value) }))} value={shanghaiRounds} onChange={setShanghaiRounds} compact />
    </MssQuickPanel>
  ) : modeId === "cricket" ? (
    <>
      {cricketQuickStep === 1 && <MssQuickPanel title="Mode de scoring">
        <MssQuickChoices label="Score" options={[{value:true,label:"AVEC POINTS"},{value:false,label:"SANS POINTS"}]} value={cricketPoints} onChange={setCricketPoints} />
        <p style={{fontSize:12,textAlign:"center",color:"#aeb8cf",lineHeight:1.5}}>{cricketPoints?"Les cibles fermées permettent de marquer si elles sont encore ouvertes chez un adversaire.":"Seules les fermetures des secteurs comptent ; aucun point supplémentaire."}</p>
      </MssQuickPanel>}
      {cricketQuickStep === 2 && <MssQuickPanel title="Limite de manches">
        <MssQuickChoices label="Nombre maximum de manches" options={[10,15,20].map(value => ({value,label:String(value)}))} value={cricketRounds} onChange={setCricketRounds} compact />
      </MssQuickPanel>}
      {cricketQuickStep === 3 && <MssQuickPanel title="Départ et saisie">
        <div style={{display:"grid",gap:12}}>
          <div style={{fontSize:12,fontWeight:950,color:accent}}>ORDRE DE DÉPART</div>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>
            <MssSelectorIconButton icon="alternate-order" label="Ordre sélectionné" accent={accent} active={cricketQuickOrder==="selected"} onClick={()=>setCricketQuickOrder("selected")}/>
            <MssSelectorIconButton icon="random-order" label="Aléatoire" accent={accent} active={cricketQuickOrder==="random"} onClick={()=>setCricketQuickOrder("random")}/>
          </div>
          <div style={{fontSize:12,fontWeight:950,color:accent,textAlign:"center"}}>{cricketQuickOrder==="random"?"ALÉATOIRE":"ORDRE DE SÉLECTION"}</div>
          <div style={{fontSize:12,fontWeight:950,color:accent}}>MODE DE SAISIE</div>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>
            <MssInputMethodChoice icon="keypad" label="Keypad" accent={accent} active={cricketQuickInput==="keypad"} onClick={()=>setCricketQuickInput("keypad")}/>
            <MssInputMethodChoice icon="dartboard" label="Cible" accent={accent} active={cricketQuickInput==="dartboard"} onClick={()=>setCricketQuickInput("dartboard")}/>
          </div>
          <div style={{fontSize:12,fontWeight:950,color:accent,textAlign:"center"}}>{cricketQuickInput==="keypad"?"KEYPAD":"CIBLE"}</div>
        </div>
      </MssQuickPanel>}
    </>
  ) : modeId === "shooter" ? (
    <MssQuickPanel title="Règles · Shooter">
      <MssQuickChoices label="Marques pour valider" options={[1,3,5].map(value => ({value,label:String(value)}))} value={shooterMarks} onChange={setShooterMarks} compact />
    </MssQuickPanel>
  ) : modeId === "bowling" ? (
    <MssQuickPanel title="Règles · Bowling">
      <MssQuickChoices label="Format du match" options={[{value:1,label:"BO1"},{value:2,label:"BO3"},{value:3,label:"BO5"}]} value={bowlingSets} onChange={setBowlingSets} />
    </MssQuickPanel>
  ) : modeId === "baseball" ? (
    <MssQuickPanel title="Règles · Baseball">
      <MssQuickChoices label="Nombre de manches" options={[5,7,9].map(value => ({value,label:String(value)}))} value={baseballInnings} onChange={setBaseballInnings} compact />
    </MssQuickPanel>
  ) : modeId === "president" ? (
    <MssQuickPanel title="Règles · Président">
      <MssQuickChoices label="Nombre de manches" options={[1,3,5,7].map(value => ({value,label:String(value)}))} value={presidentRounds} onChange={setPresidentRounds} compact />
    </MssQuickPanel>
  ) : (
    <MssQuickPanel title="Règles · Halve-It">
      <MssQuickChoices label="Parcours" options={[
        {value:"classic7" as const,label:"CLASSIQUE 7"},
        {value:"numbers7" as const,label:"DÉBUTANT"},
        {value:"extended9" as const,label:"ÉTENDU 9"},
        {value:"expert12" as const,label:"EXPERT 12"},
      ]} value={halvePreset} onChange={setHalvePreset} />
    </MssQuickPanel>
  );

  const choices = availableLayouts.filter(([kind]) => kind !== "solo" || spec.allowSolo);
  const ruleOverview: [string, string | number][] = modeId === "killer" ? [
    ["Vies", progressive ? 5 : killerRules.lives],
    ["Devenir KILLER", progressive ? "SIMPLE" : killerRules.becomeRule === "double" ? "DOUBLE" : "SIMPLE"],
    ["Dégâts", progressive || killerRules.damageRule === "multiplier" ? "S / D / T" : "−1 par impact"],
    ["Numéros", progressive || killerRules.numberAssignMode === "throw" ? "Au lancer" : "Aléatoires"],
    ["Saisie", killerRules.inputMode.toUpperCase()],
  ] : modeId === "five_lives" ? [["Variante", fiveAllowEqualScore ? "Relais" : "Classique"], ["Vies", fiveLives], ["Départ", fiveStartOrder === "random" ? "Aléatoire" : fiveStartOrder === "alternate" ? "Alterné" : fiveStartOrder === "manual" ? "Manuel" : "Bull"]]
    : modeId === "shanghai" ? [["Manches", shanghaiRounds]]
    : modeId === "cricket" ? [["Score", cricketPoints ? "Avec points" : "Sans points"], ["Manches", cricketRounds], ["Départ", cricketQuickOrder === "random" ? "Aléatoire" : "Sélection"], ["Saisie", cricketQuickInput === "keypad" ? "KEYPAD" : "CIBLE"]]
    : modeId === "shooter" ? [["Marques", shooterMarks]]
    : modeId === "bowling" ? [["Format", `BO${bowlingSets * 2 - 1}`]]
    : modeId === "baseball" ? [["Manches", baseballInnings]]
    : modeId === "president" ? [["Manches", presidentRounds]]
    : [["Parcours", {classic7:"Classique 7",numbers7:"Débutant",extended9:"Étendu 9",expert12:"Expert 12"}[halvePreset]]];

  return (
    <div style={{ color: "#fff", minHeight: "100%", padding: "10px 12px 100px", display: "grid", gap: 12, alignContent: "start" }}>
      <DartsQuickHeader modeId={modeId} title={title || spec.title} onBack={onBack} />
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", display: "grid", gap: 12 }}>
        <DartsQuickIntro title={title || spec.title} />
        {isKillerQuick && <section aria-label="Étapes de la partie rapide KILLER" style={{ borderRadius: 18, border: `1px solid ${accent}66`, padding: "12px 13px", background: "rgba(9,12,24,.95)", display: "grid", gap: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 13, fontWeight: 950, letterSpacing: .6, color: accent }}>PARTIE RAPIDE · KILLER</strong>
            <span style={{ fontSize: 11, color: "#b9c3d4", fontWeight: 800 }}>Étape {killerQuickStep + 1}/{killerStepNames.length}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#f5f6fc" }}>{killerStepNames[killerQuickStep]}</div>
          <div role="group" aria-label="Choisir une étape" style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {killerStepNames.map((name, i) => <button type="button" key={name} aria-label={`Étape ${i + 1} : ${name}`} aria-current={killerQuickStep === i ? "step" : undefined} onClick={() => changeKillerQuickStep(i)} style={{ width: 33, height: 33, borderRadius: 11, border: `1px solid ${killerQuickStep === i ? accent : "rgba(255,255,255,.18)"}`, background: killerQuickStep === i ? `${accent}22` : "rgba(255,255,255,.025)", color: killerQuickStep === i ? accent : "#aeb8ca", fontWeight: 900, cursor: "pointer" }}>{i + 1}</button>)}
          </div>
          <div role="progressbar" aria-label="Progression" aria-valuemin={0} aria-valuemax={killerStepNames.length} aria-valuenow={killerQuickStep + 1} style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}><div style={{ width: `${((killerQuickStep + 1) / killerStepNames.length) * 100}%`, height: "100%", borderRadius: 999, background: accent }} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            <button type="button" disabled={killerQuickStep === 0} onClick={() => changeKillerQuickStep(killerQuickStep - 1)} style={{ ...chip(false), opacity: killerQuickStep === 0 ? .4 : 1 }}>← Précédent</button>
            <button type="button" disabled={killerQuickStep === killerStepNames.length - 1} onClick={() => changeKillerQuickStep(killerQuickStep + 1)} style={{ ...chip(killerQuickStep < killerStepNames.length - 1), opacity: killerQuickStep === killerStepNames.length - 1 ? .4 : 1 }}>Suivant →</button>
          </div>
        </section>}
        {isCricketQuick && <section aria-label="Étapes partie rapide Cricket" style={{borderRadius:18,border:`1px solid ${accent}66`,padding:"12px 13px",background:"rgba(9,12,24,.95)",display:"grid",gap:11}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:7,alignItems:"center"}}><strong style={{color:accent,fontSize:13}}>PARTIE RAPIDE · CRICKET</strong><span style={{color:"#b9c3d4",fontSize:11}}>Étape {cricketQuickStep+1}/5</span></div>
          <div style={{fontWeight:800,fontSize:12}}>{cricketQuickSteps[cricketQuickStep]}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>{cricketQuickSteps.map((name,i)=><button key={name} type="button" onClick={()=>changeCricketQuickStep(i)} aria-label={`Étape ${i+1} : ${name}`} aria-current={cricketQuickStep===i?"step":undefined} style={{width:33,height:33,borderRadius:11,border:`1px solid ${cricketQuickStep===i?accent:"#ffffff2a"}`,background:cricketQuickStep===i?`${accent}22`:"#ffffff07",color:cricketQuickStep===i?accent:"#b4bdd0",fontWeight:900}}>{i+1}</button>)}</div>
          <div style={{height:4,background:"#ffffff1c",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${(cricketQuickStep+1)*20}%`,background:accent}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button type="button" disabled={cricketQuickStep===0} onClick={()=>changeCricketQuickStep(cricketQuickStep-1)} style={{...chip(false),opacity:cricketQuickStep===0?.35:1}}>← Précédent</button><button type="button" disabled={cricketQuickStep===4} onClick={()=>changeCricketQuickStep(cricketQuickStep+1)} style={{...chip(cricketQuickStep<4),opacity:cricketQuickStep===4?.35:1}}>Suivant →</button></div>
        </section>}
        {isFiveLivesQuick && <section aria-label="Étapes partie rapide 5 Vies" style={{borderRadius:18,border:`1px solid ${accent}66`,padding:"12px 13px",background:"rgba(9,12,24,.95)",display:"grid",gap:11}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:7,alignItems:"center"}}><strong style={{color:accent,fontSize:13}}>PARTIE RAPIDE · 5 VIES</strong><span style={{color:"#b9c3d4",fontSize:11}}>Étape {fiveQuickStep+1}/{fiveStepNames.length}</span></div>
          <div style={{fontWeight:800,fontSize:12}}>{fiveStepNames[fiveQuickStep]}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>{fiveStepNames.map((name,i)=><button key={name} type="button" onClick={()=>changeFiveQuickStep(i)} aria-label={`Étape ${i+1} : ${name}`} aria-current={fiveQuickStep===i?"step":undefined} style={{width:33,height:33,borderRadius:11,border:`1px solid ${fiveQuickStep===i?accent:"#ffffff2a"}`,background:fiveQuickStep===i?`${accent}22`:"#ffffff07",color:fiveQuickStep===i?accent:"#b4bdd0",fontWeight:900}}>{i+1}</button>)}</div>
          <div style={{height:4,background:"#ffffff1c",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${(fiveQuickStep+1)*100/fiveStepNames.length}%`,background:accent}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button type="button" disabled={fiveQuickStep===0} onClick={()=>changeFiveQuickStep(fiveQuickStep-1)} style={{...chip(false),opacity:fiveQuickStep===0?.35:1}}>← Précédent</button><button type="button" disabled={fiveQuickStep===fiveStepNames.length-1} onClick={()=>changeFiveQuickStep(fiveQuickStep+1)} style={{...chip(fiveQuickStep<fiveStepNames.length-1),opacity:fiveQuickStep===fiveStepNames.length-1?.35:1}}>Suivant →</button></div>
        </section>}
        {(!isKillerQuick || killerQuickStep === 0) && (!isFiveLivesQuick || fiveQuickStep === 0) && (!isCricketQuick || cricketQuickStep === 0) && <MssQuickPanel title="Participants">
          <div role="group" aria-label="Format des participants" style={{ display: "grid", gridTemplateColumns: `repeat(${choices.length === 4 ? 2 : Math.min(3, choices.length)},minmax(0,1fr))`, gap: 8 }}>
            {choices.map(([key, text]) => {
              const active = key === layout;
              return <button key={key} type="button" aria-pressed={active} onClick={() => setLayout(key)}
                style={{ minWidth: 0, minHeight: 85, borderRadius: 16, display: "grid", placeContent: "center", justifyItems: "center", gap: 8,
                  border: `1px solid ${active ? accent : `${accent}60`}`, background: active ? `${accent}24` : "rgba(255,255,255,.025)",
                  color: accent, cursor: "pointer", fontWeight: 950, fontSize: 12 }}>
                {key === "solo" ? <svg width="35" height="35" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg>
                  : <MssParticipantModeIcon kind={key === "teams" ? "teams" : key === "multi" ? "multi" : "duel"} size={35} />}
                <span>{key === "duel" ? "DUEL" : text}</span>
              </button>;
            })}
          </div>
          {layout === "teams" && <div style={{ color: "#b2bed5", fontSize: 12, textAlign: "center" }}>2 équipes · 2 joueurs chacune · noms et avatars MSS temporaires. Les vies restent individuelles dans le moteur actuel.</div>}
          {layout === "multi" && <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <button type="button" aria-label="Retirer un joueur" disabled={playerCount <= Math.max(3, spec.minPlayers)}
              onClick={() => setMultiCount(n => clamp(n - 1, Math.max(3, spec.minPlayers), spec.maxQuickPlayers || spec.maxPlayers))}
              style={{ ...chip(false), borderRadius: "50%", width: 42, height: 42, padding: 0, opacity: playerCount <= Math.max(3, spec.minPlayers) ? .45 : 1 }}>−</button>
            <strong style={{ fontSize: 13, color: accent }}>{playerCount} JOUEURS</strong>
            <button type="button" aria-label="Ajouter un joueur" disabled={playerCount >= (spec.maxQuickPlayers || spec.maxPlayers)}
              onClick={() => setMultiCount(n => clamp(n + 1, Math.max(3, spec.minPlayers), spec.maxQuickPlayers || spec.maxPlayers))}
              style={{ ...chip(false), borderRadius: "50%", width: 42, height: 42, padding: 0, opacity: playerCount >= (spec.maxQuickPlayers || spec.maxPlayers) ? .45 : 1 }}>+</button>
          </div>}
          {layout === "teams" && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {[[teamGoldLogo,"TEAM GOLD"],[teamPinkLogo,"TEAM PINK"]].map(([src, label]) => <div key={label} style={{ display: "flex", justifyContent: "center", gap: 7, alignItems: "center", border: `1px solid ${accent}42`, borderRadius: 12, padding: 6 }}>
              <img src={src} alt="" width={33} height={33} style={{ objectFit: "contain" }} /><strong style={{ fontSize: 10, color: accent }}>{label}</strong>
            </div>)}
          </div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            {Array.from({ length: playerCount }, (_, i) => <label key={i} style={{ display: "flex", gap: 7, alignItems: "center", minWidth: 0,
              border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, background: "rgba(255,255,255,.04)", padding: "6px 8px" }}>
              <img src={quickPartyAvatar(i, quickSessionId)} draggable={false} alt="" width={38} height={38}
                style={{ width: 38, height: 38, objectFit: "cover", borderRadius: "50%", border: `1px solid ${accent}77`, flexShrink: 0 }} />
              <span style={{ display: "grid", gap: 1, flex: 1, minWidth: 0 }}>
                <span style={{ color: accent, fontSize: 10, fontWeight: 950 }}>{layout === "teams" ? `ÉQ.${i < 2 ? 1 : 2} · J${i + 1}` : `J${i + 1}`}</span>
                <input type="text" value={names[i] || ""} maxLength={22} aria-label={`Nom du participant ${i + 1}`}
                  onFocus={e => e.currentTarget.select()} onChange={e => updateName(i, e.target.value)}
                  style={{ width: "100%", minWidth: 0, background: "transparent", border: 0, outline: 0, color: "#fff", fontSize: 12, fontWeight: 900 }} />
              </span>
            </label>)}
          </div>
        </MssQuickPanel>}
        {modeId === "killer" && killerQuickStep === 2 && (killerRules.startOrderMode === "manual" || killerRules.startOrderMode === "bull") && <MssQuickPanel title="Ordre des passages">
          <p style={{ margin: 0, fontSize: 11, color: "#aeb6cb" }}>{killerRules.startOrderMode === "bull" ? "Classe les participants après le lancer à la BULL." : "Déplace les joueurs ou équipes avant le départ."}</p>
          {Array.from({ length: layout === "teams" ? 2 : playerCount }, (_, pos) => {
            const isTeams = layout === "teams";
            const index = isTeams ? pos * 2 : pos;
            const display = isTeams ? `Équipe ${pos + 1} · ${names[index] || `J${index + 1}`} / ${names[index + 1] || `J${index + 2}`}` : names[index] || `J${index + 1}`;
            return <div key={pos} style={{ display: "grid", gridTemplateColumns: "22px minmax(0,1fr) 36px 36px", gap: 7, alignItems: "center" }}>
              <span style={{ color: accent, fontWeight: 950 }}>{pos + 1}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{display}</span>
              <button type="button" aria-label={`Monter ${display}`} disabled={pos === 0} onClick={() => moveQuickParticipant(index, -1)} style={{ ...chip(false), padding: 0, minWidth: 0, opacity: pos === 0 ? .3 : 1 }}>↑</button>
              <button type="button" aria-label={`Descendre ${display}`} disabled={pos === (isTeams ? 1 : playerCount - 1)} onClick={() => moveQuickParticipant(index, 1)} style={{ ...chip(false), padding: 0, minWidth: 0, opacity: pos === (isTeams ? 1 : playerCount - 1) ? .3 : 1 }}>↓</button>
            </div>;
          })}
        </MssQuickPanel>}
        {isFiveLivesQuick && fiveQuickStep === 1 && <MssQuickPanel title="Variante de jeu">
          <div style={{display:"flex",justifyContent:"center",gap:14,alignItems:"center"}}>
            <VariantIconChoice accent={accent} active={!fiveAllowEqualScore} title="Classique" subtitle="Classique" mode="classic" onClick={()=>setFiveAllowEqualScore(false)} />
            <VariantIconChoice accent={accent} active={fiveAllowEqualScore} title="Relais" subtitle="Relais" mode="relay" onClick={()=>setFiveAllowEqualScore(true)} />
          </div>
          <div style={{textAlign:"center",display:"grid",gap:7}}>
            <strong style={{color:accent,fontSize:15,fontWeight:1000}}>{fiveAllowEqualScore?"RELAIS":"CLASSIQUE"}</strong>
            <p style={{maxWidth:360,margin:"0 auto",color:"#b5bfd7",fontSize:12,lineHeight:1.5}}>
              {fiveAllowEqualScore?"RELAIS : l'égalité est autorisée pour valider la volée. Le rythme est plus souple, tout en gardant le même défi de survie.":"CLASSIQUE : le score de chaque nouvelle volée doit être strictement supérieur au précédent. La pression augmente au fil de la partie."}
            </p>
          </div>
        </MssQuickPanel>}
        {isFiveLivesQuick && fiveQuickStep === 2 && <MssQuickPanel title="Vies de départ">
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:9,justifyItems:"center"}}>
            {[3,5,7,10].map(value=><HeartLivesChoice key={value} value={value} active={fiveLives===value} onClick={()=>setFiveLives(value)} primary={accent} />)}
          </div>
          <p style={{fontSize:11,color:"#b5bfd7",textAlign:"center",margin:0}}>Tous les participants commencent avec le nombre de vies sélectionné.</p>
        </MssQuickPanel>}
        {isFiveLivesQuick && fiveQuickStep === 3 && <MssQuickPanel title="Ordre de départ">
          <div style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
            {([
              {id:"random",icon:"random-order",label:"Aléatoire"},
              {id:"alternate",icon:"alternate-order",label:"Alterné"},
              {id:"manual",icon:"manual-pick",label:"Manuel"},
              {id:"bull",icon:"bull-order",label:"Bull"},
            ] as const).map(mode=><MssSelectorIconButton key={mode.id} icon={mode.icon} label={mode.label} accent={accent} active={fiveStartOrder===mode.id} onClick={()=>setFiveStartOrder(mode.id)} />)}
          </div>
          <div style={{display:"grid",textAlign:"center",gap:6}}>
            <strong style={{fontSize:13,color:accent}}>{({random:"ALÉATOIRE",alternate:"ALTERNÉ",manual:"MANUEL",bull:"BULL"} as const)[fiveStartOrder]}</strong>
            <p style={{fontSize:11,lineHeight:1.5,color:"#b5bfd7",margin:0}}>{({random:"L'ordre est mélangé au lancement.",alternate:"L'ordre suit la liste des participants sélectionnés.",manual:"L'ordre actuel des participants est conservé ; modifie-le à l'étape Participants.",bull:"Effectue un lancer réel à la BULL puis classe les participants selon le résultat."} as const)[fiveStartOrder]}</p>
          </div>
        </MssQuickPanel>}
        {(!isKillerQuick || killerQuickStep === 1 || killerQuickStep === 2 || killerQuickStep === 3) && (!isFiveLivesQuick) && modeOptions}
        {(!isKillerQuick || killerQuickStep === 4) && (!isFiveLivesQuick || fiveQuickStep === 4) && (!isCricketQuick || cricketQuickStep === 4) && <MssQuickRecap entries={[
          ["Mode", title || spec.title],
          ["Participants", layout === "teams" ? "2 équipes · 2 joueurs" : `${playerCount} joueur${playerCount > 1 ? "s" : ""} · ${layout.toUpperCase()}`],
          ...ruleOverview,
          ...(modeId === "killer" ? [["Variantes", [killerRules.selfHitWhileKiller && "auto-pénalité", killerRules.lifeSteal && "vol de vies", killerRules.bullSplash && "dégâts BULL", killerRules.bullHeal && "soins", killerRules.bullHealFull && "soins max", killerRules.shieldOnDBull && "bouclier", killerRules.disarmOnDBull && "désarmement", killerRules.resurrectionMode !== "off" && "résurrection"].filter(Boolean).join(" · ") || "Aucune"] as [string,string]] : []),
        ]} />}
        {(!isKillerQuick || killerQuickStep === 4) && (!isFiveLivesQuick || fiveQuickStep === 4) && (!isCricketQuick || cricketQuickStep === 4) && <MssQuickStart onClick={start} />}
        {isFiveLivesQuick && fiveQuickStep === 4 && <MssFiveLivesQuickAwenaTip />}
        {isCricketQuick && cricketQuickStep === 4 && <MssCricketAwenaTip quick />}
        {isKillerQuick && killerQuickStep === 4 && <MssKillerQuickAwenaTip />}
      </div>
    </div>
  );
}
