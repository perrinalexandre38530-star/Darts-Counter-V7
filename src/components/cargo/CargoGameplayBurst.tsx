import React from "react";
import { cargoEventPresentation } from "../../lib/gameEngines/cargoEngine";
import {
  cargoArtLibrary,
  getCargoContractArt,
  getCargoStageBadge,
  getCargoSupportArt,
} from "./cargoArt";

export type CargoGameplayBurstTone =
  | "success"
  | "danger"
  | "warning"
  | "secure"
  | "parcel"
  | "route"
  | "convoy"
  | "rush";

export type CargoGameplayBurstData = {
  id: string;
  type: string;
  title: string;
  label: string;
  icon: string;
  color: string;
  tone: CargoGameplayBurstTone;
  priority: number;
  art: string;
  kicker?: string;
};

const BURST_RANK: Record<string, number> = {
  perfect_load: 120,
  overload: 115,
  series_lost: 110,
  contract_expired: 108,
  contract_complete: 104,
  free_load_complete: 101,
  parcel_delivery: 100,
  route_stage: 98,
  convoy_handoff: 97,
  dbull_protect: 94,
  dbull_validate: 93,
  bull_secure: 92,
  series_secure: 88,
  bull_joker: 80,
};

function findContract(event: any, previousState: any, nextState: any) {
  const id = event?.contractId;
  if (!id) return null;
  return (
    previousState?.contracts?.find((contract: any) => String(contract.id) === String(id)) ||
    nextState?.contracts?.find((contract: any) => String(contract.id) === String(id)) ||
    null
  );
}

function classifyEvent(event: any, previousState: any, nextState: any) {
  const presentation = cargoEventPresentation(event);
  const contract = findContract(event, previousState, nextState);
  const label = String(event?.label || presentation.title || "CARGO");
  const lower = label.toLowerCase();

  let title = presentation.title;
  let tone: CargoGameplayBurstTone = "success";
  let art = getCargoSupportArt({
    parcel: nextState?.config?.variant === "parcel_delivery",
    stage: "LOADED",
  });
  let kicker = "OPÉRATION CARGO";

  switch (event?.type) {
    case "perfect_load":
      title = "CHARGEMENT PARFAIT";
      tone = "success";
      art = getCargoStageBadge("FULL");
      kicker = "OBJECTIF EXACT";
      break;
    case "overload":
      title = "SURCHARGE";
      tone = "danger";
      art = cargoArtLibrary.chargementEnCours;
      kicker = "ZONE ROUGE";
      break;
    case "series_lost":
      title = lower.includes("fragile") ? "FRAGILE CASSÉ" : "CHARGE PERDUE";
      tone = "danger";
      art = lower.includes("fragile") ? cargoArtLibrary.contratFragile : cargoArtLibrary.paletteLogistique;
      kicker = lower.includes("fragile") ? "INCIDENT FRAGILE" : "RUPTURE DE CHARGEMENT";
      break;
    case "contract_expired":
      title = "EXPRESS EXPIRÉ";
      tone = "danger";
      art = cargoArtLibrary.contratExpress;
      kicker = "DÉLAI DÉPASSÉ";
      break;
    case "contract_complete":
      if (contract?.fragile) {
        title = "FRAGILE SÉCURISÉ";
        tone = "secure";
        art = cargoArtLibrary.contratFragile;
        kicker = "MANUTENTION RÉUSSIE";
      } else if (contract?.urgent) {
        title = "EXPRESS LIVRÉ";
        tone = "rush";
        art = cargoArtLibrary.contratExpress;
        kicker = "MISSION URGENTE";
      } else {
        title = "CONTRAT CHARGÉ";
        tone = "success";
        art = getCargoContractArt(contract);
        kicker = "CONTRAT TERMINÉ";
      }
      break;
    case "free_load_complete":
      title = "PALETTE CHARGÉE";
      tone = "success";
      art = cargoArtLibrary.paletteLogistique;
      kicker = "CHARGEMENT VALIDÉ";
      break;
    case "parcel_delivery":
      title = "COLIS LIVRÉS";
      tone = "parcel";
      art = cargoArtLibrary.colisCargo;
      kicker = "TOURNÉE DE LIVRAISON";
      break;
    case "route_stage":
      title = "ÉTAPE ATTEINTE";
      tone = "route";
      art = cargoArtLibrary.chargementEnCours;
      kicker = "LONG HAUL";
      break;
    case "convoy_handoff":
      title = "RELAIS CONVOI";
      tone = "convoy";
      art = cargoArtLibrary.paletteLogistique;
      kicker = "TRANSMISSION D'ÉQUIPE";
      break;
    case "dbull_protect":
      title = "PALETTE PROTÉGÉE";
      tone = "secure";
      art = nextState?.config?.variant === "fragile_cargo"
        ? cargoArtLibrary.contratFragile
        : cargoArtLibrary.paletteLogistique;
      kicker = "PROTECTION DBULL";
      break;
    case "dbull_validate":
      title = "LIVRAISON VALIDÉE";
      tone = "secure";
      art = nextState?.config?.variant === "parcel_delivery"
        ? cargoArtLibrary.colisCargo
        : cargoArtLibrary.paletteLogistique;
      kicker = "VALIDATION DBULL";
      break;
    case "bull_secure":
    case "series_secure":
      title = event?.type === "bull_secure" ? "CHARGE SÉCURISÉE" : "CHARGE PARTIELLE SÉCURISÉE";
      tone = "secure";
      art = cargoArtLibrary.paletteLogistique;
      kicker = "MISE EN SÉCURITÉ";
      break;
    case "bull_joker":
      title = "JOKER CARGO";
      tone = "warning";
      art = cargoArtLibrary.colisCargo;
      kicker = "BULL JOKER";
      break;
    default:
      tone = "success";
      break;
  }

  return {
    id: `${Date.now()}-${event?.type || "cargo"}-${Math.random().toString(36).slice(2, 7)}`,
    type: String(event?.type || "cargo"),
    title,
    label,
    icon: presentation.icon,
    color: presentation.color,
    tone,
    priority: presentation.priority,
    art,
    kicker,
  } satisfies CargoGameplayBurstData;
}

