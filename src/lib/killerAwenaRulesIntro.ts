export const KILLER_AWENA_RULES_INTRO_SEEN_KEY = "dc_killer_awena_rules_intro_seen_v2";

export function hasSeenKillerAwenaRulesIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(KILLER_AWENA_RULES_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markKillerAwenaRulesIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KILLER_AWENA_RULES_INTRO_SEEN_KEY, "1");
  } catch {}
}
