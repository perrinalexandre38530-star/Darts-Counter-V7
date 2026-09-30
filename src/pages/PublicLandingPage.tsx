import React, { useEffect, useLayoutEffect, useState } from "react";
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
import languages22Fr from "../assets/public-landing/languages-22-fr.webp";
import languages22En from "../assets/public-landing/languages-22-en.webp";
import { DARTS_GAMES, type DartsGameDef } from "../games/dartsGameRegistry";
import { DARTS_PUBLIC_RULE_AUDIT } from "../games/dartsPublicRulesAudit";
import { useLang, type Lang } from "../contexts/LangContext";


const landingTickerAssets = import.meta.glob("../assets/tickers/*.{png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const MSS_EXCLUSIVE_DARTS = new Set(["darts_firefighter", "crados", "attrape_moi", "loterie", "menteur", "president", "pendu", "cargo"]);
const NEW_PUBLIC_DARTS = new Set(["mistigri", "corbeau_renard", "radin", "darts_impossible"]);
const DARTS_CATEGORY_LABEL: Record<string,string> = {
  classic: "GRANDS CLASSIQUES",
  variant: "VARIANTES",
  challenge: "DÉFIS",
  fun: "FUN",
  training: "ENTRAÎNEMENT",
};

const PUBLIC_RULE_CONFIG_COPY: Record<string,string> = {
  x01: "Avant de jouer, choisissez le score de départ (301, 501, 701 ou 901), le mode d’entrée et de sortie (Simple, Double ou Master selon les options proposées), puis le format du match en legs et en sets. Vous pouvez également régler l’ordre des joueurs, les sons et la voix lorsque ces options sont activées.",
  cricket: "La configuration permet de choisir les participants et les variantes proposées par le Cricket, puis de préparer la partie autour des cibles 15, 16, 17, 18, 19, 20 et Bull. Les options disponibles déterminent notamment la façon de fermer les cibles et de comptabiliser les points pendant la partie.",
  killer: "Avant le lancement, sélectionnez les joueurs puis la manière d’attribuer les numéros. La configuration permet de préparer la phase où chaque joueur devient Killer, puis la phase d’élimination. Lorsque les options correspondantes sont disponibles, vous pouvez aussi jouer avec des bots IA et adapter leur niveau.",
  shanghai: "Choisissez les joueurs et les paramètres de la partie avant de commencer. Le jeu fait ensuite progresser la cible de round en round ; l’objectif est de marquer sur le numéro demandé et de rechercher un Shanghai en réalisant un simple, un double et un triple du même numéro pendant le même round.",
  battle_royale: "La configuration sert à préparer les participants, le format de la confrontation et les éventuelles options d’élimination proposées par ce mode. Chaque joueur doit ensuite survivre aux manches successives jusqu’à la condition de victoire prévue par la partie.",
  warfare: "Avant la partie, répartissez les participants dans les camps prévus par le mode et choisissez les options disponibles. La partie se joue ensuite comme un affrontement : les touches valides attaquent les cibles adverses et la victoire dépend de la destruction ou de l’élimination du camp opposé.",
  five_lives: "Chaque joueur commence avec un nombre de vies défini par le mode. La configuration permet de choisir les participants et les options disponibles ; pendant la partie, chaque volée doit respecter l’objectif imposé sous peine de perdre une vie. Le dernier joueur encore en jeu remporte la partie.",
  gros_6: "Avant le lancement, choisissez les joueurs ou les équipes, la gestion des vies et les options de cible proposées par le mode. Gros 6 commence sur le simple 6 : le joueur dispose de trois fléchettes pour atteindre la cible active. Une validation permet d’imposer la cible suivante ; un échec fait perdre une vie selon les règles choisies. Les bots IA peuvent être ajoutés lorsque cette option est activée.",
  golf: "La configuration permet de choisir les joueurs et le parcours proposé par le mode. Chaque manche correspond à un trou et à une cible précise ; le but est de terminer le parcours avec le meilleur résultat possible en optimisant chaque volée.",
  scram: "Préparez les participants et les rôles prévus par la variante avant de lancer la partie. Scram oppose généralement un joueur qui ferme les cibles à un joueur qui cherche à marquer dessus ; les rôles et le comptage sont ensuite inversés afin de comparer les performances.",
  enculette: "Choisissez les joueurs et le nombre de rounds avant de commencer. Chaque volée ajoute son score au total, avec les pénalités prévues par le mode lorsqu’une volée ne rapporte rien. La configuration sert surtout à fixer la durée de la partie et les conditions de classement.",
  cricket_cut_throat: "Préparez les participants comme pour un Cricket, puis utilisez la variante Cut Throat : une fois une cible fermée de votre côté, les points supplémentaires sont envoyés aux adversaires qui ne l’ont pas encore fermée. La configuration permet d’adapter le format de la partie et les participants.",
  killer_progressive: "Choisissez les joueurs, puis laissez le mode attribuer ou déterminer le numéro de chacun selon les règles proposées. La progression vers le statut de Killer et les conditions d’élimination sont ensuite gérées automatiquement pendant la partie.",
  super_bull: "Définissez le nombre de rounds et, lorsqu’il est proposé, l’objectif à atteindre. Le mode est centré sur le Bull : les touches au Bull et au Double Bull alimentent le score selon les règles de cette variante. La configuration permet d’adapter la durée du défi aux joueurs.",
  happy_mille: "Choisissez les participants, le nombre de rounds et l’objectif de score proposé par le mode. Chaque volée fait progresser le total ; le but est d’atteindre l’objectif fixé, avec les règles de fin prévues par la variante.",
  v170: "Réglez le nombre de rounds puis lancez le défi. L’objectif est de réaliser une volée totalisant exactement 170 ; chaque réussite est comptabilisée par le mode afin de départager les joueurs à la fin du nombre de manches prévu.",
  challenge: "Choisissez une cible de 1 à 20 ou le Bull, puis définissez le nombre de volées du défi. La partie mesure ensuite la capacité de chaque joueur à atteindre précisément cette cible pendant toute la session.",
  count_up: "Choisissez les participants, le nombre de rounds et éventuellement un objectif de score. Toutes les fléchettes valides s’ajoutent au total : la configuration permet donc d’en faire soit un défi limité en manches, soit une course vers un score cible.",
  halve_it: "Préparez les joueurs et la séquence d’objectifs utilisée par la partie. À chaque manche, seule la cible demandée rapporte ; un échec sur toute la volée entraîne la pénalité prévue par Halve It, généralement une division du score.",
  bobs_27: "Le défi démarre avec 27 points et parcourt successivement les doubles D1 à D20 puis le Double Bull. La configuration prépare les participants et la session ; chaque double réussi fait progresser le score, tandis que les échecs appliquent la pénalité propre à Bob’s 27.",
  shooter: "Choisissez les joueurs et la séquence de cibles proposée par le mode. La configuration permet d’adapter le parcours de précision et les zones autorisées avant de lancer la série de volées.",
  baseball: "Préparez les joueurs pour les neuf manches. À la manche N, le numéro N devient la cible : simple, double et triple produisent des valeurs différentes. Le mode comptabilise automatiquement les runs et gère le classement final.",
  attrape_moi: "Configurez les participants et les paramètres de poursuite proposés par le mode, notamment l’avance du Fuyard lorsqu’elle est réglable. La partie oppose ensuite le Fuyard aux poursuivants jusqu’à ce qu’il s’échappe ou soit rattrapé.",
  football: "Choisissez les joueurs ou équipes et les paramètres du match proposés par le mode. La partie reproduit une rencontre de football avec possession, phases d’attaque et occasions de marquer, le moteur gérant automatiquement l’évolution du match.",
  rugby: "Préparez les participants ou équipes et le format de rencontre. La progression se fait à travers les zones prévues par le terrain de jeu jusqu’à l’essai, avec les transformations et règles spécifiques gérées par le moteur.",
  capital: "Choisissez les participants et le nombre de rounds. Chaque manche impose un objectif différent — par exemple doubles, triples, nombres pairs ou impairs — et seuls les tirs conformes à la contrainte active sont pris en compte.",
  departements: "Choisissez la carte ou la variante territoriale proposée, puis les participants. Les touches permettent ensuite de conquérir ou défendre les zones correspondantes ; la configuration adapte la partie au territoire sélectionné.",
  darts_firefighter: "Choisissez les membres de la brigade, les éventuels bots IA et les options de mission proposées. Pendant la partie, les touches déclenchent les actions de lutte contre l’incendie sur la carte ; le Bull et le Double Bull peuvent produire des actions spéciales selon les règles du mode.",
  cargo: "Choisissez les participants et les paramètres de mission disponibles. Chaque joueur doit réussir les séries et contrats demandés pour charger sa cargaison ; le moteur suit automatiquement la progression des palettes et les objectifs accomplis.",
};

function publicRuleConfigCopy(game: DartsGameDef, lang: Lang, tr: (key:string, fallback:string) => string) {
  const generic = tr("rules.configNarrative", "Avant de lancer la partie, vous choisissez les joueurs et les réglages proposés par ce mode. Vous pouvez adapter le format de partie et les paramètres de jeu disponibles depuis son écran de configuration.");
  // The detailed audited copy is currently authored in French. For every other
  // language, prefer its translated generic configuration text unless a
  // dedicated game translation exists, so French can never leak into EN/ES/etc.
  if (lang !== "fr") return tr(`game.${game.id}.configNarrative`, generic);
  return PUBLIC_RULE_CONFIG_COPY[game.id]
    || "Avant de lancer la partie, choisissez les participants puis adaptez les paramètres proposés par ce mode depuis son écran de configuration. Les réglages affichés sont ceux réellement disponibles pour cette variante.";
}

const PUBLIC_LANGUAGES: ReadonlyArray<{ code: Lang; label: string; flag: string }> = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "sr", label: "Srpski", flag: "🇷🇸" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "is", label: "Íslenska", flag: "🇮🇸" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];


