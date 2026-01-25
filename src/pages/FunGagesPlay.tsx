import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

type Config = {
  players: number;
  perPlayer: boolean;
};

const INFO_TEXT = `GAGES / MODE FUN (standalone)

- Bouton "Tirer un gage".
- Historique en bas.
- Si "Tour par joueur" est activé: on avance automatiquement le joueur.`;

const DEFAULT_GAGES: string[] = [
  "Bois une gorgée",
  "Distribue 2 gorgées",
  "Imite un commentateur sportif pendant 30 secondes",
  "Joue la prochaine volée avec la main non dominante",
  "Pas le droit de parler jusqu'à ton prochain tour",
  "Fais 5 pompes",
  "Chante un refrain (au choix du groupe)",
  "Ton voisin choisit ton gage",
  "Échange ta boisson avec quelqu'un (1 tour)",
  "Si tu rates le bull au prochain tour: 2 gorgées",
  "Raconte une anecdote",
  "Fais un compliment sincère à chaque joueur",
];

export default function FunGagesPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const cfg: Config =
    (props?.params?.config as Config) ||
    (props?.config as Config) ||
    ({ players: 2, perPlayer: true } as Config);

  const [playerIdx, setPlayerIdx] = useState(0);
  const [history, setHistory] = useState<{ player: number; text: string; ts: number }[]>([]);
  const [last, setLast] = useState<string | null>(null);

  const playersCount = Math.max(1, Math.min(12, Number(cfg.players) || 1));

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function draw() {
    const pool = DEFAULT_GAGES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setLast(pick);
    setHistory((h) => [{ player: playerIdx, text: pick, ts: Date.now() }, ...h].slice(0, 30));
    if (cfg.perPlayer) setPlayerIdx((p) => (p + 1) % playersCount);
  }

  const currentLabel = useMemo(() => {
    return `${t("generic.player", "Joueur")} ${playerIdx + 1}/${playersCount}`;
  }, [playerIdx, playersCount, t]);

  return (
    <div className="page">
      <PageHeader
        title="GAGES"
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GAGES" content={INFO_TEXT} />}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 1 }}>
                {t("generic.turn", "TOUR")}
              </div>
              <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 6 }}>{currentLabel}</div>
            </div>

            <button
              className="btn-primary"
              onClick={draw}
              style={{ padding: "12px 14px", borderRadius: 14, fontWeight: 1000 }}
            >
              {t("fun.draw", "Tirer un gage")}
            </button>
          </div>

          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.20)",
              minHeight: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontWeight: 1000,
            }}
          >
            {last ? last : t("fun.pressDraw", "Appuie sur 'Tirer un gage'.")}
          </div>

          {!cfg.perPlayer && (
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button
                className="btn-secondary"
                onClick={() => setPlayerIdx((p) => (p - 1 + playersCount) % playersCount)}
                style={{ flex: 1 }}
              >
                {t("generic.prev", "Précédent")}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setPlayerIdx((p) => (p + 1) % playersCount)}
                style={{ flex: 1 }}
              >
                {t("generic.next", "Suivant")}
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, letterSpacing: 1, marginBottom: 8 }}>
            {t("generic.history", "HISTORIQUE")}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {history.length === 0 && (
              <div style={{ opacity: 0.7, fontWeight: 800 }}>{t("generic.empty", "Aucun gage tiré pour l'instant.")}</div>
            )}
            {history.map((h) => (
              <div
                key={h.ts}
                style={{
                  borderRadius: 14,
                  padding: 10,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>
                  {t("generic.player", "Joueur")} {h.player + 1}
                </div>
                <div style={{ marginTop: 4, fontWeight: 1000 }}>{h.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
