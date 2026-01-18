// @ts-nocheck
// =============================================================
// src/pages/FiveLivesConfig.tsx
// LES 5 VIES — CONFIG
// ✅ UI = pattern KillerConfig (carrousels profils + bots)
// - Sélection profils locaux (store.profiles)
// - Ajout bots : PRO + bots user depuis localStorage dc_bots_v1
// - Options : vies de départ, ordre de départ aléatoire
// - Lance FiveLivesPlay via go("five_lives_play", { config })
// ✅ NEW: BackDot + InfoDot harmonisés (même taille / halo / couleur thème)
// ✅ FIX: aura sélection BOTS = EXACTEMENT comme JOUEURS (theme.primary)
// =============================================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";

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

// --------------------------------------------------
// Types exportés (utilisés par FiveLivesPlay)
// --------------------------------------------------
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
  startingLives: number;
  randomStartOrder: boolean;
  players: FiveLivesConfigPlayer[];
};

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
  onBack?: () => void;
  onStart?: (cfg: FiveLivesConfig) => void;
  onStartGame?: (cfg: FiveLivesConfig) => void;
  onPlay?: (cfg: FiveLivesConfig) => void;
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
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fb;
  return Math.max(min, Math.min(max, x));
}

function pickAvatar(p: any): string | null {
  if (!p) return null;
  return p.avatarDataUrl ?? p.avatar ?? p.avatarUrl ?? p.photoDataUrl ?? null;
}

// ✅ normalise vite/webpack: import png peut être string OU {default:string}
function normalizeImgSrc(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") {
    const d = (v as any).default;
    if (typeof d === "string") return d.trim() || null;
  }
  return null;
}

function shuffleArray<T>(arr: T[]) {
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

function resolveBotLevel(botLevelRaw?: string | null): { level: number } {
  const v = (botLevelRaw || "").toLowerCase().trim();
  if (!v) return { level: 1 };
  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) return { level: n };
  }
  if (v.includes("legend") || v.includes("légende")) return { level: 5 };
  if (v.includes("pro")) return { level: 4 };
  if (v.includes("fort") || v.includes("hard") || v.includes("difficile")) return { level: 3 };
  if (v.includes("standard") || v.includes("normal") || v.includes("moyen")) return { level: 2 };
  if (v.includes("easy") || v.includes("facile") || v.includes("débutant")) return { level: 1 };
  return { level: 1 };
}

// ------------------ UI bits ------------------

type PillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  primary: string;
  primarySoft: string;
  compact?: boolean;
  disabled?: boolean;
  title?: string;
};

