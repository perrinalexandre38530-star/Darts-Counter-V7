import React from "react";
import { InlineAdBanner } from "../monetization/AdSlot";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { canRequestBannerAds, getVerifiedAdFreeState, loadMonetizationPrefs,
  subscribeMonetizationPrefs, subscribeVerifiedEntitlements } from "../monetization/prefs";
import { CricketMarkIcon } from "./MaskIcon";
import { getShoveValidatedCells } from "../lib/gameEngines/shoveAPennyValidatedMarks";
import "./ShoveMatchMidZone.css";

type Props = {
  state: any;
  activePlayerId?: string;
  accent: string;
  showAd: boolean;
};

/**
 * Marques définitivement enregistrées du joueur actif : ni saisies en cours,
 * ni progression des adversaires. Le récapitulatif des records vit dans STATS.
 */
export default function ShoveMatchMidZone({ state, activePlayerId, accent, showAd }: Props) {
  const zoneRef = React.useRef<HTMLDivElement | null>(null);
  const [freeHeight, setFreeHeight] = React.useState(0);
  const [prefs, setPrefs] = React.useState(() => loadMonetizationPrefs());
  const [adFree, setAdFree] = React.useState(() => getVerifiedAdFreeState().active);
  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);
  React.useEffect(() => subscribeVerifiedEntitlements(() => setAdFree(getVerifiedAdFreeState().active)), []);
  React.useEffect(() => {
    const node = zoneRef.current;
    if (!node) return;
    const measure = () => setFreeHeight(node.getBoundingClientRect().height);
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  const playerId = String(activePlayerId || state?.players?.[state?.activePlayerIndex || 0]?.id || "");
  const player = (state?.players || []).find((p: any) => String(p.id) === playerId);
  const cells = getShoveValidatedCells(state, playerId);
  const required = Math.max(2, Math.min(5, Number(state?.config?.modeOptions?.marksPerBox || 3)));
  const hasPlayer = Boolean(playerId && player);
  const electronic = String(state?.config?.modeOptions?.ruleSet || "traditional") === "electronic";

  // Don't crowd the keypad: a real ad is optional and requires spare vertical room.
  // Never reserve blank pixels when banners are disabled or ad-free is active.
  const adInventoryAvailable = isCapacitorNativeRuntime() || prefs.houseAdsEnabled || prefs.testMode;
  const displayAd = showAd && adInventoryAvailable && canRequestBannerAds(prefs) && !adFree && freeHeight >= 120;

  return <div ref={zoneRef} data-shove-mid-zone={hasPlayer ? "validated-marks" : "empty"}
    className="mss-shove-mid-zone" style={{ "--shove-mid-accent": accent } as React.CSSProperties}>
    {hasPlayer ? <div className="mss-shove-validated-band" data-shove-validated-marks="1"
      role="region" aria-label={`Marques validées de ${player.name || "ce joueur"}`}>
      <div className={`mss-shove-validated-scroll${electronic ? " is-electronic" : ""}`} tabIndex={0} aria-label="Faire défiler les cases horizontalement">
        {cells.map(({ target, count, closed }) => {
          return <div key={target} className={closed ? "mss-shove-validated-case is-closed" : "mss-shove-validated-case"}
            aria-label={`${target === 25 ? "BULL" : target} : ${count} marque${count > 1 ? "s" : ""} validée${count > 1 ? "s" : ""} sur ${required}`}>
            <b className="mss-shove-validated-value">{target === 25 ? "BULL" : target}</b>
            <span className="mss-shove-validated-symbol" aria-hidden="true">
              {count > 0 ? <CricketMarkIcon marks={Math.min(3, count)} color={accent} size={26} glow={closed} /> : <span className="mss-shove-validated-empty">—</span>}
              {count > 3 ? <small className="mss-shove-validated-extra">+{count - 3}</small> : null}
            </span>
          </div>;
        })}
      </div>
    </div> : null}
    {displayAd ? <div data-shove-play-ad="1" className="mss-shove-play-ad">
      <InlineAdBanner placement="games" slotKey="games-shove-a-penny-play" compact style={{ margin: 0, width: "100%", maxWidth: 470 }} />
    </div> : null}
  </div>;
}
