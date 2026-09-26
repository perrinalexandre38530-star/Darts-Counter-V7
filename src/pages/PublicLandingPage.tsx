import React from "react";
import "./PublicLandingPage.css";
import logo from "../assets/LOGO.webp";
import awena from "../assets/running/home_actions/running_discipline_awena.webp";
import darts from "../assets/games/logo-darts.webp";
import petanque from "../assets/games/logo-petanque.webp";
import babyfoot from "../assets/games/logo-babyfoot.webp";
import pingpong from "../assets/games/logo-pingpong.webp";
import molkky from "../assets/games/logo-molkky.webp";
import running from "../assets/games/logo-running-performance.webp";
import fit from "../assets/games/logo-fit-performance.webp";
import esports from "../assets/games/logo-esports.webp";
import chess from "../assets/games/logo-chess.webp";
import billard from "../assets/games/logo-billard.webp";
import archery from "../assets/games/logo-archery.webp";
import tennis from "../assets/games/logo-tennis.webp";
import dice from "../assets/games/logo-dicegame.webp";
import frisbee from "../assets/games/logo-frisbee.webp";
import pickleball from "../assets/games/logo-pickleball.webp";
import volley from "../assets/games/logo-volley.webp";
import cornhole from "../assets/games/logo-cornhole.webp";
import basket from "../assets/games/logo-basket.webp";
import football from "../assets/games/logo-foot.webp";
import rugby from "../assets/games/logo-rugby.webp";
import badminton from "../assets/games/logo-badminton.webp";
import padel from "../assets/games/logo-padel.webp";

const sports = [
  [darts,"Fléchettes"],[petanque,"Pétanque"],[babyfoot,"Baby-foot"],[pingpong,"Ping-pong"],
  [molkky,"Mölkky"],[running,"Running Perf"],[fit,"Fit Perf"],[football,"Football"],
  [basket,"Basket"],[rugby,"Rugby"],[tennis,"Tennis"],[padel,"Padel"],
  [badminton,"Badminton"],[volley,"Volley"],[pickleball,"Pickleball"],[cornhole,"Cornhole"],
  [billard,"Billard"],[chess,"Échecs"],[archery,"Tir à l’arc"],[frisbee,"Frisbee"],
  [dice,"Jeux de dés"],[esports,"eSports"]
] as const;

const features = [
  ["22","disciplines réunies dans le même univers"],
  ["∞","équipes, profils et adversaires personnalisables"],
  ["LOCAL + ONLINE","solo, duo, équipes et multijoueur"],
  ["STATS","historique, performances, records et classements"]
] as const;

