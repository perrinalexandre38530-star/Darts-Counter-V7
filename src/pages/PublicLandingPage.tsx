import React, { useEffect, useState } from "react";
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
import zeno from "../assets/avatars/killer-bots/zeno.webp";
import gegeDeglingue from "../assets/avatars/crados-bots/deglingos_gege_deglingue.webp";
import eliaz from "../assets/avatars/attrape-moi/eliaz.png";
import greenMachine from "../assets/avatars/bots-pro/green-machine.png";
import lucky from "../assets/avatars/loterie-bots/lucky.webp";
import screenSports from "../assets/public-landing/screen-sports.webp";
import screenX01 from "../assets/public-landing/screen-x01.webp";
import screenStats from "../assets/public-landing/screen-stats.webp";
import { DARTS_GAMES, type DartsGameDef } from "../games/dartsGameRegistry";
import { DARTS_PUBLIC_RULE_AUDIT } from "../games/dartsPublicRulesAudit";


const landingTickerAssets = import.meta.glob("../assets/tickers/*.{png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const MSS_EXCLUSIVE_DARTS = new Set(["darts_firefighter", "crados", "attrape_moi", "loterie", "menteur", "president", "pendu", "cargo"]);
const DARTS_CATEGORY_LABEL: Record<string,string> = {
  classic: "GRANDS CLASSIQUES",
  variant: "VARIANTES",
  challenge: "DÉFIS",
  fun: "FUN",
  training: "ENTRAÎNEMENT",
};

function landingTickerFor(gameId: string): string | null {
  const alias: Record<string,string> = {
    fifty_one_by_five: "51_by_5",
    mario_kart: "darts_racer",
    killer_progressive: "killer",
    departements: "territories_fr",
  };
  const id = alias[gameId] || gameId;
  const candidates = [`ticker_${id}.png`,`ticker_${id}.webp`,`ticker_${id}_fr.png`,`ticker_${id}_fr.webp`];
  for (const wanted of candidates) {
    const hit = Object.entries(landingTickerAssets).find(([key]) => key.endsWith("/"+wanted));
    if (hit) return hit[1];
  }
  return null;
}

function publicDartsUrl(id: string) {
  return `#/welcome/darts/${encodeURIComponent(id)}`;
}

function isPublicDartsDevelopment(game: DartsGameDef) {
  const audit = DARTS_PUBLIC_RULE_AUDIT[game.id];
  if (audit?.status === "available") return false;
  if (audit?.status === "development") return true;
  return !game.ready || game.tab === "mode_not_ready";
}

function DartsRulePage({ game, onBack, onOpenApp }: { game: DartsGameDef; onBack: () => void; onOpenApp: () => void }) {
  const ticker = landingTickerFor(game.id);
  const exclusive = MSS_EXCLUSIVE_DARTS.has(game.id);
  const audit = DARTS_PUBLIC_RULE_AUDIT[game.id];
  const development = isPublicDartsDevelopment(game);
  const objective = game.infoBody.split(".")[0] + ".";
  const auditedOptions = audit?.options || [];
  return <main className="mssLanding mssRulesPage">
    <header className="mssNav">
      <button className="mssBrand" onClick={onBack}><img src={logo} alt=""/><span>MULTISPORTS <b>SCORING</b></span></button>
      <nav><button className="mssRulesBack" onClick={onBack}>← TOUS LES MODES</button></nav>
      <button className="mssOpen" onClick={onOpenApp}>OUVRIR L’APPLICATION</button>
    </header>
    <section className="mssRuleHero">
      <div className="mssRuleHeroArt">
        {ticker ? <img src={ticker} alt={`Visuel réel ${game.label} dans MULTISPORTS SCORING`}/> :
          <div className="mssRuleFallback"><img src={darts} alt=""/><span>MULTISPORTS SCORING</span><strong>{game.label}</strong></div>}
      </div>
      <div className="mssRuleHeroCopy">
        <div className="mssEyebrow">{exclusive ? "MODE EXCLUSIF MULTISPORTS SCORING" : DARTS_CATEGORY_LABEL[game.category] || "MODE FLÉCHETTES"}</div>
        <h1>{game.label}</h1>
        {development && <div className="mssDevBanner">EN DÉVELOPPEMENT</div>}
        <p>{development ? "Ce mode fait partie du catalogue MULTISPORTS SCORING mais son moteur de jeu n’est pas encore disponible dans cette version. Sa fiche présente le concept actuellement défini." : game.infoBody}</p>
        <div className="mssRuleBadges">
          <span>JOUEURS</span>
          {game.supportsTeams && <span>ÉQUIPES</span>}
          {game.supportsBots && <span>BOTS IA</span>}
        </div>
      </div>
    </section>
    <section className="mssRuleContent">
      <article><b>01</b><h2>OBJECTIF</h2><p>{objective}</p></article>
      <article><b>02</b><h2>PRINCIPE & RÈGLES</h2><p>{game.infoBody}</p>{audit?.sources?.length ? <small className="mssAuditStamp">RÈGLES VÉRIFIÉES DANS LE MOTEUR MSS</small> : null}</article>
      <article><b>03</b><h2>FORMAT DE PARTIE</h2><p>Le nombre de joueurs n’est volontairement pas présenté comme une limite fixe sur cette fiche. La configuration réelle du mode dans MSS fait foi.{game.supportsTeams ? " La gestion des équipes est déclarée compatible pour ce moteur." : ""}{game.supportsBots ? " Les bots IA sont déclarés compatibles lorsque la configuration du mode les propose." : ""}</p></article>
      <article className="mssRuleConfig"><b>04</b><h2>RÈGLES & PARAMÈTRES AUDITÉS</h2>{development ? <p>EN DÉVELOPPEMENT — aucun paramétrage jouable ne doit être présenté comme disponible tant que le moteur n’est pas activé.</p> : auditedOptions.length ? <><p>Éléments vérifiés directement dans les écrans Config, Play et/ou le moteur de ce mode :</p><ul>{auditedOptions.map((option) => <li key={option}>{option}</li>)}</ul></> : <p>Audit détaillé en cours. Cette fiche conserve uniquement les informations déjà confirmées et n’invente aucun réglage supplémentaire.</p>}</article>
      <article><b>05</b><h2>STATUT DANS MSS</h2><p>{development ? "EN DÉVELOPPEMENT — le concept est référencé dans le catalogue MSS, mais la partie jouable n’est pas encore activée." : "DISPONIBLE — le mode est activé dans MULTISPORTS SCORING. La configuration de partie applique les options et variantes prévues par ce moteur."}</p></article>
      {!development && <article><b>06</b><h2>DÉROULEMENT</h2><p>Créez ou sélectionnez vos profils, réglez les options du mode puis lancez la partie. MULTISPORTS SCORING assure le suivi du tour, des scores et des événements propres à ce jeu.</p></article>}
      {!development && <article><b>07</b><h2>FIN DE PARTIE</h2><p>La partie se termine lorsque la condition de victoire propre au mode est atteinte. Les résultats sont alors exploitables par l’historique et les statistiques compatibles avec ce moteur.</p></article>}
    </section>
    <section className="mssRuleCta"><div><span>{development ? "BIENTÔT DANS MSS" : "PRÊT À ESSAYER ?"}</span><h2>{development ? `${game.label} est actuellement en développement.` : `${game.label} est disponible dans MULTISPORTS SCORING.`}</h2></div>{!development && <button onClick={onOpenApp}>JOUER DANS L’APPLICATION</button>}</section>
  </main>;
}

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
  const [routeHash, setRouteHash] = useState(() => window.location.hash);
  const [dartsFilter, setDartsFilter] = useState<"classic"|"exclusive"|"fun"|"challenge"|"variant"|"training"|"development">("classic");
  const [dartsSearch, setDartsSearch] = useState("");

  useEffect(() => {
    const syncHash = () => setRouteHash(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const allDartsGames = DARTS_GAMES.filter((g) => g.entry === "games" || g.entry === "training");
  const readyDartsGames = allDartsGames.filter((g) => !isPublicDartsDevelopment(g));
  const developmentDartsGames = allDartsGames.filter((g) => isPublicDartsDevelopment(g));
  const ruleMatch = routeHash.match(/^#\/welcome\/darts\/([^?]+)/);
  if (ruleMatch) {
    const id = decodeURIComponent(ruleMatch[1]);
    const game = allDartsGames.find((g) => g.id === id);
    if (game) return <DartsRulePage game={game} onOpenApp={onOpenApp} onBack={() => {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/welcome`);
      setRouteHash("#/welcome");
      window.setTimeout(() => document.getElementById("darts-modes")?.scrollIntoView({ block: "start", behavior: "auto" }), 0);
    }} />;
  }

  const catalogueGroups = (() => {
    const groups = {
      classic: [] as DartsGameDef[],
      exclusive: [] as DartsGameDef[],
      fun: [] as DartsGameDef[],
      challenge: [] as DartsGameDef[],
      variant: [] as DartsGameDef[],
      training: [] as DartsGameDef[],
      development: [] as DartsGameDef[],
    };
    for (const game of allDartsGames) {
      if (isPublicDartsDevelopment(game)) groups.development.push(game);
      else if (MSS_EXCLUSIVE_DARTS.has(game.id)) groups.exclusive.push(game);
      else if (game.category === "classic") groups.classic.push(game);
      else if (game.category === "fun") groups.fun.push(game);
      else if (game.category === "challenge") groups.challenge.push(game);
      else if (game.category === "training") groups.training.push(game);
      else groups.variant.push(game);
    }
    return groups;
  })();

  const categoryDartsGames = catalogueGroups[dartsFilter];
  const normalizedDartsSearch = dartsSearch.trim().toLocaleLowerCase("fr");
  const filteredDartsGames = normalizedDartsSearch
    ? categoryDartsGames.filter((game) => `${game.label} ${game.infoBody}`.toLocaleLowerCase("fr").includes(normalizedDartsSearch))
    : categoryDartsGames;
  const auditedReadyGames = readyDartsGames.filter((game) => (DARTS_PUBLIC_RULE_AUDIT[game.id]?.sources?.length || 0) > 0);
  const auditPercent = readyDartsGames.length ? Math.round((auditedReadyGames.length / readyDartsGames.length) * 100) : 0;
  const remainingAuditCount = Math.max(0, readyDartsGames.length - auditedReadyGames.length);

  const catalogueCards = [
    ["classic","GRANDS CLASSIQUES","Les incontournables des fléchettes : X01, Cricket, Killer, Shanghai et autres références."],
    ["exclusive","EXCLUSIVITÉS MSS","Les créations propres à MULTISPORTS SCORING : Firefighter, CRADOS, Loterie, Menteur, Président, Le Pendu, Cargo…"],
    ["fun","FUN","Des parties pensées pour l’ambiance, les soirées et les règles décalées."],
    ["challenge","DÉFIS","CHALLENGE et les autres modes à objectifs : scoring, précision, performance, duel et élimination."],
    ["variant","VARIANTES","Des façons différentes de jouer et de revisiter la cible."],
    ["training","TRAINING","Training X01, Tour de l’horloge, Double In / Double Out, Challenges, Super Bull, Ghost Mode, Precision Gauntlet, Repeat Master et Time Attack."],
    ["development","EN DÉVELOPPEMENT","Les prochains modes déjà référencés dans MSS, clairement séparés des jeux actuellement jouables."],
  ] as const;

  return <main className="mssLanding" id="top">
    <header className="mssNav">
      <button className="mssBrand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="MULTISPORTS SCORING accueil"><img src={logo} alt=""/><span>MULTISPORTS <b>SCORING</b></span></button>
      <nav><a href="#darts-modes">Fléchettes</a><a href="#disciplines">Disciplines</a><a href="#features">Fonctionnalités</a><a href="#awena">Awena</a><a href="#download">Télécharger</a></nav>
      <button className="mssOpen" onClick={onOpenApp}>OUVRIR L’APPLICATION</button>
    </header>

    <section className="mssHero">
      <div className="mssHeroCopy">
        <div className="mssPill">✦ APPLICATION GRATUITE • MULTISPORTS</div>
        <h1>UNE APPLICATION.<br/><em>TOUS VOS SPORTS.</em></h1>
        <p className="mssLead">Jouez, scorez, entraînez-vous et suivez vos performances dans un seul univers. MULTISPORTS SCORING réunit le jeu local et online, les statistiques, les équipes, les bots et les outils pour clubs.</p>
        <div className="mssCtas"><button onClick={onOpenApp}>COMMENCER GRATUITEMENT</button><a href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer">GOOGLE PLAY</a></div>
        <div className="mssStoreLine"><span>✓ Gratuit</span><span>✓ Google Play</span><span>✓ Version Web</span></div>
      </div>
      <div className="mssHeroVisual" aria-label="Les disciplines MULTISPORTS SCORING">
        <div className="mssVisualKicker">UN ÉCOSYSTÈME • 22 DISCIPLINES</div>
        <div className="mssGlow"/>
        <div className="mssOrbit mssOrbitOuter">{sports.slice(0,12).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n}/></div>)}</div>
        <div className="mssOrbit mssOrbitInner">{sports.slice(12,22).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n}/></div>)}</div>
        <div className="mssHeroCore"><img src={logo} alt="MULTISPORTS SCORING"/><strong>22</strong><span>DISCIPLINES</span></div>
        <div className="mssHeroFeatureRail" aria-label="Fonctionnalités principales"><span><b>ONLINE</b><small>Communauté</small></span><span><b>BOTS IA</b><small>Adversaires</small></span><span><b>STATS</b><small>Progression</small></span></div>
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

    <section className="mssDartsUniverse" id="darts-modes">
      <div className="mssDartsIntro">
        <div><div className="mssEyebrow">L’UNIVERS FLÉCHETTES MULTISPORTS SCORING</div><h2><em>{allDartsGames.length}</em> modes référencés.<br/><span>{readyDartsGames.length} disponibles aujourd’hui.</span></h2><p>Les grands classiques des fléchettes côtoient les variantes, défis, modes fun et créations exclusives MULTISPORTS SCORING. Les modes encore en préparation restent visibles et clairement marqués « EN DÉVELOPPEMENT ».</p></div>
        <div className="mssDartsPromises"><span><strong>CLASSIQUES</strong><small>X01 • Cricket • Killer • Shanghai • Golf…</small></span><span><strong>EXCLUSIFS MSS</strong><small>DARTS FIREFIGHTER • CRADOS • ATTRAPE-MOI SI TU PEUX ! • LOTERIE • MENTEUR • PRÉSIDENT • LE PENDU • CARGO</small></span><span><strong>CATALOGUE COMPLET</strong><small>{readyDartsGames.length} disponibles • {developmentDartsGames.length} en développement</small></span><span><strong>RÈGLES MSS</strong><small>{auditedReadyGames.length}/{readyDartsGames.length} modes disponibles déjà reliés à leurs sources Config / Play / moteur</small></span></div>
      </div>
      <div className="mssDartsCategoryGrid">
        {catalogueCards.map(([id,label,description]) => {
          const count = catalogueGroups[id].length;
          return <button key={id} className={`mssDartsCategoryCard${dartsFilter === id ? " isActive" : ""}`} onClick={() => { setDartsFilter(id); setDartsSearch(""); }}>
            <span>{String(count).padStart(2,"0")}</span><strong>{label}</strong><p>{description}</p><small>VOIR LES MODES →</small>
          </button>;
        })}
      </div>
      <div className="mssDartsAuditBar"><div><span>DOCUMENTATION DES RÈGLES</span><strong>{auditPercent}%</strong></div><div className="mssDartsAuditTrack"><i style={{width:`${auditPercent}%`}}/></div><small>Audit en cours directement depuis les écrans Config, Play et moteurs MSS. Les modes non encore vérifiés restent clairement identifiables.</small></div>
      <div className="mssDartsAuditKpis">
        <div><strong>{readyDartsGames.length}</strong><span>MODES DISPONIBLES</span></div>
        <div><strong>{auditedReadyGames.length}</strong><span>FICHES AUDITÉES</span></div>
        <div><strong>{remainingAuditCount}</strong><span>À DOCUMENTER</span></div>
      </div>
      <div className="mssDartsStatusNote"><strong>CATALOGUE VÉRIFIÉ</strong><span>Un mode n'est affiché comme disponible que si son état public est réellement jouable. Les concepts encore reliés à <code>mode_not_ready</code> sont automatiquement rangés dans « En développement ».</span></div>
      <div className="mssDartsToolbar"><label><span>RECHERCHER UN MODE</span><input value={dartsSearch} onChange={(e) => setDartsSearch(e.target.value)} placeholder="X01, Killer, Challenge, Firefighter…" /></label><div className="mssDartsQuickFilters">{catalogueCards.map(([id,label]) => <button key={id} className={dartsFilter===id ? "isActive" : ""} onClick={() => {setDartsFilter(id);setDartsSearch("");}}>{label}<b>{catalogueGroups[id].length}</b></button>)}</div></div>
      <div className="mssDartsListHeader"><div><span>CATÉGORIE</span><h3>{catalogueCards.find(([id]) => id === dartsFilter)?.[1]}</h3></div><b>{filteredDartsGames.length} MODE{filteredDartsGames.length > 1 ? "S" : ""}</b></div>
      <div className="mssDartsModeGrid">
        {filteredDartsGames.map((game, index) => {
          const ticker = landingTickerFor(game.id);
          const exclusive = MSS_EXCLUSIVE_DARTS.has(game.id);
          const development = isPublicDartsDevelopment(game);
          return <a className={`mssDartsModeCard${exclusive ? " isExclusive" : ""}${development ? " isDevelopment" : ""}`} href={publicDartsUrl(game.id)} key={game.id}>
            <div className="mssDartsModeVisual">{ticker ? <img src={ticker} alt={`Visuel ${game.label}`}/> : <div className="mssDartsMiniFallback"><img src={darts} alt=""/><b>{String(index+1).padStart(2,"0")}</b></div>}<span>{development ? "EN DÉVELOPPEMENT" : exclusive ? "EXCLUSIF MSS" : DARTS_CATEGORY_LABEL[game.category]}</span>{exclusive && development && <i className="mssExclusiveCorner">EXCLUSIF MSS</i>}</div>
            <div className="mssDartsModeText"><div className="mssModeTitleRow"><strong>{game.label}</strong>{!development && DARTS_PUBLIC_RULE_AUDIT[game.id]?.sources?.length ? <i>✓ AUDITÉ</i> : null}</div><p>{development ? "Mode référencé dans le catalogue MSS. Développement du moteur en cours." : game.infoBody}</p><small>{development ? "DÉCOUVRIR LE CONCEPT →" : "VOIR LA FICHE COMPLÈTE →"}</small></div>
          </a>;
        })}
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
      <div className="mssBotStage" aria-label="Exemples d’adversaires IA MULTISPORTS SCORING"><div className="mssBotHalo"/><article className="mssBotCard mssBotCard1"><img src={kael} alt="Kaël"/><strong>KAËL</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard2"><img src={greenMachine} alt="Green Machine"/><strong>GREEN MACHINE</strong><span>BOT IA PRO</span><i>PRO</i></article><article className="mssBotCard mssBotCard3"><img src={gegeDeglingue} alt="Gégé Déglingué"/><strong>GÉGÉ DÉGLINGUÉ</strong><span>CRADOS</span><i>IA</i></article><article className="mssBotCard mssBotCard4"><img src={eliaz} alt="Eliaz"/><strong>ELIAZ</strong><span>ARRÊTE-MOI SI TU PEUX</span><i>IA</i></article><article className="mssBotCard mssBotCard5"><img src={zeno} alt="Zeno"/><strong>ZENO</strong><span>KILLER</span><i>IA</i></article><article className="mssBotCard mssBotCard6"><img src={lucky} alt="Lucky"/><strong>LUCKY</strong><span>LOTERIE</span><i>IA</i></article><div className="mssOnlineCenter"><b>ONLINE</b><strong>+</strong><b>BOTS IA</b><span>Plusieurs univers</span></div></div>
    </section>

    <section className="mssAwenaSection" id="awena">
      <div className="mssAwenaVisual"><div className="mssAwenaGlow"/><img src={awena} alt="Awena, assistante MULTISPORTS SCORING"/><span className="mssAwenaBubble mssAwenaBubbleA">« Je vous explique la règle. »</span><span className="mssAwenaBubble mssAwenaBubbleB">« À vous de jouer ! »</span></div>
      <div><div className="mssEyebrow">L’ASSISTANTE INTÉGRÉE À VOTRE EXPÉRIENCE</div><h2>AWENA vous accompagne, sans interrompre le jeu.</h2><p>Règles, configuration, conseils et guidage : Awena intervient directement dans MULTISPORTS SCORING lorsque vous en avez besoin.</p><div className="mssAwenaSkills"><span><b>01</b> Explique les règles</span><span><b>02</b> Guide votre partie</span><span><b>03</b> Aide à configurer</span><span><b>04</b> Accompagne l’entraînement</span></div><button onClick={onOpenApp}>DÉCOUVRIR AWENA DANS L’APPLICATION</button></div>
    </section>

    <section className="mssDownload" id="download">
      <div className="mssDownloadCopy"><div className="mssEyebrow">PRÊT À JOUER ?</div><h2>Votre univers sportif commence ici.</h2><p>Accédez à MULTISPORTS SCORING depuis le Web ou installez l’application Android. Vos disciplines, vos profils et vos performances restent réunis dans la même expérience.</p><div className="mssDownloadActions"><a className="mssPlayCta" href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer"><small>DISPONIBLE SUR</small><strong>Google Play</strong></a><button className="mssWebCta" onClick={onOpenApp}><small>UTILISER MAINTENANT</small><strong>Ouvrir l’application</strong></button></div><div className="mssDownloadMeta"><span>✓ Application gratuite</span><span>✓ 22 disciplines</span><span>✓ Local + Online</span><span>✓ Statistiques</span></div></div>
      <div className="mssDownloadMark"><div className="mssDownloadRing"><img src={logo} alt="MULTISPORTS SCORING"/><strong>MULTISPORTS</strong><b>SCORING</b><span>JOUEZ • SCOREZ • PROGRESSEZ</span></div></div>
    </section>

    <section className="mssCommunity" id="community"><div><div className="mssEyebrow">UN SEUL PROFIL • TOUT VOTRE SPORT</div><h2>Vos performances vous suivent partout.</h2><p>Retrouvez vos disciplines, vos équipes, vos parties, vos entraînements et votre progression dans le même écosystème.</p></div><div className="mssCommunityBtns"><button onClick={onOpenApp}>COMMENCER GRATUITEMENT</button><span>Web • Android • MULTISPORTS SCORING</span></div></section>

    <footer className="mssFooter">
      <div className="mssFooterBrand"><img src={logo} alt=""/><div><strong>MULTISPORTS <b>SCORING</b></strong><span>22 disciplines • Une seule application</span></div></div>
      <div className="mssFooterLinks"><a href="https://multisports-scoring.pages.dev/privacy-policy/" target="_blank" rel="noreferrer">Politique de confidentialité</a><a href="https://multisports-scoring.pages.dev/terms-of-service/" target="_blank" rel="noreferrer">Conditions d’utilisation</a><a href="#disciplines">Disciplines</a><a href="#awena">Awena</a><a href="#download">Télécharger</a><a href="#top">Retour en haut ↑</a></div>
      <span className="mssCopyright">© 2026 MULTISPORTS SCORING</span>
    </footer>
  </main>;
}
