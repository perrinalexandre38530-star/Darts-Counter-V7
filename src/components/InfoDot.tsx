// ============================================
// src/components/InfoDot.tsx
// InfoDot robuste (anti "button in button") — rendu IDENTIQUE à BackDot
// ✅ Pas de <button> => évite DOM nesting warnings
// ✅ Click fiable mobile/desktop : onPointerDown + onClick
// ✅ stopPropagation + preventDefault
// ✅ Modal RulesModal optionnel (content)
// ✅ Icône "i" custom (SVG inline) coloriable via currentColor (Theme)
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import RulesModal from "./RulesModal";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { routeToAwenaMode } from "../awena/AwenaKnowledge";
import AwenaModeDot from "../awena/components/AwenaModeDot";
import { registerAwenaHelp } from "../awena/AwenaHelpRegistry";
import { awenaProcedurePromptForRoute, isAwenaComplexRoute } from "../awena/AwenaProceduralAcademy";

type InfoDotContent = React.ReactNode | ((controls: { close: () => void }) => React.ReactNode);

type Props = {
  onClick?: (e: any) => void;

  /** Halo/glow (optionnel). Par défaut: theme.primary + alpha. */
  glow?: string;

  /** Titre (tooltip + aria). */
  title?: string;

  /** Taille du bouton (px). */
  size?: number;

  /** Couleur icône (optionnel). Par défaut: theme.primary. */
  color?: string;

  /** Si fourni, ouvre un modal RulesModal au clic. */
  content?: InfoDotContent;

  /** Optional compact control displayed next to the title of the opened modal. */
  modalTitleAddon?: React.ReactNode;

  /** Compatibilité avec les anciens appels <InfoDot active />. */
  active?: boolean;

  /** Force l’InfoDot classique sans remplacement automatique par Awena. */
  disableAwenaTakeover?: boolean;
};

const AWENA_AVATAR = "/awena/awena-avatar.webp";
const AWENA_NEON = "linear-gradient(135deg,#ffe600 0%,#27ff88 24%,#16e8ff 48%,#ff38c7 73%,#8d52ff 100%)";

function awenaReactText(node: React.ReactNode, depth = 0): string {
  if (depth > 8 || node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((item) => awenaReactText(item, depth + 1)).filter(Boolean).join(" ");
  if (React.isValidElement(node)) {
    return awenaReactText((node.props as any)?.children, depth + 1);
  }
  return "";
}


export default function InfoDot({
  onClick,
  glow,
  title = "Infos",
  size = 42,
  color,
  content,
  modalTitleAddon,
  active = false,
  disableAwenaTakeover = false,
}: Props) {
  const { theme } = useTheme();
  const awena = useAwenaOptional();
  const [open, setOpen] = React.useState(false);
  const closeContent = React.useCallback(() => setOpen(false), []);
  const renderedContent = typeof content === "function" ? content({ close: closeContent }) : content;

  const iconColor = color ?? theme.primary;
  const halo = glow ?? `${iconColor}88`;
  const awenaScreenMode = routeToAwenaMode(awena?.runtime?.route);

  React.useEffect(() => {
    if (!awena?.runtime?.route || content == null) return;
    const helpText = awenaReactText(renderedContent).replace(/\s+/g, " ").trim();
    if (helpText) registerAwenaHelp(awena.runtime.route, title, helpText);
  }, [awena?.runtime?.route, title, content, renderedContent]);

  const handle = React.useCallback(
    (e: any) => {
      try {
        e?.preventDefault?.();
        e?.stopPropagation?.();
      } catch {}

      // Modal interne si "content"
      if (content != null) setOpen(true);

      onClick?.(e);
    },
    [onClick, content]
  );

  // 🔥 icône volontairement plus grosse que BackDot pour être lisible
  const iconSize = Math.max(26, Math.round(size * 0.68));

  // Sur les écrans de configuration/menu d'un mode, Awena remplace désormais
  // l'InfoDot et propose Règles / Configuration / Records.
  const awenaMenuTakesOver = Boolean(
    awenaScreenMode &&
    !awena?.runtime?.inGame &&
    awena?.settings?.enabled &&
    awena?.settings?.interventionMode !== "off"
  );

  if (!disableAwenaTakeover && awenaMenuTakesOver && awenaScreenMode) {
    return <AwenaModeDot modeId={awenaScreenMode.id} size={Math.max(36, size)} />;
  }

  // V8.7 : sur les parcours complexes (caméra, compétition, sync, sauvegarde,
  // écrans externes...), l'ancien InfoDot devient un accès direct à l'Académie Awena.
  // Le contenu historique du InfoDot est toujours indexé ci-dessus dans le registre
  // d'aide, donc rien n'est perdu : Awena peut l'utiliser dans son explication.
  const awenaComplexTakesOver = Boolean(
    awena?.runtime?.route &&
    isAwenaComplexRoute(awena.runtime.route) &&
    awena?.settings?.enabled &&
    awena?.settings?.interventionMode !== "off"
  );

  if (!disableAwenaTakeover && awenaComplexTakesOver && awena) {
    const awenaSize = Math.max(36, size);
    const openProcedure = async (e: any) => {
      try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch {}
      awena.openPanel();
      await awena.ask(awenaProcedurePromptForRoute(awena.runtime.route), { canonicalFrench: true });
    };
    return (
      <div
        role="button"
        aria-label={`Awena · ${title}`}
        title={`Awena · ${title}`}
        tabIndex={0}
        onClick={(e: any) => { void openProcedure(e); }}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" || e.key === " ") void openProcedure(e);
        }}
        style={{
          width: awenaSize,
          height: awenaSize,
          borderRadius: 999,
          padding: 3,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          border: "none",
          background: AWENA_NEON,
          boxShadow: "0 0 18px rgba(22,232,255,.42),0 0 28px rgba(255,56,199,.28),0 0 0 2px rgba(0,0,0,.4)",
          flex: "0 0 auto",
          pointerEvents: "auto",
        }}
      >
        <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}>
          <img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
        </span>
      </div>
    );
  }

  // En partie, Awena remplace volontairement l’ancien InfoDot.
  // L’InfoDot historique reste disponible partout ailleurs et redevient le fallback
  // si Awena est coupée dans les réglages.
  const awenaTakesOver = Boolean(
    awena?.runtime?.inGame &&
    awena?.settings?.enabled &&
    awena?.settings?.interventionMode !== "off"
  );

  if (!disableAwenaTakeover && awenaTakesOver && awena) {
    const awenaSize = Math.max(36, size);
    return (
      <div
        role="button"
        aria-label="Ouvrir Awena"
        title="Awena · Assistante"
        tabIndex={0}
        onClick={(e: any) => {
          try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch {}
          awena.openPanel();
        }}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" || e.key === " ") {
            try { e?.preventDefault?.(); e?.stopPropagation?.(); } catch {}
            awena.openPanel();
          }
        }}
        style={{
          width: awenaSize,
          height: awenaSize,
          borderRadius: 999,
          padding: 3,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          border: "none",
          background: AWENA_NEON,
          boxShadow: "0 0 18px rgba(22,232,255,.42),0 0 28px rgba(255,56,199,.28),0 0 0 2px rgba(0,0,0,.4)",
          flex: "0 0 auto",
          pointerEvents: "auto",
        }}
      >
        <span style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "block", background: "#050713" }}>
          <img src={AWENA_AVATAR} alt="Awena" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        aria-label={title}
        title={title}
        tabIndex={0}
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
          background: active ? "rgba(0,0,0,0.66)" : "rgba(0,0,0,0.48)",
          boxShadow: active
            ? `0 0 0 2px rgba(0,0,0,0.22), 0 0 28px ${halo}, 0 0 58px ${halo}, inset 0 0 18px ${halo}`
            : `0 0 0 2px rgba(0,0,0,0.22), 0 0 22px ${halo}, 0 0 44px ${halo}`,
          color: iconColor, // ✅ la couleur THEME se propage au SVG via currentColor
          flex: "0 0 auto",
          pointerEvents: "auto",
        }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
          style={{
            display: "block",
            filter: `drop-shadow(0 0 14px ${halo}) drop-shadow(0 0 24px ${halo})`,
          }}
        >
          {/* IMPORTANT: fill="currentColor" (pas de noir hardcodé) */}
          <g
            transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)"
            fill="currentColor"
            stroke="none"
          >
            <path d="M4847 7964 c-260 -47 -480 -234 -568 -483 -73 -206 -58 -407 43 -606
