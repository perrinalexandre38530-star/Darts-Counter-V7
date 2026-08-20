import React from "react";
import localVideoSrc from "../assets/videos/killer_awena_rules.mp4";
import posterSrc from "../assets/videos/killer_awena_rules_poster.webp";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";

type Props = {
  open: boolean;
  onDone: () => void;
  firstLaunch?: boolean;
};

function envVideoUrl(): string {
  try {
    return String((import.meta as any)?.env?.VITE_KILLER_AWENA_RULES_URL || "").trim();
  } catch {
    return "";
  }
}

export default function KillerAwenaRulesVideo({ open, onDone, firstLaunch = false }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [failedRemote, setFailedRemote] = React.useState(false);
  const remoteSrc = envVideoUrl();
  const src = remoteSrc && !failedRemote ? remoteSrc : localVideoSrc;

  React.useEffect(() => {
    if (!open) return;
    setFailedRemote(false);
    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const p = video.play();
        if (p && typeof (p as Promise<void>).catch === "function") void p.catch(() => {});
      } catch {}
    }, 80);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("killer.awenaVideo.title", "Awena explique le Killer")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147482500,
        background: "rgba(0,0,0,.94)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          width: "min(430px, 100%)",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 24,
          overflow: "hidden",
          border: `1px solid ${theme.primary}66`,
          background: "#060812",
          boxShadow: `0 24px 80px rgba(0,0,0,.75), 0 0 30px ${theme.primary}22`,
        }}
      >
        <div
          style={{
            minHeight: 48,
            padding: "9px 10px 9px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderBottom: "1px solid rgba(255,255,255,.08)",
            background: "linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: theme.primary, fontSize: 11, fontWeight: 950, letterSpacing: 1.05, textTransform: "uppercase" }}>
              AWENA · KILLER
            </div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {t("killer.awenaVideo.subtitle", "Les règles en 1 min 20")}
            </div>
          </div>
          <button
            type="button"
            onClick={onDone}
            aria-label={t("common.close", "Fermer")}
            style={{
              width: 34,
              height: 34,
              flex: "0 0 34px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.15)",
              background: "rgba(255,255,255,.07)",
              color: "#fff",
              fontSize: 18,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ position: "relative", flex: "1 1 auto", minHeight: 0, background: "#000", display: "grid", placeItems: "center" }}>
          <video
            ref={videoRef}
            key={src}
            src={src}
            poster={posterSrc}
            autoPlay
            controls
            playsInline
            preload="metadata"
            onEnded={onDone}
            onError={() => {
              if (remoteSrc && !failedRemote) setFailedRemote(true);
            }}
            style={{
              display: "block",
              width: "100%",
              maxHeight: "calc(100vh - 132px)",
              aspectRatio: "9 / 16",
              objectFit: "contain",
              background: "#000",
            }}
          />
        </div>

        <div
          style={{
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "rgba(7,9,18,.98)",
            borderTop: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <div style={{ color: "rgba(255,255,255,.66)", fontSize: 10.5, lineHeight: 1.35 }}>
            {firstLaunch
              ? t("killer.awenaVideo.firstLaunchHint", "Première ouverture : la configuration Killer s'ouvrira ensuite automatiquement.")
              : t("killer.awenaVideo.replayHint", "Tu peux revoir cette vidéo à tout moment depuis la configuration Killer.")}
          </div>
          <button
            type="button"
            onClick={onDone}
            style={{
              flex: "0 0 auto",
              minHeight: 36,
              padding: "0 14px",
              borderRadius: 999,
              border: "none",
              background: `linear-gradient(90deg, ${theme.primary}, #ffe8a3)`,
              color: "#151515",
              fontWeight: 950,
              fontSize: 11,
              letterSpacing: .5,
              cursor: "pointer",
            }}
          >
            {firstLaunch ? t("common.continue", "CONTINUER") : t("common.close", "FERMER")}
          </button>
        </div>
      </div>
    </div>
  );
}
