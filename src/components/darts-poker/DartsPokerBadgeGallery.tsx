import React from "react";
import DartsPokerBadge, { DARTS_POKER_BADGES, currentDartsPokerLanguage, getDartsPokerBadgeLabel } from "./DartsPokerBadge";
import type { DartsPokerBadgeId } from "./DartsPokerBadge";
import {
  DARTS_POKER_BADGE_RULES,
  getDartsPokerBadgeCareerValue,
  getDartsPokerBadgeLockedReason,
  readDartsPokerProgress,
} from "../../lib/dartsPokerProgress";

const GOLD = "#f6c256";
const GREEN = "#5ce6a8";
const RED = "#e83a43";
const BLUE = "#55c7ff";
const SOFT = "#949bad";

const BADGE_COLORS: Record<DartsPokerBadgeId, string> = {
  first_deal: GOLD,
  table_regular: BLUE,
  shark: GREEN,
  sniper: "#ff9b52",
  contract_master: RED,
  power_player: "#ff63b8",
  joker_master: GOLD,
  premium_hand: RED,
  table_leader: BLUE,
  winning_dealer: GREEN,
  closer: "#ff9b52",
  royal: GOLD,
};

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}

function profileId(profile: any) {
  return String(profile?.id || profile?.playerId || profile?.profileId || "");
}

function profileName(profile: any) {
  return String(profile?.name || profile?.displayName || profile?.playerName || "Joueur");
}

function fmt(value: number, target: number) {
  if (target === 75 || !Number.isInteger(value)) return value.toFixed(1);
  return String(Math.round(value));
}

function conditionText(id: DartsPokerBadgeId, language: string) {
  const english = !String(language || "fr").toLowerCase().startsWith("fr");
  const fr: Record<DartsPokerBadgeId, string> = {
    first_deal: "Terminer 1 partie Darts Poker",
    table_regular: "Terminer 10 parties Darts Poker",
    shark: "Remporter 10 parties",
    sniper: "Atteindre 75 % de précision après au moins 60 fléchettes",
    contract_master: "Réussir 25 contrats",
    power_player: "Utiliser 25 pouvoirs",
    joker_master: "Obtenir 10 Jokers",
    premium_hand: "Obtenir 10 mains Couleur ou mieux",
    table_leader: "Être leader sur au moins 50 % des manches",
    winning_dealer: "Gagner 5 manches en tant que dealer",
    closer: "Gagner la dernière manche de 5 parties",
    royal: "Obtenir une quinte flush royale",
  };
  const en: Record<DartsPokerBadgeId, string> = {
    first_deal: "Finish 1 Darts Poker match",
    table_regular: "Finish 10 Darts Poker matches",
    shark: "Win 10 matches",
    sniper: "Reach 75% accuracy after at least 60 darts",
    contract_master: "Complete 25 contracts",
    power_player: "Use 25 powers",
    joker_master: "Collect 10 Jokers",
    premium_hand: "Get 10 Flush-or-better hands",
    table_leader: "Lead at least 50% of played rounds",
    winning_dealer: "Win 5 rounds as dealer",
    closer: "Win the final round in 5 matches",
    royal: "Hit a Royal Flush",
  };
  return (english ? en : fr)[id];
}

