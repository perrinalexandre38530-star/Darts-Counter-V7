import React from "react";
import type { PokerCard } from "../../lib/gameEngines/dartsPokerEngine";
import { pokerRankLabel, pokerSuitSymbol } from "../../lib/gameEngines/dartsPokerEngine";
import { contentPackAssetUrl } from "../../lib/contentPacks";

type CardSize = "mini" | "small" | "medium" | "large" | "hero";

type Props = {
  card?: PokerCard | null;
  size?: CardSize;
  hidden?: boolean;
  selected?: boolean;
  onClick?: (() => void) | null;
  badge?: React.ReactNode;
  showIdentity?: boolean;
};

type FaceIdentity = {
  name: string;
  universe: string;
  image: string;
  accent: string;
};

const GOLD = "#f6c256";
const RED = "#e83a43";
const BLUE = "#55c7ff";
const GREEN = "#5ce6a8";

const face = (name: string, universe: string, file: string, accent: string): FaceIdentity => ({
  name,
  universe,
  image: contentPackAssetUrl("collectible-cards", file),
  accent,
});

const FACE_ART: Record<string, FaceIdentity> = {
  "S11": face("NOZ", "KILLER", "killer-noz.webp", "#9aa1b2"),
  "S12": face("VELVET", "KILLER", "killer-velvet.webp", "#d77cff"),
  "S13": face("BRUTUS", "KILLER", "killer-brutus.webp", "#ff6b59"),

  "H11": face("KAEL", "FIREFIGHTER", "firefighter-kael.webp", "#ff9b52"),
  "H12": face("AWENA", "MSS", "awena-diamant.webp", "#b987ff"),
  "H13": face("BRAZE", "FIREFIGHTER", "firefighter-braze.webp", "#ff5b40"),

  "D11": face("JACK", "LOTERIE", "loterie-jack.webp", "#55c7ff"),
  "D12": face("FORTUNA", "LOTERIE", "loterie-fortuna.webp", "#ff63b8"),
  "D13": face("MIDAS", "LOTERIE", "loterie-midas.webp", GOLD),

  "C11": face("AERO", "FIREFIGHTER", "firefighter-aero.webp", BLUE),
  "C12": face("LYNA", "FIREFIGHTER", "firefighter-lyna.webp", GREEN),
  "C13": face("ZEPHYR", "FIREFIGHTER", "firefighter-zephyr.webp", "#7fd8ff"),
};

const JOKER_ART = face("AWENA", "MSS JOKER", "awena-or.webp", GOLD);

const SIZES: Record<CardSize, { w: number; h: number; radius: number; rank: number; suit: number; identity: number }> = {
  mini: { w: 28, h: 38, radius: 6, rank: 7.5, suit: 14, identity: 0 },
  small: { w: 42, h: 58, radius: 8, rank: 10, suit: 21, identity: 0 },
  medium: { w: 55, h: 76, radius: 9, rank: 12, suit: 28, identity: 6.5 },
  large: { w: 82, h: 114, radius: 12, rank: 15, suit: 38, identity: 8 },
  hero: { w: 112, h: 156, radius: 15, rank: 19, suit: 48, identity: 10 },
};

function getFaceIdentity(card?: PokerCard | null): FaceIdentity | null {
  if (!card) return null;
  if (card.joker) return JOKER_ART;
  return FACE_ART[`${card.suit || ""}${card.rank}`] || null;
}