function landingTickerFor(gameId: string, lang: Lang): string | null {
  const alias: Record<string,string> = {
    fifty_one_by_five: "51_by_5",
    mario_kart: "darts_racer",
    killer_progressive: "killer",
    departements: "territories_fr",
    training_x01: "x01",
    training_super_bull: "super_bull",
  };
  const id = alias[gameId] || gameId;
  const candidates = lang === "fr" ? [`ticker_${id}_fr.webp`,`ticker_${id}_fr.png`,`ticker_${id}.webp`,`ticker_${id}.png`] : [`ticker_${id}_en.webp`,`ticker_${id}_en.png`,`ticker_${id}.webp`,`ticker_${id}.png`];
  for (const wanted of candidates) {
    const hit = Object.entries(landingTickerAssets).find(([key]) => key.endsWith("/"+wanted));
    if (hit) return hit[1];
  }
  return null;
}

function publicDartsUrl(id: string) {
  return `#/welcome/darts/${encodeURIComponent(id)}`;
}

function forcePublicPageTop() {
  const root = document.scrollingElement || document.documentElement;
  root.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
}

function openPublicDartsRule(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  // pushState is intentional: unlike assigning location.hash, it does not ask
  // the browser to restore the previous vertical position of this hash route.
  window.history.pushState(null, "", publicDartsUrl(id));
  forcePublicPageTop();
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.requestAnimationFrame(forcePublicPageTop);
  window.setTimeout(forcePublicPageTop, 0);
  window.setTimeout(forcePublicPageTop, 80);
  window.setTimeout(forcePublicPageTop, 250);
}

function isPublicDartsDevelopment(game: DartsGameDef) {
  const audit = DARTS_PUBLIC_RULE_AUDIT[game.id];
  if (audit?.status === "available") return false;
  if (audit?.status === "development") return true;
  return !game.ready || game.tab === "mode_not_ready";
}

