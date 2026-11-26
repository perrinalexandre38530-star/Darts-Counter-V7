import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { MSS_COMMON_PREBUILT_AVATARS, MSS_FR_PREBUILT_AVATARS, MSS_EN_PREBUILT_AVATARS } from "../lib/prebuiltAvatarCatalog";

/** Galerie MSS : même catalogue, pagination et présentation que Profils locaux. */
const COMMON = MSS_COMMON_PREBUILT_AVATARS;
const FR = MSS_FR_PREBUILT_AVATARS;
const EN = MSS_EN_PREBUILT_AVATARS;
const PAGE_SIZE = 12;

type Props = {
  open: boolean;
  onClose: () => void;
  onChooseFile: (file: File) => void | Promise<void>;
  zIndex?: number;
};

export default function MssIntegratedAvatarPicker({ open, onClose, onChooseFile, zIndex = 10040 }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const primary = theme.primary;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [page, setPage] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const avatarUrls = React.useMemo(() => [...COMMON, ...(lang === "fr" ? FR : EN)], [lang]);
  const pages = Math.max(1, Math.ceil(avatarUrls.length / PAGE_SIZE));
  React.useEffect(() => { if (open) { setPage(0); setError(""); } }, [open, lang]);
  if (!open) return null;
  const choose = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Sélectionne une image valide."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image trop volumineuse (2 Mo maximum)."); return; }
    setBusy(true);
    setError("");
    try { await onChooseFile(file); onClose(); }
    catch { setError("Impossible de charger cet avatar."); }
    finally { setBusy(false); }
  };
  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex, background: "rgba(0,0,0,.80)", display: "flex", justifyContent: "center", alignItems: "center", padding: 14 }}>
      <div role="dialog" aria-modal="true" aria-label="Choisir un avatar" style={{ width: "min(520px, 96vw)", maxHeight: "88dvh", overflowY: "auto", borderRadius: 18,
        border: `1px solid ${primary}77`, background: `linear-gradient(180deg, ${theme.card}, ${theme.bg})`,
        boxShadow: `0 22px 70px rgba(0,0,0,.78), 0 0 28px ${primary}44` }}>
        <div style={{ display: "grid", gap: 10, padding: 12, borderBottom: `1px solid ${theme.borderSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ color: primary, fontSize: 13, letterSpacing: 1.2 }}>CHOISIR UN AVATAR</strong>
            <button type="button" className="btn sm" onClick={onClose} aria-label="Fermer">✕</button>
          </div>
          <input ref={inputRef} type="file" accept="image/*,.png,.jpg,.jpeg,.webp,.avif,.gif" style={{ display: "none" }}
            onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) void choose(file); }} />
          <button type="button" className="btn primary sm" disabled={busy} onClick={() => inputRef.current?.click()}
            style={{ width: "100%", justifyContent: "center", background: `linear-gradient(180deg, ${primary}, ${primary}AA)`, color: "#000", fontWeight: 900 }}>
            Importer une image
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {avatarUrls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((url, i) => (
              <button type="button" key={url} disabled={busy} title={`Avatar ${page * PAGE_SIZE + i + 1}`}
                onClick={async () => { setBusy(true); try { const response = await fetch(url, { cache: "force-cache" }); if (!response.ok) throw new Error("fetch");
                  const blob = await response.blob(); const file = new File([blob], url.split("/").pop() || "avatar.webp", { type: blob.type || "image/webp" });
                  await onChooseFile(file); onClose(); } catch { setError("Impossible de charger cet avatar."); } finally { setBusy(false); } }}
                style={{ aspectRatio: "1 / 1", borderRadius: "50%", overflow: "hidden", border: `2px solid ${theme.borderSoft}`,
                  background: "#05050a", padding: 0, cursor: busy ? "wait" : "pointer", boxShadow: "0 8px 18px rgba(0,0,0,.45)" }}>
                <img src={url} alt={`Avatar ${page * PAGE_SIZE + i + 1}`} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </button>
            ))}
          </div>
          {error && <div role="alert" style={{ color: "#ff9b8b", marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <button type="button" className="btn sm" disabled={page === 0 || busy} onClick={() => setPage((p) => p - 1)} style={{ minWidth: 74, justifyContent: "center" }}>←</button>
            <strong style={{ fontSize: 12, color: theme.textSoft }}>PAGE {page + 1}/{pages}</strong>
            <button type="button" className="btn sm" disabled={page >= pages - 1 || busy} onClick={() => setPage((p) => p + 1)} style={{ minWidth: 74, justifyContent: "center" }}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
