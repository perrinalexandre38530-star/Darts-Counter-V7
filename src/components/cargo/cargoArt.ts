import chargementComplet from '../../assets/cargo/chargement-complet.png';
import chargementEnCours from '../../assets/cargo/chargement-en-cours.png';
import paletteLogistique from '../../assets/cargo/palette-logistique.png';
import colisCargo from '../../assets/cargo/colis-cargo.png';
import contratExpress from '../../assets/cargo/contrat-express.png';
import contratFragile from '../../assets/cargo/contrat-fragile.png';
import contratOutillage from '../../assets/cargo/contrat-outillage.png';

export type CargoArtStage = 'EMPTY' | 'LOADING' | 'PALLET_READY' | 'LOADED' | 'FULL';

export function getCargoStageBadge(stage?: CargoArtStage | null) {
  if (stage === 'FULL') return chargementComplet;
  return chargementEnCours;
}

export function getCargoSupportArt(input: { parcel?: boolean; stage?: CargoArtStage | null }) {
  if (input?.parcel) return colisCargo;
  if (input?.stage === 'PALLET_READY' || input?.stage === 'LOADED' || input?.stage === 'FULL') return paletteLogistique;
  return colisCargo;
}

export function getCargoContractArt(contract?: any) {
  if (!contract) return contratOutillage;
  if (contract.fragile) return contratFragile;
  if (contract.urgent) return contratExpress;
  const raw = `${contract.label || ''} ${contract.cargoType || ''} ${contract.icon || ''}`.toLowerCase();
  if (raw.includes('fragile') || raw.includes('verre')) return contratFragile;
  if (raw.includes('express') || raw.includes('urgent')) return contratExpress;
  return contratOutillage;
}

export function getCargoHeroArt(input: { stage?: CargoArtStage | null; parcel?: boolean; activeContract?: any }) {
  if (input?.activeContract) return getCargoContractArt(input.activeContract);
  if (input?.stage === 'FULL') return chargementComplet;
  if (input?.parcel) return colisCargo;
  return paletteLogistique;
}

export const cargoArtLibrary = {
  chargementComplet,
  chargementEnCours,
  paletteLogistique,
  colisCargo,
  contratExpress,
  contratFragile,
  contratOutillage,
};
