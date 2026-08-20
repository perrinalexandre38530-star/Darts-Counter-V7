const KILLER_AWENA_RULES_INTRO_LEGACY_KEY = "dc_killer_awena_rules_intro_seen_v2";
export const KILLER_AWENA_RULES_INTRO_SEEN_KEY = "dc_killer_awena_rules_intro_seen_v3";

function killerRulesLanguageVariant(lang?: string): "fr" | "en" {
  return String(lang || "fr").toLowerCase() === "fr" ? "fr" : "en";
}

function killerRulesSeenKey(lang?: string): string {
  return `${KILLER_AWENA_RULES_INTRO_SEEN_KEY}_${killerRulesLanguageVariant(lang)}`;
}

export function hasSeenKillerAwenaRulesIntro(lang?: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const variant = killerRulesLanguageVariant(lang);
    if (window.localStorage.getItem(killerRulesSeenKey(variant)) === "1") return true;

    // Les utilisateurs ayant déjà vu l'ancienne intro Killer l'ont vue en français.
    // On migre donc l'ancien état uniquement vers FR. Une première ouverture en
    // anglais (toutes les langues non-FR) affichera bien la nouvelle vidéo EN.
    if (variant === "fr" && window.localStorage.getItem(KILLER_AWENA_RULES_INTRO_LEGACY_KEY) === "1") {
      window.localStorage.setItem(killerRulesSeenKey("fr"), "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function markKillerAwenaRulesIntroSeen(lang?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(killerRulesSeenKey(lang), "1");
  } catch {}
}
