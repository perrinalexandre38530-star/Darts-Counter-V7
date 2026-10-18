// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";
import { History } from "../lib/history";
import ScoreInputHub from "../components/ScoreInputHub";
import type { Dart as UIDart } from "../lib/types";
import { buildDartsTelemetry, canonicalToUiDart, canonicalVisitFromUiDarts, exactDartsForScore, scoreDarts } from "../lib/dartsTelemetry";
import targetBull25 from "../assets/challenge_targets/target_bull25.webp";
import targetBull50 from "../assets/challenge_targets/target_bull50.webp";
import { playGolfPerfSfx, playGolfTickerSound, unlockAudio } from "../lib/sfx";

const clamp = (n: number) => {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(180, v));
};

function SuperBullChallengeView({
  spec, cfg, playerRows, playerIdx, scores, currentThrow, botMask, roundIdx, isFinished, winner,
  bullsByP, dbullsByP, dartsByP, bullStreakByP, bestBullStreakByP, perfectVisitsByP, lastBullVisitByP,
  superBullRanking, superBullFx, onBack, onReset, onDart, onUndo,
}: any) {
  const active = playerRows[playerIdx] || playerRows[0] || { name: "Joueur 1" };
  const activeDarts = dartsByP[playerIdx] || 0;
  const activeCentres = (bullsByP[playerIdx] || 0) + (dbullsByP[playerIdx] || 0);
  const precision = activeDarts > 0 ? Math.round((activeCentres / activeDarts) * 100) : 0;
  const objective = Number(cfg.objective || 0);
  const progressMax = objective > 0 ? objective : Math.max(150, Number(cfg.rounds || 1) * 150);
  const progressPct = Math.max(0, Math.min(100, ((scores[playerIdx] || 0) / progressMax) * 100));
  const roundLabel = `${Math.min(roundIdx + 1, Number(cfg.rounds || 1))}/${cfg.rounds}`;
  const throwValue = currentThrow.reduce((sum: number, d: any) => sum + (Number(d?.v) === 25 ? (Number(d?.mult) === 2 ? 50 : 25) : 0), 0);
  const initials = (name: string) => String(name || "J").split(/\s+/).slice(0, 2).map((x: string) => x[0]).join("").toUpperCase();
  const dartLabel = (d: any) => !d ? "—" : Number(d.v) !== 25 ? "MISS" : Number(d.mult) === 2 ? "50" : "25";
  const avatar = (p: any, size = 54) => p?.avatarDataUrl
    ? <img src={p.avatarDataUrl} alt={p.name || "Joueur"} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", border:"2px solid #2bd9ff", boxShadow:"0 0 16px #16c9ff55" }}/>
    : <span style={{ width:size, height:size, borderRadius:"50%", display:"grid", placeItems:"center", background:"radial-gradient(circle at 35% 25%,#33465e,#0a111a 65%)", border:"2px solid #2bd9ff", color:"#fff", fontWeight:1000, boxShadow:"0 0 16px #16c9ff55" }}>{initials(p?.name)}</span>;

  if (isFinished && winner) {
    return <div className="sbx-root">
      <header className="sbx-head">
        <div className="sbx-back"><BackDot onClick={onBack} /></div>
        <img src={spec.tickerSrc} alt="SUPER BULL" />
        <div className="sbx-info"><InfoDot title={spec.infoTitle} content={spec.infoText} /></div>
      </header>
      <main className="sbx-finish">
        <div className="sbx-finish-card">
          <div className="sbx-kicker">SUPER BULL · PARTIE TERMINÉE</div>
          <div className="sbx-trophy">🏆</div>
          <h1>{playerRows[winner.idx]?.name || `Joueur ${winner.idx + 1}`}</h1>
          <div className="sbx-winner-score">{winner.score} <small>PTS</small></div>
          <p>{objective > 0 ? `Objectif ${objective} points atteint / classement final` : `${cfg.rounds} rounds terminés`}</p>
          <div className="sbx-ranking">
            {superBullRanking.map((row: any, rank: number) => {
              const p = playerRows[row.i];
              const darts = dartsByP[row.i] || 0;
              const centres = (bullsByP[row.i] || 0) + (dbullsByP[row.i] || 0);
              const pct = darts ? Math.round((centres / darts) * 100) : 0;
              return <div className={rank === 0 ? "winner" : ""} key={row.i}>
                <b>#{rank + 1}</b>{avatar(p, 40)}<span><strong>{p?.name}</strong><small>{row.score} pts</small></span>
                <em>25 <strong>{bullsByP[row.i] || 0}</strong></em><em>50 <strong>{dbullsByP[row.i] || 0}</strong></em><em>PRÉC. <strong>{pct}%</strong></em><em>SÉRIE <strong>{bestBullStreakByP[row.i] || 0}</strong></em>
              </div>;
            })}
          </div>
          <div className="sbx-finish-actions"><button onClick={onBack}>RETOUR CONFIG</button><button className="primary" onClick={onReset}>REJOUER</button></div>
        </div>
      </main>
      <style>{SUPER_BULL_CHALLENGE_CSS}</style>
    </div>;
  }

  return <div className="sbx-root">
    <header className="sbx-head">
      <div className="sbx-back"><BackDot onClick={onBack} /></div>
      <img src={spec.tickerSrc} alt="SUPER BULL" />
      <div className="sbx-info"><InfoDot title={spec.infoTitle} content={spec.infoText} /></div>
    </header>

    <main className="sbx-layout">
      <section className="sbx-left">
        <div className="sbx-active-player">
          <div className="sbx-active-avatar">{avatar(active, 72)}</div>
          <div className="sbx-active-copy"><small>JOUEUR ACTIF</small><strong>{active.name}</strong><span>{botMask[playerIdx] ? "BOT IA" : "SUPER BULL"}</span></div>
          <div className="sbx-active-score"><small>SCORE</small><b>{scores[playerIdx] || 0}</b>{objective > 0 && <span>/ {objective}</span>}</div>
        </div>
        <div className="sbx-left-kpis"><div><span>BULL25</span><b>{bullsByP[playerIdx] || 0}</b></div><div><span>BULL50</span><b>{dbullsByP[playerIdx] || 0}</b></div><div><span>PRÉCISION</span><b>{precision}%</b></div></div>
        <div className="sbx-left-kpis"><div><span>SÉRIE</span><b>{bullStreakByP[playerIdx] || 0}</b></div><div><span>BEST</span><b>{bestBullStreakByP[playerIdx] || 0}</b></div><div><span>100% CENTRE</span><b>{perfectVisitsByP[playerIdx] || 0}</b></div></div>
        <div className="sbx-roster-title"><b>JOUEURS</b><span>{playerRows.length}</span></div>
        <div className="sbx-roster">
          {playerRows.map((p: any, i: number) => <div key={p.id || i} className={i === playerIdx ? "active" : ""}>{avatar(p, 38)}<span><b>{p.name}</b><small>{botMask[i] ? "BOT" : `${dartsByP[i] || 0} fl.`}</small></span><strong>{scores[i] || 0}</strong></div>)}
        </div>
      </section>

      <section className="sbx-board">
        <div className="sbx-board-caption"><span>SUPER BULL · CENTRE DE CIBLE</span><b>{objective > 0 ? `${scores[playerIdx] || 0} / ${objective}` : `${scores[playerIdx] || 0} PTS`}</b><small>VOLÉE {roundLabel} · {currentThrow.length}/3 FLÉCHETTES</small></div>
        <div className="sbx-board-media">
          <div className="sbx-board-glow"/>
          <div className={`sbx-bull-stage ${superBullFx ? `is-${superBullFx.type}` : ""}`}>
            <div className={`sbx-bull-display ${superBullFx?.type === "bull50" ? "is-hot" : ""}`}>
              <div className="sbx-bull-rim" />
              <div className="sbx-bull-rim-red" />
              <div className="sbx-bull-rim-cream" />
              <div className="sbx-bull-rim-green" />
              <div className="sbx-bull-rim-red-core" />
              <div className="sbx-bull-crosshair" />
              <div className="sbx-fixed-bull-badge sbx-fixed-bull25"><img src={targetBull25} alt="Bull 25" /><span>BULL25</span></div>
              <div className="sbx-fixed-bull-badge sbx-fixed-bull50"><img src={targetBull50} alt="Bull 50" /><span>BULL50</span></div>
            </div>
            <div className={`sbx-hit-overlay ${superBullFx ? `is-visible is-${superBullFx.type}` : ""}`} key={`fx-${superBullFx?.id || "idle"}`}>
              <div className="sbx-hit-pulse" />
              <div className="sbx-hit-card">
                {superBullFx?.image ? <img src={superBullFx.image} alt={superBullFx.label} /> : <div className="sbx-hit-miss">×</div>}
                <span>{superBullFx?.eyebrow || "ÉCRAN INTERACTIF"}</span>
                <strong>{superBullFx?.label || "SUPER BULL"}</strong>
                <small>{superBullFx?.subtitle || "Appuie sur BULL25, BULL50 ou MISS"}</small>
              </div>
            </div>
            <div className="sbx-bull-hint">SEULE LA ZONE CENTRALE COMPTE · animations & bruitages sur chaque touche</div>
          </div>
        </div>
        <div className="sbx-darts-row">{[0,1,2].map(i => <div key={i} className={currentThrow[i] ? (Number(currentThrow[i]?.v) === 25 ? (Number(currentThrow[i]?.mult) === 2 ? "dbull" : "bull") : "miss") : ""}><small>D{i+1}</small><b>{dartLabel(currentThrow[i])}</b></div>)}</div>
      </section>

      <aside className="sbx-right">
        <div className="sbx-progress-card"><div><span>SUPER BULL · CENTRE DE CIBLE</span><b>{scores[playerIdx] || 0}{objective > 0 ? ` / ${objective}` : " PTS"}</b><small>Dernière volée {lastBullVisitByP[playerIdx] || 0} pts · {currentThrow.length}/3 en cours</small></div><em>VOLÉE<strong>{roundLabel}</strong></em><i><u style={{width:`${progressPct}%`}}/></i></div>
        <div className="sbx-stats-card"><h3>STATISTIQUES PARTIE · {active.name}</h3><div className="sbx-stat-grid"><div><span>BULL25</span><b>{bullsByP[playerIdx] || 0}</b></div><div><span>BULL50</span><b>{dbullsByP[playerIdx] || 0}</b></div><div><span>SÉRIE MAX</span><b>{bestBullStreakByP[playerIdx] || 0}</b></div><div><span>VOLÉES 100%</span><b>{perfectVisitsByP[playerIdx] || 0}</b></div><div><span>PRÉCISION</span><b>{precision}%</b></div><div><span>VOLÉE EN COURS</span><b>{throwValue} pts</b></div></div></div>
        <div className="sbx-input-title"><span>SAISIE DE LA VOLÉE</span><small>3 touches uniquement</small></div>
        <div className="sbx-keypad">
          <button className="bull25" disabled={botMask[playerIdx]} onClick={() => onDart({ v:25, mult:1 })}><span className="target"><img src={targetBull25} alt="Bull 25" /></span><b>BULL25</b><small>+25 PTS</small></button>
          <button className="bull50" disabled={botMask[playerIdx]} onClick={() => onDart({ v:25, mult:2 })}><span className="target"><img src={targetBull50} alt="Bull 50" /></span><b>BULL50</b><small>+50 PTS</small></button>
          <button className="miss" disabled={botMask[playerIdx]} onClick={() => onDart({ v:0, mult:1 })}><span className="target">×</span><b>MISS</b><small>0 PT</small></button>
        </div>
        <button className="sbx-undo" disabled={!currentThrow.length || botMask[playerIdx]} onClick={onUndo}>↶ ANNULER LA DERNIÈRE FLÉCHETTE</button>
      </aside>
    </main>
    <style>{SUPER_BULL_CHALLENGE_CSS}</style>
  </div>;
}

