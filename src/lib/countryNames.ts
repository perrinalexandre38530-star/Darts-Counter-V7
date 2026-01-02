// ============================================================
// src/lib/countryNames.ts
// Map FR+EN → ISO2 + conversion ISO2 → emoji 🇫🇷
// Utilisé pour FriendsPage, Profiles, Stats, Online, etc.
// ============================================================

/**
 * 1) MAP NOM → CODE ISO2
 * - FR + EN
 * - normalisés : espaces, accents, apostrophes retirés
 * - permettent : "france", "royaume-uni", "éthiopie", "southafrica", etc.
 */
export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    // --- EUROPE ---
    france: "FR",
    belgique: "BE",
    belgium: "BE",
    suisse: "CH",
    switzerland: "CH",
    espagne: "ES",
    spain: "ES",
    italie: "IT",
    italy: "IT",
    allemagne: "DE",
    germany: "DE",
    portugal: "PT",
    paysbas: "NL",
    "pays-bas": "NL",
    netherlands: "NL",
    hollande: "NL",
    autriche: "AT",
    austria: "AT",
    irlande: "IE",
    ireland: "IE",
    ecosse: "GB",
    scotland: "GB",
    angleterre: "GB",
    "royaumeuni": "GB",
    "royaume-uni": "GB",
    uk: "GB",
    suede: "SE",
    sweden: "SE",
    norvege: "NO",
    norway: "NO",
    danemark: "DK",
    denmark: "DK",
    finlande: "FI",
    finland: "FI",
    islande: "IS",
    iceland: "IS",
    pologne: "PL",
    poland: "PL",
    tchequie: "CZ",
    "républiquetcheque": "CZ",
    czechrepublic: "CZ",
    hongrie: "HU",
    hungary: "HU",
    grece: "GR",
    greece: "GR",
    roumanie: "RO",
    romania: "RO",
    bulgarie: "BG",
    bulgaria: "BG",
    croatie: "HR",
    croatia: "HR",
    serbie: "RS",
    serbia: "RS",
    ukraine: "UA",
    russie: "RU",
    russia: "RU",
  
    // --- AMÉRIQUES ---
    usa: "US",
    "etatsunis": "US",
    "étatsunis": "US",
    "états-unis": "US",
    unitedstates: "US",
    canada: "CA",
    mexique: "MX",
    mexico: "MX",
    bresil: "BR",
    "brésil": "BR",
    brazil: "BR",
    argentine: "AR",
    argentina: "AR",
    chili: "CL",
    chile: "CL",
    colombie: "CO",
    colombia: "CO",
    perou: "PE",
    "pérou": "PE",
    peru: "PE",
  
    // --- AFRIQUE ---
    maroc: "MA",
    morocco: "MA",
    algerie: "DZ",
    "algérie": "DZ",
    algeria: "DZ",
    tunisie: "TN",
    tunisia: "TN",
    senegal: "SN",
    "sénégal": "SN",
    coteivoire: "CI",
    "cote-d-ivoire": "CI",
    "côteivoire": "CI",
    "côte-d’ivoire": "CI",
    nigeria: "NG",
    cameroun: "CM",
    cameroon: "CM",
    afriquedusud: "ZA",
    "afrique-du-sud": "ZA",
    southafrica: "ZA",
    egypte: "EG",
    egypt: "EG",
    kenya: "KE",
    ethiopie: "ET",
    ethiopia: "ET",
    ghana: "GH",
    tanzanie: "TZ",
    tanzania: "TZ",
  
    // --- ASIE ---
    chine: "CN",
    china: "CN",
    japon: "JP",
    japan: "JP",
    coreedusud: "KR",
    "corée-du-sud": "KR",
    southkorea: "KR",
    coreedunord: "KP",
    "corée-du-nord": "KP",
    northkorea: "KP",
    inde: "IN",
    india: "IN",
    indonesie: "ID",
    "indonésie": "ID",
    indonesia: "ID",
    thailande: "TH",
    thaïlande: "TH",
    thailand: "TH",
    vietnam: "VN",
    philippines: "PH",
    malaisie: "MY",
    malaysia: "MY",
    singapour: "SG",
    singapore: "SG",
  
    // --- OCÉANIE ---
    australie: "AU",
    australia: "AU",
    nouvellezelande: "NZ",
    "nouvelle-zélande": "NZ",
    newzealand: "NZ",
  
    // --- MOYEN ORIENT ---
    israel: "IL",
    "israël": "IL",
    palestine: "PS",
    arabiesaoudite: "SA",
    "arabie-saoudite": "SA",
    saudiarabia: "SA",
    qatar: "QA",
    emiratsarabesunis: "AE",
    "émirats-arabes-unis": "AE",
    uae: "AE",
    turquie: "TR",
    turkey: "TR",
  };
  
  
  /**
   * 2) Convertit CODE ISO2 → emoji drapeau 🇫🇷
   */
  export function isoToFlag(code: string): string {
    if (!code || code.length !== 2) return "";
    const A = 0x1f1e6;
    return Array.from(code.toUpperCase())
      .map((c) => String.fromCodePoint(A + (c.charCodeAt(0) - 65)))
      .join("");
  }
  
  /**
   * 3) Détecte si un input est déjà un emoji drapeau
   */
  function isFlagEmoji(str: string): boolean {
    const arr = Array.from(str);
    if (arr.length !== 2) return false;
    const cp0 = arr[0].codePointAt(0) ?? 0;
    const cp1 = arr[1].codePointAt(0) ?? 0;
    return (
      cp0 >= 0x1f1e6 &&
      cp0 <= 0x1f1ff &&
      cp1 >= 0x1f1e6 &&
      cp1 <= 0x1f1ff
    );
  }
  
  /**
   * 4) Normalise un nom : enlève espaces, accents, tirets
   */
  function normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // accents
      .replace(/[^a-z0-9]/g, ""); // tout retirer sauf lettres/chiffres
  }
  
  /**
   * 5) Fonction principale
   * - Accepte : 🇫🇷 / FR / fr / France / france / FRANCE / etc.
   * - Renvoie : "🇫🇷"
   */
  export function getCountryFlag(input: string): string {
    if (!input) return "";
  
    const trimmed = input.trim();
  
    // CAS 1 : déjà un drapeau emoji
    if (isFlagEmoji(trimmed)) return trimmed;
  
    // CAS 2 : ISO2 direct
    if (trimmed.length === 2) {
      return isoToFlag(trimmed);
    }
  
    // CAS 3 : nom de pays
    const key = normalize(trimmed);
    const iso2 = COUNTRY_NAME_TO_CODE[key];
  
    if (!iso2) return "";
  
    return isoToFlag(iso2);
  }
  