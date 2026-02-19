import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ScoreInputHub from "../components/ScoreInputHub";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import tickerCapital from "../assets/tickers/ticker_capital.png";

type BotLevel = "easy" | "normal" | "hard";

export type CapitalModeKind = "official" | "custom";

export type CapitalContractID =
  | "capital"
  | "n20"
  | "triple_any"
  | "n19"
  | "double_any"
  | "n18"
  | "side"
  | "n17"
  | "suite"
  | "n16"
  | "colors_3"
  | "n15"
  | "exact_57"
  | "n14"
  | "center";

export type CapitalConfigPayload = {
  players: number;
  botsEnabled: boolean;
  botLevel: BotLevel;

  mode: CapitalModeKind;

  /** Custom sequence (si mode="custom") */
  customContracts?: CapitalContractID[];
  /** Forcer "capital" en premier (recommandé) */
  includeCapital?: boolean;
};

type Dart = { v: number; mult: 1 | 2 | 3 };

const OFFICIAL_CONTRACTS: CapitalContractID[] = [
  "capital",
  "n20",
  "triple_any",
  "n19",
  "double_any",
  "n18",
  "side",
  "n17",
  "suite",
  "n16",
  "colors_3",
  "n15",
  "exact_57",
  "n14",
  "center",
];

const INFO_TEXT = `RÈGLE OFFICIELLE — CAPITAL (15 contrats)

Avant les contrats, chaque joueur lance 3 fléchettes pour se constituer son CAPITAL (score de départ).
Ensuite, chaque contrat se joue en 1 volée de 3 fléchettes :

- ✅ Contrat réussi → on AJOUTE le total de la volée au score
- ❌ Contrat raté → le score est DIVISÉ PAR 2 (arrondi à l’entier inférieur)

Contrats: Capital, 20, Triple, 19, Double, 18, Side (côte à côte), 17, Suite, 16, Couleur, 15, 57, 14, Centre.`;

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/**
 * Mapping “classique” des couleurs rouge/vert sur les anneaux double/triple.
 * (Dartboard standard : rouge = 20,12,14,8,7,3,2,10,13,18 ; vert = le reste)
 */
const RED_NUMS = new Set([20, 12, 14, 8, 7, 3, 2, 10, 13, 18]);

function scoreDart(d: Dart): number {
  if (!d) return 0;
  const v = Number(d.v || 0);
  const m = Number(d.mult || 1);
  if (!Number.isFinite(v) || !Number.isFinite(m)) return 0;
  if (v === 25) return 25 * m; // bull=25, double-bull=50
  if (v <= 0) return 0;
  return v * m;
}

function scoreThrow(th: Dart[]): number {
  return (th || []).reduce((acc, d) => acc + scoreDart(d), 0);
}

function isValidNumber(v: number): boolean {
  return Number.isFinite(v) && v >= 1 && v <= 20;
}

function contractLabel(id: CapitalContractID): string {
  switch (id) {
    case "capital": return "Capital";
    case "n20": return "20";
    case "triple_any": return "Triple";
    case "n19": return "19";
    case "double_any": return "Double";
    case "n18": return "18";
    case "side": return "Side";
    case "n17": return "17";
    case "suite": return "Suite";
    case "n16": return "16";
    case "colors_3": return "Couleur";
    case "n15": return "15";
    case "exact_57": return "57";
    case "n14": return "14";
    case "center": return "Centre";
    default: return String(id);
  }
}

type DartColor = "black" | "white" | "red" | "green" | "none";

/** Renvoie une couleur “contrat Couleur” (noir/blanc pour simples, rouge/vert pour doubles/triples, bull vert/rouge) */
function dartColor(d: Dart): DartColor {
  const v = d?.v ?? 0;
  const mult = d?.mult ?? 1;

  if (v === 25) {
    // bull ext = vert, bull int (double) = rouge
    return mult === 2 ? "red" : "green";
  }
  if (!isValidNumber(v)) return "none";

  if (mult === 1) {
    const idx = BOARD_ORDER.indexOf(v);
    if (idx < 0) return "none";
    return idx % 2 === 0 ? "black" : "white"; // 20 (index 0) = noir, puis alternance
  }
  // double/triple
  return RED_NUMS.has(v) ? "red" : "green";
}

function isTripleAny(th: Dart[]): boolean {
  return (th || []).some((d) => d?.mult === 3 && isValidNumber(d?.v ?? 0));
}

