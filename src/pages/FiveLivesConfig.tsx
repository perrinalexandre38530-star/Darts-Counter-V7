// @ts-nocheck
// =============================================================
// src/pages/FiveLivesConfig.tsx
// LES 5 VIES — CONFIG (style cohérent Killer/X01Config)
// - Sélection profils + bots (PRO + bots user dc_bots_v1)
// - Options : vies de départ, ordre de départ aléatoire
// - Lance FiveLivesPlay via go("five_lives_play", { config })
// =============================================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

// 🔽 AVATARS BOTS PRO (mêmes chemins que KillerConfig)
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";

export type FiveLivesConfigPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;
};

export type FiveLivesConfig = {
  id: string;
  mode: "five_lives";
  createdAt: number;
  startingLives: number; // default 5
  randomStartOrder: boolean;
  players: FiveLivesConfigPlayer[];
};

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
  onBack?: () => void;
  onStart?: (cfg: FiveLivesConfig) => void;
};

type BotLite = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  botLevel?: string;
};

const LS_BOTS_KEY = "dc_bots_v1";

const PRO_BOTS: BotLite[] = [
  { id: "bot_pro_mvg", name: "Green Machine", botLevel: "Légende", avatarDataUrl: avatarGreenMachine as any },
  { id: "bot_pro_wright", name: "Snake King", botLevel: "Pro", avatarDataUrl: avatarSnakeKing as any },
  { id: "bot_pro_littler", name: "Wonder Kid", botLevel: "Prodige Pro", avatarDataUrl: avatarWonderKid as any },
  { id: "bot_pro_price", name: "Ice Man", botLevel: "Pro", avatarDataUrl: avatarIceMan as any },
  { id: "bot_pro_anderson", name: "Flying Scotsman", botLevel: "Pro", avatarDataUrl: avatarFlyingScotsman as any },
  { id: "bot_pro_humphries", name: "Cool Hand", botLevel: "Pro", avatarDataUrl: avatarCoolHand as any },
  { id: "bot_pro_taylor", name: "The Power", botLevel: "Légende", avatarDataUrl: avatarThePower as any },
  { id: "bot_pro_smith", name: "Bully Boy", botLevel: "Pro", avatarDataUrl: avatarBullyBoy as any },
  { id: "bot_pro_aspinall", name: "The Asp", botLevel: "Fort", avatarDataUrl: avatarTheAsp as any },
  { id: "bot_pro_dobey", name: "Hollywood", botLevel: "Fort", avatarDataUrl: avatarHollywood as any },
  { id: "bot_pro_clayton", name: "The Ferret", botLevel: "Fort", avatarDataUrl: avatarTheFerret as any },
];

function clampInt(n: any, min: number, max: number, fb: number) {
  const x = Number.isFinite(+n) ? Math.trunc(+n) : fb;
  return Math.max(min, Math.min(max, x));
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadUserBots(): BotLite[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? "Bot"),
        avatarDataUrl: b?.avatarDataUrl ?? null,
        botLevel: b?.botLevel ?? "Bot",
      }))
      .filter((b: any) => b.id && b.name);
  } catch {
    return [];
  }
}