export default function PublicLandingPage({ onOpenApp }: { onOpenApp: () => void }) {
  return <main className="mssLanding">
    <header className="mssNav">
      <button className="mssBrand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="MULTISPORTS SCORING accueil"><img src={logo} alt=""/><span>MULTISPORTS <b>SCORING</b></span></button>
      <nav><a href="#disciplines">22 disciplines</a><a href="#features">Fonctionnalités</a><a href="#awena">Awena</a><a href="#community">Communauté</a></nav>
      <button className="mssOpen" onClick={onOpenApp}>OUVRIR L’APPLICATION</button>
    </header>

    <section className="mssHero">
      <div className="mssHeroCopy">
        <div className="mssPill">✦ GRATUIT • 22 DISCIPLINES • UN SEUL COMPTE</div>
        <h1>VOTRE SPORT.<br/><em>VOS SCORES.</em><br/>VOS PERFORMANCES.</h1>
        <p className="mssLead">MULTISPORTS SCORING centralise vos parties, entraînements, équipes et statistiques dans une seule application. Du jeu entre amis au suivi de performance, gardez tout votre univers sportif au même endroit.</p>
        <div className="mssCtas"><button onClick={onOpenApp}>COMMENCER GRATUITEMENT</button><a href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer">GOOGLE PLAY</a></div>
        <div className="mssStoreLine"><span>✓ Application gratuite</span><span>✓ Android</span><span>✓ Web</span><span>✓ Microsoft Store</span></div>
      </div>
      <div className="mssHeroVisual" aria-label="Les disciplines MULTISPORTS SCORING">
        <div className="mssGlow"/>
        <div className="mssOrbit mssOrbitOuter">{sports.slice(0,12).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n}/></div>)}</div>
        <div className="mssOrbit mssOrbitInner">{sports.slice(12,22).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n}/></div>)}</div>
        <div className="mssHeroCore"><img src={logo} alt="MULTISPORTS SCORING"/><strong>22</strong><span>DISCIPLINES</span></div>
        <img className="mssAwena" src={awena} alt="Awena, assistante MULTISPORTS SCORING"/>
        <div className="mssFloat mssFloatA"><b>ONLINE</b><span>Affrontez vos amis et la communauté</span></div>
        <div className="mssFloat mssFloatB"><b>BOTS IA</b><span>Jouez et personnalisez vos adversaires</span></div>
        <div className="mssFloat mssFloatC"><b>STATS AVANCÉES</b><span>Mesurez réellement votre progression</span></div>
      </div>
    </section>

    <section className="mssStrip" id="features">{features.map(([big,small])=><article key={big}><strong>{big}</strong><span>{small}</span></article>)}</section>

    <section className="mssSection" id="disciplines"><div className="mssEyebrow">TOUT VOTRE SPORT. UNE SEULE APPLICATION.</div><h2>22 disciplines, une identité commune</h2><p>Chaque discipline conserve son univers tout en profitant du même compte, des mêmes profils, de l’historique et de l’écosystème MULTISPORTS SCORING.</p><div className="mssSports">{sports.map(([src,n],i)=><article key={n}><span className="mssSportNo">{String(i+1).padStart(2,"0")}</span><img src={src} alt={n}/><strong>{n}</strong></article>)}</div></section>

    <section className="mssSection mssDarkCards"><div className="mssEyebrow">BIEN PLUS QU’UN COMPTEUR DE SCORE</div><h2>Jouez. Analysez. Progressez.</h2><div className="mssCards"><article><b>◎</b><h3>Jeu libre & multijoueur</h3><p>Solo, duo, équipes, local ou online : choisissez votre façon de jouer et retrouvez vos parties dans votre historique.</p></article><article><b>◈</b><h3>Bots & adversaires IA</h3><p>Affrontez des adversaires de niveaux différents et personnalisez vos propres bots dans les modes compatibles.</p></article><article><b>↗</b><h3>Statistiques détaillées</h3><p>Performances, records, tendances, classements et progression : vos résultats deviennent enfin exploitables.</p></article><article><b>⌂</b><h3>Clubs & organisations</h3><p>Membres, équipes, calendrier, compétitions, classements et vie collective dans un espace dédié.</p></article></div></section>

    <section className="mssAwenaSection" id="awena"><img src={awena} alt="Awena"/><div><div className="mssEyebrow">L’ASSISTANTE INTÉGRÉE À VOTRE EXPÉRIENCE</div><h2>AWENA est là quand vous en avez besoin.</h2><p>Règles, configuration, conseils et guidage : Awena accompagne vos parties et vos entraînements sans vous faire sortir de MULTISPORTS SCORING.</p><button onClick={onOpenApp}>DÉCOUVRIR MULTISPORTS SCORING</button></div></section>

    <section className="mssCommunity" id="community"><div><div className="mssEyebrow">JOUEZ • PARTAGEZ • PROGRESSEZ</div><h2>Votre univers sportif vous suit partout.</h2><p>Un même profil pour retrouver vos disciplines, vos équipes, vos parties, vos entraînements et vos performances.</p></div><div className="mssCommunityBtns"><button onClick={onOpenApp}>OUVRIR L’APPLICATION</button><span>Google Play • Microsoft Store • Web</span></div></section>

    <footer><img src={logo} alt=""/><span>© 2026 MULTISPORTS SCORING</span><span>22 disciplines • Une seule application</span></footer>
  </main>;
}
