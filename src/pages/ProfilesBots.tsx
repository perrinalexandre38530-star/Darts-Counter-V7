// ============================================
// src/pages/ProfilesBots.tsx
// Gestion des BOTS (CPU) — joueurs virtuels
// Refonte visuelle alignée sur PROFILS LOCAUX
// ============================================
import React from "react";
import { nanoid } from "nanoid";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  loadStoredBots,
  saveStoredBots,
  subscribeBotsChange,
  type StoredBot,
  type StoredBotLevel,
} from "../lib/bots";
import { fileToAvatarVariants } from "../lib/avatarSafe";
import AvatarChoiceModal from "../components/AvatarChoiceModal";
import ProfileStarRing from "../components/ProfileStarRing";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import TopTicker from "../components/TopTicker";
import tickerBotsCpu from "../assets/tickers/ticker_bots_cpu.webp";

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

function levelDescription(level: BotLevel, t: (k: string, f?: string) => string) {
  switch (level) {
    case "easy":
      return t("bots.level.easy.desc", "Niveau très accessible, parfait pour découvrir le jeu.");
    case "medium":
      return t("bots.level.medium.desc", "Niveau régulier, proche d’un joueur loisir.");
    case "strong":
      return t("bots.level.strong.desc", "Niveau soutenu, capable de belles séries.");
    case "pro":
      return t("bots.level.pro.desc", "Niveau très solide, proche d’un bon joueur de club.");
    case "legend":
      return t("bots.level.legend.desc", "Niveau élite, très difficile à battre.");
    default:
      return "";
  }
}

function resolveBotAvatar(bot: Bot | null) {
  if (!bot) return null;
  if (typeof bot.avatarDataUrl === "string" && bot.avatarDataUrl.trim()) return bot.avatarDataUrl;
  if (typeof (bot as any).avatarUrl === "string" && (bot as any).avatarUrl.trim()) return (bot as any).avatarUrl;
  return null;
}

function BotAvatar({ bot, color, size = 42 }: { bot: Bot | null; color: string; size?: number }) {
  const letter = (bot?.name || "?").trim().charAt(0).toUpperCase() || "?";
  const src = resolveBotAvatar(bot);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 0%, ${color}55, #050714 72%)`,
        border: `2px solid ${color}99`,
        display: "grid",
        placeItems: "center",
        position: "relative",
        boxShadow: `0 0 16px ${color}55, 0 10px 24px rgba(0,0,0,.42)`,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <span style={{ fontSize: Math.max(18, Math.round(size * 0.43)), fontWeight: 950, color: "#fff" }}>{letter}</span>
      )}
    </div>
  );
}

type BotSection = "create" | "list";
type BotLevelFilter = "all" | BotLevel;

type Props = {
  store: Store;
  go?: (tab: any, params?: any) => void;
};

function BotSectionTab({
  active,
  label,
  onClick,
  accent,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 0,
        minHeight: 46,
        borderRadius: 15,
        border: `1px solid ${active ? accent : `${accent}55`}`,
        background: active
          ? `linear-gradient(180deg, ${accent}44, ${accent}16)`
          : "linear-gradient(180deg, rgba(255,255,255,.045), rgba(0,0,0,.18))",
        color: active ? "#fff" : "rgba(255,255,255,.72)",
        fontSize: 12,
        fontWeight: 950,
        letterSpacing: 1.05,
        textTransform: "uppercase",
        boxShadow: active ? `0 0 18px ${accent}55, inset 0 1px 0 rgba(255,255,255,.14)` : "none",
        cursor: "pointer",
        padding: "8px 5px",
      }}
    >
      {label}
    </button>
  );
}

