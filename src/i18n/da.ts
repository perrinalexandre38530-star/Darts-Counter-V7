// ============================================
// src/i18n/da.ts
// Dansk ordbog (DA) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const da: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Hjem",
  "nav.local": "Lokalt",
  "nav.games": "Spil",
  "nav.training": "Træning",
  "nav.online": "Online",
  "nav.stats": "Stats",
  "nav.settings": "Indstillinger",
  "nav.profiles": "Profiler",
  "nav.sync": "Sync & deling",
  "nav.back": "Tilbage",
  "nav.close": "Luk",

  // -----------------------------
  // GÉNÉRIQUE / COMMUN
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Annuller",
  "common.yes": "Ja",
  "common.no": "Nej",
  "common.save": "Gem",
  "common.edit": "Rediger",
  "common.delete": "Slet",
  "common.confirm": "Bekræft",
  "common.next": "Næste",
  "common.prev": "Forrige",
  "common.start": "Start",
  "common.continue": "Fortsæt",
  "common.resume": "Genoptag",
  "common.pause": "Pause",
  "common.reset": "Nulstil",
  "common.shuffle": "Tilfældig",
  "common.loading": "Indlæser…",
  "common.error": "Der opstod en fejl",
  "common.info": "Info",
  "common.stats": "Statistik",
  "common.history": "Historik",
  "common.tutorial": "Vejledning",
  "common.exit": "Afslut",
  "common.backHome": "Tilbage til forsiden",
  "common.player": "Spiller",
  "common.players": "Spillere",
  "common.team": "Hold",
  "common.teams": "Hold",
  "common.points": "Point",
  "common.average": "Gennemsnit",
  "common.best": "Bedste",
  "common.worst": "Værste",
  "common.total": "I alt",
  "common.date": "Dato",
  "common.time": "Tid",

  // -----------------------------
  // HOME — SIDE + PROFILKORT + ARCADE-BANNER
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "MULTISPORTS SCORING kontrolcenter",

  "status.online": "Online",
  "status.away": "Fraværende",
  "status.offline": "Offline",

  // Øverste banner
  "home.welcome": "Velkommen",
  "home.welcome.noProfile": "Velkommen til MULTISPORTS SCORING",
  "home.hero.tagline": "Klar til at kaste et par darts?",

  // Aktiv profil-kort
  "home.activeProfile.title": "Aktiv profil",
  "home.activeProfile.none": "Ingen profil valgt",
  "home.activeProfile.select": "Vælg en profil",
  "home.activeProfile.manage": "Administrér profiler",
  "home.activeProfile.status.online": "Forbundet",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gæst",
  "home.activeProfile.badge.you": "Dig",
  "home.activeProfile.badge.local": "Lokalt",
  "home.activeProfile.badge.online": "Online",

  // Stats i kortet
  "home.activeProfile.stats.title": "Hurtige stats",
  "home.activeProfile.stats.x01Avg": "X01-gennemsnit",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Træningsvolumen",
  "home.activeProfile.stats.lastGame": "Seneste kamp",
  "home.activeProfile.stats.noGames": "Ingen kampe endnu",
  "home.activeProfile.stats.seeAll": "Se alle stats",

  // Hurtige handlinger
  "home.quickActions.title": "Hurtige handlinger",
  "home.quickActions.playX01": "Start en X01",
  "home.quickActions.playCricket": "Start en Cricket",
  "home.quickActions.training": "Gå til træning",
  "home.quickActions.stats": "Se statistikker",

  // Stats-karrousel
  "home.statsCarousel.title": "Hurtige stats",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Træning",

  // ArcadeTicker
  "home.arcadeBanner.title": "Info & nyheder",
  "home.arcadeBanner.tapForMore": "Tryk for flere detaljer",
  "home.arcadeBanner.empty": "Ingen info at vise lige nu",
  "home.arcadeBanner.tag.new": "Ny",
  "home.arcadeBanner.tag.tip": "Tip",
  "home.arcadeBanner.tag.update": "Opdatering",

  // Store navigationsknapper
  "home.nav.profiles": "Profiler",
  "home.nav.profiles.desc": "Lokale profiler, avatars & BOTS",
  "home.nav.local": "Lokalt",
  "home.nav.local.desc": "Spil fysisk på denne skive",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Kampe på afstand med venner",
  "home.nav.training": "Træning",
  "home.nav.training.desc": "Avancerede træningsmoduler",
  "home.nav.stats": "Stats",
  "home.nav.stats.desc": "Dashboards, grafer, historik",
  "home.nav.settings": "Indstillinger",
  "home.nav.settings.desc": "Temaer, sprog, fuld nulstilling",

  // -----------------------------
  // HOME / DASHBOARD TICKER
  // -----------------------------
  "home.ticker.records": "Seneste rekorder",
  "home.ticker.records.text":
    "Flere rekorder er blevet slået for nylig – fortsæt det gode arbejde!",

  "home.ticker.localLast": "Seneste lokale kamp",
  "home.ticker.localLast.text":
    "Resumé af den seneste kamp spillet lokalt.",

  "home.ticker.onlineLast": "Seneste online-kamp",
  "home.ticker.onlineLast.text":
    "Din seneste online-duel er klar til revanche.",

  "home.ticker.onlineLeader": "Toppen af ranglisten",
  "home.ticker.onlineLeader.text":
    "Se hvem der ligger øverst på online-ranglisten.",

  "home.ticker.training": "Aktuel træning",
  "home.ticker.training.text":
    "Samlet antal X01-træning og ur-sessioner.",

  "home.ticker.month": "Månedens stats",
  "home.ticker.month.text":
    "Samlet antal kampe og hits denne måned.",

  "home.ticker.tip": "Dagens tip",
  "home.ticker.tip.text":
    "Forstærk din yndlings-checkout ved at øve den jævnligt.",

  // -----------------------------
  // GAMES (LOKALE SPIL)
  // -----------------------------
  "games.title": "Alle spil",
  "games.subtitle": "Vælg en spiltilstand",
  "games.section.classic": "Klassiske",
  "games.section.training": "Træning",
  "games.section.party": "Fest & sjov",
  "games.section.other": "Andre tilstande",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… ram præcist 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 til 20 + Bull, åbn/luk og scor.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Bliv killer og slå de andre spillere ud.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Ét nummer pr. runde, ram S / D / T.",
  "games.training.menuTitle": "Træning",
  "games.training.x01Solo": "X01 Solo-træning",
  "games.training.clock": "Ur-runden",
  "games.training.custom": "Egen træning",
  "games.training.evolution": "Udviklings-stats",
  "games.info.title": "Spilinfo",
  "games.info.rules": "Regler",
  "games.info.tips": "Tips",

  // -----------------------------
  // LOKALE PROFILER
  // -----------------------------
  "profiles.title": "Lokale profiler",
  "profiles.subtitle": "Administrér dine lokale spillere",
  "profiles.add": "Tilføj profil",
  "profiles.edit": "Rediger profil",
  "profiles.delete": "Slet profil",
  "profiles.confirmDelete": "Slette denne profil permanent?",
  "profiles.name.label": "Spillernavn",
  "profiles.name.placeholder": "Indtast et nickname",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Tilfældig avatar",
  "profiles.stats.title": "Profil-stats",
  "profiles.stats.x01": "X01-stats",
  "profiles.stats.cricket": "Cricket-stats",
  "profiles.stats.training": "Trænings-stats",
  "profiles.status.active": "Aktiv",
  "profiles.status.inactive": "Inaktiv",
  "profiles.selectActive": "Sæt som aktiv profil",
  "profiles.list.empty": "Ingen profiler endnu",
  "profiles.list.selectHint": "Tryk på en profil for at vælge den",
  "profiles.hint.avatarTap": "Tryk på medaljonen for at skifte avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar-creator",
  "avatar.subtitle": "Tilpas din medaljon",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Let realisme",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Overdrevet",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Forhåndsvisning",
  "avatar.generate": "Generér ny avatar",
  "avatar.keep": "Behold denne avatar",
  "avatar.cancel": "Annullér ændringer",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "X01-indstillinger",
  "x01.config.subtitle": "Forbered kampen",
  "x01.config.section.players": "Spillere",
  "x01.config.section.match": "Matchformat",
  "x01.config.section.rules": "Basisindstillinger",
  "x01.config.players.add": "Tilføj spiller",
  "x01.config.players.remove": "Fjern",
  "x01.config.players.teams": "Hold",
  "x01.config.mode.label": "Spiltilstand",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Hold",
  "x01.config.raceToSets.label": "Vundne sets",
  "x01.config.raceToLegs.label": "Vundne legs",
  "x01.config.startingScore.label": "Startscore",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Egen",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Start",
  "x01.config.service.random": "Tilfældig",
  "x01.config.service.alternate": "Skiftevis",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Tilføj bot",
  "x01.config.bots.level.easy": "Let",
  "x01.config.bots.level.medium": "Mellem",
  "x01.config.bots.level.hard": "Svær",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Start kampen",
  "x01.config.back": "Tilbage til spil",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Tur til",
  "x01.play.scoreRemaining": "Tilbage",
  "x01.play.lastVisit": "Seneste runde",
  "x01.play.average3": "Gns. / 3 darts",
  "x01.play.bestVisit": "Bedste runde",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Kastede darts",
  "x01.play.visits": "Runder",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Fortryd runde",
  "x01.play.confirmExit": "Forlade den igangværende kamp?",
  "x01.play.botThinking": "Botten spiller…",
  "x01.play.noScoreYet": "Ingen score endnu",
  "x01.play.matchOver": "Kamp slut",
  "x01.play.legOver": "Leg slut",
  "x01.play.setOver": "Set slut",
  "x01.play.nextLeg": "Næste leg",
  "x01.play.nextSet": "Næste set",
  "x01.play.backToConfig": "Tilbage til indstillinger",
  "x01.play.saveInHistory": "Gem i historik",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket-indstillinger",
  "cricket.config.players": "Spillere",
  "cricket.config.raceTo.label": "Point eller legs",
  "cricket.config.pointsWin": "Sejr på point",
  "cricket.config.legsWin": "Sejr på legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Mål",
  "cricket.play.hits": "Træffere",
  "cricket.play.score": "Score",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Tur til",
  "cricket.play.open": "Åben",
  "cricket.play.closed": "Lukket",
  "cricket.stats.title": "Cricket-stats",
  "cricket.stats.profile": "Cricket-profil",
  "cricket.stats.bestMpr": "Bedste MPR",
  "cricket.stats.averageMpr": "Gns. MPR",
  "cricket.stats.gamesPlayed": "Spillede kampe",
  "cricket.stats.gamesWon": "Vundne kampe",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Træning",
  "training.menu.subtitle": "Arbejd med dine styrker",
  "training.menu.x01Solo": "X01 Solo-træning",
  "training.menu.x01Solo.desc": "Detaljeret tracking af hver dart.",
  "training.menu.clock": "Ur-runden",
  "training.menu.clock.desc": "Gå hele vejen rundt om tavlen.",
  "training.menu.evolution": "Udviklingskurve",
  "training.menu.evolution.desc": "Se din udvikling over tid.",
  "training.menu.custom": "Egen session",
  "training.menu.resumeLast": "Genoptag sidste session",
  "training.menu.noSession": "Ingen gemte sessioner endnu",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo-træning",
  "training.x01.subtitle": "Analyse af hvert kast",
  "training.x01.targetScore.label": "Startscore",
  "training.x01.throws": "Kastede darts",
  "training.x01.hitsBySegment": "Træffere pr. segment",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Gns. pr. dart",
  "training.x01.session.save": "Gem session",
  "training.x01.session.saved": "Session gemt",
  "training.x01.session.delete": "Slet session",
  "training.x01.session.confirmDelete":
    "Slette denne træningssession permanent?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Ur-runden",
  "training.clock.subtitle": "Ramt hvert nummer i rækkefølge",
  "training.clock.objective.label": "Mål",
  "training.clock.objective.allSingles": "Alle singles",
  "training.clock.objective.allDoubles": "Alle doubles",
  "training.clock.objective.allTriples": "Alle triples",
  "training.clock.objective.custom": "Tilpasset rute",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Ingen timer",
  "training.clock.timer.30": "30 sekunder",
  "training.clock.timer.60": "60 sekunder",
  "training.clock.timer.120": "120 sekunder",
  "training.clock.players": "Spillere",
  "training.clock.start": "Start træning",
  "training.clock.currentTarget": "Aktuelt mål",
  "training.clock.progress": "Fremgang",
  "training.clock.session.save": "Gem denne session",
  "training.clock.session.saved": "Ur-session gemt",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Statistik-center",
  "stats.shell.tabs.local": "Lokale profiler",
  "stats.shell.tabs.training": "Træning",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historik",
  "stats.shell.info": "Vælg et statistik-område.",
  "stats.hub.local.title": "Stats for lokale profiler",
  "stats.hub.local.selectProfile":
    "Vælg en profil for at se stats",
  "stats.hub.training.title": "Trænings-stats",
  "stats.hub.online.title": "Online-stats",
  "stats.hub.history.title": "Kamp-historik",
  "stats.hub.kpi.avg3": "Gns. /3 darts",
  "stats.hub.kpi.winRate": "Sejrsrate",
  "stats.hub.kpi.bestLeg": "Bedste leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Formkurve (seneste)",
  "stats.hub.radar.skills": "Skill-radar",
  "stats.hub.training.clock": "Ur-runden",
  "stats.hub.training.x01": "X01-træning",
  "stats.hub.training.volume": "Træningsvolumen",
  "stats.hub.empty": "Ingen stats endnu",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Kamp-historik",
  "history.subtitle": "Dine seneste kampe",
  "history.filter.all": "Alle",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Træning",
  "history.empty": "Ingen kampe gemt endnu",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Træning",
  "history.details.title": "Kampdetaljer",
  "history.details.players": "Spillere",
  "history.details.winner": "Vinder",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Gns. /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Slet denne kamp",
  "history.confirmDelete": "Slette denne kamp permanent?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online-tilstand",
  "online.subtitle": "Spil på afstand med dine venner",
  "online.login.title": "Login",
  "online.login.nickname": "Nickname",
  "online.login.email": "E-mail (valgfri)",
  "online.login.password": "Adgangskode",
  "online.login.submit": "Log ind",
  "online.signup.title": "Opret konto",
  "online.logout": "Log ud",
  "online.profile.title": "Online-profil",
  "online.profile.country": "Land",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01-lobbies",
  "online.lobby.create": "Opret lobby",
  "online.lobby.join": "Deltag i lobby",
  "online.lobby.empty": "Ingen lobbies tilgængelige lige nu",
  "online.friends.title": "Venner",
  "online.friends.add": "Tilføj ven",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Fraværende",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS (GENERELT)
  // -----------------------------
  "settings.title": "Indstillinger",
  "settings.theme.title": "Neon-temaer",
  "settings.theme.subtitle": "Vælg din stemning",
  "settings.theme.current": "Aktuelt tema",
  "settings.theme.applied": "Tema anvendt",
  "settings.lang.title": "Sprog",
  "settings.lang.subtitle": "App-sprog",
  "settings.lang.help": "Interface-teksterne er oversat.",
  "settings.section.language": "Sprog",
  "settings.section.theme": "Temaer",
  "settings.section.misc": "Øvrige indstillinger",
  "settings.misc.sounds": "Lyde",
  "settings.misc.vibrations": "Vibrationer",
  "settings.misc.animations": "Visuelle animationer",
  "settings.misc.resetApp": "Nulstil app",
  "settings.misc.resetConfirm":
    "Nulstille alle lokale data (profiler, historik, træning)?",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & deling",
  "sync.subtitle": "Gem og del dine data",
  "sync.tabs.local": "Lokalt",
  "sync.tabs.peer": "Enhed-til-enhed",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokal eksport",
  "sync.local.export.desc": "Kopiér denne JSON for at gemme den et andet sted.",
  "sync.local.export.button": "Generér eksport",
  "sync.local.import.title": "Lokal import",
  "sync.local.import.desc":
    "Indsæt her en JSON, der er eksporteret fra en anden enhed.",
  "sync.local.import.button": "Importér JSON",
  "sync.local.import.success": "Import gennemført",
  "sync.local.import.error": "Import mislykkedes – ugyldig JSON.",
  "sync.peer.soon": "Enhed-til-enhed-sync kommer snart",
  "sync.cloud.soon": "Cloud-sync kommer snart",

  // -----------------------------
  // LABELS / DIVERSE
  // -----------------------------
  "label.points": "Point",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Gns. /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volumen",
  "label.duration": "Varighed",
  "label.date": "Dato",
  "label.mode": "Tilstand",

  // -----------------------------
  // SETTINGS — DETALJERET TEMA & RESET
  // -----------------------------
  "settings.back": "Tilbage",
  "settings.subtitle":
    "Tilpas appens tema og sprog",

  "settings.theme": "Tema",
  "settings.theme.group.neons": "Klassiske neons",
  "settings.theme.group.soft": "Bløde farver",
  "settings.theme.group.dark": "Dark Premium-temaer",

  "settings.theme.gold.label": "Guld-neon",
  "settings.theme.gold.desc": "Premium gyldent tema",

  "settings.theme.pink.label": "Pink-neon",
  "settings.theme.pink.desc": "Arcade-stemning i pink",

  "settings.theme.petrol.label": "Petrol-blå",
  "settings.theme.petrol.desc": "Dyb neonblå",

  "settings.theme.green.label": "Grøn-neon",
  "settings.theme.green.desc": "Lyst trænings-look",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intens violet / magenta",

  "settings.theme.red.label": "Rød",
  "settings.theme.red.desc": "Aggressiv arcade-rød",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Varm og energisk orange",

  "settings.theme.white.label": "Hvid",
  "settings.theme.white.desc": "Moderne lyst tema",

  "settings.theme.blueOcean.label": "Ocean-blå",
  "settings.theme.blueOcean.desc": "Naturlig hav- og himmelblå",

  "settings.theme.limeYellow.label": "Lime-gul",
  "settings.theme.limeYellow.desc": "Super skarp lime-farve",

  "settings.theme.sage.label": "Salviegrøn",
  "settings.theme.sage.desc": "Bløde, naturlige grønne toner",

  "settings.theme.skyBlue.label": "Pastelblå",
  "settings.theme.skyBlue.desc": "Meget blød og lys blå",

  "settings.theme.darkTitanium.label": "Mørk titanium",
  "settings.theme.darkTitanium.desc": "Mat metal-look i premium-stil",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc": "Moderne carbonfiber-stemning",

  "settings.theme.darkFrost.label": "Mørk frost",
  "settings.theme.darkFrost.desc": "Iskold futuristisk sort",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Blank sort, premium og meget læsbar",

  "settings.lang": "Sprog",

  "settings.reset.title": "Nulstil appen",
  "settings.reset.subtitle":
    "Sletter alle lokale profiler, BOTS, stats, kamphistorik og indstillinger. Kan ikke fortrydes.",
  "settings.reset.button": "Nulstil alt",

  // -----------------------------
  // SPROG-NAVNE (DA)
  // -----------------------------
  "lang.fr": "Fransk",
  "lang.en": "Engelsk",
  "lang.es": "Spansk",
  "lang.de": "Tysk",
  "lang.it": "Italiensk",
  "lang.pt": "Portugisisk",
  "lang.nl": "Hollandsk",
  "lang.ru": "Russisk",
  "lang.zh": "Kinesisk",
  "lang.ja": "Japansk",
  "lang.ar": "Arabisk",
  "lang.hi": "Hindi",
  "lang.tr": "Tyrkisk",
  "lang.da": "Dansk",
  "lang.no": "Norsk",
  "lang.sv": "Svensk",
  "lang.is": "Islandsk",
  "lang.pl": "Polsk",
  "lang.ro": "Rumænsk",
  "lang.sr": "Serbisk",
  "lang.hr": "Kroatisk",
  "lang.cs": "Tjekkisk",
};
