// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";

const BUILTIN_BOTS = [
  { id: "gros6_bot_rookie", name: "BOT Rookie", botLevel: "1/5" },
  { id: "gros6_bot_challenger", name: "BOT Challenger", botLevel: "2/5" },
  { id: "gros6_bot_tactician", name: "BOT Tactician", botLevel: "3/5" },
  { id: "gros6_bot_sniper", name: "BOT Sniper", botLevel: "4/5" },
  { id: "gros6_bot_legend", name: "BOT Legend", botLevel: "5/5" },
];

function normalizeAvatar(p) {
  return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoDataUrl ?? null;
}

function sanitizePlayers(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => ({
      id: String(p?.id || `p-${Math.random().toString(36).slice(2, 9)}`),
      name: String(p?.name || "Joueur"),
      avatarDataUrl: normalizeAvatar(p),
      isBot: !!p?.isBot,
      botLevel: p?.botLevel || null,
    }))
    .filter((p) => !!p.id);
}

function pillStyle(active, theme) {
  return {
    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
    background: active ? `${theme.primary}22` : "rgba(255,255,255,0.05)",
    color: active ? "#fff" : theme.text,
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: active ? `0 0 18px ${theme.primary}55` : "none",
  };
}

function cardStyle(active, theme) {
  return {
    borderRadius: 18,
    border: active ? `1px solid ${theme.primary}` : `1px solid ${theme.borderSoft}`,
    background: active ? `linear-gradient(180deg, ${theme.primary}22, rgba(8,10,20,.92))` : "rgba(10,12,24,.92)",
    boxShadow: active ? `0 0 24px ${theme.primary}44` : "0 10px 28px rgba(0,0,0,.28)",
    padding: 12,
    cursor: "pointer",
    display: "grid",
    gap: 10,
  };
}