export function buildCargoGameplayBurst(
  events: any[],
  previousState?: any,
  nextState?: any,
): CargoGameplayBurstData | null {
  const candidates = (Array.isArray(events) ? events : [])
    .filter((event: any) => BURST_RANK[event?.type] != null)
    .sort((a: any, b: any) => (BURST_RANK[b?.type] || 0) - (BURST_RANK[a?.type] || 0));
  if (!candidates.length) return null;
  return classifyEvent(candidates[0], previousState, nextState);
}

export default function CargoGameplayBurst({ burst }: { burst: CargoGameplayBurstData }) {
  return <div
    className={`cargo-gameplay-burst cargo-burst-${burst.tone}`}
    role="status"
    aria-live="assertive"
    aria-atomic="true"
  >
    <div className="cargo-gameplay-burst-flash" aria-hidden />
    <div className="cargo-gameplay-burst-card">
      <div className="cargo-gameplay-burst-art-wrap" aria-hidden>
        <span className="cargo-gameplay-burst-ring" />
        <img className="cargo-gameplay-burst-art" src={burst.art} alt="" />
        <span className="cargo-gameplay-burst-icon">{burst.icon}</span>
      </div>
      <div className="cargo-gameplay-burst-copy">
        <div className="cargo-gameplay-burst-kicker">{burst.kicker}</div>
        <div className="cargo-gameplay-burst-title">{burst.title}</div>
        <div className="cargo-gameplay-burst-label">{burst.label}</div>
      </div>
    </div>
    <div className="cargo-gameplay-burst-track" aria-hidden>
      <span />
    </div>
  </div>;
}