function cardBack(size: CardSize) {
  const spec = SIZES[size];
  return <div style={{
    width: spec.w,
    height: spec.h,
    borderRadius: spec.radius,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    border: `1px solid ${GOLD}88`,
    background: "radial-gradient(circle at 50% 44%,rgba(246,194,86,.16) 0 12%,transparent 13% 20%,rgba(246,194,86,.11) 21% 24%,transparent 25%),repeating-linear-gradient(45deg,#230d12 0 5px,#4b1018 5px 10px)",
    boxShadow: "0 5px 14px rgba(0,0,0,.42), inset 0 0 0 2px rgba(255,255,255,.035)",
  }}>
    <div style={{ position: "absolute", inset: 4, borderRadius: Math.max(3, spec.radius - 3), border: "1px solid rgba(246,194,86,.36)" }} />
    <div style={{ position: "absolute", inset: "28% 20%", borderRadius: "50%", border: `1px solid ${GOLD}70`, display: "grid", placeItems: "center", color: GOLD, fontSize: size === "mini" ? 6 : size === "small" ? 8 : 11, fontWeight: 1200, letterSpacing: .4, transform: "rotate(-8deg)" }}>MSS</div>
    {size !== "mini" ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 4, textAlign: "center", color: "rgba(246,194,86,.72)", fontSize: size === "small" ? 4.8 : 6, fontWeight: 1000, letterSpacing: .7 }}>DARTS POKER</div> : null}
  </div>;
}

function NumberFace({ card, size }: { card: PokerCard; size: CardSize }) {
  const spec = SIZES[size];
  const red = card.suit === "H" || card.suit === "D";
  const color = red ? "#c3172b" : "#101116";
  const suit = pokerSuitSymbol(card.suit);
  const count = card.rank === 14 ? 1 : Math.max(2, Math.min(10, card.rank));
  const isAce = card.rank === 14;
  return <div style={{ position: "absolute", inset: 0, color }}>
    <div style={{ position: "absolute", inset: "17% 13% 14%", display: "grid", placeItems: "center" }}>
      {isAce ? <div style={{ fontSize: spec.suit * 1.22, lineHeight: 1, filter: "drop-shadow(0 1px 0 rgba(255,255,255,.6))" }}>{suit}</div> :
        <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: count <= 3 ? "1fr" : "repeat(2,1fr)", alignContent: "space-evenly", justifyItems: "center", gap: 0 }}>
          {Array.from({ length: count }, (_, index) => <span key={index} style={{ fontSize: Math.max(6, spec.suit * (size === "mini" ? .42 : .38)), lineHeight: .85, transform: index >= Math.ceil(count / 2) ? "rotate(180deg)" : "none" }}>{suit}</span>)}
        </div>}
    </div>
    {size !== "mini" ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 2, textAlign: "center", fontSize: size === "small" ? 4.5 : 5.8, color: "rgba(20,20,24,.36)", fontWeight: 900, letterSpacing: .55 }}>MULTISPORTS SCORING</div> : null}
  </div>;
}

function FaceArt({ identity, size }: { identity: FaceIdentity; size: CardSize }) {
  const [failed, setFailed] = React.useState(false);
  const spec = SIZES[size];
  return <div style={{ position: "absolute", inset: size === "mini" ? 2 : 3, borderRadius: Math.max(3, spec.radius - 3), overflow: "hidden", background: `linear-gradient(145deg,${identity.accent}22,#111)` }}>
    {!failed ? <img src={identity.image} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 18%", display: "block", transform: "scale(1.05)" }} /> : null}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.02) 36%,rgba(0,0,0,.78) 100%)" }} />
    {size !== "mini" && size !== "small" ? <div style={{ position: "absolute", left: 4, right: 4, bottom: 4, textAlign: "center" }}>
      <div style={{ color: "#fff", fontSize: spec.identity, lineHeight: 1, fontWeight: 1200, textShadow: "0 1px 4px #000" }}>{identity.name}</div>
      {size === "large" || size === "hero" ? <div style={{ marginTop: 2, color: identity.accent, fontSize: Math.max(5.5, spec.identity - 2), lineHeight: 1, fontWeight: 1000, letterSpacing: .45 }}>{identity.universe}</div> : null}
    </div> : null}
  </div>;
}

export function dartsPokerCardIdentity(card?: PokerCard | null): FaceIdentity | null {
  return getFaceIdentity(card);
}

