// ============================================
// src/i18n/sv.ts
// Svensk ordlista (SV) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const sv: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Hem",
  "nav.local": "Lokal",
  "nav.games": "Spel",
  "nav.training": "Träning",
  "nav.online": "Online",
  "nav.stats": "Statistik",
  "nav.settings": "Inställningar",
  "nav.profiles": "Profiler",
  "nav.sync": "Synk & delning",
  "nav.back": "Tillbaka",
  "nav.close": "Stäng",

  // -----------------------------
  // GENERISKT / GEMENSAMT
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Avbryt",
  "common.yes": "Ja",
  "common.no": "Nej",
  "common.save": "Spara",
  "common.edit": "Redigera",
  "common.delete": "Ta bort",
  "common.confirm": "Bekräfta",
  "common.next": "Nästa",
  "common.prev": "Föregående",
  "common.start": "Starta",
  "common.continue": "Fortsätt",
  "common.resume": "Återuppta",
  "common.pause": "Pausa",
  "common.reset": "Återställ",
  "common.shuffle": "Slumpa",
  "common.loading": "Laddar…",
  "common.error": "Ett fel uppstod",
  "common.info": "Info",
  "common.stats": "Statistik",
  "common.history": "Historik",
  "common.tutorial": "Guide",
  "common.exit": "Avsluta",
  "common.backHome": "Tillbaka till hem",
  "common.player": "Spelare",
  "common.players": "Spelare",
  "common.team": "Lag",
  "common.teams": "Lag",
  "common.points": "Poäng",
  "common.average": "Snitt",
  "common.best": "Bäst",
  "common.worst": "Sämst",
  "common.total": "Totalt",
  "common.date": "Datum",
  "common.time": "Tid",

  // -----------------------------
  // HOME + PROFILKORT + ARCADEBANNER
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Kontrollcenter för Darts Counter",

  "status.online": "Online",
  "status.away": "Borta",
  "status.offline": "Offline",

  // Topprad
  "home.welcome": "Välkommen",
  "home.welcome.noProfile": "Välkommen till Darts Counter",
  "home.hero.tagline": "Redo för några dartkast?",

  // Aktiv profil
  "home.activeProfile.title": "Aktiv profil",
  "home.activeProfile.none": "Ingen profil vald",
  "home.activeProfile.select": "Välj en profil",
  "home.activeProfile.manage": "Hantera profiler",
  "home.activeProfile.status.online": "Ansluten",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gäst",
  "home.activeProfile.badge.you": "Du",
  "home.activeProfile.badge.local": "Lokal",
  "home.activeProfile.badge.online": "Online",

  // Stats i kortet
  "home.activeProfile.stats.title": "Snabbstats",
  "home.activeProfile.stats.x01Avg": "X01-snittsiffra",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Träningsvolym",
  "home.activeProfile.stats.lastGame": "Senaste match",
  "home.activeProfile.stats.noGames": "Inga matcher ännu",
  "home.activeProfile.stats.seeAll": "Visa alla stats",

  // Snabbåtgärder
  "home.quickActions.title": "Snabbåtgärder",
  "home.quickActions.playX01": "Starta X01",
  "home.quickActions.playCricket": "Starta Cricket",
  "home.quickActions.training": "Öppna träning",
  "home.quickActions.stats": "Visa statistik",

  // Stats-karusell
  "home.statsCarousel.title": "Snabbstats",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Träning",

  // ArcadeTicker
  "home.arcadeBanner.title": "Info & nyheter",
  "home.arcadeBanner.tapForMore": "Tryck för mer info",
  "home.arcadeBanner.empty": "Ingen information att visa just nu",
  "home.arcadeBanner.tag.new": "Ny",
  "home.arcadeBanner.tag.tip": "Tips",
  "home.arcadeBanner.tag.update": "Uppdatering",

  // Navigationsknappar
  "home.nav.profiles": "Profiler",
  "home.nav.profiles.desc": "Lokala profiler, avatarer & BOTS",
  "home.nav.local": "Lokal",
  "home.nav.local.desc": "Spela på denna darttavla",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Matcher på distans med vänner",
  "home.nav.training": "Träning",
  "home.nav.training.desc": "Detaljerade träningslägen",
  "home.nav.stats": "Statistik",
  "home.nav.stats.desc": "Dashboards, grafer, historik",
  "home.nav.settings": "Inställningar",
  "home.nav.settings.desc": "Teman, språk, avancerade val",

  // -----------------------------
  // DASHBOARD TICKER
  // -----------------------------
  "home.ticker.records": "Senaste rekord",
  "home.ticker.records.text":
    "Flera rekord har slagits nyligen – fortsätt så!",

  "home.ticker.localLast": "Senaste lokala match",
  "home.ticker.localLast.text":
    "Sammanfattning av senaste matchen offline.",

  "home.ticker.onlineLast": "Senaste onlinematch",
  "home.ticker.onlineLast.text":
    "Din senaste onlineduell är redo för revansch.",

  "home.ticker.onlineLeader": "Toppspelare",
  "home.ticker.onlineLeader.text":
    "Se vem som leder online-rankingen.",

  "home.ticker.training": "Aktuell träning",
  "home.ticker.training.text":
    "Totalt X01-träning + klockrundor.",

  "home.ticker.month": "Månadens stats",
  "home.ticker.month.text":
    "Totalt antal matcher och träffar denna månad.",

  "home.ticker.tip": "Dagens tips",
  "home.ticker.tip.text":
    "Förstärk dina favoritfinisher genom att öva dem regelbundet.",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "Alla spel",
  "games.subtitle": "Välj spelläget",
  "games.section.classic": "Klassiska",
  "games.section.training": "Träning",
  "games.section.party": "Party & skoj",
  "games.section.other": "Övriga lägen",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… avsluta på exakt 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 till 20 + Bull. Öppna/stäng och poängsätt.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Bli killer och slå ut de andra.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Ett nummer per runda, träffa S / D / T.",
  "games.training.menuTitle": "Träning",
  "games.training.x01Solo": "X01 Solo-träning",
  "games.training.clock": "Klockrundan",
  "games.training.custom": "Anpassad träning",
  "games.training.evolution": "Utvecklingsstatistik",
  "games.info.title": "Spelinformation",
  "games.info.rules": "Regler",
  "games.info.tips": "Tips",

  // -----------------------------
  // PROFILER
  // -----------------------------
  "profiles.title": "Lokala profiler",
  "profiles.subtitle": "Hantera dina lokala spelare",
  "profiles.add": "Lägg till profil",
  "profiles.edit": "Redigera profil",
  "profiles.delete": "Ta bort profil",
  "profiles.confirmDelete": "Ta bort denna profil permanent?",
  "profiles.name.label": "Spelarnamn",
  "profiles.name.placeholder": "Ange ett smeknamn",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Slumpad avatar",
  "profiles.stats.title": "Profilstatistik",
  "profiles.stats.x01": "X01-statistik",
  "profiles.stats.cricket": "Cricket-statistik",
  "profiles.stats.training": "Träningsstatistik",
  "profiles.status.active": "Aktiv",
  "profiles.status.inactive": "Inaktiv",
  "profiles.selectActive": "Sätt som aktiv profil",
  "profiles.list.empty": "Inga profiler ännu",
  "profiles.list.selectHint": "Tryck på en profil för att välja den",
  "profiles.hint.avatarTap": "Tryck på medaljongen för att byta avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar-skapare",
  "avatar.subtitle": "Anpassa din medaljong",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Lätt realism",
  "avatar.style.comic": "Seriestil",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Överdriven",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Förhandsvisning",
  "avatar.generate": "Generera ny avatar",
  "avatar.keep": "Behåll denna avatar",
  "avatar.cancel": "Avbryt ändringar",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01-inställningar",
  "x01.config.subtitle": "Förbered matchen",
  "x01.config.section.players": "Spelare",
  "x01.config.section.match": "Matchformat",
  "x01.config.section.rules": "Grundinställningar",
  "x01.config.players.add": "Lägg till spelare",
  "x01.config.players.remove": "Ta bort",
  "x01.config.players.teams": "Lag",
  "x01.config.mode.label": "Spelläge",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Lag",
  "x01.config.raceToSets.label": "Vinnande set",
  "x01.config.raceToLegs.label": "Vinnande leg",
  "x01.config.startingScore.label": "Startpoäng",
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
  "x01.config.service.label": "Serve",
  "x01.config.service.random": "Slumpmässig",
  "x01.config.service.alternate": "Växelvis",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Lägg till bot",
  "x01.config.bots.level.easy": "Lätt",
  "x01.config.bots.level.medium": "Medel",
  "x01.config.bots.level.hard": "Svår",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Starta match",
  "x01.config.back": "Tillbaka till spel",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Tur:",
  "x01.play.scoreRemaining": "Återstår",
  "x01.play.lastVisit": "Senaste runda",
  "x01.play.average3": "Snitt /3 darts",
  "x01.play.bestVisit": "Bästa runda",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Darts kastade",
  "x01.play.visits": "Rundor",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Ångra runda",
  "x01.play.confirmExit": "Avsluta pågående match?",
  "x01.play.botThinking": "Bot spelar…",
  "x01.play.noScoreYet": "Ingen poäng ännu",
  "x01.play.matchOver": "Matchen är slut",
  "x01.play.legOver": "Leg klar",
  "x01.play.setOver": "Set klart",
  "x01.play.nextLeg": "Nästa leg",
  "x01.play.nextSet": "Nästa set",
  "x01.play.backToConfig": "Tillbaka till inställningar",
  "x01.play.saveInHistory": "Spara i historiken",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket-inställningar",
  "cricket.config.players": "Spelare",
  "cricket.config.raceTo.label": "Poäng eller legs",
  "cricket.config.pointsWin": "Vinst på poäng",
  "cricket.config.legsWin": "Vinst på legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Mål",
  "cricket.play.hits": "Träffar",
  "cricket.play.score": "Poäng",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Tur:",
  "cricket.play.open": "Öppen",
  "cricket.play.closed": "Stängd",
  "cricket.stats.title": "Cricket-statistik",
  "cricket.stats.profile": "Cricket-profil",
  "cricket.stats.bestMpr": "Bästa MPR",
  "cricket.stats.averageMpr": "Genomsnittlig MPR",
  "cricket.stats.gamesPlayed": "Spelade matcher",
  "cricket.stats.gamesWon": "Vunna matcher",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Träning",
  "training.menu.subtitle": "Jobba på dina styrkor",
  "training.menu.x01Solo": "X01 Solo-träning",
  "training.menu.x01Solo.desc": "Detaljerad spårning av varje dart.",
  "training.menu.clock": "Klockrundan",
  "training.menu.clock.desc": "Gå igenom alla mål i ordning.",
  "training.menu.evolution": "Utvecklingskurva",
  "training.menu.evolution.desc": "Visa din utveckling över tid.",
  "training.menu.custom": "Anpassad session",
  "training.menu.resumeLast": "Återuppta senaste session",
  "training.menu.noSession": "Inga sparade sessioner ännu",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo-träning",
  "training.x01.subtitle": "Analys av varje dart",
  "training.x01.targetScore.label": "Startpoäng",
  "training.x01.throws": "Kastade darts",
  "training.x01.hitsBySegment": "Träffar per segment",
  "training.x01.hits.single": "Singlar",
  "training.x01.hits.double": "Dubblar",
  "training.x01.hits.triple": "Tripplar",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Dubbel bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Snitt per dart",
  "training.x01.session.save": "Spara session",
  "training.x01.session.saved": "Session sparad",
  "training.x01.session.delete": "Ta bort session",
  "training.x01.session.confirmDelete":
    "Ta bort denna träningssession permanent?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Klockrundan",
  "training.clock.subtitle": "Träffa varje siffra i ordning",
  "training.clock.objective.label": "Mål",
  "training.clock.objective.allSingles": "Alla singlar",
  "training.clock.objective.allDoubles": "Alla dubblar",
  "training.clock.objective.allTriples": "Alla tripplar",
  "training.clock.objective.custom": "Anpassad bana",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Ingen timer",
  "training.clock.timer.30": "30 sek",
  "training.clock.timer.60": "60 sek",
  "training.clock.timer.120": "120 sek",
  "training.clock.players": "Spelare",
  "training.clock.start": "Starta träning",
  "training.clock.currentTarget": "Nuvarande mål",
  "training.clock.progress": "Framsteg",
  "training.clock.session.save": "Spara denna session",
  "training.clock.session.saved": "Klocksession sparad",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Statistikcenter",
  "stats.shell.tabs.local": "Lokala profiler",
  "stats.shell.tabs.training": "Träning",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historik",
  "stats.shell.info": "Välj en statistiksektion.",
  "stats.hub.local.title": "Stats — lokala profiler",
  "stats.hub.local.selectProfile":
    "Välj en profil för att visa stats",
  "stats.hub.training.title": "Träningsstatistik",
  "stats.hub.online.title": "Onlinestatistik",
  "stats.hub.history.title": "Matchhistorik",
  "stats.hub.kpi.avg3": "Snitt /3 darts",
  "stats.hub.kpi.winRate": "Vinstprocent",
  "stats.hub.kpi.bestLeg": "Bästa leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Senaste form",
  "stats.hub.radar.skills": "Färdighetsradar",
  "stats.hub.training.clock": "Klockrundan",
  "stats.hub.training.x01": "X01-träning",
  "stats.hub.training.volume": "Träningsvolym",
  "stats.hub.empty": "Inga stats tillgängliga ännu",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Matchhistorik",
  "history.subtitle": "Dina senaste matcher",
  "history.filter.all": "Alla",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Träning",
  "history.empty": "Inga sparade matcher ännu",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Träning",
  "history.details.title": "Matchdetaljer",
  "history.details.players": "Spelare",
  "history.details.winner": "Vinnare",
  "history.details.legs": "Legs",
  "history.details.sets": "Set",
  "history.details.avg3": "Snitt /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Ta bort match",
  "history.confirmDelete": "Ta bort denna match permanent?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Onlineläge",
  "online.subtitle": "Spela på distans med vänner",
  "online.login.title": "Logga in",
  "online.login.nickname": "Smeknamn",
  "online.login.email": "E-post (valfritt)",
  "online.login.password": "Lösenord",
  "online.login.submit": "Logga in",
  "online.signup.title": "Skapa konto",
  "online.logout": "Logga ut",
  "online.profile.title": "Onlineprofil",
  "online.profile.country": "Land",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01-lobbys",
  "online.lobby.create": "Skapa lobby",
  "online.lobby.join": "Gå med i lobby",
  "online.lobby.empty": "Inga tillgängliga lobbys just nu",
  "online.friends.title": "Vänner",
  "online.friends.add": "Lägg till vän",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Borta",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Inställningar",
  "settings.theme.title": "Neon-teman",
  "settings.theme.subtitle": "Välj din stämning",
  "settings.theme.current": "Aktuellt tema",
  "settings.theme.applied": "Tema aktiverat",
  "settings.lang.title": "Språk",
  "settings.lang.subtitle": "Appens språk",
  "settings.lang.help": "Gränssnittstexterna är översatta.",
  "settings.section.language": "Språk",
  "settings.section.theme": "Teman",
  "settings.section.misc": "Övrigt",
  "settings.misc.sounds": "Ljud",
  "settings.misc.vibrations": "Vibrationer",
  "settings.misc.animations": "Visuella animationer",
  "settings.misc.resetApp": "Återställ appen",
  "settings.misc.resetConfirm":
    "Återställ alla lokala data (profiler, historik, träning)?",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Synk & delning",
  "sync.subtitle": "Spara och dela dina data",
  "sync.tabs.local": "Lokal",
  "sync.tabs.peer": "Enhet till enhet",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokal export",
  "sync.local.export.desc":
    "Kopiera denna JSON för säker backup.",
  "sync.local.export.button": "Generera export",
  "sync.local.import.title": "Lokal import",
  "sync.local.import.desc":
    "Klistra in en JSON exporterad från en annan enhet.",
  "sync.local.import.button": "Importera JSON",
  "sync.local.import.success": "Import lyckades",
  "sync.local.import.error": "Ogiltig JSON – import misslyckades.",
  "sync.peer.soon": "Enhet-till-enhet-synk kommer snart",
  "sync.cloud.soon": "Cloud-synk kommer snart",

  // -----------------------------
  // ETIKETTER
  // -----------------------------
  "label.points": "Poäng",
  "label.legs": "Legs",
  "label.sets": "Set",
  "label.avg3": "Snitt /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volym",
  "label.duration": "Varaktighet",
  "label.date": "Datum",
  "label.mode": "Läge",

  // -----------------------------
  // RESET + TEMAN
  // -----------------------------
  "settings.back": "Tillbaka",
  "settings.subtitle":
    "Anpassa appens tema och språk",

  "settings.theme.group.neons": "Klassiska neons",
  "settings.theme.group.soft": "Mjuka färger",
  "settings.theme.group.dark": "Mörka premiumteman",

  "settings.theme.gold.label": "Guld-neon",
  "settings.theme.gold.desc": "Premium guldtema",

  "settings.theme.pink.label": "Rosa neon",
  "settings.theme.pink.desc": "Rosa arcade-känsla",

  "settings.theme.petrol.label": "Petrolblå",
  "settings.theme.petrol.desc": "Djup neonblå",

  "settings.theme.green.label": "Grön neon",
  "settings.theme.green.desc": "Ljust träningsutseende",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intensiv lila/magenta",

  "settings.theme.red.label": "Röd",
  "settings.theme.red.desc": "Aggressiv arcade-röd",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Varm och energisk orange",

  "settings.theme.white.label": "Vit",
  "settings.theme.white.desc": "Modernt ljust tema",

  "settings.theme.blueOcean.label": "Havblå",
  "settings.theme.blueOcean.desc": "Naturligt havs-/himmelblå",

  "settings.theme.limeYellow.label": "Limegul",
  "settings.theme.limeYellow.desc": "Superflashig limefärg",

  "settings.theme.sage.label": "Salviagrön",
  "settings.theme.sage.desc": "Mjuka, naturliga grön-toner",

  "settings.theme.skyBlue.label": "Pastellblå",
  "settings.theme.skyBlue.desc": "Mycket mjuk och ljus blå",

  "settings.theme.darkTitanium.label": "Mörk titan",
  "settings.theme.darkTitanium.desc": "Matt metalliskt premiumutseende",

  "settings.theme.darkCarbon.label": "Kolfiber",
  "settings.theme.darkCarbon.desc": "Modern kolfiberkänsla",

  "settings.theme.darkFrost.label": "Mörk frost",
  "settings.theme.darkFrost.desc": "Futuristisk frostsvart",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Blank premiumsvart med bra läsbarhet",

  "settings.lang": "Språk",

  "settings.reset.title": "Återställ appen",
  "settings.reset.subtitle":
    "Tar bort alla lokala profiler, BOTS, stats, matchhistorik och inställningar. Oåterkallelig åtgärd.",
  "settings.reset.button": "Återställ allt",

  // -----------------------------
  // SPRÅKNAMN (SV)
  // -----------------------------
  "lang.fr": "Franska",
  "lang.en": "Engelska",
  "lang.es": "Spanska",
  "lang.de": "Tyska",
  "lang.it": "Italienska",
  "lang.pt": "Portugisiska",
  "lang.nl": "Nederländska",
  "lang.ru": "Ryska",
  "lang.zh": "Kinesiska",
  "lang.ja": "Japanska",
  "lang.ar": "Arabiska",
  "lang.hi": "Hindi",
  "lang.tr": "Turkiska",
  "lang.da": "Danska",
  "lang.no": "Norska",
  "lang.sv": "Svenska",
  "lang.is": "Isländska",
  "lang.pl": "Polska",
  "lang.ro": "Rumänska",
  "lang.sr": "Serbiska",
  "lang.hr": "Kroatiska",
  "lang.cs": "Tjeckiska",
};