function isDoubleAny(th: Dart[]): boolean {
  return (th || []).some((d) => (d?.mult === 2 && (isValidNumber(d?.v ?? 0) || d?.v === 25)));
}

function hasNumber(th: Dart[], n: number): boolean {
  return (th || []).some((d) => d?.v === n && isValidNumber(n));
}

function isCenter(th: Dart[]): boolean {
  return (th || []).some((d) => d?.v === 25);
}

function isSuite(th: Dart[]): boolean {
  const nums = (th || [])
    .map((d) => d?.v ?? 0)
    .filter((v) => isValidNumber(v));
  if (nums.length !== 3) return false;
  const set = Array.from(new Set(nums));
  if (set.length !== 3) return false;
  set.sort((a, b) => a - b);
  return set[2] - set[0] === 2 && set[1] === set[0] + 1;
}

function isSide(th: Dart[]): boolean {
  // 3 secteurs côte à côte sur la cible (ordre circulaire), bull interdit
  const nums = (th || [])
    .map((d) => d?.v ?? 0)
    .filter((v) => isValidNumber(v));
  if (nums.length !== 3) return false;
  const setNums = Array.from(new Set(nums));
  if (setNums.length !== 3) return false;

  const idxs = setNums.map((n) => BOARD_ORDER.indexOf(n)).filter((i) => i >= 0);
  if (idxs.length !== 3) return false;

  // Check contiguous triplet on circular ring
  for (let start = 0; start < 20; start++) {
    const needed = new Set([start, (start + 1) % 20, (start + 2) % 20]);
    if (idxs.every((i) => needed.has(i))) return true;
  }
  return false;
}

function isColors3(th: Dart[]): boolean {
  const cols = (th || []).map(dartColor).filter((c) => c !== "none");
  if (cols.length !== 3) return false;
  return new Set(cols).size === 3;
}

function isExact(th: Dart[], target: number): boolean {
  return scoreThrow(th) === target;
}

function contractSuccess(contract: CapitalContractID, th: Dart[]): boolean {
  switch (contract) {
    case "capital":
      return (th || []).length === 3; // toujours “réussi” si 3 fléchettes saisies
    case "n20":
      return hasNumber(th, 20);
    case "triple_any":
      return isTripleAny(th);
    case "n19":
      return hasNumber(th, 19);
    case "double_any":
      return isDoubleAny(th);
    case "n18":
      return hasNumber(th, 18);
    case "side":
      return isSide(th);
    case "n17":
      return hasNumber(th, 17);
    case "suite":
      return isSuite(th);
    case "n16":
      return hasNumber(th, 16);
    case "colors_3":
      return isColors3(th);
    case "n15":
      return hasNumber(th, 15);
    case "exact_57":
      return isExact(th, 57);
    case "n14":
      return hasNumber(th, 14);
    case "center":
      return isCenter(th);
    default:
      return false;
  }
}