export default function DartsPokerCard({ card, size = "medium", hidden = false, selected = false, onClick, badge, showIdentity = true }: Props) {
  const spec = SIZES[size];
  if (hidden) return cardBack(size);
  if (!card) return <div style={{ width: spec.w, height: spec.h, borderRadius: spec.radius, boxSizing: "border-box", border: "1px dashed rgba(255,255,255,.22)", background: "rgba(255,255,255,.018)" }} />;

  const red = card.suit === "H" || card.suit === "D";
  const color = card.joker ? GOLD : red ? "#c3172b" : "#111116";
  const suit = pokerSuitSymbol(card.suit);
  const identity = showIdentity ? getFaceIdentity(card) : null;
  const rank = card.joker ? "★" : pokerRankLabel(card.rank);
  const accent = identity?.accent || (card.joker ? GOLD : red ? RED : "#c9ced8");

  const content = <div style={{
    width: spec.w,
    height: spec.h,
    padding: 0,
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    borderRadius: spec.radius,
    background: card.joker ? "linear-gradient(145deg,#17161d,#5a1320 62%,#17161d)" : "linear-gradient(145deg,#fffdf8,#e7e1d7)",
    border: `2px solid ${selected ? GREEN : card.joker ? GOLD : accent}aa`,
    boxShadow: selected ? `0 0 16px ${GREEN}99,0 5px 13px rgba(0,0,0,.42)` : "0 5px 13px rgba(0,0,0,.38)",
    color,
    userSelect: "none",
  }}>
    <div style={{ position: "absolute", inset: 2, borderRadius: Math.max(3, spec.radius - 3), border: card.joker ? "1px solid rgba(246,194,86,.35)" : "1px solid rgba(20,20,24,.10)", pointerEvents: "none", zIndex: 4 }} />
    {identity ? <FaceArt identity={identity} size={size} /> : <NumberFace card={card} size={size} />}
    <div style={{ position: "absolute", left: size === "mini" ? 2 : 3, top: size === "mini" ? 1 : 2, zIndex: 5, lineHeight: .88, fontWeight: 1200, textAlign: "center", textShadow: identity || card.joker ? "0 1px 4px #000" : "none", color: identity || card.joker ? "#fff" : color }}>
      <div style={{ fontSize: spec.rank }}>{rank}</div>
      <div style={{ fontSize: Math.max(6, spec.rank - 1) }}>{card.joker ? "★" : suit}</div>
    </div>
    {size !== "mini" ? <div style={{ position: "absolute", right: 3, bottom: 2, zIndex: 5, lineHeight: .88, fontWeight: 1200, textAlign: "center", transform: "rotate(180deg)", textShadow: identity || card.joker ? "0 1px 4px #000" : "none", color: identity || card.joker ? "#fff" : color }}>
      <div style={{ fontSize: spec.rank }}>{rank}</div>
      <div style={{ fontSize: Math.max(6, spec.rank - 1) }}>{card.joker ? "★" : suit}</div>
    </div> : null}
    {card.joker && size !== "mini" ? <div style={{ position: "absolute", left: 0, right: 0, top: "42%", zIndex: 6, textAlign: "center", color: GOLD, fontSize: size === "small" ? 6 : size === "medium" ? 7 : 9, fontWeight: 1200, letterSpacing: .7, textShadow: "0 2px 4px #000" }}>AWENA JOKER</div> : null}
    {badge ? <div style={{ position: "absolute", right: -1, bottom: -1, zIndex: 8, borderRadius: "8px 0 0 0", padding: size === "mini" ? "1px 2px" : "2px 4px", background: "#090a0e", borderTop: `1px solid ${GOLD}`, borderLeft: `1px solid ${GOLD}`, color: GOLD, fontSize: size === "mini" ? 5 : 6.5, fontWeight: 1100 }}>{badge}</div> : null}
  </div>;

  if (!onClick) return content;
  return <button type="button" onClick={onClick} style={{ appearance: "none", border: 0, padding: 0, margin: 0, background: "transparent", cursor: "pointer", borderRadius: spec.radius, lineHeight: 0 }}>{content}</button>;
}

export function DartsPokerCardBack({ size = "medium" }: { size?: CardSize }) {
  return cardBack(size);
}

