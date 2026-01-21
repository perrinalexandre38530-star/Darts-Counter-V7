// ============================================
// src/i18n/no.ts
// Norsk ordbok (NO) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const no: Dict = {
  // -----------------------------
  // NAVIGASJON / TABS
  // -----------------------------
  "nav.home": "Hjem",
  "nav.local": "Lokal",
  "nav.games": "Spill",
  "nav.training": "Trening",
  "nav.online": "Online",
  "nav.stats": "Statistikk",
  "nav.settings": "Innstillinger",
  "nav.profiles": "Profiler",
  "nav.sync": "Synk & deling",
  "nav.back": "Tilbake",
  "nav.close": "Lukk",

  // -----------------------------
  // GENERISK / FELLES
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Avbryt",
  "common.yes": "Ja",
  "common.no": "Nei",
  "common.save": "Lagre",
  "common.edit": "Rediger",
  "common.delete": "Slett",
  "common.confirm": "Bekreft",
  "common.next": "Neste",
  "common.prev": "Forrige",
  "common.start": "Start",
  "common.continue": "Fortsett",
  "common.resume": "Gjenoppta",
  "common.pause": "Pause",
  "common.reset": "Tilbakestill",
  "common.shuffle": "Tilfeldig",
  "common.loading": "Laster…",
  "common.error": "En feil oppstod",
  "common.info": "Info",
  "common.stats": "Statistikk",
  "common.history": "Historikk",
  "common.tutorial": "Opplæring",
  "common.exit": "Avslutt",
  "common.backHome": "Tilbake til hjem",
  "common.player": "Spiller",
  "common.players": "Spillere",
  "common.team": "Lag",
  "common.teams": "Lag",
  "common.points": "Poeng",
  "common.average": "Snitt",
  "common.best": "Best",
  "common.worst": "Verst",
  "common.total": "Totalt",
  "common.date": "Dato",
  "common.time": "Tid",

  // -----------------------------
  // HOME + PROFILKORT + ARCADEBANNER
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Kontrollsenter for MULTISPORTS SCORING",

  "status.online": "Online",
  "status.away": "Borte",
  "status.offline": "Offline",

  // Toppbanner
  "home.welcome": "Velkommen",
  "home.welcome.noProfile": "Velkommen til MULTISPORTS SCORING",
  "home.hero.tagline": "Klar for noen dartkast?",

  // Aktiv profil
  "home.activeProfile.title": "Aktiv profil",
  "home.activeProfile.none": "Ingen profil valgt",
  "home.activeProfile.select": "Velg en profil",
  "home.activeProfile.manage": "Administrer profiler",
  "home.activeProfile.status.online": "Tilkoblet",
  "home.activeProfile.status.offline": "Frakoblet",
  "home.activeProfile.status.guest": "Gjest",
  "home.activeProfile.badge.you": "Deg",
  "home.activeProfile.badge.local": "Lokal",
  "home.activeProfile.badge.online": "Online",

  // Stats i kortet
  "home.activeProfile.stats.title": "Hurtigstats",
  "home.activeProfile.stats.x01Avg": "X01 snitt",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Treningsvolum",
  "home.activeProfile.stats.lastGame": "Siste kamp",
  "home.activeProfile.stats.noGames": "Ingen kamper ennå",
  "home.activeProfile.stats.seeAll": "Se alle stats",

  // Hurtighandlinger
  "home.quickActions.title": "Hurtighandlinger",
  "home.quickActions.playX01": "Start X01",
  "home.quickActions.playCricket": "Start Cricket",
  "home.quickActions.training": "Åpne trening",
  "home.quickActions.stats": "Se statistikk",

  // Stats karusell
  "home.statsCarousel.title": "Hurtigstats",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Trening",

  // ArcadeTicker
  "home.arcadeBanner.title": "Info & nyheter",
  "home.arcadeBanner.tapForMore": "Trykk for mer info",
  "home.arcadeBanner.empty": "Ingen informasjon for øyeblikket",
  "home.arcadeBanner.tag.new": "Ny",
  "home.arcadeBanner.tag.tip": "Tips",
  "home.arcadeBanner.tag.update": "Oppdatering",

  // Navigasjonsknapper
  "home.nav.profiles": "Profiler",
  "home.nav.profiles.desc": "Lokale profiler, avatarer & BOTS",
  "home.nav.local": "Lokal",
  "home.nav.local.desc": "Spill fysisk på dartskiven",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Spill med venner på avstand",
  "home.nav.training": "Trening",
  "home.nav.training.desc": "Detaljerte treningsmoduser",
  "home.nav.stats": "Statistikk",
  "home.nav.stats.desc": "Dashboards, grafer, historikk",
  "home.nav.settings": "Innstillinger",
  "home.nav.settings.desc": "Temaer, språk og avanserte valg",

  // -----------------------------
  // DASHBOARD TICKER
  // -----------------------------
  "home.ticker.records": "Siste rekorder",
  "home.ticker.records.text":
    "Flere rekorder er nylig slått – fortsett det gode arbeidet!",

  "home.ticker.localLast": "Siste lokale kamp",
  "home.ticker.localLast.text":
    "Oppsummering av siste lokalspillte kamp.",

  "home.ticker.onlineLast": "Siste onlinekamp",
  "home.ticker.onlineLast.text":
    "Din siste online-duell er klar for revansj.",

  "home.ticker.onlineLeader": "Topprangert spiller",
  "home.ticker.onlineLeader.text":
    "Oppdag hvem som leder online-ranglisten.",

  "home.ticker.training": "Trening nå",
  "home.ticker.training.text":
    "Total X01-trening + klokke-økter.",

  "home.ticker.month": "Månedens stats",
  "home.ticker.month.text":
    "Totalt antall kamper og treff denne måneden.",

  "home.ticker.tip": "Dagens tips",
  "home.ticker.tip.text":
    "Forsterk favoritt-finishene dine ved å øve dem regelmessig.",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "Alle spill",
  "games.subtitle": "Velg en spillmodus",
  "games.section.classic": "Klassiske",
  "games.section.training": "Trening",
  "games.section.party": "Moro & fest",
  "games.section.other": "Andre moduser",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… avslutt på nøyaktig 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 til 20 + Bull. Åpne/lukke og score.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Bli killer og eliminer de andre spillerne.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Én tall per runde. Treffer S / D / T.",
  "games.training.menuTitle": "Trening",
  "games.training.x01Solo": "X01 Solo-trening",
  "games.training.clock": "Klokkerunden",
  "games.training.custom": "Tilpasset trening",
  "games.training.evolution": "Utviklingsstatistikk",
  "games.info.title": "Spillinfo",
  "games.info.rules": "Regler",
  "games.info.tips": "Tips",

  // -----------------------------
  // PROFILER
  // -----------------------------
  "profiles.title": "Lokale profiler",
  "profiles.subtitle": "Administrer spillerprofiler",
  "profiles.add": "Legg til profil",
  "profiles.edit": "Rediger profil",
  "profiles.delete": "Slett profil",
  "profiles.confirmDelete": "Slette denne profilen permanent?",
  "profiles.name.label": "Spillernavn",
  "profiles.name.placeholder": "Skriv inn kallenavn",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Tilfeldig avatar",
  "profiles.stats.title": "Profilstatistikk",
  "profiles.stats.x01": "X01-statistikk",
  "profiles.stats.cricket": "Cricket-statistikk",
  "profiles.stats.training": "Treningsstatistikk",
  "profiles.status.active": "Aktiv",
  "profiles.status.inactive": "Inaktiv",
  "profiles.selectActive": "Sett som aktiv profil",
  "profiles.list.empty": "Ingen profiler ennå",
  "profiles.list.selectHint": "Trykk på en profil for å velge den",
  "profiles.hint.avatarTap": "Trykk på medaljongen for å endre avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar-creator",
  "avatar.subtitle": "Tilpass din medaljong",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Lett realisme",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Overdrevet",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Forhåndsvisning",
  "avatar.generate": "Generer ny avatar",
  "avatar.keep": "Behold denne avatar",
  "avatar.cancel": "Avbryt endringer",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01-innstillinger",
  "x01.config.subtitle": "Forbered kampen",
  "x01.config.section.players": "Spillere",
  "x01.config.section.match": "Kampformat",
  "x01.config.section.rules": "Grunninnstillinger",
  "x01.config.players.add": "Legg til spiller",
  "x01.config.players.remove": "Fjern",
  "x01.config.players.teams": "Lag",
  "x01.config.mode.label": "Modus",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Lag",
  "x01.config.raceToSets.label": "Vinnende sett",
  "x01.config.raceToLegs.label": "Vinnende leg",
  "x01.config.startingScore.label": "Startscore",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Tilpasset",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Start",
  "x01.config.service.random": "Tilfeldig",
  "x01.config.service.alternate": "Annenhver",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Legg til bot",
  "x01.config.bots.level.easy": "Lett",
  "x01.config.bots.level.medium": "Middels",
  "x01.config.bots.level.hard": "Vanskelig",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Start kampen",
  "x01.config.back": "Tilbake til spill",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Tur for",
  "x01.play.scoreRemaining": "Gjenstår",
  "x01.play.lastVisit": "Siste runde",
  "x01.play.average3": "Snitt /3 darts",
  "x01.play.bestVisit": "Beste runde",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Dart kastet",
  "x01.play.visits": "Runder",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Angre runde",
  "x01.play.confirmExit": "Forlate pågående kamp?",
  "x01.play.botThinking": "Botten spiller…",
  "x01.play.noScoreYet": "Ingen score ennå",
  "x01.play.matchOver": "Kamp ferdig",
  "x01.play.legOver": "Leg ferdig",
  "x01.play.setOver": "Set ferdig",
  "x01.play.nextLeg": "Neste leg",
  "x01.play.nextSet": "Neste set",
  "x01.play.backToConfig": "Tilbake til innstillinger",
  "x01.play.saveInHistory": "Lagre i historikk",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket-innstillinger",
  "cricket.config.players": "Spillere",
  "cricket.config.raceTo.label": "Poeng eller legs",
  "cricket.config.pointsWin": "Vinner på poeng",
  "cricket.config.legsWin": "Vinner på legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Mål",
  "cricket.play.hits": "Treff",
  "cricket.play.score": "Score",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Tur for",
  "cricket.play.open": "Åpent",
  "cricket.play.closed": "Lukket",
  "cricket.stats.title": "Cricket-statistikk",
  "cricket.stats.profile": "Cricket-profil",
  "cricket.stats.bestMpr": "Beste MPR",
  "cricket.stats.averageMpr": "Gj.sn. MPR",
  "cricket.stats.gamesPlayed": "Kamper spilt",
  "cricket.stats.gamesWon": "Kamper vunnet",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Trening",
  "training.menu.subtitle": "Arbeid med dine styrker",
  "training.menu.x01Solo": "X01 Solo-trening",
  "training.menu.x01Solo.desc": "Detaljert analyse av hvert kast.",
  "training.menu.clock": "Klokkerunden",
  "training.menu.clock.desc": "Treff alle mål i rekkefølge.",
  "training.menu.evolution": "Utviklingskurve",
  "training.menu.evolution.desc": "Se progresjonen din over tid.",
  "training.menu.custom": "Tilpasset økt",
  "training.menu.resumeLast": "Gjenoppta siste økt",
  "training.menu.noSession": "Ingen lagrede økter ennå",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo-trening",
  "training.x01.subtitle": "Analyse av hver dart",
  "training.x01.targetScore.label": "Startscore",
  "training.x01.throws": "Kastede darts",
  "training.x01.hitsBySegment": "Treff per segment",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Dobbel bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Snitt per dart",
  "training.x01.session.save": "Lagre økt",
  "training.x01.session.saved": "Økt lagret",
  "training.x01.session.delete": "Slett økt",
  "training.x01.session.confirmDelete":
    "Slette denne treningsøkten permanent?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Klokkerunden",
  "training.clock.subtitle": "Treff hvert tall i rekkefølge",
  "training.clock.objective.label": "Mål",
  "training.clock.objective.allSingles": "Alle singles",
  "training.clock.objective.allDoubles": "Alle doubles",
  "training.clock.objective.allTriples": "Alle trebles",
  "training.clock.objective.custom": "Tilpasset løype",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Ingen timer",
  "training.clock.timer.30": "30 sek",
  "training.clock.timer.60": "60 sek",
  "training.clock.timer.120": "120 sek",
  "training.clock.players": "Spillere",
  "training.clock.start": "Start trening",
  "training.clock.currentTarget": "Nåværende mål",
  "training.clock.progress": "Fremgang",
  "training.clock.session.save": "Lagre denne økten",
  "training.clock.session.saved": "Klokkeøkt lagret",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Statistikksenter",
  "stats.shell.tabs.local": "Lokale profiler",
  "stats.shell.tabs.training": "Trening",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historikk",
  "stats.shell.info": "Velg en statistikkseksjon.",
  "stats.hub.local.title": "Stats — lokale profiler",
  "stats.hub.local.selectProfile":
    "Velg en profil for å vise statistikk",
  "stats.hub.training.title": "Treningsstatistikk",
  "stats.hub.online.title": "Onlinestatistikk",
  "stats.hub.history.title": "Kamphistorikk",
  "stats.hub.kpi.avg3": "Snitt /3 darts",
  "stats.hub.kpi.winRate": "Seiersrate",
  "stats.hub.kpi.bestLeg": "Beste leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Nylig form",
  "stats.hub.radar.skills": "Ferdighetsradar",
  "stats.hub.training.clock": "Klokkerunden",
  "stats.hub.training.x01": "X01-trening",
  "stats.hub.training.volume": "Treningsvolum",
  "stats.hub.empty": "Ingen statistikk ennå",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Kamphistorikk",
  "history.subtitle": "Dine siste kamper",
  "history.filter.all": "Alle",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Trening",
  "history.empty": "Ingen lagrede kamper ennå",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Trening",
  "history.details.title": "Kampdetaljer",
  "history.details.players": "Spillere",
  "history.details.winner": "Vinner",
  "history.details.legs": "Legs",
  "history.details.sets": "Set",
  "history.details.avg3": "Snitt /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Slett kamp",
  "history.confirmDelete": "Slette denne kampen permanent?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online-modus",
  "online.subtitle": "Spill på avstand med venner",
  "online.login.title": "Logg inn",
  "online.login.nickname": "Kallenavn",
  "online.login.email": "E-post (valgfritt)",
  "online.login.password": "Passord",
  "online.login.submit": "Logg inn",
  "online.signup.title": "Opprett konto",
  "online.logout": "Logg ut",
  "online.profile.title": "Online-profil",
  "online.profile.country": "Land",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01-lobbyer",
  "online.lobby.create": "Opprett lobby",
  "online.lobby.join": "Bli med i lobby",
  "online.lobby.empty": "Ingen tilgjengelige lobbyer",
  "online.friends.title": "Venner",
  "online.friends.add": "Legg til venn",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Borte",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Innstillinger",
  "settings.theme.title": "Neon-temaer",
  "settings.theme.subtitle": "Velg atmosfære",
  "settings.theme.current": "Gjeldende tema",
  "settings.theme.applied": "Tema brukt",
  "settings.lang.title": "Språk",
  "settings.lang.subtitle": "App-språk",
  "settings.lang.help": "App-grensesnittet er oversatt.",
  "settings.section.language": "Språk",
  "settings.section.theme": "Temaer",
  "settings.section.misc": "Øvrig",
  "settings.misc.sounds": "Lyder",
  "settings.misc.vibrations": "Vibrasjoner",
  "settings.misc.animations": "Visuelle animasjoner",
  "settings.misc.resetApp": "Tilbakestill app",
  "settings.misc.resetConfirm":
    "Tilbakestille alle lokale data (profiler, historikk, trening)?",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Synk & deling",
  "sync.subtitle": "Lagre og del data",
  "sync.tabs.local": "Lokal",
  "sync.tabs.peer": "Enhet-til-enhet",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokal eksport",
  "sync.local.export.desc":
    "Kopier denne JSON for sikker lagring.",
  "sync.local.export.button": "Generer eksport",
  "sync.local.import.title": "Lokal import",
  "sync.local.import.desc":
    "Lim inn en JSON eksportert fra en annen enhet.",
  "sync.local.import.button": "Importer JSON",
  "sync.local.import.success": "Import fullført",
  "sync.local.import.error": "Ugyldig JSON – import mislyktes.",
  "sync.peer.soon": "Enhet-til-enhet synk kommer snart",
  "sync.cloud.soon": "Cloud-synk kommer snart",

  // -----------------------------
  // ETIKETTER
  // -----------------------------
  "label.points": "Poeng",
  "label.legs": "Legs",
  "label.sets": "Set",
  "label.avg3": "Snitt /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volum",
  "label.duration": "Varighet",
  "label.date": "Dato",
  "label.mode": "Modus",

  // -----------------------------
  // RESET + TEMAER
  // -----------------------------
  "settings.back": "Tilbake",
  "settings.subtitle":
    "Tilpass appens tema og språk",

  "settings.theme.group.neons": "Klassiske neons",
  "settings.theme.group.soft": "Myke farger",
  "settings.theme.group.dark": "Premium mørke temaer",

  "settings.theme.gold.label": "Gull-neon",
  "settings.theme.gold.desc": "Premium gyllent tema",

  "settings.theme.pink.label": "Pink-neon",
  "settings.theme.pink.desc": "Pink arcade-stil",

  "settings.theme.petrol.label": "Petrolblå",
  "settings.theme.petrol.desc": "Dyp neonblå",

  "settings.theme.green.label": "Grønn-neon",
  "settings.theme.green.desc": "Lyst treningsutseende",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intens lilla/magenta",

  "settings.theme.red.label": "Rød",
  "settings.theme.red.desc": "Kraftig arcade-rød",

  "settings.theme.orange.label": "Oransje",
  "settings.theme.orange.desc": "Varm og energisk oransje",

  "settings.theme.white.label": "Hvit",
  "settings.theme.white.desc": "Moderne lyst tema",

  "settings.theme.blueOcean.label": "Havblå",
  "settings.theme.blueOcean.desc": "Naturlig hav/himmelblå",

  "settings.theme.limeYellow.label": "Limegul",
  "settings.theme.limeYellow.desc": "Superintens limefarge",

  "settings.theme.sage.label": "Salviegrønn",
  "settings.theme.sage.desc": "Myke naturlige grønn-toner",

  "settings.theme.skyBlue.label": "Pastellblå",
  "settings.theme.skyBlue.desc": "Svært lys og myk blå",

  "settings.theme.darkTitanium.label": "Mørk titan",
  "settings.theme.darkTitanium.desc": "Matt premium metall-look",

  "settings.theme.darkCarbon.label": "Karbon",
  "settings.theme.darkCarbon.desc": "Moderne karbonfiberstil",

  "settings.theme.darkFrost.label": "Mørk frost",
  "settings.theme.darkFrost.desc": "Frost-aktig futuristisk svart",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Blank premium-sort med høy lesbarhet",

  "settings.lang": "Språk",

  "settings.reset.title": "Tilbakestill appen",
  "settings.reset.subtitle":
    "Sletter alle profiler, BOTS, stats, historikk og innstillinger. Kan ikke angres.",
  "settings.reset.button": "Tilbakestill alt",

  // -----------------------------
  // SPRÅKNAVN (NO)
  // -----------------------------
  "lang.fr": "Fransk",
  "lang.en": "Engelsk",
  "lang.es": "Spansk",
  "lang.de": "Tysk",
  "lang.it": "Italiensk",
  "lang.pt": "Portugisisk",
  "lang.nl": "Nederlandsk",
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
  "lang.ro": "Rumensk",
  "lang.sr": "Serbisk",
  "lang.hr": "Kroatisk",
  "lang.cs": "Tsjekkisk",
};
