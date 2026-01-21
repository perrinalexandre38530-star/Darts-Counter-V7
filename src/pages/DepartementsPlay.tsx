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

type Config = {
  players: number;

  // ✅ NEW — participants réels + teams choisies
  selectedIds?: string[];
  teamSize?: 1 | 2 | 3;
  teams?: Record<string, number>; // participantId -> teamIndex (CHOIX TEAMS)

  botsEnabled: boolean;
  botLevel: BotLevel;
  rounds: number;
  objective: number; // nb territoires à posséder pour gagner
  mapId: string;
};

const INFO_TEXT = `TERRITORIES
- 20 territoires (tirés de la carte) sont assignés aux cases 1..20.
- Tu joues au keypad : toucher un numéro ajoute de l'influence sur ce territoire.
- Influence (simple/double/triple) = +1/+2/+3.
- Capture à partir de 3 d'influence.
- Objectif : posséder X territoires (config).

Teams:
- Si teamSize > 1, l'influence/capture est comptée par équipe.
- En mode CHOIX TEAMS, la config assigne explicitement chaque joueur à une team.`;

const BOARD_1_TO_20 = Array.from({ length: 20 }, (_, i) => i + 1);

function shuffle<T>(arr: T[], seed: number) {
  // shuffle déterministe simple (LCG)
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

export default function DepartementsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: Config =
    (props?.params?.config as Config) ||
    (props?.config as Config) ||
    {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 12,
      objective: 10,
      mapId: "FR",
    };

  const teamSize: 1 | 2 | 3 = (cfg.teamSize ?? 1) as 1 | 2 | 3;

  const selectedIds = Array.isArray(cfg.selectedIds) ? cfg.selectedIds : [];
  const teamMap = (cfg.teams && typeof cfg.teams === "object") ? cfg.teams : null;

  // team index by player index
  const teamOfPlayerIndex = React.useMemo(() => {
    if (teamSize === 1) return selectedIds.map((_, i) => i);
    if (teamMap && selectedIds.length) return selectedIds.map((id) => (typeof teamMap[id] === "number" ? teamMap[id] : 0));
    // fallback “auto”
    return selectedIds.map((_, i) => Math.floor(i / teamSize));
  }, [teamSize, teamMap, selectedIds]);

  const teamsCount = React.useMemo(() => {
    if (teamSize === 1) return Math.max(1, cfg.players);
    if (teamOfPlayerIndex.length) return Math.max(2, Math.max(...teamOfPlayerIndex) + 1);
    return Math.max(2, Math.ceil(cfg.players / teamSize));
  }, [teamSize, cfg.players, teamOfPlayerIndex]);

  const map = TERRITORY_MAPS[cfg.mapId] ?? TERRITORY_MAPS.FR ?? TERRITORY_MAPS.WORLD;

  const seed = React.useMemo(() => Date.now(), []);
  const zones20 = React.useMemo(() => {
    const zones = Array.isArray(map?.zones) ? map.zones : [];
    const picked = shuffle(zones, seed).slice(0, 20);
    // si une map a < 20 zones, on boucle
    const out = [...picked];
    let k = 0;
    while (out.length < 20 && zones.length) {
      out.push(zones[k % zones.length]);
      k++;
    }
    // fallback ultime
    while (out.length < 20) out.push({ id: `X-${out.length}`, label: `Zone ${out.length + 1}` });
    return out;
  }, [map?.id, seed]);

  // territoire assigné à chaque numéro 1..20
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

  React.useEffect(() => {
    // si teamsCount change (rare), resize sans casser
    setInfluence((prev) => {
      if (!prev?.length) return Array.from({ length: 20 }, () => Array.from({ length: teamsCount }, () => 0));
      return prev.map((row) => {
        const next = [...row];
        while (next.length < teamsCount) next.push(0);
        return next.slice(0, teamsCount);
      });
    });
  }, [teamsCount]);

  const [roundIdx, setRoundIdx] = React.useState(0);
  const [playerIdx, setPlayerIdx] = React.useState(0);

  // keypad state
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  const activeTeam = teamSize === 1 ? playerIdx : (teamOfPlayerIndex[playerIdx] ?? 0);

  const owners = React.useMemo(() => {
    // owner = team avec influence >= 3 et strictement max
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

  const isFinished = React.useMemo(() => {
    if (ownedCount.some((c) => c >= cfg.objective)) return true;
    return roundIdx >= cfg.rounds;
  }, [ownedCount, cfg.objective, roundIdx, cfg.rounds]);

  const winner = React.useMemo(() => {
    if (!isFinished) return null;
    let best = -1;
    let bestIdx = 0;
    for (let i = 0; i < ownedCount.length; i++) {
      if (ownedCount[i] > best) {
        best = ownedCount[i];
        bestIdx = i;
      }
    }
    return { idx: bestIdx, owned: best };
  }, [isFinished, ownedCount]);

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
    // annule la dernière flèche de la volée
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

        // take-over simple :
        // - réduit l'influence des autres de m
        // - ajoute m au joueur/équipe active
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

    const nextP = (playerIdx + 1) % cfg.players;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
    setPlayerIdx(nextP);
    setRoundIdx(nextR);
  }

  return (
    <div className="page">
      <PageHeader
        title="TERRITORIES"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header status */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {map?.name || cfg.mapId} — {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {t("territories.objective", "Objectif")} : {cfg.objective} {t("territories.territories", "territoires")}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {teamSize === 1 ? t("generic.player", "JOUEUR") : "TEAM"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : teamSize === 1 ? `${playerIdx + 1}/${cfg.players}` : `${(activeTeam + 1)}/${teamsCount}`}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {ownedCount.map((c, i) => {
              const active = !isFinished && (teamSize === 1 ? i === playerIdx : i === activeTeam);
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 14,
                    padding: 10,
                    border: active ? "1px solid rgba(120,255,200,0.35)" : "1px solid rgba(255,255,255,0.10)",
                    background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 950 }}>
                    {teamSize === 1 ? `${t("generic.player","Joueur")} ${i + 1}` : `Team ${i + 1}`}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 1000 }}>
                    {c}/{cfg.objective}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Territories grid 1..20 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
          {BOARD_1_TO_20.map((n) => {
            const idx = n - 1;
            const o = owners[idx];
            const z = targets[n];
            const row = influence[idx];

            return (
              <div
                key={n}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: o === null ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(120,255,200,0.30)",
                  background: o === null ? "rgba(255,255,255,0.04)" : "rgba(120,255,200,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>#{n}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                    {o === null ? "—" : teamSize === 1 ? `${t("generic.player", "Joueur")} ${o + 1}` : `Team ${o + 1}`}
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
                      }}
                    >
                      {teamSize === 1 ? `P${te + 1}` : `T${te + 1}`}: {v}
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
            onBull={() => pushDart(0)} // bull ignoré dans cette V1
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
              border: "1px solid rgba(255,215,100,0.35)",
              background: "rgba(255,215,100,0.12)",
              fontWeight: 1000,
            }}
          >
            {t("generic.winner", "Gagnant")} : {teamSize === 1 ? `${t("generic.player","Joueur")} ${winner.idx + 1}` : `Team ${winner.idx + 1}`} —{" "}
            {winner.owned} {t("territories.territories", "territoires")}
          </div>
        )}
      </div>
    </div>
  );
}
