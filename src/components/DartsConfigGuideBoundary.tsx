import React from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../contexts/ThemeContext";
import MssAwenaExplainButton from "./MssAwenaExplainButton";

type ViewMode = "guided" | "complete";

// Slot commun : les jeux apparentés accompagnent la première étape, sans en créer une.
export const DartsGuideRelatedSlot = React.createContext<HTMLElement | null>(null);

type Props = {
  route: string;
  children: React.ReactNode;
};

function cleanLabel(value: string, fallback: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 44 ? `${text.slice(0, 41)}…` : text;
}

function isPersistentNode(el: HTMLElement, index: number) {
  if (index === 0) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "style" || tag === "script") return true;
  if (el.getAttribute("role") === "dialog") return true;
  if (el.hasAttribute("data-mss-config-guide-toolbar")) return true;
  if (el.matches("[data-mss-game-family], [data-mss-guide-related-slot]")) return true;
  if (el.querySelector("[data-mss-game-family]") && !el.querySelector("input,select,[data-mss-guide-section]")) return true;
  const className = String(el.className || "").toLowerCase();
  // Les rails vidéo Awena et les headers/tickers restent permanents pendant
  // le parcours guidé : seuls les blocs de paramètres changent d'étape.
  if (className.includes("awena") || className.includes("ticker") || className.includes("header")) return true;
  return false;
}

