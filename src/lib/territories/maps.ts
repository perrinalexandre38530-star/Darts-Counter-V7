// =============================================================
// src/lib/territories/maps.ts
// TERRITORIES — maps registry (pays/monde)
// - Chaque pays = 1 map = 1 ticker (tu as les assets pour chaque pays)
// - `tickerId` sert à sélectionner l'image : ticker_territories_<tickerId>.png
// =============================================================

export type TerritoryZone = {
  id: string;        // ex: "FR-75", "US-CA", "WORLD-EU"
  label: string;     // ex: "Paris", "California", "Europe"
  short?: string;    // optionnel (stats compactes)
  weight?: number;   // optionnel (équilibrage futur)
};

export type TerritoryMap = {
  id: string; // "FR", "EN", "IT", ... "WORLD"
  name: string;
  kind: "concrete" | "abstract";
  tickerId: string; // "fr", "en", "it", "de", "es", "us", "cn", "au", "jp", "ru", "world"
  zones: TerritoryZone[];
};

// -------------------------------------------------------------
// FRANCE — (départements)
// NOTE: dataset minimal ici; remplace/complète avec ton dataset complet si besoin.
// -------------------------------------------------------------
export const MAP_FR: TerritoryMap = {
  id: "FR",
  name: "France",
  kind: "concrete",
  tickerId: "fr",
  zones: [
    { id: "FR-75", label: "Paris", short: "75" },
    { id: "FR-69", label: "Rhône", short: "69" },
    { id: "FR-13", label: "Bouches-du-Rhône", short: "13" },
    { id: "FR-59", label: "Nord", short: "59" },
    { id: "FR-33", label: "Gironde", short: "33" },
    { id: "FR-44", label: "Loire-Atlantique", short: "44" },
  ],
};

// -------------------------------------------------------------
// ENGLAND
// -------------------------------------------------------------
export const MAP_EN: TerritoryMap = {
  id: "EN",
  name: "England",
  kind: "concrete",
  tickerId: "en",
  zones: [
    { id: "EN-LND", label: "Greater London", short: "LND" },
    { id: "EN-KENT", label: "Kent", short: "KENT" },
    { id: "EN-ESS", label: "Essex", short: "ESS" },
    { id: "EN-MAN", label: "Greater Manchester", short: "MAN" },
    { id: "EN-WMD", label: "West Midlands", short: "WMD" },
    { id: "EN-WYK", label: "West Yorkshire", short: "WYK" },
  ],
};

// -------------------------------------------------------------
// ITALY
// -------------------------------------------------------------
export const MAP_IT: TerritoryMap = {
  id: "IT",
  name: "Italy",
  kind: "concrete",
  tickerId: "it",
  zones: [
    { id: "IT-LOM", label: "Lombardia", short: "LOM" },
    { id: "IT-LAZ", label: "Lazio", short: "LAZ" },
    { id: "IT-CAM", label: "Campania", short: "CAM" },
    { id: "IT-SIC", label: "Sicilia", short: "SIC" },
    { id: "IT-VEN", label: "Veneto", short: "VEN" },
    { id: "IT-TOS", label: "Toscana", short: "TOS" },
  ],
};

// -------------------------------------------------------------
// GERMANY
// -------------------------------------------------------------
export const MAP_DE: TerritoryMap = {
  id: "DE",
  name: "Germany",
  kind: "concrete",
  tickerId: "de",
  zones: [
    { id: "DE-BY", label: "Bavaria", short: "BY" },
    { id: "DE-BW", label: "Baden-Württemberg", short: "BW" },
    { id: "DE-NW", label: "North Rhine-Westphalia", short: "NW" },
    { id: "DE-HE", label: "Hesse", short: "HE" },
    { id: "DE-BE", label: "Berlin", short: "BE" },
    { id: "DE-HH", label: "Hamburg", short: "HH" },
  ],
};

// -------------------------------------------------------------
// SPAIN
// -------------------------------------------------------------
export const MAP_ES: TerritoryMap = {
  id: "ES",
  name: "Spain",
  kind: "concrete",
  tickerId: "es",
  zones: [
    { id: "ES-MD", label: "Madrid", short: "MD" },
    { id: "ES-CT", label: "Catalonia", short: "CT" },
    { id: "ES-AN", label: "Andalusia", short: "AN" },
    { id: "ES-VC", label: "Valencian Community", short: "VC" },
    { id: "ES-GA", label: "Galicia", short: "GA" },
    { id: "ES-PV", label: "Basque Country", short: "PV" },
  ],
};

