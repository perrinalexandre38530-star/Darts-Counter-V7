/**
 * Lecture non destructive des identifiants CHASE / SPLIT SCORE dans History V4.
 * Une variante doit appartenir à la bonne famille de jeu : un titre voisin
 * (notamment STEEPLECHASE) n'est jamais une preuve de variante CHASE.
 */
export type DartsFamilyHistoryKey = "five_lives" | "chase" | "halve_it" | "split_score" | null;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function keyOf(value: unknown): string {
  return String(value ?? "")
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const FIVE = new Set(["fivelives", "les5vies", "5vies", "cinqvies"]);
const HALF = new Set(["halveit", "halfeit", "halfit"]);
const CHASE = "chase";
const SPLIT = "splitscore";

export function dartsFamilyHistoryKey(record: unknown): DartsFamilyHistoryKey {
  const e = asObject(record);
  const summary = asObject(e.summary);
  const payload = asObject(e.payload);
  const payloadSummary = asObject(payload.summary);
  const config = asObject(e.config);
  const payloadConfig = asObject(payload.config);
  const decoded = asObject(e.decoded);
  const decodedConfig = asObject(decoded.config);
  const game = asObject(e.game);
  const resume = asObject(e.resume);
  const resumeConfig = asObject(resume.config);
  const resumeState = asObject(resume.state);
  const payloadResumeConfig = asObject(payload.resumeConfig);
  const payloadStateResumeConfig = asObject(asObject(payload.state).resumeConfig);
  const summaryConfig = asObject(summary.config);
  const summaryGame = asObject(summary.game);

  // Ne pas confondre le champ "variant" d'autres moteurs avec "variantId".
  const parents = [
    e.kind, e.mode, e.modeId, e.gameId, game.mode, game.modeId, game.gameId,
    summary.kind, summary.mode, summary.modeId, summaryGame.mode, payload.kind, payload.mode, payload.modeId,
    payloadSummary.kind, payloadSummary.mode,
    config.mode, payloadConfig.mode, summaryConfig.mode, decoded.kind, decoded.mode,
    decodedConfig.mode, resumeConfig.mode,
  ].map(keyOf).filter(Boolean);
  const isFive = parents.some((id) => FIVE.has(id));
  const isHalf = parents.some((id) => HALF.has(id));
  const directChase = parents.includes(CHASE);
  const directSplit = parents.includes(SPLIT);

  const variants = [
    e.variantId, summary.variantId, summaryConfig.variantId, summaryGame.variantId, payload.variantId,
    payloadSummary.variantId, config.variantId, payloadConfig.variantId,
    decoded.variantId, decodedConfig.variantId, resumeConfig.variantId,
    resumeState.variantId, payloadResumeConfig.variantId, payloadStateResumeConfig.variantId,
    game.variantId,
  ].map(keyOf).filter(Boolean);

  // L'identité de famille prévaut, pour ne jamais contaminer un autre jeu.
  if (isFive && !isHalf) return variants.includes(CHASE) || directChase ? "chase" : "five_lives";
  if (isHalf && !isFive) return variants.includes(SPLIT) || directSplit ? "split_score" : "halve_it";
  if (!isFive && !isHalf) {
    // Compatibilité éventuelle des anciennes entrées où le mode était la variante.
    if (directChase && !parents.some((id) => id === "steeplechase")) return "chase";
    if (directSplit) return "split_score";
  }
  return null;
}
