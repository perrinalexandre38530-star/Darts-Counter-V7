// ============================================
// src/pages/ProfilesBots.tsx
// Gestion des BOTS (CPU) — joueurs virtuels
// - Liste des BOTS enregistrés (localStorage dc_bots_v1)
// - Création d'un BOT : nom + niveau + seed d'avatar
// - Après création : ouverture du créateur d’avatar (mode BOT)
// ============================================
import React from "react";
import { nanoid } from "nanoid";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type BotLevel = "easy" | "medium" | "strong" | "pro" | "legend";

export type Bot = {
  id: string;
  name: string;
  level: BotLevel;
  /** champ texte utilisé par X01ConfigV3 → pour resolveBotLevel() */
  botLevel?: string | null;
  avatarSeed: string;
  avatarDataUrl?: string | null; // 👈 avatar du BOT
  createdAt: string;
  updatedAt: string;
};

const LS_BOTS_KEY = "dc_bots_v1";

// ------------------ helpers stockage ------------------

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Normalise les anciens enregistrements :
 * - certains n'ont que "level"
 * - X01ConfigV3 lit "botLevel"
 */
function normalizeBots(arr: any[]): Bot[] {
  return (arr || []).map((b) => {
    const rawLevel: string =
      (b.level as string) || (b.botLevel as string) || "easy";

    let level: BotLevel;
    switch (rawLevel) {
      case "medium":
      case "strong":
      case "pro":
      case "legend":
      case "easy":
        level = rawLevel;
        break;
      default:
        // si jamais c'est autre chose on mappe sur easy
        level = "easy";
        break;
    }

    const botLevel: string =
      typeof b.botLevel === "string" && b.botLevel.trim()
        ? b.botLevel
        : level;

    return {
      id: String(b.id ?? nanoid()),
      name: String(b.name ?? "BOT"),
      level,
      botLevel,
      avatarSeed: String(
        b.avatarSeed ?? Math.random().toString(36).slice(2, 10)
      ),
      avatarDataUrl: b.avatarDataUrl ?? null,
      createdAt: String(b.createdAt ?? new Date().toISOString()),
      updatedAt: String(b.updatedAt ?? new Date().toISOString()),
    } satisfies Bot;
  });
}

export function loadBots(): Bot[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<any[]>(window.localStorage.getItem(LS_BOTS_KEY), []);
  return normalizeBots(raw);
}

export function saveBots(bots: Bot[]) {
  try {
    window.localStorage.setItem(LS_BOTS_KEY, JSON.stringify(bots));
  } catch {
    // ignore
  }
}

// ------------------ labels / descriptions ------------------

function levelLabel(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy":
      return t("bots.level.easy", "Débutant");
    case "medium":
      return t("bots.level.medium", "Standard");
    case "strong":
      return t("bots.level.strong", "Fort");
    case "pro":
      return t("bots.level.pro", "Pro");
    case "legend":
      return t("bots.level.legend", "Légende");
    default:
      return level;
  }
}

function levelDescription(
  level: BotLevel,
  t: (k: string, f?: string) => string
) {
  switch (level) {
    case "easy":
      return t(
        "bots.level.easy.desc",
        "Niveau très accessible, parfait pour découvrir le jeu."
      );
    case "medium":
      return t(
        "bots.level.medium.desc",
        "Niveau régulier, proche d’un joueur loisir."
      );
    case "strong":
      return t(
        "bots.level.strong.desc",
        "Niveau soutenu, capable de belles séries."
      );
    case "pro":
      return t(
        "bots.level.pro.desc",
        "Niveau très solide, proche d’un bon joueur de club."
      );
    case "legend":
      return t(
        "bots.level.legend.desc",
        "Niveau élite, très difficile à battre."
      );
    default:
      return "";
  }
}

// ------------------ petit avatar BOT ------------------

function BotAvatar({ bot, color }: { bot: Bot; color: string }) {
  const letter = (bot.name || "?").trim().charAt(0).toUpperCase() || "?";

  // si on a un avatarDataUrl, on l’affiche
  if (bot.avatarDataUrl) {
    return (
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#050714",
          border: `1px solid ${color}aa`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          boxShadow: `0 0 10px ${color}55`,
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={bot.avatarDataUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <span
          style={{
            position: "absolute",
            bottom: -6,
            right: -4,
            fontSize: 8,
            padding: "2px 5px",
            borderRadius: 999,
            background: "#000",
            border: `1px solid ${color}aa`,
            color,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          BOT
        </span>
      </div>
    );
  }

  // sinon on garde la pastille lettre
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 0%, ${color}55, #050714)`,
        border: `1px solid ${color}aa`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: `0 0 10px ${color}55`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 900,
          color: "#fff",
        }}
      >
        {letter}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: -6,
          right: -4,
          fontSize: 8,
          padding: "2px 5px",
          borderRadius: 999,
          background: "#000",
          border: `1px solid ${color}aa`,
          color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        BOT
      </span>
    </div>
  );
}