function PillButton({ label, active, onClick, primary, primarySoft, compact, disabled, title }: PillProps) {
  const isDisabled = !!disabled;

  const bg = isDisabled ? "rgba(40,42,60,0.7)" : active ? primarySoft : "rgba(9,11,20,0.9)";
  const border = isDisabled
    ? "1px solid rgba(255,255,255,0.04)"
    : active
    ? `1px solid ${primary}`
    : "1px solid rgba(255,255,255,0.07)";
  const color = isDisabled ? "#777b92" : active ? "#fdf9ee" : "#d0d3ea";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={title}
      style={{
        borderRadius: 999,
        padding: compact ? "4px 9px" : "6px 12px",
        border,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: active && !isDisabled ? 800 : 650,
        boxShadow: active && !isDisabled ? `0 0 14px ${primary}55` : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.7 : 1,
        cursor: isDisabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* Médaillon BOT – doré PRO, bleu bots user (copié de KillerConfig)
   ✅ FIX: aura sélection = EXACTEMENT comme JOUEURS (theme.primary)
*/
function BotMedallion({
  bot,
  level,
  active,
  activeGlow,
}: {
  bot: BotLite;
  level: number;
  active: boolean;
  activeGlow: string; // ex: `${primary}aa`
}) {
  const isPro = bot.id.startsWith("bot_pro_");
  const COLOR = isPro ? "#f7c85c" : "#00b4ff";
  const COLOR_GLOW = isPro ? "rgba(247,200,92,0.9)" : "rgba(0,172,255,0.65)";

  const SCALE = 0.62;
  const AVATAR = 96 * SCALE;
  const MEDALLION = 104 * SCALE;
  const STAR = 18 * SCALE;
  const WRAP = MEDALLION + STAR;

  const lvl = Math.max(1, Math.min(5, level));
  const fakeAvg3d = 15 + (lvl - 1) * 12;

  const src = normalizeImgSrc(bot.avatarDataUrl);
  const fakeProfile = React.useMemo(
    () =>
      ({
        id: bot.id,
        name: bot.name,
        avatarUrl: src,
        avatarDataUrl: null,
      }) as any,
    [bot.id, bot.name, src]
  );

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, flex: "0 0 auto", overflow: "visible" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 3,
          filter: `drop-shadow(0 0 6px ${COLOR_GLOW})`,
        }}
      >
        <ProfileStarRing
          anchorSize={MEDALLION}
          gapPx={-2 * SCALE}
          starSize={STAR}
          stepDeg={10}
          avg3d={fakeAvg3d}
          color={COLOR}
        />
      </div>

      <div
        style={{
          width: MEDALLION,
          height: MEDALLION,
          borderRadius: "50%",
          overflow: "hidden",
          margin: "auto",
          boxShadow: active ? `0 0 28px ${activeGlow}` : "0 0 14px rgba(0,0,0,0.65)",
          background: active
            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${COLOR})`
            : "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), rgba(0,0,0,0.6))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: "50%",
            overflow: "hidden",
            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
            opacity: active ? 1 : 0.6,
            transition: "filter .2s ease, opacity .2s ease",
          }}
        >
          <ProfileAvatar profile={fakeProfile} size={AVATAR} />
        </div>
      </div>
    </div>
  );
}

export default function FiveLivesConfig({ store, go, onBack, onStart, onStartGame, onPlay }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme?.primary ?? "#f7c85c";
  const primarySoft = theme?.primarySoft ?? "rgba(247,200,92,0.14)";
  const cardBg = theme?.card ?? "rgba(10,12,24,0.72)";
  const textMain = theme?.text ?? "#ffffff";

  const profiles: Profile[] = store?.profiles ?? [];
  const humanProfiles = React.useMemo(() => profiles.filter((p: any) => !(p as any)?.isBot), [profiles]);

  const [startingLives, setStartingLives] = React.useState<number>(5);
  const [randomStartOrder, setRandomStartOrder] = React.useState<boolean>(true);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const userBots = React.useMemo(() => loadUserBots(), []);
  const botProfiles: BotLite[] = React.useMemo(() => {
    const pro = PRO_BOTS.map((b) => ({ ...b, avatarDataUrl: normalizeImgSrc(b.avatarDataUrl) ?? null }));
    const u = (userBots || []).map((b) => ({
      ...b,
      avatarDataUrl: normalizeImgSrc(b.avatarDataUrl) ?? b.avatarDataUrl ?? null,
    }));
    const byId = new Map<string, BotLite>();
    [...pro, ...u].forEach((b) => b?.id && !byId.has(b.id) && byId.set(b.id, b));
    return Array.from(byId.values());
  }, [userBots]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    // init : 2 humains si possible
    if (profiles?.length) {
      const hp = (profiles as any[]).filter((p) => !(p as any)?.isBot);
      if (hp.length >= 2) return [hp[0].id, hp[1].id];
      if (hp.length === 1) return [hp[0].id];
    }
    return [];
  });

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      return exists ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }

  const canStart = selectedIds.length >= 2;

  function resolvePlayer(id: string) {
    const human = profiles.find((p) => p.id === id);
    if (human) {
      return {
        id: human.id,
        name: human.name,
        avatarDataUrl: pickAvatar(human),
        isBot: !!(human as any).isBot,
        botLevel: (human as any).botLevel ?? undefined,
      };
    }
    const bot = botProfiles.find((b) => b.id === id);
    if (bot) {
      return {
        id: bot.id,
        name: bot.name,
        avatarDataUrl: normalizeImgSrc(bot.avatarDataUrl) ?? (bot.avatarDataUrl ?? null),
        isBot: true,
        botLevel: bot.botLevel ?? undefined,
      };
    }
    return null;
  }

  function handleStart() {
    if (!canStart) {
      alert("Ajoute au moins 2 joueurs (profils locaux ou bots).");
      return;
    }

    const players: FiveLivesConfigPlayer[] = selectedIds
      .map((id) => {
        const base = resolvePlayer(id);
        if (!base) return null;
        return {
          id: base.id,
          name: base.name,
          avatarDataUrl: base.avatarDataUrl ?? null,
          isBot: !!base.isBot,
          botLevel: base.botLevel,
        };
      })
      .filter(Boolean) as any[];

    const finalPlayers = randomStartOrder ? shuffleArray(players) : players;

    const cfg: FiveLivesConfig = {
      id: `fiveLives-${Date.now()}`,
      mode: "five_lives",
      createdAt: Date.now(),
      startingLives: clampInt(startingLives, 1, 20, 5),
      randomStartOrder: !!randomStartOrder,
      players: finalPlayers,
    };

    const startCb = onStart || onStartGame || onPlay;
    if (startCb) return startCb(cfg);
    if (typeof go === "function") return go("five_lives_play", { config: cfg });

    console.error("[FiveLivesConfig] Aucun callback de start fourni (onStart/onStartGame/onPlay/go).");
    alert("Impossible de lancer : callback manquant (voir console).");
  }

  // ✅ mêmes paramètres pour BackDot et InfoDot
  const DOT_SIZE = 36;
  const DOT_GLOW = `${primary}88`;

  return (
    <div
      className="screen five-lives-config"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr 44px",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <BackDot
              onClick={() => (onBack ? onBack() : typeof go === "function" ? go("games") : null)}
              title={t?.("common.back") || "Retour"}
              size={DOT_SIZE}
              color={primary}
              glow={DOT_GLOW}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 2,
                color: primary,
                textTransform: "uppercase",
                lineHeight: 1.05,
              }}
            >
              LES 5 VIES
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <InfoDot onClick={() => setInfoOpen(true)} title="Règles" size={DOT_SIZE} color={primary} glow={DOT_GLOW} />
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, opacity: 0.75, color: "#d9d9e4" }}>
          Volée de 3 fléchettes : tu dois battre STRICTEMENT le score précédent.
        </div>
      </header>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* JOUEURS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "18px 12px 14px",
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary }}>
              Joueurs
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0" }}>{selectedIds.length}/∞</div>
          </div>

          {humanProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginTop: 10, marginBottom: 0 }}>
              Aucun profil local. Crée des joueurs (et des bots) dans <b>Profils</b>.
            </p>
          ) : (
            <>
              <div
                className="dc-scroll-thin"
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 10,
                  marginTop: 12,
                  paddingLeft: 14,
                  paddingRight: 8,
                }}
              >
                {humanProfiles.map((p: any) => {
                  const active = selectedIds.includes(p.id);

                  return (
                    <div
                      key={p.id}
                      role="button"
                      onClick={() => togglePlayer(p.id)}
                      style={{
                        minWidth: 122,
                        maxWidth: 122,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 7,
                        flexShrink: 0,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div
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
                        title={p.name}
                      >
                        {p.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 0 }}>
                Il faut au moins <b>2 joueurs</b> pour démarrer.
              </p>
            </>
          )}
        </section>

        {/* BOTS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, marginBottom: 10 }}>
            Bots IA
          </div>

          <p style={{ fontSize: 11, color: "#7c80a0", marginBottom: 10 }}>
            Ajoute des bots “PRO” prédéfinis ou tes bots créés dans Profils.
          </p>

          <div
            className="dc-scroll-thin"
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              overflowY: "visible",
              paddingBottom: 10,
              paddingTop: 14,
              marginTop: 6,
              marginBottom: 10,
            }}
          >
            {botProfiles.map((bot) => {
              const { level } = resolveBotLevel(bot.botLevel);
              const active = selectedIds.includes(bot.id);

              return (
                <div
                  key={bot.id}
                  role="button"
                  onClick={() => togglePlayer(bot.id)}
                  style={{
                    minWidth: 96,
                    maxWidth: 96,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    flexShrink: 0,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {/* ✅ aura sélection = thème (comme JOUEURS) */}
                  <BotMedallion bot={bot} level={level} active={active} activeGlow={`${primary}aa`} />

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: "center",
                      color: active ? "#f6f2e9" : "#7e8299",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 4,
                    }}
                    title={bot.name}
                  >
                    {bot.name}
                  </div>

                  <div style={{ marginTop: 2, display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: 0.7,
                        textTransform: "uppercase",
                        background: bot.id.startsWith("bot_pro_")
                          ? "radial-gradient(circle at 30% 0, #ffeaa8, #f7c85c)"
                          : "radial-gradient(circle at 30% 0, #6af3ff, #008cff)",
                        color: "#020611",
                        boxShadow: bot.id.startsWith("bot_pro_")
                          ? "0 0 12px rgba(247,200,92,0.5)"
                          : "0 0 12px rgba(0,172,255,0.55)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bot.id.startsWith("bot_pro_") ? "PRO" : "BOT"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => (typeof go === "function" ? go("profiles_bots") : null)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${primary}`,
              background: "rgba(255,255,255,0.04)",
              color: primary,
              fontWeight: 800,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Gérer mes bots
          </button>
        </section>

        {/* OPTIONS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: 12,
            marginBottom: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 800, color: primary, marginBottom: 10 }}>
            Options
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Vies de départ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <PillButton
                  key={n}
                  label={String(n)}
                  active={startingLives === n}
                  onClick={() => setStartingLives(n)}
                  primary={primary}
                  primarySoft={primarySoft}
                  compact
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>Vies identiques pour tous les joueurs.</div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: "#c8cbe4", marginBottom: 6 }}>Ordre de départ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <PillButton
                label="Aléatoire"
                active={!!randomStartOrder}
                onClick={() => setRandomStartOrder(true)}
                primary={primary}
                primarySoft={primarySoft}
              />
              <PillButton
                label="Conserver l'ordre"
                active={!randomStartOrder}
                onClick={() => setRandomStartOrder(false)}
                primary={primary}
                primarySoft={primarySoft}
              />
            </div>
            <div style={{ fontSize: 11, color: "#7c80a0", marginTop: 6 }}>
              En aléatoire : le 1er joueur est tiré au sort (et l'ordre suit la sélection).
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 88, padding: "6px 12px 8px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              width: "100%",
              height: 46,
              borderRadius: 999,
              border: "none",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: canStart ? `linear-gradient(90deg, ${primary}, #ffe9a3)` : "rgba(120,120,120,0.5)",
              color: canStart ? "#151515" : "#2b2bb2",
              boxShadow: canStart ? `0 0 18px ${primary}66` : "none",
              opacity: canStart ? 1 : 0.6,
              cursor: canStart ? "pointer" : "default",
            }}
            title={canStart ? "Démarrer la partie" : "Ajoute au moins 2 joueurs"}
          >
            Lancer la partie
          </button>

          {!canStart && (
            <div style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#ff6b6b", fontWeight: 800 }}>
              Ajoute au moins 2 joueurs pour démarrer
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY règles */}
      {infoOpen && (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 460,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 950,
                marginBottom: 10,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              Règles — Les 5 vies
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.45, color: theme.textSoft }}>
              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>But :</b> rester le dernier joueur avec des vies.
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Principe :</b> chaque joueur commence avec <b>{startingLives}</b> vies.
                Une manche = <b>3 fléchettes</b>. Tu dois faire un score <b>STRICTEMENT supérieur</b> au score du joueur
                précédent.
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Échec :</b> si ton score est <b>≤</b> au score à battre, tu perds <b>1 vie</b>.
              </div>

              <div style={{ marginBottom: 10 }}>
                <b style={{ color: theme.text }}>Élimination :</b> à <b>0 vie</b>, tu es éliminé.
              </div>

              <div style={{ marginBottom: 2 }}>
                <b style={{ color: theme.text }}>Victoire :</b> le <b>dernier joueur</b> encore en vie gagne.
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>
                ⚠️ Score égal = échec (il faut STRICTEMENT supérieur).
              </div>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              style={{
                display: "block",
                marginLeft: "auto",
                marginTop: 14,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: `linear-gradient(180deg, ${theme.primary}, ${theme.primarySoft || theme.primary})`,
                color: "#1b1508",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
