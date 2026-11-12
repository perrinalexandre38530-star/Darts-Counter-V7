/** Bibliothèque locale des grilles MON CAPITAL. Aucun modèle officiel n'est modifié. */
import {
  CAPITAL_CONTRACT_META,
  CAPITAL_GRID_PRESETS,
  canonicalCapitalGridPreset,
  type CapitalContractId,
  type CapitalGridPresetId,
} from "./capitalGame";

export const CAPITAL_SAVED_VARIANTS_KEY = "mss_capital_named_variants_v1";

export type CapitalSavedVariant = {
  id: string;
  name: string;
  basePreset: CapitalGridPresetId;
  contracts: CapitalContractId[]; // contrats hors CAP, dans l'ordre choisi
  includeCapital: boolean;
  maxCustomContracts: number;
  exactTarget: number;
  shanghaiBonus: number;
  packetAllowMultipliers: boolean;
  failDivideBy2: boolean;
  startingCapital: number;
  victoryMode: "best_after_contracts" | "first_to_target";
  targetScore: number;
  tieBreaker: "none" | "last_contract_total";
  committeeSpecialContract?: CapitalContractId;
  createdAt: number;
  updatedAt: number;
};

const between = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value))) : fallback;

const validContract = (id: unknown): id is CapitalContractId =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(CAPITAL_CONTRACT_META, id);

/** Lecture tolérante aux anciennes données, sans détruire ni modifier la sauvegarde. */
export function normalizeCapitalSavedVariant(value: unknown): CapitalSavedVariant | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 48) : "";
  const id = typeof input.id === "string" ? input.id.slice(0, 90) : "";
  if (!id || !name || !Array.isArray(input.contracts)) return null;
  const contracts = [...new Set(input.contracts.filter(validContract).filter((id) => id !== "capital"))].slice(0, 30);
  if (contracts.length === 0) return null;
  const basePreset = typeof input.basePreset === "string" &&
    Object.prototype.hasOwnProperty.call(CAPITAL_GRID_PRESETS, input.basePreset)
    ? canonicalCapitalGridPreset(input.basePreset as CapitalGridPresetId) : "clubs15";
  return {
    id, name, basePreset, contracts,
    includeCapital: input.includeCapital !== false,
    maxCustomContracts: Math.max(contracts.length, between(input.maxCustomContracts, 1, 30, 30)),
    exactTarget: between(input.exactTarget, 1, 180, 42),
    shanghaiBonus: between(input.shanghaiBonus, 0, 500, 0),
    packetAllowMultipliers: input.packetAllowMultipliers === true,
    failDivideBy2: input.failDivideBy2 !== false,
    startingCapital: between(input.startingCapital, 0, 5000, 301),
    victoryMode: input.victoryMode === "first_to_target" ? "first_to_target" : "best_after_contracts",
    targetScore: between(input.targetScore, 50, 5000, 700),
    tieBreaker: input.tieBreaker === "none" ? "none" : "last_contract_total",
    committeeSpecialContract: validContract(input.committeeSpecialContract) ? input.committeeSpecialContract : undefined,
    createdAt: between(input.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    updatedAt: between(input.updatedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}

/** Prend un stockage en argument pour tester sans navigateur. */
export function loadCapitalSavedVariants(storage?: Pick<Storage, "getItem"> | null): CapitalSavedVariant[] {
  try {
    const s = storage === undefined ? (typeof localStorage !== "undefined" ? localStorage : null) : storage;
    const payload = s?.getItem(CAPITAL_SAVED_VARIANTS_KEY);
    if (!payload) return [];
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    const names = new Set<string>();
    return parsed.map(normalizeCapitalSavedVariant).filter((v): v is CapitalSavedVariant => {
      if (!v || ids.has(v.id) || names.has(v.name.toLocaleLowerCase("fr"))) return false;
      ids.add(v.id);
      names.add(v.name.toLocaleLowerCase("fr"));
      return true;
    }).slice(0, 100);
  } catch { return []; }
}

/** L'écriture peut échouer (quota, stockage désactivé) : l'UI doit le signaler. */
export function persistCapitalSavedVariants(items: CapitalSavedVariant[], storage?: Pick<Storage, "setItem"> | null): boolean {
  try {
    const s = storage === undefined ? (typeof localStorage !== "undefined" ? localStorage : null) : storage;
    if (!s) return false;
    const normalized = items.map(normalizeCapitalSavedVariant);
    if (normalized.some((item) => !item) || normalized.length > 100) return false;
    const ids = new Set(normalized.map((item) => item!.id));
    const names = new Set(normalized.map((item) => item!.name.toLocaleLowerCase("fr")));
    if (ids.size !== normalized.length || names.size !== normalized.length) return false;
    s.setItem(CAPITAL_SAVED_VARIANTS_KEY, JSON.stringify(normalized));
    return true;
  } catch { return false; }
}
