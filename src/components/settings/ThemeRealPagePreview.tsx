import React from "react";
import { ThemePreviewScope, useTheme } from "../../contexts/ThemeContext";
import { useStore } from "../../contexts/StoreContext";
import { useSport } from "../../contexts/SportContext";
import type { ThemeId } from "../../theme/themePresets";

const Home = React.lazy(() => import("../../pages/Home"));
const Games = React.lazy(() => import("../../pages/Games"));
const Profiles = React.lazy(() => import("../../pages/Profiles"));
const FriendsPage = React.lazy(() => import("../../pages/FriendsPage"));
const StatsShell = React.lazy(() => import("../../pages/StatsShell"));

const PetanqueHome = React.lazy(() => import("../../pages/petanque/PetanqueHome"));
const PetanqueMenuGames = React.lazy(() => import("../../pages/petanque/PetanqueMenuGames"));
const PetanqueStatsShell = React.lazy(() => import("../../pages/petanque/PetanqueStatsShell"));
const BabyFootHome = React.lazy(() => import("../../pages/babyfoot/BabyFootHome"));
const BabyFootMenuGames = React.lazy(() => import("../../pages/babyfoot/BabyFootMenuGames"));
const BabyFootStatsShell = React.lazy(() => import("../../pages/babyfoot/BabyFootStatsShell"));
const PingPongHome = React.lazy(() => import("../../pages/pingpong/PingPongHome"));
const PingPongMenuGames = React.lazy(() => import("../../pages/pingpong/PingPongMenuGames"));
const PingPongStatsShell = React.lazy(() => import("../../pages/pingpong/PingPongStatsShell"));
const MolkkyHome = React.lazy(() => import("../../pages/molkky/MolkkyHome"));
const MolkkyMenuGames = React.lazy(() => import("../../pages/molkky/MolkkyMenuGames"));
const MolkkyStatsShell = React.lazy(() => import("../../pages/molkky/MolkkyStatsShell"));
const DiceHome = React.lazy(() => import("../../pages/dice/DiceHome"));
const DiceMenuGames = React.lazy(() => import("../../pages/dice/DiceMenuGames"));
const RunningHome = React.lazy(() => import("../../pages/running/RunningHome"));
const RunningModule = React.lazy(() => import("../../pages/running/RunningModule"));
const RunningStatsPage = React.lazy(() => import("../../pages/running/RunningStatsPage"));
const FitPerfHome = React.lazy(() => import("../../pages/fit/FitPerfHome"));
const FitPerfModule = React.lazy(() => import("../../pages/fit/FitPerfModule"));
const FootMenuGames = React.lazy(() => import("../../pages/foot/FootMenuGames"));

const PREVIEW_WIDTH = 428;
const PREVIEW_HEIGHT = 650;

type PreviewTab = "home" | "games" | "profiles" | "stats" | "online";

function PreviewContent({ tab, sport, store }: { tab: PreviewTab; sport: string; store: any }) {
  const noopGo = React.useCallback((_tab: any, _params?: any) => {}, []);
  const noopUpdate = React.useCallback((_mut: any) => {}, []);
  const noopSetProfiles = React.useCallback((_fn: any) => {}, []);
  const lc = String(sport || "darts").toLowerCase();

  if (tab === "home") {
    if (lc === "petanque") return <PetanqueHome store={store} go={noopGo} />;
    if (lc === "molkky") return <MolkkyHome store={store} go={noopGo} />;
    if (lc === "dicegame") return <DiceHome store={store} go={noopGo} />;
    if (lc === "babyfoot") return <BabyFootHome store={store} update={noopUpdate} go={noopGo} />;
    if (lc === "pingpong") return <PingPongHome store={store} go={noopGo} />;
    if (lc === "running") return <RunningHome store={store} go={noopGo} />;
    if (lc === "fit") return <FitPerfHome store={store} go={noopGo} />;
    return <Home store={store} update={noopUpdate} go={noopGo} activeSport={sport as any} />;
  }

  if (tab === "games") {
    if (lc === "petanque") return <PetanqueMenuGames go={noopGo} />;
    if (lc === "molkky") return <MolkkyMenuGames go={noopGo} />;
    if (lc === "dicegame") return <DiceMenuGames go={noopGo} />;
    if (lc === "babyfoot") return <BabyFootMenuGames go={noopGo} store={store} params={null} />;
    if (lc === "pingpong") return <PingPongMenuGames go={noopGo} />;
    if (lc === "running") return <RunningModule go={noopGo} store={store} params={null} />;
    if (lc === "fit") return <FitPerfModule go={noopGo} store={store} params={null} />;
    if (lc === "foot") return <FootMenuGames go={noopGo} store={store} params={null} />;
    return <Games setTab={noopGo} params={null} />;
  }

  if (tab === "profiles") {
    return <Profiles store={store} update={noopUpdate} setProfiles={noopSetProfiles} go={noopGo} params={{ view: "me" }} autoCreate={false} />;
  }

  if (tab === "stats") {
    if (lc === "petanque") return <PetanqueStatsShell store={store} go={noopGo} />;
    if (lc === "molkky") return <MolkkyStatsShell store={store} go={noopGo} />;
    if (lc === "babyfoot") return <BabyFootStatsShell store={store} go={noopGo} />;
    if (lc === "pingpong") return <PingPongStatsShell store={store} go={noopGo} />;
    if (lc === "running") return <RunningStatsPage go={noopGo} params={null} />;
    return <StatsShell store={store} go={noopGo} sportOverride={sport as any} />;
  }

  return <FriendsPage store={store} update={noopUpdate} go={noopGo} />;
}

