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
import kael from "../assets/avatars/firefighter-bots/kael.webp";
import aero from "../assets/avatars/firefighter-bots/aero.webp";
import braze from "../assets/avatars/firefighter-bots/braze.webp";
import lyna from "../assets/avatars/firefighter-bots/lyna.webp";
import zeno from "../assets/avatars/killer-bots/zeno.webp";
import malysia from "../assets/avatars/firefighter-bots/malysia.webp";
import screenSports from "../assets/public-landing/screen-sports.webp";
import screenX01 from "../assets/public-landing/screen-x01.webp";
import screenStats from "../assets/public-landing/screen-stats.webp";

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
      <nav><a href="#disciplines">Disciplines</a><a href="#features">Fonctionnalités</a><a href="#awena">Awena</a><a href="#community">Communauté</a></nav>
      <button className="mssOpen" onClick={onOpenApp}>OUVRIR L’APPLICATION</button>
    </header>

    <section className="mssHero">
      <div className="mssHeroCopy">
        <div className="mssPill">✦ APPLICATION GRATUITE • MULTISPORTS</div>
        <h1>UNE APPLICATION.<br/><em>TOUS VOS SPORTS.</em></h1>
        <p className="mssLead">Jouez, scorez, entraînez-vous et suivez vos performances dans un seul univers. MULTISPORTS SCORING réunit le jeu local et online, les statistiques, les équipes, les bots et les outils pour clubs.</p>
        <div className="mssCtas"><button onClick={onOpenApp}>COMMENCER GRATUITEMENT</button><a href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer">GOOGLE PLAY</a></div>
        <div className="mssStoreLine"><span>✓ Gratuit</span><span>✓ Google Play</span><span>✓ Microsoft Store</span></div>
      </div>
      <div className="mssHeroVisual" aria-label="Les disciplines MULTISPORTS SCORING">
        <div className="mssVisualKicker">UN ÉCOSYSTÈME • 22 DISCIPLINES</div>
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

    <section className="mssAppPreview" aria-label="Aperçu de MULTISPORTS SCORING">
      <div className="mssPreviewHead"><div className="mssEyebrow">L’APPLICATION EN ACTION</div><h2>Un seul univers. Des écrans pensés pour chaque usage.</h2><p>Choisissez une discipline, jouez immédiatement puis retrouvez vos performances dans le même environnement.</p></div>
      <div className="mssDevices">
        <article className="mssDevice mssDeviceLeft"><div className="mssPhone mssPhoneReal"><img src={screenSports} alt="Écran réel Choix du sport de MULTISPORTS SCORING"/></div><strong>CHOIX DU SPORT</strong><span>Votre véritable écran de sélection MULTISPORTS SCORING.</span></article>
        <article className="mssDevice mssDeviceMain"><div className="mssPhone mssPhoneReal"><img src={screenX01} alt="Écran réel de scoring X01 501 de MULTISPORTS SCORING"/></div><strong>SCORING X01 EN DIRECT</strong><span>Le véritable moteur de saisie et de suivi d’une partie 501.</span></article>
        <article className="mssDevice mssDeviceRight"><div className="mssPhone mssPhoneReal"><img src={screenStats} alt="Écran réel Statistiques X01 de MULTISPORTS SCORING"/></div><strong>STATS & PROGRESSION</strong><span>Les véritables graphiques de performance de l’application.</span></article>
      </div>
    </section>

    <section className="mssSection" id="disciplines"><div className="mssEyebrow">TOUT VOTRE SPORT. UNE SEULE APPLICATION.</div><h2>22 disciplines, une identité commune</h2><p>Chaque discipline conserve son univers tout en profitant du même compte, des mêmes profils, de l’historique et de l’écosystème MULTISPORTS SCORING.</p><div className="mssSports">{sports.map(([src,n],i)=><article key={n}><span className="mssSportNo">{String(i+1).padStart(2,"0")}</span><img src={src} alt={n}/><strong>{n}</strong></article>)}</div></section>

    <section className="mssSection mssDarkCards"><div className="mssEyebrow">BIEN PLUS QU’UN COMPTEUR DE SCORE</div><h2>Jouez. Analysez. Progressez.</h2><div className="mssCards"><article><b>◎</b><h3>Jeu libre & multijoueur</h3><p>Solo, duo, équipes, local ou online : choisissez votre façon de jouer et retrouvez vos parties dans votre historique.</p></article><article><b>◈</b><h3>Bots & adversaires IA</h3><p>Affrontez des adversaires de niveaux différents et personnalisez vos propres bots dans les modes compatibles.</p></article><article><b>↗</b><h3>Statistiques détaillées</h3><p>Performances, records, tendances, classements et progression : vos résultats deviennent enfin exploitables.</p></article><article><b>⌂</b><h3>Clubs & organisations</h3><p>Membres, équipes, calendrier, compétitions, classements et vie collective dans un espace dédié.</p></article></div></section>

    <section className="mssShowcase">
      <div className="mssShowcaseCopy"><div className="mssEyebrow">VOS PERFORMANCES DEVIENNENT LISIBLES</div><h2>Des statistiques qui racontent vraiment votre progression.</h2><p>Centralisez parties, entraînements, records et tendances dans un même profil. Comparez vos résultats et retrouvez votre historique sans changer d’écosystème.</p><div className="mssMiniTags"><span>Historique</span><span>Records</span><span>Progression</span><span>Classements</span></div></div>
      <div className="mssDash"><div className="mssDashTop"><span>TABLEAU DE BORD</span><b>STATISTIQUES</b></div><div className="mssKpis"><article><small>PARTIES</small><strong>128</strong><i>+12 ce mois</i></article><article><small>VICTOIRES</small><strong>74%</strong><i>meilleure série 8</i></article><article><small>FORME</small><strong>↗ 9.4</strong><i>progression récente</i></article></div><div className="mssChart"><span style={{height:'38%'}}/><span style={{height:'52%'}}/><span style={{height:'47%'}}/><span style={{height:'68%'}}/><span style={{height:'61%'}}/><span style={{height:'79%'}}/><span style={{height:'91%'}}/></div><div className="mssDashLegend"><span>7 derniers résultats</span><b>PROGRESSION +18%</b></div></div>
    </section>

    <section className="mssOrg"><div className="mssOrgPanel"><div className="mssEyebrow">CLUBS • ÉQUIPES • ASSOCIATIONS • ENTREPRISES</div><h2>Votre organisation sportive, directement dans l’application.</h2><p>Gérez membres, équipes, calendrier, compétitions et classements dans un espace collectif connecté aux résultats de vos joueurs.</p><div className="mssOrgGrid"><span>👥 <b>Membres</b></span><span>▦ <b>Calendrier</b></span><span>🏆 <b>Compétitions</b></span><span>↗ <b>Classements</b></span></div></div><div className="mssOrgMock"><header><b>MULTISPORTS CLUB</b><span>SAISON 2026</span></header><div className="mssOrgScore"><small>PROCHAIN ÉVÉNEMENT</small><strong>Tournoi interclubs</strong><span>12 OCT. • 18:30</span></div><div className="mssOrgRows"><span><i>01</i> Équipe Alpha <b>42 pts</b></span><span><i>02</i> Les Challengers <b>38 pts</b></span><span><i>03</i> Team Horizon <b>31 pts</b></span></div></div></section>

    <section className="mssOnlineShowcase" id="online">
      <div className="mssOnlineCopy"><div className="mssEyebrow">ONLINE • BOTS • ADVERSAIRES IA</div><h2>Il y a toujours quelqu’un à affronter.</h2><p>Retrouvez vos amis et la communauté en ligne, ou lancez immédiatement une partie contre les adversaires IA disponibles dans les modes compatibles. Chaque personnage possède son identité et son niveau.</p><div className="mssOnlineFacts"><span><b>LOCAL + ONLINE</b><small>Jouez selon vos envies</small></span><span><b>NIVEAUX VARIÉS</b><small>Des adversaires pour progresser</small></span><span><b>UNIVERS UNIQUES</b><small>Des personnages propres aux modes</small></span></div></div>
      <div className="mssBotStage" aria-label="Exemples d’adversaires IA MULTISPORTS SCORING"><div className="mssBotHalo"/><article className="mssBotCard mssBotCard1"><img src={kael} alt="Kaël"/><strong>KAËL</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard2"><img src={zeno} alt="Zeno"/><strong>ZENO</strong><span>KILLER</span><i>IA</i></article><article className="mssBotCard mssBotCard3"><img src={aero} alt="Aero"/><strong>AERO</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard4"><img src={malysia} alt="Malysia"/><strong>MALYSIA</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard5"><img src={braze} alt="Braze"/><strong>BRAZE</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard6"><img src={lyna} alt="Lyna"/><strong>LYNA</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><div className="mssOnlineCenter"><b>ONLINE</b><strong>+</strong><b>BOTS IA</b><span>Jouez sans attendre</span></div></div>
    </section>

    <section className="mssAwenaSection" id="awena"><img src={awena} alt="Awena"/><div><div className="mssEyebrow">L’ASSISTANTE INTÉGRÉE À VOTRE EXPÉRIENCE</div><h2>AWENA est là quand vous en avez besoin.</h2><p>Règles, configuration, conseils et guidage : Awena accompagne vos parties et vos entraînements sans vous faire sortir de MULTISPORTS SCORING.</p><div className="mssAwenaSkills"><span>💬 Explique les règles</span><span>🎯 Guide votre partie</span><span>⚙️ Aide à configurer</span><span>📈 Accompagne l’entraînement</span></div><button onClick={onOpenApp}>DÉCOUVRIR MULTISPORTS SCORING</button></div></section>

    <section className="mssCommunity" id="community"><div><div className="mssEyebrow">JOUEZ • PARTAGEZ • PROGRESSEZ</div><h2>Votre univers sportif vous suit partout.</h2><p>Un même profil pour retrouver vos disciplines, vos équipes, vos parties, vos entraînements et vos performances.</p></div><div className="mssCommunityBtns"><button onClick={onOpenApp}>OUVRIR L’APPLICATION</button><span>Google Play • Microsoft Store • Web</span></div></section>

    <footer><img src={logo} alt=""/><span>© 2026 MULTISPORTS SCORING</span><span>22 disciplines • Une seule application</span></footer>
  </main>;
}
