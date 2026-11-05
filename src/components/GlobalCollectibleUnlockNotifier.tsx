import * as React from "react";
import { createPortal } from "react-dom";
import { useLang } from "../contexts/LangContext";
import { IMAGE_BY_CARD } from "../lib/collectibleCardImages";
import { playCollectibleUnlockSound } from "../lib/collectibleUnlockSound";
import {
  COLLECTIBLE_CARDS,
  computeCollectibleMetrics,
  reconcileCollectibleUnlocks,
  type CollectibleCardId,
  type CollectibleUnlockMap,
} from "../lib/collectibleCards";

type Props = {
  profileId: string;
  persistedUnlocks?: CollectibleUnlockMap | null;
  onPersistUnlocks: (profileId: string, unlocks: CollectibleUnlockMap) => void | Promise<void>;
};

// Monté UNE SEULE FOIS par App, indépendamment des routes.
// Les statistiques sont relues après un événement History V4 (pas à chaque dart
// ni à chaque re-render), et jamais dans le render React.
export default function GlobalCollectibleUnlockNotifier({ profileId, persistedUnlocks, onPersistUnlocks }: Props) {
  const { lang } = useLang();
  const [queue, setQueue] = React.useState<CollectibleCardId[]>([]);
  const [visible, setVisible] = React.useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const knownUnlocks = React.useRef<CollectibleUnlockMap>({ ...(persistedUnlocks || {}) });
  const onPersistRef = React.useRef(onPersistUnlocks);
  const aliveRef = React.useRef(true);
  const scanning = React.useRef(false);
  const scanAgain = React.useRef(false);
  const playedRef = React.useRef<Set<string>>(new Set());
  const pendingTimer = React.useRef<number | null>(null);

  onPersistRef.current = onPersistUnlocks;
  // Les états venant du profil RESTAURÉ/du NAS sont prioritaires et ne doivent
  // jamais être supprimés par une réconciliation asynchrone.
  if (persistedUnlocks) Object.assign(knownUnlocks.current, persistedUnlocks);

  React.useEffect(() => {
    aliveRef.current = true;
    const id = String(profileId || "").trim();
    if (!id) return;
    let changedWhileHidden = false;
    let pendingNotify = false;
    let idleId: number | null = null;

    const scan = async (notify: boolean) => {
      if (!aliveRef.current) return;
      if (scanning.current) {
        scanAgain.current = true;
        pendingNotify = pendingNotify || notify;
        return;
      }
      scanning.current = true;
      try {
        const metrics = await computeCollectibleMetrics(id);
        if (!aliveRef.current) return;
        const { unlocks, newlyUnlocked } = reconcileCollectibleUnlocks(knownUnlocks.current, metrics);
        knownUnlocks.current = unlocks;
        if (newlyUnlocked.length) {
          // Sauvegarder dès la découverte, même si le navigateur est caché.
          // La première lecture au démarrage est SILENCIEUSE : les anciennes
          // parties déjà éligibles n'ouvrent pas 50 popups d'un seul coup.
          try { await onPersistRef.current(id, unlocks); } catch {}
          if (notify && aliveRef.current) {
            const fresh = newlyUnlocked.filter((key) => {
              if (playedRef.current.has(key)) return false;
              playedRef.current.add(key);
              return true;
            });
            if (fresh.length) setQueue((prev) => [...prev, ...fresh]);
          }
        }
      } catch {
        // La sauvegarde / la restauration peut transitoirement être indisponible.
        // Les prochains événements réessaieront sans bloquer le rendu.
      } finally {
        scanning.current = false;
        if (scanAgain.current && aliveRef.current) {
          scanAgain.current = false;
          const afterNotify = pendingNotify;
          pendingNotify = false;
          void scan(afterNotify);
        }
      }
    };
    const schedule = (notify = true, delayMs = 850) => {
      if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(() => {
        pendingTimer.current = null;
        void scan(notify);
      }, delayMs);
    };
    const liveEvent = () => {
      if (document.visibilityState !== "visible") changedWhileHidden = true;
      schedule(true);
    };
    const showOnReturn = () => {
      const isVisible = document.visibilityState === "visible";
      setVisible(isVisible);
      if (isVisible && changedWhileHidden) {
        changedWhileHidden = false;
        schedule(true, 1000);
      }
    };
    window.addEventListener("dc-history-updated", liveEvent);
    window.addEventListener("dc-darts-firefighter-updated", liveEvent);
    window.addEventListener("dc:collectible-check", liveEvent);
    document.addEventListener("visibilitychange", showOnReturn);
    // Sur mobile, ne pas imposer un scan History V4 au milieu du boot.
    // requestIdleCallback n'a volontairement PAS de timeout forcé.
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(() => { idleId = null; void scan(false); });
    } else {
      schedule(false, 3500);
    }
    return () => {
      aliveRef.current = false;
      if (idleId !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      if (pendingTimer.current !== null) window.clearTimeout(pendingTimer.current);
      window.removeEventListener("dc-history-updated", liveEvent);
      window.removeEventListener("dc-darts-firefighter-updated", liveEvent);
      window.removeEventListener("dc:collectible-check", liveEvent);
      document.removeEventListener("visibilitychange", showOnReturn);
    };
  }, [profileId]);

  const card = queue.length ? COLLECTIBLE_CARDS.find((entry) => entry.id === queue[0]) || null : null;
  const next = React.useCallback(() => setQueue((prev) => prev.slice(1)), []);
  const clear = React.useCallback(() => setQueue([]), []);

  React.useEffect(() => {
    if (!card || !visible) return;
    playCollectibleUnlockSound(card.collection);
  }, [card?.id, visible]);
  React.useEffect(() => {
    if (!card || !visible) return;
    // Après quelques secondes, on libère le jeu automatiquement ; les cartes
    // restent définitivement disponibles dans la galerie.
    const timer = window.setTimeout(next, 7500);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") next(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [card?.id, visible, next]);

  if (!card || !visible || typeof document === "undefined") return null;
  const text = String(lang).toLowerCase().startsWith("fr")
    ? { headline: "CARTE DÉBLOQUÉE !", detail: "Nouvelle récompense dans ta collection", next: "CONTINUER", skip: "TOUT FERMER" }
    : { headline: "CARD UNLOCKED!", detail: "New reward added to your collection", next: "CONTINUE", skip: "CLOSE ALL" };
  return createPortal(<>
    <style>{`@keyframes msc-global-unlock-entrance {from{opacity:0;transform:translateY(20px) scale(.65) rotate(-3deg)}60%{opacity:1;transform:translateY(-7px) scale(1.035) rotate(.5deg)}to{opacity:1;transform:translateY(0) scale(1) rotate(0)}}@keyframes msc-global-unlock-aura{0%,100%{opacity:.35;transform:scale(.95)}50%{opacity:.85;transform:scale(1.07)}}@media(prefers-reduced-motion:reduce){.msc-unlock-card,.msc-unlock-halo{animation:none!important}}`}</style>
    <div role="dialog" aria-modal="true" aria-label={`${text.headline} ${card.name}`} style={{
      position:"fixed",inset:0,zIndex:2147483000,display:"grid",placeItems:"center",
      padding:"max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
      background:"radial-gradient(ellipse at center,rgba(30,24,6,.92),rgba(0,0,0,.96) 64%)",backdropFilter:"blur(10px)",
    }}>
      <div className="msc-unlock-halo" aria-hidden="true" style={{position:"absolute",width:"min(80vw,420px)",aspectRatio:"1",borderRadius:"50%",border:`1px solid ${card.accent}77`,boxShadow:`0 0 90px ${card.accent}66`,pointerEvents:"none",animation:"msc-global-unlock-aura 1.9s ease-in-out infinite"}}/>
      <div style={{position:"relative",width:"min(92vw,405px)",maxHeight:"96dvh",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:6}}>
        <div style={{color:card.accent,fontWeight:1000,fontSize:"clamp(15px,4vw,20px)",letterSpacing:1.4,textShadow:`0 0 20px ${card.accent}80`}}>✦ {text.headline} ✦</div>
        <div style={{color:"#e9e2d1",fontSize:11,fontWeight:750}}>{text.detail}</div>
        <img key={card.id} className="msc-unlock-card" src={card.image || IMAGE_BY_CARD[card.id] || ""} alt={card.name} style={{width:"min(100%, 350px)",maxHeight:"min(68dvh, 590px)",objectFit:"contain",filter:`drop-shadow(0 0 23px ${card.accent}44)`,animation:"msc-global-unlock-entrance .65s cubic-bezier(.17,.84,.28,1.24) both"}}/>
        <div style={{color:"#fff",fontWeight:1000,letterSpacing:1.1,fontSize:12}}>{card.name}</div>
        <div style={{display:"flex",width:"100%",gap:8,marginTop:5}}>
          <button type="button" onClick={next} style={{flex:1,border:`1px solid ${card.accent}`,borderRadius:999,background:card.accent,color:"#121008",padding:"12px 10px",fontWeight:950,cursor:"pointer"}}>{text.next}{queue.length > 1 ? ` (${queue.length - 1})` : ""}</button>
          {queue.length > 1 && <button type="button" onClick={clear} style={{border:"1px solid #ffffff66",borderRadius:999,background:"#ffffff18",color:"white",padding:"12px 11px",fontWeight:900,cursor:"pointer"}}>{text.skip}</button>}
        </div>
      </div>
    </div>
  </>, document.body);
}