export default function Gros6Config({ store, go }) {
  const { theme } = useTheme();
  const localProfiles = React.useMemo(() => sanitizePlayers(store?.profiles || []), [store?.profiles]);
  const userBots = React.useMemo(() => {
    try {
      return sanitizePlayers(loadBotPlayers().map((b) => ({ ...b, isBot: true })));
    } catch {
      return [];
    }
  }, []);
  const bots = React.useMemo(() => {
    const merged = [...BUILTIN_BOTS, ...userBots.map((b) => ({ ...b, id: String(b.id), isBot: true }))];
    const seen = new Set();
    return merged.filter((b) => {
      const key = String(b.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [userBots]);

  const [selected, setSelected] = React.useState([]);
  const [startingLives, setStartingLives] = React.useState(5);
  const [targetRule, setTargetRule] = React.useState("strict");
  const [allowBull, setAllowBull] = React.useState(true);
  const [allowSpecialZones, setAllowSpecialZones] = React.useState(true);
  const [randomStartOrder, setRandomStartOrder] = React.useState(false);
  const [thirdDartBonusSelection, setThirdDartBonusSelection] = React.useState(true);
  const [thirdDartBonusCount, setThirdDartBonusCount] = React.useState(3);

  const togglePick = React.useCallback((player) => {
    setSelected((prev) => {
      const exists = prev.some((p) => p.id === player.id);
      if (exists) return prev.filter((p) => p.id !== player.id);
      return [...prev, player];
    });
  }, []);

  const startGame = React.useCallback(() => {
    let players = [...selected];
    if (players.length < 2) return;
    if (randomStartOrder) {
      players = [...players].sort(() => Math.random() - 0.5);
    }
    const config = {
      id: `gros6-${Date.now()}`,
      mode: "gros_6",
      createdAt: Date.now(),
      startingLives,
      targetRule,
      allowBull,
      allowSpecialZones,
      randomStartOrder,
      thirdDartBonusSelection,
      thirdDartBonusCount,
      startingTarget: { kind: "segment", ring: "S", value: 6 },
      players,
    };
    go?.("gros_6_play", { config });
  }, [selected, startingLives, targetRule, allowBull, allowSpecialZones, randomStartOrder, thirdDartBonusSelection, thirdDartBonusCount, go]);

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg || theme.bg, color: theme.text, padding: 16 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          margin: "-16px -16px 18px",
          paddingTop: "env(safe-area-inset-top)",
          background: theme.pageBg || theme.bg,
        }}
      >
        <div style={{ position: "relative", height: 92, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,.42)" }}>
          <img
            src={tickerGros6 as any}
            alt="Gros 6"
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: "0 12px", pointerEvents: "none" }}>
            <div style={{ pointerEvents: "auto" }}>
              <BackDot onClick={() => go?.("games")} size={42} color={theme.primary} glow={`${theme.primary}AA`} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 20, background: "rgba(8,10,20,.86)", padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Règle intégrée</div>
          <div style={{ opacity: 0.92, lineHeight: 1.5, fontSize: 14 }}>
            Départ sur <b>S6</b>. Chaque joueur dispose de <b>3 fléchettes</b> pour toucher la cible courante.
            En cas d'échec il perd <b>1 vie</b>. S'il valide, les fléchettes restantes servent à <b>définir la cible suivante</b>.
            Variante demandée intégrée : les <b>zones fermées extérieures</b> (extérieur du cercle des chiffres,
            rond des numéros 1 à 20, comme 6, 9, 10, 8, 18, 20, 19, etc.) peuvent aussi devenir des cibles.
            Et si la cible est validée sur la <b>3e fléchette</b>, le joueur reçoit <b>{thirdDartBonusCount} fléchettes bonus</b>
            pour définir la prochaine zone.
          </div>
        </div>

        <div style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 20, background: "rgba(8,10,20,.86)", padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>1. Choix des joueurs</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>Sélectionne au moins 2 participants.</div>

          <div style={{ fontWeight: 800, marginBottom: 8 }}>Profils locaux</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {localProfiles.map((p) => {
              const active = selected.some((x) => x.id === p.id);
              return (
                <div key={p.id} onClick={() => togglePick(p)} style={cardStyle(active, theme)}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={64} />
                  </div>
                  <div style={{ textAlign: "center", fontWeight: 800 }}>{p.name}</div>
                  <div style={{ textAlign: "center", fontSize: 12, opacity: 0.78 }}>Joueur local</div>
                </div>
              );
            })}
            {!localProfiles.length && (
              <div style={{ opacity: 0.78, fontSize: 13 }}>Aucun profil local trouvé.</div>
            )}
          </div>

          <div style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Bots</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {bots.map((p) => {
              const active = selected.some((x) => x.id === p.id);
              return (
                <div key={p.id} onClick={() => togglePick({ ...p, isBot: true })} style={cardStyle(active, theme)}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <ProfileAvatar name={p.name} avatarDataUrl={p.avatarDataUrl} size={64} />
                  </div>
                  <div style={{ textAlign: "center", fontWeight: 800 }}>{p.name}</div>
                  <div style={{ textAlign: "center", fontSize: 12, opacity: 0.78 }}>Niveau {p.botLevel || "3/5"}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selected.map((p) => (
              <div key={p.id} style={{ ...pillStyle(true, theme), padding: "6px 10px" }}>{p.name}</div>
            ))}
            {!selected.length && <div style={{ opacity: 0.75, fontSize: 13 }}>Aucun joueur sélectionné.</div>}
          </div>
        </div>

        <div style={{ border: `1px solid ${theme.borderSoft}`, borderRadius: 20, background: "rgba(8,10,20,.86)", padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>2. Variantes</div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Vies de départ</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[3, 5, 7, 10, 15].map((n) => (
                  <button key={n} type="button" onClick={() => setStartingLives(n)} style={pillStyle(startingLives === n, theme)}>{n} vies</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Règle de validation</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={() => setTargetRule("strict")} style={pillStyle(targetRule === "strict", theme)}>Stricte S / D / T distincts</button>
                <button type="button" onClick={() => setTargetRule("value")} style={pillStyle(targetRule === "value", theme)}>Facile : seule la valeur compte</button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button type="button" onClick={() => setAllowBull((v) => !v)} style={pillStyle(allowBull, theme)}>Bull / DBull autorisés</button>
              <button type="button" onClick={() => setAllowSpecialZones((v) => !v)} style={pillStyle(allowSpecialZones, theme)}>Zones extérieures spéciales</button>
              <button type="button" onClick={() => setRandomStartOrder((v) => !v)} style={pillStyle(randomStartOrder, theme)}>Ordre aléatoire</button>
              <button type="button" onClick={() => setThirdDartBonusSelection((v) => !v)} style={pillStyle(thirdDartBonusSelection, theme)}>Bonus si validation sur 3e fléchette</button>
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Bonus 3e fléchette</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => setThirdDartBonusCount(n)} style={pillStyle(thirdDartBonusCount === n, theme)}>{n} fléchette{n > 1 ? "s" : ""}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 24 }}>
          <button
            type="button"
            onClick={startGame}
            disabled={selected.length < 2}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "16px 30px",
              fontSize: 18,
              fontWeight: 900,
              color: "#fff",
              cursor: selected.length < 2 ? "not-allowed" : "pointer",
              background: selected.length < 2 ? "rgba(255,255,255,.14)" : `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`,
              boxShadow: selected.length < 2 ? "none" : `0 0 28px ${theme.primary}66`,
              opacity: selected.length < 2 ? 0.65 : 1,
            }}
          >
            Lancer le GROS 6
          </button>
        </div>
      </div>
    </div>
  );
}
