// ============================================
// src/pages/DepartementsConfig.tsx
// TERRITORIES (ex-Départements) — CONFIG
// Base: capture 2 (cards / carrousels)
// Patch demandé :
// - TEAMS: uniquement structure (slots + noms) => aucun médaillon dans les slots
// - Carrousel pays: drapeau + nom sur la même ligne, pas de "SELECTED"
// - Titres de blocs: texte simple en couleur thème (pas de "bouton néon" autour)
// - Boutons "i" inline: petit bouton (pas InfoDot) ; InfoDot uniquement dans le header
// - CTA "Démarrer la partie": btn-primary w-full comme X01/Killer/Shanghai
// ============================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerDepartements from "../assets/tickers/ticker-departements.png";
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

const INFO_RULES_BLOCK = `RÈGLES
- Rounds : durée maximale.
- Objectif : nb de territoires à posséder pour gagner.`;

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

function Modal({
  open,
  title,
  body,
  onClose,
  theme,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  theme: any;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.70)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft}`,
          background: "rgba(10,12,24,0.96)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.65)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 14px 10px", display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 1100, color: theme.primary, letterSpacing: 0.6 }}>{title}</div>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: "6px 10px", borderRadius: 999 }}
          >
            Fermer
          </button>
        </div>

        <div style={{ padding: "0 14px 14px" }}>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 13,
              lineHeight: 1.35,
              color: theme.text,
              opacity: 0.92,
            }}
          >
            {body}
          </pre>
        </div>
      </div>
    </div>
  );
}

function MiniInfoButton({ onClick, title, theme }: { onClick: () => void; title: string; theme: any }) {
  // Petit bouton "i" sans halo (comme les petites aides des autres configs)
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.30)",
        color: theme.primary,
        display: "grid",
        placeItems: "center",
        padding: 0,
        cursor: "pointer",
        flex: "0 0 auto",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 1000, lineHeight: 1, transform: "translateY(-0.5px)" }}>i</span>
    </button>
  );
}

export default function DepartementsConfig(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

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

  const primary = theme.primary ?? "#7dffca";
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

  // help modal
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [helpTitle, setHelpTitle] = React.useState("Infos");
  const [helpBody, setHelpBody] = React.useState("");

  const openHelp = React.useCallback((title: string, body: string) => {
    setHelpTitle(title);
    setHelpBody(body);
    setHelpOpen(true);
  }, []);

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

  const allPlayers = React.useMemo(() => {
    const bots = userBots.map(botToFakeProfile);
    // ordre: humains puis bots (si présents)
    return [...humanProfiles, ...bots];
  }, [humanProfiles, userBots]);

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
  }, [selectedIds]);

  const teamsCount = React.useMemo(() => {
    if (teamSize === 1) return 0;
    return Math.floor(selectedIds.length / teamSize);
  }, [selectedIds.length, teamSize]);

  const slots = React.useMemo(() => {
    const out: Array<Array<string | null>> = [];
    if (teamSize === 1) return out;

    const tc = teamsCount;
    for (let tIdx = 0; tIdx < tc; tIdx++) out.push(Array.from({ length: teamSize }, () => null));

    for (const id of selectedIds) {
      const te = teamsById[id];
      if (typeof te !== "number") continue;
      if (te < 0 || te >= tc) continue;

      // trouver un slot libre pour ce joueur, ou ignorer si plein
      const teamSlots = out[te];
      const existingPos = teamSlots.findIndex((x) => x === id);
      if (existingPos >= 0) continue;

      const firstEmpty = teamSlots.findIndex((x) => x === null);
      if (firstEmpty >= 0) teamSlots[firstEmpty] = id;
    }
    return out;
  }, [selectedIds, teamsById, teamSize, teamsCount]);

  function assignToTeam(teamIndex: number, slotIndex: number) {
    if (teamSize === 1) return;
    if (!pendingId) return;
    if (teamIndex < 0 || teamIndex >= teamsCount) return;
    if (slotIndex < 0 || slotIndex >= teamSize) return;

    // ne pas dupliquer la même personne dans 2 teams
    setTeamsById((prev) => {
      const next = { ...prev };
      next[pendingId] = teamIndex;
      return next;
    });
    setPendingId(null);
  }

  function unassignId(id: string) {
    setTeamsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setPendingId((p) => (p === id ? null : p));
  }

  function autoFillTeams() {
    if (teamSize === 1) return;
    const tc = teamsCount;
    if (tc < 2) return;

    // remplissage simple: répartit en round-robin selon l'ordre de selectedIds
    const next: Record<string, number> = {};
    let k = 0;
    for (const id of selectedIds) {
      next[id] = k % tc;
      k++;
    }
    setTeamsById(next);
    setPendingId(null);
  }

  function autoCompleteBots() {
    // ajoute des bots jusqu'à atteindre minPlayers puis éventuellement le multiple en mode équipes
    const availableBots = userBots.map((b) => String(b.id));
    if (!availableBots.length) return;

    setSelectedIds((prev) => {
      const inSet = new Set(prev);
      const currentHumansOrBots = [...prev];

      const addOne = () => {
        const nextBot = availableBots.find((id) => !inSet.has(id));
        if (!nextBot) return false;
        inSet.add(nextBot);
        currentHumansOrBots.push(nextBot);
        return true;
      };

      while (currentHumansOrBots.length < minPlayers && currentHumansOrBots.length < maxPlayers) {
        if (!addOne()) break;
      }

      if (teamSize > 1) {
        while (currentHumansOrBots.length < maxPlayers && currentHumansOrBots.length % teamSize !== 0) {
          if (!addOne()) break;
        }
      }

      return currentHumansOrBots.slice(0, maxPlayers);
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

  const blockShell: React.CSSProperties = {
    background: cardBg,
    borderRadius: 18,
    padding: "14px 12px 12px",
    marginBottom: 14,
    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
    border: `1px solid ${theme.borderSoft}`,
  };

  const blockHeader = (label: string, infoTitle: string, infoBody: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 900,
            color: primary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <MiniInfoButton theme={theme} title={infoTitle} onClick={() => openHelp(infoTitle, infoBody)} />
      </div>
    </div>
  );

  // CTA validation message
  const validationMsg = React.useMemo(() => {
    if (selectionValid) return "";
    if (selectedIds.length < minPlayers) {
      return `Configuration invalide : sélectionne ${minPlayers} joueurs minimum${teamSize > 1 ? `, un multiple de ${teamSize}` : ""}.`;
    }
    if (teamSize > 1 && selectedIds.length % teamSize !== 0) {
      return `Configuration invalide : en mode équipes, le nombre de joueurs doit être un multiple de ${teamSize}.`;
    }
    if (teamSize > 1) {
      return `Sélection / teams non valides : ajuste le nombre de joueurs et remplis toutes les teams.`;
    }
    return "Configuration invalide.";
  }, [selectionValid, selectedIds.length, minPlayers, teamSize]);

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        tickerSrc={tickerDepartements}
        left={<BackDot onClick={goBack} />}
        right={
          <InfoDot
            title="Règles TERRITORIES"
            onClick={() => openHelp("Règles TERRITORIES", INFO_RULES)}
          />
        }
      />

      <Modal open={helpOpen} title={helpTitle} body={helpBody} onClose={() => setHelpOpen(false)} theme={theme} />

      {/* MAPS */}
      <div style={blockShell}>
        {blockHeader(t("territories.map", "Carte (pays)"), "Carte (pays)", INFO_MAPS)}

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
                  border: selected ? `1px solid ${primary}66` : `1px solid ${theme.borderSoft}`,
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
                        border: `1px solid ${theme.borderSoft}`,
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
                        border: `1px solid ${theme.borderSoft}`,
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
                        color: theme.text,
                      }}
                    >
                      {m.name}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 950, marginLeft: 6, color: theme.textSoft }}>
                    {m.id}
                  </div>
                </div>

                <div style={{ padding: 10, paddingTop: 0 }}>
                  <div
                    style={{
                      borderRadius: 14,
                      overflow: "hidden",
                      border: `1px solid ${theme.borderSoft}`,
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
      </div>

      {/* PLAYERS */}
      <div style={blockShell}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 900,
                color: primary,
              }}
            >
              {t("config.players", "Joueurs")}
            </div>
            <MiniInfoButton theme={theme} title="Joueurs" onClick={() => openHelp("Joueurs", INFO_PLAYERS)} />
          </div>

          <button className="btn-secondary" onClick={goProfiles} style={{ padding: "8px 10px", borderRadius: 12 }}>
            + Profils
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900, marginBottom: 10 }}>
          {t("territories.selection", "Sélection")} : {selectedIds.length}/{maxPlayers} — min {minPlayers}
          {teamSize > 1 ? ` (doit être multiple de ${teamSize})` : ""}
        </div>

        {/* Carrousel joueurs */}
        {allPlayers.length ? (
          <div className="dc-scroll-thin" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 10 }}>
            {allPlayers.map((p: any) => {
              const id = String(p.id);
              const active = selectedIds.includes(id);
              const isPending = pendingId === id;

              return (
                <button
                  key={id}
                  onClick={() => togglePlayer(id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    minWidth: 96,
                    maxWidth: 96,
                    opacity: active ? 1 : 0.65,
                    flexShrink: 0,
                  }}
                  title={active ? "Cliquer pour retirer" : "Cliquer pour ajouter"}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        borderRadius: "50%",
                        width: 78,
                        height: 78,
                        overflow: "hidden",
                        border: active ? `2px solid ${primary}` : `2px solid ${theme.borderSoft}`,
                        boxShadow: active ? `0 0 16px ${primary}55` : "none",
                        filter: active ? "none" : "grayscale(100%) brightness(0.55)",
                        opacity: active ? 1 : 0.6,
                        transition: "filter .2s ease, opacity .2s ease",
                        background: "rgba(0,0,0,0.35)",
                      }}
                    >
                      <ProfileAvatar profile={p as any} size={78} />
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "center",
                        color: active ? theme.text : theme.textSoft,
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
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPendingId((prev) => (prev === id ? null : id));
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: `1px solid ${primary}66`,
                          background: isPending ? primarySoft : "rgba(0,0,0,0.18)",
                          color: theme.text,
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
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
            {t("config.noProfiles", "Aucun profil trouvé. Clique sur “+ Profils”.")}
          </div>
        )}

        {/* Mode équipes */}
        <div style={{ marginTop: 10 }}>
          <OptionRow
            label={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 1000 }}>Mode équipes</span>
                <MiniInfoButton theme={theme} title="Mode équipes" onClick={() => openHelp("Mode équipes", INFO_TEAMS)} />
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

        {/* TEAMS PANEL — STRUCTURE ONLY */}
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
                      border: ok ? `1px solid ${primary}44` : `1px solid ${theme.borderSoft}`,
                      background: ok ? primarySoft : "rgba(255,255,255,0.02)",
                      boxShadow: ok ? `0 10px 26px ${primary}1a` : "0 10px 24px rgba(0,0,0,0.35)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 1100, color: theme.text }}>Team {te + 1}</div>
                      <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, color: theme.textSoft }}>
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
                              border: isEmpty ? "1px dashed rgba(255,255,255,0.22)" : `1px solid ${theme.borderSoft}`,
                              background: isEmpty ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.06)",
                              cursor: isEmpty ? (pendingId ? "pointer" : "not-allowed") : "pointer",
                              minHeight: 64,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 8,
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
                              <div style={{ opacity: 0.85, fontWeight: 950, fontSize: 12, textAlign: "center", color: theme.textSoft }}>
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
                                    color: theme.text,
                                  }}
                                >
                                  {name}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    unassignId(id);
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    border: `1px solid ${theme.borderSoft}`,
                                    background: "rgba(0,0,0,0.18)",
                                    color: theme.text,
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
          </div>
        )}

        {/* Bots */}
        <div style={{ marginTop: 12 }}>
          <OptionRow
            label={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 1000 }}>Bots IA</span>
                <MiniInfoButton theme={theme} title="Bots IA" onClick={() => openHelp("Bots IA", INFO_BOTS)} />
              </div>
            }
          >
            <OptionToggle
              value={botsEnabled}
              onChange={(v) => {
                setBotsEnabled(v);
                if (!v) {
                  // on coupe => on retire les bots éventuellement sélectionnés
                  setSelectedIds((prev) => prev.filter((id) => !userBots.some((b) => String(b.id) === String(id))));
                  setTeamsById((prev) => {
                    const next = { ...prev };
                    for (const b of userBots) delete next[String(b.id)];
                    return next;
                  });
                }
              }}
            />
          </OptionRow>

          {botsEnabled && (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <OptionRow label="Difficulté IA">
                <OptionSelect
                  value={botLevel}
                  options={[
                    { value: "easy", label: "Facile" },
                    { value: "normal", label: "Normal" },
                    { value: "hard", label: "Difficile" },
                  ]}
                  onChange={setBotLevel}
                />
              </OptionRow>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.82, fontWeight: 900 }}>
                  Bots : {userBots.length ? userBots.length : 0}
                </div>
                <button
                  className="btn-secondary"
                  onClick={autoCompleteBots}
                  disabled={!userBots.length || selectedIds.length >= maxPlayers}
                  style={{ opacity: !userBots.length ? 0.5 : 1 }}
                >
                  Auto-complete
                </button>
              </div>

              {!userBots.length && (
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                  Aucun bot personnalisé trouvé (dc_bots_v1).
                </div>
              )}
            </div>
          )}
        </div>

        {!selectionValid && (
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.9, color: theme.textSoft }}>
            {validationMsg}
          </div>
        )}
      </div>

      {/* RULES */}
      <div style={blockShell}>
        {blockHeader("Règles", "Règles", INFO_RULES_BLOCK)}

        <div style={{ display: "grid", gap: 10 }}>
          <OptionRow label={t("config.rounds", "Rounds")}>
            <OptionSelect value={rounds} options={[8, 10, 12, 15, 20]} onChange={setRounds} />
          </OptionRow>

          <OptionRow label={t("territories.objective", "Objectif (territoires)")}>
            <OptionSelect value={objective} options={[6, 8, 10, 12, 15, 18]} onChange={setObjective} />
          </OptionRow>
        </div>
      </div>

      {/* CTA */}
      <div style={{ paddingBottom: 12 }}>
        <button className="btn-primary w-full" onClick={start} disabled={!selectionValid} style={{ opacity: selectionValid ? 1 : 0.45 }}>
          {t("config.startGame", "Démarrer la partie")}
        </button>
      </div>
    </div>
  );
}
