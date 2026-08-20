import React from "react";
import { createPortal } from "react-dom";
import { useAwenaOptional } from "../AwenaProvider";
import { findAwenaModeById } from "../AwenaKnowledge";
import { useTheme } from "../../contexts/ThemeContext";

const AWENA_AVATAR = "/awena/awena-avatar.webp";
const NEON = "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)";

type Props = {
  modeId: string;
  size?: number;
  disabled?: boolean;
};

export default function AwenaModeDot({ modeId, size = 40, disabled = false }: Props) {
  const awena = useAwenaOptional();
  const { theme } = useTheme() as any;
  const mode = findAwenaModeById(modeId);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState({ top: 0, right: 12 });

  const refreshPosition = React.useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: Math.min(window.innerHeight - 190, Math.max(12, rect.bottom + 8)),
      right: Math.max(10, window.innerWidth - rect.right),
    });
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    refreshPosition();
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && anchorRef.current?.contains(target)) return;
      const popover = document.getElementById(`awena-mode-menu-${modeId}`);
      if (target && popover?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition, true);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", refreshPosition);
      window.removeEventListener("scroll", refreshPosition, true);
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, modeId, refreshPosition]);

  if (!awena || !mode || !awena.settings.enabled || awena.settings.interventionMode === "off") return null;

  async function openTopic(topic: "rules" | "config" | "records") {
    if (disabled) return;
    // Un accès depuis le médaillon d'un autre mode doit ouvrir un contexte propre :
    // conserver une ancienne réponse X01 dans une fiche Attrape-moi est déroutant.
    if (awena.runtime.mode && awena.runtime.mode !== mode!.id) {
      awena.clearMessages();
    }
    awena.setRuntime({ mode: mode!.id, sport: "darts", phase: "menu", inGame: false });
    awena.openPanel();
    setMenuOpen(false);
    const prompt =
      topic === "rules"
        ? `Explique-moi clairement et en détail les règles de ${mode!.label}.`
        : topic === "config"
          ? `Détaille uniquement la configuration de ${mode!.label} : chaque option, valeur possible, variante, format et réglage disponible.`
          : `Donne-moi les records de ${mode!.label} et les principaux classements disponibles.`;
    await awena.ask(prompt, { modeTopic: topic });
  }

  const primary = theme?.primary || "#22e6ff";
  const button = (
    <div
      ref={anchorRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Awena · ${mode.label}`}
      aria-expanded={menuOpen}
      title={`Awena · ${mode.label}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        refreshPosition();
        setMenuOpen((v) => !v);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) setMenuOpen((v) => !v);
        }
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        padding: 3,
        display: "grid",
        placeItems: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? .5 : 1,
        background: NEON,
        boxShadow: "0 0 14px rgba(22,232,255,.42),0 0 22px rgba(255,56,199,.22),0 0 0 2px rgba(0,0,0,.45)",
        pointerEvents: "auto",
      }}
    >
      <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}>
        <img src={AWENA_AVATAR} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </span>
    </div>
  );

  return (
    <>
      {button}
      {menuOpen && typeof document !== "undefined" && createPortal(
        <div
          id={`awena-mode-menu-${modeId}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 5000,
            width: 238,
            padding: 9,
            borderRadius: 16,
            border: `1px solid ${primary}88`,
            background: "linear-gradient(180deg,rgba(8,12,28,.99),rgba(3,5,15,.99))",
            boxShadow: `0 0 24px ${primary}2d,0 18px 42px rgba(0,0,0,.72)`,
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "2px 3px 7px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            <img src={AWENA_AVATAR} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: `1px solid ${primary}` }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: 11.5, fontWeight: 950 }}>AWENA · {mode.label}</div>
              <div style={{ color: "#8e9abb", fontSize: 9.5 }}>Que veux-tu consulter ?</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              ["Règles", "rules"],
              ["Configuration", "config"],
              ["Records", "records"],
            ].map(([label, topic]) => (
              <button
                key={topic}
                type="button"
                onClick={() => void openTopic(topic as "rules" | "config" | "records")}
                style={{
                  minHeight: 38,
                  borderRadius: 11,
                  border: `1px solid ${primary}55`,
                  background: `${primary}10`,
                  color: "#fff",
                  textAlign: "left",
                  padding: "0 12px",
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
