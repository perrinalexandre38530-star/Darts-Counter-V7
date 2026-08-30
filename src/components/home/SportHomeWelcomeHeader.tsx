import React from "react";
import SportWelcomeWatermark from "./SportWelcomeWatermark";

/**
 * En-tête HOME commun à tous les sports.
 * Référence visuelle volontairement calée sur src/pages/Home.tsx (DARTS SCORING).
 * L'auto-fit ne change pas la taille nominale (32 px) : il évite seulement
 * qu'un nom de sport long soit coupé sur les écrans étroits.
 */
export default function SportHomeWelcomeHeader({
  sport,
  title,
  welcome,
  accent,
  borderSoft = "rgba(255,255,255,0.10)",
}: {
  sport: string;
  title: React.ReactNode;
  welcome: React.ReactNode;
  accent: string;
  borderSoft?: string;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const textRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const text = textRef.current;
      if (!wrap || !text) return;
      text.style.transform = "scale(1)";
      void text.offsetHeight;
      const wrapWidth = wrap.getBoundingClientRect().width;
      const textWidth = text.getBoundingClientRect().width;
      const next = wrapWidth > 0 && textWidth > wrapWidth
        ? Math.max(0.72, Math.min(1, wrapWidth / textWidth))
        : 1;
      setScale(next);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [title]);

  return (
    <>
      <style>{`
        @keyframes dcTitlePulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
        @keyframes dcTitleShimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>
      <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        borderRadius: 28,
        padding: 18,
        marginBottom: 16,
        background: "linear-gradient(135deg, rgba(8,10,20,0.98), rgba(14,18,34,0.98))",
        border: `1px solid ${borderSoft}`,
        boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <SportWelcomeWatermark sport={sport} opacity={0.12} size={205} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "inline-flex",
          padding: "5px 18px",
          borderRadius: 999,
          border: `1px solid ${accent}`,
          background: "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(255,255,255,0.06))",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {welcome}
        </span>
      </div>

      <div ref={wrapRef} style={{ position: "relative", zIndex: 2, width: "100%", overflow: "hidden" }}>
        <div
          ref={textRef}
          style={{
            width: "fit-content",
            marginInline: "auto",
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: 3,
            textAlign: "center",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            backgroundImage: `linear-gradient(120deg, ${accent}, #ffffff, ${accent})`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            color: "transparent",
            animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
            transform: `scale(${scale})`,
            transformOrigin: "center",
          }}
        >
          {title}
        </div>
      </div>
      </div>
    </>
  );
}