// Le boundary rend une balise <style> avant la page React. Ne jamais prendre
// firstElementChild ici : cela placerait la barre de configuration dans <style>
// et empêcherait de détecter les étapes, surtout après les rerenders.
function getGuidePage(host: HTMLElement): HTMLElement | null {
  const direct = Array.from(host.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
  return direct.find((node) =>
    node.tagName !== "STYLE" && node.tagName !== "SCRIPT" &&
    !node.hasAttribute("data-mss-config-guide-toolbar") &&
    (node.matches(".screen, .page, .msc-mode-config") || !!node.querySelector("[data-mss-guide-section], [data-mss-config-guide-anchor]"))
  ) || direct.find((node) => node.tagName !== "STYLE" && node.tagName !== "SCRIPT") || null;
}

function findStepNodes(host: HTMLElement): HTMLElement[] {
  const page = getGuidePage(host);
  if (!page) return [];

  // Les configs riches (Killer, etc.) peuvent déclarer leurs étapes explicitement.
  // On privilégie ces marqueurs avant toute heuristique DOM afin que le mode GUIDÉ
  // ne soit jamais une simple copie de la configuration complète.
  const explicit = Array.from(page.querySelectorAll("[data-mss-guide-section]"))
    .filter((node): node is HTMLElement => node instanceof HTMLElement);
  if (explicit.length >= 2) return explicit.sort((a,b) => Number(a.dataset.mssGuideOrder ?? 999) - Number(b.dataset.mssGuideOrder ?? 999));

  const direct = Array.from(page.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
  let candidates = direct.filter((el, index) => !isPersistentNode(el, index));

  // Les anciennes configs utilisent très souvent <Section/> => .card.
  // Si tout est contenu dans un seul wrapper, on descend d'un niveau pour
  // retrouver ces cartes sans toucher aux modales / overlays.
  if (candidates.length < 2) {
    const cards = Array.from(page.querySelectorAll(":scope > .card, :scope > .content > .card, :scope > section, :scope > .content > section"))
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    if (cards.length >= 2) candidates = cards;
  }

  if (candidates.length < 2) {
    const wrapper = direct.find((el, index) => index > 0 && el.children.length >= 2);
    if (wrapper) {
      const nested = Array.from(wrapper.children)
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .filter((el, index) => !isPersistentNode(el, index));
      if (nested.length >= 2) candidates = nested;
    }
  }

  // Un guide sans étapes explicites peut déclarer un seul bloc de présentation Awena.
  // Il devient la première étape, sans recopier ni déplacer son contenu React.
  const awenaButton = page.querySelector("[data-mss-guide-awena-trigger], button[class*='awena-sidecard']") as HTMLElement | null;
  const awenaIntro = (page.querySelector("[data-mss-guide-intro-card]") || awenaButton?.closest("section")) as HTMLElement | null;
  if (awenaIntro && !candidates.includes(awenaIntro)) candidates = [awenaIntro, ...candidates.filter((el) => !awenaIntro.contains(el))];
  return candidates.filter((el) => {
    const text = (el.textContent || "").trim();
    return text.length > 0 || el.querySelector("button,input,select,img") != null;
  });
}

function stepLabel(el: HTMLElement, index: number) {
  const explicitLabel = String(el.getAttribute("data-mss-guide-label") || "").trim();
  if (explicitLabel) return cleanLabel(explicitLabel, `Étape ${index + 1}`);
  const heading = el.querySelector("h1,h2,h3,h4,[data-config-title]") as HTMLElement | null;
  if (heading?.textContent) return cleanLabel(heading.textContent, `Étape ${index + 1}`);
  const first = Array.from(el.querySelectorAll("strong,b,label,button,div"))
    .find((node) => (node.textContent || "").trim().length >= 2 && (node.textContent || "").trim().length <= 60) as HTMLElement | undefined;
  return cleanLabel(first?.textContent || "", `Étape ${index + 1}`);
}

export default function DartsConfigGuideBoundary({ route, children }: Props) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#22e6ff";
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = React.useState<ViewMode>(() => {
    try { return localStorage.getItem(`dc_universal_config_view_${route}`) === "complete" ? "complete" : "guided"; }
    catch { return "guided"; }
  });
  const [step, setStep] = React.useState(0);
  const [steps, setSteps] = React.useState<string[]>([]);
  const [portalHost, setPortalHost] = React.useState<HTMLElement | null>(null);
  const [relatedHost, setRelatedHost] = React.useState<HTMLElement | null>(null);
  const [hasAwenaVideo, setHasAwenaVideo] = React.useState(false);

  React.useEffect(() => {
    setStep(0);
  }, [route]);

  // La configuration KILLER conserve une ancre React sous son ticker.
  // Si React remplace cette ancre pendant la restauration d'une partie ou une
  // modification des participants, rattacher le portail au nouveau noeud.
  // Sans cela les commandes Guidée / Complète peuvent disparaître de l'écran.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const syncGuideAnchor = () => {
      const page = getGuidePage(host);
      const fresh = (page?.querySelector("[data-mss-config-guide-anchor]") ||
        page?.querySelector(":scope > [data-mss-config-guide-toolbar]")) as HTMLElement | null;
      if (fresh) setPortalHost((previous) => previous === fresh ? previous : fresh);
    };
    syncGuideAnchor();
    const observer = new MutationObserver(() => {
      // Les insertions du portail lui-même ne provoquent pas de mise à jour :
      // on ne change d'hôte que lorsque le noeud courant a disparu.
      if (!hostRef.current?.contains(portalHost as Node)) syncGuideAnchor();
    });
    observer.observe(host, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route, portalHost]);

  React.useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const nodes = findStepNodes(host);
    setHasAwenaVideo(!!host.querySelector("[data-mss-guide-awena-trigger],button[class*='awena-sidecard']"));
    // Un bloc de variantes n'est JAMAIS une étape de configuration.
    const firstStep = nodes[0];
    if (firstStep) {
      let relatedSlot = host.querySelector("[data-mss-guide-related-slot]") as HTMLElement | null;
      if (!relatedSlot) {
        relatedSlot = document.createElement("div");
        relatedSlot.setAttribute("data-mss-guide-related-slot", "1");
      }
      if (firstStep.nextElementSibling !== relatedSlot) firstStep.after(relatedSlot);
      setRelatedHost(relatedSlot);
      relatedSlot.style.display = mode === "guided" && step !== 0 ? "none" : "";
    }
    setSteps(nodes.map(stepLabel));
    setStep((current) => Math.min(current, Math.max(0, nodes.length - 1)));

    const page = getGuidePage(host);
    if (page) {
      // Préférer une ancre rendue et conservée par React (ex. KILLER).
      // Les insertions DOM dans une page React peuvent disparaître après un rerender.
      let mount = page.querySelector("[data-mss-config-guide-anchor]") as HTMLElement | null;
      if (!mount) {
        // Fallback historique pour les autres configurateurs non migrés.
        mount = page.querySelector(":scope > [data-mss-config-guide-toolbar]") as HTMLElement | null;
        if (!mount) {
          mount = document.createElement("div");
          mount.setAttribute("data-mss-config-guide-toolbar", "1");
          const first = page.firstElementChild;
          if (first?.nextSibling) page.insertBefore(mount, first.nextSibling);
          else page.appendChild(mount);
        }
      }
      setPortalHost(mount);
    }

    const guideContainers = Array.from(page?.querySelectorAll?.("[data-mss-guide-container]") || [])
      .filter((node): node is HTMLElement => node instanceof HTMLElement);

    guideContainers.forEach((container) => {
      container.dataset.mssGuidePrevDisplay = container.style.display;
    });

    nodes.forEach((node, index) => {
      const previous = node.style.display;
      node.dataset.mssGuidePrevDisplay = previous;
      if (mode === "guided" && index !== step) node.style.display = "none";
      else node.style.display = previous || "";
      node.dataset.mssGuideStep = String(index);
    });

    const intro = host.querySelector("[data-mss-guide-intro]") as HTMLElement | null;
    if (intro) intro.style.display = mode === "guided" && step !== 0 ? "none" : "";

    if (mode === "guided" && nodes.length) {
      const activeNode = nodes[Math.min(step, nodes.length - 1)] || null;
      guideContainers.forEach((container) => {
        container.style.display = activeNode && container.contains(activeNode)
          ? (container.dataset.mssGuidePrevDisplay || "")
          : "none";
      });
    } else {
      guideContainers.forEach((container) => {
        container.style.display = container.dataset.mssGuidePrevDisplay || "";
      });
    }

    return () => {
      nodes.forEach((node) => {
        node.style.display = node.dataset.mssGuidePrevDisplay || "";
        delete node.dataset.mssGuidePrevDisplay;
        delete node.dataset.mssGuideStep;
      });
      guideContainers.forEach((container) => {
        container.style.display = container.dataset.mssGuidePrevDisplay || "";
        delete container.dataset.mssGuidePrevDisplay;
      });
    };
  }, [mode, step, route, children]);

  const selectMode = (next: ViewMode) => {
    setMode(next);
    if (next === "guided") setStep(0);
    try { localStorage.setItem(`dc_universal_config_view_${route}`, next); } catch {}
  };

  const maxStep = Math.max(0, steps.length - 1);
  const toolbar = (
    <section className="mss-universal-config-guide" style={{
      margin: "8px 0 10px",
      padding: "10px 12px",
      borderRadius: 16,
      border: `1px solid ${accent}55`,
      background: "linear-gradient(180deg,rgba(10,15,28,.96),rgba(4,7,16,.94))",
      boxShadow: `0 0 22px ${accent}16, 0 12px 28px rgba(0,0,0,.38)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: accent, fontWeight: 1000, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Configuration</div>
          {mode === "guided" && steps.length ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.68)", fontSize: 10.5 }}>Étape {step + 1}/{steps.length} · {steps[step]}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {(["guided", "complete"] as const).map((value) => (
            <button key={value} type="button" onClick={() => selectMode(value)} style={{
              minHeight: 34,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${mode === value ? accent : "rgba(255,255,255,.12)"}`,
              background: mode === value ? `${accent}22` : "rgba(255,255,255,.035)",
              color: mode === value ? "#fff" : "rgba(255,255,255,.72)",
              fontWeight: 950,
              fontSize: 11,
            }}>{value === "guided" ? "Guidée" : "Complète"}</button>
          ))}
        </div>
      </div>
      {mode === "guided" && step > 0 && hasAwenaVideo && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 9 }}>
          <MssAwenaExplainButton onClick={() => {
            const target = hostRef.current?.querySelector("[data-mss-guide-awena-trigger],button[class*='awena-sidecard']") as HTMLButtonElement | null;
            target?.click();
          }} />
        </div>
      )}
      {mode === "guided" && steps.length ? <>
        <div style={{ marginTop: 9, height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
          <div style={{ width: `${((step + 1) / steps.length) * 100}%`, height: "100%", background: `linear-gradient(90deg,${accent},#ff4bd8)` }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 }}>
          <button type="button" disabled={step <= 0} onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ minHeight: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: step <= 0 ? "rgba(255,255,255,.28)" : "#fff", fontWeight: 900 }}>← Précédent</button>
          <button type="button" disabled={step >= maxStep} onClick={() => setStep((v) => Math.min(maxStep, v + 1))} style={{ minHeight: 34, borderRadius: 999, border: `1px solid ${accent}88`, background: `${accent}18`, color: step >= maxStep ? "rgba(255,255,255,.28)" : accent, fontWeight: 950 }}>Suivant →</button>
        </div>
      </> : null}
    </section>
  );

  return <DartsGuideRelatedSlot.Provider value={relatedHost}>
    <div ref={hostRef} className="mss-darts-config-guide-boundary" data-config-view={mode} data-mss-guide-final-step={step >= maxStep && steps.length > 0 ? "true" : "false"}>
      <style>{`
        .mss-darts-config-guide-boundary[data-config-view="guided"] [data-mss-guide-launch="killer"] { display: none !important; }
        .mss-darts-config-guide-boundary[data-config-view="guided"][data-mss-guide-final-step="true"] [data-mss-guide-launch="killer"][data-mss-guide-ready="true"] { display: block !important; }
      `}</style>
      {children}{portalHost && hostRef.current?.contains(portalHost) ? createPortal(toolbar, portalHost) : <div data-mss-config-guide-fallback="1">{toolbar}</div>}
    </div>
  </DartsGuideRelatedSlot.Provider>;
}