function BotGridCard({
  bot,
  accent,
  active,
  onClick,
}: {
  bot: Bot;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 0,
        borderRadius: 18,
        padding: "10px 5px 9px",
        background: active
          ? `linear-gradient(180deg, ${accent}25, rgba(0,0,0,.18))`
          : "linear-gradient(180deg, rgba(255,255,255,.055), rgba(0,0,0,.18))",
        border: `1px solid ${active ? accent : `${accent}44`}`,
        boxShadow: active
          ? `0 0 17px ${accent}44, inset 0 0 18px rgba(255,255,255,.035)`
          : "inset 0 0 18px rgba(255,255,255,.025), 0 9px 20px rgba(0,0,0,.28)",
        cursor: "pointer",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 98,
          height: 98,
          display: "grid",
          placeItems: "center",
          overflow: "visible",
        }}
      >
        <ProfileStarRing
          botLevel={bot.botLevel || bot.level || "medium"}
          anchorSize={88}
          starSize={12}
          gapPx={-2}
        />
        <BotAvatar bot={bot} color={accent} size={82} />
      </div>
      <div
        style={{
          width: "100%",
          color: "#fff",
          fontSize: 12,
          fontWeight: 950,
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textTransform: "uppercase",
        }}
      >
        {bot.name || "BOT"}
      </div>
    </button>
  );
}

