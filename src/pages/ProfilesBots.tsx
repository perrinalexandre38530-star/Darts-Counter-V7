// ============================================
// src/pages/ProfilesBots.tsx
// Gestion des BOTS (CPU) — joueurs virtuels
// ============================================
import React from "react";
import { nanoid } from "nanoid";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadStoredBots, saveStoredBots, subscribeBotsChange, type StoredBot, type StoredBotLevel } from "../lib/bots";

export type Bot = StoredBot;
export type BotLevel = StoredBotLevel;
export function loadBots(): Bot[] {
  return loadStoredBots();
}
export function saveBots(bots: Bot[]) {
  saveStoredBots(bots);
}

function levelLabel(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy": return t("bots.level.easy", "Débutant");
    case "medium": return t("bots.level.medium", "Standard");
    case "strong": return t("bots.level.strong", "Fort");
    case "pro": return t("bots.level.pro", "Pro");
    case "legend": return t("bots.level.legend", "Légende");
    default: return level;
  }
}

function levelDescription(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy": return t("bots.level.easy.desc", "Niveau très accessible, parfait pour découvrir le jeu.");
    case "medium": return t("bots.level.medium.desc", "Niveau régulier, proche d’un joueur loisir.");
    case "strong": return t("bots.level.strong.desc", "Niveau soutenu, capable de belles séries.");
    case "pro": return t("bots.level.pro.desc", "Niveau très solide, proche d’un bon joueur de club.");
    case "legend": return t("bots.level.legend.desc", "Niveau élite, très difficile à battre.");
    default: return "";
  }
}

