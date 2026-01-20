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

  // ✅ NEW — équipes (1=solo, 2=2v2, 3=3v3)
  teamSize?: 1 | 2 | 3;

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
- Capture à partir de 3 d'influence (strictement max).
- Objectif : posséder X territoires (config).

V2+:
- Mode équipes: l'influence / capture est par équipe (pas par joueur).
- Power-ups: Reinforce / Steal / Shield.
- Bull: applique un power-up (ou renforce la dernière case touchée).
- DBull: Bull x2 → renforce +2 sur la meilleure cible (ou applique un power-up plus fort).`;

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

// ✅ Power-ups
type PowerUpId = "reinforce" | "steal" | "shield";
type PowerUp = { id: PowerUpId; value?: number; label: string };

const POWERUP_POOL: PowerUp[] = [
  { id: "reinforce", value: 2, label: "Reinforce +2" },
  { id: "steal", value: 1, label: "Steal -1/+1" },
  { id: "shield", label: "Shield" },
];

function drawPowerUp(seed: number, idx: number): PowerUp {
  // déterministe (stable) : évite les “random” qui changent au rerender
  const x = ((seed ^ (idx * 2654435761)) >>> 0) / 0xffffffff;
  if (x < 0.42) return POWERUP_POOL[0];
  if (x < 0.78) return POWERUP_POOL[1];
  return POWERUP_POOL[2];
}

const TEAM_COLORS = [
  "#4ade80", // vert
  "#60a5fa", // bleu
  "#f472b6", // rose
  "#facc15", // jaune
  "#fb7185", // rouge
  "#a78bfa", // violet
];

export default function DepartementsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg0: Config =
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

  // ✅ NEW — teamSize
  const teamSize: 1 | 2 | 3 = (cfg0.teamSize ?? 1) as 1 | 2 | 3;
  const teamsCount = Math.max(1, Math.ceil(cfg0.players / teamSize));
  const cfg: Config = { ...cfg0, teamSize };

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

  // ✅ influence[numIndex 0..19][team] = points
  const [influence, setInfluence] = React.useState<number[][]>(() =>
    Array.from({ length: 20 }, () => Array.from({ length: teamsCount }, () => 0))
  );

  // ✅ Shield par territoire: protège le prochain hit contre cette case (consommé)
  const [shields, setShields] = React.useState<boolean[]>(() => Array.from({ length: 20 }, () => false));

  const [roundIdx, setRoundIdx] = React.useState(0);
  const [playerIdx, setPlayerIdx] = React.useState(0);

  // keypad state
  const [mult, setMult] = React.useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);

  // ✅ “Bull double press” = DBull
  const [bullArmedAt, setBullArmedAt] = React.useState<number>(0);
  const [pendingBull, setPendingBull] = React.useState<null | "bull" | "dbull">(null);

  // ✅ last hit (pour bull “renforce la dernière case touchée”)
  const [lastHitIndex, setLastHitIndex] = React.useState<number | null>(null);

  // ✅ Power-ups par équipe
  const [powerUps, setPowerUps] = React.useState<PowerUp[][]>(() =>
    Array.from({ length: teamsCount }, (_, ti) => [
      drawPowerUp(seed, ti * 10 + 1),
      drawPowerUp(seed, ti * 10 + 2),
    ])
  );
  const [activePower, setActivePower] = React.useState<{ team: number; slot: number } | null>(null);

  const activeTeam = Math.floor(playerIdx / teamSize);

  const owners = React.useMemo(() => {
    // owner = team avec influence >= 3 et strictement max
    const out: Array<number | null> = [];
    for (let i = 0; i < 20; i++) {
      const row = influence[i];
      let best = -1;
      let bestIdx: number | null = null;
      let tie = false;
      for (let p = 0; p < row.length; p++) {
        if (row[p] > best) {
          best = row[p];
          bestIdx = p;
          tie = false;
        } else if (row[p] === best && best >= 0) {
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

  // ✅ Domination = somme influence par équipe (stat utile)
  const domination = React.useMemo(() => {
    const d = Array.from({ length: teamsCount }, () => 0);
    for (let i = 0; i < 20; i++) {
      for (let te = 0; te < teamsCount; te++) d[te] += influence[i][te] || 0;
    }
    return d;
  }, [influence, teamsCount]);

  const isFinished = React.useMemo(() => {
    if (ownedCount.some((c) => c >= cfg.objective)) return true;
    return roundIdx >= cfg.rounds;
  }, [ownedCount, cfg.objective, roundIdx, cfg.rounds]);

  const winner = React.useMemo(() => {
    if (!isFinished) return null;

    // 1) territories capturés
    let best = -1;
    let bestIdx = 0;
    let tie = false;

    for (let i = 0; i < ownedCount.length; i++) {
      if (ownedCount[i] > best) {
        best = ownedCount[i];
        bestIdx = i;
        tie = false;
      } else if (ownedCount[i] === best) {
        tie = true;
      }
    }

    if (!tie) return { idx: bestIdx, owned: best, by: "captured" as const };

    // 2) domination (tiebreak)
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
    if (v >= 1 && v <= 20) setLastHitIndex(v - 1);
    setMult(1);
  }

  function cancel() {
    // annule la dernière flèche de la volée
    if (currentThrow.length) setCurrentThrow((prev) => prev.slice(0, -1));
    else setMult(1);
  }

  function consumePower(team: number, slot: number) {
    setPowerUps((prev) => {
      const next = prev.map((row) => [...row]);
      next[team][slot] = drawPowerUp(seed, team * 100 + slot * 7 + (roundIdx + 1) * 3 + playerIdx);
      return next;
    });
    setActivePower(null);
  }

  function applyPowerUpToTarget(power: PowerUp, targetIdx: number) {
    // targetIdx = 0..19
    if (targetIdx < 0 || targetIdx >= 20) return;

    if (power.id === "shield") {
      setShields((prev) => {
        const next = [...prev];
        next[targetIdx] = true;
        return next;
      });
      return;
    }

    setInfluence((prev) => {
      const next = prev.map((row) => [...row]);

      if (power.id === "reinforce") {
        const add = power.value ?? 2;
        next[targetIdx][activeTeam] = Math.min(9, (next[targetIdx][activeTeam] || 0) + add);
      } else if (power.id === "steal") {
        const steal = power.value ?? 1;
        for (let te = 0; te < teamsCount; te++) {
          if (te === activeTeam) continue;
          next[targetIdx][te] = Math.max(0, (next[targetIdx][te] || 0) - steal);
        }
        next[targetIdx][activeTeam] = Math.min(9, (next[targetIdx][activeTeam] || 0) + steal);
      }

      return next;
    });
  }

  function applyDartsToInfluence(darts: UIDart[]) {
    setInfluence((prev) => {
      const next = prev.map((row) => [...row]);
      return next;
    });

    // On applique ensuite via setState fonctionnel pour influence & shields
    // pour éviter les pièges de closure.
    setInfluence((prev) => {
      const next = prev.map((row) => [...row]);

      for (const d of darts) {
        const v = d?.v ?? 0;
        const m = (d?.mult ?? 1) as 1 | 2 | 3;
        if (v < 1 || v > 20) continue;

        const idx = v - 1;

        // ✅ Shield : consomme la protection et ignore ce hit
        if (shields[idx]) {
          // consommer shield
          setShields((ps) => {
            const ns = [...ps];
            ns[idx] = false;
            return ns;
          });
          continue;
        }

        // take-over simple (par équipe) :
        // - réduit l'influence des autres équipes de m
        // - ajoute m à l'équipe active
        for (let te = 0; te < teamsCount; te++) {
          if (te === activeTeam) continue;
          next[idx][te] = Math.max(0, next[idx][te] - m);
        }
        next[idx][activeTeam] = Math.min(9, next[idx][activeTeam] + m);
      }

      return next;
    });
  }

  function resolveBull() {
    // Bull / DBull : si un power-up est sélectionné => l'applique
    // sinon : bull renforce la dernière case touchée, dbull renforce +2 sur meilleure cible
    const team = activeTeam;

    if (activePower && activePower.team === team) {
      const p = powerUps[team]?.[activePower.slot];
      if (!p) return;

      // cible : dernière case touchée, sinon la meilleure cible (max contest)
      let idx = lastHitIndex;
      if (idx === null || idx === undefined) {
        idx = 0;
        let bestSum = -1;
        for (let i = 0; i < 20; i++) {
          const sum = influence[i].reduce((a, b) => a + b, 0);
          if (sum > bestSum) {
            bestSum = sum;
            idx = i;
          }
        }
      }

      applyPowerUpToTarget(p, idx);
      consumePower(team, activePower.slot);
      return;
    }

    if (pendingBull === "dbull") {
      // +2 sur la meilleure cible pour l'équipe (celle où on a déjà le plus)
      let bestIdx = 0;
      let bestScore = -1;
      for (let i = 0; i < 20; i++) {
        const s = influence[i][team] || 0;
        if (s > bestScore) {
          bestScore = s;
          bestIdx = i;
        }
      }
      setInfluence((prev) => {
        const next = prev.map((row) => [...row]);
        next[bestIdx][team] = Math.min(9, (next[bestIdx][team] || 0) + 2);
        return next;
      });
      setPendingBull(null);
      return;
    }

    // bull simple : +1 sur dernière case touchée
    if (lastHitIndex !== null) {
      setInfluence((prev) => {
        const next = prev.map((row) => [...row]);
        next[lastHitIndex][team] = Math.min(9, (next[lastHitIndex][team] || 0) + 1);
        return next;
      });
    }
    setPendingBull(null);
  }

  function onBullPressed() {
    if (isFinished) return;

    const now = Date.now();
    if (now - bullArmedAt < 400) {
      // double tap => dbull
      setPendingBull("dbull");
      setBullArmedAt(0);
      // appliquer immédiatement
      resolveBull();
      return;
    }

    setBullArmedAt(now);
    setPendingBull("bull");
    // appliquer avec un petit délai (laisser la chance au double tap)
    window.setTimeout(() => {
      setBullArmedAt((prev) => {
        if (prev !== now) return prev; // autre bull a eu lieu
        // bull simple
        setPendingBull("bull");
        resolveBull();
        return 0;
      });
    }, 420);
  }

  function validateTurn() {
    if (isFinished) return;
    if (!currentThrow.length) {
      // si pas de fléchettes mais un bull pending, on le résout
      if (pendingBull) resolveBull();
      return;
    }

    applyDartsToInfluence(currentThrow);

    setCurrentThrow([]);
    setMult(1);

    const nextP = (playerIdx + 1) % cfg.players;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;
    setPlayerIdx(nextP);
    setRoundIdx(nextR);

    // reset selection power-up à chaque tour pour éviter les erreurs
    setActivePower(null);
  }

  // ✅ UI helper : label joueur / team
  function playerLabel(p: number) {
    const te = Math.floor(p / teamSize);
    const idxInTeam = (p % teamSize) + 1;
    if (teamSize === 1) return `${t("generic.player", "Joueur")} ${p + 1}`;
    return `Team ${te + 1} • P${idxInTeam}`;
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
              {teamSize > 1 && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                  Mode équipes : {teamSize}v{teamSize} — {teamsCount} teams
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {teamSize === 1 ? t("generic.player", "JOUEUR") : "ACTIF"
              }
              </div>
              <div style={{ fontSize: 16, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : playerLabel(playerIdx)}
              </div>
              {teamSize > 1 && (
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950, color: TEAM_COLORS[activeTeam] }}>
                  Team {activeTeam + 1}
                </div>
              )}
            </div>
          </div>

          {/* ✅ Scoreboard teams */}
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {Array.from({ length: teamsCount }, (_, i) => i).map((team) => {
              const active = !isFinished && team === activeTeam;
              const col = TEAM_COLORS[team] || "#fff";
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
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 950, color: col }}>
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

          {/* ✅ Power-ups row (minimal chips) */}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {powerUps[activeTeam]?.map((p, slot) => {
              const sel = activePower?.team === activeTeam && activePower?.slot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => setActivePower(sel ? null : { team: activeTeam, slot })}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: sel ? `1px solid ${TEAM_COLORS[activeTeam]}88` : "1px solid rgba(255,255,255,0.12)",
                    background: sel ? `${TEAM_COLORS[activeTeam]}22` : "rgba(0,0,0,0.14)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                  title="Sélectionne puis appuie sur Bull pour l'appliquer"
                >
                  {p.label}
                </button>
              );
            })}
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, alignSelf: "center" }}>
              Bull = utiliser power-up (ou +1) • DBull = Bull x2
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
                  boxShadow: o === null ? "none" : `0 0 0 1px ${TEAM_COLORS[o]}22, 0 10px 24px rgba(0,0,0,0.35)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>#{n}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 950, color: o === null ? "#fff" : TEAM_COLORS[o] }}>
                    {o === null ? "—" : `Team ${o + 1}`}
                    {shields[idx] ? "  🛡" : ""}
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
            onBull={onBullPressed}
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
              Tie-break: {winner.by === "captured" ? "captured" : "domination"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
