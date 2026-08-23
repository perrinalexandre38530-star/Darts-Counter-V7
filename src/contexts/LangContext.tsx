// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// ============================================

import React from "react";
import { DICT } from "../i18n";
import {
  createUiLiteralTranslator,
  looksFrenchUiText,
  translateUiLiteralWithBrowser,
  warmUiLiteralTranslator,
} from "../i18n/uiLiteralSafety";
import { awenaTranslation } from "../awena/AwenaTranslation";

// -----------------------------
// Types publics
// -----------------------------

export type Lang =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "zh"
  | "ja"
  | "ar"
  | "hi"
  | "tr"
  | "da"
  | "no"
  | "sv"
  | "is"
  | "pl"
  | "ro"
  | "sr"
  | "hr"
  | "cs";

export type Dict = Record<string, string>;

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const LangContext = React.createContext<LangContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "dc_lang_v1";

const ALL_LANGS: Lang[] = [
  "fr",
  "en",
  "es",
  "de",
  "it",
  "pt",
  "nl",
  "ru",
  "zh",
  "ja",
  "ar",
  "hi",
  "tr",
  "da",
  "no",
  "sv",
  "is",
  "pl",
  "ro",
  "sr",
  "hr",
  "cs",
];

// Force type dynamique
const DICT_ANY = DICT as any;

// -----------------------------
// Helpers
// -----------------------------

function getDictFor(code: Lang): Dict | undefined {
  return DICT_ANY[code] as Dict | undefined;
}