// -------------------------------------------------------------
// USA
// -------------------------------------------------------------
export const MAP_US: TerritoryMap = {
  id: "US",
  name: "United States",
  kind: "concrete",
  tickerId: "us",
  zones: [
    { id: "US-CA", label: "California", short: "CA" },
    { id: "US-TX", label: "Texas", short: "TX" },
    { id: "US-FL", label: "Florida", short: "FL" },
    { id: "US-NY", label: "New York", short: "NY" },
    { id: "US-IL", label: "Illinois", short: "IL" },
    { id: "US-PA", label: "Pennsylvania", short: "PA" },
  ],
};

// -------------------------------------------------------------
// CHINA
// -------------------------------------------------------------
export const MAP_CN: TerritoryMap = {
  id: "CN",
  name: "China",
  kind: "concrete",
  tickerId: "cn",
  zones: [
    { id: "CN-BJ", label: "Beijing", short: "BJ" },
    { id: "CN-SH", label: "Shanghai", short: "SH" },
    { id: "CN-GD", label: "Guangdong", short: "GD" },
    { id: "CN-ZJ", label: "Zhejiang", short: "ZJ" },
    { id: "CN-JS", label: "Jiangsu", short: "JS" },
    { id: "CN-SC", label: "Sichuan", short: "SC" },
  ],
};

// -------------------------------------------------------------
// AUSTRALIA
// -------------------------------------------------------------
export const MAP_AU: TerritoryMap = {
  id: "AU",
  name: "Australia",
  kind: "concrete",
  tickerId: "au",
  zones: [
    { id: "AU-NSW", label: "New South Wales", short: "NSW" },
    { id: "AU-VIC", label: "Victoria", short: "VIC" },
    { id: "AU-QLD", label: "Queensland", short: "QLD" },
    { id: "AU-WA", label: "Western Australia", short: "WA" },
    { id: "AU-SA", label: "South Australia", short: "SA" },
    { id: "AU-TAS", label: "Tasmania", short: "TAS" },
  ],
};

// -------------------------------------------------------------
// JAPAN
// -------------------------------------------------------------
export const MAP_JP: TerritoryMap = {
  id: "JP",
  name: "Japan",
  kind: "concrete",
  tickerId: "jp",
  zones: [
    { id: "JP-HKD", label: "Hokkaidō", short: "HKD" },
    { id: "JP-KAN", label: "Kantō", short: "KAN" },
    { id: "JP-CHU", label: "Chūbu", short: "CHU" },
    { id: "JP-KIN", label: "Kinki", short: "KIN" },
    { id: "JP-KYU", label: "Kyūshū", short: "KYU" },
  ],
};

// -------------------------------------------------------------
// RUSSIA
// -------------------------------------------------------------
export const MAP_RU: TerritoryMap = {
  id: "RU",
  name: "Russia",
  kind: "concrete",
  tickerId: "ru",
  zones: [
    { id: "RU-CFD", label: "Central", short: "C" },
    { id: "RU-NWFD", label: "Northwestern", short: "NW" },
    { id: "RU-SIBFD", label: "Siberian", short: "SIB" },
    { id: "RU-FEFD", label: "Far Eastern", short: "FE" },
  ],
};

// -------------------------------------------------------------
// WORLD (fallback abstrait)
// -------------------------------------------------------------
export const MAP_WORLD: TerritoryMap = {
  id: "WORLD",
  name: "World",
  kind: "abstract",
  tickerId: "world",
  zones: [
    { id: "WORLD-EU", label: "Europe", short: "EU" },
    { id: "WORLD-AS", label: "Asia", short: "AS" },
    { id: "WORLD-NA", label: "North America", short: "NA" },
    { id: "WORLD-SA", label: "South America", short: "SA" },
    { id: "WORLD-AF", label: "Africa", short: "AF" },
    { id: "WORLD-OC", label: "Oceania", short: "OC" },
  ],
};

export const TERRITORY_MAPS: Record<string, TerritoryMap> = {
  FR: MAP_FR,
  EN: MAP_EN,
  IT: MAP_IT,
  DE: MAP_DE,
  ES: MAP_ES,
  US: MAP_US,
  CN: MAP_CN,
  AU: MAP_AU,
  JP: MAP_JP,
  RU: MAP_RU,
  WORLD: MAP_WORLD,
};
