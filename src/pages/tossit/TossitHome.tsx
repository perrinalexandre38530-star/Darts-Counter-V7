// HOME TOSSIT SCORING — sport-specific homepage consistent with other MSS sports.
// History V4 remains the authoritative source for finished results.
import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import type { Profile, Store } from "../../lib/types";
import { useHistory } from "../../hooks/useHistory";
import { PageAdBanner } from "../../monetization/AdSlot";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";
import SportHomeWelcomeHeader from "../../components/home/SportHomeWelcomeHeader";
import { TOSSIT_MODES } from "./tossitEngine";

import decor from "../../assets/tossit/tossit_menu_decor.webp";
import tickerClassic from "../../assets/tickers/ticker_tossit_classic.webp";
import tickerGames from "../../assets/tickers/ticker_tossit_games.webp";
import tickerBattleFr from "../../assets/tickers/ticker_tossit_battle_fr.webp";
import tickerBattleEn from "../../assets/tickers/ticker_tossit_battle_en.webp";
import tickerConquestFr from "../../assets/tickers/ticker_tossit_conquest_fr.webp";
import tickerConquestEn from "../../assets/tickers/ticker_tossit_conquest_en.webp";
import tickerRiverFr from "../../assets/tickers/ticker_tossit_river_fr.webp";
import tickerRiverEn from "../../assets/tickers/ticker_tossit_river_en.webp";

const PAD: React.CSSProperties = { width: "100%", maxWidth: 620, paddingInline: 10, boxSizing: "border-box" };
const ACCENT = "#48e7cf";
type Props = { store: Store; update?: (mut: any) => void; go: (route: any, params?: any) => void };

function isTossitMatch(row: any): boolean {
  return (row?.kind === "tossit" || row?.sport === "tossit" || row?.payload?.sport === "tossit") &&
    (row?.status === "finished" || row?.summary?.finished === true);
}