const SUPER_BULL_CHALLENGE_CSS = `
.sbx-root{min-height:100dvh;background:#02070d;color:#fff;display:flex;flex-direction:column;overflow:hidden}.sbx-head{height:104px;min-height:76px;position:relative;border-bottom:1px solid #1b5670;background:#07101a;overflow:hidden}.sbx-head>img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}.sbx-head:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#02070dcc 0,transparent 19%,transparent 81%,#02070dcc 100%);pointer-events:none}.sbx-back,.sbx-info{position:absolute;top:50%;transform:translateY(-50%);z-index:3}.sbx-back{left:12px}.sbx-info{right:14px}.sbx-layout{flex:1;min-height:0;display:grid;grid-template-columns:minmax(240px,24fr) minmax(360px,40fr) minmax(340px,36fr);gap:8px;padding:8px}.sbx-left,.sbx-board,.sbx-right{min-height:0;border:1px solid #14344a;border-radius:16px;background:linear-gradient(180deg,#07131f,#040b12);box-shadow:inset 0 1px 0 #ffffff08}.sbx-left{padding:9px;display:flex;flex-direction:column;gap:7px}.sbx-active-player{min-height:94px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px;border:1px solid #1b607d;border-radius:14px;background:linear-gradient(135deg,#0b2535,#07111a)}.sbx-active-copy{min-width:0;display:flex;flex-direction:column}.sbx-active-copy small,.sbx-active-score small{font-size:8px;letter-spacing:.8px;color:#6fdfff;font-weight:1000}.sbx-active-copy strong{font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sbx-active-copy span{font-size:9px;color:#8a9aa9;margin-top:4px}.sbx-active-score{text-align:right}.sbx-active-score b{display:block;font-size:31px;line-height:1}.sbx-active-score span{font-size:11px;color:#8aa4b6}.sbx-left-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.sbx-left-kpis>div{min-height:58px;display:grid;place-items:center;text-align:center;border:1px solid #143146;border-radius:11px;background:#06101a}.sbx-left-kpis span{font-size:7px;color:#899aa9;font-weight:1000}.sbx-left-kpis b{font-size:20px;color:#24d9ff}.sbx-roster-title{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 7px;border-bottom:1px solid #173044;font-size:10px}.sbx-roster-title span{border-radius:99px;padding:2px 7px;background:#173044;color:#89dff2}.sbx-roster{overflow:auto;display:grid;gap:4px}.sbx-roster>div{min-height:48px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:7px;align-items:center;padding:5px;border:1px solid #102a3d;border-radius:10px;background:#050e16}.sbx-roster>div.active{border-color:#e8b82b;box-shadow:0 0 18px #e8b82b25}.sbx-roster>div span{min-width:0;display:flex;flex-direction:column}.sbx-roster>div span b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sbx-roster>div span small{font-size:7px;color:#7e8d9a}.sbx-roster>div>strong{font-size:18px;color:#ffd248}.sbx-board{padding:8px;display:flex;flex-direction:column;gap:7px}.sbx-board-caption{min-height:65px;padding:7px 12px;border-radius:12px;border:1px solid #17455e;background:linear-gradient(180deg,#092236,#07131f);display:grid;grid-template-columns:1fr auto;grid-template-areas:'a b' 'c b';align-items:center}.sbx-board-caption span{grid-area:a;font-size:9px;color:#56dcff;font-weight:1000;letter-spacing:.7px}.sbx-board-caption b{grid-area:b;font-size:30px}.sbx-board-caption small{grid-area:c;font-size:9px;color:#8b9dab}.sbx-board-media{position:relative;flex:1;min-height:0;border-radius:24px;overflow:hidden;border:1px solid #214762;background:radial-gradient(circle at 50% 46%,rgba(22,37,58,.95),rgba(4,8,14,.98) 68%)}.sbx-board-glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 52%,rgba(255,219,90,.14),transparent 18%),linear-gradient(180deg,rgba(255,255,255,.02),rgba(0,0,0,.22));pointer-events:none}.sbx-bull-stage{position:absolute;inset:0;display:grid;place-items:center;padding:18px 18px 28px;isolation:isolate}.sbx-bull-stage.is-bull25{background:radial-gradient(circle at center,rgba(37,214,122,.14),transparent 34%)}.sbx-bull-stage.is-bull50{background:radial-gradient(circle at center,rgba(255,96,120,.18),transparent 36%)}.sbx-bull-stage.is-miss{background:radial-gradient(circle at center,rgba(200,210,224,.08),transparent 32%)}.sbx-bull-display{position:relative;width:min(100%,530px);aspect-ratio:1/1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at center,#f0ead8 0 21%,#ca2236 22% 33%,#f0ead8 34% 51%,#188b5a 52% 66%,#f0ead8 67% 81%,#122033 82% 100%);box-shadow:inset 0 0 0 10px rgba(0,0,0,.23),0 26px 65px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.07);border:10px solid rgba(8,15,24,.9);overflow:hidden;transition:transform .18s ease, box-shadow .18s ease}.sbx-bull-display:before{content:'';position:absolute;inset:8%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.07) 0 12deg,transparent 12deg 24deg);opacity:.45;mix-blend-mode:overlay}.sbx-bull-display.is-hot{transform:scale(1.03);box-shadow:inset 0 0 0 10px rgba(0,0,0,.23),0 30px 76px rgba(255,80,100,.26),0 0 45px rgba(255,215,90,.18)}.sbx-bull-rim,.sbx-bull-rim-red,.sbx-bull-rim-cream,.sbx-bull-rim-green,.sbx-bull-rim-red-core,.sbx-bull-crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%}.sbx-bull-rim{width:90%;height:90%;border:2px solid rgba(255,255,255,.15)}.sbx-bull-rim-red{width:58%;height:58%;border:14px solid rgba(191,32,51,.92);box-shadow:0 0 0 8px rgba(255,255,255,.08)}.sbx-bull-rim-cream{width:34%;height:34%;background:rgba(240,234,216,.94);box-shadow:0 0 0 6px rgba(0,0,0,.08)}.sbx-bull-rim-green{width:18%;height:18%;background:#15945f;box-shadow:0 0 0 6px rgba(255,255,255,.08)}.sbx-bull-rim-red-core{width:9.5%;height:9.5%;background:#d71d32;box-shadow:0 0 22px rgba(255,214,100,.32)}.sbx-bull-crosshair{width:26%;height:26%;border:1px dashed rgba(255,255,255,.23)}.sbx-bull-crosshair:before,.sbx-bull-crosshair:after{content:'';position:absolute;background:rgba(255,255,255,.18)}.sbx-bull-crosshair:before{left:50%;top:-32%;bottom:-32%;width:1px;transform:translateX(-50%)}.sbx-bull-crosshair:after{top:50%;left:-32%;right:-32%;height:1px;transform:translateY(-50%)}.sbx-fixed-bull-badge{position:absolute;left:50%;display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateX(-50%);z-index:3}.sbx-fixed-bull-badge img{width:74px;height:74px;object-fit:contain;filter:drop-shadow(0 10px 18px rgba(0,0,0,.34))}.sbx-fixed-bull-badge span{padding:5px 10px;border-radius:999px;background:rgba(3,8,15,.82);border:1px solid rgba(255,255,255,.12);font-size:10px;font-weight:1000;letter-spacing:.9px}.sbx-fixed-bull25{top:30%}.sbx-fixed-bull50{top:44%}.sbx-fixed-bull50 img{width:90px;height:90px}.sbx-hit-overlay{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;z-index:4}.sbx-hit-overlay.is-visible{opacity:1}.sbx-hit-overlay.is-visible .sbx-hit-card{animation:sbxHitCard .92s cubic-bezier(.18,.89,.32,1.18)}.sbx-hit-overlay.is-visible .sbx-hit-pulse{animation:sbxHitPulse .92s ease-out}.sbx-hit-pulse{position:absolute;width:min(76%,340px);aspect-ratio:1/1;border-radius:50%;border:8px solid rgba(255,255,255,.14)}.sbx-hit-overlay.is-bull25 .sbx-hit-pulse{border-color:rgba(63,242,162,.42);box-shadow:0 0 45px rgba(63,242,162,.20)}.sbx-hit-overlay.is-bull50 .sbx-hit-pulse{border-color:rgba(255,111,131,.5);box-shadow:0 0 55px rgba(255,111,131,.24)}.sbx-hit-overlay.is-miss .sbx-hit-pulse{border-color:rgba(185,195,209,.28);box-shadow:0 0 35px rgba(185,195,209,.15)}.sbx-hit-card{min-width:min(76%,280px);max-width:min(84%,340px);display:grid;justify-items:center;gap:4px;padding:16px 14px 14px;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(5,12,20,.90),rgba(7,16,28,.74));box-shadow:0 28px 68px rgba(0,0,0,.48);backdrop-filter:blur(5px)}.sbx-hit-card img{width:84px;height:84px;object-fit:contain;filter:drop-shadow(0 8px 20px rgba(0,0,0,.35))}.sbx-hit-card span{font-size:10px;font-weight:1000;letter-spacing:1.25px;color:#7adfff}.sbx-hit-card strong{font-size:28px;line-height:1;font-weight:1000}.sbx-hit-card small{font-size:11px;color:#d8e3ed;font-weight:800}.sbx-hit-overlay.is-bull25 .sbx-hit-card strong{color:#78f4ad}.sbx-hit-overlay.is-bull50 .sbx-hit-card strong{color:#ffd56f}.sbx-hit-overlay.is-miss .sbx-hit-card strong{color:#f4f7fb}.sbx-hit-miss{width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 25%,#65717d,#24303d 72%);border:5px solid rgba(255,255,255,.13);font-size:44px;font-weight:1000;color:#f5f8fb;box-shadow:0 8px 20px rgba(0,0,0,.35)}.sbx-bull-hint{position:absolute;left:18px;right:18px;bottom:14px;text-align:center;font-size:11px;font-weight:950;letter-spacing:.9px;color:#b6d8ea;background:rgba(4,10,18,.72);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:8px 10px}@keyframes sbxHitCard{0%{transform:translateY(22px) scale(.72);opacity:0}18%{transform:translateY(-8px) scale(1.04);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}@keyframes sbxHitPulse{0%{transform:scale(.42);opacity:.7}100%{transform:scale(1.42);opacity:0}}.sbx-darts-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.sbx-darts-row>div{height:48px;border:1px solid #293b49;border-radius:10px;background:#070e15;display:grid;place-items:center;grid-template-columns:auto auto;gap:5px}.sbx-darts-row small{font-size:8px;color:#82919f}.sbx-darts-row b{font-size:16px}.sbx-darts-row .bull{border-color:#21c778;color:#62efaa}.sbx-darts-row .dbull{border-color:#ff4756;color:#ff8a91}.sbx-darts-row .miss{color:#9ea8b2}.sbx-right{padding:9px;display:flex;flex-direction:column;gap:7px}.sbx-progress-card{padding:10px;border:1px solid #166487;border-radius:14px;background:linear-gradient(145deg,#09283c,#06121d);display:grid;grid-template-columns:minmax(0,1fr) 78px;gap:7px}.sbx-progress-card>div{display:flex;flex-direction:column}.sbx-progress-card span{font-size:9px;color:#2ce0ff;font-weight:1000;letter-spacing:.6px}.sbx-progress-card b{font-size:35px;line-height:1.1;margin-top:4px}.sbx-progress-card small{font-size:8px;color:#a9b5bf}.sbx-progress-card em{border:1px solid #16435c;border-radius:10px;display:grid;place-items:center;font-style:normal;font-size:8px;color:#9dafbd}.sbx-progress-card em strong{font-size:19px;color:#fff}.sbx-progress-card>i{grid-column:1/-1;height:7px;border-radius:99px;overflow:hidden;background:#102836}.sbx-progress-card>i u{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#16b7ee,#1ee6d0);box-shadow:0 0 12px #20dfff88}.sbx-stats-card{padding:8px;border:1px solid #16364a;border-radius:13px;background:#050d14}.sbx-stats-card h3{margin:0 0 6px;font-size:10px}.sbx-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.sbx-stat-grid>div{min-height:54px;border:1px solid #153246;border-radius:9px;background:#07131d;display:grid;place-items:center;text-align:center}.sbx-stat-grid span{font-size:7px;color:#8ea0ae;font-weight:1000}.sbx-stat-grid b{font-size:18px;color:#21d9ff}.sbx-input-title{display:flex;justify-content:space-between;align-items:end;padding:0 3px}.sbx-input-title span{font-size:9px;font-weight:1000;letter-spacing:.7px}.sbx-input-title small{font-size:7px;color:#8594a1}.sbx-keypad{flex:1;min-height:156px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.sbx-keypad button{min-height:120px;border-radius:16px;border:1px solid #31404d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-weight:1000;cursor:pointer}.sbx-keypad button:disabled{opacity:.45;cursor:not-allowed}.sbx-keypad .target{width:47px;height:47px;border-radius:50%;display:grid;place-items:center;background:#f3ead7;border:6px solid currentColor;box-shadow:0 0 18px currentColor;font-size:15px;color:#061017;overflow:hidden}.sbx-keypad .target img{width:100%;height:100%;object-fit:contain;border-radius:50%}.sbx-keypad button b{font-size:20px}.sbx-keypad button small{font-size:8px}.sbx-keypad .bull25{background:linear-gradient(180deg,#11a865,#075b39);border-color:#42efa0;color:#b5ffcf}.sbx-keypad .bull50{background:linear-gradient(180deg,#ed2638,#86121d);border-color:#ff6672;color:#ffd3d6}.sbx-keypad .miss{background:linear-gradient(180deg,#46515c,#1c252e);border-color:#91a0ae;color:#e4e9ee}.sbx-undo{height:42px;border-radius:11px;border:1px solid #244057;background:#07131e;color:#b5c4d0;font-weight:1000;font-size:9px}.sbx-undo:disabled{opacity:.35}.sbx-finish{flex:1;display:grid;place-items:center;padding:18px}.sbx-finish-card{width:min(900px,96vw);max-height:calc(100dvh - 140px);overflow:auto;border:1px solid #1c5a77;border-radius:22px;padding:20px;background:linear-gradient(145deg,#0a2334,#050c13);text-align:center}.sbx-kicker{font-size:10px;color:#33dcff;letter-spacing:1.3px;font-weight:1000}.sbx-trophy{font-size:46px;margin-top:5px}.sbx-finish h1{margin:0;font-size:32px}.sbx-winner-score{font-size:46px;font-weight:1000;color:#ffd546}.sbx-winner-score small{font-size:13px}.sbx-finish p{color:#9aabb8}.sbx-ranking{display:grid;gap:6px;text-align:left}.sbx-ranking>div{display:grid;grid-template-columns:36px 44px minmax(0,1fr) repeat(4,minmax(60px,.5fr));gap:6px;align-items:center;padding:7px;border:1px solid #173244;border-radius:11px;background:#06111a}.sbx-ranking>div.winner{border-color:#d5a92c;background:#211b08}.sbx-ranking>div>span{display:flex;flex-direction:column}.sbx-ranking>div>span small{color:#8594a1}.sbx-ranking em{font-style:normal;font-size:7px;color:#8b9cab;text-align:center}.sbx-ranking em strong{display:block;color:#fff;font-size:15px}.sbx-finish-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.sbx-finish-actions button{height:48px;border-radius:12px;border:1px solid #29465a;background:#091520;color:#fff;font-weight:1000}.sbx-finish-actions .primary{background:linear-gradient(180deg,#16bfe8,#08748f);border-color:#45e5ff}.sbx-finish-actions button,.sbx-undo,.sbx-keypad button{touch-action:manipulation}
@media(max-width:980px){.sbx-head{height:78px}.sbx-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(280px,1fr) auto;overflow:auto}.sbx-left{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);grid-template-areas:'active kpis1' 'active kpis2';}.sbx-active-player{grid-area:active}.sbx-left-kpis:nth-of-type(1){grid-area:kpis1}.sbx-left-kpis:nth-of-type(2){grid-area:kpis2}.sbx-roster-title,.sbx-roster{display:none}.sbx-board{min-height:390px}.sbx-right{min-height:380px}.sbx-keypad{min-height:140px}.sbx-ranking>div{grid-template-columns:30px 40px minmax(90px,1fr) repeat(2,minmax(54px,.5fr))}.sbx-ranking em:nth-last-child(-n+2){display:none}}
@media(max-width:620px){.sbx-root{overflow:auto}.sbx-head{height:68px;position:sticky;top:0;z-index:20}.sbx-layout{display:flex;flex-direction:column;padding:5px}.sbx-left{display:block}.sbx-active-player{min-height:82px}.sbx-left-kpis,.sbx-roster-title,.sbx-roster{display:none}.sbx-board{min-height:330px}.sbx-board-caption b{font-size:24px}.sbx-board-media{min-height:240px}.sbx-bull-stage{padding:12px 12px 24px}.sbx-bull-display{width:min(100%,320px);border-width:8px}.sbx-fixed-bull-badge img{width:56px;height:56px}.sbx-fixed-bull50 img{width:68px;height:68px}.sbx-fixed-bull-badge span{font-size:8px;padding:4px 8px}.sbx-hit-card{padding:12px 10px;max-width:90%}.sbx-hit-card img,.sbx-hit-miss{width:60px;height:60px}.sbx-hit-card strong{font-size:21px}.sbx-bull-hint{left:10px;right:10px;bottom:10px;font-size:9px;padding:6px 8px}.sbx-right{min-height:auto}.sbx-stat-grid{grid-template-columns:repeat(3,1fr)}.sbx-keypad{min-height:116px}.sbx-keypad button{min-height:108px;border-radius:13px}.sbx-keypad .target{width:38px;height:38px}.sbx-keypad button b{font-size:15px}.sbx-progress-card b{font-size:28px}.sbx-finish-card{max-height:none}.sbx-ranking>div{grid-template-columns:30px 40px minmax(80px,1fr) 54px}.sbx-ranking em:not(:first-of-type){display:none}}
`;

