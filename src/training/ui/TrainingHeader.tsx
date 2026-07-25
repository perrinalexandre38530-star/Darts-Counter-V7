import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import tickerTrainingFr from "../../assets/tickers/ticker_menu_training_fr.png";
import tickerTrainingEn from "../../assets/tickers/ticker_menu_training_en.png";

const TICKERS = import.meta.glob("../../assets/tickers/*.{png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function norm(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findModeTicker(id?: string | null): string | null {
  const raw = norm(id || "");
  if (!raw) return null;

  const candidates = Array.from(
    new Set([
      raw,
      raw.replace(/^training_/, ""),
      raw.replace(/_training$/, ""),
      raw.replace(/^training_/, "").replace(/_training$/, ""),
    ])
  ).filter(Boolean);

  for (const [path, src] of Object.entries(TICKERS)) {
    const filename = String(path.split("/").pop() || "")
      .replace(/\.(png|webp)$/i, "")
      .replace(/^ticker_/, "");
    const fileNorm = norm(filename);
    if (candidates.includes(fileNorm)) return src;
  }

  return null;
}

type Props = {
  title: string;
  rules: React.ReactNode;
  onBack?: (() => void) | null;
  tickerId?: string | null;
};

export default function TrainingHeader({ title, rules, onBack, tickerId }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const [open, setOpen] = React.useState(false);

  const modeTicker = React.useMemo(() => findModeTicker(tickerId || title), [tickerId, title]);
  const fallbackTicker = lang === "fr" ? tickerTrainingFr : tickerTrainingEn;
  const ticker = modeTicker || fallbackTicker;
  const accent = "#27dcff";

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 90,
          height: 92,
          paddingTop: "env(safe-area-inset-top)",
          overflow: "hidden",
          background: "#020b14",
          borderBottom: "1px solid rgba(39,220,255,.28)",
          boxShadow: "0 10px 28px rgba(0,0,0,.28)",
        }}
      >
        <img
          src={ticker}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: modeTicker ? 0.72 : 0.48,
            filter: "saturate(1.08) contrast(1.08)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,#020b14 0%,rgba(2,11,20,.32) 20%,rgba(2,11,20,.12) 50%,rgba(2,11,20,.32) 80%,#020b14 100%)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg,rgba(2,11,20,.08),rgba(2,11,20,.58))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "grid",
            gridTemplateColumns: "52px minmax(0,1fr) 52px",
            alignItems: "center",
            gap: 8,
            padding: "0 10px",
          }}
        >
          <div>{onBack ? <BackDot onClick={onBack} color={accent} glow="rgba(39,220,255,.55)" /> : null}</div>

          <div
            style={{
              minWidth: 0,
              justifySelf: "center",
              maxWidth: "100%",
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid rgba(39,220,255,.30)",
              background: "rgba(1,10,18,.66)",
              backdropFilter: "blur(6px)",
              color: accent,
              textAlign: "center",
              fontWeight: 950,
              fontSize: "clamp(13px,3.7vw,18px)",
              letterSpacing: 1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 0 14px rgba(39,220,255,.38)",
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <InfoDot
              onClick={() => setOpen(true)}
              color={accent}
              glow="rgba(39,220,255,.55)"
            />
          </div>
        </div>
      </div>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(0,0,0,.80)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(580px,100%)",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 22,
              border: "1px solid rgba(39,220,255,.42)",
              background: "linear-gradient(160deg,rgba(6,28,42,.98),rgba(2,10,18,.99))",
              boxShadow: "0 24px 70px rgba(0,0,0,.75)",
              color: theme.text,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: accent,
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.6, opacity: 0.92 }}>
              {rules}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: "100%",
                height: 44,
                marginTop: 16,
                borderRadius: 999,
                border: "1px solid rgba(39,220,255,.42)",
                background: "linear-gradient(180deg,#36e3ff,#0aafd9)",
                color: "#001018",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