function DartsRulePage({ game, onBack, onOpenApp, lang, setLang, t }: { game: DartsGameDef; onBack: () => void; onOpenApp: () => void; lang: Lang; setLang: (lang: Lang) => void; t: (key: string, fallback?: string) => string }) {
  const tr = (key: string, fallback: string) => lang === "fr" ? fallback : t(`landing.${key}`, fallback);
  const ticker = landingTickerFor(game.id, lang);
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    const top = forcePublicPageTop;
    top();
    const a = window.requestAnimationFrame(top);
    const b = window.setTimeout(top, 0);
    const c = window.setTimeout(top, 80);
    const d = window.setTimeout(top, 250);
    const e = window.setTimeout(top, 600);
    return () => { window.cancelAnimationFrame(a); window.clearTimeout(b); window.clearTimeout(c); window.clearTimeout(d); window.clearTimeout(e); };
  }, [game.id]);
  const exclusive = MSS_EXCLUSIVE_DARTS.has(game.id);
  const audit = DARTS_PUBLIC_RULE_AUDIT[game.id];
  const development = isPublicDartsDevelopment(game);
  const objective = game.infoBody.split(".")[0] + ".";
  const catalogueGames = DARTS_GAMES.filter((item) => item.id !== game.id);
  const sameCategoryGames = catalogueGames.filter((item) => item.category === game.category && isPublicDartsDevelopment(item) === development).slice(0, 4);
  const currentIndex = DARTS_GAMES.findIndex((item) => item.id === game.id);
  const previousGame = currentIndex > 0 ? DARTS_GAMES[currentIndex - 1] : null;
  const nextGame = currentIndex >= 0 && currentIndex < DARTS_GAMES.length - 1 ? DARTS_GAMES[currentIndex + 1] : null;
  return <main key={`${game.id}-${lang}`} className="mssLanding mssRulesPage">
    <header className="mssNav">
      <button className="mssBrand" onClick={onBack}><img src={logo} alt=""/><span translate="no" data-i18n-skip="true">MULTISPORTS <b>SCORING</b></span></button>
      <nav><button className="mssRulesBack" onClick={onBack}>{tr("rules.allModesBack", "← TOUS LES MODES")}</button></nav>
      <label className="mssLanguageSelect" title="Choisir la langue">
        <span aria-hidden="true">{(PUBLIC_LANGUAGES.find((item) => item.code === lang) || PUBLIC_LANGUAGES[0]).flag}</span>
        <select value={lang} onChange={(event) => setLang(event.target.value as Lang)} aria-label="Choisir la langue de la page">
          {PUBLIC_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.label}</option>)}
        </select>
      </label>
      <button className="mssOpen" onClick={onOpenApp}>{tr("actions.openApp", "OUVRIR L’APPLICATION")}</button>
    </header>
    <div className="mssRuleBreadcrumb"><button onClick={onBack}>{tr("rules.dartsModes", "MODES DE FLÉCHETTES")}</button><span>›</span><b>{game.label}</b><i>{development ? tr("status.development", "EN DÉVELOPPEMENT") : tr("status.available", "DISPONIBLE")}</i></div>
    <section className="mssRuleHero">
      <div className="mssRuleHeroArt">
        {ticker ? <img src={ticker} alt={`Visuel réel ${game.label} dans MULTISPORTS SCORING`} decoding="async" fetchPriority="high"/> :
          <div className="mssRuleFallback"><img src={darts} alt=""/><span>MULTISPORTS SCORING</span><strong>{game.label}</strong></div>}
      </div>
      <div className="mssRuleHeroCopy">
        <div className="mssEyebrow">{exclusive ? tr("rules.exclusiveMode", "MODE EXCLUSIF MULTISPORTS SCORING") : tr(`category.${game.category}`, DARTS_CATEGORY_LABEL[game.category] || "MODE FLÉCHETTES")}</div>
        {development && <div className="mssDevBanner">{tr("status.development", "EN DÉVELOPPEMENT")}</div>}
        <p>{development ? tr("rules.developmentIntro", "Ce mode fait partie du catalogue MULTISPORTS SCORING mais son moteur de jeu n’est pas encore disponible dans cette version. Sa fiche présente le concept actuellement défini.") : tr(`game.${game.id}.info`, game.infoBody)}</p>
        <div className="mssRuleBadges">
          <span>{tr("rules.players", "JOUEURS")}</span>
          {game.supportsTeams && <span>{tr("rules.teams", "ÉQUIPES")}</span>}
          {game.supportsBots && <span>{tr("rules.aiBots", "BOTS IA")}</span>}
        </div>
      </div>
    </section>
    <nav className="mssRuleQuickNav" aria-label="Navigation dans la règle">
      <a href="#regles">{tr("rules.rules", "RÈGLES")}</a>
      <a href="#configuration">{tr("rules.configuration", "CONFIGURATION")}</a>
      <a href="#autres-modes">{tr("rules.otherModes", "AUTRES MODES")}</a>
    </nav>
    <section className="mssRuleSummary">
      <div><span>{tr("rules.objective", "OBJECTIF")}</span><strong>{tr(`game.${game.id}.objective`, objective)}</strong></div>
      <div><span>{tr("rules.category", "CATÉGORIE")}</span><strong>{exclusive ? tr("rules.mssExclusive", "Exclusivité MSS") : tr(`category.${game.category}`, DARTS_CATEGORY_LABEL[game.category] || "Fléchettes")}</strong></div>
      <div><span>{tr("rules.options", "OPTIONS")}</span><strong>{[game.supportsTeams ? tr("rules.teams", "Équipes") : "", game.supportsBots ? tr("rules.aiBots", "Bots IA") : ""].filter(Boolean).join(" • ") || tr("rules.dependsMode", "Selon le mode")}</strong></div>
    </section>
    {development && <section className="mssDevelopmentNotice"><div><span>{tr("rules.modePreparing", "MODE EN PRÉPARATION")}</span><h2>{tr("rules.sheetWillEvolve", "Cette fiche évoluera avec le développement du moteur.")}</h2><p>{tr("rules.developmentNotice", "Le concept est déjà référencé dans le catalogue MULTISPORTS SCORING. Les règles, options et écrans jouables seront détaillés ici uniquement lorsqu’ils seront réellement intégrés à l’application.")}</p></div><b>WORK IN<br/>PROGRESS</b></section>}
    <section className="mssRuleContent" id="regles">
      <article><b>01</b><h2>{tr("rules.objective", "OBJECTIF")}</h2><p>{tr(`game.${game.id}.objective`, objective)}</p></article>
      <article><b>02</b><h2>{tr("rules.principle", "PRINCIPE & RÈGLES")}</h2><p>{tr(`game.${game.id}.info`, game.infoBody)}</p></article>
      <article><b>03</b><h2>{tr("rules.format", "FORMAT DE PARTIE")}</h2><p>{tr("rules.formatBody", "Le format est déterminé par la configuration propre à ce mode dans MULTISPORTS SCORING.")}{game.supportsTeams ? ` ${tr("rules.teamsBody", "Les équipes sont prises en charge lorsque cette option est proposée.")}` : ""}{game.supportsBots ? ` ${tr("rules.botsBody", "Les bots IA peuvent être utilisés lorsque la configuration du mode les active.")}` : ""}</p></article>
      <article className="mssRuleConfig" id="configuration"><b>04</b><h2>{tr("rules.parameters", "RÈGLES & PARAMÈTRES")}</h2>{development ? <p>{tr("rules.developmentConfig", "EN DÉVELOPPEMENT — aucun paramétrage jouable ne doit être présenté comme disponible tant que le moteur n’est pas activé.")}</p> : <p>{publicRuleConfigCopy(game, lang, tr)}</p>}</article>
      <article><b>05</b><h2>{tr("rules.status", "STATUT DANS MSS")}</h2><p>{development ? tr("rules.developmentStatusBody", "EN DÉVELOPPEMENT — le concept est référencé dans le catalogue MSS, mais la partie jouable n’est pas encore activée.") : tr("rules.availableStatusBody", "DISPONIBLE — le mode est activé dans MULTISPORTS SCORING. La configuration de partie applique les options et variantes prévues par ce moteur.")}</p></article>
      {!development && <article><b>06</b><h2>{tr("rules.flow", "DÉROULEMENT")}</h2><p>{tr("rules.flowBody", "Créez ou sélectionnez vos profils, réglez les options du mode puis lancez la partie. MULTISPORTS SCORING assure le suivi du tour, des scores et des événements propres à ce jeu.")}</p></article>}
      {!development && <article><b>07</b><h2>{tr("rules.end", "FIN DE PARTIE")}</h2><p>{tr("rules.endBody", "La condition de fin et le classement appliqués sont ceux du moteur de ce mode. Les particularités confirmées figurent dans la section « Règles & paramètres » ci-dessus.")}</p></article>}
    </section>
    {sameCategoryGames.length > 0 && <section className="mssRuleRelated" id="autres-modes"><div className="mssRuleRelatedHead"><span>{tr("rules.discoverAlso", "À DÉCOUVRIR AUSSI")}</span><h2>{tr("rules.sameFamily", "D’autres modes de la même famille")}</h2></div><div className="mssRuleRelatedGrid">{sameCategoryGames.map((related) => { const art = landingTickerFor(related.id, lang); return <a key={related.id} href={publicDartsUrl(related.id)} onClick={(event) => openPublicDartsRule(event, related.id)}>{art ? <img src={art} alt="" loading="lazy" decoding="async"/> : <div className="mssRuleRelatedFallback"><img src={darts} alt=""/></div>}<span>{related.label}</span></a>; })}</div></section>}
    <nav className="mssRulePager">
      {previousGame ? <a href={publicDartsUrl(previousGame.id)} onClick={(event) => openPublicDartsRule(event, previousGame.id)}><small>{tr("rules.previous", "← MODE PRÉCÉDENT")}</small><strong>{previousGame.label}</strong></a> : <span/>}
      <button onClick={onBack}>{tr("rules.allModes", "TOUS LES MODES")}</button>
      {nextGame ? <a href={publicDartsUrl(nextGame.id)} className="isNext" onClick={(event) => openPublicDartsRule(event, nextGame.id)}><small>{tr("rules.next", "MODE SUIVANT →")}</small><strong>{nextGame.label}</strong></a> : <span/>}
    </nav>
    <section className="mssRuleCta"><div><span>{development ? tr("rules.soonMss", "BIENTÔT DANS MSS") : tr("rules.readyTry", "PRÊT À ESSAYER ?")}</span><h2>{development ? `${game.label} ${tr("rules.isPreparing", "est actuellement en développement.")}` : `${game.label} ${tr("rules.isAvailableIn", "est disponible dans MULTISPORTS SCORING.")}`}</h2></div>{!development && <button onClick={onOpenApp}>{tr("actions.playInApp", "JOUER DANS L’APPLICATION")}</button>}</section>
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
  const { lang, setLang, t } = useLang();
  const tr = (key: string, fallback: string) => lang === "fr" ? fallback : t(`landing.${key}`, fallback);
  const currentPublicLanguage = PUBLIC_LANGUAGES.find((item) => item.code === lang) || PUBLIC_LANGUAGES[0];
  const [routeHash, setRouteHash] = useState(() => window.location.hash);
  const [dartsFilter, setDartsFilter] = useState<"classic"|"exclusive"|"fun"|"challenge"|"variant"|"training"|"development">("classic");
  const [dartsSearch, setDartsSearch] = useState("");

  useEffect(() => {
    const syncHash = () => setRouteHash(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (!/^#\/welcome\/darts\//.test(routeHash)) return;
    // Chaque fiche de règle doit toujours s’ouvrir depuis son début,
    // même si le visiteur était très bas dans le catalogue ou dans la fiche précédente.
    forcePublicPageTop();
    const frame = window.requestAnimationFrame(forcePublicPageTop);
    const t1 = window.setTimeout(forcePublicPageTop, 80);
    const t2 = window.setTimeout(forcePublicPageTop, 250);
    const t3 = window.setTimeout(forcePublicPageTop, 600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3);
    };
  }, [routeHash]);

  const allDartsGames = DARTS_GAMES.filter((g) => g.entry === "games" || g.entry === "training");
  const readyDartsGames = allDartsGames.filter((g) => !isPublicDartsDevelopment(g));
  const developmentDartsGames = allDartsGames.filter((g) => isPublicDartsDevelopment(g));
  const ruleMatch = routeHash.match(/^#\/welcome\/darts\/([^?]+)/);
  if (ruleMatch) {
    const id = decodeURIComponent(ruleMatch[1]);
    const game = allDartsGames.find((g) => g.id === id);
    if (game) return <DartsRulePage game={game} onOpenApp={onOpenApp} lang={lang} setLang={setLang} t={t} onBack={() => {
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

  const catalogueCards = [
    ["classic","GRANDS CLASSIQUES","Les incontournables des fléchettes : X01, Cricket, Killer, Shanghai et autres références."],
    ["exclusive","EXCLUSIVITÉS MSS","Les créations propres à MULTISPORTS SCORING : Firefighter, CRADOS, Loterie, Menteur, Président, Le Pendu, Cargo…"],
    ["fun","FUN","Des parties pensées pour l’ambiance, les soirées et les règles décalées."],
    ["challenge","DÉFIS","CHALLENGE et les autres modes à objectifs : scoring, précision, performance, duel et élimination."],
    ["variant","VARIANTES","Des façons différentes de jouer et de revisiter la cible."],
    ["training","TRAINING","Training X01, Tour de l’horloge, Double In / Double Out, Challenges, Super Bull, Ghost Mode, Precision Gauntlet, Repeat Master et Time Attack."],
    ["development","EN DÉVELOPPEMENT","Les prochains modes déjà référencés dans MSS, clairement séparés des jeux actuellement jouables."],
  ] as const;

  return <main key={lang} className="mssLanding" id="top">
    <header className="mssNav">
      <button className="mssBrand" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} aria-label="MULTISPORTS SCORING accueil"><img src={logo} alt=""/><span translate="no" data-i18n-skip="true">MULTISPORTS <b>SCORING</b></span></button>
      <nav><a href="#darts-modes">{tr("nav.darts", "Fléchettes")}</a><a href="#disciplines">{tr("nav.disciplines", "Disciplines")}</a><a href="#features">{tr("nav.features", "Fonctionnalités")}</a><a href="#languages">{tr("nav.languages", "Langues")}</a><a href="#awena">Awena</a><a href="#download">{tr("nav.download", "Télécharger")}</a></nav>
      <label className="mssLanguageSelect" title="Choisir la langue">
        <span aria-hidden="true">{currentPublicLanguage.flag}</span>
        <select value={lang} onChange={(event) => setLang(event.target.value as Lang)} aria-label="Choisir la langue de la page">
          {PUBLIC_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.label}</option>)}
        </select>
      </label>
      <button className="mssOpen" onClick={onOpenApp}>{tr("actions.openApp", "OUVRIR L’APPLICATION")}</button>
    </header>

    <section className="mssHero">
      <div className="mssHeroCopy">
        <div className="mssPill">{tr("hero.pill", "✦ APPLICATION GRATUITE • MULTISPORTS")}</div>
        <h1>{tr("hero.title1", "UNE APPLICATION.")}<br/><em>{tr("hero.title2", "TOUS VOS SPORTS.")}</em></h1>
        <p className="mssLead">{tr("hero.lead", "Jouez, scorez, entraînez-vous et suivez vos performances dans un seul univers. MULTISPORTS SCORING réunit le jeu local et online, les statistiques, les équipes, les bots et les outils pour clubs.")}</p>
        <div className="mssCtas"><button onClick={onOpenApp}>{tr("actions.startFree", "COMMENCER GRATUITEMENT")}</button><a href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer">GOOGLE PLAY</a></div>
        <div className="mssStoreLine"><span>{tr("meta.free", "✓ Gratuit")}</span><span>✓ Google Play</span><span>{tr("meta.web", "✓ Version Web")}</span><span>{tr("meta.languages", "✓ 22 langues")}</span></div>
      </div>
      <div className="mssHeroVisual" aria-label="Les disciplines MULTISPORTS SCORING">
        <div className="mssVisualKicker">{tr("hero.ecosystem", "UN ÉCOSYSTÈME • 22 DISCIPLINES")}</div>
        <div className="mssGlow"/>
        <div className="mssOrbit mssOrbitOuter">{sports.slice(0,12).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n} loading="lazy" decoding="async"/></div>)}</div>
        <div className="mssOrbit mssOrbitInner">{sports.slice(12,22).map(([src,n],i)=><div className="mssOrbitSport" style={{"--i":i} as React.CSSProperties} key={n}><img src={src} alt={n} loading="lazy" decoding="async"/></div>)}</div>
        <div className="mssHeroCore"><img src={logo} alt="MULTISPORTS SCORING"/><strong>22</strong><span>{tr("common.disciplines", "DISCIPLINES")}</span></div>
        <div className="mssHeroFeatureRail" aria-label="Fonctionnalités principales"><span><b>ONLINE</b><small>{tr("hero.community", "Communauté")}</small></span><span><b>BOTS IA</b><small>{tr("hero.opponents", "Adversaires")}</small></span><span><b>STATS</b><small>{tr("hero.progress", "Progression")}</small></span></div>
      </div>
    </section>

    <section className="mssStrip" id="features">{features.map(([big,small])=><article key={big}><strong>{big}</strong><span>{small}</span></article>)}</section>

    <section className="mssLanguagesBanner" id="languages">
      <img src={lang === "fr" ? languages22Fr : languages22En} alt={tr("languages.imageAlt", "MULTISPORTS SCORING est disponible en 22 langues")} loading="lazy" decoding="async"/>
      <div className="mssLanguagesBannerOverlay">
        <div>
          <div className="mssEyebrow">{tr("languages.eyebrow", "MULTILINGUE • 22 LANGUES DISPONIBLES")}</div>
          <h2>{tr("languages.title", "L’application est disponible dans 22 langues.")}</h2>
          <p>{tr("languages.body", "Choisissez votre langue depuis le sélecteur. MULTISPORTS SCORING conserve votre choix dans l’application.")}</p>
        </div>
        <label className="mssLanguageHeroSelect">
          <span aria-hidden="true">{currentPublicLanguage.flag}</span>
          <select value={lang} onChange={(event) => setLang(event.target.value as Lang)} aria-label={tr("languages.select", "Choisir la langue")}>
            {PUBLIC_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.label}</option>)}
          </select>
        </label>
      </div>
    </section>

    <section className="mssAppPreview" aria-label="Aperçu de MULTISPORTS SCORING">
      <div className="mssPreviewHead"><div className="mssEyebrow">{tr("preview.eyebrow", "L’APPLICATION EN ACTION")}</div><h2>{tr("preview.title", "Un seul univers. Des écrans pensés pour chaque usage.")}</h2><p>{tr("preview.body", "Choisissez une discipline, jouez immédiatement puis retrouvez vos performances dans le même environnement.")}</p></div>
      <div className="mssDevices">
        <article className="mssDevice mssDeviceLeft"><div className="mssPhone mssPhoneReal"><img src={screenSports} alt="Écran réel Choix du sport de MULTISPORTS SCORING"/></div><strong>{tr("preview.sport", "CHOIX DU SPORT")}</strong><span>Votre véritable écran de sélection MULTISPORTS SCORING.</span></article>
        <article className="mssDevice mssDeviceMain"><div className="mssPhone mssPhoneReal"><img src={screenX01} alt="Écran réel de scoring X01 501 de MULTISPORTS SCORING"/></div><strong>{tr("preview.x01", "SCORING X01 EN DIRECT")}</strong><span>Le véritable moteur de saisie et de suivi d’une partie 501.</span></article>
        <article className="mssDevice mssDeviceRight"><div className="mssPhone mssPhoneReal"><img src={screenStats} alt="Écran réel Statistiques X01 de MULTISPORTS SCORING"/></div><strong>{tr("preview.stats", "STATS & PROGRESSION")}</strong><span>Les véritables graphiques de performance de l’application.</span></article>
      </div>
    </section>

    <section className="mssDartsUniverse" id="darts-modes">
      <div className="mssDartsIntro">
        <div><div className="mssEyebrow">{tr("darts.eyebrow", "L’UNIVERS FLÉCHETTES MULTISPORTS SCORING")}</div><h2><em>{allDartsGames.length}</em> {tr("darts.referencedModes", "modes référencés.")}<br/><span>{readyDartsGames.length} {tr("darts.availableToday", "disponibles aujourd’hui.")}</span></h2><p>{tr("darts.intro", "Les grands classiques des fléchettes côtoient les variantes, défis, modes fun et créations exclusives MULTISPORTS SCORING. Les modes encore en préparation restent visibles et clairement marqués « EN DÉVELOPPEMENT ».")}</p></div>
        <div className="mssDartsPromises"><span><strong>CLASSIQUES</strong><small>X01 • Cricket • Killer • Shanghai • Golf…</small></span><span><strong>EXCLUSIFS MSS</strong><small>DARTS FIREFIGHTER • CRADOS • ATTRAPE-MOI SI TU PEUX ! • LOTERIE • MENTEUR • PRÉSIDENT • LE PENDU • CARGO</small></span><span><strong>CATALOGUE COMPLET</strong><small>{readyDartsGames.length} disponibles • {developmentDartsGames.length} en développement</small></span><span><strong>RÈGLES DÉTAILLÉES</strong><small>Objectif • déroulement • configuration • fin de partie</small></span></div>
      </div>
      <div className="mssDartsCategoryGrid">
        {catalogueCards.map(([id,label,description]) => {
          const count = catalogueGroups[id].length;
          return <button key={id} className={`mssDartsCategoryCard${dartsFilter === id ? " isActive" : ""}`} onClick={() => { setDartsFilter(id); setDartsSearch(""); }}>
            <span>{String(count).padStart(2,"0")}</span><strong>{tr(`category.${id}`, label)}</strong><p>{tr(`category.${id}.description`, description)}</p><small>{tr("darts.seeModes", "VOIR LES MODES →")}</small>
          </button>;
        })}
      </div>
      <div className="mssDartsToolbar"><label><span>{tr("darts.searchMode", "RECHERCHER UN MODE")}</span><input value={dartsSearch} onChange={(e) => setDartsSearch(e.target.value)} placeholder="X01, Killer, Challenge, Firefighter…" /></label><div className="mssDartsQuickFilters">{catalogueCards.map(([id,label]) => <button key={id} className={dartsFilter===id ? "isActive" : ""} onClick={() => {setDartsFilter(id);setDartsSearch("");}}>{label}<b>{catalogueGroups[id].length}</b></button>)}</div></div>
      <div className="mssDartsListHeader"><div><span>{tr("rules.category", "CATÉGORIE")}</span><h3>{tr(`category.${dartsFilter}`, catalogueCards.find(([id]) => id === dartsFilter)?.[1] || "")}</h3></div><b>{filteredDartsGames.length} {filteredDartsGames.length > 1 ? tr("darts.modes", "MODES") : tr("darts.mode", "MODE")}</b></div>
      <div className="mssDartsModeGrid">
        {filteredDartsGames.map((game, index) => {
          const ticker = landingTickerFor(game.id, lang);
          const exclusive = MSS_EXCLUSIVE_DARTS.has(game.id);
          const development = isPublicDartsDevelopment(game);
          return <a className={`mssDartsModeCard${exclusive ? " isExclusive" : ""}${development ? " isDevelopment" : ""}`} href={publicDartsUrl(game.id)} key={game.id} onClick={(event) => openPublicDartsRule(event, game.id)}>
            <div className="mssDartsModeVisual">{ticker ? <img src={ticker} alt={`Visuel ${game.label}`} loading="lazy" decoding="async"/> : <div className="mssDartsMiniFallback"><img src={darts} alt=""/><b>{String(index+1).padStart(2,"0")}</b></div>}<span>{development ? tr("status.development", "EN DÉVELOPPEMENT") : exclusive ? tr("status.exclusive", "EXCLUSIF MSS") : tr(`category.${game.category}`, DARTS_CATEGORY_LABEL[game.category])}</span>{NEW_PUBLIC_DARTS.has(game.id) && <i className="mssNewModeCorner">{tr("status.new", "NOUVEAU")}</i>}{exclusive && development && <i className="mssExclusiveCorner">{tr("status.exclusive", "EXCLUSIF MSS")}</i>}</div>
            <div className="mssDartsModeText"><div className="mssModeTitleRow"><strong>{game.label}</strong></div><p>{development ? tr("darts.developmentCard", "Mode référencé dans le catalogue MSS. Développement du moteur en cours.") : tr(`game.${game.id}.info`, game.infoBody)}</p><small>{development ? tr("darts.discoverConcept", "DÉCOUVRIR LE CONCEPT →") : tr("darts.fullSheet", "VOIR LA FICHE COMPLÈTE →")}</small></div>
          </a>;
        })}
      </div>
    </section>

    <section className="mssSection" id="disciplines"><div className="mssEyebrow">TOUT VOTRE SPORT. UNE SEULE APPLICATION.</div><h2>22 disciplines, une identité commune</h2><p>Chaque discipline conserve son univers tout en profitant du même compte, des mêmes profils, de l’historique et de l’écosystème MULTISPORTS SCORING.</p><div className="mssSports">{sports.map(([src,n],i)=><article key={n}><span className="mssSportNo">{String(i+1).padStart(2,"0")}</span><img src={src} alt={n} loading="lazy" decoding="async"/><strong>{n}</strong></article>)}</div></section>

    <section className="mssSection mssDarkCards"><div className="mssEyebrow">BIEN PLUS QU’UN COMPTEUR DE SCORE</div><h2>Jouez. Analysez. Progressez.</h2><div className="mssCards"><article><b>◎</b><h3>Jeu libre & multijoueur</h3><p>Solo, duo, équipes, local ou online : choisissez votre façon de jouer et retrouvez vos parties dans votre historique.</p></article><article><b>◈</b><h3>Bots & adversaires IA</h3><p>Affrontez des adversaires de niveaux différents et personnalisez vos propres bots dans les modes compatibles.</p></article><article><b>↗</b><h3>Statistiques détaillées</h3><p>Performances, records, tendances, classements et progression : vos résultats deviennent enfin exploitables.</p></article><article><b>⌂</b><h3>Clubs & organisations</h3><p>Membres, équipes, calendrier, compétitions, classements et vie collective dans un espace dédié.</p></article></div></section>

    <section className="mssShowcase">
      <div className="mssShowcaseCopy"><div className="mssEyebrow">VOS PERFORMANCES DEVIENNENT LISIBLES</div><h2>Des statistiques qui racontent vraiment votre progression.</h2><p>Centralisez parties, entraînements, records et tendances dans un même profil. Comparez vos résultats et retrouvez votre historique sans changer d’écosystème.</p><div className="mssMiniTags"><span>Historique</span><span>Records</span><span>Progression</span><span>Classements</span></div></div>
      <div className="mssDash"><div className="mssDashTop"><span>TABLEAU DE BORD</span><b>STATISTIQUES</b></div><div className="mssKpis"><article><small>PARTIES</small><strong>128</strong><i>+12 ce mois</i></article><article><small>VICTOIRES</small><strong>74%</strong><i>meilleure série 8</i></article><article><small>FORME</small><strong>↗ 9.4</strong><i>progression récente</i></article></div><div className="mssChart"><span style={{height:'38%'}}/><span style={{height:'52%'}}/><span style={{height:'47%'}}/><span style={{height:'68%'}}/><span style={{height:'61%'}}/><span style={{height:'79%'}}/><span style={{height:'91%'}}/></div><div className="mssDashLegend"><span>7 derniers résultats</span><b>PROGRESSION +18%</b></div></div>
    </section>

    <section className="mssOrg"><div className="mssOrgPanel"><div className="mssEyebrow">CLUBS • ÉQUIPES • ASSOCIATIONS • ENTREPRISES</div><h2>Votre organisation sportive, directement dans l’application.</h2><p>Gérez membres, équipes, calendrier, compétitions et classements dans un espace collectif connecté aux résultats de vos joueurs.</p><div className="mssOrgGrid"><span>👥 <b>Membres</b></span><span>▦ <b>Calendrier</b></span><span>🏆 <b>Compétitions</b></span><span>↗ <b>Classements</b></span></div></div><div className="mssOrgMock"><header><b>MULTISPORTS CLUB</b><span>SAISON 2026</span></header><div className="mssOrgScore"><small>PROCHAIN ÉVÉNEMENT</small><strong>Tournoi interclubs</strong><span>12 OCT. • 18:30</span></div><div className="mssOrgRows"><span><i>01</i> Équipe Alpha <b>42 pts</b></span><span><i>02</i> Les Challengers <b>38 pts</b></span><span><i>03</i> Team Horizon <b>31 pts</b></span></div></div></section>

    <section className="mssOnlineShowcase" id="online">
      <div className="mssOnlineCopy"><div className="mssEyebrow">ONLINE • BOTS • ADVERSAIRES IA</div><h2>Il y a toujours quelqu’un à affronter.</h2><p>Retrouvez vos amis et la communauté en ligne, ou lancez immédiatement une partie contre les adversaires IA disponibles dans les modes compatibles. Chaque personnage possède son identité et son niveau.</p><div className="mssOnlineFacts"><span><b>LOCAL + ONLINE</b><small>Jouez selon vos envies</small></span><span><b>NIVEAUX VARIÉS</b><small>Des adversaires pour progresser</small></span><span><b>UNIVERS UNIQUES</b><small>Des personnages propres aux modes</small></span></div></div>
      <div className="mssBotStage" aria-label="Exemples d’adversaires IA MULTISPORTS SCORING"><div className="mssBotHalo"/><article className="mssBotCard mssBotCard1"><img loading="lazy" decoding="async" src={kael} alt="Kaël"/><strong>KAËL</strong><span>DARTS FIREFIGHTER</span><i>IA</i></article><article className="mssBotCard mssBotCard2"><img loading="lazy" decoding="async" src={greenMachine} alt="Green Machine"/><strong>GREEN MACHINE</strong><span>BOT IA PRO</span><i>PRO</i></article><article className="mssBotCard mssBotCard3"><img loading="lazy" decoding="async" src={gegeDeglingue} alt="Gégé Déglingué"/><strong>GÉGÉ DÉGLINGUÉ</strong><span>CRADOS</span><i>IA</i></article><article className="mssBotCard mssBotCard4"><img loading="lazy" decoding="async" src={eliaz} alt="Eliaz"/><strong>ELIAZ</strong><span>ATTRAPE-MOI SI TU PEUX</span><i>IA</i></article><article className="mssBotCard mssBotCard5"><img loading="lazy" decoding="async" src={zeno} alt="Zeno"/><strong>ZENO</strong><span>KILLER</span><i>IA</i></article><article className="mssBotCard mssBotCard6"><img loading="lazy" decoding="async" src={lucky} alt="Lucky"/><strong>LUCKY</strong><span>LOTERIE</span><i>IA</i></article><div className="mssOnlineCenter"><b>ONLINE</b><strong>+</strong><b>BOTS IA</b><span>Plusieurs univers</span></div></div>
    </section>

    <section className="mssAwenaSection" id="awena">
      <div className="mssAwenaVisual"><div className="mssAwenaGlow"/><img src={awena} alt="Awena, assistante MULTISPORTS SCORING"/><span className="mssAwenaBubble mssAwenaBubbleA">« Je vous explique la règle. »</span><span className="mssAwenaBubble mssAwenaBubbleB">« À vous de jouer ! »</span></div>
      <div><div className="mssEyebrow">L’ASSISTANTE INTÉGRÉE À VOTRE EXPÉRIENCE</div><h2>AWENA vous accompagne, sans interrompre le jeu.</h2><p>Règles, configuration, conseils et guidage : Awena intervient directement dans MULTISPORTS SCORING lorsque vous en avez besoin.</p><div className="mssAwenaSkills"><span><b>01</b> Explique les règles</span><span><b>02</b> Guide votre partie</span><span><b>03</b> Aide à configurer</span><span><b>04</b> Accompagne l’entraînement</span></div><button onClick={onOpenApp}>DÉCOUVRIR AWENA DANS L’APPLICATION</button></div>
    </section>

    <section className="mssDownload" id="download">
      <div className="mssDownloadCopy"><div className="mssEyebrow">{tr("download.eyebrow", "PRÊT À JOUER ?")}</div><h2>{tr("download.title", "Votre univers sportif commence ici.")}</h2><p>Accédez à MULTISPORTS SCORING depuis le Web ou installez l’application Android. Vos disciplines, vos profils et vos performances restent réunis dans la même expérience.</p><div className="mssDownloadActions"><a className="mssPlayCta" href="https://play.google.com/store/apps/details?id=com.multisportsscoring.app" target="_blank" rel="noreferrer"><small>{tr("download.availableOn", "DISPONIBLE SUR")}</small><strong>Google Play</strong></a><button className="mssWebCta" onClick={onOpenApp}><small>{tr("download.useNow", "UTILISER MAINTENANT")}</small><strong>{tr("actions.openAppMixed", "Ouvrir l’application")}</strong></button></div><div className="mssDownloadMeta"><span>{tr("meta.freeApp", "✓ Application gratuite")}</span><span>{tr("meta.22disciplines", "✓ 22 disciplines")}</span><span>{tr("meta.languages", "✓ 22 langues")}</span><span>✓ Local + Online</span><span>{tr("meta.stats", "✓ Statistiques")}</span></div></div>
      <div className="mssDownloadMark"><div className="mssDownloadRing"><img src={logo} alt="MULTISPORTS SCORING"/><strong>MULTISPORTS</strong><b>SCORING</b><span>JOUEZ • SCOREZ • PROGRESSEZ</span></div></div>
    </section>

    <section className="mssCommunity" id="community"><div><div className="mssEyebrow">UN SEUL PROFIL • TOUT VOTRE SPORT</div><h2>Vos performances vous suivent partout.</h2><p>Retrouvez vos disciplines, vos équipes, vos parties, vos entraînements et votre progression dans le même écosystème.</p></div><div className="mssCommunityBtns"><button onClick={onOpenApp}>{tr("actions.startFree", "COMMENCER GRATUITEMENT")}</button><span>Web • Android • MULTISPORTS SCORING</span></div></section>

    <footer className="mssFooter">
      <div className="mssFooterBrand"><img src={logo} alt=""/><div><strong translate="no" data-i18n-skip="true">MULTISPORTS <b>SCORING</b></strong><span>22 disciplines • 22 langues • Une seule application</span></div></div>
      <div className="mssFooterLinks"><a href="https://multisports-scoring.pages.dev/privacy-policy/" target="_blank" rel="noreferrer">{tr("footer.privacy", "Politique de confidentialité")}</a><a href="https://multisports-scoring.pages.dev/terms-of-service/" target="_blank" rel="noreferrer">{tr("footer.terms", "Conditions d’utilisation")}</a><a href="#disciplines">{tr("nav.disciplines", "Disciplines")}</a><a href="#awena">Awena</a><a href="#download">{tr("nav.download", "Télécharger")}</a><a href="#top">{tr("footer.backTop", "Retour en haut ↑")}</a></div>
      <span className="mssCopyright">© 2026 MULTISPORTS SCORING</span>
    </footer>
  </main>;
}
