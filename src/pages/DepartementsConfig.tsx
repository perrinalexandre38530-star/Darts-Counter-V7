// src/pages/DepartementsConfig.tsx
import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
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

const INFO_TEXT = `TERRITORIES (Départements)

Objectif
- Posséder X territoires (réglage "Objectif") ou, à la fin des Rounds, être l’équipe/la personne qui en possède le plus.

Déroulement (en match)
1) Le header indique qui doit jouer (TEAM Gold / TEAM Pink, ou joueur en Solo).
2) Choisis un territoire à attaquer (carte + liste).
3) Joue une volée de 3 fléchettes : chaque flèche = 1 "touche".
4) À 3 touches, le territoire est capturé par l’équipe/joueur.

Règles importantes
- Une touche sur un territoire déjà capturé n’a pas d’effet (sauf si une variante est ajoutée plus tard).
- En mode équipes, l’influence et les captures sont comptées par TEAM.

Conseils
- Utilise la carte pour repérer rapidement les zones déjà prises / encore libres.
`;

// Alphabetical order (carousel)
const MAP_ORDER = ["AU", "CN", "DE", "EN", "ES", "FR", "IT", "JP", "RU", "US", "WORLD"];
const LS_BOTS_KEY = "dc_bots_v1";

const tickerGlob = import.meta.glob("../assets/tickers/ticker_territories_*.png", {
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

const FLAG_GLOB = import.meta.glob("../assets/flags/*.png", { eager: true, import: "default" }) as Record<
  string,
  string
>;

function findFlagForMapId(mapId: string): string | null {
  const id = String(mapId || "").toUpperCase();
  const suffix = `/${id}.png`;
  for (const k of Object.keys(FLAG_GLOB)) {
    if (k.toUpperCase().endsWith(suffix)) return FLAG_GLOB[k];
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

const PRO_BOTS: BotLite[] = [
  { id: "pro_green_machine", name: "Green Machine", avatarDataUrl: avatarGreenMachine, botLevel: "hard" },
  { id: "pro_snake_king", name: "Snake King", avatarDataUrl: avatarSnakeKing, botLevel: "hard" },
  { id: "pro_wonder_kid", name: "Wonder Kid", avatarDataUrl: avatarWonderKid, botLevel: "hard" },
  { id: "pro_ice_man", name: "Ice Man", avatarDataUrl: avatarIceMan, botLevel: "hard" },
];

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

// ---------- Inline Info (simple modal)
function InfoMini({
  title,
  content,
  onOpen,
}: {
  title: string;
  content: string;
  onOpen: (t: string, c: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(title, content)}
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#fff",
        fontSize: 12,
        fontWeight: 1000,
        lineHeight: "22px",
        textAlign: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
      aria-label="info"
      title={title}
    >
      i
    </button>
  );
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

  const primary = (theme as any)?.primary ?? "#7dffca";
  const primarySoft = (theme as any)?.primarySoft ?? "rgba(125,255,202,0.16)";

  // ---------- state
  const [mapId, setMapId] = React.useState<string>(() => "FR");

  const [teamSize, setTeamSize] = React.useState<1 | 2 | 3>(1);
  const [botsEnabled, setBotsEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState<BotLevel>("normal");
  const [rounds, setRounds] = React.useState(12);
  const [objective, setObjective] = React.useState(10);

  const [targetSelectionMode, setTargetSelectionMode] = React.useState<"free" | "by_score">("free");
  const [victoryMode, setVictoryMode] = React.useState<"territories" | "regions" | "time">("territories");
  const [objectiveRegions, setObjectiveRegions] = React.useState<number>(3);
  const [timeLimitMin, setTimeLimitMin] = React.useState<number>(20);
  // selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("dc_modecfg_departements");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.selectedIds)) return parsed.selectedIds.slice(0, 6);
    } catch {}
    return [];
  });

  // Team assignment (Option A: Teams panel with slots)
  const [teamsById, setTeamsById] = React.useState<Record<string, number>>({});
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  // Inline info modal
  const [infoModal, setInfoModal] = React.useState<{ title: string; content: string } | null>(null);

  // Map carousel (infinite loop feel)
  const mapStripRef = React.useRef<HTMLDivElement | null>(null);
  const mapCardWidthRef = React.useRef<number>(0);

  const maps = React.useMemo(() => {
    return MAP_ORDER.map((id) => ({ id, ...TERRITORY_MAPS[id] })).filter((m) => !!m);
  }, []);

  const loopMaps = React.useMemo(() => {
    // triple list to allow scroll-wrap
    return [...maps, ...maps, ...maps];
  }, [maps]);

  React.useLayoutEffect(() => {
    const el = mapStripRef.current;
    if (!el) return;
    // Move initial scroll to the middle copy
    requestAnimationFrame(() => {
      const third = el.scrollWidth / 3;
      el.scrollLeft = third;
      // Estimate card width (first child)
      const first = el.querySelector<HTMLElement>("[data-map-card='1']");
      if (first) mapCardWidthRef.current = first.getBoundingClientRect().width;
    });
  }, [loopMaps.length]);

  const onMapStripScroll = React.useCallback(() => {
    const el = mapStripRef.current;
    if (!el) return;
    const third = el.scrollWidth / 3;
    if (el.scrollLeft < third * 0.35) el.scrollLeft += third;
    else if (el.scrollLeft > third * 1.65) el.scrollLeft -= third;
  }, []);

  const cycleMap = React.useCallback(
    (dir: -1 | 1) => {
      const idx = MAP_ORDER.indexOf(mapId as any);
      const n = MAP_ORDER.length;
      const nextId = MAP_ORDER[(idx + dir + n) % n];
      setMapId(nextId);

      // Also scroll to keep it centered-ish
      const el = mapStripRef.current;
      if (!el) return;
      const cw = mapCardWidthRef.current || 240;
      el.scrollBy({ left: dir * (cw + 14), behavior: "smooth" });
    },
    [mapId]
  );

  // bots list (PRO + bots personnalisés)
  const [userBots, setUserBots] = React.useState<BotLite[]>([]);
  React.useEffect(() => {
    const custom = readUserBotsFromLS();
    const merged: BotLite[] = [];
    const pushUnique = (b: BotLite) => {
      if (!b?.id) return;
      if (merged.some((x) => x.id === b.id)) return;
      merged.push(b);
    };
    PRO_BOTS.forEach(pushUnique);
    custom.forEach(pushUnique);
    setUserBots(merged);
  }, []);

  // store profiles (humans)
  const storeProfiles: any[] = ((store as any)?.profiles || []) as any[];
  const humanProfiles = storeProfiles.filter((p) => p && !isBotLike(p));

  const maxPlayers = 6;
  const minPlayers = teamSize === 1 ? 2 : teamSize * 2;

  // (maps) is already memoized above (alphabetical order)

  function goBack() {
    if ((props as any)?.go) return (props as any).go("games");
    if ((props as any)?.setTab) return (props as any).setTab("games");
    window.history.back();
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

  // ✅ Toujours 2 TEAMS en mode équipes (Team 1 + Team 2)
  const neededTeams = React.useMemo(() => {
    if (teamSize === 1) return 0;
    return 2;
  }, [teamSize]);

  // Team slots model (2 teams fixes)
  const slots = React.useMemo(() => {
    if (teamSize === 1) return [];
    const out: Array<Array<string | null>> = Array.from({ length: 2 }, () =>
      Array.from({ length: teamSize }, () => null)
    );
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te >= 2) continue;
      for (let s = 0; s < teamSize; s++) {
        if (!out[te][s]) {
          out[te][s] = id;
          break;
        }
      }
    }
    return out;
  }, [teamSize, selectedIds, teamsById]);

  const unassigned = React.useMemo(() => {
    if (teamSize === 1) return [];
    const assigned = new Set<string>();
    for (const team of slots) for (const id of team) if (id) assigned.add(id);
    return selectedIds.filter((id) => !assigned.has(id));
  }, [slots, selectedIds, teamSize]);

  function assignToTeam(teamIndex: number) {
    if (teamSize === 1) return;
    if (!pendingId) return;
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
    const ids = [...unassigned]; // ✅ inclut humains + bots sélectionnés
    if (!ids.length) return;

    for (let te = 0; te < 2; te++) {
      for (let s = 0; s < teamSize; s++) {
        if (slots[te]?.[s]) continue;
        if (!ids.length) return;
        const id = ids.shift()!;
        setTeamsById((prev) => ({ ...prev, [id]: te }));
      }
    }
    setPendingId(null);
  }

  function autoCompleteWithBots() {
    // Ne rien faire si la sélection est déjà complète/valide (évite d'ajouter un bot inutilement)
    if (selectionValid) return;
    if (!botsEnabled) return;
    const botIds = userBots.map((b) => b.id).filter(Boolean);
    if (!botIds.length) return;

    setSelectedIds((prev) => {
      // ✅ Ne rien ajouter si la sélection est déjà suffisante
      // - Solo: minPlayers atteint
      // - Équipes: on exige exactement 2 teams => teamSize*2 joueurs
      if (teamSize === 1 && prev.length >= minPlayers) return prev;
      if (teamSize > 1 && prev.length >= teamSize * 2) return prev;

      let next = [...prev];

      // fill to target
      const target = teamSize === 1 ? minPlayers : teamSize * 2;
      for (const id of botIds) {
        if (next.length >= maxPlayers) break;
        if (next.length >= target) break;
        if (!next.includes(id)) next.push(id);
      }

      return next;
    });

    // ✅ et on auto-remplit les teams (humains + bots)
    setTimeout(() => {
      try {
        autoFillTeams();
      } catch {}
    }, 0);
  }

  const selectionValid = React.useMemo(() => {
    if (selectedIds.length < minPlayers) return false;
    if (selectedIds.length > maxPlayers) return false;

    if (teamSize === 1) return true;

    // ✅ mode équipes = EXACTEMENT 2 teams, donc EXACTEMENT 2 * teamSize joueurs
    if (selectedIds.length !== teamSize * 2) return false;

    // Every selected id must be assigned and each team must have exactly teamSize members
    const counts = [0, 0];
    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number" || te < 0 || te > 1) return false;
      counts[te]++;
    }
    return counts[0] === teamSize && counts[1] === teamSize;
  }, [selectedIds, minPlayers, maxPlayers, teamSize, teamsById]);

  const payload: TerritoriesConfigPayload = {
    players: selectedIds.length,
    teamSize,
    selectedIds,
    teamsById: teamSize === 1 ? undefined : teamsById,
    botsEnabled,
    botLevel,
    rounds,
    objective, // kept for backward compatibility = territories target
    objectiveTerritories: objective,
    targetSelectionMode,
    victoryMode,
    objectiveRegions,
    timeLimitMin,
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

  const cardBg = "rgba(10, 12, 24, 0.96)";

  // Resolve profile by id (humans + bots)
  const profileById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of storeProfiles) if (p?.id) m.set(String(p.id), p);
    for (const b of userBots) m.set(String(b.id), botToFakeProfile(b));
    return m;
  }, [storeProfiles, userBots]);

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* Inline info modal */}
      {infoModal && (
        <div
          onClick={() => setInfoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 92vw)",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(10,12,24,0.96)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 1100, letterSpacing: 0.6 }}>{infoModal.title}</div>
              <button
                onClick={() => setInfoModal(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.35, opacity: 0.9, whiteSpace: "pre-wrap" }}>
              {infoModal.content}
            </div>
          </div>
        </div>
      )}

      {/* MAPS CAROUSEL */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("territories.map", "Carte (pays)")}</span>
            <InfoMini
              title="Carte (pays)"
              content={"La carte choisie définit la liste des territoires (zones) utilisés pendant la partie, et le ticker affiché."}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Prev */}
          <button
            type="button"
            onClick={() => {
              // wrap selection
              const idx = MAP_ORDER.indexOf(mapId as any);
              const prev = MAP_ORDER[(idx - 1 + MAP_ORDER.length) % MAP_ORDER.length];
              setMapId(prev);
              // keep carousel visually centered
              if (mapStripRef.current && mapCardWidthRef.current) {
                mapStripRef.current.scrollLeft -= (mapCardWidthRef.current + 14);
              }
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.35)",
              color: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
            aria-label="Précédent"
            title="Précédent"
          >
            ‹
          </button>

          {/* Infinite-feel strip */}
          <div
            ref={mapStripRef}
            className="dc-scroll-thin"
            style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10, flex: 1, scrollSnapType: "x mandatory" }}
            onScroll={() => {
              const el = mapStripRef.current;
              if (!el) return;
              const third = el.scrollWidth / 3;
              if (!third) return;
              if (el.scrollLeft < third * 0.3) el.scrollLeft += third;
              else if (el.scrollLeft > third * 1.7) el.scrollLeft -= third;
            }}
          >
            {loopMaps.map((m, idx) => {
            const selected = m.id === mapId;
            const src = findTerritoriesTicker(m.tickerId);
            const flag = findFlagForMapId(m.id);

            return (
              <button
                key={`${m.id}-${idx}`}
                ref={idx === 0 ? (el) => {
                  // measure one card width once
                  if (el && !mapCardWidthRef.current) {
                    mapCardWidthRef.current = (el as HTMLButtonElement).getBoundingClientRect().width;
                  }
                } : undefined}
                onClick={() => setMapId(m.id)}
                style={{
                  minWidth: 210,
                  maxWidth: 210,
                  textAlign: "left",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: selected ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
                  background: selected ? primarySoft : "rgba(255,255,255,0.04)",
                  boxShadow: selected ? `0 12px 28px ${primary}22` : "0 10px 24px rgba(0,0,0,0.35)",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                  scrollSnapAlign: "center",
                }}
              >
                <div style={{ padding: 10 }}>
                  {/* ✅ drapeau + nom sur la même ligne, ✅ plus de "SELECTED" */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {flag ? (
                      <img
                        src={flag}
                        alt={m.id}
                        style={{ width: 18, height: 18, borderRadius: 4, objectFit: "cover" }}
                        draggable={false}
                      />
                    ) : (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.10)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      />
                    )}
                    <div style={{ fontSize: 14, fontWeight: 1000 }}>{m.name}</div>
                    <div style={{ marginLeft: "auto", fontSize: 11, opacity: 0.8, fontWeight: 950 }}>{m.id}</div>
                  </div>
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

          {/* Next */}
          <button
            type="button"
            onClick={() => {
              const idx = MAP_ORDER.indexOf(mapId as any);
              const next = MAP_ORDER[(idx + 1) % MAP_ORDER.length];
              setMapId(next);
              if (mapStripRef.current && mapCardWidthRef.current) {
                mapStripRef.current.scrollLeft += (mapCardWidthRef.current + 14);
              }
            }}
            style={
              {
                width: 42,
                height: 42,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.35)",
                color: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              } as React.CSSProperties
            }
            aria-label="Suivant"
            title="Suivant"
          >
            ›
          </button>
        </div>
      </Section>

      {/* PLAYERS */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("config.players", "Joueurs")}</span>
            <InfoMini
              title="Joueurs"
              content={
                "Sélectionne les participants (jusqu'à 6).\n\nEn mode équipes :\n1) Clique un joueur sélectionné pour le mettre 'en attente'\n2) Clique un slot vide dans TEAMS."
              }
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
            Sélection : {selectedIds.length}/{maxPlayers} — min {minPlayers}
            {teamSize > 1 && selectedIds.length > 0 && selectedIds.length !== teamSize * 2 && (
              <span style={{ marginLeft: 10, opacity: 0.9 }}>(doit être exactement {teamSize * 2})</span>
            )}
          </div>
        </div>

        {/* Human carousel */}
        {humanProfiles.length === 0 ? (
          <p style={{ fontSize: 11, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
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
        <div style={{ marginTop: 8 }}>
          <OptionRow
            label={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>Mode équipes</span>
                <InfoMini
                  title="Mode équipes"
                  content={"Solo : chacun pour soi.\n2v2 / 3v3 : influence par team. Ensuite, place les joueurs dans TEAMS."}
                  onOpen={(title, content) => setInfoModal({ title, content })}
                />
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
        </div>

        {/* Option A: TEAMS PANEL */}
        {teamSize > 1 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 1100, letterSpacing: 0.6 }}>TEAMS</div>
                <InfoMini
                  title="TEAMS"
                  content={
                    "1) Clique un joueur (bouton 'Assigner') pour le mettre en attente\n2) Clique un slot vide pour l'ajouter à une team\n\nChaque Team doit avoir exactement " +
                    teamSize +
                    " joueurs."
                  }
                  onOpen={(title, content) => setInfoModal({ title, content })}
                />
              </div>
              {/* ✅ garde ton style, mais bouton = même “famille” que config X01 (pas de bouton néon géant) */}
              <button
                onClick={autoFillTeams}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid " + primary + "55",
                  background: "linear-gradient(90deg, " + primary + "22, rgba(0,0,0,0.20))",
                  color: "#fff",
                  fontWeight: 1000,
                  letterSpacing: 0.4,
                  boxShadow: "0 0 18px " + primary + "22",
                  cursor: "pointer",
                }}
              >
                Auto-fill
              </button>
            </div>

            {pendingId && (
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, fontWeight: 950 }}>
                Joueur en attente :{" "}
                <span style={{ color: primary }}>{(profileById.get(pendingId)?.name as string) || pendingId}</span> — clique
                un slot vide.
              </div>
            )}

            {/* ✅ TEAMS VERTICALES (Team 1 puis Team 2) */}
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(1, minmax(0,1fr))", gap: 10 }}>
              {[0, 1].map((te) => {
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

                        return (
                          <button
                            key={sIdx}
                            onClick={() => {
                              if (isEmpty) return assignToTeam(te);
                              setPendingId(id);
                            }}
                            style={{
                              borderRadius: 14,
                              padding: 10,
                              border: isEmpty ? "1px dashed rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.12)",
                              background: isEmpty ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.06)",
                              cursor: isEmpty ? (pendingId ? "pointer" : "not-allowed") : "pointer",
                              minHeight: 96,
                            }}
                            title={
                              isEmpty
                                ? pendingId
                                  ? "Clique pour assigner"
                                  : "Sélectionne un joueur d'abord"
                                : "Clique pour sélectionner ce joueur"
                            }
                          >
                            {isEmpty ? (
                              <div style={{ opacity: 0.8, fontWeight: 950, fontSize: 12 }}>Slot vide</div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden" }}>
                                  <ProfileAvatar profile={p as any} size={44} showStars={false} />
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    opacity: 0.95,
                                  }}
                                >
                                  {p?.name || id}
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
                              </div>
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

        {/* Bots */}
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
                <span>Bots IA</span>
                <InfoMini
                  title="Bots IA"
                  content={"Active les bots pour compléter tes teams. Utilise 'Auto-complete' pour compléter automatiquement la sélection."}
                  onOpen={(title, content) => setInfoModal({ title, content })}
                />
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
                <button
                  onClick={autoCompleteWithBots}
                  disabled={!userBots.length}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 999,
                    border: "1px solid " + primary + "55",
                    background: "linear-gradient(90deg, " + primary + "22, rgba(0,0,0,0.20))",
                    color: "#fff",
                    fontWeight: 1000,
                    letterSpacing: 0.4,
                    boxShadow: "0 0 18px " + primary + "22",
                    cursor: userBots.length ? "pointer" : "not-allowed",
                    opacity: userBots.length ? 1 : 0.55,
                  }}
                >
                  Auto-complete
                </button>
              </div>

              {userBots.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 8 }}>
                  Aucun bot personnalisé trouvé (dc_bots_v1).
                </div>
              ) : (
                <div
                  className="dc-scroll-thin"
                  style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10, marginTop: 10 }}
                >
                  {userBots.map((b) => {
                    const active = selectedIds.includes(b.id);
                    const isPending = pendingId === b.id;
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

                        {teamSize > 1 && active && (
                          <button
                            onClick={() => setPendingId((prev) => (prev === b.id ? null : b.id))}
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
            </>
          )}
        </div>

        {!selectionValid && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9, fontWeight: 950 }}>
            Configuration invalide : sélectionne {minPlayers} joueurs minimum
            {teamSize > 1 ? `, exactement ${teamSize * 2}, et remplis Team 1 + Team 2.` : "."}
          </div>
        )}
      </Section>

      {/* Rules */}
      <Section
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>{t("config.rules", "Règles")}</span>
            <InfoMini
              title="Règles"
              content={"Rounds = nombre de tours maximum. Objectif = territoires à posséder pour gagner."}
              onOpen={(title, content) => setInfoModal({ title, content })}
            />
          </div>
        }
      >
        <OptionRow label={t("config.rounds", "Rounds")}>
          <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
        </OptionRow>

        <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
          <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
        </OptionRow>

        <OptionRow label={t("territories.targetMode", "Sélection de cible")}>
          <OptionSelect
            value={targetSelectionMode}
            options={["free", "by_score"]}
            onChange={setTargetSelectionMode as any}
          />
        </OptionRow>

        <OptionRow label={t("territories.victoryMode", "Condition de victoire")}>
          <OptionSelect
            value={victoryMode}
            options={["territories", "regions", "time"]}
            onChange={setVictoryMode as any}
          />
        </OptionRow>

        {victoryMode === "regions" && (
          <OptionRow label={t("territories.objectiveRegions", "Objectif (régions)")}>
            <OptionSelect value={objectiveRegions} options={[1,2,3,4,5,6,7,8,9,10]} onChange={setObjectiveRegions} />
          </OptionRow>
        )}

        {victoryMode === "time" && (
          <OptionRow label={t("territories.timeLimit", "Temps de partie")}>
            <OptionSelect value={timeLimitMin} options={[15,20,30,60]} onChange={setTimeLimitMin} />
          </OptionRow>
        )}
      </Section>

      {/* ✅ Bouton EXACTEMENT “famille X01” */}
      <Section>
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 76,
            padding: "0 12px",
            zIndex: 30,
          }}
        >
          <button
            onClick={start}
            disabled={!selectionValid}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.10)",
              background: selectionValid
                ? "linear-gradient(90deg, " + primary + ", #ffe9a3)"
                : "rgba(255,255,255,0.06)",
              boxShadow: selectionValid
                ? "0 0 18px " + primary + "66, 0 0 42px " + primary + "30, 0 10px 24px rgba(0,0,0,0.40)"
                : "0 10px 24px rgba(0,0,0,0.40)",
              color: selectionValid ? "#0b0a12" : "rgba(255,255,255,0.55)",
              fontWeight: 1100,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              cursor: selectionValid ? "pointer" : "not-allowed",
            }}
          >
            {t("config.startGame", "LANCER LA PARTIE")}
          </button>
        </div>
      </Section>
    </div>
  );
}
