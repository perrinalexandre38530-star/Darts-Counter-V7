// ============================================
// src/components/InfoDot.tsx
// Petit bouton rond "i" pour afficher une infobulle / modal.
// - Style harmonisé BackDot (même border/bg/halo)
// - ✅ Supporte "content" (string/ReactNode) via RulesModal
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import RulesModal from "./RulesModal";

type Props = {
  onClick?: (e: any) => void;
  color?: string;
  glow?: string;
  title?: string;
  size?: number;
  /** Si fourni, un modal de règles s'ouvre automatiquement au clic. */
  content?: React.ReactNode;
};

export default function InfoDot({
  onClick,
  color,
  glow,
  title = "Infos",
  size = 46,
  content,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const c = color ?? theme.primary;
  const halo = glow ?? `${c}88`;

  const handle = React.useCallback(
    (e: any) => {
      try {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } catch {}

      // Si on a du contenu, on gère un modal interne.
      if (content != null) setOpen(true);
      onClick?.(e);
    },
    [onClick, content]
  );

  return (
    <>
      <div
        role="button"
        aria-label={title}
        title={title}
        tabIndex={0}
        onPointerDown={handle}
        onClick={handle}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" || e.key === " ") handle(e);
        }}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          border: `2px solid ${theme.borderSoft}`,
          background: "rgba(0,0,0,0.48)",
          boxShadow: `0 0 0 2px rgba(0,0,0,0.22), 0 0 18px ${halo}, 0 0 34px ${halo}`,
          color: c,
          flex: "0 0 auto",
          pointerEvents: "auto",
        }}
      >
        <span
          style={{
            fontSize: 20,
            fontWeight: 1000,
            lineHeight: 1,
            transform: "translateY(-0.5px)",
            textShadow: `0 0 12px ${halo}, 0 0 22px ${halo}`,
          }}
        >
          i
        </span>
      </div>

      {content != null ? (
        <RulesModal open={open} onClose={() => setOpen(false)} title={title}>
          {typeof content === "string" ? <div style={{ whiteSpace: "pre-wrap" }}>{content}</div> : content}
        </RulesModal>
      ) : null}
    </>
  );
}
