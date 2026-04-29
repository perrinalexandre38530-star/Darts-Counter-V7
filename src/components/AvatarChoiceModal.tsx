import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

const PREBUILT_AVATAR_COMMON_URLS = Array.from({ length: 153 }, (_, i) =>
  `/images/prebuilt-avatars/common/avatar-common-${String(i + 1).padStart(3, "0")}.webp`
);
const PREBUILT_AVATAR_FR_URLS = Array.from({ length: 54 }, (_, i) =>
  `/images/prebuilt-avatars/fr/avatar-fr-${String(i + 1).padStart(3, "0")}.webp`
);
const PREBUILT_AVATAR_EN_URLS = Array.from({ length: 63 }, (_, i) =>
  `/images/prebuilt-avatars/en/avatar-en-${String(i + 1).padStart(3, "0")}.webp`
);

const AVATAR_PICKER_PAGE_SIZE = 12;

async function avatarUrlToFile(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossible de charger l'avatar intégré: ${url}`);
  const blob = await res.blob();
  const name = url.split("/").pop() || "avatar.webp";
  return new File([blob], name, { type: blob.type || "image/webp" });
}

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSelectFile: (file: File) => void | Promise<void>;
};

export default function AvatarChoiceModal({ open, title, onClose, onSelectFile }: Props) {
  const { theme } = useTheme();
  const { t, lang } = useLang();
  const primary = theme.primary;
  const importRef = React.useRef<HTMLInputElement | null>(null);
  const [busyUrl, setBusyUrl] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);

  const avatarUrls = React.useMemo(() => {
    // Français = avatars FR. Toutes les autres langues = avatars EN.
    // Les avatars communs restent disponibles dans les deux cas.
    return lang === "fr"
      ? [...PREBUILT_AVATAR_COMMON_URLS, ...PREBUILT_AVATAR_FR_URLS]
      : [...PREBUILT_AVATAR_COMMON_URLS, ...PREBUILT_AVATAR_EN_URLS];
  }, [lang]);

  const totalPages = Math.max(1, Math.ceil(avatarUrls.length / AVATAR_PICKER_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);

  const pageUrls = React.useMemo(() => {
    const start = safePage * AVATAR_PICKER_PAGE_SIZE;
    return avatarUrls.slice(start, start + AVATAR_PICKER_PAGE_SIZE);
  }, [avatarUrls, safePage]);

  React.useEffect(() => {
    if (open) setPage(0);
  }, [open, lang]);

  React.useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  if (!open) return null;

  async function pickIntegrated(url: string) {
    try {
      setBusyUrl(url);
      const file = await avatarUrlToFile(url);
      await onSelectFile(file);
      onClose();
    } catch (err) {
      console.warn("[avatars] integrated avatar pick failed", err);
      alert(t("profiles.avatarPicker.error", "Impossible de charger cet avatar."));
    } finally {
      setBusyUrl(null);
    }
  }

  const canPrev = safePage > 0 && !busyUrl;
  const canNext = safePage < totalPages - 1 && !busyUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          maxHeight: "88vh",
          borderRadius: 18,
          border: `1px solid ${primary}77`,
          background: `linear-gradient(180deg, ${theme.card}, ${theme.bg})`,
          boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${primary}44`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "12px 12px 10px",
            borderBottom: `1px solid ${theme.borderSoft}`,
            display: "grid",
            gap: 10,
            flex: "0 0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: primary, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 13 }}>
              {title || t("profiles.avatarPicker.title", "Choisir un avatar")}
            </div>
            <button className="btn sm" type="button" onClick={onClose}>✕</button>
          </div>

          <input
            ref={importRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0] || null;
              e.currentTarget.value = "";
              if (!file) return;
              await onSelectFile(file);
              onClose();
            }}
          />
          <button
            type="button"
            className="btn primary sm"
            onClick={() => importRef.current?.click()}
            style={{
              width: "100%",
              justifyContent: "center",
              background: `linear-gradient(180deg, ${primary}, ${primary}AA)`,
              color: "#000",
              fontWeight: 900,
            }}
          >
            {t("profiles.avatarPicker.import", "Importer une image")}
          </button>
        </div>

        <div
          style={{
            padding: 12,
            overflow: "hidden",
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gridTemplateRows: "repeat(4, minmax(0, 1fr))",
              gap: 10,
              flex: "1 1 auto",
              minHeight: 0,
              alignContent: "center",
            }}
          >
            {pageUrls.map((url, i) => {
              const absoluteIndex = safePage * AVATAR_PICKER_PAGE_SIZE + i + 1;
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => pickIntegrated(url)}
                  disabled={!!busyUrl}
                  title={`Avatar ${absoluteIndex}`}
                  style={{
                    aspectRatio: "1 / 1",
                    minWidth: 0,
                    minHeight: 0,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2px solid ${busyUrl === url ? primary : theme.borderSoft}`,
                    background: "#05050a",
                    padding: 0,
                    cursor: busyUrl ? "wait" : "pointer",
                    boxShadow: `0 8px 18px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08)`,
                  }}
                >
                  <img
                    src={url}
                    alt={`Avatar ${absoluteIndex}`}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flex: "0 0 auto",
              borderTop: `1px solid ${theme.borderSoft}`,
              paddingTop: 10,
            }}
          >
            <button
              type="button"
              className="btn sm"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ minWidth: 74, justifyContent: "center", opacity: canPrev ? 1 : 0.45 }}
            >
              ←
            </button>

            <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 900, color: theme.textSoft, letterSpacing: 0.8, textTransform: "uppercase" }}>
              {t("profiles.avatarPicker.page", "Page")} {safePage + 1}/{totalPages}
            </div>

            <button
              type="button"
              className="btn sm"
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={{ minWidth: 74, justifyContent: "center", opacity: canNext ? 1 : 0.45 }}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
