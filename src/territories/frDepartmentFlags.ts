// Drapeaux des départements métropolitains utilisés par la carte France.
// La plupart des départements n'ont pas de drapeau juridiquement officiel :
// priorité aux drapeaux institutionnels/logotypiques, puis aux variantes traditionnelles/proposées.
export type FrenchDepartmentFlagStatus = "official" | "institutional" | "traditional" | "proposed";

type FrenchDepartmentFlagMeta = {
  name: string;
  file: string;
  host?: "commons" | "frwiki";
  status: FrenchDepartmentFlagStatus;
};

export const FRENCH_DEPARTMENT_FLAGS: Record<string, FrenchDepartmentFlagMeta> = {
  "01": { name: "Ain", file: "Flag_of_the_Department_of_Ain.svg", host: "commons", status: "institutional" },
  "02": { name: "Aisne", file: "Flag_of_the_Department_of_Aisne.svg", host: "commons", status: "institutional" },
  "03": { name: "Allier", file: "Flag_of_the_Department_of_Allier.svg", host: "commons", status: "institutional" },
  "04": { name: "Alpes-de-Haute-Provence", file: "Flag_of_the_Department_of_Alpes-de-Haute-Provence.svg", host: "commons", status: "institutional" },
  "05": { name: "Hautes-Alpes", file: "Flag_of_Hautes-Alpes.svg", host: "commons", status: "traditional" },
  "06": { name: "Alpes-Maritimes", file: "Flag_of_the_Department_of_Alpes-Maritimes.svg", host: "commons", status: "institutional" },
  "07": { name: "Ardèche", file: "Flag_of_the_Department_of_Ardèche.svg", host: "commons", status: "institutional" },
  "08": { name: "Ardennes", file: "Flag_of_the_Department_of_Ardennes.svg", host: "commons", status: "institutional" },
  "09": { name: "Ariège", file: "Flag_of_the_Department_of_Ariège.svg", host: "commons", status: "institutional" },
  "10": { name: "Aube", file: "Flag_of_the_Department_of_Aube.svg", host: "commons", status: "institutional" },
  "11": { name: "Aude", file: "Flag_of_the_Department_of_Aude.svg", host: "commons", status: "institutional" },
  "12": { name: "Aveyron", file: "Flag_of_Rouergue.svg", host: "commons", status: "traditional" },
  "13": { name: "Bouches-du-Rhône", file: "Flag_of_the_Department_of_Bouches-du-Rhône.svg", host: "commons", status: "institutional" },
  "14": { name: "Calvados", file: "Flag_of_the_Department_of_Calvados.svg", host: "commons", status: "institutional" },
  "15": { name: "Cantal", file: "Flag_of_the_Department_of_Cantal.svg", host: "commons", status: "institutional" },
  "16": { name: "Charente", file: "Flag_of_the_Department_of_Charente_(Variant_2).svg", host: "commons", status: "institutional" },
  "17": { name: "Charente-Maritime", file: "Flag_of_the_Department_of_Charente-Maritime.svg", host: "commons", status: "institutional" },
  "18": { name: "Cher", file: "Drapeau_fr_département_Cher.svg", host: "commons", status: "traditional" },
  "19": { name: "Corrèze", file: "Flag_of_the_Department_of_Corrèze.svg", host: "commons", status: "institutional" },
  "2A": { name: "Corse-du-Sud", file: "Logo_Corse_Sud_2015.svg", host: "frwiki", status: "institutional" },
  "2B": { name: "Haute-Corse", file: "Logo_Haute_Corse_2011.svg", host: "frwiki", status: "institutional" },
  "21": { name: "Côte-d'Or", file: "Flag_of_the_Department_of_Côte-d'Or.svg", host: "commons", status: "institutional" },
  "22": { name: "Côtes-d’Armor", file: "Flag_of_the_Department_of_Côtes-d'Armor.svg", host: "commons", status: "institutional" },
  "23": { name: "Creuse", file: "Creuse_(23)_logo_2017.svg", host: "frwiki", status: "institutional" },
  "24": { name: "Dordogne", file: "Flag_of_the_Department_of_Dordogne.svg", host: "commons", status: "institutional" },
  "25": { name: "Doubs", file: "Flag_of_the_Department_of_Doubs.svg", host: "commons", status: "institutional" },
  "26": { name: "Drôme", file: "Flag_of_the_Department_of_Drôme.svg", host: "commons", status: "institutional" },
  "27": { name: "Eure", file: "Flag_of_the_Department_of_Eure.svg", host: "commons", status: "institutional" },
  "28": { name: "Eure-et-Loir", file: "Flag_of_the_Department_of_Eure-et-Loir.svg", host: "commons", status: "institutional" },
  "29": { name: "Finistère", file: "Flag_of_the_Department_of_Finistère.svg", host: "commons", status: "institutional" },
  "30": { name: "Gard", file: "Flag_of_the_Department_of_Gard.svg", host: "commons", status: "institutional" },
  "31": { name: "Haute-Garonne", file: "Flag_of_the_Department_of_Haute-Garonne.svg", host: "commons", status: "institutional" },
  "32": { name: "Gers", file: "Flag_of_the_Department_of_Gers.png", host: "commons", status: "institutional" },
  "33": { name: "Gironde", file: "Flag_of_the_Department_of_Gironde.svg", host: "commons", status: "institutional" },
  "34": { name: "Hérault", file: "Flag_of_the_Department_of_Hérault.svg", host: "commons", status: "institutional" },
  "35": { name: "Ille-et-Vilaine", file: "Flag_of_the_Department_of_Ille-et-Vilaine.svg", host: "commons", status: "institutional" },
  "36": { name: "Indre", file: "Drapeau_département_fr_Indre.svg", host: "commons", status: "traditional" },
  "37": { name: "Indre-et-Loire", file: "Drapeau_non-officiel_fr_département_Indre-et-Loire.svg", host: "commons", status: "proposed" },
  "38": { name: "Isère", file: "Drapeau_non-officiel_département_fr_Isère.svg", host: "commons", status: "proposed" },
  "39": { name: "Jura", file: "Flag_of_the_Department_of_Jura.svg", host: "commons", status: "institutional" },
  "40": { name: "Landes", file: "Drapeau_fr_département_Landes.svg", host: "commons", status: "traditional" },
  "41": { name: "Loir-et-Cher", file: "Drapeau_fr_département_Loir-et-Cher.svg", host: "commons", status: "traditional" },
  "42": { name: "Loire", file: "Flag_of_the_Department_of_Loire.svg", host: "commons", status: "institutional" },
  "43": { name: "Haute-Loire", file: "Drapeau_département_fr_Haute-Loire.svg", host: "commons", status: "traditional" },
  "44": { name: "Loire-Atlantique", file: "Flag_of_the_Department_of_Loire-Atlantique.svg", host: "commons", status: "institutional" },
  "45": { name: "Loiret", file: "Flag_of_the_Department_of_Loiret.svg", host: "commons", status: "institutional" },
  "46": { name: "Lot", file: "Flag_of_the_Department_of_Lot.svg", host: "commons", status: "institutional" },
  "47": { name: "Lot-et-Garonne", file: "Drapeau_fr_département_Lot-et-Garonne.svg", host: "commons", status: "traditional" },
  "48": { name: "Lozère", file: "Flag_of_the_Department_of_Lozère.svg", host: "commons", status: "institutional" },
  "49": { name: "Maine-et-Loire", file: "Flag_of_the_Department_of_Maine-et-Loire_(Variant_2).svg", host: "commons", status: "institutional" },
  "50": { name: "Manche", file: "Flag_of_the_Department_of_Manche.svg", host: "commons", status: "institutional" },
  "51": { name: "Marne", file: "Flag_of_the_Department_of_Marne.svg", host: "commons", status: "institutional" },
  "52": { name: "Haute-Marne", file: "Flag_of_the_Department_of_Haute-Marne.svg", host: "commons", status: "institutional" },
  "53": { name: "Mayenne", file: "Flag_of_the_Department_of_Mayenne.svg", host: "commons", status: "institutional" },
  "54": { name: "Meurthe-et-Moselle", file: "Drapeau_fr_département_Meurthe-et-Moselle.svg", host: "commons", status: "traditional" },
  "55": { name: "Meuse", file: "Flag_of_the_Department_of_Meuse.svg", host: "commons", status: "institutional" },
  "56": { name: "Morbihan", file: "Banniel_departamant_ar_Mor-Bihan_2022.svg", host: "commons", status: "institutional" },
  "57": { name: "Moselle", file: "Flag_of_the_Department_of_Moselle.svg", host: "commons", status: "institutional" },
  "58": { name: "Nièvre", file: "Flag_of_the_Department_of_Nièvre.svg", host: "commons", status: "institutional" },
  "59": { name: "Nord", file: "Flag_of_the_Department_of_Nord.svg", host: "commons", status: "institutional" },
  "60": { name: "Oise", file: "Flag_of_the_Department_of_Oise.svg", host: "commons", status: "institutional" },
  "61": { name: "Orne", file: "Flag_of_the_Department_of_Orne.svg", host: "commons", status: "institutional" },
  "62": { name: "Pas-de-Calais", file: "Flag_of_the_Department_of_Pas-de-Calais_(Variant_1).svg", host: "commons", status: "institutional" },
  "63": { name: "Puy-de-Dôme", file: "Flag_of_the_Department_of_Puy-de-Dôme.svg", host: "commons", status: "institutional" },
  "64": { name: "Pyrénées-Atlantiques", file: "Drapeau_proposé_pour_les_Pyrenees-atlantiques.svg", host: "commons", status: "proposed" },
  "65": { name: "Hautes-Pyrénées", file: "Flag_of_the_Department_of_Hautes-Pyrénées.svg", host: "commons", status: "institutional" },
  "66": { name: "Pyrénées-Orientales", file: "Flag_of_the_Department_of_Pyrénées-Orientales.svg", host: "commons", status: "institutional" },
  "67": { name: "Bas-Rhin", file: "Flag_of_the_Department_of_Bas-Rhin.svg", host: "commons", status: "institutional" },
  "68": { name: "Haut-Rhin", file: "Flag_of_the_Department_of_Haut-Rhin.svg", host: "commons", status: "institutional" },
  "69": { name: "Rhône", file: "Flag_of_Rhône.svg", host: "commons", status: "traditional" },
  "70": { name: "Haute-Saône", file: "Flag_of_the_Department_of_Haute-Saône.svg", host: "commons", status: "institutional" },
  "71": { name: "Saône-et-Loire", file: "Flag_of_the_Department_of_Saône-et-Loire.svg", host: "commons", status: "institutional" },
  "72": { name: "Sarthe", file: "Flag_of_the_Department_of_Sarthe.svg", host: "commons", status: "institutional" },
  "73": { name: "Savoie", file: "Savoie_(73),_logo.svg", host: "commons", status: "institutional" },
  "74": { name: "Haute-Savoie", file: "Drapeau_de_la_Savoie.svg", host: "commons", status: "traditional" },
  "75": { name: "Paris", file: "Flag_of_Paris_with_coat_of_arms.svg", host: "commons", status: "official" },
  "76": { name: "Seine-Maritime", file: "Flag_of_the_Department_of_Seine-Maritime_(Variant_1).svg", host: "commons", status: "institutional" },
  "77": { name: "Seine-et-Marne", file: "Flag_of_the_Department_of_Seine-et-Marne.svg", host: "commons", status: "institutional" },
  "78": { name: "Yvelines", file: "Drapeau_fr_département_Yvelines.svg", host: "commons", status: "traditional" },
  "79": { name: "Deux-Sèvres", file: "Flag_of_the_Department_of_Deux-Sèvres.svg", host: "commons", status: "institutional" },
  "80": { name: "Somme", file: "Flag_of_the_Department_of_Somme_(Variant_2).svg", host: "commons", status: "institutional" },
  "81": { name: "Tarn", file: "Drapeau_fr_département_Tarn.svg", host: "commons", status: "traditional" },
  "82": { name: "Tarn-et-Garonne", file: "Flag_of_Tarn-et-Garonne.svg", host: "commons", status: "traditional" },
  "83": { name: "Var", file: "Flag_of_the_Department_of_Var.svg", host: "commons", status: "institutional" },
  "84": { name: "Vaucluse", file: "Flag_of_the_Department_of_Vaucluse.svg", host: "commons", status: "institutional" },
  "85": { name: "Vendée", file: "Flag_of_the_Department_of_Vendée_(Variant_1).svg", host: "commons", status: "institutional" },
  "86": { name: "Vienne", file: "Flag_of_the_Department_of_Vienne.svg", host: "commons", status: "institutional" },
  "87": { name: "Haute-Vienne", file: "Flag_of_the_Department_of_Haute-Vienne_(Variant_2).svg", host: "commons", status: "institutional" },
  "88": { name: "Vosges", file: "Flag_of_Vosges.svg", host: "commons", status: "traditional" },
  "89": { name: "Yonne", file: "Flag_of_the_Department_of_Yonne.svg", host: "commons", status: "institutional" },
  "90": { name: "Territoire de Belfort", file: "Flag_of_the_Department_of_Belfort.svg", host: "commons", status: "institutional" },
  "91": { name: "Essonne", file: "DrapeauEssonnePicture.png", host: "commons", status: "institutional" },
  "92": { name: "Hauts-de-Seine", file: "Flag_of_the_Department_of_Hauts-de-Seine.svg", host: "commons", status: "institutional" },
  "93": { name: "Seine-Saint-Denis", file: "Proposition_de_drapeau_fr_département_Seine-Saint-Denis.svg", host: "commons", status: "proposed" },
  "94": { name: "Val-de-Marne", file: "Flag_of_the_Department_of_Val-de-Marne.svg", host: "commons", status: "institutional" },
  "95": { name: "Val-d’Oise", file: "Flag_of_the_Department_of_Val-d'Oise_(Variant_2).svg", host: "commons", status: "institutional" },
};

export function normalizeFrenchDepartmentCode(territoryId: string | null | undefined): string | null {
  const raw = String(territoryId || "").trim().toUpperCase().replace(/^FR-/, "");
  if (!raw) return null;
  if (raw === "2A" || raw === "2B") return raw;
  const numeric = Number.parseInt(raw, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, "0") : null;
}

export function getFrenchDepartmentFlagUrl(territoryId: string | null | undefined): string | null {
  const code = normalizeFrenchDepartmentCode(territoryId);
  if (!code) return null;
  const meta = FRENCH_DEPARTMENT_FLAGS[code];
  if (!meta) return null;
  const base = meta.host === "frwiki" ? "https://fr.wikipedia.org" : "https://commons.wikimedia.org";
  return `${base}/wiki/Special:Redirect/file/${encodeURIComponent(meta.file)}?width=640`;
}

export function getFrenchDepartmentFlagMeta(territoryId: string | null | undefined): FrenchDepartmentFlagMeta | null {
  const code = normalizeFrenchDepartmentCode(territoryId);
  return code ? FRENCH_DEPARTMENT_FLAGS[code] || null : null;
}
