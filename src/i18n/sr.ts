// ============================================
// src/i18n/sr.ts
// Rečnik Srpski (SR) — v1 komplet
// ============================================

import type { Dict } from "../contexts/LangContext";

export const sr: Dict = {
  // -----------------------------
  // NAVIGACIJA / TABOVI
  // -----------------------------
  "nav.home": "Početna",
  "nav.local": "Lokalno",
  "nav.games": "Igre",
  "nav.training": "Trening",
  "nav.online": "Online",
  "nav.stats": "Statistike",
  "nav.settings": "Podešavanja",
  "nav.profiles": "Profili",
  "nav.sync": "Sync i deljenje",
  "nav.back": "Nazad",
  "nav.close": "Zatvori",

  // -----------------------------
  // GENERIČKO / ZAJEDNIČKO
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Otkaži",
  "common.yes": "Da",
  "common.no": "Ne",
  "common.save": "Sačuvaj",
  "common.edit": "Uredi",
  "common.delete": "Obriši",
  "common.confirm": "Potvrdi",
  "common.next": "Dalje",
  "common.prev": "Nazad",
  "common.start": "Počni",
  "common.continue": "Nastavi",
  "common.resume": "Nastavi",
  "common.pause": "Pauza",
  "common.reset": "Resetuj",
  "common.shuffle": "Nasumično",
  "common.loading": "Učitavanje…",
  "common.error": "Došlo je do greške",
  "common.info": "Info",
  "common.stats": "Statistike",
  "common.history": "Istorija",
  "common.tutorial": "Tutorijal",
  "common.exit": "Izlaz",
  "common.backHome": "Nazad na početnu",
  "common.player": "Igrač",
  "common.players": "Igrači",
  "common.team": "Tim",
  "common.teams": "Timovi",
  "common.points": "Poeni",
  "common.average": "Prosek",
  "common.best": "Najbolje",
  "common.worst": "Najgore",
  "common.total": "Ukupno",
  "common.date": "Datum",
  "common.time": "Vreme",

  // -----------------------------
  // HOME — DASHBOARD
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Kontrolni centar MULTISPORTS SCORING-a",

  "status.online": "Online",
  "status.away": "Odsutan",
  "status.offline": "Offline",

  "home.welcome": "Dobrodošao",
  "home.welcome.noProfile": "Dobrodošao u MULTISPORTS SCORING",
  "home.hero.tagline": "Spreman za nekoliko pikada?",

  // Aktivni profil
  "home.activeProfile.title": "Aktivni profil",
  "home.activeProfile.none": "Nijedan profil nije izabran",
  "home.activeProfile.select": "Izaberi profil",
  "home.activeProfile.manage": "Upravljaj profilima",
  "home.activeProfile.status.online": "Povezan",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gost",
  "home.activeProfile.badge.you": "Ti",
  "home.activeProfile.badge.local": "Lokalno",
  "home.activeProfile.badge.online": "Online",

  // Statistike u kartici profila
  "home.activeProfile.stats.title": "Brze statistike",
  "home.activeProfile.stats.x01Avg": "X01 prosek",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Trening volumen",
  "home.activeProfile.stats.lastGame": "Poslednja partija",
  "home.activeProfile.stats.noGames": "Još nema partija",
  "home.activeProfile.stats.seeAll": "Prikaži sve statistike",

  // Brze akcije
  "home.quickActions.title": "Brze akcije",
  "home.quickActions.playX01": "Pokreni X01",
  "home.quickActions.playCricket": "Pokreni Cricket",
  "home.quickActions.training": "Otvori Training",
  "home.quickActions.stats": "Prikaži statistike",

  // Karusel / kratke statistike
  "home.statsCarousel.title": "Brze statistike",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Arcade banner / ticker
  "home.arcadeBanner.title": "Info i novosti",
  "home.arcadeBanner.tapForMore": "Dodirni za više detalja",
  "home.arcadeBanner.empty": "Trenutno nema informacija za prikaz",
  "home.arcadeBanner.tag.new": "Novo",
  "home.arcadeBanner.tag.tip": "Savet",
  "home.arcadeBanner.tag.update": "Ažuriranje",

  // Velika navigaciona dugmad
  "home.nav.profiles": "Profili",
  "home.nav.profiles.desc": "Lokalni profili, avatari i BOTS",
  "home.nav.local": "Lokalno",
  "home.nav.local.desc": "Igraj na ovoj meti",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Udaljene partije sa prijateljima",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detaljni moduli za trening",
  "home.nav.stats": "Statistike",
  "home.nav.stats.desc": "Dashboard-i, krive i istorija",
  "home.nav.settings": "Podešavanja",
  "home.nav.settings.desc": "Teme, jezik i napredne opcije",

  // -----------------------------
  // TICKER / BANNER
  // -----------------------------
  "home.ticker.records": "Poslednji rekordi",
  "home.ticker.records.text":
    "Više rekorda je nedavno oboreno, nastavi tako!",

  "home.ticker.localLast": "Poslednja lokalna partija",
  "home.ticker.localLast.text":
    "Rezime poslednje odigrane lokalne partije.",

  "home.ticker.onlineLast": "Poslednja online partija",
  "home.ticker.onlineLast.text":
    "Tvoj poslednji online duel čeka revanš.",

  "home.ticker.onlineLeader": "Lider na tabeli",
  "home.ticker.onlineLeader.text":
    "Otkrij ko je trenutno na vrhu online rang liste.",

  "home.ticker.training": "Trening u fokusu",
  "home.ticker.training.text":
    "Ukupan broj X01 trening sesija i Tour de l’Horloge.",

  "home.ticker.month": "Statistike meseca",
  "home.ticker.month.text":
    "Ukupan broj partija i pogodaka za ovaj mesec.",

  "home.ticker.tip": "Savet dana",
  "home.ticker.tip.text":
    "Učvrsti svoju omiljenu završnicu redovnim ponavljanjem.",

  // -----------------------------
  // IGRE (LOKALNE)
  // -----------------------------
  "games.title": "Sve igre",
  "games.subtitle": "Izaberi mod igre",
  "games.section.classic": "Klasične",
  "games.section.training": "Trening",
  "games.section.party": "Party i zabava",
  "games.section.other": "Ostali modovi",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… završi tačno na 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 do 20 + Bull, otvori/zatvori i osvajaj poene.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Postani killer i eliminiši ostale.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Jedan broj po rundi, pogodi S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Krug sata",
  "games.training.custom": "Prilagođeni trening",
  "games.training.evolution": "Statistike napretka",
  "games.info.title": "Info o igri",
  "games.info.rules": "Pravila",
  "games.info.tips": "Saveti",

  // -----------------------------
  // LOKALNI PROFILI
  // -----------------------------
  "profiles.title": "Lokalni profili",
  "profiles.subtitle": "Upravljaj lokalnim igračima",
  "profiles.add": "Dodaj profil",
  "profiles.edit": "Uredi profil",
  "profiles.delete": "Obriši profil",
  "profiles.confirmDelete": "Trajno obrisati ovaj profil?",
  "profiles.name.label": "Ime igrača",
  "profiles.name.placeholder": "Unesi nadimak",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Nasumičan avatar",
  "profiles.stats.title": "Statistike profila",
  "profiles.stats.x01": "X01 statistike",
  "profiles.stats.cricket": "Cricket statistike",
  "profiles.stats.training": "Training statistike",
  "profiles.status.active": "Aktivan",
  "profiles.status.inactive": "Neaktivan",
  "profiles.selectActive": "Postavi kao aktivni profil",
  "profiles.list.empty": "Još nema profila",
  "profiles.list.selectHint": "Dodirni profil da ga izabereš",
  "profiles.hint.avatarTap": "Dodirni medaljon da promeniš avatar",

  // -----------------------------
  // AVATAR CREATOR / MEDALJONI
  // -----------------------------
  "avatar.title": "Kreator avatara",
  "avatar.subtitle": "Prilagodi svoj medaljon",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Blaga realističnost",
  "avatar.style.comic": "Strip stil",
  "avatar.style.flat": "Flat dizajn",
  "avatar.style.exaggerated": "Naglašeno",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Pregled",
  "avatar.generate": "Generiši novi avatar",
  "avatar.keep": "Zadrži ovaj avatar",
  "avatar.cancel": "Otkaži izmene",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "X01 podešavanja",
  "x01.config.subtitle": "Pripremi svoju partiju",
  "x01.config.section.players": "Igrači",
  "x01.config.section.match": "Format meča",
  "x01.config.section.rules": "Osnovna podešavanja",
  "x01.config.players.add": "Dodaj igrača",
  "x01.config.players.remove": "Ukloni",
  "x01.config.players.teams": "Timovi",
  "x01.config.mode.label": "Mod igre",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Timovi",
  "x01.config.raceToSets.label": "Setovi za pobedu",
  "x01.config.raceToLegs.label": "Legovi za pobedu",
  "x01.config.startingScore.label": "Početni skor",
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
  "x01.config.service.alternate": "Naizmenično",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Dodaj bota",
  "x01.config.bots.level.easy": "Lako",
  "x01.config.bots.level.medium": "Srednje",
  "x01.config.bots.level.hard": "Teško",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Pokreni partiju",
  "x01.config.back": "Nazad na igre",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Na potezu",
  "x01.play.scoreRemaining": "Preostalo",
  "x01.play.lastVisit": "Poslednja poseta",
  "x01.play.average3": "Prosek / 3 darts",
  "x01.play.bestVisit": "Najbolja poseta",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Bačeni darts",
  "x01.play.visits": "Posete",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Poništi posetu",
  "x01.play.confirmExit": "Napustiti trenutnu partiju?",
  "x01.play.botThinking": "Bot igra…",
  "x01.play.noScoreYet": "Još nema rezultata",
  "x01.play.matchOver": "Meč je završen",
  "x01.play.legOver": "Leg je završen",
  "x01.play.setOver": "Set je završen",
  "x01.play.nextLeg": "Sledeći leg",
  "x01.play.nextSet": "Sledeći set",
  "x01.play.backToConfig": "Nazad na podešavanja",
  "x01.play.saveInHistory": "Sačuvaj u istoriji",

  // -----------------------------
  // CRICKET (IGRA + PARAMETRI)
  // -----------------------------
  "cricket.config.title": "Cricket podešavanja",
  "cricket.config.players": "Igrači",
  "cricket.config.raceTo.label": "Poeni ili legovi",
  "cricket.config.pointsWin": "Pobeda na poene",
  "cricket.config.legsWin": "Pobeda na legove",
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
  "cricket.stats.averageMpr": "Prosečan MPR",
  "cricket.stats.gamesPlayed": "Odigrane partije",
  "cricket.stats.gamesWon": "Dobijene partije",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Trening",
  "training.menu.subtitle": "Radi na svojim jakim stranama",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Detaljno praćenje svakog dart-a.",
  "training.menu.clock": "Krug sata",
  "training.menu.clock.desc": "Pogodi sve mete redom.",
  "training.menu.evolution": "Kriva napretka",
  "training.menu.evolution.desc":
    "Vizuelizuj svoj napredak tokom vremena.",
  "training.menu.custom": "Prilagođena sesija",
  "training.menu.resumeLast": "Nastavi poslednju sesiju",
  "training.menu.noSession": "Još nema sačuvanih sesija",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analiza svakog dart-a",
  "training.x01.targetScore.label": "Početni skor",
  "training.x01.throws": "Bačeni darts",
  "training.x01.hitsBySegment": "Pogoci po segmentu",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Bustovi",
  "training.x01.avgPerDart": "Prosek po dart-u",
  "training.x01.session.save": "Sačuvaj sesiju",
  "training.x01.session.saved": "Sesija je sačuvana",
  "training.x01.session.delete": "Obriši sesiju",
  "training.x01.session.confirmDelete":
    "Trajno obrisati ovu trening sesiju?",

  // -----------------------------
  // TRAINING CLOCK (KRUG SATA)
  // -----------------------------
  "training.clock.title": "Krug sata",
  "training.clock.subtitle": "Pogodi svaki broj redom",
  "training.clock.objective.label": "Cilj",
  "training.clock.objective.allSingles": "Svi single",
  "training.clock.objective.allDoubles": "Svi double",
  "training.clock.objective.allTriples": "Svi triple",
  "training.clock.objective.custom": "Prilagođena ruta",
  "training.clock.timer.label": "Tajmer",
  "training.clock.timer.off": "Bez tajmera",
  "training.clock.timer.30": "30 sekundi",
  "training.clock.timer.60": "60 sekundi",
  "training.clock.timer.120": "120 sekundi",
  "training.clock.players": "Igrači",
  "training.clock.start": "Pokreni trening",
  "training.clock.currentTarget": "Trenutna meta",
  "training.clock.progress": "Napredak",
  "training.clock.session.save": "Sačuvaj sesiju",
  "training.clock.session.saved":
    "Sesija kruga sata je sačuvana",

  // -----------------------------
  // STATS HUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Centar statistika",
  "stats.shell.tabs.local": "Lokalni profili",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Istorija",
  "stats.shell.info": "Izaberi sekciju statistika.",
  "stats.hub.local.title": "Statistike lokalnih profila",
  "stats.hub.local.selectProfile":
    "Izaberi profil za pregled statistika",
  "stats.hub.training.title": "Training statistike",
  "stats.hub.online.title": "Online statistike",
  "stats.hub.history.title": "Istorija mečeva",
  "stats.hub.kpi.avg3": "Prosek /3 darts",
  "stats.hub.kpi.winRate": "Procenat pobede",
  "stats.hub.kpi.bestLeg": "Najbolji leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Skorašnja forma",
  "stats.hub.radar.skills": "Radar veština",
  "stats.hub.training.clock": "Krug sata",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Trening volumen",
  "stats.hub.empty": "Još nema dostupnih statistika",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Istorija mečeva",
  "history.subtitle": "Tvoje poslednje partije",
  "history.filter.all": "Sve",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Još nema sačuvanih mečeva",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Trening",
  "history.details.title": "Detalji meča",
  "history.details.players": "Igrači",
  "history.details.winner": "Pobednik",
  "history.details.legs": "Legovi",
  "history.details.sets": "Setovi",
  "history.details.avg3": "Prosek /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Obriši meč",
  "history.confirmDelete":
    "Trajno obrisati ovaj meč?",

  // -----------------------------
  // ONLINE MOD
  // -----------------------------
  "online.title": "Online mod",
  "online.subtitle": "Igraj na daljinu sa prijateljima",
  "online.login.title": "Prijava",
  "online.login.nickname": "Nadimak",
  "online.login.email": "E-mail (opciono)",
  "online.login.password": "Lozinka",
  "online.login.submit": "Prijavi se",
  "online.signup.title": "Kreiraj nalog",
  "online.logout": "Odjavi se",
  "online.profile.title": "Online profil",
  "online.profile.country": "Država",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 lobi",
  "online.lobby.create": "Kreiraj lobi",
  "online.lobby.join": "Pridruži se lobiju",
  "online.lobby.empty": "Trenutno nema dostupnih lobija",
  "online.friends.title": "Prijatelji",
  "online.friends.add": "Dodaj prijatelja",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Odsutan",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS / PODEŠAVANJA
  // -----------------------------
  "settings.back": "Nazad",
  "settings.title": "Podešavanja",
  "settings.subtitle":
    "Prilagodi temu i jezik aplikacije",

  "settings.theme": "Tema",
  "settings.theme.group.neons": "Klasični neoni",
  "settings.theme.group.soft": "Blage boje",
  "settings.theme.group.dark": "Dark Premium teme",

  "settings.theme.gold.label": "Zlatni neon",
  "settings.theme.gold.desc": "Premium zlatna tema",

  "settings.theme.pink.label": "Roze neon",
  "settings.theme.pink.desc": "Arcade atmosfera u roze tonu",

  "settings.theme.petrol.label": "Petrol plava",
  "settings.theme.petrol.desc": "Duboka neon plava",

  "settings.theme.green.label": "Zelena neon",
  "settings.theme.green.desc": "Svetao trening stil",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intenzivna ljubičasto-magenta",

  "settings.theme.red.label": "Crvena",
  "settings.theme.red.desc": "Agresivna arcade crvena",

  "settings.theme.orange.label": "Narandžasta",
  "settings.theme.orange.desc": "Topla i energična narandžasta",

  "settings.theme.white.label": "Bela",
  "settings.theme.white.desc": "Moderan svetli background",

  "settings.theme.blueOcean.label": "Okean plava",
  "settings.theme.blueOcean.desc": "Prirodna nebo/okean plava",

  "settings.theme.limeYellow.label": "Lime žuta",
  "settings.theme.limeYellow.desc": "Veoma upadljiva lime boja",

  "settings.theme.sage.label": "Sage zelena",
  "settings.theme.sage.desc": "Prirodni i blagi zeleni tonovi",

  "settings.theme.skyBlue.label": "Pastel plava",
  "settings.theme.skyBlue.desc": "Veoma blaga i svetla plava",

  "settings.theme.darkTitanium.label": "Tamni titan",
  "settings.theme.darkTitanium.desc":
    "Premium mat metal izgled",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc":
    "Moderan izgled vlakana karbona",

  "settings.theme.darkFrost.label": "Tamni frost",
  "settings.theme.darkFrost.desc":
    "Futuristička zaleđena crna",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Sjajna premium crna, dobra čitljivost",

  "settings.lang": "Jezik",

  "settings.reset.title": "Resetuj aplikaciju",
  "settings.reset.subtitle":
    "Briše sve lokalne profile, BOTS, statistike, istoriju partija i podešavanja. Ova akcija je trajna.",
  "settings.reset.button": "Resetuj sve",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync i deljenje",
  "sync.subtitle": "Sačuvaj i podeli svoje podatke",
  "sync.tabs.local": "Lokalno",
  "sync.tabs.peer": "Uređaj–uređaj",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokalni export",
  "sync.local.export.desc":
    "Iskopiraj ovaj JSON da ga sačuvaš negde drugde.",
  "sync.local.export.button": "Generiši export",
  "sync.local.import.title": "Lokalni import",
  "sync.local.import.desc":
    "Nalepi ovde JSON eksportovan sa drugog uređaja.",
  "sync.local.import.button": "Importuj JSON",
  "sync.local.import.success": "Import uspešan",
  "sync.local.import.error":
    "Import neuspešan, nevažeći JSON.",
  "sync.peer.soon": "Sync uređaj–uređaj uskoro",
  "sync.cloud.soon": "Cloud Sync uskoro",

  // -----------------------------
  // LABELI / OZNAKE
  // -----------------------------
  "label.points": "Poeni",
  "label.legs": "Legovi",
  "label.sets": "Setovi",
  "label.avg3": "Prosek /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volumen",
  "label.duration": "Trajanje",
  "label.date": "Datum",
  "label.mode": "Mod",

  // -----------------------------
  // IMENA JEZIKA (SR)
  // -----------------------------
  "lang.fr": "Francuski",
  "lang.en": "Engleski",
  "lang.es": "Španski",
  "lang.de": "Nemački",
  "lang.it": "Italijanski",
  "lang.pt": "Portugalski",
  "lang.nl": "Holandski",
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
  "lang.ro": "Rumunski",
  "lang.sr": "Srpski",
  "lang.hr": "Hrvatski",
  "lang.cs": "Češki",
};

export default sr;
