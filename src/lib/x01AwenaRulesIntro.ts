export const X01_AWENA_RULES_INTRO_SEEN_KEY = "dc_x01_awena_rules_intro_seen_v1";

export function hasSeenX01AwenaRulesIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(X01_AWENA_RULES_INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markX01AwenaRulesIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(X01_AWENA_RULES_INTRO_SEEN_KEY, "1");
  } catch {}
}