export default function SimpleRoundsPlay(props: any) {
  const { t } = useLang();
  useTheme();

  const variantId: string = props?.variantId ?? "count_up";
  const spec = SIMPLE_ROUND_VARIANTS[variantId];

  const cfg: CommonConfig =
    (props?.params?.config as CommonConfig) ||
    (props?.config as CommonConfig) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      rounds: 10,
      objective: 0,
      humansCount: 1,
    };

  const playerRows = useMemo(() => {
    const explicit = props?.params?.players ?? props?.players ?? (Array.isArray((cfg as any)?.players) ? (cfg as any).players : null);
    if (Array.isArray(explicit) && explicit.length) {
      return explicit.map((p: any, i: number) => ({
        id: String(p?.id ?? p?.profileId ?? `p${i + 1}`),
        name: String(p?.name ?? p?.displayName ?? `${t("generic.player", "Joueur")} ${i + 1}`),
        avatarDataUrl: p?.avatarDataUrl ?? p?.avatarUrl ?? null,
        isBot: !!p?.isBot,
      }));
    }
    const count = Math.max(1, Number((cfg as any)?.players) || 1);
    return Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `${t("generic.player", "Joueur")} ${i + 1}`,
      avatarDataUrl: null,
      isBot: false,
    }));
  }, [props?.params?.players, props?.players, (cfg as any)?.players, t]);
  const playerCount = playerRows.length;

  const [roundIdx, setRoundIdx] = useState(0); // 0..cfg.rounds
  const [playerIdx, setPlayerIdx] = useState(0);
  const [scores, setScores] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const visitHistoryRef = useRef<any[]>([]);
  const startedAtRef = useRef(Date.now());
  const [gameOver, setGameOver] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);

  // Stats (par joueur) — 1 saisie = 1 volée (3 darts)
  const [dartsByP, setDartsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [pointsByP, setPointsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bestVisitByP, setBestVisitByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [visitsByP, setVisitsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bullsByP, setBullsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [dbullsByP, setDbullsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bullStreakByP, setBullStreakByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [bestBullStreakByP, setBestBullStreakByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [perfectVisitsByP, setPerfectVisitsByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [lastBullVisitByP, setLastBullVisitByP] = useState<number[]>(() => Array.from({ length: playerCount }, () => 0));
  const [dbullPulse, setDbullPulse] = useState(false);
  const [superBullFx, setSuperBullFx] = useState<any>(null);
  const superBullFxTimerRef = useRef<number | null>(null);

  // Auto-play bots
  // Guard (avoid double auto-play)
  const botActRef = useRef<{ key: string } | null>(null);

  // Persist history once
  const savedRef = useRef(false);

  useEffect(() => () => {
    if (superBullFxTimerRef.current) window.clearTimeout(superBullFxTimerRef.current);
  }, []);

  const isFinished = gameOver || roundIdx >= cfg.rounds;

  const superBullRanking = useMemo(() => {
    if (variantId !== "super_bull") return [];
    return scores
      .map((score, i) => ({
        i,
        score,
        dbulls: dbullsByP[i] || 0,
        centres: (bullsByP[i] || 0) + (dbullsByP[i] || 0),
        bestStreak: bestBullStreakByP[i] || 0,
        perfectVisits: perfectVisitsByP[i] || 0,
      }))
      .sort((a, b) =>
        b.score - a.score ||
        b.dbulls - a.dbulls ||
        b.centres - a.centres ||
        b.bestStreak - a.bestStreak ||
        b.perfectVisits - a.perfectVisits ||
        a.i - b.i
      );
  }, [variantId, scores, dbullsByP, bullsByP, bestBullStreakByP, perfectVisitsByP]);

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (winnerIdx != null) return { idx: winnerIdx, score: scores[winnerIdx] };
    if (variantId === "super_bull" && superBullRanking.length) {
      const first = superBullRanking[0];
      return { idx: first.i, score: first.score };
    }
    const idx = spec?.computeWinnerOnEnd(scores) ?? 0;
    return { idx, score: scores[idx] };
  }, [isFinished, winnerIdx, scores, spec, variantId, superBullRanking]);

  const configTab = useMemo(() => {
    // Note: keep this map minimal + explicit to avoid wrong navigation
    const map: Record<string, string> = {
      count_up: "count_up_config",
      halve_it: "halve_it_config",
      bobs_27: "bobs27_config",
      bobs27: "bobs27_config",
      enculette: "enculette_config",
      super_bull: "super_bull_config",
      happy_mille: "happy_mille_config",
      game_170: "game_170_config",
    };
    return map[String(variantId || "")] || "games";
  }, [variantId]);

  const botMask = useMemo(() => {
    // Convention: si botsEnabled, les N premiers sont humains, le reste = bots
    if (!cfg?.botsEnabled) return Array.from({ length: playerCount }, () => false);
    const humans = Math.min(Math.max(1, Number(cfg?.humansCount ?? 1)), Math.max(1, playerCount));
    return Array.from({ length: playerCount }, (_, i) => i >= humans);
  }, [cfg?.botsEnabled, playerCount, (cfg as any)?.humansCount]);
function goBack() {
    if (props?.setTab) {
      // Retour logique vers la config du mode (plutôt que sortir du flow)
      if (configTab && configTab !== "games") return props.setTab(configTab, { config: cfg });
      return props.setTab("games");
    }
    window.history.back();
  }

  function advanceTurn(nextScores: number[], forcedWinner: number | null) {
    setScores(nextScores);

    if (forcedWinner != null) {
      setWinnerIdx(forcedWinner);
      setGameOver(true);
      return;
    }

    // next player
    let nextPlayer = playerIdx + 1;
    let nextRound = roundIdx;

    if (nextPlayer >= playerCount) {
      nextPlayer = 0;
      nextRound = roundIdx + 1;
    }

    setPlayerIdx(nextPlayer);
    setRoundIdx(nextRound);

    if (nextRound >= cfg.rounds) {
      setGameOver(true);
    }
  }

  function applyVisitFor(pIdx: number, rawDarts: UIDart[]) {
    if (!spec) return;
    const enteredDarts = (Array.isArray(rawDarts) ? rawDarts : []).slice(0, 3);
    // SUPER BULL est un vrai drill centre : seules les zones BULL/DBULL marquent.
    // Toute autre zone saisie (y compris via la cible graphique) devient un MISS à 0.
    const exactDarts = variantId === "super_bull"
      ? enteredDarts.map((d: UIDart) => (Number(d?.v) === 25 && (Number(d?.mult) === 1 || Number(d?.mult) === 2))
          ? { v: 25, mult: Number(d.mult) === 2 ? 2 : 1 } as UIDart
          : { v: 0, mult: 1 } as UIDart)
      : enteredDarts;
    const v = variantId === "super_bull"
      ? exactDarts.reduce((sum: number, d: UIDart) => sum + (Number(d.v) === 25 ? (Number(d.mult) === 2 ? 50 : 25) : 0), 0)
      : clamp(scoreDarts(exactDarts));
    const pid = String(playerRows[pIdx]?.id ?? `p${pIdx + 1}`);
    const visitIndex = visitHistoryRef.current.filter((row: any) => String(row?.playerId) === pid).length;
    visitHistoryRef.current.push(canonicalVisitFromUiDarts({
      playerId: pid,
      darts: exactDarts,
      visitIndex,
      roundIndex: roundIdx,
      source: `simple_rounds:${variantId}`,
    }));

    const res = spec.applyVisit({
      visit: v,
      currentScore: scores[pIdx] ?? 0,
      objective: cfg.objective,
      roundIndex: roundIdx,
    });

    const nextScores = [...scores];
    nextScores[pIdx] = (nextScores[pIdx] ?? 0) + (res.delta ?? 0);

    // stats local match
    setVisitsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + 1;
      return nx;
    });
    setDartsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + exactDarts.length;
      return nx;
    });
    setPointsByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = (nx[pIdx] ?? 0) + (res.delta ?? 0);
      return nx;
    });
    setBestVisitByP((arr) => {
      const nx = [...arr];
      nx[pIdx] = Math.max(nx[pIdx] ?? 0, v);
      return nx;
    });
    if (variantId === "super_bull") {
      const bulls = exactDarts.filter((d: UIDart) => Number(d.v) === 25 && Number(d.mult) === 1).length;
      const dbulls = exactDarts.filter((d: UIDart) => Number(d.v) === 25 && Number(d.mult) === 2).length;
      const centreHits = bulls + dbulls;
      setBullsByP((arr) => { const nx = [...arr]; nx[pIdx] = (nx[pIdx] ?? 0) + bulls; return nx; });
      setDbullsByP((arr) => { const nx = [...arr]; nx[pIdx] = (nx[pIdx] ?? 0) + dbulls; return nx; });
      setLastBullVisitByP((arr) => { const nx = [...arr]; nx[pIdx] = v; return nx; });
      setPerfectVisitsByP((arr) => { const nx = [...arr]; if (centreHits === 3) nx[pIdx] = (nx[pIdx] ?? 0) + 1; return nx; });
      setBullStreakByP((arr) => {
        const nx = [...arr];
        let streak = nx[pIdx] ?? 0;
        let best = bestBullStreakByP[pIdx] ?? 0;
        for (const d of exactDarts) {
          if (Number(d.v) === 25) { streak += 1; best = Math.max(best, streak); }
          else streak = 0;
        }
        nx[pIdx] = streak;
        setBestBullStreakByP((bestArr) => { const bn = [...bestArr]; bn[pIdx] = Math.max(bn[pIdx] ?? 0, best); return bn; });
        return nx;
      });
      if (dbulls > 0) {
        setDbullPulse(true);
        window.setTimeout(() => setDbullPulse(false), 720);
      }
    }

    const forceWin = !!res.forceWin;
    advanceTurn(nextScores, forceWin ? pIdx : null);
  }

  function validate() {
    if (!currentThrow.length) return;
    applyVisitFor(playerIdx, currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
  }

  function triggerSuperBullFeedback(dart: UIDart) {
    if (variantId !== "super_bull") return;
    const isBull = Number(dart?.v) === 25 && Number(dart?.mult) === 1;
    const isDbull = Number(dart?.v) === 25 && Number(dart?.mult) === 2;
    const kind = isDbull ? "bull50" : isBull ? "bull25" : "miss";
    const payload = kind === "bull50"
      ? { id: Date.now() + Math.random(), type: kind, eyebrow: "IMPACT PARFAIT", label: "DBULL 50", subtitle: "+50 points au centre", image: targetBull50 }
      : kind === "bull25"
        ? { id: Date.now() + Math.random(), type: kind, eyebrow: "BON IMPACT", label: "BULL 25", subtitle: "+25 points au centre", image: targetBull25 }
        : { id: Date.now() + Math.random(), type: kind, eyebrow: "AUCUN POINT", label: "MISS", subtitle: "Impact hors centre · 0 point", image: "" };
    setSuperBullFx(payload);
    if (superBullFxTimerRef.current) window.clearTimeout(superBullFxTimerRef.current);
    superBullFxTimerRef.current = window.setTimeout(() => setSuperBullFx(null), 980);
    try { void unlockAudio(); } catch {}
    try {
      if (kind === "bull50") {
        playGolfTickerSound("EAGLE", 0.98);
        window.setTimeout(() => playGolfPerfSfx("EAGLE", 0.88), 110);
        setDbullPulse(true);
        window.setTimeout(() => setDbullPulse(false), 760);
      } else if (kind === "bull25") {
        playGolfTickerSound("BIRDIE", 0.96);
        window.setTimeout(() => playGolfPerfSfx("BIRDIE", 0.8), 110);
      } else {
        playGolfTickerSound("MISS", 0.94);
        window.setTimeout(() => playGolfPerfSfx("MISS", 0.76), 90);
      }
    } catch {}
  }

  function addSuperBullDart(dart: UIDart) {
    if (variantId !== "super_bull" || isFinished || botMask[playerIdx]) return;
    triggerSuperBullFeedback(dart);
    const next = [...currentThrow, dart].slice(0, 3);
    if (next.length >= 3) {
      applyVisitFor(playerIdx, next);
      setCurrentThrow([]);
      setMultiplier(1);
      return;
    }
    setCurrentThrow(next);
  }

  function resetMatch() {
    savedRef.current = false;
    botActRef.current = null;
    setRoundIdx(0);
    setPlayerIdx(0);
    setScores(Array.from({ length: playerCount }, () => 0));
    setCurrentThrow([]);
    setMultiplier(1);
    visitHistoryRef.current = [];
    startedAtRef.current = Date.now();
    setGameOver(false);
    setWinnerIdx(null);
    setVisitsByP(Array.from({ length: playerCount }, () => 0));
    setDartsByP(Array.from({ length: playerCount }, () => 0));
    setPointsByP(Array.from({ length: playerCount }, () => 0));
    setBestVisitByP(Array.from({ length: playerCount }, () => 0));
    setBullsByP(Array.from({ length: playerCount }, () => 0));
    setDbullsByP(Array.from({ length: playerCount }, () => 0));
    setBullStreakByP(Array.from({ length: playerCount }, () => 0));
    setBestBullStreakByP(Array.from({ length: playerCount }, () => 0));
    setPerfectVisitsByP(Array.from({ length: playerCount }, () => 0));
    setLastBullVisitByP(Array.from({ length: playerCount }, () => 0));
    setDbullPulse(false);
    setSuperBullFx(null);
    if (superBullFxTimerRef.current) window.clearTimeout(superBullFxTimerRef.current);
  }

  function botPickVisit(): number {
    const lvl = String(cfg?.botLevel || "normal");
    const r = Math.random();

    // Mode spécial SUPER BULL : modèle bull (25/50) sur 3 fléchettes
    if (variantId === "super_bull") {
      const pBull = lvl === "hard" ? 0.38 : lvl === "easy" ? 0.12 : 0.24; // probabilité d'outer bull (25)
      const pDBull = lvl === "hard" ? 0.18 : lvl === "easy" ? 0.03 : 0.09; // probabilité de double bull (50)
      let total = 0;
      for (let d = 0; d < 3; d++) {
        const x = Math.random();
        if (x < pDBull) total += 50;
        else if (x < pDBull + pBull) total += 25;
        else total += 0;
      }
      return clamp(total); // 0..150
    }

    // Mode spécial 170 : le bot doit parfois sortir 170
    if (variantId === "game_170") {
      const p170 = lvl === "hard" ? 0.22 : lvl === "easy" ? 0.04 : 0.11;
      if (r < p170) return 170;
      // sinon volée “normale”
      const base = lvl === "hard" ? 85 : lvl === "easy" ? 35 : 60;
      const span = lvl === "hard" ? 70 : lvl === "easy" ? 55 : 65;
      return clamp(base + (Math.random() - 0.5) * span);
    }

    // Générateur simple par difficulté
    const base = lvl === "hard" ? 95 : lvl === "easy" ? 35 : 70;
    const span = lvl === "hard" ? 85 : lvl === "easy" ? 70 : 80;

    // Petites chances de gros score
    const spike = lvl === "hard" ? 0.12 : lvl === "easy" ? 0.02 : 0.06;
    if (Math.random() < spike) {
      const high = lvl === "hard" ? 140 : 120;
      return clamp(high + Math.random() * 40);
    }

    // Petites chances de zéro (important pour enculette)
    const miss = lvl === "hard" ? 0.02 : lvl === "easy" ? 0.10 : 0.06;
    if (Math.random() < miss) return 0;

    return clamp(base + (Math.random() - 0.5) * span);
  }

  function botPickDarts(): UIDart[] {
    if (variantId === "super_bull") {
      const lvl = String(cfg?.botLevel || "normal");
      const pBull = lvl === "hard" ? 0.38 : lvl === "easy" ? 0.12 : 0.24;
      const pDBull = lvl === "hard" ? 0.18 : lvl === "easy" ? 0.03 : 0.09;
      return Array.from({ length: 3 }, () => {
        const x = Math.random();
        if (x < pDBull) return { v: 25, mult: 2 as const };
        if (x < pDBull + pBull) return { v: 25, mult: 1 as const };
        return { v: 0, mult: 1 as const };
      });
    }
    return exactDartsForScore(botPickVisit()).map(canonicalToUiDart);
  }

  // Auto-play bots
  useEffect(() => {
    if (isFinished) return;
    if (!cfg?.botsEnabled) return;
    if (!botMask[playerIdx]) return;

    const key = `${roundIdx}:${playerIdx}:${scores.join(",")}`;
    if (botActRef.current?.key === key) return;
    botActRef.current = { key };

    const timer = window.setTimeout(() => {
      const darts = botPickDarts();
      applyVisitFor(playerIdx, darts);
    }, 520);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg?.botsEnabled, botMask, playerIdx, roundIdx, isFinished, scores.join("|")]);

  // Persist history + summary once when finished
  useEffect(() => {
    if (!isFinished) return;
    if (savedRef.current) return;
    if (!winner) return;

    savedRef.current = true;

    const now = Date.now();
    const id =
      (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `sr_${variantId}_${now}_${Math.random().toString(16).slice(2)}`);

    const players = playerRows.map((p: any, i: number) => ({
      id: String(p.id),
      name: botMask[i] && !String(p.name).includes("BOT") ? `${p.name} (BOT)` : p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
    }));

    const avg3ByPlayer: Record<string, number> = {};
    const dartsMap: Record<string, number> = {};
    const bestVisitMap: Record<string, number> = {};
    const bestCheckoutMap: Record<string, number> = {};

    for (let i = 0; i < playerCount; i++) {
      const pid = String(players[i]?.id ?? `p${i + 1}`);
      const visits = visitsByP[i] || 0;
      const darts = dartsByP[i] || visits * 3;
      const pts = pointsByP[i] || 0;
      const avg3 = visits > 0 ? pts / visits : 0;
      avg3ByPlayer[pid] = Math.round(avg3 * 100) / 100;
      dartsMap[pid] = darts;
      bestVisitMap[pid] = bestVisitByP[i] || 0;
      bestCheckoutMap[pid] = 0;
    }

    const rec: any = {
      id,
      matchId: id,
      kind: String(variantId || "simple_rounds"),
      status: "finished",
      createdAt: now,
      updatedAt: now,
      players,
      winnerId: String(players[winner.idx]?.id ?? `p${winner.idx + 1}`),
      game: {
        mode: String(variantId || "simple_rounds"),
        rounds: cfg.rounds,
        objective: cfg.objective,
        botsEnabled: !!cfg.botsEnabled,
        botLevel: cfg.botLevel,
      },
      summary: {
        legs: 1,
        winnerName: String(players[winner.idx]?.name ?? ""),
        durationMs: Math.max(0, now - startedAtRef.current),
        finishReason: cfg.objective > 0 && (scores[winner.idx] || 0) >= cfg.objective ? "objective" : "rounds",
        avg3ByPlayer,
        darts: dartsMap,
        bestVisitByPlayer: bestVisitMap,
        bestCheckoutByPlayer: bestCheckoutMap,
        perPlayer: players.map((p: any, i: number) => ({
          id: String(p.id), name: p.name, score: scores[i] || 0, darts: dartsByP[i] || 0, visits: visitsByP[i] || 0,
          bestVisit: bestVisitByP[i] || 0, bulls: bullsByP[i] || 0, dbulls: dbullsByP[i] || 0,
          centreHits: (bullsByP[i] || 0) + (dbullsByP[i] || 0),
          centreAccuracy: (dartsByP[i] || 0) > 0 ? Math.round((((bullsByP[i] || 0) + (dbullsByP[i] || 0)) / (dartsByP[i] || 1)) * 10000) / 100 : 0,
          dbullRate: (dartsByP[i] || 0) > 0 ? Math.round(((dbullsByP[i] || 0) / (dartsByP[i] || 1)) * 10000) / 100 : 0,
          bestBullStreak: bestBullStreakByP[i] || 0, perfectBullVisits: perfectVisitsByP[i] || 0,
        })),
        ...(variantId === "super_bull" ? {
          bullsByPlayer: Object.fromEntries(players.map((p: any, i: number) => [String(p.id), bullsByP[i] || 0])),
          dbullsByPlayer: Object.fromEntries(players.map((p: any, i: number) => [String(p.id), dbullsByP[i] || 0])),
          centreHitsByPlayer: Object.fromEntries(players.map((p: any, i: number) => [String(p.id), (bullsByP[i] || 0) + (dbullsByP[i] || 0)])),
          centreAccuracyByPlayer: Object.fromEntries(players.map((p: any, i: number) => {
            const darts = dartsByP[i] || 0;
            const centres = (bullsByP[i] || 0) + (dbullsByP[i] || 0);
            return [String(p.id), darts > 0 ? Math.round((centres / darts) * 10000) / 100 : 0];
          })),
          dbullRateByPlayer: Object.fromEntries(players.map((p: any, i: number) => {
            const darts = dartsByP[i] || 0;
            return [String(p.id), darts > 0 ? Math.round(((dbullsByP[i] || 0) / darts) * 10000) / 100 : 0];
          })),
          bestBullStreakByPlayer: Object.fromEntries(players.map((p: any, i: number) => [String(p.id), bestBullStreakByP[i] || 0])),
          perfectBullVisitsByPlayer: Object.fromEntries(players.map((p: any, i: number) => [String(p.id), perfectVisitsByP[i] || 0])),
          superBullRanking: superBullRanking.map((row, rank) => ({
            rank: rank + 1, playerId: String(players[row.i]?.id ?? `p${row.i + 1}`), score: row.score,
            dbulls: row.dbulls, centres: row.centres, bestStreak: row.bestStreak, perfectVisits: row.perfectVisits,
          })),
        } : {}),
        // co: 0 (pas de checkout sur ces variantes)
      },
      payload: {
        variantId,
        mode: variantId,
        sport: "darts",
        config: cfg,
        scores,
        startedAt: startedAtRef.current,
        endedAt: now,
        durationMs: Math.max(0, now - startedAtRef.current),
        result: { winnerId: String(players[winner.idx]?.id ?? ""), winnerName: String(players[winner.idx]?.name ?? ""), score: scores[winner.idx] || 0 },
        visitHistory: visitHistoryRef.current.slice(),
        events: visitHistoryRef.current.slice(),
      },
    };

    const telemetry = buildDartsTelemetry(rec, rec.payload);
    if (telemetry) {
      rec.payload.telemetry = telemetry;
      rec.payload.dartTelemetry = telemetry;
      rec.summary.hitSummary = { ...telemetry.totals, byPlayer: telemetry.perPlayer };
      rec.summary.telemetryExact = true;
      rec.summary.telemetryCoverage = "full";
    }

    // best effort: don't break gameplay if history fails
    Promise.resolve(History.upsert(rec)).catch((e) => console.warn("History.upsert(simpleRounds) failed:", e));
  }, [
    isFinished,
    winner,
    variantId,
    cfg,
    botMask,
    visitsByP,
    dartsByP,
    pointsByP,
    bestVisitByP,
    bullsByP,
    dbullsByP,
    bestBullStreakByP,
    perfectVisitsByP,
    superBullRanking,
    scores,
    t,
    playerRows,
    playerCount,
  ]);

  if (!spec) {
    return (
      <div className="page" style={{ padding: 16, color: "#fff" }}>
        Variante inconnue: {String(variantId)}
      </div>
    );
  }

  if (variantId === "super_bull") {
    return <SuperBullChallengeView
      spec={spec}
      cfg={cfg}
      playerRows={playerRows}
      playerIdx={playerIdx}
      scores={scores}
      currentThrow={currentThrow}
      botMask={botMask}
      roundIdx={roundIdx}
      isFinished={isFinished}
      winner={winner}
      bullsByP={bullsByP}
      dbullsByP={dbullsByP}
      dartsByP={dartsByP}
      bullStreakByP={bullStreakByP}
      bestBullStreakByP={bestBullStreakByP}
      perfectVisitsByP={perfectVisitsByP}
      lastBullVisitByP={lastBullVisitByP}
      superBullRanking={superBullRanking}
      superBullFx={superBullFx}
      onBack={goBack}
      onReset={resetMatch}
      onDart={addSuperBullDart}
      onUndo={() => setCurrentThrow((prev) => prev.slice(0, -1))}
    />;
  }

  return (
    <div className="page darts-play-auto-columns simple-rounds-play-screen">
      <div className="msc-mode-play-header">
      <PageHeader
        title={spec.title}
        tickerSrc={spec.tickerSrc}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title={spec.infoTitle} content={spec.infoText} />}
      />
      </div>

      <div className="msc-mode-play-content" style={{ padding: 14 }}>
        <div className="msc-mode-play-primary">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 1000 }}>
            {t("generic.round", "Round")} {Math.min(roundIdx + 1, cfg.rounds)}/{cfg.rounds}
          </div>
          {!isFinished && (
            <div style={{ fontWeight: 900, opacity: 0.9 }}>
              {t("generic.turn", "Tour")} : {t("generic.player", "Joueur")} {playerIdx + 1}
            </div>
          )}
        </div>

        {variantId === "super_bull" && !isFinished && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(132px,.72fr) minmax(0,1.6fr)", gap: 12, marginBottom: 12, alignItems: "stretch" }}>
            <div style={{ borderRadius: 22, border: dbullPulse ? "2px solid rgba(255,215,64,.95)" : "1px solid rgba(39,220,255,.25)", background: dbullPulse ? "radial-gradient(circle,rgba(255,215,64,.30),rgba(8,18,30,.96) 68%)" : "radial-gradient(circle,rgba(39,220,255,.15),rgba(8,18,30,.96) 68%)", display: "grid", placeItems: "center", minHeight: 154, boxShadow: dbullPulse ? "0 0 34px rgba(255,215,64,.28)" : "none", transition: "all .18s ease" }}>
              <div style={{ width: 118, height: 118, borderRadius: "50%", background: "radial-gradient(circle at center,#ffd740 0 22%,#d91f38 23% 46%,#f1ead8 47% 69%,#1f9d63 70% 100%)", border: "5px solid rgba(255,255,255,.12)", boxShadow: "inset 0 0 0 3px rgba(0,0,0,.3),0 8px 28px rgba(0,0,0,.35)", display: "grid", placeItems: "center", textAlign: "center", color: "#071019", fontWeight: 1000, fontSize: 11, lineHeight: 1.05 }}>
                <div><div style={{ fontSize: 18 }}>50</div>DBULL<div style={{ marginTop: 25, color: "white" }}>BULL 25</div></div>
              </div>
            </div>
            <div style={{ borderRadius: 20, padding: 14, border: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(145deg,rgba(39,220,255,.08),rgba(255,255,255,.035))" }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, opacity: .66, fontWeight: 950 }}>SUPER BULL · JOUEUR ACTIF</div>
              <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 4 }}>{playerRows[playerIdx]?.name || `${t("generic.player", "Joueur")} ${playerIdx + 1}`}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 12 }}>
                {[
                  ["CENTRES", (bullsByP[playerIdx] || 0) + (dbullsByP[playerIdx] || 0)],
                  ["DBULL", dbullsByP[playerIdx] || 0],
                  ["SÉRIE", bullStreakByP[playerIdx] || 0],
                  ["BEST", bestBullStreakByP[playerIdx] || 0],
                ].map(([label,value]) => <div key={String(label)} style={{ padding: "9px 5px", borderRadius: 12, background: "rgba(0,0,0,.22)", textAlign: "center" }}><div style={{ fontSize: 9, opacity: .6, fontWeight: 900 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 1000, marginTop: 2 }}>{value}</div></div>)}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, opacity: .72 }}>Dernière volée : <b>{lastBullVisitByP[playerIdx] || 0} pts</b> · Volées 100% centre : <b>{perfectVisitsByP[playerIdx] || 0}</b></div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${playerCount}, minmax(0,1fr))`, gap: 10 }}>
          {scores.map((s, i) => {
            const active = !isFinished && i === playerIdx;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: active ? "1px solid rgba(120,255,200,0.35)" : "1px solid rgba(255,255,255,0.10)",
                  background: active ? "rgba(120,255,200,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>
                  {t("generic.player", "Joueur")} {i + 1}
                  {botMask[i] ? " • BOT" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{s}</div>
                {variantId === "super_bull" && (
                  <div style={{ marginTop: 5, fontSize: 10, opacity: 0.72, fontWeight: 850 }}>
                    BULL {bullsByP[i] || 0} • DBULL {dbullsByP[i] || 0} • {dartsByP[i] || 0} darts
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </div>

        {isFinished && variantId === "super_bull" && winner && (
          <div style={{ marginTop: 14, borderRadius: 22, padding: 16, border: "1px solid rgba(39,220,255,.24)", background: "linear-gradient(145deg,rgba(39,220,255,.11),rgba(255,215,64,.05),rgba(255,255,255,.035))" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, opacity: .65, fontWeight: 950 }}>CLASSEMENT FINAL · SUPER BULL</div>
              <div style={{ fontSize: 25, fontWeight: 1000, marginTop: 5 }}>🏆 {playerRows[winner.idx]?.name || `${t("generic.player", "Joueur")} ${winner.idx + 1}`}</div>
              <div style={{ opacity: .72, marginTop: 3 }}>{winner.score} points au centre</div>
              <div style={{ opacity: .55, marginTop: 4, fontSize: 10 }}>{cfg.objective > 0 ? `Objectif ${cfg.objective} pts` : `${cfg.rounds} rounds · score final`} • ${visitHistoryRef.current.length} volées enregistrées</div>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 15 }}>
              {superBullRanking.map((row, rank) => {
                const darts = dartsByP[row.i] || 0;
                const centres = (bullsByP[row.i] || 0) + (dbullsByP[row.i] || 0);
                const precision = darts ? Math.round((centres / darts) * 100) : 0;
                return <div key={row.i} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) repeat(4,minmax(54px,.55fr))", gap: 7, alignItems: "center", padding: 10, borderRadius: 14, background: rank === 0 ? "rgba(255,215,64,.10)" : "rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize: 18, fontWeight: 1000 }}>#{rank+1}</div><div style={{ fontWeight: 1000 }}>{playerRows[row.i]?.name}</div>
                  <div style={{ textAlign: "center" }}><b>{row.score}</b><div style={{ fontSize: 8, opacity: .55 }}>PTS</div></div>
                  <div style={{ textAlign: "center" }}><b>{dbullsByP[row.i]||0}</b><div style={{ fontSize: 8, opacity: .55 }}>DBULL</div></div>
                  <div style={{ textAlign: "center" }}><b>{precision}%</b><div style={{ fontSize: 8, opacity: .55 }}>CENTRE</div></div>
                  <div style={{ textAlign: "center" }}><b>{bestBullStreakByP[row.i]||0}</b><div style={{ fontSize: 8, opacity: .55 }}>BEST SÉRIE</div></div>
                </div>;
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 14 }}>
              <button className="btn-secondary" onClick={goBack}>RETOUR CONFIG</button>
              <button className="btn-primary" onClick={resetMatch}>REJOUER</button>
            </div>
          </div>
        )}

        {!isFinished && !botMask[playerIdx] && (
          <div className="msc-mode-play-secondary" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950, letterSpacing: 0.8 }}>
              {t("generic.visit", "VOLÉE")} — {variantId === "super_bull" ? t("generic.input", "BULL (0..150, paliers 25)") : t("generic.input", "entre un score 0..180")}
            </div>

            <div style={{ marginTop: 10 }}>
              {variantId === "super_bull" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                    {Array.from({ length: 3 }, (_, i) => {
                      const d = currentThrow[i];
                      const label = !d ? `D${i + 1}` : Number(d.v) !== 25 ? "MISS" : Number(d.mult) === 2 ? "DBULL 50" : "BULL 25";
                      return <div key={i} style={{ padding: "12px 6px", borderRadius: 14, textAlign: "center", fontWeight: 950, fontSize: 12, border: "1px solid rgba(255,255,255,.12)", background: d ? "rgba(39,220,255,.10)" : "rgba(255,255,255,.04)" }}>{label}</div>;
                    })}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                    <button className="btn-secondary" onClick={() => setCurrentThrow((p) => p.length >= 3 ? p : [...p, { v: 0, mult: 1 }])}>MISS</button>
                    <button className="btn-secondary" onClick={() => setCurrentThrow((p) => p.length >= 3 ? p : [...p, { v: 25, mult: 1 }])}>BULL · 25</button>
                    <button className="btn-primary" onClick={() => setCurrentThrow((p) => p.length >= 3 ? p : [...p, { v: 25, mult: 2 }])}>DBULL · 50</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
                    <button className="btn-secondary" onClick={() => setCurrentThrow([])}>ANNULER</button>
                    <button className="btn-secondary" onClick={() => setCurrentThrow((p) => p.slice(0, -1))}>EFFACER</button>
                    <button className="btn-primary" disabled={currentThrow.length !== 3} onClick={validate}>VALIDER · {currentThrow.reduce((sum, d) => sum + (Number(d.v) === 25 ? (Number(d.mult) === 2 ? 50 : 25) : 0), 0)} PTS</button>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 10.5, opacity: .68 }}>3 fléchettes obligatoires par volée • seules BULL et DBULL marquent</div>
                </div>
              ) : (
                <ScoreInputHub
                  currentThrow={currentThrow}
                  multiplier={multiplier}
                  onSimple={() => setMultiplier(1)}
                  onDouble={() => setMultiplier(2)}
                  onTriple={() => setMultiplier(3)}
                  onCancel={() => { setCurrentThrow([]); setMultiplier(1); }}
                  onBackspace={() => setCurrentThrow((prev) => prev.slice(0, -1))}
                  onNumber={(n: number) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: n, mult: multiplier }])}
                  onBull={() => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, { v: 25, mult: multiplier === 3 ? 1 : multiplier } as UIDart])}
                  onValidate={validate}
                  onDirectDart={(d: UIDart) => setCurrentThrow((prev) => prev.length >= 3 ? prev : [...prev, d])}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