export default function ProfilesBots({ store, go }: Props) {
  void store;

  const { theme } = useTheme();
  const { t } = useLang();
  const primary = theme.primary;

  const [bots, setBots] = React.useState<Bot[]>([]);
  const [section, setSection] = React.useState<BotSection>("list");
  const [selectedBotId, setSelectedBotId] = React.useState("");
  const [listDetailOpen, setListDetailOpen] = React.useState(false);
  const [gridPage, setGridPage] = React.useState(0);

  const [createName, setCreateName] = React.useState("");
  const [createLevel, setCreateLevel] = React.useState<BotLevel>("medium");
  const [createSeed, setCreateSeed] = React.useState("");
  const [createAvatarFile, setCreateAvatarFile] = React.useState<File | null>(null);
  const [createAvatarPreview, setCreateAvatarPreview] = React.useState<string | null>(null);

  const [levelFilter, setLevelFilter] = React.useState<BotLevelFilter>("all");

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editLevel, setEditLevel] = React.useState<BotLevel>("medium");
  const [editSeed, setEditSeed] = React.useState("");
  const [actionsOpen, setActionsOpen] = React.useState(false);

  const [avatarPickerOpen, setAvatarPickerOpen] = React.useState(false);
  const [avatarTargetBotId, setAvatarTargetBotId] = React.useState<string | null>(null);
  const [avatarPickerMode, setAvatarPickerMode] = React.useState<"create" | "edit">("edit");

  React.useEffect(() => {
    if (!createAvatarFile) {
      setCreateAvatarPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCreateAvatarPreview(String(reader.result || ""));
    reader.onerror = () => setCreateAvatarPreview(null);
    reader.readAsDataURL(createAvatarFile);
  }, [createAvatarFile]);

  React.useEffect(() => {
    const refresh = () => {
      const loaded = loadBots();
      setBots(loaded);
      setSelectedBotId((previous) => (loaded.some((bot) => bot.id === previous) ? previous : loaded[0]?.id || ""));
    };
    refresh();
    return subscribeBotsChange(refresh);
  }, []);

  function persist(next: Bot[]) {
    const ok = saveBots(next);
    if (!ok) {
      const loaded = loadBots();
      setBots(loaded);
      setSelectedBotId((previous) => (loaded.some((bot) => bot.id === previous) ? previous : loaded[0]?.id || ""));
      window.alert(t("bots.storage.error", "Enregistrement BOT impossible (stockage plein ?)") as string);
      return false;
    }
    setBots(next);
    return true;
  }

  const selectedBot = React.useMemo(
    () => bots.find((bot) => bot.id === selectedBotId) || bots[0] || null,
    [bots, selectedBotId]
  );

  const filteredBots = React.useMemo(
    () =>
      levelFilter === "all"
        ? bots
        : bots.filter((bot) => ((bot.level || bot.botLevel || "medium") as BotLevel) === levelFilter),
    [bots, levelFilter]
  );

  const detailBots = React.useMemo(
    () => (filteredBots.some((bot) => bot.id === selectedBot?.id) ? filteredBots : bots),
    [bots, filteredBots, selectedBot?.id]
  );

  const selectedIndex = React.useMemo(
    () => Math.max(0, detailBots.findIndex((bot) => bot.id === (selectedBot?.id || ""))),
    [detailBots, selectedBot]
  );

  const gridPageSize = 9;
  const gridPages = Math.max(1, Math.ceil(filteredBots.length / gridPageSize));
  const safeGridPage = Math.min(Math.max(gridPage, 0), gridPages - 1);
  const gridBots = React.useMemo(
    () => filteredBots.slice(safeGridPage * gridPageSize, safeGridPage * gridPageSize + gridPageSize),
    [filteredBots, safeGridPage]
  );

  React.useEffect(() => {
    if (gridPage > gridPages - 1) setGridPage(Math.max(0, gridPages - 1));
  }, [gridPage, gridPages]);

  React.useEffect(() => {
    setGridPage(0);
    setListDetailOpen(false);
  }, [levelFilter]);

  React.useEffect(() => {
    if (!selectedBot) {
      setIsEditing(false);
      setActionsOpen(false);
      return;
    }
    setEditName(selectedBot.name || "");
    setEditLevel((selectedBot.level || "medium") as BotLevel);
    setEditSeed(selectedBot.avatarSeed || "");
  }, [selectedBot?.id]);

  function randomSeed() {
    return Math.random().toString(36).slice(2, 10);
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateLevel("medium");
    setCreateSeed("");
    setCreateAvatarFile(null);
    setCreateAvatarPreview(null);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const cleanName = createName.trim();
    if (!cleanName) return;

    let avatarDataUrl: string | null = null;
    if (createAvatarFile) {
      try {
        const variants = await fileToAvatarVariants(createAvatarFile);
        avatarDataUrl = variants.thumbDataUrl;
      } catch (error) {
        console.error("[ProfilesBots] avatar import failed", error);
        window.alert(t("bots.avatar.import.error", "Impossible d’importer cette image d’avatar.") as string);
        return;
      }
    }

    const now = new Date().toISOString();
    const bot: Bot = {
      id: nanoid(),
      name: cleanName,
      level: createLevel,
      botLevel: createLevel,
      avatarSeed: createSeed.trim() || randomSeed(),
      avatarDataUrl,
      createdAt: now,
      updatedAt: now,
      isBot: true,
      type: "bot",
      kind: "bot",
      bot: true,
      cpu: true,
    };

    if (!persist([...bots, bot])) return;

    setSelectedBotId(bot.id);
    setAvatarTargetBotId(bot.id);
    setListDetailOpen(true);
    setSection("list");
    resetCreateForm();
  }

  function openBotDetail(bot: Bot) {
    setSelectedBotId(bot.id);
    setListDetailOpen(true);
    setIsEditing(false);
    setActionsOpen(false);
  }

  function shiftSelected(delta: number) {
    if (!detailBots.length) return;
    const nextIndex = (selectedIndex + delta + detailBots.length) % detailBots.length;
    const nextBot = detailBots[nextIndex];
    if (!nextBot) return;
    setSelectedBotId(nextBot.id);
    setIsEditing(false);
    setActionsOpen(false);
  }

  function beginEdit() {
    if (!selectedBot) return;
    setEditName(selectedBot.name || "");
    setEditLevel((selectedBot.level || "medium") as BotLevel);
    setEditSeed(selectedBot.avatarSeed || "");
    setIsEditing((value) => !value);
    setActionsOpen(false);
  }

  function saveEdit() {
    if (!selectedBot || !editName.trim()) return;
    const now = new Date().toISOString();
    const next = bots.map((bot) =>
      bot.id === selectedBot.id
        ? {
            ...bot,
            name: editName.trim(),
            level: editLevel,
            botLevel: editLevel,
            avatarSeed: editSeed.trim() || bot.avatarSeed || randomSeed(),
            updatedAt: now,
          }
        : bot
    );
    if (persist(next)) setIsEditing(false);
  }

  function handleDelete(id: string) {
    if (!window.confirm(t("bots.delete.confirm", "Supprimer définitivement ce BOT ?") as string)) return;
    const next = bots.filter((bot) => bot.id !== id);
    if (!persist(next)) return;

    setSelectedBotId(next[0]?.id || "");
    setListDetailOpen(false);
    setIsEditing(false);
    setActionsOpen(false);
  }

  function openAvatarEditor(bot: Bot) {
    setSelectedBotId(bot.id);
    setAvatarTargetBotId(bot.id);
    setAvatarPickerMode("edit");
    setAvatarPickerOpen(true);
    setActionsOpen(false);
  }

  async function handleSetBotAvatar(botId: string, file: File) {
    const now = new Date().toISOString();
    const variants = await fileToAvatarVariants(file);
    const avatarDataUrl = variants.thumbDataUrl;
    const next = bots.map((bot) =>
      bot.id === botId
        ? { ...bot, avatarDataUrl, avatarUrl: undefined, avatarUpdatedAt: now, updatedAt: now }
        : bot
    );
    persist(next);
  }

  const pagePadding: React.CSSProperties = {
    padding: 16,
    paddingBottom: 90,
  };

  const panelStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: "radial-gradient(circle at top, rgba(255,255,255,.075), transparent 64%)",
    boxShadow: "0 16px 30px rgba(0,0,0,.26)",
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    borderRadius: 13,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(5,6,12,.88)",
    color: "#fff",
    fontSize: 13,
    boxSizing: "border-box",
  };

  const actionBase: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderRadius: 999,
    border: `1px solid ${primary}88`,
    background: `linear-gradient(135deg, ${primary}10, ${primary}42)`,
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 950,
    letterSpacing: 0.5,
    cursor: "pointer",
    padding: "7px 8px",
  };

  return (
    <div style={pagePadding}>
      <AvatarChoiceModal
        open={avatarPickerOpen}
        title={t("profiles.avatarPicker.title", "Choisir un avatar")}
        onClose={() => setAvatarPickerOpen(false)}
        onSelectFile={async (file) => {
          if (avatarPickerMode === "create") {
            setCreateAvatarFile(file);
            return;
          }
          const targetId = avatarTargetBotId || selectedBot?.id || "";
          if (!targetId) return;
          await handleSetBotAvatar(targetId, file);
        }}
      />

      <TopTicker
        src={tickerBotsCpu}
        alt={t("bots.title", "BOTS (CPU)")}
        startSlot={
          <BackDot
            size={42}
            title={t("bots.back", "Retour aux profils")}
            color={primary}
            onClick={() => go?.("profiles")}
          />
        }
        endSlot={
          <InfoDot
            size={42}
            color={primary}
            glow={`${primary}99`}
            title={t("bots.info.title", "Joueurs virtuels")}
            content={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.5 }}>
                <div style={{ color: primary, fontWeight: 950, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t("bots.badge", "Joueurs virtuels")}
                </div>
                <div>
                  {t(
                    "bots.subtitle",
                    "Crée tes propres joueurs imaginaires gérés par l’ordinateur, avec avatar et niveau de performance. Tu pourras ensuite les inviter dans tes parties X01, Cricket, Training, etc."
                  )}
                </div>
              </div>
            }
          />
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            padding: 7,
            borderRadius: 18,
            border: `1px solid ${primary}55`,
            background: "rgba(0,0,0,.18)",
            boxShadow: "inset 0 0 20px rgba(255,255,255,.025)",
          }}
        >
          <BotSectionTab
            active={section === "create"}
            label={t("bots.tabs.create", "Créer")}
            accent={primary}
            onClick={() => {
              setSection("create");
              setListDetailOpen(false);
              setActionsOpen(false);
              setIsEditing(false);
            }}
          />
          <BotSectionTab
            active={section === "list"}
            label={t("bots.tabs.list", "Liste")}
            accent={primary}
            onClick={() => setSection("list")}
          />
        </div>

        {section === "create" ? (
          <form onSubmit={handleCreate} style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: primary, fontWeight: 950, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t("bots.form.title", "Créer un nouveau BOT")}
                </div>
                <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 2 }}>
                  {t("bots.form.subtitle.short", "Nom, niveau et avatar : uniquement l’essentiel.")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAvatarPickerMode("create");
                  setAvatarTargetBotId(null);
                  setAvatarPickerOpen(true);
                }}
                title={t("bots.form.avatar.import", "Importer l’image de l’avatar")}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  border: `1px solid ${primary}88`,
                  display: "grid",
                  placeItems: "center",
                  color: primary,
                  background: `${primary}12`,
                  boxShadow: `0 0 15px ${primary}33`,
                  fontSize: 25,
                  fontWeight: 950,
                  flex: "0 0 auto",
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                {createAvatarPreview ? (
                  <img
                    src={createAvatarPreview}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  "CPU"
                )}
              </button>
            </div>

            <div style={{ display: "grid", gap: 11 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) auto",
                  gap: 8,
                  alignItems: "center",
                  borderRadius: 13,
                  border: `1px solid ${primary}44`,
                  background: `${primary}0D`,
                  padding: "9px 10px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: 11.5, fontWeight: 900 }}>
                    {t("bots.form.avatar.label", "Image de l’avatar")}
                  </div>
                  <div style={{ color: theme.textSoft, fontSize: 10, marginTop: 2 }}>
                    {createAvatarFile
                      ? createAvatarFile.name
                      : t("bots.form.avatar.hint", "Importe une photo ou une image avant de créer le BOT.")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {createAvatarFile ? (
                    <button
                      type="button"
                      onClick={() => setCreateAvatarFile(null)}
                      style={{
                        minHeight: 34,
                        borderRadius: 11,
                        border: `1px solid ${theme.borderSoft}`,
                        background: "rgba(255,255,255,.035)",
                        color: theme.textSoft,
                        fontSize: 10,
                        fontWeight: 850,
                        cursor: "pointer",
                        padding: "7px 9px",
                      }}
                    >
                      {t("common.remove", "Retirer")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarPickerMode("create");
                      setAvatarTargetBotId(null);
                      setAvatarPickerOpen(true);
                    }}
                    style={{
                      minHeight: 34,
                      borderRadius: 11,
                      border: `1px solid ${primary}99`,
                      background: `${primary}16`,
                      color: primary,
                      fontSize: 10,
                      fontWeight: 950,
                      cursor: "pointer",
                      padding: "7px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("bots.form.avatar.import.short", "IMPORTER")}
                  </button>
                </div>
              </div>

              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 850 }}>{t("bots.form.name.label", "Nom du BOT")}</span>
                <input
                  type="text"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  placeholder={t("bots.form.name.placeholder", "Ex : The Grinder, RoboPhil...")}
                  style={fieldStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 850 }}>{t("bots.form.level.label", "Niveau de performance")}</span>
                <select
                  value={createLevel}
                  onChange={(event) => setCreateLevel(event.target.value as BotLevel)}
                  style={fieldStyle}
                >
                  <option value="easy">{t("bots.level.easy", "Débutant")}</option>
                  <option value="medium">{t("bots.level.medium", "Standard")}</option>
                  <option value="strong">{t("bots.level.strong", "Fort")}</option>
                  <option value="pro">{t("bots.level.pro", "Pro")}</option>
                  <option value="legend">{t("bots.level.legend", "Légende")}</option>
                </select>
                <span style={{ color: theme.textSoft, fontSize: 10.5 }}>{levelDescription(createLevel, t)}</span>
              </label>

              <label style={{ display: "grid", gap: 5 }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 850 }}>{t("bots.form.seed.label", "Seed d’avatar (optionnel)")}</span>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                  <input
                    type="text"
                    value={createSeed}
                    onChange={(event) => setCreateSeed(event.target.value)}
                    placeholder={t("bots.form.seed.placeholder", "Seed aléatoire")}
                    style={fieldStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setCreateSeed(randomSeed())}
                    style={{
                      borderRadius: 13,
                      border: `1px solid ${primary}99`,
                      background: `${primary}12`,
                      color: primary,
                      padding: "8px 11px",
                      fontWeight: 900,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("bots.form.seed.random.short", "Aléatoire")}
                  </button>
                </div>
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, marginTop: 2 }}>
                <button
                  type="submit"
                  disabled={!createName.trim()}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: `1px solid ${createName.trim() ? primary : theme.borderSoft}`,
                    background: createName.trim()
                      ? `linear-gradient(180deg, ${primary}CC, ${primary}77)`
                      : "linear-gradient(180deg,#3a3a3e,#333338)",
                    color: createName.trim() ? "#051016" : "#99999f",
                    boxShadow: createName.trim() ? `0 0 18px ${primary}55` : "none",
                    fontWeight: 950,
                    fontSize: 12,
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    cursor: createName.trim() ? "pointer" : "not-allowed",
                    padding: "10px 12px",
                  }}
                >
                  {t("bots.form.create", "Créer le BOT")}
                </button>
                <button
                  type="button"
                  onClick={resetCreateForm}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(255,255,255,.035)",
                    color: theme.textSoft,
                    fontWeight: 850,
                    cursor: "pointer",
                    padding: "10px 12px",
                  }}
                >
                  {t("bots.form.reset", "Réinitialiser")}
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {section === "list" ? (
          bots.length === 0 ? (
            <div style={{ ...panelStyle, textAlign: "center", color: theme.textSoft, fontSize: 12 }}>
              {t("bots.list.empty", "Aucun BOT pour l’instant. Utilise l’onglet CRÉER pour ajouter ton premier joueur CPU.")}
            </div>
          ) : !listDetailOpen ? (
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: primary, fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                    {t("bots.list.title", "BOTS CPU")} ({filteredBots.length}{levelFilter !== "all" ? `/${bots.length}` : ""})
                  </div>
                  <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 2 }}>
                    {t("bots.list.gridHint", "9 BOTS par page · touche un BOT pour ouvrir sa fiche")}
                  </div>
                </div>
                <div style={{ color: theme.textSoft, fontSize: 10.5, fontWeight: 900, whiteSpace: "nowrap" }}>
                  {safeGridPage + 1}/{gridPages}
                </div>
              </div>

              <label
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0,1fr)",
                  gap: 9,
                  alignItems: "center",
                  marginBottom: 12,
                  padding: "8px 9px",
                  borderRadius: 13,
                  border: `1px solid ${primary}44`,
                  background: `${primary}0D`,
                }}
              >
                <span
                  style={{
                    color: primary,
                    fontSize: 10,
                    fontWeight: 950,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("bots.filter.level", "Niveau")}
                </span>
                <select
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value as BotLevelFilter)}
                  style={{ ...fieldStyle, minHeight: 36, padding: "7px 10px", fontSize: 11.5 }}
                >
                  <option value="all">{t("bots.filter.all", "Tous les niveaux")}</option>
                  <option value="easy">{t("bots.level.easy", "Débutant")}</option>
                  <option value="medium">{t("bots.level.medium", "Standard")}</option>
                  <option value="strong">{t("bots.level.strong", "Fort")}</option>
                  <option value="pro">{t("bots.level.pro", "Pro")}</option>
                  <option value="legend">{t("bots.level.legend", "Légende")}</option>
                </select>
              </label>

              {gridBots.length ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  {gridBots.map((bot) => (
                    <BotGridCard
                      key={bot.id}
                      bot={bot}
                      accent={primary}
                      active={bot.id === selectedBot?.id}
                      onClick={() => openBotDetail(bot)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: 130,
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    color: theme.textSoft,
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    borderRadius: 14,
                    border: `1px dashed ${theme.borderSoft}`,
                    background: "rgba(255,255,255,.02)",
                    padding: 14,
                  }}
                >
                  {t("bots.filter.empty", "Aucun BOT ne correspond à ce niveau.")}
                </div>
              )}

              <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "76px 1fr 76px", gap: 9, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn sm"
                  disabled={safeGridPage <= 0}
                  onClick={() => setGridPage((value) => Math.max(0, value - 1))}
                  style={{ opacity: safeGridPage <= 0 ? 0.42 : 1 }}
                >
                  ←
                </button>
                <div style={{ textAlign: "center", color: theme.textSoft, fontSize: 11, fontWeight: 900 }}>
                  PAGE {safeGridPage + 1}/{gridPages}
                </div>
                <button
                  type="button"
                  className="btn sm"
                  disabled={safeGridPage >= gridPages - 1}
                  onClick={() => setGridPage((value) => Math.min(gridPages - 1, value + 1))}
                  style={{ opacity: safeGridPage >= gridPages - 1 ? 0.42 : 1 }}
                >
                  →
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...panelStyle, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <BackDot
                  size={34}
                  title={t("bots.list.back", "Retour à la liste des BOTS")}
                  color={primary}
                  onClick={() => {
                    setListDetailOpen(false);
                    setActionsOpen(false);
                    setIsEditing(false);
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: primary, fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.9 }}>
                    {t("bots.detail.title", "Fiche du BOT CPU")}
                  </div>
                  <div style={{ color: theme.textSoft, fontSize: 10.5, marginTop: 1 }}>
                    {t("bots.detail.subtitle", "Retourne à la grille avec le bouton ci-contre")}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => shiftSelected(-1)}
                  disabled={detailBots.length <= 1}
                  aria-label={t("bots.previous", "BOT précédent")}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.3)",
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: 950,
                    cursor: detailBots.length <= 1 ? "default" : "pointer",
                    opacity: detailBots.length <= 1 ? 0.42 : 1,
                  }}
                >
                  ‹
                </button>
                <div style={{ textAlign: "center", color: theme.textSoft, fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>
                  {t("bots.carousel.label", "BOT CPU")} {detailBots.length > 1 ? `(${selectedIndex + 1}/${detailBots.length})` : ""}
                </div>
                <button
                  type="button"
                  onClick={() => shiftSelected(1)}
                  disabled={detailBots.length <= 1}
                  aria-label={t("bots.next", "BOT suivant")}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,.3)",
                    color: theme.text,
                    fontSize: 20,
                    fontWeight: 950,
                    cursor: detailBots.length <= 1 ? "default" : "pointer",
                    opacity: detailBots.length <= 1 ? 0.42 : 1,
                  }}
                >
                  ›
                </button>
              </div>

              {selectedBot ? (
                <>
                  <div style={{ display: "grid", placeItems: "center", margin: "4px 0 10px" }}>
                    <div
                      style={{
                        width: 146,
                        height: 146,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: `radial-gradient(circle, ${primary}16, transparent 69%)`,
                        boxShadow: `0 0 34px ${primary}22`,
                      }}
                    >
                      <BotAvatar bot={selectedBot} color={primary} size={124} />
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 950,
                      textAlign: "center",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {selectedBot.name}
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", marginTop: 7 }}>
                    <span
                      style={{
                        borderRadius: 999,
                        border: `1px solid ${primary}`,
                        background: `${primary}18`,
                        color: primary,
                        padding: "5px 11px",
                        fontSize: 10.5,
                        fontWeight: 950,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {levelLabel((selectedBot.level || "medium") as BotLevel, t)}
                    </span>
                  </div>

                  <div style={{ textAlign: "center", color: theme.textSoft, fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
                    {levelDescription((selectedBot.level || "medium") as BotLevel, t)}
                  </div>

                  <div
                    style={{
                      marginTop: 11,
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                      gap: 8,
                    }}
                  >
                    <div style={{ borderRadius: 13, border: `1px solid ${primary}44`, background: `${primary}0D`, padding: "9px 8px", textAlign: "center" }}>
                      <div style={{ color: theme.textSoft, fontSize: 9.5, fontWeight: 850, textTransform: "uppercase" }}>Seed</div>
                      <div style={{ color: "#fff", fontSize: 11.5, fontWeight: 900, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {selectedBot.avatarSeed || "—"}
                      </div>
                    </div>
                    <div style={{ borderRadius: 13, border: `1px solid ${primary}44`, background: `${primary}0D`, padding: "9px 8px", textAlign: "center" }}>
                      <div style={{ color: theme.textSoft, fontSize: 9.5, fontWeight: 850, textTransform: "uppercase" }}>
                        {t("bots.detail.status", "Statut")}
                      </div>
                      <div style={{ color: primary, fontSize: 11.5, fontWeight: 950, marginTop: 2, textTransform: "uppercase" }}>
                        {t("bots.detail.available", "Disponible")}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginTop: 12, width: "100%" }}>
                    <button type="button" onClick={beginEdit} style={actionBase}>
                      {t("bots.actions.edit", "ÉDITER")}
                    </button>
                    <button type="button" onClick={() => openAvatarEditor(selectedBot)} style={actionBase}>
                      {t("bots.actions.avatar", "AVATAR")}
                    </button>
                    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => setActionsOpen((value) => !value)}
                        style={{ ...actionBase, width: "100%", color: primary, borderColor: primary, background: `${primary}20` }}
                      >
                        {t("bots.actions.more", "ACTIONS")}
                      </button>

                      {actionsOpen ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "110%",
                            right: 0,
                            zIndex: 40,
                            minWidth: 210,
                            padding: 8,
                            borderRadius: 12,
                            background: theme.card,
                            border: `1px solid ${theme.borderSoft}`,
                            boxShadow: "0 14px 30px rgba(0,0,0,.62)",
                          }}
                        >
                          <button
                            type="button"
                            className="btn danger sm"
                            onClick={() => handleDelete(selectedBot.id)}
                            style={{ width: "100%", justifyContent: "flex-start", fontSize: 11 }}
                          >
                            {t("bots.actions.delete", "Supprimer ce BOT")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: `1px dashed ${theme.borderSoft}`,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        placeholder={t("bots.form.name.label", "Nom du BOT")}
                        style={fieldStyle}
                      />
                      <select value={editLevel} onChange={(event) => setEditLevel(event.target.value as BotLevel)} style={fieldStyle}>
                        <option value="easy">{t("bots.level.easy", "Débutant")}</option>
                        <option value="medium">{t("bots.level.medium", "Standard")}</option>
                        <option value="strong">{t("bots.level.strong", "Fort")}</option>
                        <option value="pro">{t("bots.level.pro", "Pro")}</option>
                        <option value="legend">{t("bots.level.legend", "Légende")}</option>
                      </select>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
                        <input
                          value={editSeed}
                          onChange={(event) => setEditSeed(event.target.value)}
                          placeholder={t("bots.form.seed.placeholder", "Seed aléatoire")}
                          style={fieldStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setEditSeed(randomSeed())}
                          style={{
                            borderRadius: 13,
                            border: `1px solid ${primary}99`,
                            background: `${primary}12`,
                            color: primary,
                            padding: "8px 11px",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {t("bots.form.seed.random.short", "Aléatoire")}
                        </button>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button type="button" className="btn sm" onClick={() => setIsEditing(false)}>
                          {t("common.cancel", "Annuler")}
                        </button>
                        <button type="button" className="btn ok sm" disabled={!editName.trim()} onClick={saveEdit}>
                          {t("common.save", "Enregistrer")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
