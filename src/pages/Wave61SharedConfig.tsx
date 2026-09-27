// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { DARTS_WAVE_61 } from "../games/dartsWave61";
import { getWave61Preset } from "../games/dartsWave61Families";
import { loadBotPlayers } from "../lib/bots";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { getTicker } from "../lib/tickers";
import { WAVE61_ENGINE_VERSION } from "../lib/gameEngines/wave61Engine";

const BUILTIN_BOTS = [
  { id: "wave61_bot_easy", name: "Arcade Rookie", isBot: true, botLevel: "easy" },
  { id: "wave61_bot_normal", name: "Arcade Pilot", isBot: true, botLevel: "normal" },
  { id: "wave61_bot_hard", name: "Arcade Ace", isBot: true, botLevel: "hard" },
];

export type Wave61DedicatedOption = {
  key: string;
  label: string;
  type: "select" | "toggle" | "number";
  defaultValue: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  help?: string;
};

function isBotLike(p: any) { return Boolean(p?.isBot || p?.bot || p?.kind === "bot" || p?.botLevel); }
function avatarOf(p: any) { return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoDataUrl ?? null; }
function normalizeProfile(p: any, isBot = false) { return { ...p, id: String(p?.id || p?.profileId || ""), name: String(p?.name || p?.displayName || (isBot ? "BOT" : "Joueur")), avatarDataUrl: avatarOf(p), isBot: isBot || !!p?.isBot }; }
function shuffle<T>(items: T[]) { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

export default function Wave61SharedConfig(props: any) {
  const go = props?.go ?? props?.setTab;
  const store = props?.store ?? props?.params?.store ?? null;
  const rawModeId = String(props?.forcedModeId || props?.params?.gameId || props?.gameId || "");
  const modeId = rawModeId === "galaxyes" ? "galaxies" : rawModeId;
  const spec = DARTS_WAVE_61.find((m) => m.id === modeId) || DARTS_WAVE_61[0];
  const preset = getWave61Preset(spec.id);
  const { theme } = useTheme();
  const accent = preset.accent || theme?.primary || "#ffb13b";
  const key = `dc_wave61_cfg_${spec.id}`;
  const saved = React.useMemo(() => { try { const parsed = JSON.parse(localStorage.getItem(key) || "null"); return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; } }, [key]);
  const dedicatedOptions: Wave61DedicatedOption[] = Array.isArray(props?.dedicatedOptions) ? props.dedicatedOptions : [];
  const dedicatedIntro = String(props?.dedicatedIntro || "");
  const dedicatedDefaults = React.useMemo(() => Object.fromEntries(dedicatedOptions.map((option) => [option.key, option.defaultValue])), [spec.id]);
  const [modeOptions, setModeOptions] = React.useState<Record<string, any>>(() => ({ ...dedicatedDefaults, ...(saved?.modeOptions && typeof saved.modeOptions === "object" ? saved.modeOptions : {}) }));

  const storeProfiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => storeProfiles.filter((p: any) => !isBotLike(p)).map((p: any) => normalizeProfile(p)), [storeProfiles]);
  const botProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    BUILTIN_BOTS.forEach((b) => map.set(b.id, b));
    try { loadBotPlayers().forEach((b: any) => map.set(String(b.id), normalizeProfile({ ...b, isBot: true }, true))); } catch {}
    return [...map.values()];
  }, []);
  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles], [humanProfiles, botProfiles]);
  const profileById = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);

  const lockedRounds = spec.id === "nine_dart_century" ? 3 : spec.id === "double_down" ? 9 : spec.id === "athletisme" ? 6 : null;
  const lockedGoal = spec.id === "nine_dart_century" ? 100 : spec.id === "shove_a_penny" ? 21 : spec.id === "green_vs_red" ? 10 : spec.id === "mont_blanc" ? 4809 : spec.id === "everest" ? 8849 : spec.id === "summit_14" ? 14 : null;
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.map(String).slice(0, spec.maxPlayers) : []);
  const [botsOpen, setBotsOpen] = React.useState(saved.botsOpen === true);
  const [participantMode, setParticipantMode] = React.useState<"players" | "teams">(saved.participantMode === "teams" && spec.supportsTeams ? "teams" : "players");
  const [difficulty, setDifficulty] = React.useState<"easy" | "normal" | "hard">(saved.difficulty === "easy" || saved.difficulty === "hard" ? saved.difficulty : "normal");
  const [botLevel, setBotLevel] = React.useState<"easy" | "normal" | "hard">(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState(Number(lockedRounds ?? saved.rounds ?? preset.defaultRounds));
  const [goal, setGoal] = React.useState(Number(lockedGoal ?? saved.goal ?? preset.defaultGoal));
  const [lives, setLives] = React.useState(Number(saved.lives ?? preset.defaultLives));
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");

  React.useEffect(() => {
    if (selectedIds.length) return;
    const active = String(store?.activeProfileId || "");
    const first = humanProfiles.find((p: any) => String(p.id) === active) || humanProfiles[0];
    const second = humanProfiles.find((p: any) => p.id !== first?.id) || botProfiles[1] || botProfiles[0];
    const seed = [first?.id, preset.minPlayers > 1 ? second?.id : null].filter(Boolean).map(String);
    if (seed.length) setSelectedIds(seed.slice(0, spec.maxPlayers));
  }, [humanProfiles.length, botProfiles.length]);

  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ selectedIds, botsOpen, participantMode, difficulty, botLevel, rounds, goal, lives, randomOrder, scoreInputMethod, modeOptions })); } catch {}
  }, [key, selectedIds, botsOpen, participantMode, difficulty, botLevel, rounds, goal, lives, randomOrder, scoreInputMethod, modeOptions]);

  function togglePlayer(rawId: any) {
    const id = String(rawId || "");
    if (!id) return;
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= spec.maxPlayers ? prev : [...prev, id]);
  }

  const selectedProfiles = selectedIds.map((id) => profileById.get(id)).filter(Boolean);
  const minPlayers = Math.min(spec.maxPlayers, preset.minPlayers);
  const valid = selectedProfiles.length >= minPlayers;
  const botCount = selectedProfiles.filter(isBotLike).length;
  const familyText = `${preset.label} · moteur mutualisé V${WAVE61_ENGINE_VERSION}`;
  const modeTicker = React.useMemo(() => getTicker(spec.id), [spec.id]);

  function start() {
    if (!valid || typeof go !== "function") return;
    const baseIds = selectedProfiles.map((p: any) => String(p.id));
    const orderedIds = randomOrder ? shuffle(baseIds) : baseIds;
    const playersList = orderedIds.map((id) => profileById.get(id)).filter(Boolean).map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur" }));
    const teamByPlayer: Record<string, string> = {};
    if (participantMode === "teams") orderedIds.forEach((id, index) => { teamByPlayer[id] = index % 2 === 0 ? "A" : "B"; });
    const payload = {
      modeId: spec.id,
      selectedIds: orderedIds,
      players: orderedIds.length,
      playersList,
      botIds: playersList.filter(isBotLike).map((p: any) => String(p.id)),
      botsEnabled: playersList.some(isBotLike),
      participantMode,
      teamByPlayer,
      difficulty,
      botLevel,
      rounds: Number(lockedRounds ?? Math.max(1, Math.min(60, Number(rounds) || preset.defaultRounds))),
      goal: Number(lockedGoal ?? Math.max(0, Number(goal) || 0)),
      lives: Math.max(0, Math.min(9, Number(lives) || 0)),
      randomOrder,
      scoreInputMethod,
      modeOptions,
      engineFamily: preset.family,
      engineVersion: WAVE61_ENGINE_VERSION,
    };
    try { recordProfileUsageForMode(spec.id, orderedIds); } catch {}
    go("wave61_play", { gameId: spec.id, config: payload });
  }

  const card: React.CSSProperties = { borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(16,18,30,.96),rgba(7,9,16,.98))", border: `1px solid ${accent}35`, boxShadow: "0 15px 36px rgba(0,0,0,.38)" };
  const pill = (active: boolean): React.CSSProperties => ({ minHeight: 36, padding: "7px 12px", borderRadius: 999, border: `1px solid ${active ? accent : "rgba(255,255,255,.12)"}`, background: active ? `${accent}1c` : "rgba(255,255,255,.035)", color: active ? "#fff" : "#aeb5c8", fontWeight: 950 });

  return <div className="page" style={{ minHeight: "100dvh", paddingBottom: 88, background: `radial-gradient(circle at 50% 0%,${accent}14,transparent 34%)` }}>
    <PageHeader title={spec.label} subtitle={familyText} left={<BackDot onClick={() => go?.("games", { gamesView: "all" })} color={accent} glow={`${accent}88`} />} right={<InfoDot title={`${spec.label} — moteur ${preset.label}`} color={accent} glow={`${accent}77`} content={<div style={{ lineHeight: 1.55 }}><b>{spec.infoBody}</b>{dedicatedIntro ? <><br /><br /><b style={{ color: accent }}>CONFIGURATION DÉDIÉE</b><br />{dedicatedIntro}</> : null}<br /><br />Architecture dédiée : ce mode passe par son propre fichier Config tout en réutilisant le moteur mutualisé <b>{preset.label}</b>.</div>} />} />
    {modeTicker ? <div style={{ padding: "6px 10px 2px", maxWidth: 980, margin: "0 auto" }}><img src={modeTicker} alt={spec.label} style={{ width: "100%", aspectRatio: "800 / 230", objectFit: "cover", borderRadius: 16, display: "block", border: `1px solid ${accent}44`, boxShadow: `0 12px 34px rgba(0,0,0,.38)` }} /></div> : null}
    <div style={{ padding: "8px 10px 20px", maxWidth: 980, margin: "0 auto", display: "grid", gap: 10 }}>
      <section style={card}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Participants</div>
        {spec.supportsTeams ? <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><button style={pill(participantMode === "players")} onClick={() => setParticipantMode("players")}>JOUEURS</button><button style={pill(participantMode === "teams")} onClick={() => setParticipantMode("teams")}>2 ÉQUIPES AUTO</button></div> : null}
        <PlayerPagedSelector usageMode={spec.id} profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} pageSize={9} modalTitle="Choisir des joueurs" showSelectedSummary={true} />
        {spec.supportsBots ? <div style={{ marginTop: 10 }}>
          <button type="button" onClick={() => setBotsOpen((v) => !v)} style={pill(botsOpen)}>{botsOpen ? "☑ BOTS OUVERTS" : "☐ AJOUTER DES BOTS"}</button>
          {botsOpen ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={botProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={accent} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} /></div> : null}
        </div> : null}
        <div style={{ marginTop: 10, color: valid ? accent : "#ff97aa", fontSize: 11, fontWeight: 900 }}>{valid ? `${selectedProfiles.length} participant(s) prêt(s)${botCount ? ` · ${botCount} BOT(S)` : ""}` : `Sélectionne au moins ${minPlayers} participant(s).`}</div>
        {participantMode === "teams" ? <div style={{ marginTop: 7, color: "#9299ad", fontSize: 10.5 }}>Répartition Wave61 automatique A/B en alternance. Le sélecteur d'équipes complet sera affiné lors de la finalisation de chaque mode.</div> : null}
      </section>

      <section style={card}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Moteur · {preset.label}</div>
        <OptionRow label="Difficulté"><OptionSelect value={difficulty} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setDifficulty} /></OptionRow>
        {botCount ? <OptionRow label="Niveau BOT"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow> : null}
        <OptionRow label={`Nombre de rounds${lockedRounds ? " · verrouillé" : ""}`}><input type="number" min={1} max={60} value={lockedRounds ?? rounds} disabled={lockedRounds != null} onChange={(e) => setRounds(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: lockedRounds != null ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.28)", color: lockedRounds != null ? "#9ba2b3" : "#fff", padding: "8px 9px", fontWeight: 900 }} /></OptionRow>
        {preset.defaultGoal > 0 ? <OptionRow label={`Objectif moteur${lockedGoal ? " · verrouillé" : ""}`}><input type="number" min={1} max={9999} value={lockedGoal ?? goal} disabled={lockedGoal != null} onChange={(e) => setGoal(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: lockedGoal != null ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.28)", color: lockedGoal != null ? "#9ba2b3" : "#fff", padding: "8px 9px", fontWeight: 900 }} /></OptionRow> : null}
        {preset.defaultLives > 0 ? <OptionRow label="Vies"><OptionSelect value={lives} options={[3,4,5,6,7]} onChange={(v: any) => setLives(Number(v))} /></OptionRow> : null}
        <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
        <OptionRow label="Saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
      </section>

      {dedicatedOptions.length ? <section style={{ ...card, borderColor: `${accent}4d` }}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Réglages propres à {spec.label}</div>
        {dedicatedIntro ? <div style={{ color: "#aeb5c8", fontSize: 10.5, lineHeight: 1.5, marginBottom: 8 }}>{dedicatedIntro}</div> : null}
        {dedicatedOptions.map((option) => {
          const value = modeOptions?.[option.key] ?? option.defaultValue;
          const setValue = (next: any) => setModeOptions((prev) => ({ ...prev, [option.key]: next }));
          return <div key={option.key} style={{ marginBottom: 4 }}>
            <OptionRow label={option.label}>
              {option.type === "toggle" ? <OptionToggle value={!!value} onChange={setValue} /> : option.type === "number" ? <input type="number" min={option.min} max={option.max} step={option.step || 1} value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ width: 82, borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.28)", color: "#fff", padding: "8px 9px", fontWeight: 900 }} /> : <OptionSelect value={value} options={option.options || []} onChange={setValue} />}
            </OptionRow>
            {option.help ? <div style={{ color: "#777f91", fontSize: 9.3, lineHeight: 1.35, padding: "0 4px 5px" }}>{option.help}</div> : null}
          </div>;
        })}
      </section> : null}

      <section style={{ ...card, borderColor: valid ? `${accent}66` : "rgba(255,255,255,.08)" }}>
        <div style={{ color: "#aeb5c8", fontSize: 11, lineHeight: 1.55 }}><b style={{ color: "#fff" }}>{spec.label}</b> utilise désormais le moteur <b style={{ color: accent }}>{preset.label}</b>. La sauvegarde/reprise, l'Undo, les bots, le scoring par dart et l'écran de fin sont branchés dans le socle commun.</div>
        <button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 48, marginTop: 12, borderRadius: 14, border: `1px solid ${valid ? accent : "rgba(255,255,255,.1)"}`, background: valid ? `linear-gradient(180deg,${accent}33,${accent}12)` : "rgba(255,255,255,.03)", color: valid ? "#fff" : "#5e6474", fontWeight: 1100, letterSpacing: .8 }}>LANCER {spec.label}</button>
      </section>
    </div>
  </div>;
}
