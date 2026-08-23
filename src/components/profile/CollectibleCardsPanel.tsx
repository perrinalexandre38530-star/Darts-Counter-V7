import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  COLLECTIBLE_CARDS,
  cardRequirementProgress,
  computeCollectibleMetrics,
  reconcileCollectibleUnlocks,
  type CollectibleCardDefinition,
  type CollectibleCardId,
  type CollectibleMetrics,
  type CollectibleUnlockMap,
} from "../../lib/collectibleCards";

import awenaBronze from "../../assets/collectible-cards/awena-bronze.webp";
import awenaArgent from "../../assets/collectible-cards/awena-argent.webp";
import awenaPlatine from "../../assets/collectible-cards/awena-platine.webp";
import awenaOr from "../../assets/collectible-cards/awena-or.webp";
import awenaDiamant from "../../assets/collectible-cards/awena-diamant.webp";
import firefighterKaelPresentation from "../../assets/collectible-cards/firefighter-kael-presentation.webp";
import firefighterKaelBronze from "../../assets/collectible-cards/firefighter-kael-bronze.webp";
import firefighterKaelArgent from "../../assets/collectible-cards/firefighter-kael-argent.webp";
import firefighterKaelPlatine from "../../assets/collectible-cards/firefighter-kael-platine.webp";
import firefighterKaelOr from "../../assets/collectible-cards/firefighter-kael-or.webp";
import firefighterKaelDiamant from "../../assets/collectible-cards/firefighter-kael-diamant.webp";
import firefighterLyna from "../../assets/collectible-cards/firefighter-lyna.webp";
import firefighterZephyr from "../../assets/collectible-cards/firefighter-zephyr.webp";
import firefighterBraze from "../../assets/collectible-cards/firefighter-braze.webp";
import firefighterAero from "../../assets/collectible-cards/firefighter-aero.webp";
import firefighterMalysia from "../../assets/collectible-cards/firefighter-malysia.webp";

const IMAGE_BY_CARD: Record<CollectibleCardId, string> = {
  awena_bronze: awenaBronze,
  awena_argent: awenaArgent,
  awena_platine: awenaPlatine,
  awena_or: awenaOr,
  awena_diamant: awenaDiamant,
  firefighter_kael_presentation: firefighterKaelPresentation,
  firefighter_kael_bronze: firefighterKaelBronze,
  firefighter_kael_argent: firefighterKaelArgent,
  firefighter_kael_platine: firefighterKaelPlatine,
  firefighter_kael_or: firefighterKaelOr,
  firefighter_kael_diamant: firefighterKaelDiamant,
  firefighter_lyna: firefighterLyna,
  firefighter_zephyr: firefighterZephyr,
  firefighter_braze: firefighterBraze,
  firefighter_aero: firefighterAero,
  firefighter_malysia: firefighterMalysia,
};

type FilterId = "all" | "awena" | "firefighter" | "unlocked" | "locked";

const ZERO_METRICS: CollectibleMetrics = {
  matches: 0,
  wins: 0,
  modes: 0,
  firefighterTacticalActions: 0,
  firefighterWindMatches: 0,
  firefighterWins: 0,
  firefighterCriticalExtinguishes: 0,
  firefighterCanadairs: 0,
  firefighterMatches: 0,
  firefighterKaelMatches: 0,
  firefighterKaelWins: 0,
};

function localText(lang: string, value: { fr: string; en: string; es: string }): string {
  return lang === "en" ? value.en : lang === "es" ? value.es : value.fr;
}

function compactNumber(value: number): string {
  const n = Math.max(0, Math.round(Number(value || 0)));
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  const { theme } = useTheme();
  return <button type="button" onClick={onClick} style={{ flex:"0 0 auto", border:`1px solid ${active ? theme.primary : theme.borderSoft}`, background:active ? `${theme.primary}22` : "rgba(255,255,255,.04)", color:active ? theme.primary : theme.textSoft, borderRadius:999, padding:"8px 11px", fontWeight:950, fontSize:9.5, letterSpacing:.45, cursor:"pointer", whiteSpace:"nowrap" }}>{label}</button>;
}

