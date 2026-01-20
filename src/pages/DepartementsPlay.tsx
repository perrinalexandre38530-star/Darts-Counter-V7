import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Keypad from "../components/Keypad";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS } from "../lib/territories/maps";
import type { Dart as UIDart } from "../lib/types";

type BotLevel = "easy" | "normal" | "hard";

type TerritoriesConfigPayload = {
  selectedIds?: string[];
  players: number;
  teamSize?: 1 | 2 | 3;
  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number;
  mapId?: string;
};

type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
};

const INFO_TEXT = `TERRITORIES
- 20 territoires (tirés de la carte) sont assignés aux cases 1..20.
- Tu joues au keypad : toucher un numéro ajoute de l'influence sur ce territoire.
- Influence (simple/double/triple) = +1/+2/+3.
- Capture à partir de 3 d'influence (strictement max).
- Objectif : posséder X territoires (config).
- Mode équipes: l'influence / capture est par équipe.
- Bull = bonus (ou power-up selon config future).`;

const BOARD_1_TO_20 = Array.from({ length: 20 }, (_, i) => i + 1);
const LS_BOTS_KEY = "dc_bots_v1";

const TEAM_COLORS = ["#4ade80", "#60a5fa", "#f472b6", "#facc15", "#fb7185", "#a78bfa"];

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed >>> 0;
  function rnd() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeJson<T>(s: string | null, fallback: T): T {
  try {
    if (!s) return fallback;
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function resolveAllBots(): PlayerLite[] {
  const arr = safeJson<any[]>(localStorage.getItem(LS_BOTS_KEY), []);
  return (Array.isArray(arr) ? arr : []).map((b) => ({
    id: String(b.id ?? ""),
    name: String(b.name ?? "Bot"),
    avatarDataUrl: b.avatarDataUrl ?? null,
    isBot: true,
  })).filter(b => !!b.id);
}

function resolveProfilesFromStore(store: any): PlayerLite[] {
  const profs = store?.profiles ?? store?.profilesV7 ?? store?.profiles_v7 ?? [];
  return (Array.isArray(profs) ? profs : []).map((p: any) => ({
    id: String(p.id ?? p.profileId ?? p.uid ?? ""),
    name: String(p.name ?? p.displayName ?? "Player"),
    avatarDataUrl: p.avatarDataUrl ?? p.avatar ?? p.avatarUrl ?? null,
    isBot: false,
  })).filter(p => !!p.id);
}

function AvatarMedallion({
  size,
  src,
  name,
  ring,
  dim,
}: {
  size: number;
  src?: string | null;
  name: string;
  ring?: string;
  dim?: boolean;
}) {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        padding: 3,
        background: ring ? `linear-gradient(135deg, ${ring}, rgba(255,255,255,0.18))` : "rgba(255,255,255,0.14)",
        boxShadow: ring ? `0 0 0 1px ${ring}55, 0 14px 26px rgba(0,0,0,0.35)` : "0 14px 26px rgba(0,0,0,0.35)",
        opacity: dim ? 0.55 : 1,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 1000,
          letterSpacing: 1,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontSize: Math.max(10, Math.floor(size / 3)), opacity: 0.9 }}>{initials}</div>
        )}
      </div>
    </div>
  );
}

