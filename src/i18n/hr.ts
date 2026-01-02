// ============================================
// src/i18n/hr.ts
// Rječnik Hrvatski (HR) — v1 komplet
// ============================================

import type { Dict } from "../contexts/LangContext";

export const hr: Dict = {
  // -----------------------------
  // NAVIGACIJA / TABOVI
  // -----------------------------
  "nav.home": "Početna",
  "nav.local": "Lokalno",
  "nav.games": "Igre",
  "nav.training": "Trening",
  "nav.online": "Online",
  "nav.stats": "Statistike",
  "nav.settings": "Postavke",
  "nav.profiles": "Profili",
  "nav.sync": "Sync & dijeljenje",
  "nav.back": "Natrag",
  "nav.close": "Zatvori",

  // -----------------------------
  // ZAJEDNIČKO / OPĆE
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Odustani",
  "common.yes": "Da",
  "common.no": "Ne",
  "common.save": "Spremi",
  "common.edit": "Uredi",
  "common.delete": "Izbriši",
  "common.confirm": "Potvrdi",
  "common.next": "Dalje",
  "common.prev": "Prethodno",
  "common.start": "Pokreni",
  "common.continue": "Nastavi",
  "common.resume": "Nastavi",
  "common.pause": "Pauza",
  "common.reset": "Resetiraj",
  "common.shuffle": "Nasumično",
  "common.loading": "Učitavanje…",
  "common.error": "Došlo je do pogreške",
  "common.info": "Info",
  "common.stats": "Statistike",
  "common.history": "Povijest",
  "common.tutorial": "Vodič",
  "common.exit": "Izlaz",
  "common.backHome": "Natrag na početnu",
  "common.player": "Igrač",
  "common.players": "Igrači",
  "common.team": "Tim",
  "common.teams": "Timovi",
  "common.points": "Bodovi",
  "common.average": "Prosjek",
  "common.best": "Najbolje",
  "common.worst": "Najgore",
  "common.total": "Ukupno",
  "common.date": "Datum",
  "common.time": "Vrijeme",

  // -----------------------------
  // HOME — NADZORNA PLOČA
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Kontrolni centar Darts Counter-a",

  "status.online": "Online",
  "status.away": "Odsutan",
  "status.offline": "Offline",

  "home.welcome": "Dobrodošli",
  "home.welcome.noProfile": "Dobrodošli u Darts Counter",
  "home.hero.tagline": "Spremni za nekoliko strelica?",

  // Aktivni profil
  "home.activeProfile.title": "Aktivni profil",
  "home.activeProfile.none": "Nema odabranog profila",
  "home.activeProfile.select": "Odaberite profil",
  "home.activeProfile.manage": "Upravljaj profilima",
  "home.activeProfile.status.online": "Povezan",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gost",
  "home.activeProfile.badge.you": "Ti",
  "home.activeProfile.badge.local": "Lokalno",
  "home.activeProfile.badge.online": "Online",

  // Statistike u kartici
  "home.activeProfile.stats.title": "Brze statistike",
  "home.activeProfile.stats.x01Avg": "X01 prosjek",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Trening volumen",
  "home.activeProfile.stats.lastGame": "Zadnja igra",
  "home.activeProfile.stats.noGames": "Još nema igara",
  "home.activeProfile.stats.seeAll": "Prikaži sve statistike",

  // Brze akcije
  "home.quickActions.title": "Brze akcije",
  "home.quickActions.playX01": "Pokreni X01",
  "home.quickActions.playCricket": "Pokreni Cricket",
  "home.quickActions.training": "Otvori Training",
  "home.quickActions.stats": "Prikaži statistike",

  // Karusel
  "home.statsCarousel.title": "Brze statistike",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // ArcadeTicker
  "home.arcadeBanner.title": "Info i novosti",
  "home.arcadeBanner.tapForMore": "Dodirnite za više detalja",
  "home.arcadeBanner.empty": "Trenutno nema informacija",
  "home.arcadeBanner.tag.new": "Novo",
  "home.arcadeBanner.tag.tip": "Savjet",
  "home.arcadeBanner.tag.update": "Ažuriranje",

  // Velike navigacijske tipke
  "home.nav.profiles": "Profili",
  "home.nav.profiles.desc": "Lokalni profili, avatari i BOTS",
  "home.nav.local": "Lokalno",
  "home.nav.local.desc": "Igrajte na ovoj meti",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Udaljene igre s prijateljima",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detaljni treninzi i moduli",
  "home.nav.stats": "Statistike",
  "home.nav.stats.desc": "Grafovi, povijest i podaci",
  "home.nav.settings": "Postavke",
  "home.nav.settings.desc": "Teme, jezik i dodatne opcije",

  // -----------------------------
  // TICKER
  // -----------------------------
  "home.ticker.records": "Zadnji rekordi",
  "home.ticker.records.text":
    "Nekoliko rekorda je nedavno srušeno – samo nastavite!",

  "home.ticker.localLast": "Zadnja lokalna igra",
  "home.ticker.localLast.text":
    "Sažetak zadnje lokalne igre.",

  "home.ticker.onlineLast": "Zadnja online igra",
  "home.ticker.onlineLast.text":
    "Vaš zadnji online meč spreman je za revanš.",

  "home.ticker.onlineLeader": "Lider ljestvice",
  "home.ticker.onlineLeader.text":
    "Saznajte tko je trenutno na vrhu online ljestvice.",

  "home.ticker.training": "Trening pregled",
  "home.ticker.training.text":
    "Ukupan broj X01 treninga i Kruga sata.",

  "home.ticker.month": "Mjesečne statistike",
  "home.ticker.month.text":
    "Ukupan broj igara i pogodaka ovog mjeseca.",

  "home.ticker.tip": "Savjet dana",
  "home.ticker.tip.text":
    "Uvježbajte svoju omiljenu završnicu redovnim ponavljanjem.",

  // -----------------------------
  // IGRE
  // -----------------------------
  "games.title": "Sve igre",
  "games.subtitle": "Odaberite način igre",
  "games.section.classic": "Klasične",
  "games.section.training": "Trening",
  "games.section.party": "Zabava",
  "games.section.other": "Ostalo",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… završite točno na 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull, otvorite/zatvorite i skupljajte bodove.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Postanite killer i eliminirajte druge.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Jedan broj po rundi – pogodite S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Krug sata",
  "games.training.custom": "Prilagođeni trening",
  "games.training.evolution": "Statistike napretka",
  "games.info.title": "Info",
  "games.info.rules": "Pravila",
  "games.info.tips": "Savjeti",

  // -----------------------------
  // PROFILI
  // -----------------------------
  "profiles.title": "Lokalni profili",
  "profiles.subtitle": "Upravljajte igračima",
  "profiles.add": "Dodaj profil",
  "profiles.edit": "Uredi profil",
  "profiles.delete": "Izbriši profil",
  "profiles.confirmDelete":
    "Trajno izbrisati ovaj profil?",
  "profiles.name.label": "Ime igrača",
  "profiles.name.placeholder": "Unesite nadimak",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Nasumični avatar",
  "profiles.stats.title": "Statistike profila",
  "profiles.stats.x01": "X01 statistike",
  "profiles.stats.cricket": "Cricket statistike",
  "profiles.stats.training": "Training statistike",
  "profiles.status.active": "Aktivan",
  "profiles.status.inactive": "Neaktivan",
  "profiles.selectActive": "Postavi kao aktivni profil",
  "profiles.list.empty": "Još nema profila",
  "profiles.list.selectHint":
    "Dodirnite profil za odabir",
  "profiles.hint.avatarTap":
    "Dodirnite medaljon za promjenu avatara",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Kreator avatara",
  "avatar.subtitle": "Prilagodite svoj medaljon",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Blagi realizam",
  "avatar.style.comic": "Strip",
  "avatar.style.flat": "Flat dizajn",
  "avatar.style.exaggerated": "Naglašeno",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Pregled",
  "avatar.generate": "Generiraj novi avatar",
  "avatar.keep": "Zadrži avatar",
  "avatar.cancel": "Odustani",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01 postavke",
  "x01.config.subtitle": "Pripremite igru",
  "x01.config.section.players": "Igrači",
  "x01.config.section.match": "Format meča",
  "x01.config.section.rules": "Osnovne postavke",
  "x01.config.players.add": "Dodaj igrača",
  "x01.config.players.remove": "Ukloni",
  "x01.config.players.teams": "Timovi",
  "x01.config.mode.label": "Mod igre",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Timovi",
  "x01.config.raceToSets.label": "Setovi do pobjede",
  "x01.config.raceToLegs.label": "Legovi do pobjede",
  "x01.config.startingScore.label": "Početni rezultat",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Prilagođeno",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Servis",
  "x01.config.service.random": "Nasumično",
  "x01.config.service.alternate": "Naizmjenično",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Dodaj bota",
  "x01.config.bots.level.easy": "Lagano",
  "x01.config.bots.level.medium": "Srednje",
  "x01.config.bots.level.hard": "Teško",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Pokreni igru",
  "x01.config.back": "Natrag na igre",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Na potezu",
  "x01.play.scoreRemaining": "Preostalo",
  "x01.play.lastVisit": "Zadnja posjeta",
  "x01.play.average3": "Prosjek /3 darts",
  "x01.play.bestVisit": "Najbolja posjeta",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Bačene strelice",
  "x01.play.visits": "Posjete",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Poništi posjetu",
  "x01.play.confirmExit": "Napustiti trenutnu igru?",
  "x01.play.botThinking": "Bot igra…",
  "x01.play.noScoreYet": "Još nema rezultata",
  "x01.play.matchOver": "Meč završen",
  "x01.play.legOver": "Leg završen",
  "x01.play.setOver": "Set završen",
  "x01.play.nextLeg": "Sljedeći leg",
  "x01.play.nextSet": "Sljedeći set",
  "x01.play.backToConfig": "Natrag na postavke",
  "x01.play.saveInHistory": "Spremi u povijest",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket postavke",
  "cricket.config.players": "Igrači",
  "cricket.config.raceTo.label": "Bodovi ili legovi",
  "cricket.config.pointsWin": "Pobjeda na bodove",
  "cricket.config.legsWin": "Pobjeda na legove",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Mete",
  "cricket.play.hits": "Pogoci",
  "cricket.play.score": "Rezultat",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Na potezu",
  "cricket.play.open": "Otvoreno",
  "cricket.play.closed": "Zatvoreno",
  "cricket.stats.title": "Cricket statistike",
  "cricket.stats.profile": "Cricket profil",
  "cricket.stats.bestMpr": "Najbolji MPR",
  "cricket.stats.averageMpr": "Prosječni MPR",
  "cricket.stats.gamesPlayed": "Odigrane igre",
  "cricket.stats.gamesWon": "Dobivene igre",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Trening",
  "training.menu.subtitle": "Usavršite svoje vještine",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Detaljno praćenje svake strelice.",
  "training.menu.clock": "Krug sata",
  "training.menu.clock.desc": "Pogodite sve mete redoslijedom.",
  "training.menu.evolution": "Krivulja napretka",
  "training.menu.evolution.desc": "Pratite napredak kroz vrijeme.",
  "training.menu.custom": "Prilagođena sesija",
  "training.menu.resumeLast": "Nastavi zadnju sesiju",
  "training.menu.noSession": "Još nema spremljenih sesija",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analiza svake strelice",
  "training.x01.targetScore.label": "Početni rezultat",
  "training.x01.throws": "Bačene strelice",
  "training.x01.hitsBySegment": "Pogoci po segmentu",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Bustovi",
  "training.x01.avgPerDart": "Prosjek po strelici",
  "training.x01.session.save": "Spremi sesiju",
  "training.x01.session.saved": "Sesija spremljena",
  "training.x01.session.delete": "Izbriši sesiju",
  "training.x01.session.confirmDelete":
    "Trajno izbrisati ovu sesiju?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Krug sata",
  "training.clock.subtitle": "Pogodite svaki broj redom",
  "training.clock.objective.label": "Cilj",
  "training.clock.objective.allSingles": "Svi single",
  "training.clock.objective.allDoubles": "Svi double",
  "training.clock.objective.allTriples": "Svi triple",
  "training.clock.objective.custom": "Prilagođeni redoslijed",
  "training.clock.timer.label": "Tajmer",
  "training.clock.timer.off": "Bez tajmera",
  "training.clock.timer.30": "30 sekundi",
  "training.clock.timer.60": "60 sekundi",
  "training.clock.timer.120": "120 sekundi",
  "training.clock.players": "Igrači",
  "training.clock.start": "Pokreni trening",
  "training.clock.currentTarget": "Trenutna meta",
  "training.clock.progress": "Napredak",
  "training.clock.session.save": "Spremi sesiju",
  "training.clock.session.saved":
    "Sesija Kruga sata spremljena",

  // -----------------------------
  // STATS HUB
  // -----------------------------
  "stats.shell.title": "Centar statistika",
  "stats.shell.tabs.local": "Lokalni profili",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Povijest",
  "stats.shell.info": "Odaberite sekciju statistika.",
  "stats.hub.local.title":
    "Statistike lokalnih profila",
  "stats.hub.local.selectProfile":
    "Odaberite profil za pregled statistika",
  "stats.hub.training.title": "Training statistike",
  "stats.hub.online.title": "Online statistike",
  "stats.hub.history.title": "Povijest igara",
  "stats.hub.kpi.avg3": "Prosjek /3 darts",
  "stats.hub.kpi.winRate": "Postotak pobjeda",
  "stats.hub.kpi.bestLeg": "Najbolji leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Nedavna forma",
  "stats.hub.radar.skills": "Radar vještina",
  "stats.hub.training.clock": "Krug sata",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Trening volumen",
  "stats.hub.empty": "Nema dostupnih statistika",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Povijest igara",
  "history.subtitle": "Vaše zadnje igre",
  "history.filter.all": "Sve",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Još nema spremljenih igara",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Trening",
  "history.details.title": "Detalji igre",
  "history.details.players": "Igrači",
  "history.details.winner": "Pobjednik",
  "history.details.legs": "Legovi",
  "history.details.sets": "Setovi",
  "history.details.avg3": "Prosjek /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Izbriši igru",
  "history.confirmDelete":
    "Trajno izbrisati ovu igru?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online mod",
  "online.subtitle": "Igrajte na daljinu s prijateljima",
  "online.login.title": "Prijava",
  "online.login.nickname": "Nadimak",
  "online.login.email": "E-mail (opcionalno)",
  "online.login.password": "Lozinka",
  "online.login.submit": "Prijavi se",
  "online.signup.title": "Kreiraj račun",
  "online.logout": "Odjavi se",
  "online.profile.title": "Online profil",
  "online.profile.country": "Država",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 lobi",
  "online.lobby.create": "Kreiraj lobi",
  "online.lobby.join": "Pridruži se lobiju",
  "online.lobby.empty": "Nema dostupnih lobija",
  "online.friends.title": "Prijatelji",
  "online.friends.add": "Dodaj prijatelja",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Odsutan",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.back": "Natrag",
  "settings.title": "Postavke",
  "settings.subtitle":
    "Prilagodite temu i jezik aplikacije",

  "settings.theme": "Tema",
  "settings.theme.group.neons": "Klasični neoni",
  "settings.theme.group.soft": "Nježne boje",
  "settings.theme.group.dark": "Dark premium teme",

  "settings.theme.gold.label": "Zlatni neon",
  "settings.theme.gold.desc": "Premium zlatna tema",

  "settings.theme.pink.label": "Ružičasti neon",
  "settings.theme.pink.desc": "Arcade ružičasta atmosfera",

  "settings.theme.petrol.label": "Petrol plava",
  "settings.theme.petrol.desc": "Duboka neon plava",

  "settings.theme.green.label": "Zelena neon",
  "settings.theme.green.desc": "Svijetli trening stil",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc":
    "Intenzivna ljubičasto-magenta",

  "settings.theme.red.label": "Crvena",
  "settings.theme.red.desc": "Agresivna arcade crvena",

  "settings.theme.orange.label": "Narančasta",
  "settings.theme.orange.desc": "Topla i energična",

  "settings.theme.white.label": "Bijela",
  "settings.theme.white.desc": "Moderan svijetli izgled",

  "settings.theme.blueOcean.label": "Ocean plava",
  "settings.theme.blueOcean.desc":
    "Prirodna plava oceana i neba",

  "settings.theme.limeYellow.label": "Lime žuta",
  "settings.theme.limeYellow.desc":
    "Izuzetno jarka lime boja",

  "settings.theme.sage.label": "Sage zelena",
  "settings.theme.sage.desc": "Blage prirodne nijanse",

  "settings.theme.skyBlue.label": "Pastel plava",
  "settings.theme.skyBlue.desc":
    "Vrlo nježna i svijetla plava",

  "settings.theme.darkTitanium.label": "Tamni titan",
  "settings.theme.darkTitanium.desc":
    "Premium mat metalni izgled",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc":
    "Moderni karbon izgled",

  "settings.theme.darkFrost.label": "Tamni frost",
  "settings.theme.darkFrost.desc":
    "Zaleđeni futuristički crni ton",

  "settings.theme.darkObsidian.label": "Opsidijan",
  "settings.theme.darkObsidian.desc":
    "Sjajna premium crna",

  "settings.lang": "Jezik",

  "settings.reset.title": "Resetiraj aplikaciju",
  "settings.reset.subtitle":
    "Briše sve lokalne profile, BOTS, statistike, povijest i postavke. Nepovratno.",
  "settings.reset.button": "Resetiraj sve",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & dijeljenje",
  "sync.subtitle": "Spremite i podijelite svoje podatke",
  "sync.tabs.local": "Lokalno",
  "sync.tabs.peer": "Uređaj–uređaj",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokalni export",
  "sync.local.export.desc":
    "Kopirajte ovaj JSON za spremanje.",
  "sync.local.export.button": "Generiraj export",
  "sync.local.import.title": "Lokalni import",
  "sync.local.import.desc":
    "Zalijepite JSON eksportiran s drugog uređaja.",
  "sync.local.import.button": "Import JSON-a",
  "sync.local.import.success": "Import uspješan",
  "sync.local.import.error": "Pogrešan JSON",
  "sync.peer.soon": "Uređaj–uređaj sync uskoro",
  "sync.cloud.soon": "Cloud sync uskoro",

  // -----------------------------
  // OZNAKE
  // -----------------------------
  "label.points": "Bodovi",
  "label.legs": "Legovi",
  "label.sets": "Setovi",
  "label.avg3": "Prosjek /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volumen",
  "label.duration": "Trajanje",
  "label.date": "Datum",
  "label.mode": "Mod",

  // -----------------------------
  // IMENA JEZIKA (HR)
  // -----------------------------
  "lang.fr": "Francuski",
  "lang.en": "Engleski",
  "lang.es": "Španjolski",
  "lang.de": "Njemački",
  "lang.it": "Talijanski",
  "lang.pt": "Portugalski",
  "lang.nl": "Nizozemski",
  "lang.ru": "Ruski",
  "lang.zh": "Kineski",
  "lang.ja": "Japanski",
  "lang.ar": "Arapski",
  "lang.hi": "Hindi",
  "lang.tr": "Turski",
  "lang.da": "Danski",
  "lang.no": "Norveški",
  "lang.sv": "Švedski",
  "lang.is": "Islandski",
  "lang.pl": "Poljski",
  "lang.ro": "Rumunjski",
  "lang.sr": "Srpski",
  "lang.hr": "Hrvatski",
  "lang.cs": "Češki",
};

export default hr;
