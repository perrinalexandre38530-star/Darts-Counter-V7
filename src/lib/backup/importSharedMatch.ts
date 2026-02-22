import { History } from "../history";

export async function importSharedMatch(pack: any) {
  if (!pack?.match) throw new Error("Fichier invalide");

  await History.add(pack.match);

  return true;
}