function RealPreviewViewport({ themeId }: { themeId: ThemeId }) {
  const { theme } = useTheme();
  const storeBridge = useStore();
  const sportCtx = useSport() as any;
  const sport = String(sportCtx?.sport || "darts");
  const store = storeBridge.store ?? storeBridge.getStore?.() ?? { profiles: [], history: [] };
  const hideOnline = ["petanque", "pingpong", "running", "fit"].includes(sport.toLowerCase());
  const pages = React.useMemo(() => (
    hideOnline
      ? (["home", "games", "profiles", "stats"] as PreviewTab[])
      : (["home", "games", "profiles", "stats", "online"] as PreviewTab[])
  ), [hideOnline]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [scrollDown, setScrollDown] = React.useState(false);
  const [scale, setScale] = React.useState(.74);
  const holderRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setPageIndex(0);
    setScrollDown(false);
  }, [themeId, sport]);

  React.useEffect(() => {
    const node = holderRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const width = Math.max(1, node.clientWidth);
      setScale(Math.min(1, width / PREVIEW_WIDTH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const pageTimer = window.setInterval(() => {
      setScrollDown(false);
      setPageIndex((value) => (value + 1) % pages.length);
    }, 6500);
    const scrollTimer = window.setInterval(() => setScrollDown((value) => !value), 3200);
    return () => {
      window.clearInterval(pageTimer);
      window.clearInterval(scrollTimer);
    };
  }, [pages.length]);

  const activeTab = pages[pageIndex] || pages[0];
  const label = activeTab === "home" ? "ACCUEIL" : activeTab === "games" ? "ACTIVITÉ / JEUX" : activeTab === "profiles" ? "PROFILS" : activeTab === "stats" ? "STATISTIQUES" : "EN LIGNE";
  const scrollY = scrollDown ? 170 : 0;
  const frameHeight = 330;

  return (
    <div style={{ width: "100%", borderRadius: 16, border: `1px solid ${theme.primary}70`, background: "#02050a", overflow: "hidden", boxShadow: `0 16px 34px rgba(0,0,0,.58), 0 0 18px ${theme.primary}18` }}>
      <div style={{ minHeight: 24, padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "#050812", borderBottom: `1px solid ${theme.primary}38` }}>
        <div style={{ color: "rgba(255,255,255,.64)", fontSize: 6.8, fontWeight: 1000, letterSpacing: .65 }}>APERÇU PAGE RÉELLE</div>
        <div style={{ color: theme.primary, fontSize: 7.4, fontWeight: 1000, letterSpacing: .45 }}>{label}</div>
      </div>

      <div ref={holderRef} style={{ height: frameHeight, position: "relative", overflow: "hidden", background: "#02050a", pointerEvents: "none", contain: "layout paint size" }}>
        <div style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT * scale, transformOrigin: "top left", transform: `scale(${scale})`, background: theme.pageBackground || theme.bg, overflow: "hidden" }}>
          <div style={{ width: PREVIEW_WIDTH, minHeight: PREVIEW_HEIGHT, transform: `translateY(-${scrollY}px)`, transition: "transform 700ms ease", background: theme.pageBackground || theme.bg }}>
            <React.Suspense fallback={<div style={{ minHeight: PREVIEW_HEIGHT, display: "grid", placeItems: "center", background: theme.bg, color: theme.primary, fontWeight: 1000 }}>CHARGEMENT…</div>}>
              <PreviewContent tab={activeTab} sport={sport} store={store} />
            </React.Suspense>
          </div>
        </div>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.035)", pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 7, display: "flex", justifyContent: "center", gap: 5, pointerEvents: "none", zIndex: 8 }}>
          {pages.map((tab, index) => (
            <span key={tab} style={{ width: index === pageIndex ? 18 : 6, height: 6, borderRadius: 999, background: index === pageIndex ? theme.primary : "rgba(255,255,255,.30)", boxShadow: index === pageIndex ? `0 0 8px ${theme.primary}99` : "0 1px 3px rgba(0,0,0,.65)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThemeRealPagePreview({ themeId }: { themeId: ThemeId | null }) {
  if (!themeId) {
    return <div style={{ minHeight: 190, borderRadius: 16, background: "#02050a", display: "grid", placeItems: "center", color: "rgba(255,255,255,.68)", fontSize: 10, fontWeight: 900 }}>CHOISIS UN THÈME</div>;
  }
  return (
    <ThemePreviewScope themeId={themeId} style={{ width: "100%", backgroundColor: "#02050a", isolation: "isolate" }}>
      <RealPreviewViewport themeId={themeId} />
    </ThemePreviewScope>
  );
}