function BotAvatar({ bot, color, size = 42 }: { bot: Bot | null; color: string; size?: number }) {
  const letter = (bot?.name || "?").trim().charAt(0).toUpperCase() || "?";
  if (bot?.avatarDataUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#050714", border: `1px solid ${color}aa`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: `0 0 10px ${color}55`, flexShrink: 0, overflow: "hidden" }}>
        <img src={bot.avatarDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle at 30% 0%, ${color}55, #050714)`, border: `1px solid ${color}aa`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: `0 0 10px ${color}55`, flexShrink: 0 }}>
      <span style={{ fontSize: Math.max(18, Math.round(size * 0.46)), fontWeight: 900, color: "#fff" }}>{letter}</span>
    </div>
  );
}

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
  const [editingBotId, setEditingBotId] = React.useState<string | null>(null);
  const [selectedBotId, setSelectedBotId] = React.useState<string>("");

  React.useEffect(() => {
    const refresh = () => {
      const loaded = loadBots();
      setBots(loaded);
      setSelectedBotId((prev) => (loaded.some((b) => b.id === prev) ? prev : loaded[0]?.id || ""));
    };
    refresh();
    return subscribeBotsChange(refresh);
  }, []);

  function persist(next: Bot[]) {
    setBots(next);
    saveBots(next);
    try {
      window.dispatchEvent(new Event("dc:bots-changed"));
    } catch {}
    try {
      (window as any).__flushCloudNow?.("bots_save", store);
      setTimeout(() => {
        try { (window as any).__flushCloudNow?.("bots_save_delayed", store); } catch {}
      }, 200);
    } catch (e) {
      console.warn("[bots] immediate cloud flush failed", e);
    }
  }

  function handleRandomSeed() {
    setSeed(Math.random().toString(36).slice(2, 10));
  }

  function handleResetForm() {
    setName("");
    setLevel("medium");
    setSeed("");
    setEditingBotId(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date().toISOString();

    if (editingBotId) {
      const next = bots.map((b) =>
        b.id === editingBotId
          ? { ...b, name: name.trim(), level, botLevel: level, avatarSeed: seed.trim() || b.avatarSeed || Math.random().toString(36).slice(2, 10), updatedAt: now }
          : b
      );
      persist(next);
      setSelectedBotId(editingBotId);
      handleResetForm();
      return;
    }

    const bot: Bot = {
      id: nanoid(),
      name: name.trim(),
      level,
      botLevel: level,
      avatarSeed: seed.trim() || Math.random().toString(36).slice(2, 10),
      avatarDataUrl: null,
      createdAt: now,
      updatedAt: now,
      isBot: true,
      type: "bot",
      kind: "bot",
      bot: true,
      cpu: true,
    };

    const next = [...bots, bot];
    persist(next);
    setSelectedBotId(bot.id);
    go?.("avatar", { botId: bot.id, from: "profiles_bots", isBot: true });
    handleResetForm();
  }

  function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce BOT ?")) return;
    const next = bots.filter((b) => b.id !== id);
    persist(next);
    if (selectedBotId === id) setSelectedBotId(next[0]?.id || "");
    if (editingBotId === id) handleResetForm();
  }

  function handleEdit(bot: Bot) {
    setEditingBotId(bot.id);
    setSelectedBotId(bot.id);
    setName(bot.name || "");
    setLevel(bot.level || "medium");
    setSeed(bot.avatarSeed || "");
  }

  function handleOpenAvatarEditor(bot: Bot) {
    setSelectedBotId(bot.id);
    go?.("avatar", { botId: bot.id, from: "profiles_bots", isBot: true });
  }

  const selectedBot = React.useMemo(() => bots.find((b) => b.id === selectedBotId) || bots[0] || null, [bots, selectedBotId]);
  const selectedIndex = React.useMemo(() => Math.max(0, bots.findIndex((b) => b.id === (selectedBot?.id || ""))), [bots, selectedBot]);

  function shiftSelected(delta: number) {
    if (!bots.length) return;
    const nextIndex = (selectedIndex + delta + bots.length) % bots.length;
    setSelectedBotId(bots[nextIndex]?.id || "");
  }

  const count = bots.length;
  const pagePadding: React.CSSProperties = { padding: 16, paddingBottom: 90 };
  const cardStyle: React.CSSProperties = { background: theme.card, borderRadius: 18, padding: 14, border: `1px solid ${theme.borderSoft}`, boxShadow: "0 18px 36px rgba(0,0,0,.35)", marginBottom: 14 };
  const smallBadge: React.CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.8, color: theme.textSoft };

  return (
    <div style={pagePadding}>
      <button onClick={() => go?.("profiles")} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "transparent", color: theme.textSoft, padding: "6px 10px", fontSize: 13, marginBottom: 10, cursor: "pointer" }}>
        ← {t("bots.back", "Retour aux profils")}
      </button>

      <div style={{ marginBottom: 12 }}>
        <div style={smallBadge}>{t("bots.badge", "Joueurs virtuels")}</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1.6, textTransform: "uppercase", color: primary, textShadow: `0 0 10px ${primary}` }}>
          {t("bots.title", "BOTS (CPU)")}
        </div>
        <p style={{ fontSize: 12, color: theme.textSoft, marginTop: 4 }}>
          {t("bots.subtitle", "Crée tes propres joueurs imaginaires gérés par l’ordinateur, avec avatar et niveau de performance. Tu pourras ensuite les inviter dans tes parties X01, Cricket, Training, etc.")}
        </p>
      </div>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: primary, textTransform: "uppercase", letterSpacing: 0.8 }}>{t("bots.list.title", "Tes BOTS")}</div>
            <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 2 }}>
              {count === 0 ? t("bots.list.emptyHint", "Aucun BOT pour le moment. Commence par en créer un ci-dessous.") : t("bots.list.count", `${count} BOT(s) disponibles pour les sélecteurs de joueurs.`)}
            </div>
          </div>
          <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,0.4)", color: theme.textSoft }}>
            {count} BOT{count > 1 ? "S" : ""}
          </div>
        </div>

        {count === 0 ? (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 12, background: "rgba(0,0,0,0.4)", fontSize: 12, color: theme.textSoft }}>
            {t("bots.list.emptyHelp", "Tes BOTS apparaîtront ici et pourront ensuite être sélectionnés comme joueurs dans les différents modes.")}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr) 40px", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={() => shiftSelected(-1)} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,0.35)", color: theme.text, cursor: "pointer", fontSize: 18, fontWeight: 900 }} aria-label="BOT précédent">‹</button>
              <div style={{ borderRadius: 16, border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(20,20,28,.92), rgba(10,10,16,.94))", padding: 14, display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 14, alignItems: "center" }}>
                <div style={{ display: "grid", placeItems: "center" }}><BotAvatar bot={selectedBot} color={primary} size={84} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedBot?.name}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, background: `${primary}22`, border: `1px solid ${primary}aa`, color: primary, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 800 }}>{levelLabel((selectedBot?.level || "medium") as BotLevel, t)}</span>
                    <span style={{ fontSize: 11, color: theme.textSoft }}>seed: {selectedBot?.avatarSeed}</span>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => selectedBot && handleEdit(selectedBot)} style={{ borderRadius: 999, border: `1px solid ${primary}aa`, background: `${primary}18`, color: primary, fontSize: 11, padding: "7px 10px", cursor: "pointer", fontWeight: 700 }}>{t("bots.actions.edit", "Modifier")}</button>
                    <button type="button" onClick={() => selectedBot && handleOpenAvatarEditor(selectedBot)} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "transparent", color: theme.text, fontSize: 11, padding: "7px 10px", cursor: "pointer", fontWeight: 700 }}>{t("bots.actions.avatar", "Avatar")}</button>
                    <button type="button" onClick={() => selectedBot && handleDelete(selectedBot.id)} style={{ borderRadius: 999, border: "1px solid rgba(255,90,90,.7)", background: "transparent", color: "#ff9c9c", fontSize: 11, padding: "7px 10px", cursor: "pointer", fontWeight: 700 }}>{t("bots.actions.delete", "Supprimer")}</button>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => shiftSelected(1)} style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,0.35)", color: theme.text, cursor: "pointer", fontSize: 18, fontWeight: 900 }} aria-label="BOT suivant">›</button>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
              {bots.map((bot) => {
                const active = bot.id === selectedBot?.id;
                return (
                  <button key={bot.id} type="button" onClick={() => setSelectedBotId(bot.id)} style={{ minWidth: 88, padding: "6px 6px 4px", borderRadius: 14, border: `1px solid ${active ? primary + "aa" : theme.borderSoft}`, background: active ? `${primary}18` : "rgba(0,0,0,0.22)", cursor: "pointer", color: theme.text }}>
                    <div style={{ display: "grid", placeItems: "center", marginBottom: 4 }}><BotAvatar bot={bot} color={primary} size={48} /></div>
                    <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bot.name}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontSize: 11, color: theme.textSoft, marginBottom: 4 }}>{t("bots.selector.label", "Accès rapide à un BOT")}</label>
              <select value={selectedBot?.id || ""} onChange={(e) => setSelectedBotId(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,6,12,0.9)", color: "#fff", fontSize: 13 }}>
                {bots.map((bot, index) => <option key={bot.id} value={bot.id}>{index + 1}. {bot.name} — {levelLabel(bot.level, t)}</option>)}
              </select>
            </div>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: theme.textSoft }}>
          {t("bots.list.footer", "Après création, personnalise le médaillon de ton BOT dans le créateur d’avatar.")}
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ fontSize: 14, fontWeight: 800, color: primary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          {editingBotId ? t("bots.form.editTitle", "Modifier ce BOT") : t("bots.form.title", "Créer un nouveau BOT")}
        </div>
        <div style={{ fontSize: 11, color: theme.textSoft, marginBottom: 10 }}>
          {t("bots.form.subtitle", "Donne-lui un nom, choisis son niveau, puis crée son avatar dans l’éditeur.")}
        </div>

        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#fff" }}>{t("bots.form.name.label", "Nom du BOT")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("bots.form.name.placeholder", "Ex : The Grinder, RoboPhil...")} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,6,12,0.9)", color: "#fff", fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#fff" }}>{t("bots.form.level.label", "Niveau de performance")}</label>
            <select value={level} onChange={(e) => setLevel(e.target.value as BotLevel)} style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,6,12,0.9)", color: "#fff", fontSize: 13 }}>
              <option value="easy">{t("bots.level.easy", "Débutant")}</option>
              <option value="medium">{t("bots.level.medium", "Standard")}</option>
              <option value="strong">{t("bots.level.strong", "Fort")}</option>
              <option value="pro">{t("bots.level.pro", "Pro")}</option>
              <option value="legend">{t("bots.level.legend", "Légende")}</option>
            </select>
            <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 4 }}>{levelDescription(level, t)}</div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#fff" }}>{t("bots.form.seed.label", "Seed d’avatar (optionnel)")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="text" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder={t("bots.form.seed.placeholder", "Seed aléatoire")} style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,6,12,0.9)", color: "#fff", fontSize: 13 }} />
              <button type="button" onClick={handleRandomSeed} style={{ borderRadius: 10, border: `1px solid ${primary}aa`, background: "transparent", color: primary, fontSize: 11, padding: "6px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>{t("bots.form.seed.random", "Seed aléatoire")}</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={!name.trim()} style={{ flex: 1, borderRadius: 999, border: "none", padding: "10px 12px", fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: 1, cursor: name.trim() ? "pointer" : "not-allowed", background: name.trim() ? primary : "linear-gradient(180deg,#3a3a3e,#333338)", color: name.trim() ? "#050712" : "#9a9aa0", boxShadow: name.trim() ? `0 0 18px ${primary}` : "none" }}>
              {editingBotId ? t("bots.form.save", "Enregistrer les modifications") : t("bots.form.createAndEdit", "Créer ce BOT et ouvrir l’éditeur d’avatar")}
            </button>
            <button type="button" onClick={handleResetForm} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "transparent", color: theme.textSoft, padding: "10px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t("bots.form.reset", editingBotId ? "Annuler" : "Réinitialiser")}</button>
          </div>
        </form>

        <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 10 }}>
          {t("bots.form.footer", "Chaque BOT est stocké en local. Tu pourras le sélectionner comme joueur dans les écrans de préparation des parties.")}
        </div>
      </section>
    </div>
  );
}
