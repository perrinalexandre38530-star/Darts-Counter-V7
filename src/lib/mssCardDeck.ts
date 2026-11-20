/**
 * Cosmetic card-deck selection shared by Président, Kilo de Merde and Darts Poker.
 * Card values, suits, joker effects and shuffle rules belong to the game engines;
 * changing artwork must never modify them.
 */
import { mssLegendCardUrl, mssPresidentCardUrl, mssJokerCardUrl, type MSSLegendSuit } from "./mssLegendsDeck";

export type MSSCardDeckId = "legends" | "bots";
const PREF_KEY = "dc_mss_card_deck_v1";
const SUIT_FOLDERS: Record<MSSLegendSuit, string> = {
  S: "spades", H: "hearts", D: "diamonds", C: "clubs",
};

export function getMSSCardDeck(): MSSCardDeckId {
  try { return localStorage.getItem(PREF_KEY) === "bots" ? "bots" : "legends"; }
  catch { return "legends"; }
}
export function setMSSCardDeck(deck: MSSCardDeckId): void {
  try { localStorage.setItem(PREF_KEY, deck === "bots" ? "bots" : "legends"); } catch {}
}
export function mssCardDeckLabel(deck: MSSCardDeckId = getMSSCardDeck()): string {
  return deck === "bots" ? "MSS BOTS" : "MSS LEGENDS";
}
function botsBase(): string {
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return `${base}images/mss-bots/`;
}

/** 52 identical card identities across both illustrated decks. */
export function mssVisualCardUrl(suit: MSSLegendSuit | null | undefined, rank: number, deck: MSSCardDeckId = getMSSCardDeck()): string | null {
  if (deck !== "bots") return mssLegendCardUrl(suit, rank);
  if (!suit || !(suit in SUIT_FOLDERS) || !Number.isInteger(rank) || rank < 2 || rank > 14) return null;
  return `${botsBase()}${SUIT_FOLDERS[suit]}/${rank}.webp`;
}

/** President and Kilo suit numbering: 0 ♠, 1 ♥, 2 ♣, 3 ♦. */
export function mssVisualPresidentCardUrl(suitIndex: number, rank: number, deck: MSSCardDeckId = getMSSCardDeck()): string | null {
  if (deck !== "bots") return mssPresidentCardUrl(suitIndex, rank);
  const suit: MSSLegendSuit[] = ["S", "H", "C", "D"];
  if (!Number.isInteger(suitIndex) || suitIndex < 0 || suitIndex >= suit.length) return null;
  return mssVisualCardUrl(suit[suitIndex], rank, deck);
}

/** Same two joker card IDs; only the selected illustrations change. */
export function mssVisualJokerUrl(variant: string = "hawaii-501", deck: MSSCardDeckId = getMSSCardDeck()): string {
  if (deck !== "bots") return mssJokerCardUrl(variant);
  const second = variant === "king-of-bling" || variant === "JOKER_BLING";
  return `${botsBase()}jokers/${second ? "jinx" : "billy-boy"}.webp`;
}

export function mssVisualJokerLabel(variant: string = "hawaii-501", deck: MSSCardDeckId = getMSSCardDeck()): string {
  const second = variant === "king-of-bling" || variant === "JOKER_BLING";
  return deck === "bots" ? (second ? "JINX" : "BILLY BOY") : (second ? "KING OF BLING" : "HAWAII 501");
}
