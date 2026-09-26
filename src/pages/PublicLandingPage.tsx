import React from "react";
import "./PublicLandingPage.css";
import logo from "../assets/LOGO.webp";
import darts from "../assets/games/logo-darts.webp";
import petanque from "../assets/games/logo-petanque.webp";
import babyfoot from "../assets/games/logo-babyfoot.webp";
import pingpong from "../assets/games/logo-pingpong.webp";
import molkky from "../assets/games/logo-molkky.webp";
import running from "../assets/games/logo-running-performance.webp";
import fit from "../assets/games/logo-fit-performance.webp";
import esports from "../assets/games/logo-esports.webp";
import awena from "../assets/running/home_actions/running_discipline_awena.webp";

const sports = [
  [darts,"Fléchettes"],[petanque,"Pétanque"],[babyfoot,"Baby-foot"],[pingpong,"Ping-pong"],
  [molkky,"Mölkky"],[running,"Running Perf"],[fit,"Fit Perf"],[esports,"eSports"]
] as const;
const features = [
  ["22","disciplines prévues dans un seul écosystème"],
  ["∞","équipes, profils et bots personnalisables"],
  ["LOCAL + ONLINE","solo, duo, équipes et multijoueur"],
  ["STATS","historique, performances, records et classements"]
] as const;

export default function PublicLandingPage({ onOpenApp }: { onOpenApp: () => void }) {
  return <main className="mssLanding">
    <header className="mssNav">
      <button className="mssBrand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="MULTISPORTS SCORING accueil"><img src={logo}/><span>MULTISPORTS <b>SCORING</b></span></button>
      <nav><a href="#disciplines">Disciplines</a><a href="#features">Fonctionnalités</a><a href="#awena">Awena</a><a href="#community">Communauté</a></nav>
      <button className="mssOpen" onClick={onOpenApp}>Ouvrir l’application</button>
    </header>

    <section className="mssHero">
      <div className="mssHeroCopy">
        <div className="mssPill">✦ APPLICATION GRATUITE • MULTISPORTS</div>
        <h1>UNE APPLICATION.<br/><em>TOUS VOS SPORTS.</em></h1>
        <p className="mssLead">Jouez, scorez, entraînez-vous et suivez vos performances dans un seul univers. MULTISPORTS SCORING réunit le jeu local et online, les statistiques, les équipes, les bots et les outils pour clubs.</p>
        <div className="mssCtas"><button onClick={onOpenApp}>COMMENCER GRATUITEMENT</button><a href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer">GOOGLE PLAY</a></div>
        <div className="mssStoreLine"><span>✓ Gratuit</span><span>✓ Google Play</span><span>✓ Microsoft Store</span></div>
      </div>
      <div className="mssHeroVisual">
        <div className="mssGlow"/>
        <div className="mssPhone"><div className="mssPhoneTop"/><img className="mssPhoneLogo" src={logo}/><strong>MULTISPORTS<br/>SCORING</strong><div className="mssMiniGrid">{sports.slice(0,6).map(([src,n])=><div key={n}><img src={src}/><span>{n}</span></div>)}</div><div className="mssPhoneNav">JEUX　PROFILS　ONLINE　STATS</div></div>
        <img className="mssAwena" src={awena} alt="Awena, assistante de MULTISPORTS SCORING"/>
        <div className="mssFloat mssFloatA"><b>22 DISCIPLINES</b><span>Un seul écosystème</span></div>
        <div className="mssFloat mssFloatB"><b>BOTS IA</b><span>Jouez ou créez les vôtres</span></div>
        <div className="mssFloat mssFloatC"><b>STATS AVANCÉES</b><span>Suivez votre progression</span></div>
      </div>
    </section>

    <section className="mssStrip" id="features">{features.map(([big,small])=><article key={big}><strong>{big}</strong><span>{small}</span></article>)}</section>

    <section className="mssSection" id="disciplines"><div className="mssEyebrow">MULTISPORTS, VRAIMENT.</div><h2>Vos disciplines dans la même application</h2><p>Les disciplines disponibles et les modules de l’écosystème sont réunis avec une identité commune, sans enfermer l’application dans un seul sport.</p><div className="mssSports">{sports.map(([src,n])=><article key={n}><img src={src}/><strong>{n}</strong></article>)}</div><div className="mssTwentyTwo">22 disciplines prévues • de nouveaux sports enrichissent progressivement MULTISPORTS SCORING</div></section>

    <section className="mssSection mssDarkCards"><div className="mssEyebrow">PLUS QU’UN COMPTEUR DE SCORE</div><h2>Tout ce qu’il faut pour jouer et progresser</h2><div className="mssCards"><article><b>◎</b><h3>Jouez comme vous voulez</h3><p>Solo, duo, équipes, multijoueur local ou online. Créez un nombre illimité d’équipes selon vos besoins.</p></article><article><b>◈</b><h3>Bots jouables</h3><p>Affrontez les bots disponibles, différenciez leurs niveaux et créez vos propres adversaires.</p></article><article><b>↗</b><h3>Statistiques & historique</h3><p>Retrouvez parties, performances, records, classements et progression dans un centre statistique complet.</p></article><article><b>⌂</b><h3>Clubs & organisations</h3><p>Gérez membres, équipes, calendrier, compétitions, classements et vie de votre organisation.</p></article></div></section>

    <section className="mssAwenaSection" id="awena"><img src={awena} alt="Awena"/><div><div className="mssEyebrow">VOTRE ASSISTANTE INTÉGRÉE</div><h2>AWENA vous accompagne</h2><p>Règles, configuration, conseils et guidage : Awena est intégrée à l’expérience MULTISPORTS SCORING pour vous aider au bon moment, sans quitter votre partie ou votre entraînement.</p><button onClick={onOpenApp}>DÉCOUVRIR L’APPLICATION</button></div></section>

    <section className="mssCommunity" id="community"><div><div className="mssEyebrow">JOUEZ. PARTAGEZ. PROGRESSEZ.</div><h2>Une communauté qui grandit avec l’application.</h2><p>Rejoignez la communauté MULTISPORTS SCORING, partagez vos parties et découvrez les nouveautés.</p></div><div className="mssCommunityBtns"><button onClick={onOpenApp}>OUVRIR MULTISPORTS SCORING</button><span>Google Play • Microsoft Store • Web</span></div></section>

    <footer><img src={logo}/><span>© 2026 MULTISPORTS SCORING</span><span>Application gratuite • 22 disciplines</span></footer>
  </main>;
}
