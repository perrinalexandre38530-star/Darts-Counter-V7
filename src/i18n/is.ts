// ============================================
// src/i18n/is.ts
// Íslensk orðalisti (IS) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const is: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Heim",
  "nav.local": "Staðbundið",
  "nav.games": "Leikir",
  "nav.training": "Þjálfun",
  "nav.online": "Online",
  "nav.stats": "Tölfræði",
  "nav.settings": "Stillingar",
  "nav.profiles": "Prófílar",
  "nav.sync": "Sync & deiling",
  "nav.back": "Til baka",
  "nav.close": "Loka",

  // -----------------------------
  // GENERAL / COMMON
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Hætta við",
  "common.yes": "Já",
  "common.no": "Nei",
  "common.save": "Vista",
  "common.edit": "Breyta",
  "common.delete": "Eyða",
  "common.confirm": "Staðfesta",
  "common.next": "Næsta",
  "common.prev": "Fyrra",
  "common.start": "Byrja",
  "common.continue": "Halda áfram",
  "common.resume": "Halda áfram",
  "common.pause": "Pása",
  "common.reset": "Endurstilla",
  "common.shuffle": "Slembi",
  "common.loading": "Hleð…",
  "common.error": "Villa kom upp",
  "common.info": "Upplýsingar",
  "common.stats": "Tölfræði",
  "common.history": "Saga",
  "common.tutorial": "Kennsla",
  "common.exit": "Hætta",
  "common.backHome": "Til baka í heim",
  "common.player": "Leikmaður",
  "common.players": "Leikmenn",
  "common.team": "Lið",
  "common.teams": "Lið",
  "common.points": "Stig",
  "common.average": "Meðaltal",
  "common.best": "Best",
  "common.worst": "Verst",
  "common.total": "Samtals",
  "common.date": "Dagsetning",
  "common.time": "Tími",

  // -----------------------------
  // HOME + ACTIVE PROFILE CARD + TICKER
  // -----------------------------
  "home.title": "Stjórnborð",
  "home.subtitle": "Stjórnstöð Darts Counter",

  "status.online": "Online",
  "status.away": "Fjarverandi",
  "status.offline": "Offline",

  // Header
  "home.welcome": "Velkomin",
  "home.welcome.noProfile": "Velkomin í Darts Counter",
  "home.hero.tagline": "Tilbúin(n) í nokkur píluköst?",

  // Active profile
  "home.activeProfile.title": "Virkur prófíll",
  "home.activeProfile.none": "Enginn prófíll valinn",
  "home.activeProfile.select": "Veldu prófíl",
  "home.activeProfile.manage": "Sýsla með prófíla",
  "home.activeProfile.status.online": "Tengd(ur)",
  "home.activeProfile.status.offline": "Ótengd(ur)",
  "home.activeProfile.status.guest": "Gestur",
  "home.activeProfile.badge.you": "Þú",
  "home.activeProfile.badge.local": "Staðbundið",
  "home.activeProfile.badge.online": "Online",

  // Stats
  "home.activeProfile.stats.title": "Hraðtölfræði",
  "home.activeProfile.stats.x01Avg": "X01 meðaltal",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Þjálfunarmagn",
  "home.activeProfile.stats.lastGame": "Síðasti leikur",
  "home.activeProfile.stats.noGames": "Enginn leikur enn",
  "home.activeProfile.stats.seeAll": "Skoða alla tölfræði",

  // Quick actions
  "home.quickActions.title": "Flýtiaðgerðir",
  "home.quickActions.playX01": "Spila X01",
  "home.quickActions.playCricket": "Spila Cricket",
  "home.quickActions.training": "Opna þjálfun",
  "home.quickActions.stats": "Skoða tölfræði",

  // Stats carousel
  "home.statsCarousel.title": "Hraðtölfræði",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Þjálfun",

  // Arcade ticker
  "home.arcadeBanner.title": "Fréttir & upplýsingar",
  "home.arcadeBanner.tapForMore": "Snertu til að sjá meira",
  "home.arcadeBanner.empty": "Engar upplýsingar í boði",
  "home.arcadeBanner.tag.new": "Nýtt",
  "home.arcadeBanner.tag.tip": "Ráð",
  "home.arcadeBanner.tag.update": "Uppfærsla",

  // Big buttons
  "home.nav.profiles": "Prófílar",
  "home.nav.profiles.desc": "Staðbundnir notendur, avatarar & BOTS",
  "home.nav.local": "Staðbundið",
  "home.nav.local.desc": "Spilaðu á þessu borði",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Spilaðu á netinu við vini",
  "home.nav.training": "Þjálfun",
  "home.nav.training.desc": "Nákvæm þjálfunargögn",
  "home.nav.stats": "Tölfræði",
  "home.nav.stats.desc": "Graf, mælaborð og saga",
  "home.nav.settings": "Stillingar",
  "home.nav.settings.desc": "Þemu, tungumál og valkostir",

  // -----------------------------
  // DASHBOARD TICKER
  // -----------------------------
  "home.ticker.records": "Nýleg met",
  "home.ticker.records.text":
    "Nokkur met voru slegin nýlega – frábært áframhald!",

  "home.ticker.localLast": "Síðasti staðbundni leikur",
  "home.ticker.localLast.text": "Yfirlit yfir síðasta staðbundna leikinn.",

  "home.ticker.onlineLast": "Síðasti online leikur",
  "home.ticker.onlineLast.text":
    "Síðasti netleikurinn þinn er tilbúinn í endurtekningu.",

  "home.ticker.onlineLeader": "Efst á lista",
  "home.ticker.onlineLeader.text":
    "Sjáðu hver er efstur í online röðuninni.",

  "home.ticker.training": "Núverandi þjálfun",
  "home.ticker.training.text":
    "Heildar X01 þjálfun + klukkulotan.",

  "home.ticker.month": "Tölfræði mánaðarins",
  "home.ticker.month.text":
    "Heildarfjöldi leikja og hittanna í þessum mánuði.",

  "home.ticker.tip": "Ráð dagsins",
  "home.ticker.tip.text":
    "Styrktu uppáhalds lokahöggin með reglulegri æfingu.",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "Allir leikir",
  "games.subtitle": "Veldu leikham",
  "games.section.classic": "Klassískir",
  "games.section.training": "Þjálfun",
  "games.section.party": "Skemmtileikir",
  "games.section.other": "Aðrir leikir",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… endaðu á nákvæmlega 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull. Opna, loka og skora.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Verstu killer og útrýmdu hinum.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Eitt númer per umferð – hitta S/D/T.",
  "games.training.menuTitle": "Þjálfun",
  "games.training.x01Solo": "X01 Solo þjálfun",
  "games.training.clock": "Klukkulotan",
  "games.training.custom": "Sérsniðin lota",
  "games.training.evolution": "Framfaragraf",
  "games.info.title": "Upplýsingar",
  "games.info.rules": "Reglur",
  "games.info.tips": "Ráð",

  // -----------------------------
  // PROFILES
  // -----------------------------
  "profiles.title": "Staðbundnir prófílar",
  "profiles.subtitle": "Sýslaðu með leikmenn",
  "profiles.add": "Bæta við prófíl",
  "profiles.edit": "Breyta prófíl",
  "profiles.delete": "Eyða prófíl",
  "profiles.confirmDelete": "Eyða þessum prófíl varanlega?",
  "profiles.name.label": "Leikmannsnafn",
  "profiles.name.placeholder": "Skrifaðu notandanafn",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Slembi avatar",
  "profiles.stats.title": "Tölfræði prófíls",
  "profiles.stats.x01": "X01 tölfræði",
  "profiles.stats.cricket": "Cricket tölfræði",
  "profiles.stats.training": "Þjálfunartölfræði",
  "profiles.status.active": "Virkt",
  "profiles.status.inactive": "Óvirkt",
  "profiles.selectActive": "Setja sem virkan prófíl",
  "profiles.list.empty": "Engir prófílar enn",
  "profiles.list.selectHint": "Snertu prófíl til að velja",
  "profiles.hint.avatarTap": "Snertu merkið til að breyta avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar smiður",
  "avatar.subtitle": "Sérsníddu merkið þitt",
  "avatar.style.label": "Stíll",
  "avatar.style.realistic": "Létt raunsæi",
  "avatar.style.comic": "Teiknimynd",
  "avatar.style.flat": "Flat hönnun",
  "avatar.style.exaggerated": "Ýktur",
  "avatar.theme.label": "Þema",
  "avatar.preview.label": "Forsýn",
  "avatar.generate": "Búa til nýjan avatar",
  "avatar.keep": "Halda þessum avatar",
  "avatar.cancel": "Hætta við",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01 stillingar",
  "x01.config.subtitle": "Undirbúa leik",
  "x01.config.section.players": "Leikmenn",
  "x01.config.section.match": "Leikformat",
  "x01.config.section.rules": "Grunnstillingar",
  "x01.config.players.add": "Bæta við leikmanni",
  "x01.config.players.remove": "Fjarlægja",
  "x01.config.players.teams": "Lið",
  "x01.config.mode.label": "Leikhamur",
  "x01.config.mode.solo": "Einstaklings",
  "x01.config.mode.multi": "Fjölspilun",
  "x01.config.mode.teams": "Lið",
  "x01.config.raceToSets.label": "Set til sigurs",
  "x01.config.raceToLegs.label": "Legs til sigurs",
  "x01.config.startingScore.label": "Upphafsstig",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Sérsniðin",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Þjónusta",
  "x01.config.service.random": "Slembið",
  "x01.config.service.alternate": "Skiptis",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Bæta við bot",
  "x01.config.bots.level.easy": "Auðvelt",
  "x01.config.bots.level.medium": "Miðlungs",
  "x01.config.bots.level.hard": "Erfitt",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Hefja leik",
  "x01.config.back": "Til baka í leiki",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Röð:",
  "x01.play.scoreRemaining": "Eftir",
  "x01.play.lastVisit": "Síðasta umferð",
  "x01.play.average3": "Meðaltal /3 darts",
  "x01.play.bestVisit": "Besta umferð",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Kast",
  "x01.play.visits": "Umferðir",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Afturkalla",
  "x01.play.confirmExit": "Hætta í núverandi leik?",
  "x01.play.botThinking": "Bot hugsar…",
  "x01.play.noScoreYet": "Engin stig enn",
  "x01.play.matchOver": "Leik lokið",
  "x01.play.legOver": "Leg lokið",
  "x01.play.setOver": "Set lokið",
  "x01.play.nextLeg": "Næsta leg",
  "x01.play.nextSet": "Næsta set",
  "x01.play.backToConfig": "Til baka í stillingar",
  "x01.play.saveInHistory": "Vista í sögu",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket stillingar",
  "cricket.config.players": "Leikmenn",
  "cricket.config.raceTo.label": "Stig eða legs",
  "cricket.config.pointsWin": "Sigur á stigum",
  "cricket.config.legsWin": "Sigur á legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Markmið",
  "cricket.play.hits": "Hitt",
  "cricket.play.score": "Stig",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Röð:",
  "cricket.play.open": "Opið",
  "cricket.play.closed": "Lokað",
  "cricket.stats.title": "Cricket tölfræði",
  "cricket.stats.profile": "Cricket prófíll",
  "cricket.stats.bestMpr": "Best MPR",
  "cricket.stats.averageMpr": "Meðal MPR",
  "cricket.stats.gamesPlayed": "Leikir spilaðir",
  "cricket.stats.gamesWon": "Leikir unnir",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Þjálfun",
  "training.menu.subtitle": "Bættu færni þína",
  "training.menu.x01Solo": "X01 Solo þjálfun",
  "training.menu.x01Solo.desc": "Nákvæm rekning á hverju kasti.",
  "training.menu.clock": "Klukkulotan",
  "training.menu.clock.desc": "Hittu hverja tölu í röð.",
  "training.menu.evolution": "Framfarakúrfa",
  "training.menu.evolution.desc": "Skoðaðu framfarir yfir tíma.",
  "training.menu.custom": "Sérsniðin lota",
  "training.menu.resumeLast": "Halda áfram síðustu lotu",
  "training.menu.noSession": "Engar lotur vistaðar enn",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo þjálfun",
  "training.x01.subtitle": "Greining á hverju kasti",
  "training.x01.targetScore.label": "Upphafsstig",
  "training.x01.throws": "Köst",
  "training.x01.hitsBySegment": "Hitt eftir þáttum",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Meðaltal /dart",
  "training.x01.session.save": "Vista lotu",
  "training.x01.session.saved": "Lota vistuð",
  "training.x01.session.delete": "Eyða lotu",
  "training.x01.session.confirmDelete":
    "Eyða þessarri þjálfunarlotu varanlega?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Klukkulotan",
  "training.clock.subtitle": "Hittu hverja tölu í röð",
  "training.clock.objective.label": "Markmið",
  "training.clock.objective.allSingles": "Allir single",
  "training.clock.objective.allDoubles": "Allir double",
  "training.clock.objective.allTriples": "Allir triple",
  "training.clock.objective.custom": "Sérsniðin leið",
  "training.clock.timer.label": "Tímamælir",
  "training.clock.timer.off": "Enginn tímamælir",
  "training.clock.timer.30": "30 sek",
  "training.clock.timer.60": "60 sek",
  "training.clock.timer.120": "120 sek",
  "training.clock.players": "Leikmenn",
  "training.clock.start": "Hefja þjálfun",
  "training.clock.currentTarget": "Núverandi mark",
  "training.clock.progress": "Framvinda",
  "training.clock.session.save": "Vista þessa lotu",
  "training.clock.session.saved": "Klukkulota vistuð",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Tölfræðimiðstöð",
  "stats.shell.tabs.local": "Staðbundið",
  "stats.shell.tabs.training": "Þjálfun",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Saga",
  "stats.shell.info": "Veldu tölfræðihluta.",
  "stats.hub.local.title": "Tölfræði staðbundinna prófíla",
  "stats.hub.local.selectProfile":
    "Veldu prófíl til að skoða tölfræði",
  "stats.hub.training.title": "Þjálfunartölfræði",
  "stats.hub.online.title": "Onlinetölfræði",
  "stats.hub.history.title": "Leiksaga",
  "stats.hub.kpi.avg3": "Meðaltal /3 darts",
  "stats.hub.kpi.winRate": "Sigurhlutfall",
  "stats.hub.kpi.bestLeg": "Besta leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Nýleg frammistaða",
  "stats.hub.radar.skills": "Færnirit",
  "stats.hub.training.clock": "Klukkulotan",
  "stats.hub.training.x01": "X01 þjálfun",
  "stats.hub.training.volume": "Þjálfunarmagn",
  "stats.hub.empty": "Engin tölfræði enn",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Leiksaga",
  "history.subtitle": "Nýjustu leikirnir þínir",
  "history.filter.all": "Allt",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Þjálfun",
  "history.empty": "Engir leikir vistaðir enn",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Þjálfun",
  "history.details.title": "Leiksmáatriði",
  "history.details.players": "Leikmenn",
  "history.details.winner": "Sigurvegari",
  "history.details.legs": "Legs",
  "history.details.sets": "Set",
  "history.details.avg3": "Meðaltal /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Eyða leik",
  "history.confirmDelete": "Eyða leiknum varanlega?",

  // -----------------------------
  // ONLINE MODE
  // -----------------------------
  "online.title": "Online hamur",
  "online.subtitle": "Spilaðu á netinu með vinum",
  "online.login.title": "Innskráning",
  "online.login.nickname": "Notendanafn",
  "online.login.email": "Netfang (valfrjálst)",
  "online.login.password": "Lykilorð",
  "online.login.submit": "Innskrá",
  "online.signup.title": "Búa til reikning",
  "online.logout": "Skrá út",
  "online.profile.title": "Online prófíll",
  "online.profile.country": "Land",
  "online.profile.bio": "Lýsing",
  "online.lobby.title": "X01 biðherbergi",
  "online.lobby.create": "Búa til herbergi",
  "online.lobby.join": "Ganga í herbergi",
  "online.lobby.empty": "Engin herbergi tiltæk núna",
  "online.friends.title": "Vinir",
  "online.friends.add": "Bæta við vini",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Fjarverandi",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Stillingar",
  "settings.theme.title": "Neon þemu",
  "settings.theme.subtitle": "Veldu stemninguna",
  "settings.theme.current": "Núverandi þema",
  "settings.theme.applied": "Þema virkt",
  "settings.lang.title": "Tungumál",
  "settings.lang.subtitle": "Tungumál appsins",
  "settings.lang.help": "Viðmótstextar eru þýddir.",
  "settings.section.language": "Tungumál",
  "settings.section.theme": "Þemu",
  "settings.section.misc": "Ýmislegt",
  "settings.misc.sounds": "Hljóð",
  "settings.misc.vibrations": "Titranir",
  "settings.misc.animations": "Sjónrænar hreyfingar",
  "settings.misc.resetApp": "Endurstilla forrit",
  "settings.misc.resetConfirm":
    "Endurstilla öll gögn (prófílar, saga, þjálfun)?",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Sync & deiling",
  "sync.subtitle": "Vistaðu og deildu gögnunum þínum",
  "sync.tabs.local": "Staðbundið",
  "sync.tabs.peer": "Tæki-við-tæki",
  "sync.tabs.cloud": "Ský",
  "sync.local.export.title": "Staðbundin útflutningur",
  "sync.local.export.desc": "Afritaðu þennan JSON til öryggis.",
  "sync.local.export.button": "Búa til útflutning",
  "sync.local.import.title": "Staðbundinn innflutningur",
  "sync.local.import.desc":
    "Límdu JSON skránna úr öðru tæki.",
  "sync.local.import.button": "Flytja inn JSON",
  "sync.local.import.success": "Innflutningur tókst",
  "sync.local.import.error": "Ógild JSON – innflutningur mistókst.",
  "sync.peer.soon": "Tæki-við-tæki sync kemur fljótlega",
  "sync.cloud.soon": "Skýja-sync kemur fljótlega",

  // -----------------------------
  // LABELS
  // -----------------------------
  "label.points": "Stig",
  "label.legs": "Legs",
  "label.sets": "Set",
  "label.avg3": "Meðaltal /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Magn",
  "label.duration": "Tímalengd",
  "label.date": "Dagsetning",
  "label.mode": "Hamur",

  // -----------------------------
  // RESET + THEMES
  // -----------------------------
  "settings.back": "Til baka",
  "settings.subtitle": "Sérsníddu þema og tungumál appsins",

  "settings.theme.group.neons": "Klassísk neon",
  "settings.theme.group.soft": "Mjúkir litir",
  "settings.theme.group.dark": "Myrk Premium þemu",

  "settings.theme.gold.label": "Gull Neon",
  "settings.theme.gold.desc": "Gullna premium þema",

  "settings.theme.pink.label": "Bleik neon",
  "settings.theme.pink.desc": "Bleik spilasalastemning",

  "settings.theme.petrol.label": "Petrol blár",
  "settings.theme.petrol.desc": "Djúp neonblá stemning",

  "settings.theme.green.label": "Græn neon",
  "settings.theme.green.desc": "Lýsing æfingastíll",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Sterk fjólublá / magenta",

  "settings.theme.red.label": "Rauður",
  "settings.theme.red.desc": "Ákveðin arcade rauður",

  "settings.theme.orange.label": "Appelsínugulur",
  "settings.theme.orange.desc": "Heitur og orkumikill appelsínugulur",

  "settings.theme.white.label": "Hvítur",
  "settings.theme.white.desc": "Ljóst og nútímalegt þema",

  "settings.theme.blueOcean.label": "Hafblár",
  "settings.theme.blueOcean.desc": "Náttúrulegur haf / himinblár",

  "settings.theme.limeYellow.label": "Límgulur",
  "settings.theme.limeYellow.desc": "Mjög skær límfærð",

  "settings.theme.sage.label": "Sage grænn",
  "settings.theme.sage.desc": "Mjúkir náttúrulegir grænir tónar",

  "settings.theme.skyBlue.label": "Ljósblár pastell",
  "settings.theme.skyBlue.desc": "Mjög mjúkt og bjart blátt",

  "settings.theme.darkTitanium.label": "Dökk títan",
  "settings.theme.darkTitanium.desc": "Mött, úrvals málmlitastefna",

  "settings.theme.darkCarbon.label": "Kolefni",
  "settings.theme.darkCarbon.desc": "Nútímaleg kolfiberáferð",

  "settings.theme.darkFrost.label": "Dökk frost",
  "settings.theme.darkFrost.desc": "Nútímalegt frostsvart",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Fágað svart með framúrskarandi læsileika",

  "settings.lang": "Tungumál",

  "settings.reset.title": "Endurstilla forrit",
  "settings.reset.subtitle":
    "Eyðir auðkenndum prófílum, BOTS, tölfræði, leikjasögu og stillingum. Óafturkræft.",
  "settings.reset.button": "Endurstilla allt",

  // -----------------------------
  // LANG NAMES (IS)
  // -----------------------------
  "lang.fr": "Franska",
  "lang.en": "Enska",
  "lang.es": "Spænska",
  "lang.de": "Þýska",
  "lang.it": "Ítalska",
  "lang.pt": "Portúgalska",
  "lang.nl": "Hollenska",
  "lang.ru": "Rússneska",
  "lang.zh": "Kínverska",
  "lang.ja": "Japanska",
  "lang.ar": "Arabíska",
  "lang.hi": "Hindí",
  "lang.tr": "Tyrkneska",
  "lang.da": "Danska",
  "lang.no": "Norska",
  "lang.sv": "Sænska",
  "lang.is": "Íslenska",
  "lang.pl": "Pólska",
  "lang.ro": "Rúmenska",
  "lang.sr": "Serbneska",
  "lang.hr": "Króatíska",
  "lang.cs": "Tékkneska",
};

export default is;