export function DartsPokerDeckPreview() {
  const samples: PokerCard[] = [
    { id: "S11", suit: "S", rank: 11 },
    { id: "H12", suit: "H", rank: 12 },
    { id: "D13", suit: "D", rank: 13 },
    { id: "C12", suit: "C", rank: 12 },
    { id: "JOKER_PREVIEW", suit: null, rank: 15, joker: true },
  ];
  return <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 5, overflow: "hidden", padding: "4px 0" }}>
    {samples.map((card, index) => <div key={card.id} style={{ transform: `translateY(${Math.abs(2 - index) * 2}px) rotate(${(index - 2) * 2.5}deg)`, transformOrigin: "50% 100%" }}><DartsPokerCard card={card} size="medium" /></div>)}
  </div>;
}


export function buildDartsPokerDisplayDeck(): PokerCard[] {
  const suits: Array<"S" | "H" | "D" | "C"> = ["S", "H", "D", "C"];
  const deck: PokerCard[] = [];
  suits.forEach((suit) => {
    for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: `${suit}${rank}`, suit, rank });
  });
  deck.push({ id: "MSS_JOKER", suit: null, rank: 15, joker: true });
  return deck;
}

export function DartsPokerDeckGallery({ compact = false, showLegend = true }: { compact?: boolean; showLegend?: boolean }) {
  const suits: Array<{ key: "S" | "H" | "D" | "C"; label: string; symbol: string; color: string }> = [
    { key: "S", label: "PIQUES", symbol: "♠", color: "#d4d8e5" },
    { key: "H", label: "CŒURS", symbol: "♥", color: RED },
    { key: "D", label: "CARREAUX", symbol: "♦", color: RED },
    { key: "C", label: "TRÈFLES", symbol: "♣", color: "#d4d8e5" },
  ];
  const deck = buildDartsPokerDisplayDeck();
  const cardSize: CardSize = compact ? "mini" : "small";
  return <div style={{ display: "grid", gap: compact ? 7 : 10 }}>
    {showLegend ? <div style={{ padding: compact ? "7px 8px" : "9px 10px", borderRadius: 12, background: "linear-gradient(135deg,rgba(246,194,86,.08),rgba(232,58,67,.07))", border: "1px solid rgba(246,194,86,.24)", color: "#d8dce6", fontSize: compact ? 7.5 : 9, lineHeight: 1.45 }}>
      <b style={{ color: GOLD }}>DECK MSS SIGNATURE</b> · 52 cartes + Joker Awena. Les figures J / Q / K utilisent les personnages MULTISPORTS SCORING ; les valeurs et couleurs restent celles d’un vrai jeu de poker.
    </div> : null}
    {suits.map((suit) => {
      const cards = deck.filter((card) => card.suit === suit.key);
      return <section key={suit.key} style={{ padding: compact ? 6 : 8, borderRadius: 13, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.022)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 5 : 7 }}>
          <span style={{ color: suit.color, fontSize: compact ? 12 : 15 }}>{suit.symbol}</span>
          <b style={{ color: suit.color, fontSize: compact ? 7.5 : 9, letterSpacing: .65 }}>{suit.label}</b>
          <span style={{ marginLeft: "auto", color: "#747b8d", fontSize: compact ? 6.5 : 7.5 }}>13 CARTES</span>
        </div>
        <div style={{ display: "flex", gap: compact ? 3 : 5, overflowX: "auto", paddingBottom: 3 }}>
          {cards.map((card) => <DartsPokerCard key={card.id} card={card} size={cardSize} />)}
        </div>
      </section>;
    })}
    <section style={{ padding: compact ? 6 : 8, borderRadius: 13, border: `1px solid ${GOLD}44`, background: `${GOLD}08` }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 9, alignItems: "center" }}>
        <DartsPokerCard card={deck[deck.length - 1]} size={compact ? "small" : "medium"} />
        <div>
          <div style={{ color: GOLD, fontSize: compact ? 8 : 10, fontWeight: 1100 }}>AWENA · JOKER MSS</div>
          <div style={{ color: "#9aa1b2", fontSize: compact ? 7 : 8.5, lineHeight: 1.4, marginTop: 3 }}>Le Double Bull déclenche le Joker spécial Darts Poker. Une seule carte Joker peut entrer dans une main.</div>
        </div>
      </div>
    </section>
  </div>;
}