const CARD_PREVIEW_ASPECT_RATIO = "2 / 3";

function ProgressRequirements({ card, metrics, lang }: { card: CollectibleCardDefinition; metrics: CollectibleMetrics; lang: string }) {
  const { theme } = useTheme();
  return <div style={{ display:"grid", gap:5 }}>{card.requirements.map((req) => {
    const current = Math.max(0, Number(metrics[req.metric] || 0));
    const done = current >= req.target;
    return <div key={`${card.id}-${req.metric}`} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:7, alignItems:"center", fontSize:9.5 }}>
      <span style={{ color:done ? "#67e7a4" : theme.textSoft, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{done ? "✓ " : ""}{localText(lang, req.label)}</span>
      <strong style={{ color:done ? "#67e7a4" : theme.text }}>{compactNumber(Math.min(current, req.target))}/{compactNumber(req.target)}</strong>
    </div>;
  })}</div>;
}

export default function CollectibleCardsPanel({ profileId, profileName, persistedUnlocks, onPersistUnlocks }: {
  profileId: string;
  profileName?: string;
  persistedUnlocks?: CollectibleUnlockMap | null;
  onPersistUnlocks?: (profileId: string, unlocks: CollectibleUnlockMap) => void | Promise<void>;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [metrics, setMetrics] = React.useState<CollectibleMetrics>(ZERO_METRICS);
  const [unlocks, setUnlocks] = React.useState<CollectibleUnlockMap>(() => ({ ...(persistedUnlocks || {}) }));
  const unlocksRef = React.useRef<CollectibleUnlockMap>({ ...(persistedUnlocks || {}) });
  const [loading, setLoading] = React.useState(false);
  const [selectedCardId, setSelectedCardId] = React.useState<CollectibleCardId | null>(null);
  const [unlockQueue, setUnlockQueue] = React.useState<CollectibleCardId[]>([]);
  const [scanNonce, setScanNonce] = React.useState(0);

  const lastProfileIdRef = React.useRef(String(profileId || "").trim());
  React.useEffect(() => {
    const nextProfileId = String(profileId || "").trim();
    const profileChanged = lastProfileIdRef.current !== nextProfileId;
    lastProfileIdRef.current = nextProfileId;
    const next = profileChanged
      ? { ...(persistedUnlocks || {}) }
      : { ...unlocksRef.current, ...(persistedUnlocks || {}) };
    unlocksRef.current = next;
    setUnlocks(next);
    if (profileChanged) {
      setMetrics(ZERO_METRICS);
      setUnlockQueue([]);
      setSelectedCardId(null);
    }
  }, [profileId, persistedUnlocks]);

  const refresh = React.useCallback(async () => {
    const id = String(profileId || "").trim();
    if (!id) { setMetrics(ZERO_METRICS); return; }
    setLoading(true);
    try {
      const nextMetrics = await computeCollectibleMetrics(id);
      setMetrics(nextMetrics);
      const reconciled = reconcileCollectibleUnlocks(unlocksRef.current, nextMetrics);
      unlocksRef.current = reconciled.unlocks;
      setUnlocks(reconciled.unlocks);
      if (reconciled.newlyUnlocked.length) {
        setUnlockQueue((prev) => Array.from(new Set([...prev, ...reconciled.newlyUnlocked])));
        await onPersistUnlocks?.(id, reconciled.unlocks);
      }
    } finally { setLoading(false); }
  }, [profileId, onPersistUnlocks, scanNonce]);

  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: number | null = null;
    const schedule = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setScanNonce((n) => n + 1), 250);
    };
    window.addEventListener("dc-history-updated", schedule);
    window.addEventListener("dc-darts-firefighter-updated", schedule);
    return () => {
      if (timer != null) window.clearTimeout(timer);
      window.removeEventListener("dc-history-updated", schedule);
      window.removeEventListener("dc-darts-firefighter-updated", schedule);
    };
  }, []);

  const cards = React.useMemo(() => COLLECTIBLE_CARDS.filter((card) => {
    const isUnlocked = !!unlocks[card.id];
    if (filter === "awena" || filter === "firefighter") return card.collection === filter;
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    return true;
  }), [filter, unlocks]);

  const unlockedCount = COLLECTIBLE_CARDS.filter((card) => !!unlocks[card.id]).length;
  const selectedCard = selectedCardId ? COLLECTIBLE_CARDS.find((card) => card.id === selectedCardId) || null : null;
  const unlockCard = unlockQueue.length ? COLLECTIBLE_CARDS.find((card) => card.id === unlockQueue[0]) || null : null;

  const labels = lang === "en"
    ? { all:"ALL", awena:"AWENA", firefighter:"FIREFIGHTER", unlocked:"UNLOCKED", locked:"LOCKED", title:"CARD COLLECTION", subtitle:"Complete challenges to permanently unlock cards for this profile.", noProfile:"Select an active profile to start a collection.", progress:"COLLECTION PROGRESS", lockedCard:"LOCKED CARD", unlockedCard:"UNLOCKED", close:"CLOSE", continue:"CONTINUE", justUnlocked:"CARD UNLOCKED", scan:"REFRESH" }
    : lang === "es"
      ? { all:"TODAS", awena:"AWENA", firefighter:"FIREFIGHTER", unlocked:"DESBLOQUEADAS", locked:"BLOQUEADAS", title:"COLECCIÓN DE CARTAS", subtitle:"Completa desafíos para desbloquear cartas permanentemente para este perfil.", noProfile:"Selecciona un perfil activo para iniciar una colección.", progress:"PROGRESO DE COLECCIÓN", lockedCard:"CARTA BLOQUEADA", unlockedCard:"DESBLOQUEADA", close:"CERRAR", continue:"CONTINUAR", justUnlocked:"CARTA DESBLOQUEADA", scan:"ACTUALIZAR" }
      : { all:"TOUTES", awena:"AWENA", firefighter:"FIREFIGHTER", unlocked:"DÉBLOQUÉES", locked:"VERROUILLÉES", title:"COLLECTION DE CARTES", subtitle:"Relève les défis pour débloquer définitivement les cartes de ce profil.", noProfile:"Sélectionne un profil actif pour commencer une collection.", progress:"PROGRESSION COLLECTION", lockedCard:"CARTE VERROUILLÉE", unlockedCard:"DÉBLOQUÉE", close:"FERMER", continue:"CONTINUER", justUnlocked:"CARTE DÉBLOQUÉE", scan:"ACTUALISER" };

  if (!String(profileId || "").trim()) return <div style={{ padding:18, borderRadius:18, border:`1px dashed ${theme.borderSoft}`, textAlign:"center", color:theme.textSoft, fontSize:12 }}>{labels.noProfile}</div>;

  return <div style={{ display:"grid", gap:12 }}>
    <style>{`@keyframes mscCardUnlockPop{0%{opacity:0;transform:scale(.72) rotate(-2deg);filter:brightness(2)}62%{opacity:1;transform:scale(1.035) rotate(.5deg);filter:brightness(1.18)}100%{opacity:1;transform:scale(1) rotate(0);filter:brightness(1)}} @keyframes mscCardUnlockGlow{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:.95;transform:scale(1.05)}}`}</style>

    <section style={{ padding:13, borderRadius:18, border:`1px solid ${theme.primary}55`, background:`linear-gradient(135deg, ${theme.primary}18, rgba(0,0,0,.24))`, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        <div style={{ minWidth:0 }}><div style={{ color:theme.primary, fontWeight:1000, fontSize:13, letterSpacing:.8 }}>{labels.title}</div><div style={{ color:theme.textSoft, fontSize:10.5, marginTop:3, lineHeight:1.4 }}>{labels.subtitle}</div></div>
        <button type="button" onClick={() => setScanNonce((n) => n + 1)} disabled={loading} style={{ border:`1px solid ${theme.primary}66`, background:`${theme.primary}18`, color:theme.primary, borderRadius:999, padding:"7px 9px", fontWeight:950, fontSize:9.5, cursor:"pointer", opacity:loading ? .55 : 1 }}>{loading ? "…" : `↻ ${labels.scan}`}</button>
      </div>
      <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"end" }}>
        <div><div style={{ display:"flex", justifyContent:"space-between", gap:8, color:theme.textSoft, fontSize:9.5, fontWeight:900 }}><span>{labels.progress}</span><strong style={{ color:theme.text }}>{unlockedCount}/{COLLECTIBLE_CARDS.length}</strong></div><div style={{ height:7, borderRadius:999, background:"rgba(255,255,255,.08)", overflow:"hidden", marginTop:6 }}><div style={{ width:`${(unlockedCount / COLLECTIBLE_CARDS.length) * 100}%`, height:"100%", borderRadius:999, background:`linear-gradient(90deg, ${theme.primary}, #ffffff)` }} /></div></div>
        <div style={{ color:theme.text, fontSize:10, fontWeight:950, maxWidth:104, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profileName || "—"}</div>
      </div>
    </section>

    <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2, scrollbarWidth:"none" }}>
      <FilterButton active={filter === "all"} label={labels.all} onClick={() => setFilter("all")} />
      <FilterButton active={filter === "awena"} label={labels.awena} onClick={() => setFilter("awena")} />
      <FilterButton active={filter === "firefighter"} label={labels.firefighter} onClick={() => setFilter("firefighter")} />
      <FilterButton active={filter === "unlocked"} label={labels.unlocked} onClick={() => setFilter("unlocked")} />
      <FilterButton active={filter === "locked"} label={labels.locked} onClick={() => setFilter("locked")} />
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(0,1fr))", gap:10 }}>
      {cards.map((card) => {
        const isUnlocked = !!unlocks[card.id];
        const progress = cardRequirementProgress(card, metrics);
        return <button key={card.id} type="button" onClick={() => setSelectedCardId(card.id)} style={{ minWidth:0, padding:0, borderRadius:16, overflow:"hidden", border:`1px solid ${isUnlocked ? `${card.accent}aa` : theme.borderSoft}`, background:"rgba(0,0,0,.28)", boxShadow:isUnlocked ? `0 0 18px ${card.accent}24` : "none", cursor:"pointer", textAlign:"left" }}>
          <div style={{ position:"relative", aspectRatio:CARD_PREVIEW_ASPECT_RATIO, overflow:"hidden", background:"radial-gradient(circle at 50% 18%, rgba(255,255,255,.08), rgba(3,3,3,1) 58%)", display:"grid", placeItems:"center", padding:8 }}>
            <img src={IMAGE_BY_CARD[card.id]} alt={card.name} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"contain", objectPosition:"center center", display:"block", filter:isUnlocked ? "none" : "grayscale(.9) brightness(.34)", transform:"none" }} />
            {!isUnlocked && <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", background:"linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.45))" }}><div style={{ width:48, height:48, borderRadius:999, display:"grid", placeItems:"center", background:"rgba(0,0,0,.72)", border:"1px solid rgba(255,255,255,.25)", fontSize:20, boxShadow:"0 8px 22px rgba(0,0,0,.55)" }}>🔒</div></div>}
            <div style={{ position:"absolute", left:7, right:7, bottom:7, borderRadius:999, background:"rgba(0,0,0,.7)", overflow:"hidden", height:6, border:"1px solid rgba(255,255,255,.15)" }}><div style={{ width:`${Math.round(progress * 100)}%`, height:"100%", background:isUnlocked ? card.accent : theme.primary }} /></div>
          </div>
          <div style={{ padding:"9px 9px 10px" }}><div style={{ fontSize:10.5, fontWeight:1000, color:isUnlocked ? card.accent : theme.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{card.name}</div><div style={{ fontSize:8.8, color:theme.textSoft, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{localText(lang, card.subtitle)}</div>{!isUnlocked ? <div style={{ marginTop:7 }}><ProgressRequirements card={card} metrics={metrics} lang={lang} /></div> : <div style={{ marginTop:6, fontSize:9, color:"#67e7a4", fontWeight:950 }}>✓ {labels.unlockedCard}</div>}</div>
        </button>;
      })}
    </div>

    {selectedCard && <div role="dialog" aria-modal="true" onClick={() => setSelectedCardId(null)} style={{ position:"fixed", inset:0, zIndex:12000, background:"rgba(0,0,0,.88)", backdropFilter:"blur(9px)", display:"grid", placeItems:"center", padding:16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"min(94vw,520px)", maxHeight:"92vh", overflowY:"auto", borderRadius:22, border:`1px solid ${selectedCard.accent}88`, background:"#090b10", boxShadow:`0 0 42px ${selectedCard.accent}30`, padding:10 }}>
        <div style={{ position:"relative", borderRadius:16, overflow:"hidden", background:"#000" }}><img src={IMAGE_BY_CARD[selectedCard.id]} alt={selectedCard.name} style={{ width:"100%", maxHeight:"68vh", objectFit:"contain", display:"block", filter:unlocks[selectedCard.id] ? "none" : "grayscale(.9) brightness(.38)" }} />{!unlocks[selectedCard.id] && <div style={{ position:"absolute", inset:0, display:"grid", placeItems:"center", pointerEvents:"none", fontSize:38 }}>🔒</div>}</div>
        <div style={{ padding:"11px 5px 4px" }}><div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"baseline" }}><div><div style={{ color:selectedCard.accent, fontSize:14, fontWeight:1000 }}>{selectedCard.name}</div><div style={{ color:theme.textSoft, fontSize:10, marginTop:2 }}>{localText(lang, selectedCard.subtitle)}</div></div><div style={{ fontSize:9.5, color:unlocks[selectedCard.id] ? "#67e7a4" : theme.textSoft, fontWeight:950 }}>{unlocks[selectedCard.id] ? `✓ ${labels.unlockedCard}` : `🔒 ${labels.lockedCard}`}</div></div>{!unlocks[selectedCard.id] && <div style={{ marginTop:10 }}><ProgressRequirements card={selectedCard} metrics={metrics} lang={lang} /></div>}<button type="button" onClick={() => setSelectedCardId(null)} style={{ width:"100%", marginTop:12, border:`1px solid ${selectedCard.accent}88`, background:`${selectedCard.accent}18`, color:selectedCard.accent, borderRadius:999, padding:"10px 12px", fontWeight:1000, fontSize:10.5, cursor:"pointer" }}>{labels.close}</button></div>
      </div>
    </div>}

    {unlockCard && <div role="dialog" aria-modal="true" style={{ position:"fixed", inset:0, zIndex:13000, display:"grid", placeItems:"center", padding:14, background:"radial-gradient(circle at 50% 40%, rgba(255,255,255,.12), rgba(0,0,0,.94) 58%)", backdropFilter:"blur(10px)" }}>
      <div style={{ position:"absolute", width:"min(82vw,430px)", aspectRatio:"1", borderRadius:999, border:`2px solid ${unlockCard.accent}66`, boxShadow:`0 0 90px ${unlockCard.accent}77`, animation:"mscCardUnlockGlow 1.7s ease-in-out infinite" }} />
      <div style={{ width:"min(88vw,430px)", position:"relative", zIndex:2, textAlign:"center" }}><div style={{ color:unlockCard.accent, fontSize:16, fontWeight:1100, letterSpacing:1.3, textShadow:`0 0 22px ${unlockCard.accent}` }}>{labels.justUnlocked}</div><div style={{ color:"#fff", fontSize:11, fontWeight:900, marginTop:3, marginBottom:10 }}>{unlockCard.name}</div><img src={IMAGE_BY_CARD[unlockCard.id]} alt={unlockCard.name} style={{ width:"100%", maxHeight:"70vh", objectFit:"contain", display:"block", filter:`drop-shadow(0 0 28px ${unlockCard.accent}66)`, animation:"mscCardUnlockPop .72s cubic-bezier(.17,.84,.28,1.24) both" }} /><button type="button" onClick={() => setUnlockQueue((prev) => prev.slice(1))} style={{ width:"100%", marginTop:10, border:`1px solid ${unlockCard.accent}`, background:unlockCard.accent, color:"#050505", borderRadius:999, padding:"11px 14px", fontWeight:1100, fontSize:11, cursor:"pointer" }}>{labels.continue}{unlockQueue.length > 1 ? ` · ${unlockQueue.length - 1}` : ""}</button></div>
    </div>}
  </div>;
}