export default function DepartementsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: TerritoriesConfigPayload =
    (props?.params?.config as TerritoriesConfigPayload) ||
    (props?.config as TerritoriesConfigPayload) || {
      players: 2,
      teamSize: 1,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 12,
      objective: 10,
      mapId: "FR",
      selectedIds: [],
    };

  const teamSize: 1 | 2 | 3 = (cfg.teamSize ?? 1) as 1 | 2 | 3;

  // --- resolve players (same spirit as config carousel)
  const allBots = React.useMemo(() => resolveAllBots(), []);
  const allProfiles = React.useMemo(() => resolveProfilesFromStore(props?.store), [props?.store]);

  const playersResolved: PlayerLite[] = React.useMemo(() => {
    const ids = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
    if (!ids.length) {
      // fallback : players num
      return Array.from({ length: cfg.players }, (_, i) => ({
        id: `p-${i + 1}`,
        name: `${t("generic.player", "Joueur")} ${i + 1}`,
        avatarDataUrl: null,
      }));
    }
    const byId = new Map<string, PlayerLite>();
    [...allProfiles, ...allBots].forEach((p) => byId.set(p.id, p));
    const out = ids.map((id) => byId.get(id)).filter(Boolean) as PlayerLite[];
    // sécurité: si moins que players, complète
    while (out.length < cfg.players) {
      const i = out.length + 1;
      out.push({ id: `p-${i}`, name: `${t("generic.player", "Joueur")} ${i}`, avatarDataUrl: null });
    }
    return out.slice(0, cfg.players);
  }, [cfg.players, cfg.selectedIds, allProfiles, allBots, t]);

  const playersCount = playersResolved.length;
  const teamsCount = Math.max(1, Math.ceil(playersCount / teamSize));

  // --- map / targets
  const mapId = cfg.mapId || "FR";
  const map = TERRITORY_MAPS[mapId] ?? TERRITORY_MAPS.FR ?? TERRITORY_MAPS.WORLD;

  const seed = React.useMemo(() => Date.now(), []);
  const zones20 = React.useMemo(() => {
    const zones = Array.isArray(map?.zones) ? map.zones : [];
    const picked = shuffle(zones, seed).slice(0, 20);
    const out = [...picked];
    let k = 0;
    while (out.length < 20 && zones.length) {
      out.push(zones[k % zones.length]);
      k++;
    }
    while (out.length < 20) out.push({ id: `X-${out.length}`, label: `Zone ${out.length + 1}` });
    return out;
  }, [map?.id, seed]);

  const targets = React.useMemo(() => {
    const m: Record<number, { id: string; label: string }> = {};
    for (let i = 0; i < 20; i++) {
      const n = i + 1;
      const z = zones20[i];
      m[n] = { id: z.id, label: z.label };
    }
    return m;
  }, [zones20]);

  // influence[numIndex 0..19][team] = points
  const [influence, setInfluence] = React.useState<number[][]>(() =>
    Array.from({ length: 20 }, () => Array.from({ length: teamsCount }, () => 0))
  );

  const [roundIdx, setRoundIdx] = React.useState(0);
  const [playerIdx, setPlayerIdx] = React.useState(0);

  // keypad
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const activeTeam = Math.floor(playerIdx / teamSize);
  const activeColor = TEAM_COLORS[activeTeam] || "#ffffff";

  const owners = React.useMemo(() => {
    const out: Array<number | null> = [];
    for (let i = 0; i < 20; i++) {
      const row = influence[i];
      let best = -1;
      let bestIdx: number | null = null;
      let tie = false;
      for (let te = 0; te < row.length; te++) {
        if (row[te] > best) {
          best = row[te];
          bestIdx = te;
          tie = false;
        } else if (row[te] === best && best >= 0) {
          tie = true;
        }
      }
      if (best >= 3 && bestIdx !== null && !tie) out.push(bestIdx);
      else out.push(null);
    }
    return out;
  }, [influence]);

  const ownedCount = React.useMemo(() => {
    const c = Array.from({ length: teamsCount }, () => 0);
    owners.forEach((o) => {
      if (o !== null) c[o]++;
    });
    return c;
  }, [owners, teamsCount]);

  const domination = React.useMemo(() => {
    const d = Array.from({ length: teamsCount }, () => 0);
    for (let i = 0; i < 20; i++) for (let te = 0; te < teamsCount; te++) d[te] += influence[i][te] || 0;
    return d;
  }, [influence, teamsCount]);

  const isFinished = React.useMemo(() => {
    if (ownedCount.some((c) => c >= cfg.objective)) return true;
    return roundIdx >= cfg.rounds;
  }, [ownedCount, cfg.objective, roundIdx, cfg.rounds]);

  const winner = React.useMemo(() => {
    if (!isFinished) return null;
    let best = -1;
    let bestIdx = 0;
    let tie = false;
    for (let i = 0; i < ownedCount.length; i++) {
      if (ownedCount[i] > best) {
        best = ownedCount[i];
        bestIdx = i;
        tie = false;
      } else if (ownedCount[i] === best) tie = true;
    }
    if (!tie) return { idx: bestIdx, owned: best, by: "captured" as const };
    let bestD = -1;
    let bestDi = 0;
    for (let i = 0; i < domination.length; i++) {
      if (domination[i] > bestD) {
        bestD = domination[i];
        bestDi = i;
      }
    }
    return { idx: bestDi, owned: ownedCount[bestDi], by: "domination" as const };
  }, [isFinished, ownedCount, domination]);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function pushDart(v: number) {
    if (isFinished) return;
    if (currentThrow.length >= 3) return;
    setCurrentThrow((prev) => [...prev, { v, mult } as UIDart]);
    setMult(1);
  }

  function cancel() {
    if (currentThrow.length) setCurrentThrow((prev) => prev.slice(0, -1));
    else setMult(1);
  }

  function applyDartsToInfluence(darts: UIDart[]) {
    setInfluence((prev) => {
      const next = prev.map((row) => [...row]);
      for (const d of darts) {
        const v = d?.v ?? 0;
        const m = (d?.mult ?? 1) as 1 | 2 | 3;
        if (v < 1 || v > 20) continue;
        const idx = v - 1;

        // take-over (team)
        for (let te = 0; te < teamsCount; te++) {
          if (te === activeTeam) continue;
          next[idx][te] = Math.max(0, next[idx][te] - m);
        }
        next[idx][activeTeam] = Math.min(9, next[idx][activeTeam] + m);
      }
      return next;
    });
  }

  function validateTurn() {
    if (isFinished) return;
    if (!currentThrow.length) return;

    applyDartsToInfluence(currentThrow);
    setCurrentThrow([]);
    setMult(1);

    const nextP = (playerIdx + 1) % playersCount;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
    setPlayerIdx(nextP);
    setRoundIdx(nextR);
  }

  // --- bot V1 (safe): if botsEnabled and active player is bot => auto play
  React.useEffect(() => {
    if (!cfg.botsEnabled) return;
    if (isFinished) return;
    const p = playersResolved[playerIdx];
    if (!p?.isBot) return;

    const level = cfg.botLevel || "normal";

    function pickTarget(): number {
      // normal/hard: prefer neutral or contested
      let best = 1;
      let bestScore = -1;
      for (let n = 1; n <= 20; n++) {
        const idx = n - 1;
        const row = influence[idx];
        const owner = owners[idx];
        // scoring
        let s = 0;
        const mine = row[activeTeam] || 0;
        const sum = row.reduce((a, b) => a + b, 0);
        if (owner === null) s += 4; // prefer uncaptured
        if (owner !== null && owner !== activeTeam) s += 2;
        s += (mine >= 2 ? 3 : mine >= 1 ? 1 : 0);
        s += Math.min(3, sum);
        if (level === "easy") s += Math.random();
        if (s > bestScore) {
          bestScore = s;
          best = n;
        }
      }
      return best;
    }

    const n1 = pickTarget();
    const darts: UIDart[] = [{ v: n1, mult: 1 } as UIDart, { v: n1, mult: 1 } as UIDart, { v: n1, mult: 1 } as UIDart];
    const timer = window.setTimeout(() => {
      applyDartsToInfluence(darts);
      const nextP = (playerIdx + 1) % playersCount;
      const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
      setPlayerIdx(nextP);
      setRoundIdx(nextR);
    }, 240);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.botsEnabled, cfg.botLevel, playerIdx, isFinished, playersResolved, influence, owners, activeTeam, playersCount, roundIdx]);

  function playerLabel(pIndex: number) {
    const pl = playersResolved[pIndex];
    const te = Math.floor(pIndex / teamSize);
    const slot = (pIndex % teamSize) + 1;
    if (teamSize === 1) return pl?.name || `${t("generic.player", "Joueur")} ${pIndex + 1}`;
    return `${pl?.name || `P${slot}`} • Team ${te + 1}`;
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* STATUS + CAROUSEL (cohérent Killer/X01) */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {map?.name || mapId} — {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {t("territories.objective", "Objectif")} : {cfg.objective} {t("territories.territories", "territoires")}
              </div>
              {teamSize > 1 && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                  Mode équipes : {teamSize}v{teamSize} — {teamsCount} teams
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {teamSize === 1 ? t("generic.player", "JOUEUR") : "ACTIF"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : playerLabel(playerIdx)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950, color: activeColor }}>
                Team {activeTeam + 1}
              </div>
            </div>
          </div>

          {/* Teams KPI row */}
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {Array.from({ length: teamsCount }, (_, team) => {
              const col = TEAM_COLORS[team] || "#fff";
              const active = !isFinished && team === activeTeam;
              return (
                <div
                  key={team}
                  style={{
                    borderRadius: 14,
                    padding: 10,
                    border: active ? `1px solid ${col}66` : "1px solid rgba(255,255,255,0.10)",
                    background: active ? `${col}22` : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 950, color: col }}>
                    Team {team + 1}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>
                    {ownedCount[team]}/{cfg.objective}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75, fontWeight: 900 }}>
                    Domination: {domination[team]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Players carousel (same spirit as configs) */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950, letterSpacing: 0.6 }}>
              {t("config.players", "Joueurs")}
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 10,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {playersResolved.map((p, i) => {
                const active = !isFinished && i === playerIdx;
                const team = Math.floor(i / teamSize);
                const col = TEAM_COLORS[team] || "#fff";
                return (
                  <div
                    key={p.id || i}
                    style={{
                      flex: "0 0 auto",
                      minWidth: 86,
                      borderRadius: 16,
                      padding: 10,
                      border: active ? `1px solid ${col}88` : "1px solid rgba(255,255,255,0.10)",
                      background: active ? `${col}22` : "rgba(255,255,255,0.04)",
                      boxShadow: active ? `0 0 0 1px ${col}33, 0 16px 28px rgba(0,0,0,0.35)` : "0 14px 26px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <AvatarMedallion size={52} src={p.avatarDataUrl} name={p.name} ring={col} dim={false} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 950, textAlign: "center", lineHeight: 1.1 }}>
                      {p.name}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, opacity: 0.75, fontWeight: 900, textAlign: "center", color: col }}>
                      Team {team + 1}
                    </div>
                    {p.isBot && (
                      <div style={{ marginTop: 4, fontSize: 10, opacity: 0.75, fontWeight: 900, textAlign: "center" }}>
                        BOT
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Territories grid 1..20 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
          {BOARD_1_TO_20.map((n) => {
            const idx = n - 1;
            const o = owners[idx];
            const z = targets[n];
            const row = influence[idx];

            const borderCol = o === null ? "rgba(255,255,255,0.10)" : `${TEAM_COLORS[o] || "#fff"}88`;
            const bgCol = o === null ? "rgba(255,255,255,0.04)" : `${TEAM_COLORS[o] || "#fff"}1A`;

            return (
              <div
                key={n}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: `1px solid ${borderCol}`,
                  background: bgCol,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>#{n}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 950, color: o === null ? "#fff" : TEAM_COLORS[o] }}>
                    {o === null ? "—" : `Team ${o + 1}`}
                  </div>
                </div>

                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000, lineHeight: 1.1 }}>
                  {z?.label || "—"}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {row.map((v, te) => (
                    <div
                      key={te}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: te === activeTeam ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.12)",
                        fontSize: 12,
                        fontWeight: 950,
                        opacity: v ? 1 : 0.55,
                        color: TEAM_COLORS[te] || "#fff",
                      }}
                    >
                      T{te + 1}: {v}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Keypad */}
        {!isFinished && (
          <Keypad
            currentThrow={currentThrow}
            multiplier={mult}
            onSimple={() => setMult(1)}
            onDouble={() => setMult(2)}
            onTriple={() => setMult(3)}
            onCancel={cancel}
            onBackspace={cancel}
            onNumber={(n) => pushDart(n)}
            onBull={() => pushDart(0)}
            onValidate={validateTurn}
            hidePreview={false}
          />
        )}

        {/* Winner */}
        {isFinished && winner && (
          <div
            style={{
              borderRadius: 18,
              padding: 14,
              border: `1px solid ${(TEAM_COLORS[winner.idx] || "#ffd764")}66`,
              background: `${(TEAM_COLORS[winner.idx] || "#ffd764")}1F`,
              fontWeight: 1000,
            }}
          >
            {t("generic.winner", "Gagnant")} : Team {winner.idx + 1} — {winner.owned}{" "}
            {t("territories.territories", "territoires")}
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
              Tie-break: {winner.by}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
