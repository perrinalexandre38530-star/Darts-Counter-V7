// =============================================================
// src/pages/pingpong/PingPongConfig.tsx
// Config Ping-Pong (LOCAL ONLY)
// - Minimal v1: noms joueurs/équipes + sets gagnants + points par set
// - Démarre une nouvelle partie en réinitialisant le state local
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { loadPingPongState, resetPingPong, setConfig, type PingPongMode } from "../../lib/pingpongStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store: any;
};

export default function PingPongConfig({ go, params }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadPingPongState());

  // On accepte plusieurs ids (menu "games" / anciennes versions)
  const uiMode: string = String(params?.mode ?? st.mode ?? "sets");
  const isTournante = uiMode === "tournante";
  const isTraining = uiMode === "training";
  const is2v2 = uiMode === "match_2v2";
  const is2v1 = uiMode === "match_2v1";

  // Le moteur actuel est basé sur "sets" (ou "tournante").
  // - 1v1 / 2v2 / 2v1 => sets (avec setsToWin réglable, ex 1 pour un match en 1 set)
  // - tournante => tournante
  const engineMode: PingPongMode = isTournante ? "tournante" : "sets";

  // Champs joueurs (UI) — servent à composer sideA/sideB
  const parsedA = React.useMemo(() => splitNames(st.sideA), [st.sideA]);
  const parsedB = React.useMemo(() => splitNames(st.sideB), [st.sideB]);
  const [a1, setA1] = React.useState(parsedA[0] || "Joueur A");
  const [a2, setA2] = React.useState(parsedA[1] || "");
  const [b1, setB1] = React.useState(parsedB[0] || "Joueur B");
  const [b2, setB2] = React.useState(parsedB[1] || "");
  const [pointsPerSet, setPointsPerSet] = React.useState(String(st.pointsPerSet || 11));
  const [setsToWin, setSetsToWin] = React.useState(String(st.setsToWin || 3));
  const [winByTwo, setWinByTwo] = React.useState(st.winByTwo !== false);

  const [tournanteText, setTournanteText] = React.useState(() =>
    Array.isArray(st.tournantePlayers) && st.tournantePlayers.length
      ? st.tournantePlayers.join("\n")
      : "Joueur 1\nJoueur 2\nJoueur 3\nJoueur 4"
  );

  const onStart = () => {
    const base = resetPingPong(st);
    const players = tournanteText
      .split("\n")
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    // Training est un écran séparé.
    if (isTraining) {
      go("pingpong_training");
      return;
    }

    // Compose sides selon le format.
    const nextSideA = is2v2 || is2v1 ? joinNames([a1, a2]) : (a1 || "Joueur A").trim();
    const nextSideB = is2v2 ? joinNames([b1, b2]) : is2v1 ? (b1 || "Joueur B").trim() : (b1 || "Joueur B").trim();

    const next = setConfig(
      base,
      engineMode,
      nextSideA,
      nextSideB,
      Number(pointsPerSet) || 11,
      Number(setsToWin) || 3,
      winByTwo,
      isTournante ? players : undefined
    );
    setSt(next);
    go("pingpong_play", { matchId: next.matchId });
  };

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("games")}>
          ← Retour
        </button>
        <div style={title}>
          CONFIG — PING-PONG
          {isTraining ? " · TRAINING" : isTournante ? " · TOURNANTE" : is2v2 ? " · 2V2" : is2v1 ? " · 2V1" : " · 1V1"}
        </div>
      </div>

      <div style={card(theme)}>
        {isTraining ? (
          <>
            <div style={{ fontWeight: 1000, letterSpacing: 0.6, marginBottom: 6 }}>Training</div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85, lineHeight: 1.45 }}>
              Lance une session d'entraînement (compteur de réussites, séries, temps).
            </div>
          </>
        ) : isTournante ? (
          <>
            <div style={label}>Joueurs (1 par ligne)</div>
            <textarea
              value={tournanteText}
              onChange={(e) => setTournanteText(e.target.value)}
              style={{ ...input(theme), minHeight: 140, resize: "vertical", fontFamily: "inherit" }}
            />

            <div style={{ height: 12 }} />
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>
              Astuce : tu peux coller une liste complète. À chaque tour, tu élimines un joueur.
            </div>
          </>
        ) : (
          <>
            <div style={label}>{is2v2 || is2v1 ? "Équipe A" : "Joueur A"}</div>
            <input value={a1} onChange={(e) => setA1(e.target.value)} style={input(theme)} />

            {(is2v2 || is2v1) && (
              <>
                <div style={{ height: 10 }} />
                <div style={label}>Joueur A2</div>
                <input value={a2} onChange={(e) => setA2(e.target.value)} style={input(theme)} />
              </>
            )}

            <div style={{ height: 10 }} />

            <div style={label}>{is2v2 ? "Équipe B" : "Joueur B"}</div>
            <input value={b1} onChange={(e) => setB1(e.target.value)} style={input(theme)} />

            {is2v2 && (
              <>
                <div style={{ height: 10 }} />
                <div style={label}>Joueur B2</div>
                <input value={b2} onChange={(e) => setB2(e.target.value)} style={input(theme)} />
              </>
            )}

            <div style={{ height: 10 }} />

            <div style={label}>Points par set</div>
            <input
              value={pointsPerSet}
              onChange={(e) => setPointsPerSet(e.target.value)}
              style={input(theme)}
              inputMode="numeric"
            />

            {true && (
              <>
                <div style={{ height: 10 }} />

                <div style={label}>Sets gagnants</div>
                <input
                  value={setsToWin}
                  onChange={(e) => setSetsToWin(e.target.value)}
                  style={input(theme)}
                  inputMode="numeric"
                />
                <div style={{ height: 10 }} />

                <label style={checkRow}>
                  <input type="checkbox" checked={winByTwo} onChange={(e) => setWinByTwo(e.target.checked)} />
                  <span style={{ fontWeight: 900, opacity: 0.9 }}>Écart de 2 (règle standard)</span>
                </label>
              </>
            )}
          </>
        )}

        <div style={{ height: 14 }} />

        <button style={primary(theme)} onClick={onStart}>
          {isTraining ? "Lancer le training" : "Lancer la partie"}
        </button>
      </div>
    </div>
  );
}

function splitNames(raw: string): string[] {
  const s = String(raw || "").trim();
  if (!s) return [];
  // tolérant : "A · B" / "A & B" / "A + B" / "A,B"
  const parts = s
    .split(/\s*(?:·|&|\+|,|\/|\|)\s*/g)
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return parts.slice(0, 4);
}

function joinNames(names: string[]): string {
  const out = (names || []).map((s) => String(s || "").trim()).filter(Boolean);
  return out.length ? out.join(" · ") : "";
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 };
const title: React.CSSProperties = { fontWeight: 1000 as any, letterSpacing: 0.7 };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };

function back(theme: any): React.CSSProperties {
  return {
    borderRadius: 12,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
  };
}

const label: React.CSSProperties = { fontWeight: 900, opacity: 0.9, marginBottom: 6 };

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    outline: "none",
    fontWeight: 800,
  };
}

function primary(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 950,
    cursor: "pointer",
  };
}
