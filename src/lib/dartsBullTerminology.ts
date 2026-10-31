export type BullLanguage = string | null | undefined;

/**
 * Canonical display convention for the two central dartboard zones.
 *
 * Generic centre (25 + 50 together): BULL in every language.
 * French: outer 25 = 1/2 BULL, inner 50 = BULL.
 * English: outer 25 = BULL, inner 50 = DBULL.
 * Other languages / generic technical display: BULL 25 / BULL 50.
 *
 * Important: a bare "BULL" is NEVER rewritten. It means the whole centre.
 */
export function localizeBullTerminology(language: BullLanguage, value: string): string {
  if (!value || !/bull/i.test(value)) return value;
  const lang = String(language || "").toLowerCase().split("-")[0];
  const OUTER = "__MSS_BULL_OUTER_25__";
  const INNER = "__MSS_BULL_INNER_50__";
  let text = String(value);

  // Protect explicit zone references first. Bare BULL is intentionally untouched.
  text = text.replace(/\b1\s*\/\s*2\s+BULL(?:\s*25)?\b/gi, OUTER);
  text = text.replace(/\bBULL\s*25\b/gi, OUTER);
  text = text.replace(/\bSBULL\b/gi, OUTER);
  text = text.replace(/\bSINGLE\s+BULL\b/gi, OUTER);

  text = text.replace(/\bD[\s-]?BULL(?:\s*50)?\b/gi, INNER);
  text = text.replace(/\bDOUBLE\s+BULL(?:\s*50)?\b/gi, INNER);
  text = text.replace(/\bBULL\s*50\b/gi, INNER);

  if (lang === "fr") {
    return text.replaceAll(OUTER, "1/2 BULL").replaceAll(INNER, "BULL");
  }
  if (lang === "en") {
    return text.replaceAll(OUTER, "BULL").replaceAll(INNER, "DBULL");
  }
  return text.replaceAll(OUTER, "BULL 25").replaceAll(INNER, "BULL 50");
}