export default function DartsPokerBadgeGallery({
  profiles = [],
  initialPlayerId,
  catalogOnly = false,
}: {
  profiles?: any[];
  initialPlayerId?: string | null;
  catalogOnly?: boolean;
}) {
  const humans = React.useMemo(() => {
    const seen = new Set<string>();
    return (profiles || []).filter((profile: any) => {
      const id = profileId(profile);
      if (!id || isBotLike(profile) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [profiles]);

  const [selectedId, setSelectedId] = React.useState(() => {
    const requested = String(initialPlayerId || "");
    return humans.some((profile: any) => profileId(profile) === requested) ? requested : profileId(humans[0]);
  });
  const [filter, setFilter] = React.useState<"all" | "unlocked" | "locked">("all");

  React.useEffect(() => {
    if (catalogOnly || !humans.length) return;
    if (!humans.some((profile: any) => profileId(profile) === selectedId)) setSelectedId(profileId(humans[0]));
  }, [catalogOnly, humans, selectedId]);

  const language = currentDartsPokerLanguage();
  const selectedProfile = humans.find((profile: any) => profileId(profile) === selectedId) || humans[0] || null;
  const career = !catalogOnly && selectedProfile ? readDartsPokerProgress(profileId(selectedProfile)) : null;
  const unlockedIds = new Set<DartsPokerBadgeId>(Object.keys(career?.badges || {}) as DartsPokerBadgeId[]);
  const unlockedCount = unlockedIds.size;
  const accuracy = career?.darts ? (Number(career.hits || 0) / Math.max(1, Number(career.darts || 0))) * 100 : 0;

  const rows = DARTS_POKER_BADGE_RULES.map((rule) => {
    const current = career ? getDartsPokerBadgeCareerValue(rule.id, career) : 0;
    const unlocked = catalogOnly ? true : unlockedIds.has(rule.id);
    const progress = catalogOnly ? 100 : Math.max(0, Math.min(100, (current / Math.max(1, rule.target)) * 100));
    return {
      ...rule,
      current,
      unlocked,
      progress,
      lockedReason: career ? getDartsPokerBadgeLockedReason(rule.id, career) : null,
      color: BADGE_COLORS[rule.id],
    };
  }).filter((row) => filter === "all" || (filter === "unlocked" ? row.unlocked : !row.unlocked));

  return <div style={{ width: "100%" }}>
    {!catalogOnly && humans.length > 1 ? <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 7 }}>
      {humans.map((profile: any) => {
        const id = profileId(profile);
        const active = id === selectedId;
        const count = Object.keys(readDartsPokerProgress(id)?.badges || {}).length;
        return <button key={id} type="button" onClick={() => setSelectedId(id)} style={{ flex: "0 0 auto", minHeight: 34, borderRadius: 999, border: `1px solid ${active ? GOLD : "rgba(255,255,255,.10)"}`, background: active ? `${GOLD}16` : "rgba(255,255,255,.03)", color: active ? GOLD : "#d8dbe4", padding: "0 10px", fontSize: 8, fontWeight: 1050 }}>{profileName(profile)} · {count}/12</button>;
      })}
    </div> : null}

    {catalogOnly ? <div style={{ padding: 9, borderRadius: 14, background: `${GOLD}0b`, border: `1px solid ${GOLD}33`, color: SOFT, fontSize: 8.5, lineHeight: 1.45 }}>Collection officielle Darts Poker · 12 trophées permanents. Les conditions restent identiques quelle que soit la durée de la partie.</div> : selectedProfile ? <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 8 }}>
      <Summary label="Badges" value={`${unlockedCount}/12`} color={GOLD} />
      <Summary label="Parties" value={String(career?.matches || 0)} color={BLUE} />
      <Summary label="Victoires" value={String(career?.wins || 0)} color={GREEN} />
      <Summary label="Précision" value={`${accuracy.toFixed(1)}%`} color={RED} />
    </div> : <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", color: SOFT, fontSize: 8.5 }}>Sélectionne un joueur pour afficher sa progression. Le catalogue complet reste visible ci-dessous.</div>}

    {!catalogOnly ? <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
      {[["all","TOUS"],["unlocked","DÉBLOQUÉS"],["locked","À OBTENIR"]].map(([key,label]) => <button key={key} type="button" onClick={() => setFilter(key as any)} style={{ minHeight: 30, borderRadius: 999, padding: "0 9px", border: `1px solid ${filter === key ? GOLD : "rgba(255,255,255,.09)"}`, background: filter === key ? `${GOLD}15` : "rgba(255,255,255,.025)", color: filter === key ? GOLD : SOFT, fontSize: 7.5, fontWeight: 1050 }}>{label}</button>)}
    </div> : null}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>
      {rows.map((row) => {
        const title = getDartsPokerBadgeLabel(row.id, language);
        const unlockedAt = career?.badges?.[row.id]?.unlockedAt;
        return <div key={row.id} style={{ padding: 9, borderRadius: 16, border: `1px solid ${row.unlocked ? row.color : "rgba(255,255,255,.09)"}55`, background: row.unlocked ? `radial-gradient(circle at 50% 0%,${row.color}16,rgba(255,255,255,.018) 64%)` : "rgba(255,255,255,.018)", opacity: row.unlocked || catalogOnly ? 1 : .76, minWidth: 0 }}>
          <div style={{ width: "min(118px,100%)", aspectRatio: "1", margin: "0 auto", borderRadius: 18, display: "grid", placeItems: "center", overflow: "hidden", background: "rgba(0,0,0,.18)", boxShadow: row.unlocked ? `0 0 20px ${row.color}28` : "none" }}><DartsPokerBadge id={row.id} size="100%" unlocked={row.unlocked || catalogOnly} /></div>
          <div style={{ marginTop: 6, textAlign: "center", color: row.unlocked || catalogOnly ? row.color : "#c6cad5", fontSize: 8, fontWeight: 1150, letterSpacing: .25 }}>{title}</div>
          <div style={{ marginTop: 3, minHeight: 23, textAlign: "center", color: SOFT, fontSize: 6.9, lineHeight: 1.35 }}>{conditionText(row.id, language)}</div>
          {!catalogOnly ? <>
            <div style={{ marginTop: 6, height: 5, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.06)" }}><div style={{ width: `${row.progress}%`, height: "100%", borderRadius: 999, background: row.unlocked ? row.color : `${row.color}99` }} /></div>
            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", gap: 6, color: "#747b8c", fontSize: 6.5 }}><span>{row.unlocked ? "DÉBLOQUÉ" : (row.lockedReason || "EN COURS")}</span><span>{fmt(Math.min(row.current, row.target), row.target)} / {row.target}{row.target === 75 ? "%" : ""}</span></div>
            {row.unlocked && unlockedAt ? <div style={{ marginTop: 3, color: GREEN, textAlign: "center", fontSize: 6.2 }}>Acquis le {new Date(unlockedAt).toLocaleDateString()}</div> : null}
          </> : null}
        </div>;
      })}
    </div>
  </div>;
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return <div style={{ minWidth: 0, padding: "7px 5px", textAlign: "center", borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}><div style={{ color, fontSize: 13, fontWeight: 1150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ color: SOFT, fontSize: 6.5, textTransform: "uppercase" }}>{label}</div></div>;
}
