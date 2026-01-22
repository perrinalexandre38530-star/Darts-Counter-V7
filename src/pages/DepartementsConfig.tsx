// ============================================
// src/pages/DepartementsConfig.tsx
// TERRITORIES (ex-Départements) — CONFIG
// OPTION A (UX clarifiée) :
// - Carrousel pays : drapeau + nom sur la même ligne, pas de "SELECTED"
// - Carrousel joueurs : sélection jusqu'à 6
// - Teams : AFFICHAGE STRUCTUREL (slots + noms uniquement) -> PAS de médaillons qui dépassent
// - Entêtes : simples en couleur thème (pas d'encadré néon ajouté ici)
// - Boutons "i" (explications) par bloc
// - Bouton "Démarrer la partie" identique aux autres configs (btn-primary w-full)
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import ProfileAvatar from "../components/ProfileAvatar";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS, type TerritoryMap } from "../lib/territories/maps";

type BotLevel = "easy" | "normal" | "hard";

export type TerritoriesConfigPayload = {
  players: number;

  // ✅ Teams
  teamSize: 1 | 2 | 3;
  // ✅ Selected players (humans + bots)
  selectedIds: string[];
  // ✅ Team assignment (only when teamSize > 1)
  teamsById?: Record<string, number>;

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number; // nb territoires à posséder pour gagner
  mapId: string;
};

const INFO_RULES = `TERRITORIES
- Choisis une carte (pays) dans le configurateur.
- Sélectionne jusqu'à 6 participants (profils + bots).
- Solo : chacun pour soi.
- 2v2 / 3v3 : l'influence + la capture sont comptées par TEAM (dans le PLAY).
- Objectif : posséder X territoires (config) ou fin des rounds.
`;

const INFO_MAPS = `CARTE (PAYS)
- Le pays sélectionné définit la liste de zones/territoires.
- 20 zones sont tirées de cette carte au début de la partie.
- Le ticker affiché dépend du pays.`;

const INFO_PLAYERS = `JOUEURS
- Sélectionne les participants qui jouent cette partie.
- Maximum 6 participants.
- Tu peux ajouter des profils dans "Profils".
- Tu peux aussi activer des bots (si disponibles).`;

const INFO_TEAMS = `MODE ÉQUIPES
- Solo : chacun pour soi.
- 2v2 : chaque team = 2 joueurs.
- 3v3 : chaque team = 3 joueurs.
- Règle : le nombre de joueurs doit être un multiple de la taille d'équipe,
  et il faut au minimum 2 teams (ex: 4 joueurs en 2v2, 6 joueurs en 3v3).`;

const INFO_BOTS = `BOTS IA
- Active pour compléter des places.
- "Auto-complete" ajoute des bots jusqu'au minimum requis,
  et tente d'atteindre un multiple correct en mode équipes.`;

const MAP_ORDER = ["FR", "EN", "IT", "DE", "ES", "US", "CN", "AU", "JP", "RU", "WORLD"];
const LS_BOTS_KEY = "dc_bots_v1";

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const flagGlob = import.meta.glob("../assets/flags/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTerritoriesTicker(tickerId: string): string | null {
  const id = String(tickerId || "").toLowerCase();
  const suffix = `/ticker_territories_${id}.png`;
  for (const k of Object.keys(tickerGlob)) {
    if (k.toLowerCase().endsWith(suffix)) return tickerGlob[k];
  }
  return null;
}

function findFlag(id: string): string | null {
  const code = String(id || "").toLowerCase();
  for (const k of Object.keys(flagGlob)) {
    const kl = k.toLowerCase();
    if (kl.endsWith(`/${code}.png`)) return flagGlob[k];
  }
  // fallback: EN => GB si tu utilises GB.png
  if (code === "en") {
    for (const k of Object.keys(flagGlob)) {
      if (k.toLowerCase().endsWith("/gb.png")) return flagGlob[k];
    }
  }
  return null;
}

function clampTeamSize(v: any): 1 | 2 | 3 {
  const n = Number(v);
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 1;
}

type BotLite = { id: string; name: string; avatarDataUrl: string | null; botLevel?: string };

function readUserBotsFromLS(): BotLite[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as any[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((b) => ({
        id: String(b.id),
        name: b.name || "BOT",
        avatarDataUrl: b.avatarDataUrl ?? null,
        botLevel: b.botLevel ?? b.levelLabel ?? b.levelName ?? b.performanceLevel ?? b.difficulty ?? "",
      }))
      .filter((b) => !!b.id);
  } catch {
    return [];
  }
}