// -----------------------------
// Provider
// -----------------------------

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("fr");

  // --- Chargement depuis localStorage ---
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.lang !== "string") return;

      const candidate = parsed.lang as Lang;
      if (ALL_LANGS.includes(candidate)) {
        setLangState(candidate);
      }
    } catch {
      // silencieux : FR par défaut
    }
  }, []);

  // --- setLang() ---
  const setLang = React.useCallback((next: Lang) => {
    // Prépare immédiatement le traducteur local du navigateur pendant le clic
    // utilisateur (Chrome peut exiger cette activation au 1er téléchargement).
    warmUiLiteralTranslator(next);
    setLangState(next);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lang: next })
      );
    } catch {}
  }, []);

  // État persistant entre deux changements de langue : permet de restaurer le
  // texte source exact lorsqu'on repasse en FR, sans forcer un reload de l'app.
  type LiteralState = { source: string; applied: string; resolved?: string; resolvedLang?: string };
  const literalTextStateRef = React.useRef<WeakMap<Text, LiteralState>>(new WeakMap());
  const literalAttrStateRef = React.useRef<WeakMap<Element, Map<string, LiteralState>>>(new WeakMap());

  // --- Safety-net global pour les libellés UI historiques codés en dur ---
  // Les dictionnaires restent la source normale. Ce garde-fou ne touche que le DOM
  // visible et empêche qu'un texte français résiduel survive quand EN est actif.
  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const translateLiteral = createUiLiteralTranslator(DICT_ANY, lang);
    type TextState = LiteralState;
    type AttrState = LiteralState;
    const textState = literalTextStateRef.current as WeakMap<Text, TextState>;
    const attrState = literalAttrStateRef.current as WeakMap<Element, Map<string, AttrState>>;
    const translatedAttrs = ["placeholder", "title", "aria-label"] as const;
    let cancelled = false;
    const pendingText = new WeakMap<Text, string>();
    const pendingAttr = new WeakMap<Element, Map<string, string>>();

    const resolveLiteralAsync = async (source: string): Promise<string | null> => {
      if (lang === "fr" || !looksFrenchUiText(source)) return null;

      // Android: réutilise le moteur ML Kit local déjà intégré pour Awena.
      if (awenaTranslation.isNativeAvailable()) {
        try {
          const native = await awenaTranslation.textFromFrench(source, lang);
          if (native && native.trim() && native.trim() !== source.trim()) return native;
        } catch {}
      }

      // Web/desktop Chrome 138+: Translator API on-device, sans service distant.
      return translateUiLiteralWithBrowser(source, lang);
    };

    const scheduleTextResolve = (node: Text, source: string) => {
      if (lang === "fr" || !looksFrenchUiText(source) || pendingText.get(node) === source) return;
      pendingText.set(node, source);
      void resolveLiteralAsync(source).then((resolved) => {
        if (cancelled || !resolved) return;
        const state = textState.get(node);
        if (!state || state.source !== source) return;
        const lead = source.match(/^\s*/)?.[0] || "";
        const trail = source.match(/\s*$/)?.[0] || "";
        const applied = `${lead}${resolved.trim()}${trail}`;
        textState.set(node, { ...state, applied, resolved: applied, resolvedLang: lang });
        if (node.nodeValue !== applied) node.nodeValue = applied;
      }).finally(() => {
        if (pendingText.get(node) === source) pendingText.delete(node);
      });
    };

    const scheduleAttrResolve = (el: Element, attr: string, source: string) => {
      if (lang === "fr" || !looksFrenchUiText(source)) return;
      let map = pendingAttr.get(el);
      if (!map) { map = new Map<string, string>(); pendingAttr.set(el, map); }
      if (map.get(attr) === source) return;
      map.set(attr, source);
      void resolveLiteralAsync(source).then((resolved) => {
        if (cancelled || !resolved) return;
        const states = attrState.get(el);
        const state = states?.get(attr);
        if (!state || state.source !== source) return;
        const applied = resolved.trim();
        states?.set(attr, { ...state, applied, resolved: applied, resolvedLang: lang });
        if (el.getAttribute(attr) !== applied) el.setAttribute(attr, applied);
      }).finally(() => {
        if (map?.get(attr) === source) map.delete(attr);
      });
    };

    const applyText = (node: Text) => {
      const current = node.nodeValue || "";
      const prev = textState.get(node);
      const source = prev && current === prev.applied ? prev.source : current;
      const sourceChanged = !prev || source !== prev.source;
      const resolved = !sourceChanged && prev?.resolvedLang === lang ? prev.resolved : undefined;
      const applied = lang === "fr" ? source : (resolved || translateLiteral(source));
      textState.set(node, { source, applied, resolved, resolvedLang: resolved ? lang : undefined });
      if (applied !== current) node.nodeValue = applied;
      if (!resolved && (looksFrenchUiText(applied) || source.trim().length > 45)) scheduleTextResolve(node, source);
    };

    const applyAttr = (el: Element, attr: string) => {
      if (!el.hasAttribute(attr)) return;
      const current = el.getAttribute(attr) || "";
      let map = attrState.get(el);
      if (!map) {
        map = new Map<string, AttrState>();
        attrState.set(el, map);
      }
      const prev = map.get(attr);
      const source = prev && current === prev.applied ? prev.source : current;
      const sourceChanged = !prev || source !== prev.source;
      const resolved = !sourceChanged && prev?.resolvedLang === lang ? prev.resolved : undefined;
      const applied = lang === "fr" ? source : (resolved || translateLiteral(source));
      map.set(attr, { source, applied, resolved, resolvedLang: resolved ? lang : undefined });
      if (applied !== current) el.setAttribute(attr, applied);
      if (!resolved && (looksFrenchUiText(applied) || source.trim().length > 45)) scheduleAttrResolve(el, attr, source);
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        const parent = (root as Text).parentElement;
        const tag = parent?.tagName?.toLowerCase();
        if (tag !== "script" && tag !== "style" && tag !== "noscript") applyText(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

      if (root.nodeType === Node.ELEMENT_NODE) {
        const el = root as Element;
        for (const attr of translatedAttrs) applyAttr(el, attr);
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const parent = (node as Text).parentElement;
        const tag = parent?.tagName?.toLowerCase();
        if (tag !== "script" && tag !== "style" && tag !== "noscript") applyText(node as Text);
        node = walker.nextNode();
      }

      if ((root as ParentNode).querySelectorAll) {
        (root as ParentNode).querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
          for (const attr of translatedAttrs) applyAttr(el, attr);
        });
      }
    };

    const body = document.body;
    if (!body) return;
    scan(body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          scan(mutation.target);
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach(scan);
        } else if (mutation.type === "attributes" && mutation.attributeName) {
          applyAttr(mutation.target as Element, mutation.attributeName);
        }
      }
    });
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...translatedAttrs],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [lang]);

  // --- Valeur du contexte ---
  const value = React.useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string, fallback?: string) => {
        const dictCurrent = getDictFor(lang);
        const dictFr = getDictFor("fr") || {};

        // 1) Dictionnaire langue courante
        if (
          dictCurrent &&
          Object.prototype.hasOwnProperty.call(dictCurrent, key)
        ) {
          return dictCurrent[key];
        }

        // 2) Pour toute langue non-FR, l'anglais est le fallback universel.
        // Ainsi une clé absente ne peut jamais réinjecter du français dans l'UI.
        if (lang !== "fr") {
          const dictEn = getDictFor("en") || {};
          if (Object.prototype.hasOwnProperty.call(dictEn, key)) {
            return dictEn[key];
          }

          if (fallback) {
            return createUiLiteralTranslator(DICT_ANY, "en")(fallback);
          }
          return key;
        }

        // 3) En français seulement, fallback FR puis fallback manuel.
        if (Object.prototype.hasOwnProperty.call(dictFr, key)) {
          return dictFr[key];
        }
        return fallback ?? key;
      },
    }),
    [lang]
  );

  return (
    <LangContext.Provider value={value}>{children}</LangContext.Provider>
  );
}

// -----------------------------
// Hook
// -----------------------------

export function useLang(): LangContextValue {
  const ctx = React.useContext(LangContext);
  if (!ctx) {
    throw new Error("useLang must be used within LangProvider");
  }
  return ctx;
}
