import * as React from "react";

// ============================================
// src/hooks/useFullscreenPlay.ts
//
// Objectif:
// - Stabiliser l'affichage "fullscreen play" sur mobile/tablette
// - Fix iOS/Android: viewport height instable (barres navigateur)
// - Empêcher le scroll du body quand le layout a son propre conteneur scroll
//
// IMPORTANT:
// - Ne force PAS l'API Fullscreen (souvent bloquée sans geste utilisateur)
// - Se contente de:
//   1) poser une CSS var --vh (1% de la hauteur réelle)
//   2) ajouter une classe sur <html>
//   3) optionnellement verrouiller le scroll du body
// ============================================

export type FullscreenPlayOptions = {
  /** Active/désactive le helper. Par défaut: false (opt-in) */
  enabled?: boolean;
  /** Ajoute une classe sur <html>. Par défaut: "dc-fullscreen-play" */
  className?: string;
  /** Met à jour la variable CSS --vh. Par défaut: true */
  setVhVar?: boolean;
  /** Empêche le scroll du body. Par défaut: true */
  lockBodyScroll?: boolean;
};

export function useFullscreenPlay(options: FullscreenPlayOptions = {}) {
  const {
    enabled = false,
    className = "dc-fullscreen-play",
    setVhVar = true,
    lockBodyScroll = true,
  } = options;

  React.useEffect(() => {
    // ✅ IMPORTANT (stabilité V7): ce hook a des effets globaux (html/body).
    // On le laisse en opt-in pour éviter de "casser" les layouts desktop/preview.
    if (!enabled) return;

    const html = document.documentElement;
    const body = document.body;

    // 1) Classe HTML
    if (className) html.classList.add(className);

    // 2) Lock scroll body (on garde les styles d'origine pour restore)
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = (body.style as any).overscrollBehavior;
    const prevBodyTouchAction = (body.style as any).touchAction;

    if (lockBodyScroll) {
      body.style.overflow = "hidden";
      (body.style as any).overscrollBehavior = "none";
      (body.style as any).touchAction = "manipulation";
    }

    // 3) CSS var --vh (1% de innerHeight)
    const setVh = () => {
      if (!setVhVar) return;
      const vh = window.innerHeight * 0.01;
      html.style.setProperty("--vh", `${vh}px`);
    };

    setVh();

    // iOS/Android: resize + orientation change
    window.addEventListener("resize", setVh, { passive: true });
    window.addEventListener("orientationchange", setVh, { passive: true } as any);

    return () => {
      window.removeEventListener("resize", setVh as any);
      window.removeEventListener("orientationchange", setVh as any);

      if (className) html.classList.remove(className);

      if (lockBodyScroll) {
        body.style.overflow = prevBodyOverflow;
        (body.style as any).overscrollBehavior = prevBodyOverscroll;
        (body.style as any).touchAction = prevBodyTouchAction;
      }

      if (setVhVar) {
        // On laisse la var en place si d'autres écrans l'utilisent,
        // mais on peut la nettoyer si tu préfères:
        // html.style.removeProperty("--vh");
      }
    };
  }, [className, setVhVar, lockBodyScroll]);
}
