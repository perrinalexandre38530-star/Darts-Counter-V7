/** MSS LEGENDS: static 52-card visual deck. Gameplay/card ranking is untouched. */
export type MSSLegendSuit = "S" | "H" | "D" | "C";
const MSS_SUIT_FOLDERS: Record<MSSLegendSuit, string> = {
  S: "spades", H: "hearts", D: "diamonds", C: "clubs",
};

export function mssLegendCardUrl(suit: MSSLegendSuit | null | undefined, rank: number): string | null {
  if (!suit || !(suit in MSS_SUIT_FOLDERS) || !Number.isInteger(rank) || rank < 2 || rank > 14) return null;
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return `${base}images/mss-legends/${MSS_SUIT_FOLDERS[suit]}/${rank}.webp`;
}

/** Order of suits in Président: ♠, ♥, ♣, ♦. */
export function mssPresidentCardUrl(suitIndex: number, rank: number): string | null {
  const suits: MSSLegendSuit[] = ["S", "H", "C", "D"];
  if (!Number.isInteger(suitIndex) || suitIndex < 0 || suitIndex > 3) return null;
  return mssLegendCardUrl(suits[suitIndex], rank);
}