// ------------------ composant principal ------------------

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
};

export default function ProfilesBots({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  const [bots, setBots] = React.useState<Bot[]>([]);
  const [name, setName] = React.useState("");
  const [level, setLevel] = React.useState<BotLevel>("medium");
  const [seed, setSeed] = React.useState("");

  React.useEffect(() => {
    setBots(loadBots());
  }, []);

  function handleRandomSeed() {
    const rnd = Math.random().toString(36).slice(2, 10);
    setSeed(rnd);
  }

  function handleResetForm() {
    setName("");
    setLevel("medium");
    setSeed("");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();

    const bot: Bot = {
      id: nanoid(),
      name: name.trim(),
      level,
      botLevel: level, // 👈 stocké aussi en texte pour X01ConfigV3
      avatarSeed: seed.trim() || Math.random().toString(36).slice(2, 10),
      avatarDataUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    const next = [...bots, bot];
    setBots(next);
    saveBots(next);

    // 👇 on va direct dans l’éditeur d’avatar pour ce BOT
    //    on précise isBot: true pour que AvatarCreator passe en bleu
    go?.("avatar", { botId: bot.id, from: "profiles_bots", isBot: true });

    handleResetForm();
  }

  function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce BOT ?")) return;
    const next = bots.filter((b) => b.id !== id);
    setBots(next);
    saveBots(next);
  }

  const count = bots.length;

  // ------------------ styles réutilisables ------------------

  const pagePadding: React.CSSProperties = { padding: 16, paddingBottom: 90 };

  const cardStyle: React.CSSProperties = {
    background: theme.card,
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${theme.borderSoft}`,
    boxShadow: "0 18px 36px rgba(0,0,0,.35)",
    marginBottom: 14,
  };

  const smallBadge: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    color: theme.textSoft,
  };

  // ------------------ rendu ------------------

  return (
    <div style={pagePadding}>
      {/* header */}
      <button
        onClick={() => go?.("profiles")}
        style={{
          borderRadius: 999,
          border: `1px solid ${theme.borderSoft}`,
          background: "transparent",
          color: theme.textSoft,
          padding: "6px 10px",
          fontSize: 13,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        ← {t("bots.back", "Retour aux profils")}
      </button>

      <div style={{ marginBottom: 12 }}>
        <div style={smallBadge}>
          {t("bots.badge", "Joueurs virtuels")}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: primary,
            textShadow: `0 0 10px ${primary}`,
          }}
        >
          {t("bots.title", "BOTS (CPU)")}
        </div>
        <p
          style={{
            fontSize: 12,
            color: theme.textSoft,
            marginTop: 4,
          }}
        >
          {t(
            "bots.subtitle",
            "Crée tes propres joueurs imaginaires gérés par l’ordinateur, avec avatar et niveau de performance. Tu pourras ensuite les inviter dans tes parties X01, Cricket, Training, etc."
          )}
        </p>
      </div>

      {/* Carte récap bots */}
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: primary,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {t("bots.list.title", "Tes BOTS")}
            </div>
            <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 2 }}>
              {count === 0
                ? t(
                    "bots.list.emptyHint",
                    "Aucun BOT pour le moment. Commence par en créer un ci-dessous."
                  )
                : t(
                    "bots.list.count",
                    `${count} BOT(s) disponibles pour les sélecteurs de joueurs.`
                  )}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.4)",
              color: theme.textSoft,
            }}
          >
            {count} BOT
            {count > 1 ? "S" : ""}
          </div>
        </div>

        {count === 0 ? (
          <div
            style={{
              marginTop: 8,
              padding: 10,
              borderRadius: 12,
              background: "rgba(0,0,0,0.4)",
              fontSize: 12,
              color: theme.textSoft,
            }}
          >
            {t(
              "bots.list.emptyHelp",
              "Tes BOTS apparaîtront ici et pourront ensuite être sélectionnés comme joueurs dans les différents modes."
            )}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {bots.map((bot) => (
              <div
                key={bot.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(180deg, rgba(20,20,28,.9), rgba(10,10,16,.9))",
                  border: `1px solid ${theme.borderSoft}`,
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <BotAvatar bot={bot} color={primary} />
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#fff",
                        maxWidth: 160,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {bot.name}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: `${primary}22`,
                          border: `1px solid ${primary}aa`,
                          color: primary,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {levelLabel(bot.level, t)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: theme.textSoft,
                          opacity: 0.8,
                        }}
                      >
                        seed: {bot.avatarSeed}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(bot.id)}
                  style={{
                    borderRadius: 999,
                    border: "1px solid rgba(255,90,90,.7)",
                    background: "transparent",
                    color: "#ff9c9c",
                    fontSize: 11,
                    padding: "6px 8px",
                    cursor: "pointer",
                  }}
                >
                  {t("bots.actions.delete", "Supprimer")}
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: theme.textSoft,
          }}
        >
          {t(
            "bots.list.footer",
            "Après création, personnalise le médaillon de ton BOT dans le créateur d’avatar."
          )}
        </div>
      </section>

      {/* Formulaire création */}
      <section style={cardStyle}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: primary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 4,
          }}
        >
          {t("bots.form.title", "Créer un nouveau BOT")}
        </div>
        <div
          style={{
            fontSize: 11,
            color: theme.textSoft,
            marginBottom: 10,
          }}
        >
          {t(
            "bots.form.subtitle",
            "Donne-lui un nom, choisis son niveau, puis crée son avatar dans l’éditeur."
          )}
        </div>

        <form onSubmit={handleCreate}>
          {/* Nom */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 4,
                color: "#fff",
              }}
            >
              {t("bots.form.name.label", "Nom du BOT")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                "bots.form.name.placeholder",
                "Ex : The Grinder, RoboPhil..."
              )}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(5,6,12,0.9)",
                color: "#fff",
                fontSize: 13,
              }}
            />
          </div>

          {/* Niveau */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 4,
                color: "#fff",
              }}
            >
              {t("bots.form.level.label", "Niveau de performance")}
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as BotLevel)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(5,6,12,0.9)",
                color: "#fff",
                fontSize: 13,
              }}
            >
              <option value="easy">
                {t("bots.level.easy", "Débutant")}
              </option>
              <option value="medium">
                {t("bots.level.medium", "Standard")}
              </option>
              <option value="strong">
                {t("bots.level.strong", "Fort")}
              </option>
              <option value="pro">
                {t("bots.level.pro", "Pro")}
              </option>
              <option value="legend">
                {t("bots.level.legend", "Légende")}
              </option>
            </select>
            <div
              style={{
                fontSize: 11,
                color: theme.textSoft,
                marginTop: 4,
              }}
            >
              {levelDescription(level, t)}
            </div>
          </div>

          {/* Seed avatar (optionnel) */}
          <div style={{ marginBottom: 10 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 4,
                color: "#fff",
              }}
            >
              {t("bots.form.seed.label", "Seed d’avatar (optionnel)")}
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder={t("bots.form.seed.placeholder", "Seed aléatoire")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(5,6,12,0.9)",
                  color: "#fff",
                  fontSize: 13,
                }}
              />
              <button
                type="button"
                onClick={handleRandomSeed}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${primary}aa`,
                  background: "transparent",
                  color: primary,
                  fontSize: 11,
                  padding: "6px 8px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t("bots.form.seed.random", "Seed aléatoire")}
              </button>
            </div>
          </div>

          {/* Actions form */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                flex: 1,
                borderRadius: 999,
                border: "none",
                padding: "10px 12px",
                fontWeight: 800,
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1,
                cursor: name.trim() ? "pointer" : "not-allowed",
                background: name.trim()
                  ? primary
                  : "linear-gradient(180deg,#3a3a3e,#333338)",
                color: name.trim() ? "#050712" : "#9a9aa0",
                boxShadow: name.trim() ? `0 0 18px ${primary}` : "none",
              }}
            >
              {t(
                "bots.form.createAndEdit",
                "Créer ce BOT et ouvrir l’éditeur d’avatar"
              )}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: "transparent",
                color: theme.textSoft,
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t("bots.form.reset", "Réinitialiser")}
            </button>
          </div>
        </form>

        <div
          style={{
            fontSize: 11,
            color: theme.textSoft,
            marginTop: 10,
          }}
        >
          {t(
            "bots.form.footer",
            "Chaque BOT est stocké en local. Tu pourras le sélectionner comme joueur dans les écrans de préparation des parties."
          )}
        </div>
      </section>
    </div>
  );
}