function isBotLike(p: any) {
  if (!p) return false;
  if (p.isBot || p.bot || p.type === "bot" || p.kind === "bot") return true;
  if (typeof p.botLevel === "string" && p.botLevel) return true;
  if (typeof p.level === "string" && p.level) return true;
  return false;
}

function botToFakeProfile(b: BotLite) {
  return {
    id: b.id,
    name: b.name,
    avatarDataUrl: b.avatarDataUrl,
    isBot: true,
    botLevel: b.botLevel || "",
  } as any;
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  const theme = useTheme();

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const humanProfiles = storeProfiles.filter((p) => p && !isBotLike(p));

  const primary = (theme as any)?.primary ?? "#7dffca";
  const primarySoft = (theme as any)?.primarySoft ?? "rgba(125,255,202,0.16)";
  const cardBg = "rgba(10, 12, 24, 0.96)";

  // ---------------- state
  const [mapId, setMapId] = React.useState<string>(() => "FR");

  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);

  const maxPlayers = 6;
  const minPlayers = teamSize === 1 ? 2 : teamSize * 2;

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 6);
    } catch {}
    return [];
  });

  // team assignment
  const [teamsById, setTeamsById] = React.useState<Record<string, number>>({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  // bots list
  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => setUserBots(readUserBotsFromLS()), []);

  const maps: TerritoryMap[] = React.useMemo(() => {
    const list = MAP_ORDER.map((id) => TERRITORY_MAPS[id]).filter(Boolean);
    const extras = Object.values(TERRITORY_MAPS).filter((m) => !MAP_ORDER.includes(m.id));
    return [...list, ...extras];
  }, []);

  const profileById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of storeProfiles) if (p?.id) m.set(String(p.id), p);
    for (const b of userBots) m.set(String(b.id), botToFakeProfile(b));
    return m;
  }, [storeProfiles, userBots]);

  function goBack() {
    if ((props as any)?.go) return (props as any).go("games");
    if ((props as any)?.setTab) return (props as any).setTab("games");
    window.history.back();
  }

  function goProfiles() {
    if ((props as any)?.go) return (props as any).go("profiles");
    if ((props as any)?.setTab) return (props as any).setTab("profiles");
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        const next = prev.filter((x) => x !== id);
        setTeamsById((tb) => {
          const n = { ...tb };
          delete n[id];
          return n;
        });
        setPendingId((p) => (p === id ? null : p));
        return next;
      }
      if (prev.length >= maxPlayers) return prev;
      return [...prev, id];
    });
  }

  // keep teamsById clean when players removed
  React.useEffect(() => {
    setTeamsById((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!selectedIds.includes(k)) delete next[k];
      }
      return next;
    });
    if (pendingId && !selectedIds.includes(pendingId)) setPendingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // If bots disabled, remove bot ids from selection
  React.useEffect(() => {
    if (botsEnabled) return;
    const botIds = new Set(userBots.map((b) => b.id));
    setSelectedIds((prev) => prev.filter((id) => !botIds.has(id)));
    setTeamsById((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (botIds.has(id)) delete next[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botsEnabled, userBots]);

  const teamsCount = React.useMemo(() => {
    if (teamSize === 1) return 0;
    const exact = Math.floor(selectedIds.length / teamSize);
    return Math.max(2, exact || 2);
  }, [selectedIds.length, teamSize]);

  const slots = React.useMemo(() => {
    if (teamSize === 1) return [];
    const out: Array<Array<string | null>> = Array.from({ length: teamsCount }, () =>
      Array.from({ length: teamSize }, () => null)
    );

    // place ids based on teamsById (first-come to first empty slot)
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= teamsCount) continue;
      for (let s = 0; s < teamSize; s++) {
        if (!out[te][s]) {
          out[te][s] = id;
          break;
        }
      }
    }
    return out;
  }, [teamSize, teamsCount, selectedIds, teamsById]);

  const unassigned = React.useMemo(() => {
    if (teamSize === 1) return [];
    const assigned = new Set<string>();
    for (const team of slots) for (const id of team) if (id) assigned.add(id);
    return selectedIds.filter((id) => !assigned.has(id));
  }, [slots, selectedIds, teamSize]);

  function assignToTeam(teamIndex: number, slotIndex: number) {
    if (teamSize === 1) return;
    if (!pendingId) return;

    // prevent overfill same team beyond teamSize by checking slot empty (caller ensures)
    setTeamsById((prev) => ({ ...prev, [pendingId]: teamIndex }));
    setPendingId(null);
  }

  function unassignId(id: string) {
    setTeamsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingId(null);
  }

  function autoFillTeams() {
    if (teamSize === 1) return;

    const ids = [...unassigned];
    if (!ids.length) return;

    // Fill team by team, slot by slot
    for (let te = 0; te < teamsCount; te++) {
      for (let s = 0; s < teamSize; s++) {
        if (slots[te]?.[s]) continue;
        if (!ids.length) return;
        const id = ids.shift()!;
        setTeamsById((prev) => ({ ...prev, [id]: te }));
      }
    }
  }

  function autoCompleteWithBots() {
    if (!botsEnabled) return;
    const botIds = userBots.map((b) => b.id).filter(Boolean);
    if (!botIds.length) return;

    setSelectedIds((prev) => {
      let next = [...prev];

      // reach minimum
      for (const id of botIds) {
        if (next.length >= maxPlayers) break;
        if (!next.includes(id)) next.push(id);
        if (next.length >= minPlayers) break;
      }

      // in teams mode, try to reach a proper multiple (without forcing max)
      while (teamSize > 1 && next.length < maxPlayers && next.length % teamSize !== 0) {
        const cand = botIds.find((id) => !next.includes(id));
        if (!cand) break;
        next.push(cand);
      }

      return next;
    });
  }

  const selectionValid = React.useMemo(() => {
    if (selectedIds.length < minPlayers) return false;
    if (selectedIds.length > maxPlayers) return false;

    if (teamSize === 1) return true;

    if (selectedIds.length % teamSize !== 0) return false;
    const exactTeams = selectedIds.length / teamSize;
    if (exactTeams < 2) return false;

    const counts = Array.from({ length: exactTeams }, () => 0);
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= exactTeams) return false;
      counts[te]++;
    }
    return counts.every((c) => c === teamSize);
  }, [selectedIds, minPlayers, maxPlayers, teamSize, teamsById]);

  const payload: TerritoriesConfigPayload = {
    players: selectedIds.length,
    teamSize,
    selectedIds,
    teamsById: teamSize === 1 ? undefined : teamsById,
    botsEnabled,
    botLevel,
    rounds,
    objective,
    mapId,
  };

  function start() {
    if (!selectionValid) return;
    try {
      localStorage.setItem("dc_modecfg_departements", JSON.stringify(payload));
    } catch {}
    if ((props as any)?.go) return (props as any).go("departements_play", { config: payload });
    if ((props as any)?.setTab) return (props as any).setTab("departements_play", { config: payload });
  }

  const titleStyle: React.CSSProperties = { color: primary, fontWeight: 1100, letterSpacing: 0.6 };

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_RULES} />}
      />

      {/* MAPS */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={titleStyle}>{t("territories.map", "Carte (pays)")}</span>
            <InfoDot title="Carte (pays)" content={INFO_MAPS} />
          </div>
        }
      >
        <div className="dc-scroll-thin" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10 }}>
          {maps.map((m) => {
            const selected = m.id === mapId;
            const src = findTerritoriesTicker(m.tickerId);
            const flag = findFlag(m.id);

            return (
              <button
                key={m.id}
                onClick={() => setMapId(m.id)}
                style={{
                  minWidth: 240,
                  maxWidth: 240,
                  textAlign: "left",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: selected ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
                  background: selected ? primarySoft : "rgba(255,255,255,0.04)",
                  boxShadow: selected ? `0 12px 28px ${primary}22` : "0 10px 24px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {/* Flag + Name (same line) - no "SELECTED" */}
                <div style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  {flag ? (
                    <img
                      src={flag}
                      alt={`${m.id} flag`}
                      draggable={false}
                      style={{
                        width: 28,
                        height: 18,
                        objectFit: "cover",
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.14)",
                        opacity: 0.95,
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 18,
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.18)",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 1100,
                        opacity: 0.95,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.1,
                      }}
                    >
                      {m.name}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 950, marginLeft: 6 }}>{m.id}</div>
                </div>

                <div style={{ padding: 10, paddingTop: 0 }}>
                  <div
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      aspectRatio: "800 / 330",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={`ticker ${m.id}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.95 }}
                        draggable={false}
                      />
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>
                        ticker_territories_{m.tickerId}.png manquant
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* PLAYERS */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={titleStyle}>{t("config.players", "Joueurs")}</span>
            <InfoDot title="Joueurs" content={INFO_PLAYERS} />
          </div>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
            Sélection : {selectedIds.length}/{maxPlayers} — min {minPlayers}
            {teamSize > 1 && selectedIds.length > 0 && selectedIds.length % teamSize !== 0 && (
              <span style={{ marginLeft: 10, opacity: 0.9 }}>(multiple de {teamSize})</span>
            )}
          </div>
          <button className="btn-secondary" onClick={goProfiles}>
            + Profils
          </button>
        </div>

        {humanProfiles.length === 0 ? (
          <p style={{ fontSize: 13, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
            Aucun profil local. Crée des joueurs dans <b>Profils</b>.
          </p>
        ) : (
          <div
            className="dc-scroll-thin"
            style={{
              display: "flex",
              gap: 18,
              overflowX: "auto",
              paddingBottom: 10,
              marginTop: 12,
              paddingLeft: 8,
            }}
          >
            {humanProfiles.map((p: any) => {
              const active = selectedIds.includes(p.id);
              const isPending = pendingId === p.id;

              return (
                <div
                  key={p.id}
                  style={{
                    minWidth: 122,
                    maxWidth: 122,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    flexShrink: 0,
                    userSelect: "none",
                  }}
                >
                  <div
                    role="button"
                    onClick={() => togglePlayer(p.id)}
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: "50%",
                      overflow: "hidden",
                      boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                      outline: isPending ? `2px solid ${primary}` : "none",
                      outlineOffset: 2,
                      background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    title={active ? "Clique pour retirer" : "Clique pour ajouter"}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        overflow: "hidden",
                        filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                        opacity: active ? 1 : 0.6,
                        transition: "filter .2s ease, opacity .2s ease",
                      }}
                    >
                      <ProfileAvatar profile={p as any} size={78} />
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      color: active ? "#f6f2e9" : "#7e8299",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>

                  {teamSize > 1 && active && (
                    <button
                      onClick={() => setPendingId((prev) => (prev === p.id ? null : p.id))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${primary}66`,
                        background: isPending ? primarySoft : "rgba(0,0,0,0.18)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 950,
                        cursor: "pointer",
                      }}
                      title="Clique puis assigne dans TEAMS"
                    >
                      {isPending ? "En attente" : "Assigner"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mode équipes */}
        <OptionRow
          label={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 1000 }}>Mode équipes</span>
              <InfoDot title="Mode équipes" content={INFO_TEAMS} />
            </div>
          }
        >
          <OptionSelect
            value={teamSize}
            options={[
              { value: 1, label: "Solo" },
              { value: 2, label: "2 v 2" },
              { value: 3, label: "3 v 3" },
            ]}
            onChange={(v: any) => {
              const next = clampTeamSize(v);
              setTeamSize(next);
              setTeamsById({});
              setPendingId(null);
            }}
          />
        </OptionRow>

        {/* TEAMS PANEL — STRUCTURE ONLY (no avatars, no overflow) */}
        {teamSize > 1 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1100, letterSpacing: 0.6, color: primary }}>TEAMS</div>
              <button className="btn-secondary" onClick={autoFillTeams}>
                Auto-fill
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, fontWeight: 900 }}>
              1) Clique “Assigner” sous un joueur • 2) Clique un slot vide • 3) Chaque team = {teamSize} joueurs.
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.92, fontWeight: 950 }}>
              {pendingId ? (
                <>
                  Joueur à assigner :{" "}
                  <span style={{ color: primary }}>{(profileById.get(pendingId)?.name as string) || pendingId}</span>{" "}
                  — clique un slot vide.
                </>
              ) : (
                <>Sélectionne un joueur puis clique “Assigner”.</>
              )}
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              {Array.from({ length: teamsCount }, (_, te) => te).map((te) => {
                const teamSlots = slots[te] || Array.from({ length: teamSize }, () => null);
                const filled = teamSlots.filter(Boolean).length;
                const ok = filled === teamSize;

                return (
                  <div
                    key={te}
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      border: ok ? `1px solid ${primary}44` : "1px solid rgba(255,255,255,0.10)",
                      background: ok ? primarySoft : cardBg,
                      boxShadow: ok ? `0 10px 26px ${primary}1a` : "0 10px 24px rgba(0,0,0,0.35)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 1100 }}>Team {te + 1}</div>
                      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
                        {filled}/{teamSize}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: `repeat(${teamSize}, minmax(0,1fr))`,
                        gap: 10,
                      }}
                    >
                      {teamSlots.map((id, sIdx) => {
                        const isEmpty = !id;
                        const p = id ? profileById.get(id) : null;
                        const name = (p?.name as string) || id || "—";

                        return (
                          <button
                            key={sIdx}
                            onClick={() => {
                              if (isEmpty) return assignToTeam(te, sIdx);
                              setPendingId(id);
                            }}
                            style={{
                              borderRadius: 14,
                              padding: 10,
                              border: isEmpty ? "1px dashed rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.12)",
                              background: isEmpty ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.06)",
                              cursor: isEmpty ? (pendingId ? "pointer" : "not-allowed") : "pointer",
                              minHeight: 72,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 8,
                            }}
                            title={isEmpty ? (pendingId ? "Clique pour assigner" : "Sélectionne un joueur d'abord") : "Clique pour sélectionner ce joueur"}
                          >
                            {isEmpty ? (
                              <div style={{ opacity: 0.85, fontWeight: 950, fontSize: 12, textAlign: "center" }}>
                                Slot {sIdx + 1}
                              </div>
                            ) : (
                              <>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 1000,
                                    opacity: 0.95,
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
                                  }}
                                >
                                  {name}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    unassignId(id);
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    background: "rgba(0,0,0,0.18)",
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 950,
                                    cursor: "pointer",
                                  }}
                                >
                                  Retirer
                                </button>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {unassigned.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                Non assignés : {unassigned.map((id) => (profileById.get(id)?.name as string) || id).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* BOTS */}
        <div
          style={{
            marginTop: 12,
            borderRadius: 16,
            padding: 12,
            background: cardBg,
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <OptionRow
            label={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 1000 }}>Bots IA</span>
                <InfoDot title="Bots IA" content={INFO_BOTS} />
              </div>
            }
          >
            <OptionToggle value={botsEnabled} onChange={setBotsEnabled} />
          </OptionRow>

          {botsEnabled && (
            <>
              <OptionRow label="Difficulté IA">
                <OptionSelect
                  value={botLevel}
                  options={[
                    { value: "easy", label: "Easy" },
                    { value: "normal", label: "Normal" },
                    { value: "hard", label: "Hard" },
                  ]}
                  onChange={setBotLevel}
                />
              </OptionRow>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>Bots : {userBots.length}</div>
                <button className="btn-secondary" onClick={autoCompleteWithBots} disabled={!userBots.length}>
                  Auto-complete
                </button>
              </div>

              {userBots.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 8 }}>
                  Aucun bot personnalisé trouvé (dc_bots_v1).
                </div>
              ) : (
                <div className="dc-scroll-thin" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 10 }}>
                  {userBots.map((b) => {
                    const active = selectedIds.includes(b.id);
                    const fakeProfile = botToFakeProfile(b);

                    return (
                      <div
                        key={b.id}
                        style={{
                          minWidth: 122,
                          maxWidth: 122,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 7,
                          flexShrink: 0,
                          userSelect: "none",
                        }}
                      >
                        <div
                          role="button"
                          onClick={() => togglePlayer(b.id)}
                          style={{
                            width: 78,
                            height: 78,
                            borderRadius: "50%",
                            overflow: "hidden",
                            boxShadow: active ? `0 0 28px ${primary}aa` : "0 0 14px rgba(0,0,0,0.65)",
                            background: active ? `radial-gradient(circle at 30% 20%, #fff8d0, ${primary})` : "#111320",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          title={active ? "Clique pour retirer" : "Clique pour ajouter"}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              overflow: "hidden",
                              filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                              opacity: active ? 1 : 0.6,
                            }}
                          >
                            <ProfileAvatar profile={fakeProfile} size={78} showStars={false} />
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            textAlign: "center",
                            color: active ? "#f6f2e9" : "#7e8299",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {!selectionValid && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, fontWeight: 950 }}>
            Configuration invalide : sélectionne {minPlayers} joueurs minimum
            {teamSize > 1 ? `, un multiple de ${teamSize}, et remplis toutes les teams.` : "."}
          </div>
        )}
      </Section>

      {/* RULES */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={titleStyle}>{t("config.rules", "Règles")}</span>
          </div>
        }
      >
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
        </OptionRow>
      </Section>

      {/* START */}
      <Section>
        <button className="btn-primary w-full" onClick={start} disabled={!selectionValid}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </Section>
    </div>
  );
}
