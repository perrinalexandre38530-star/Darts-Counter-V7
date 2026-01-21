// ============================================
// src/i18n/ro.ts
// Dicționar Română (RO) — v1 complet
// ============================================

import type { Dict } from "../contexts/LangContext";

export const ro: Dict = {
  // -----------------------------
  // NAVIGAȚIE / TAB-URI
  // -----------------------------
  "nav.home": "Acasă",
  "nav.local": "Local",
  "nav.games": "Jocuri",
  "nav.training": "Antrenament",
  "nav.online": "Online",
  "nav.stats": "Statistici",
  "nav.settings": "Setări",
  "nav.profiles": "Profiluri",
  "nav.sync": "Sync & partajare",
  "nav.back": "Înapoi",
  "nav.close": "Închide",

  // -----------------------------
  // GENERIC / COMUN
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Anulează",
  "common.yes": "Da",
  "common.no": "Nu",
  "common.save": "Salvează",
  "common.edit": "Editează",
  "common.delete": "Șterge",
  "common.confirm": "Confirmă",
  "common.next": "Următor",
  "common.prev": "Înapoi",
  "common.start": "Start",
  "common.continue": "Continuă",
  "common.resume": "Reia",
  "common.pause": "Pauză",
  "common.reset": "Resetează",
  "common.shuffle": "Aleator",
  "common.loading": "Se încarcă…",
  "common.error": "A apărut o eroare",
  "common.info": "Informații",
  "common.stats": "Statistici",
  "common.history": "Istoric",
  "common.tutorial": "Tutorial",
  "common.exit": "Ieșire",
  "common.backHome": "Înapoi la acasă",
  "common.player": "Jucător",
  "common.players": "Jucători",
  "common.team": "Echipă",
  "common.teams": "Echipe",
  "common.points": "Puncte",
  "common.average": "Medie",
  "common.best": "Cel mai bun",
  "common.worst": "Cel mai slab",
  "common.total": "Total",
  "common.date": "Data",
  "common.time": "Ora",

  // -----------------------------
  // HOME — DASHBOARD
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Centrul de control MULTISPORTS SCORING",

  "status.online": "Online",
  "status.away": "Plecat",
  "status.offline": "Offline",

  "home.welcome": "Bun venit",
  "home.welcome.noProfile": "Bun venit în MULTISPORTS SCORING",
  "home.hero.tagline": "Pregătit pentru câteva darturi?",

  // Profil activ
  "home.activeProfile.title": "Profil activ",
  "home.activeProfile.none": "Niciun profil selectat",
  "home.activeProfile.select": "Selectează un profil",
  "home.activeProfile.manage": "Gestionează profilurile",
  "home.activeProfile.status.online": "Conectat",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Oaspete",
  "home.activeProfile.badge.you": "Tu",
  "home.activeProfile.badge.local": "Local",
  "home.activeProfile.badge.online": "Online",

  // Statistici profil activ
  "home.activeProfile.stats.title": "Statistici rapide",
  "home.activeProfile.stats.x01Avg": "Medie X01",
  "home.activeProfile.stats.cricketMpr": "MPR Cricket",
  "home.activeProfile.stats.trainingVolume": "Volum antrenament",
  "home.activeProfile.stats.lastGame": "Ultimul meci",
  "home.activeProfile.stats.noGames": "Niciun meci încă",
  "home.activeProfile.stats.seeAll": "Vezi toate statisticile",

  // Acțiuni rapide
  "home.quickActions.title": "Acțiuni rapide",
  "home.quickActions.playX01": "Pornește un X01",
  "home.quickActions.playCricket": "Pornește Cricket",
  "home.quickActions.training": "Intră în Training",
  "home.quickActions.stats": "Vezi statisticile",

  // Carusel
  "home.statsCarousel.title": "Statistici rapide",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Ticker / Arcade banner
  "home.arcadeBanner.title": "Informații & noutăți",
  "home.arcadeBanner.tapForMore": "Atinge pentru detalii",
  "home.arcadeBanner.empty": "Nicio informație de afișat momentan",
  "home.arcadeBanner.tag.new": "Nou",
  "home.arcadeBanner.tag.tip": "Sfat",
  "home.arcadeBanner.tag.update": "Actualizare",

  // Navigație mare
  "home.nav.profiles": "Profiluri",
  "home.nav.profiles.desc": "Profiluri locale, avatare și BOTS",
  "home.nav.local": "Local",
  "home.nav.local.desc": "Joacă pe această targă",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Meciuri la distanță cu prieteni",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Module avansate de antrenament",
  "home.nav.stats": "Statistici",
  "home.nav.stats.desc": "Dashboard-uri și istoric",
  "home.nav.settings": "Setări",
  "home.nav.settings.desc": "Teme, limbi și opțiuni avansate",

  // -----------------------------
  // TICKER / BANNER
  // -----------------------------
  "home.ticker.records": "Ultimele recorduri",
  "home.ticker.records.text":
    "Mai multe recorduri au fost doborâte recent. Continuă așa!",

  "home.ticker.localLast": "Ultimul meci local",
  "home.ticker.localLast.text":
    "Rezumatul ultimului meci jucat local.",

  "home.ticker.onlineLast": "Ultimul meci online",
  "home.ticker.onlineLast.text":
    "Ultimul tău duel online e gata pentru revanșă.",

  "home.ticker.onlineLeader": "Liderul clasamentului",
  "home.ticker.onlineLeader.text":
    "Descoperă cine este în fruntea clasamentului online.",

  "home.ticker.training": "Trainingul zilei",
  "home.ticker.training.text":
    "Totalul sesiunilor X01 Training și Tour de l’Horloge.",

  "home.ticker.month": "Statistici lunare",
  "home.ticker.month.text":
    "Total meciuri și lovituri în această lună.",

  "home.ticker.tip": "Sfatul zilei",
  "home.ticker.tip.text":
    "Perfecționează-ți finalizarea preferată repetând-o regulat.",

  // -----------------------------
  // LISTA JOCURI
  // -----------------------------
  "games.title": "Toate jocurile",
  "games.subtitle": "Alege un mod de joc",
  "games.section.classic": "Clasice",
  "games.section.training": "Training",
  "games.section.party": "Party",
  "games.section.other": "Alte moduri",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… încheie exact la 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "De la 15 la 20 + Bull, deschide/închide și punctează.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Devino killer și elimină jucătorii.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Un număr pe rundă, lovește S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Turul ceasului",
  "games.training.custom": "Training personalizat",
  "games.training.evolution": "Statistici evoluție",
  "games.info.title": "Informații",
  "games.info.rules": "Reguli",
  "games.info.tips": "Sfaturi",

  // -----------------------------
  // PROFILURI LOCALE
  // -----------------------------
  "profiles.title": "Profiluri locale",
  "profiles.subtitle": "Gestionează jucătorii locali",
  "profiles.add": "Adaugă profil",
  "profiles.edit": "Editează profil",
  "profiles.delete": "Șterge profil",
  "profiles.confirmDelete": "Ștergi definitiv acest profil?",
  "profiles.name.label": "Numele jucătorului",
  "profiles.name.placeholder": "Introduceți un pseudonim",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Avatar aleator",
  "profiles.stats.title": "Statistici profil",
  "profiles.stats.x01": "Statistici X01",
  "profiles.stats.cricket": "Statistici Cricket",
  "profiles.stats.training": "Statistici Training",
  "profiles.status.active": "Activ",
  "profiles.status.inactive": "Inactiv",
  "profiles.selectActive": "Setează ca profil activ",
  "profiles.list.empty": "Niciun profil momentan",
  "profiles.list.selectHint": "Atinge un profil pentru a-l selecta",
  "profiles.hint.avatarTap":
    "Atinge medalionul pentru a schimba avatarul",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Creator avatar",
  "avatar.subtitle": "Personalizează-ți medalionul",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Ușor realist",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Exagerat",
  "avatar.theme.label": "Temă",
  "avatar.preview.label": "Previzualizare",
  "avatar.generate": "Generează avatar nou",
  "avatar.keep": "Păstrează acest avatar",
  "avatar.cancel": "Anulează modificările",

  // -----------------------------
  // CONFIG X01
  // -----------------------------
  "x01.config.title": "Setări X01",
  "x01.config.subtitle": "Pregătește meciul",
  "x01.config.section.players": "Jucători",
  "x01.config.section.match": "Format meci",
  "x01.config.section.rules": "Reguli de bază",
  "x01.config.players.add": "Adaugă jucător",
  "x01.config.players.remove": "Elimină",
  "x01.config.players.teams": "Echipe",
  "x01.config.mode.label": "Mod joc",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Echipe",
  "x01.config.raceToSets.label": "Seturi pentru victorie",
  "x01.config.raceToLegs.label": "Leguri pentru victorie",
  "x01.config.startingScore.label": "Scor inițial",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Personalizat",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Serviciu",
  "x01.config.service.random": "Aleator",
  "x01.config.service.alternate": "Alternat",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Adaugă bot",
  "x01.config.bots.level.easy": "Ușor",
  "x01.config.bots.level.medium": "Mediu",
  "x01.config.bots.level.hard": "Greu",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Pornește meciul",
  "x01.config.back": "Înapoi la jocuri",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "La rând:",
  "x01.play.scoreRemaining": "Rămas",
  "x01.play.lastVisit": "Ultima vizită",
  "x01.play.average3": "Medie / 3 darts",
  "x01.play.bestVisit": "Cea mai bună vizită",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Darts aruncate",
  "x01.play.visits": "Vizite",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Anulează vizita",
  "x01.play.confirmExit": "Ieși din meciul în curs?",
  "x01.play.botThinking": "Botul joacă…",
  "x01.play.noScoreYet": "Niciun scor încă",
  "x01.play.matchOver": "Meci terminat",
  "x01.play.legOver": "Leg terminat",
  "x01.play.setOver": "Set terminat",
  "x01.play.nextLeg": "Următorul leg",
  "x01.play.nextSet": "Următorul set",
  "x01.play.backToConfig": "Înapoi la setări",
  "x01.play.saveInHistory": "Salvează în istoric",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Setări Cricket",
  "cricket.config.players": "Jucători",
  "cricket.config.raceTo.label": "Puncte sau leguri",
  "cricket.config.pointsWin": "Victorie pe puncte",
  "cricket.config.legsWin": "Victorie pe leguri",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Ținte",
  "cricket.play.hits": "Lovituri",
  "cricket.play.score": "Scor",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "La rând:",
  "cricket.play.open": "Deschis",
  "cricket.play.closed": "Închis",
  "cricket.stats.title": "Statistici Cricket",
  "cricket.stats.profile": "Profil Cricket",
  "cricket.stats.bestMpr": "Cel mai bun MPR",
  "cricket.stats.averageMpr": "MPR mediu",
  "cricket.stats.gamesPlayed": "Meciuri jucate",
  "cricket.stats.gamesWon": "Meciuri câștigate",

  // -----------------------------
  // MENIU TRAINING
  // -----------------------------
  "training.menu.title": "Training",
  "training.menu.subtitle": "Antrenează-ți punctele forte",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Analiză detaliată a fiecărui dart.",
  "training.menu.clock": "Turul ceasului",
  "training.menu.clock.desc": "Lovește toate țintele în ordine.",
  "training.menu.evolution": "Curba progresului",
  "training.menu.evolution.desc": "Vizualizează-ți progresul în timp.",
  "training.menu.custom": "Sesiune personalizată",
  "training.menu.resumeLast": "Reia ultima sesiune",
  "training.menu.noSession": "Nicio sesiune salvată",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analiza fiecărui dart",
  "training.x01.targetScore.label": "Scor inițial",
  "training.x01.throws": "Darts aruncate",
  "training.x01.hitsBySegment": "Lovituri pe segment",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busturi",
  "training.x01.avgPerDart": "Medie / dart",
  "training.x01.session.save": "Salvează sesiunea",
  "training.x01.session.saved": "Sesiune salvată",
  "training.x01.session.delete": "Șterge sesiunea",
  "training.x01.session.confirmDelete":
    "Ștergi definitiv această sesiune?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Turul ceasului",
  "training.clock.subtitle":
    "Lovește fiecare număr în ordine",
  "training.clock.objective.label": "Obiectiv",
  "training.clock.objective.allSingles": "Toate single",
  "training.clock.objective.allDoubles": "Toate double",
  "training.clock.objective.allTriples": "Toate triple",
  "training.clock.objective.custom": "Traseu personalizat",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Fără timer",
  "training.clock.timer.30": "30 secunde",
  "training.clock.timer.60": "60 secunde",
  "training.clock.timer.120": "120 secunde",
  "training.clock.players": "Jucători",
  "training.clock.start": "Pornește antrenamentul",
  "training.clock.currentTarget": "Ținta curentă",
  "training.clock.progress": "Progres",
  "training.clock.session.save": "Salvează sesiunea",
  "training.clock.session.saved":
    "Sesiune „Turul ceasului” salvată",

  // -----------------------------
  // STATS HUB
  // -----------------------------
  "stats.shell.title": "Centrul statisticilor",
  "stats.shell.tabs.local": "Profiluri locale",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Istoric",
  "stats.shell.info": "Alege o secțiune.",
  "stats.hub.local.title": "Statistici profiluri locale",
  "stats.hub.local.selectProfile":
    "Selectează un profil pentru statistici",
  "stats.hub.training.title": "Statistici Training",
  "stats.hub.online.title": "Statistici Online",
  "stats.hub.history.title": "Istoric meciuri",
  "stats.hub.kpi.avg3": "Medie /3 darts",
  "stats.hub.kpi.winRate": "Rată de victorie",
  "stats.hub.kpi.bestLeg": "Cel mai bun leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Formă recentă",
  "stats.hub.radar.skills": "Radar abilități",
  "stats.hub.training.clock": "Turul ceasului",
  "stats.hub.training.x01": "Training X01",
  "stats.hub.training.volume": "Volum antrenament",
  "stats.hub.empty": "Nicio statistică disponibilă",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Istoric meciuri",
  "history.subtitle": "Ultimele tale meciuri",
  "history.filter.all": "Toate",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Niciun meci salvat",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Training",
  "history.details.title": "Detalii meci",
  "history.details.players": "Jucători",
  "history.details.winner": "Câștigător",
  "history.details.legs": "Leguri",
  "history.details.sets": "Seturi",
  "history.details.avg3": "Medie /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Șterge meciul",
  "history.confirmDelete": "Ștergi definitiv acest meci?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Mod online",
  "online.subtitle": "Joacă la distanță cu prietenii",
  "online.login.title": "Autentificare",
  "online.login.nickname": "Pseudonim",
  "online.login.email": "E-mail (opțional)",
  "online.login.password": "Parolă",
  "online.login.submit": "Conectează-te",
  "online.signup.title": "Creează cont",
  "online.logout": "Deconectează-te",
  "online.profile.title": "Profil online",
  "online.profile.country": "Țară",
  "online.profile.bio": "Bio",
  "online.lobby.title": "Săli X01",
  "online.lobby.create": "Creează sală",
  "online.lobby.join": "Intră în sală",
  "online.lobby.empty": "Nicio sală disponibilă",
  "online.friends.title": "Prieteni",
  "online.friends.add": "Adaugă prieten",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Plecat",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETĂRI (PAGE COMPLETĂ)
  // -----------------------------
  "settings.back": "Înapoi",
  "settings.title": "Setări",
  "settings.subtitle":
    "Personalizează tema și limba aplicației",

  "settings.theme": "Temă",
  "settings.theme.group.neons": "Neon clasice",
  "settings.theme.group.soft": "Culori soft",
  "settings.theme.group.dark": "Teme Dark Premium",

  "settings.theme.gold.label": "Neon auriu",
  "settings.theme.gold.desc": "Temă premium aurie",

  "settings.theme.pink.label": "Roz neon",
  "settings.theme.pink.desc": "Atmosferă arcade roz",

  "settings.theme.petrol.label": "Albastru petrol",
  "settings.theme.petrol.desc": "Albastru neon profund",

  "settings.theme.green.label": "Verde neon",
  "settings.theme.green.desc": "Stil luminos de antrenament",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Violet / magenta intens",

  "settings.theme.red.label": "Roșu",
  "settings.theme.red.desc": "Roșu arcade agresiv",

  "settings.theme.orange.label": "Portocaliu",
  "settings.theme.orange.desc": "Portocaliu cald și energic",

  "settings.theme.white.label": "Alb",
  "settings.theme.white.desc": "Fundal deschis modern",

  "settings.theme.blueOcean.label": "Albastru ocean",
  "settings.theme.blueOcean.desc": "Albastru natural cer/ocean",

  "settings.theme.limeYellow.label": "Lime galben",
  "settings.theme.limeYellow.desc": "Culoare lime foarte intensă",

  "settings.theme.sage.label": "Sage verde",
  "settings.theme.sage.desc": "Tonuri green naturale și soft",

  "settings.theme.skyBlue.label": "Albastru pastel",
  "settings.theme.skyBlue.desc": "Albastru foarte soft și luminos",

  "settings.theme.darkTitanium.label": "Titan întunecat",
  "settings.theme.darkTitanium.desc":
    "Aspect metalic mat premium",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc":
    "Atmosferă modernă din fibră de carbon",

  "settings.theme.darkFrost.label": "Frost întunecat",
  "settings.theme.darkFrost.desc":
    "Negru înghețat futurist",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Negru lucios premium și lizibil",

  "settings.lang": "Limbă",

  "settings.reset.title": "Resetează aplicația",
  "settings.reset.subtitle":
    "Șterge toate profilurile locale, BOTS, statisticile, istoricul meciurilor și setările. Acțiune definitivă.",
  "settings.reset.button": "Resetează tot",

  // -----------------------------
  // NUME LIMBI (RO)
  // -----------------------------
  "lang.fr": "Franceză",
  "lang.en": "Engleză",
  "lang.es": "Spaniolă",
  "lang.de": "Germană",
  "lang.it": "Italiană",
  "lang.pt": "Portugheză",
  "lang.nl": "Olandeză",
  "lang.ru": "Rusă",
  "lang.zh": "Chineză",
  "lang.ja": "Japoneză",
  "lang.ar": "Arabă",
  "lang.hi": "Hindi",
  "lang.tr": "Turcă",
  "lang.da": "Daneză",
  "lang.no": "Norvegiană",
  "lang.sv": "Suedeză",
  "lang.is": "Islandeză",
  "lang.pl": "Poloneză",
  "lang.ro": "Română",
  "lang.sr": "Sârbă",
  "lang.hr": "Croată",
  "lang.cs": "Cehă",
};

export default ro;
