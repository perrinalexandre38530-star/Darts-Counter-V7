/**
 * Catalogue commun du sélecteur d’avatars MSS. Ces URL sont celles utilisées
 * dans le sélecteur de profils, sans copies ni fichiers d'avatars supplémentaires.
 * Seule la catégorie « common » est utilisée pour les joueurs temporaires afin
 * que l’attribution soit indépendante de la langue sélectionnée.
 */
export const MSS_COMMON_PREBUILT_AVATARS: readonly string[] = Array.from(
  { length: 141 }, (_, i) => i + 1,
).filter((n) => n !== 137).map(
  (n) => `/images/prebuilt-avatars/common/avatar-common-${String(n).padStart(3, "0")}.webp`,
);

export const MSS_FR_PREBUILT_AVATARS: readonly string[] = Array.from(
  { length: 73 }, (_, i) => `/images/prebuilt-avatars/fr/avatar-fr-${String(i + 1).padStart(3, "0")}.webp`,
);

export const MSS_EN_PREBUILT_AVATARS: readonly string[] = Array.from(
  { length: 73 }, (_, i) => `/images/prebuilt-avatars/en/avatar-en-${String(i + 1).padStart(3, "0")}.webp`,
);
