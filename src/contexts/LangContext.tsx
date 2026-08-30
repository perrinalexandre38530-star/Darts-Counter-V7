// ============================================
// src/contexts/LangContext.tsx
// Contexte langue + i18n très simple
// ============================================

import React from "react";
import { DICT } from "../i18n";
import {
  createUiLiteralTranslator,
  getUiLiteralSourceLanguage,
  hydrateUiLiteralTranslationCache,
  looksFrenchUiText,
  registerUiLiteralTranslationSource,
  rememberUiLiteralTranslation,
  translateUiLiteralWithBrowser,
  warmUiLiteralTranslator,
} from "../i18n/uiLiteralSafety";
import { awenaTranslation } from "../awena/AwenaTranslation";
import { registerConfigUiLiteralSources } from "../i18n/configUiLiteralRegistry";
import { registerMonetizationUiLiteralSources } from "../i18n/monetizationUiLiteralRegistry";
import { registerAppUiLiteralSources } from "../i18n/appUiLiteralRegistry";
import { postProcessCoreUiTranslation, registerCoreUiLiteralTranslations } from "../i18n/coreUiOverrides";

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

// Register authored UI sources application-wide before the first DOM scan.
registerCoreUiLiteralTranslations();
// The feature registries stay loaded too because they contain hand-authored EN/ES translations.
registerAppUiLiteralSources();
registerConfigUiLiteralSources();
registerMonetizationUiLiteralSources();

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
    // Prépare immédiatement les traducteurs locaux pendant le clic utilisateur.
    // Chrome peut exiger cette activation et Android ML Kit peut télécharger le
    // modèle EN au premier usage. Le rendu statique reste disponible en secours.
    hydrateUiLiteralTranslationCache(next);
    warmUiLiteralTranslator(next, "fr");
    warmUiLiteralTranslator(next, "en");
    warmUiLiteralTranslator(next, "es");
    void Promise.all([
      awenaTranslation.prepare(next).catch(() => false),
      awenaTranslation.prepareBetween("fr", next).catch(() => false),
      awenaTranslation.prepareBetween("en", next).catch(() => false),
      awenaTranslation.prepareBetween("es", next).catch(() => false),
    ]);
    setLangState(next);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lang: next })
      );
    } catch {}
  }, []);

  // Couvre aussi un démarrage direct avec EN déjà enregistré dans localStorage :
  // dans ce cas l'utilisateur ne reclique pas forcément sur le sélecteur.
  React.useEffect(() => {
    // Warm both canonical source directions. This matters for configuration
    // screens because historical literals exist in both French and English.
    hydrateUiLiteralTranslationCache(lang);
    warmUiLiteralTranslator(lang, "fr");
    warmUiLiteralTranslator(lang, "en");
    warmUiLiteralTranslator(lang, "es");
    void Promise.all([
      awenaTranslation.prepare(lang).catch(() => false),
      awenaTranslation.prepareBetween("fr", lang).catch(() => false),
      awenaTranslation.prepareBetween("en", lang).catch(() => false),
      awenaTranslation.prepareBetween("es", lang).catch(() => false),
    ]);
  }, [lang]);

  // Keep the document metadata in sync with the selected language. This is
  // especially important for accessibility, native keyboards and Arabic RTL.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  // État persistant entre deux changements de langue : permet de restaurer le
  // texte source exact lorsqu'on repasse en FR, sans forcer un reload de l'app.
  type LiteralState = { source: string; applied: string; resolved?: string; resolvedLang?: string };
  const literalTextStateRef = React.useRef<WeakMap<Text, LiteralState>>(new WeakMap());
  const literalAttrStateRef = React.useRef<WeakMap<Element, Map<string, LiteralState>>>(new WeakMap());
  // PERF NAV: en français, les littéraux du DOM sont déjà dans leur langue source.
  // On ne doit donc pas observer/scanner chaque montage de page. Ce flag permet
  // de distinguer le premier boot FR (zéro scan nécessaire) d'un retour vers FR
  // après une autre langue (un scan unique restaure alors les sources mémorisées).
  const literalSafetyHasRunRef = React.useRef(false);

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
    const translatedAttrs = ["placeholder", "title", "aria-label", "alt"] as const;
    let cancelled = false;
    const pendingText = new WeakMap<Text, string>();
    const pendingAttr = new WeakMap<Element, Map<string, string>>();

    const resolveLiteralAsync = async (source: string): Promise<string | null> => {
      // FR is the authored/source UI. Do not machine-translate any DOM literal
      // into French; keep/restore the exact source wording instead.
      if (lang === "fr") return null;
      const sourceLanguage = getUiLiteralSourceLanguage(source);
      if (!sourceLanguage || sourceLanguage === lang) return null;

      // Serbian deserves a real Serbian browser translation when available.
      // Android ML Kit has no Serbian model and the native bridge therefore
      // uses Croatian + Cyrillic normalization only as a fallback.
      if (lang === "sr") {
        const browser = await translateUiLiteralWithBrowser(source, lang, sourceLanguage);
        if (browser) return postProcessCoreUiTranslation(lang, browser);
      }

      // Android: reuse the on-device ML Kit engine already integrated for Awena.
      if (awenaTranslation.isNativeAvailable()) {
        try {
          const native = await awenaTranslation.textBetween(source, sourceLanguage, lang);
          if (native && native.trim() && native.trim() !== source.trim()) {
            return postProcessCoreUiTranslation(lang, native);
          }
        } catch {}
      }

      // Web/desktop Chrome: Translator API on-device, no remote translation service.
      const browser = await translateUiLiteralWithBrowser(source, lang, sourceLanguage);
      return browser ? postProcessCoreUiTranslation(lang, browser) : null;
    };

    const scheduleTextResolve = (node: Text, source: string) => {
      if (!getUiLiteralSourceLanguage(source) || pendingText.get(node) === source) return;
      pendingText.set(node, source);
      void resolveLiteralAsync(source).then((resolved) => {
        if (cancelled || !resolved) return;
        const state = textState.get(node);
        if (!state || state.source !== source) return;
        const lead = source.match(/^\s*/)?.[0] || "";
        const trail = source.match(/\s*$/)?.[0] || "";
        const applied = `${lead}${resolved.trim()}${trail}`;
        const sourceLanguage = getUiLiteralSourceLanguage(source);
        if (sourceLanguage) rememberUiLiteralTranslation(source, sourceLanguage, lang, resolved);
        textState.set(node, { ...state, applied, resolved: applied, resolvedLang: lang });
        if (node.nodeValue !== applied) node.nodeValue = applied;
      }).finally(() => {
        if (pendingText.get(node) === source) pendingText.delete(node);
      });
    };

    const scheduleAttrResolve = (el: Element, attr: string, source: string) => {
      if (!getUiLiteralSourceLanguage(source)) return;
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
        const sourceLanguage = getUiLiteralSourceLanguage(source);
        if (sourceLanguage) rememberUiLiteralTranslation(source, sourceLanguage, lang, resolved);
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
      const applied = resolved || translateLiteral(source);
      textState.set(node, { source, applied, resolved, resolvedLang: resolved ? lang : undefined });
      if (applied !== current) node.nodeValue = applied;
      if (lang !== "fr" && !resolved && getUiLiteralSourceLanguage(source)) scheduleTextResolve(node, source);
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
      const applied = resolved || translateLiteral(source);
      map.set(attr, { source, applied, resolved, resolvedLang: resolved ? lang : undefined });
      if (applied !== current) el.setAttribute(attr, applied);
      if (lang !== "fr" && !resolved && getUiLiteralSourceLanguage(source)) scheduleAttrResolve(el, attr, source);
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
        (root as ParentNode).querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el) => {
          for (const attr of translatedAttrs) applyAttr(el, attr);
        });
      }
    };

    const body = document.body;
    if (!body) return;

    // PERF NAV CRITICAL:
    // - Premier boot FR : aucun texte n'a pu être traduit auparavant, donc scanner
    //   tout le DOM est du travail perdu.
    // - Retour vers FR depuis une autre langue : un scan unique suffit à restaurer
    //   les sources mémorisées. Il n'y a ensuite rien à traduire sur les nouveaux
    //   écrans FR, donc surtout PAS de MutationObserver global.
    if (lang === "fr" && !literalSafetyHasRunRef.current) {
      literalSafetyHasRunRef.current = true;
      return () => { cancelled = true; };
    }

    scan(body);
    literalSafetyHasRunRef.current = true;

    if (lang === "fr") {
      return () => { cancelled = true; };
    }

    // Les anciens callbacks scannaient immédiatement chaque addedNode. React peut
    // créer des centaines de mutations lors d'un changement de page, avec des
    // sous-arbres imbriqués => rescans répétés quasi O(n²). On regroupe désormais
    // toutes les mutations d'une frame, puis on ne garde que les racines utiles.
    let frameId: number | null = null;
    const pendingRoots = new Set<Node>();
    const pendingAttrs = new Map<Element, Set<string>>();

    const queueRoot = (node: Node) => {
      for (const root of pendingRoots) {
        try {
          if (root === node || root.contains(node)) return;
          if (node.contains(root)) pendingRoots.delete(root);
        } catch {}
      }
      pendingRoots.add(node);
    };

    const flushMutations = () => {
      frameId = null;
      if (cancelled) return;
      const roots = Array.from(pendingRoots);
      pendingRoots.clear();
      const attrs = Array.from(pendingAttrs.entries());
      pendingAttrs.clear();

      for (const root of roots) scan(root);
      for (const [el, names] of attrs) {
        for (const attr of names) applyAttr(el, attr);
      }
    };

    const scheduleFlush = () => {
      if (frameId != null || cancelled) return;
      frameId = window.requestAnimationFrame(flushMutations);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          queueRoot(mutation.target);
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach(queueRoot);
        } else if (mutation.type === "attributes" && mutation.attributeName) {
          const el = mutation.target as Element;
          let names = pendingAttrs.get(el);
          if (!names) { names = new Set<string>(); pendingAttrs.set(el, names); }
          names.add(mutation.attributeName);
        }
      }
      scheduleFlush();
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
      if (frameId != null) window.cancelAnimationFrame(frameId);
      pendingRoots.clear();
      pendingAttrs.clear();
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

        // 2) English keeps its deterministic static fallback.
        if (lang === "en") {
          const dictEn = getDictFor("en") || {};
          if (Object.prototype.hasOwnProperty.call(dictEn, key)) {
            return dictEn[key];
          }

          const sourceFr =
            (Object.prototype.hasOwnProperty.call(dictFr, key) && dictFr[key]) ||
            fallback ||
            key;
          return createUiLiteralTranslator(DICT_ANY, "en")(sourceFr);
        }

        // 3) For every other selected language, NEVER fall back to English.
        // Prefer an exact translation already present in that language. If a
        // recent key is missing (many new screens only exist in fr/en/es),
        // expose its canonical French source to the DOM safety-net. The local
        // Android ML Kit / Chrome Translator layer then translates that source
        // into the language actually selected by the user.
        if (lang !== "fr") {
          const dictEn = getDictFor("en") || {};
          const hasFr = Object.prototype.hasOwnProperty.call(dictFr, key);
          const hasEn = Object.prototype.hasOwnProperty.call(dictEn, key);
          const sourceFr = (hasFr && dictFr[key]) || fallback || key;

          const deterministic = createUiLiteralTranslator(DICT_ANY, lang)(sourceFr);
          if (deterministic !== sourceFr) return deterministic;

          // Most fallbacks are authored in French. Some legacy FR entries use
          // English technical wording ("Patch notes", "Winrate", ...). When a
          // matching English dictionary value exists, register EN as the source
          // so the local translator does not incorrectly force FR→target.
          if (!looksFrenchUiText(sourceFr) && hasEn) {
            const sourceEn = dictEn[key];
            registerUiLiteralTranslationSource(sourceEn, "en");
            return sourceEn;
          }

          registerUiLiteralTranslationSource(sourceFr, "fr");
          return sourceFr;
        }

        // 4) French only: FR dictionary then manual fallback.
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