export default function FiveLivesConfigPage({ store, go, onBack, onStart }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles: Profile[] = store?.profiles ?? [];

  const [startingLives, setStartingLives] = React.useState(5);
  const [randomStartOrder, setRandomStartOrder] = React.useState(true);
  const [selected, setSelected] = React.useState<FiveLivesConfigPlayer[]>([]);

  const userBots = React.useMemo(() => loadUserBots(), []);
  const allBots = React.useMemo(() => {
    const byId = new Map<string, BotLite>();
    for (const b of [...PRO_BOTS, ...userBots]) byId.set(b.id, b);
    return Array.from(byId.values());
  }, [userBots]);

  const addProfile = (p: Profile) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev;
      return [...prev, { id: p.id, name: p.name || "Joueur", avatarDataUrl: p.avatarDataUrl ?? null }];
    });
  };

  const addBot = (b: BotLite) => {
    setSelected((prev) => {
      if (prev.some((x) => x.id === b.id)) return prev;
      return [...prev, { id: b.id, name: b.name || "Bot", avatarDataUrl: b.avatarDataUrl ?? null, isBot: true, botLevel: b.botLevel }];
    });
  };

  const remove = (id: string) => setSelected((prev) => prev.filter((p) => p.id !== id));

  const canStart = selected.length >= 2;

  const start = () => {
    const cfg: FiveLivesConfig = {
      id: `five_lives-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: "five_lives",
      createdAt: Date.now(),
      startingLives: clampInt(startingLives, 1, 20, 5),
      randomStartOrder: !!randomStartOrder,
      players: randomStartOrder ? shuffle(selected) : [...selected],
    };

    if (onStart) onStart(cfg);
    else if (go) go("five_lives_play", { config: cfg });
  };

  const pageBg = "#07070a"; // fond global fixe

  const card: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(20,20,22,.9), rgba(10,10,12,.95))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  };

  const h1: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 22,
    color: theme.text,
    textTransform: "uppercase",
  };

  const label: React.CSSProperties = {
    color: "rgba(255,255,255,.78)",
    fontWeight: 800,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };

  const btnPrimary: React.CSSProperties = {
    height: 52,
    borderRadius: 18,
    border: "1px solid rgba(255,180,0,.3)",
    background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
    color: "#1a1a1a",
    fontWeight: 900,
    cursor: canStart ? "pointer" : "not-allowed",
    opacity: canStart ? 1 : 0.5,
    boxShadow: "0 10px 22px rgba(255,170,0,.28)",
  };

  const btnGhost: React.CSSProperties = {
    height: 44,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.35)",
  };

  const toggleRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
  };

  return (
    <div
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: pageBg,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: 10,
        gap: 10,
        overscrollBehavior: "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => {
            if (onBack) onBack();
            else if (go) go("games");
          }}
          style={{
            ...btnGhost,
            height: 42,
            padding: "0 12px",
          }}
        >
          ← {t?.("common.back") ?? "Retour"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={h1}>LES 5 VIES</div>
          <div style={{ opacity: 0.75, fontWeight: 700, fontSize: 13 }}>
            {t?.("fiveLives.tagline") ?? "Bats la volée précédente ou perds une vie."}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 10 }}>
        {/* Options */}
        <div style={{ ...card, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>Options</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              {t?.("fiveLives.rule") ?? "Score STRICTEMENT supérieur"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={toggleRow}>
              <div>
                <div style={label}>Vies de départ</div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{clampInt(startingLives, 1, 20, 5)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button style={btnGhost} onClick={() => setStartingLives((v) => clampInt(v - 1, 1, 20, 5))}>
                  −
                </button>
                <button style={btnGhost} onClick={() => setStartingLives((v) => clampInt(v + 1, 1, 20, 5))}>
                  +
                </button>
              </div>
            </div>

            <div style={toggleRow}>
              <div>
                <div style={label}>Ordre de départ</div>
                <div style={{ fontWeight: 900, fontSize: 14, opacity: 0.92 }}>
                  {randomStartOrder ? "Aléatoire" : "Conservé"}
                </div>
              </div>
              <button
                style={{
                  ...btnGhost,
                  height: 44,
                  padding: "0 14px",
                  borderColor: randomStartOrder ? "rgba(255,198,58,.45)" : "rgba(255,255,255,.10)",
                  boxShadow: randomStartOrder ? "0 0 18px rgba(255,198,58,.20)" : undefined,
                }}
                onClick={() => setRandomStartOrder((v) => !v)}
              >
                {randomStartOrder ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Sélection participants */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>Participants</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{selected.length} / ∞</div>
          </div>

          {selected.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {selected.map((p) => (
                <div key={p.id} style={pill}>
                  <div style={{ width: 34, height: 34, position: "relative" }}>
                    <ProfileStarRing size={34} variant="mini" />
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                      <ProfileAvatar size={28} src={p.avatarDataUrl} name={p.name} />
                    </div>
                  </div>
                  <div style={{ display: "grid", lineHeight: 1.1 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name}
                    </div>
                    {p.isBot ? (
                      <div style={{ opacity: 0.7, fontSize: 11 }}>{p.botLevel ?? "Bot"}</div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    style={{
                      marginLeft: 6,
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(255,255,255,.06)",
                      color: "#fff",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                    aria-label="Retirer"
                    title="Retirer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 12, opacity: 0.75, fontWeight: 700, fontSize: 13 }}>
              {t?.("fiveLives.pickPlayers") ?? "Choisis au moins 2 participants (profils ou bots)."}
            </div>
          )}

          {/* Profils */}
          <div style={{ marginTop: 16 }}>
            <div style={label}>Profils</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
              {(profiles || []).map((p) => {
                const picked = selected.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addProfile(p)}
                    disabled={picked}
                    style={{
                      ...card,
                      padding: 10,
                      borderRadius: 16,
                      cursor: picked ? "not-allowed" : "pointer",
                      opacity: picked ? 0.35 : 1,
                    }}
                  >
                    <div style={{ display: "grid", placeItems: "center" }}>
                      <ProfileStarRing size={56} variant="mini" />
                      <div style={{ position: "absolute" }} />
                      <div style={{ marginTop: -52 }}>
                        <ProfileAvatar size={46} src={p.avatarDataUrl} name={p.name} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.name || "Joueur"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bots */}
          <div style={{ marginTop: 16 }}>
            <div style={label}>Bots</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginTop: 10 }}>
              {allBots.map((b) => {
                const picked = selected.some((x) => x.id === b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => addBot(b)}
                    disabled={picked}
                    style={{
                      ...card,
                      padding: 10,
                      borderRadius: 16,
                      cursor: picked ? "not-allowed" : "pointer",
                      opacity: picked ? 0.35 : 1,
                    }}
                  >
                    <div style={{ display: "grid", placeItems: "center" }}>
                      <ProfileStarRing size={56} variant="mini" />
                      <div style={{ marginTop: -52 }}>
                        <ProfileAvatar size={46} src={b.avatarDataUrl} name={b.name} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.name}
                    </div>
                    <div style={{ opacity: 0.65, fontSize: 11, fontWeight: 700 }}>{b.botLevel ?? "Bot"}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ height: 10 }} />
      </div>

      {/* Footer CTA */}
      <div style={{ display: "grid", gap: 10 }}>
        <button style={btnPrimary} onClick={start} disabled={!canStart}>
          {t?.("common.start") ?? "Démarrer"}
        </button>
        {!canStart ? (
          <div style={{ textAlign: "center", opacity: 0.7, fontSize: 12, fontWeight: 700 }}>
            {t?.("fiveLives.needTwoPlayers") ?? "Ajoute au moins 2 participants pour lancer la partie."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
