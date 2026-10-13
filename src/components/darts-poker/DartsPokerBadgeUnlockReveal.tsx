import React from "react";
import DartsPokerBadge, { getDartsPokerBadgeLabel } from "./DartsPokerBadge";
import type { DartsPokerBadgeId } from "./DartsPokerBadge";

const GOLD = "#f6c256";
const GREEN = "#5ce6a8";
const SOFT = "#949bad";

function playerName(profile: any) {
  return String(profile?.name || profile?.displayName || profile?.playerName || "Joueur");
}

export default function DartsPokerBadgeUnlockReveal({
  unlocks = [],
  profilesById,
  progressByPlayer = {},
  onClose,
}: {
  unlocks?: any[];
  profilesById?: Map<string, any>;
  progressByPlayer?: Record<string, any>;
  onClose: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const safeUnlocks = Array.isArray(unlocks) ? unlocks.filter((item) => item?.badgeId && item?.playerId) : [];
  const unlock = safeUnlocks[Math.min(index, Math.max(0, safeUnlocks.length - 1))];

  React.useEffect(() => {
    setIndex(0);
  }, [safeUnlocks.map((item) => `${item?.playerId}:${item?.badgeId}`).join("|")]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if ((event.key === "Enter" || event.key === " ") && safeUnlocks.length) {
        event.preventDefault();
        if (index < safeUnlocks.length - 1) setIndex((value) => value + 1);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, safeUnlocks.length, onClose]);

  if (!unlock || !safeUnlocks.length) return null;

  const badgeId = unlock.badgeId as DartsPokerBadgeId;
  const profile = profilesById?.get(String(unlock.playerId)) || { name: unlock.playerName };
  const career = progressByPlayer?.[String(unlock.playerId)] || null;
  const collectionCount = Object.keys(career?.badges || {}).length;
  const last = index >= safeUnlocks.length - 1;
  const progressValue = Number(unlock?.current || 0);
  const target = Number(unlock?.target || 0);

  return <div
    role="dialog"
    aria-modal="true"
    aria-label="Nouveau badge Darts Poker"
    style={{ position: "fixed", inset: 0, zIndex: 10060, display: "grid", placeItems: "center", padding: 12, overflow: "auto", background: "radial-gradient(circle at 50% 28%,rgba(246,194,86,.18),rgba(0,0,0,.95) 48%,#000 100%)", backdropFilter: "blur(14px)" }}
  >
    <style>{`@keyframes dpBadgeReveal{0%{opacity:0;transform:translateY(18px) scale(.82) rotate(-2deg)}55%{opacity:1;transform:translateY(-2px) scale(1.045) rotate(.6deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}@keyframes dpBadgeHalo{0%,100%{transform:scale(.92);opacity:.28}50%{transform:scale(1.08);opacity:.62}}`}</style>
    <div style={{ width: "min(520px,100%)", borderRadius: 28, padding: "18px 16px 16px", textAlign: "center", border: `1px solid ${GOLD}88`, background: "linear-gradient(180deg,rgba(31,25,13,.985),rgba(8,8,12,.99) 55%)", boxShadow: "0 30px 100px rgba(0,0,0,.82),0 0 42px rgba(246,194,86,.16)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", left: "50%", top: 48, transform: "translateX(-50%)", background: "radial-gradient(circle,rgba(246,194,86,.18),rgba(246,194,86,0) 68%)", pointerEvents: "none", animation: "dpBadgeHalo 2.4s ease-in-out infinite" }} />
      <div style={{ position: "relative", color: GOLD, fontSize: 9, fontWeight: 1200, letterSpacing: 2 }}>TROPHÉE DARTS POKER</div>
      <div style={{ position: "relative", color: "#fff", fontSize: 22, fontWeight: 1250, marginTop: 3 }}>NOUVEAU BADGE DÉBLOQUÉ</div>
      <div key={`${unlock.playerId}-${unlock.badgeId}-${index}`} style={{ position: "relative", width: "min(230px,72vw)", aspectRatio: "1", margin: "12px auto 4px", display: "grid", placeItems: "center", animation: "dpBadgeReveal .62s cubic-bezier(.2,.85,.22,1) both" }}>
        <DartsPokerBadge id={badgeId} size="100%" />
      </div>
      <div style={{ position: "relative", color: GOLD, fontSize: 16, fontWeight: 1200 }}>{getDartsPokerBadgeLabel(badgeId)}</div>
      <div style={{ position: "relative", color: "#fff", fontSize: 12, fontWeight: 1100, marginTop: 5 }}>{playerName(profile)}</div>
      <div style={{ position: "relative", color: SOFT, fontSize: 9, lineHeight: 1.45, marginTop: 5 }}>{unlock?.detail || "Objectif Darts Poker accompli"}</div>
      <div style={{ position: "relative", margin: "12px auto 0", maxWidth: 330, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        <div style={{ padding: 8, borderRadius: 13, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)" }}><div style={{ color: GREEN, fontSize: 15, fontWeight: 1150 }}>{target === 75 ? progressValue.toFixed(1) : Math.round(progressValue)}{target === 75 ? "%" : ""}</div><div style={{ color: SOFT, fontSize: 6.8 }}>OBJECTIF VALIDÉ</div></div>
        <div style={{ padding: 8, borderRadius: 13, border: `1px solid ${GOLD}33`, background: `${GOLD}0b` }}><div style={{ color: GOLD, fontSize: 15, fontWeight: 1150 }}>{collectionCount}/12</div><div style={{ color: SOFT, fontSize: 6.8 }}>COLLECTION</div></div>
      </div>
      {safeUnlocks.length > 1 ? <div style={{ position: "relative", marginTop: 11, display: "flex", justifyContent: "center", gap: 5 }}>{safeUnlocks.map((_, dot) => <span key={dot} style={{ width: dot === index ? 18 : 6, height: 6, borderRadius: 999, background: dot === index ? GOLD : "rgba(255,255,255,.18)", transition: "width .18s ease,background .18s ease" }} />)}</div> : null}
      <button type="button" onClick={() => { if (!last) setIndex((value) => value + 1); else onClose(); }} style={{ position: "relative", width: "100%", minHeight: 44, marginTop: 13, borderRadius: 14, border: `1px solid ${GOLD}99`, background: `${GOLD}18`, color: GOLD, fontSize: 10, fontWeight: 1200, cursor: "pointer" }}>{last ? "CONTINUER" : `BADGE SUIVANT · ${index + 2}/${safeUnlocks.length}`}</button>
      <button type="button" onClick={onClose} style={{ position: "relative", marginTop: 7, border: 0, background: "transparent", color: "#747b8d", fontSize: 8, fontWeight: 950, cursor: "pointer" }}>PASSER</button>
    </div>
  </div>;
}