export default function CapitalPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: CapitalConfigPayload =
    (props?.params?.config as CapitalConfigPayload) ||
    (props?.config as CapitalConfigPayload) ||
    {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      mode: "official",
      includeCapital: true,
      customContracts: OFFICIAL_CONTRACTS,
    };

  const contracts = useMemo<CapitalContractID[]>(() => {
    if (cfg.mode === "official") return OFFICIAL_CONTRACTS;

    const base = Array.isArray(cfg.customContracts) ? cfg.customContracts.filter(Boolean) : [];
    const includeCapital = cfg.includeCapital !== false;

    // sécurise : pas plus de 30 contrats custom
    let out = base.slice(0, 30);

    if (includeCapital) {
      out = out.filter((x) => x !== "capital");
      out.unshift("capital");
    } else {
      // si capital supprimé, on ne peut pas démarrer à score=0 sinon ça n’a pas de sens
      // → on injecte quand même un capital “virtuel” via 3 fléchettes, mais en mode custom on laisse le choix
    }

    // fallback si liste vide
    if (out.length === 0) out = OFFICIAL_CONTRACTS;
    return out;
  }, [cfg.mode, cfg.customContracts, cfg.includeCapital]);

  const rounds = contracts.length;

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);

  const [scores, setScores] = useState<number[]>(() => Array.from({ length: cfg.players }, () => 0));

  const [currentThrow, setCurrentThrow] = useState<Dart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const currentContract = contracts[Math.min(roundIdx, rounds - 1)];
  const isFinished = roundIdx >= rounds;

  function goBack() {
    if (props?.setTab) return props.setTab("capital_config");
    window.history.back();
  }

  function pushDart(d: Dart) {
    setCurrentThrow((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, d];
    });
  }

  function cancelTurn() {
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function validateTurn() {
    if (isFinished) return;
    if (currentThrow.length === 0) return;

    // si moins de 3 fléchettes saisies, on complète avec des misses (0)
    const th: Dart[] = [...currentThrow];
    while (th.length < 3) th.push({ v: 0, mult: 1 });

    const ok = contractSuccess(currentContract, th);
    const visit = scoreThrow(th);

    setScores((prev) => {
      const out = [...prev];
      const prevScore = out[playerIdx] ?? 0;

      if (currentContract === "capital") {
        // score de départ = total des 3 fléchettes
        out[playerIdx] = visit;
      } else {
        out[playerIdx] = ok ? prevScore + visit : Math.floor(prevScore / 2);
      }
      return out;
    });

    // next
    const nextP = (playerIdx + 1) % cfg.players;
    const nextR = nextP === 0 ? roundIdx + 1 : roundIdx;

    setPlayerIdx(nextP);
    setRoundIdx(nextR);

    cancelTurn();
  }

  const leaderIdx = useMemo(() => {
    let best = -Infinity;
    let bestIdx = 0;
    scores.forEach((s, i) => {
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [scores]);

  const successNow = useMemo(() => {
    if (isFinished) return false;
    if (currentThrow.length === 0) return false;
    const th = [...currentThrow];
    while (th.length < 3) th.push({ v: 0, mult: 1 });
    return contractSuccess(currentContract, th);
  }, [isFinished, currentThrow, currentContract]);

  return (
    <div className="page">
      <PageHeader
        title="CAPITAL"
        tickerSrc={tickerCapital}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles CAPITAL" content={INFO_TEXT} />}
      />

      <div style={{ padding: 12 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.round", "ROUND")} {Math.min(roundIdx + 1, rounds)}/{rounds}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                Contrat :{" "}
                <span style={{ color: "rgba(255,230,120,0.95)" }}>
                  {isFinished ? "—" : contractLabel(currentContract)}
                </span>
              </div>
              {!isFinished && (
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  {successNow ? "✅ Contrat validé (si tu valides la volée)" : "—"}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.player", "JOUEUR")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>
                {isFinished ? "—" : `${playerIdx + 1}/${cfg.players}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            const leader = isFinished ? i === leaderIdx : false;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active
                    ? "1px solid rgba(120,255,200,0.35)"
                    : leader
                      ? "1px solid rgba(255,230,120,0.45)"
                      : "1px solid rgba(255,255,255,0.10)",
                  background: active
                    ? "rgba(120,255,200,0.10)"
                    : leader
                      ? "rgba(255,230,120,0.10)"
                      : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {t("generic.player", "Joueur")} {i + 1} {leader ? "🏆" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
              </div>
            );
          })}
        </div>

        {isFinished ? (
          <div style={{ marginTop: 14, opacity: 0.9 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>
              Fin de partie — vainqueur : Joueur {leaderIdx + 1}
            </div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              Appuie sur retour pour rejouer / reconfigurer.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.throw", "VOLÉE")} ({currentThrow.length}/3) — S/D/T/Bull
            </div>

            <div style={{ marginTop: 10 }}>
              <ScoreInputHub
                currentThrow={currentThrow as any}
                multiplier={multiplier as any}
                onSimple={() => setMultiplier(1)}
                onDouble={() => setMultiplier(2)}
                onTriple={() => setMultiplier(3)}
                onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                onCancel={cancelTurn}
                onNumber={(n) => {
                  const v = Number(n);
                  if (!Number.isFinite(v)) return;
                  pushDart({ v, mult: v === 0 ? 1 : multiplier });
                  setMultiplier(1);
                }}
                onBull={() => {
                  const mult = multiplier === 2 ? 2 : 1;
                  pushDart({ v: 25, mult });
                  setMultiplier(1);
                }}
                onValidate={validateTurn}
                onDirectDart={(d: any) => {
                  pushDart({ v: Number(d?.v ?? 0), mult: Number(d?.mult ?? 1) as any });
                  setMultiplier(1);
                }}
                onMiss={() => {
                  pushDart({ v: 0, mult: 1 });
                  setMultiplier(1);
                }}
              />
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Total volée : <b>{scoreThrow(currentThrow)}</b>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {currentContract === "capital"
                  ? "⚑ Le total devient ton score de départ"
                  : successNow
                    ? "✅ Validé → + total"
                    : "❌ Raté → score /2"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