export default function TossitHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const fr = String(lang || "fr").toLowerCase().startsWith("fr");
  const tr = (f: string, e: string) => fr ? f : e;
  const { rows, loading } = useHistory();
  const profile: Profile | null = React.useMemo(() => {
    const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
    return profiles.find((p) => p.id === store?.activeProfileId) ?? profiles[0] ?? null;
  }, [store?.profiles, store?.activeProfileId]);

  const overview = React.useMemo(() => {
    const results = (Array.isArray(rows) ? rows : []).filter(isTossitMatch);
    // Keep only unique matches (not a mixture of history snapshots and derived stats).
    const unique = Array.from(new Map(results.map((r: any) => [String(r?.id || r?.matchId || ""), r])).values());
    const id = String(profile?.id || "");
    const mine = unique.filter((r: any) => id && (r?.players ?? r?.payload?.players ?? []).some((p: any) => String(p?.id) === id));
    const wins = mine.filter((r: any) => String(r?.winnerId ?? r?.summary?.winnerId ?? "") === id).length;
    const last = [...unique].sort((a: any, b: any) => {
      const date = (r: any) => Number(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt) || Date.parse(String(r?.finishedAt ?? r?.updatedAt ?? r?.createdAt ?? "")) || 0;
      return date(b) - date(a);
    })[0] as any;
    const lastMode = String(last?.mode ?? last?.summary?.mode ?? last?.payload?.mode ?? "");
    const lastWinnerId = String(last?.winnerId ?? last?.summary?.winnerId ?? "");
    const lastWinner = (last?.players ?? last?.payload?.players ?? []).find((p: any) => String(p?.id) === lastWinnerId)?.name || "—";
    return { games: mine.length, total: unique.length, wins, winRate: mine.length ? Math.round(100 * wins / mine.length) : 0, lastMode, lastWinner };
  }, [rows, profile?.id]);

  const tickerItems: ArcadeTickerItem[] = React.useMemo(() => [
    { id: "tossit-classic", title: tr("TOSSIT CLASSIC", "TOSSIT CLASSIC"), text: tr("Le cochonnet noir, la précision et 13 points à atteindre", "Black jack, precision and a 13-point target"), backgroundImage: tickerClassic, accentColor: ACCENT },
    { id: "tossit-battle", title: tr("MODE BATAILLE", "BATTLE MODE"), text: tr("Affrontez-vous à chaque manche", "Go head-to-head every round"), backgroundImage: fr ? tickerBattleFr : tickerBattleEn, accentColor: "#ffbd57" },
    { id: "tossit-colors", title: tr("CONQUÊTE COULEURS", "COLOR CONQUEST"), text: tr("Défiez votre adversaire par couleur", "Challenge your rival by colour"), backgroundImage: fr ? tickerConquestFr : tickerConquestEn, accentColor: "#ed93ff" },
    { id: "tossit-river", title: "RIVER", text: tr("Traversez la rivière sans pénalité", "Cross the river without a penalty"), backgroundImage: fr ? tickerRiverFr : tickerRiverEn, accentColor: "#69cfff" },
  ], [fr]);

  const actionStyle: React.CSSProperties = { cursor: "pointer", minHeight: 43, borderRadius: 12, border: "1px solid rgba(110,229,215,.4)", background: "rgba(16,31,40,.94)", color: theme.text || "#fff", padding: "10px 14px", fontWeight: 800, flex: "1 1 150px" };
  const cardStyle: React.CSSProperties = { border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,.15)"}`, borderRadius: 18, overflow: "hidden", background: "rgba(10,18,27,.88)", marginBottom: 12 };
  const modes = TOSSIT_MODES.length;

  return <div className="msc-home-page msc-sport-home-page tossit-home" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div className="msc-landscape-page-shell msc-home-layout msc-sport-home-layout">
      <div className="msc-landscape-header msc-sport-home-header">
        <div className="msc-sport-home-header-inner" style={PAD}>
          <SportHomeWelcomeHeader sport="tossit" title="TOSSIT SCORING" welcome={tr("Bienvenue", "Welcome")} accent={ACCENT} borderSoft={theme.borderSoft}/>
        </div>
      </div>

      <section className="msc-landscape-primary msc-home-primary msc-sport-home-primary">
        <div className="msc-home-ad msc-home-ad--top" style={{ ...PAD, marginBottom: 0 }}>
          <PageAdBanner placement="home" slotKey="page-home-tossit-under-header"/>
        </div>
        <div className="msc-home-profile-slot msc-sport-home-profile" style={PAD}>
          <ActiveProfileCard hideStatus suppressDefaultStatsSlides profile={profile} stats={{} as any}
            globalTitle={tr("Mes résultats TOSSIT", "My TOSSIT results")}
            globalKpis={[
              { label: tr("Parties", "Games"), value: loading ? "…" : overview.games },
              { label: tr("Victoires", "Wins"), value: loading ? "…" : overview.wins },
              { label: tr("Réussite", "Win rate"), value: loading ? "…" : `${overview.winRate}%` },
              { label: tr("Parties enregistrées", "Recorded matches"), value: loading ? "…" : overview.total },
            ]}
          />
        </div>
        <div style={PAD}>
          <div style={cardStyle}>
            <img src={decor} alt="" aria-hidden="true" style={{ width: "100%", height: "auto", display: "block" }}/>
            <div style={{ padding: "10px 14px", color: theme.text || "#fff", fontSize: 13, lineHeight: 1.5 }}>
              <strong>{tr("Dernière partie", "Latest match")} :</strong> {loading ? "…" : overview.lastMode ? `${overview.lastMode.toUpperCase()} · ${overview.lastWinner}` : tr("Aucune partie enregistrée pour le moment.", "No matches recorded yet.")}
            </div>
          </div>
        </div>
      </section>

      <aside className="msc-landscape-secondary msc-home-secondary msc-sport-home-secondary">
        <div className="msc-sport-home-right-card" style={{ ...PAD, marginBottom: 12 }}>
          <ArcadeTicker items={tickerItems} intervalMs={7000}/>
        </div>
        <div className="msc-sport-home-actions" style={{ ...PAD, display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 12 }}>
          <button type="button" style={{ ...actionStyle, background: ACCENT, color: "#06141c" }} onClick={() => go("tossit_config", { mode: "classic" })}>{tr("NOUVELLE PARTIE", "NEW GAME")}</button>
          <button type="button" style={actionStyle} onClick={() => go("games")}>{tr("TOUS LES MODES", "GAME MODES")} ({modes})</button>
          <button type="button" style={actionStyle} onClick={() => go("stats")}>{tr("HISTORIQUE & STATS", "HISTORY & STATS")}</button>
        </div>
        <div style={PAD}>
          <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
            <button type="button" onClick={() => go("tossit_config", { mode: "river" })} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#fff", padding: 0, minWidth: 0 }}>
              <img src={fr ? tickerRiverFr : tickerRiverEn} alt="" style={{ width: "100%", height: 68, objectFit: "cover" }}/>
              <span style={{ display: "block", padding: "8px 5px", fontSize: 12, fontWeight: 800 }}>RIVER</span>
            </button>
            <button type="button" onClick={() => go("tossit_config", { mode: "battle" })} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#fff", padding: 0, minWidth: 0 }}>
              <img src={fr ? tickerBattleFr : tickerBattleEn} alt="" style={{ width: "100%", height: 68, objectFit: "cover" }}/>
              <span style={{ display: "block", padding: "8px 5px", fontSize: 12, fontWeight: 800 }}>{tr("BATAILLE", "BATTLE")}</span>
            </button>
          </div>
          <img src={tickerGames} alt="" aria-hidden="true" style={{ display: "block", width: "100%", borderRadius: 16, maxHeight: 125, objectFit: "cover" }}/>
        </div>
      </aside>
    </div>
  </div>;
}