60 -116 200 -254 318 -313 130 -65 228 -86 375 -80 202 9 353 75 496 217 87
87 146 182 185 296 39 114 45 286 15 405 -62 247 -225 435 -451 523 -140 55
-268 67 -413 41z m313 -350 c122 -58 203 -156 236 -284 36 -140 -3 -286 -106
-394 -205 -217 -558 -161 -691 110 -32 65 -34 74 -34 179 0 103 2 114 32 177
53 113 137 187 258 231 38 13 73 17 145 14 82 -2 104 -7 160 -33z"/>
            <path d="M4981 6205 c-230 -52 -411 -158 -623 -364 -126 -122 -237 -258 -318
-392 -148 -243 -231 -509 -187 -596 22 -42 71 -81 112 -89 72 -13 101 1 209
104 98 95 219 192 237 192 5 0 9 -461 9 -1117 0 -1245 -3 -1178 70 -1328 132
-272 428 -435 721 -395 105 14 241 59 339 111 348 187 688 598 820 989 57 171
50 270 -22 322 -32 23 -101 34 -143 24 -14 -4 -72 -50 -128 -102 -56 -53 -131
-118 -167 -145 l-65 -49 -5 1123 c-6 1112 -6 1123 -27 1192 -32 102 -50 142
-99 217 -89 134 -230 238 -389 288 -91 28 -254 36 -344 15z m272 -332 c49 -15
121 -65 163 -111 13 -15 39 -56 56 -92 l33 -65 5 -1272 c5 -1271 5 -1272 26
-1300 55 -74 123 -89 229 -53 32 11 60 20 62 20 10 0 -67 -90 -139 -161 -89
-90 -197 -173 -288 -222 -241 -131 -477 -91 -598 101 -65 102 -62 30 -62 1391
0 1228 0 1235 -21 1277 -40 84 -111 106 -222 71 -75 -24 -76 -24 -62 -4 38 55
164 183 238 242 217 175 406 233 580 178z"/>
          </g>
        </svg>
      </div>

      {content != null ? (
        <RulesModal open={open} onClose={closeContent} title={title} titleAddon={modalTitleAddon}>
          {typeof renderedContent === "string" ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{renderedContent}</div>
          ) : (
            renderedContent
          )}
        </RulesModal>
      ) : null}
    </>
  );
}
