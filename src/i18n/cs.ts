// ============================================
// src/i18n/cs.ts
// Slovník Čeština (CS) — v1 kompletní
// ============================================

import type { Dict } from "../contexts/LangContext";

export const cs: Dict = {
  // -----------------------------
  // NAVIGACE / ZÁLOŽKY
  // -----------------------------
  "nav.home": "Domů",
  "nav.local": "Místní",
  "nav.games": "Hry",
  "nav.training": "Trénink",
  "nav.online": "Online",
  "nav.stats": "Statistiky",
  "nav.settings": "Nastavení",
  "nav.profiles": "Profily",
  "nav.sync": "Sync & sdílení",
  "nav.back": "Zpět",
  "nav.close": "Zavřít",

  // -----------------------------
  // OBECNÉ / COMMON
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Zrušit",
  "common.yes": "Ano",
  "common.no": "Ne",
  "common.save": "Uložit",
  "common.edit": "Upravit",
  "common.delete": "Smazat",
  "common.confirm": "Potvrdit",
  "common.next": "Další",
  "common.prev": "Předchozí",
  "common.start": "Spustit",
  "common.continue": "Pokračovat",
  "common.resume": "Pokračovat",
  "common.pause": "Pauza",
  "common.reset": "Resetovat",
  "common.shuffle": "Náhodně",
  "common.loading": "Načítání…",
  "common.error": "Došlo k chybě",
  "common.info": "Info",
  "common.stats": "Statistiky",
  "common.history": "Historie",
  "common.tutorial": "Tutoriál",
  "common.exit": "Ukončit",
  "common.backHome": "Zpět na domovskou stránku",
  "common.player": "Hráč",
  "common.players": "Hráči",
  "common.team": "Tým",
  "common.teams": "Týmy",
  "common.points": "Body",
  "common.average": "Průměr",
  "common.best": "Nejlepší",
  "common.worst": "Nejhorší",
  "common.total": "Celkem",
  "common.date": "Datum",
  "common.time": "Čas",

  // -----------------------------
  // HOME — DASHBOARD
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Řídicí centrum Darts Counter",

  "status.online": "Online",
  "status.away": "Nepřítomen",
  "status.offline": "Offline",

  "home.welcome": "Vítejte",
  "home.welcome.noProfile": "Vítejte v Darts Counter",
  "home.hero.tagline": "Připraveni hodit pár šipek?",

  // Aktivní profil
  "home.activeProfile.title": "Aktivní profil",
  "home.activeProfile.none": "Není vybrán žádný profil",
  "home.activeProfile.select": "Vybrat profil",
  "home.activeProfile.manage": "Správa profilů",
  "home.activeProfile.status.online": "Připojený",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Host",
  "home.activeProfile.badge.you": "Ty",
  "home.activeProfile.badge.local": "Místní",
  "home.activeProfile.badge.online": "Online",

  // Staty v kartě
  "home.activeProfile.stats.title": "Rychlé statistiky",
  "home.activeProfile.stats.x01Avg": "X01 průměr",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Objem tréninku",
  "home.activeProfile.stats.lastGame": "Poslední hra",
  "home.activeProfile.stats.noGames": "Zatím žádné hry",
  "home.activeProfile.stats.seeAll": "Zobrazit všechny statistiky",

  // Rychlé akce
  "home.quickActions.title": "Rychlé akce",
  "home.quickActions.playX01": "Spustit X01",
  "home.quickActions.playCricket": "Spustit Cricket",
  "home.quickActions.training": "Otevřít Training",
  "home.quickActions.stats": "Zobrazit statistiky",

  // Karusel statistik
  "home.statsCarousel.title": "Rychlé statistiky",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // ArcadeTicker / Info banner
  "home.arcadeBanner.title": "Info & novinky",
  "home.arcadeBanner.tapForMore": "Klepněte pro více detailů",
  "home.arcadeBanner.empty": "Momentálně nejsou žádné informace",
  "home.arcadeBanner.tag.new": "Nové",
  "home.arcadeBanner.tag.tip": "Tip",
  "home.arcadeBanner.tag.update": "Update",

  // Velká navigační tlačítka
  "home.nav.profiles": "Profily",
  "home.nav.profiles.desc": "Místní profily, avatary a BOTS",
  "home.nav.local": "Místní hra",
  "home.nav.local.desc": "Hrajte na tomto terči",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Hry na dálku s přáteli",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detailní tréninkové moduly",
  "home.nav.stats": "Statistiky",
  "home.nav.stats.desc": "Dashboardy, grafy a historie",
  "home.nav.settings": "Nastavení",
  "home.nav.settings.desc": "Témata, jazyk a další volby",

  // -----------------------------
  // TICKER
  // -----------------------------
  "home.ticker.records": "Poslední rekordy",
  "home.ticker.records.text":
    "Několik rekordů bylo nedávno překonáno – jen tak dál!",

  "home.ticker.localLast": "Poslední místní hra",
  "home.ticker.localLast.text":
    "Souhrn poslední hry v offline režimu.",

  "home.ticker.onlineLast": "Poslední online hra",
  "home.ticker.onlineLast.text":
    "Tvůj poslední online zápas je připraven na odvetu.",

  "home.ticker.onlineLeader": "Lídr žebříčku",
  "home.ticker.onlineLeader.text":
    "Podívej se, kdo vede online žebříček.",

  "home.ticker.training": "Tréninkový přehled",
  "home.ticker.training.text":
    "Součet X01 tréninku a Krugu hodin.",

  "home.ticker.month": "Měsíční statistiky",
  "home.ticker.month.text":
    "Celkový počet her a zásahů tento měsíc.",

  "home.ticker.tip": "Tip dne",
  "home.ticker.tip.text":
    "Procvičuj svou oblíbenou koncovku pravidelným opakováním.",

  // -----------------------------
  // HRY
  // -----------------------------
  "games.title": "Všechny hry",
  "games.subtitle": "Vyberte herní mód",
  "games.section.classic": "Klasické",
  "games.section.training": "Trénink",
  "games.section.party": "Zábava",
  "games.section.other": "Ostatní",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… zakončete přesně na 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc":
    "15–20 + Bull, otevírejte/zavírejte a sbírejte body.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Staňte se killerem a vyřaďte ostatní.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Jedno číslo na kolo, trefte S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Krug hodin",
  "games.training.custom": "Vlastní trénink",
  "games.training.evolution": "Statistiky vývoje",
  "games.info.title": "Info o hře",
  "games.info.rules": "Pravidla",
  "games.info.tips": "Tipy",

  // -----------------------------
  // PROFILY
  // -----------------------------
  "profiles.title": "Místní profily",
  "profiles.subtitle": "Spravujte své místní hráče",
  "profiles.add": "Přidat profil",
  "profiles.edit": "Upravit profil",
  "profiles.delete": "Smazat profil",
  "profiles.confirmDelete":
    "Opravdu trvale smazat tento profil?",
  "profiles.name.label": "Jméno hráče",
  "profiles.name.placeholder": "Zadejte přezdívku",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Náhodný avatar",
  "profiles.stats.title": "Statistiky profilu",
  "profiles.stats.x01": "X01 statistiky",
  "profiles.stats.cricket": "Cricket statistiky",
  "profiles.stats.training": "Training statistiky",
  "profiles.status.active": "Aktivní",
  "profiles.status.inactive": "Neaktivní",
  "profiles.selectActive": "Nastavit jako aktivní profil",
  "profiles.list.empty": "Zatím nejsou žádné profily",
  "profiles.list.selectHint":
    "Klepněte na profil pro výběr",
  "profiles.hint.avatarTap":
    "Klepnutím na medailon změníte avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Tvůrce avataru",
  "avatar.subtitle": "Upravte si svůj medailon",
  "avatar.style.label": "Styl",
  "avatar.style.realistic": "Lehký realismus",
  "avatar.style.comic": "Komiks",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Zvýrazněný",
  "avatar.theme.label": "Téma",
  "avatar.preview.label": "Náhled",
  "avatar.generate": "Vygenerovat nový avatar",
  "avatar.keep": "Ponechat avatar",
  "avatar.cancel": "Zrušit",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "Nastavení X01",
  "x01.config.subtitle": "Připravte svou hru",
  "x01.config.section.players": "Hráči",
  "x01.config.section.match": "Formát zápasu",
  "x01.config.section.rules": "Základní nastavení",
  "x01.config.players.add": "Přidat hráče",
  "x01.config.players.remove": "Odebrat",
  "x01.config.players.teams": "Týmy",
  "x01.config.mode.label": "Herní mód",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Týmy",
  "x01.config.raceToSets.label": "Vítězné sety",
  "x01.config.raceToLegs.label": "Vítězné legy",
  "x01.config.startingScore.label": "Startovní skóre",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Vlastní",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Servis",
  "x01.config.service.random": "Náhodně",
  "x01.config.service.alternate": "Střídavě",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Přidat bota",
  "x01.config.bots.level.easy": "Lehký",
  "x01.config.bots.level.medium": "Střední",
  "x01.config.bots.level.hard": "Těžký",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Spustit zápas",
  "x01.config.back": "Zpět na hry",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Na tahu",
  "x01.play.scoreRemaining": "Zbývá",
  "x01.play.lastVisit": "Poslední návštěva",
  "x01.play.average3": "Průměr /3 darts",
  "x01.play.bestVisit": "Nejlepší návštěva",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Hozené šipky",
  "x01.play.visits": "Návštěvy",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Zpět návštěvu",
  "x01.play.confirmExit": "Odejít z rozehrané hry?",
  "x01.play.botThinking": "Bot hraje…",
  "x01.play.noScoreYet": "Zatím žádné skóre",
  "x01.play.matchOver": "Zápas skončil",
  "x01.play.legOver": "Leg skončil",
  "x01.play.setOver": "Set skončil",
  "x01.play.nextLeg": "Další leg",
  "x01.play.nextSet": "Další set",
  "x01.play.backToConfig": "Zpět na nastavení",
  "x01.play.saveInHistory": "Uložit do historie",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Nastavení Cricket",
  "cricket.config.players": "Hráči",
  "cricket.config.raceTo.label": "Body nebo legy",
  "cricket.config.pointsWin": "Výhra na body",
  "cricket.config.legsWin": "Výhra na legy",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Cíle",
  "cricket.play.hits": "Zásahy",
  "cricket.play.score": "Skóre",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Na tahu",
  "cricket.play.open": "Otevřeno",
  "cricket.play.closed": "Zavřeno",
  "cricket.stats.title": "Cricket statistiky",
  "cricket.stats.profile": "Cricket profil",
  "cricket.stats.bestMpr": "Nejlepší MPR",
  "cricket.stats.averageMpr": "Průměrný MPR",
  "cricket.stats.gamesPlayed": "Odehrané hry",
  "cricket.stats.gamesWon": "Vyhrané hry",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Trénink",
  "training.menu.subtitle": "Zlepšete své silné stránky",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Detailní sledování každé šipky.",
  "training.menu.clock": "Krug hodin",
  "training.menu.clock.desc":
    "Projděte všechny cíle postupně.",
  "training.menu.evolution": "Křivka vývoje",
  "training.menu.evolution.desc":
    "Sledujte svůj progres v čase.",
  "training.menu.custom": "Vlastní trénink",
  "training.menu.resumeLast": "Pokračovat v poslední relaci",
  "training.menu.noSession":
    "Zatím nejsou uložené žádné relace",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analýza každé šipky",
  "training.x01.targetScore.label": "Startovní skóre",
  "training.x01.throws": "Hozené šipky",
  "training.x01.hitsBySegment": "Zásahy podle segmentu",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busty",
  "training.x01.avgPerDart": "Průměr na šipku",
  "training.x01.session.save": "Uložit relaci",
  "training.x01.session.saved": "Relace uložena",
  "training.x01.session.delete": "Smazat relaci",
  "training.x01.session.confirmDelete":
    "Trvale smazat tuto tréninkovou relaci?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Krug hodin",
  "training.clock.subtitle":
    "Zasaďte každé číslo ve správném pořadí",
  "training.clock.objective.label": "Cíl",
  "training.clock.objective.allSingles": "Všechny single",
  "training.clock.objective.allDoubles": "Všechny double",
  "training.clock.objective.allTriples": "Všechny triple",
  "training.clock.objective.custom": "Vlastní pořadí",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Bez timeru",
  "training.clock.timer.30": "30 sekund",
  "training.clock.timer.60": "60 sekund",
  "training.clock.timer.120": "120 sekund",
  "training.clock.players": "Hráči",
  "training.clock.start": "Spustit trénink",
  "training.clock.currentTarget": "Aktuální cíl",
  "training.clock.progress": "Průběh",
  "training.clock.session.save": "Uložit relaci",
  "training.clock.session.saved":
    "Relace Krug hodin uložena",

  // -----------------------------
  // STATS HUB
  // -----------------------------
  "stats.shell.title": "Centrum statistik",
  "stats.shell.tabs.local": "Místní profily",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historie",
  "stats.shell.info": "Vyberte sekci statistik.",
  "stats.hub.local.title": "Statistiky místních profilů",
  "stats.hub.local.selectProfile":
    "Vyberte profil pro zobrazení statistik",
  "stats.hub.training.title": "Training statistiky",
  "stats.hub.online.title": "Online statistiky",
  "stats.hub.history.title": "Historie zápasů",
  "stats.hub.kpi.avg3": "Průměr /3 darts",
  "stats.hub.kpi.winRate": "Win rate",
  "stats.hub.kpi.bestLeg": "Nejlepší leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Aktuální forma",
  "stats.hub.radar.skills": "Radar dovedností",
  "stats.hub.training.clock": "Krug hodin",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Objem tréninku",
  "stats.hub.empty": "Zatím nejsou dostupné statistiky",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Historie zápasů",
  "history.subtitle": "Vaše poslední zápasy",
  "history.filter.all": "Vše",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Zatím nejsou uložené žádné zápasy",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Trénink",
  "history.details.title": "Detaily zápasu",
  "history.details.players": "Hráči",
  "history.details.winner": "Vítěz",
  "history.details.legs": "Legy",
  "history.details.sets": "Sety",
  "history.details.avg3": "Průměr /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Smazat zápas",
  "history.confirmDelete":
    "Trvale smazat tento zápas?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online mód",
  "online.subtitle": "Hrajte na dálku s přáteli",
  "online.login.title": "Přihlášení",
  "online.login.nickname": "Přezdívka",
  "online.login.email": "E-mail (volitelné)",
  "online.login.password": "Heslo",
  "online.login.submit": "Přihlásit se",
  "online.signup.title": "Vytvořit účet",
  "online.logout": "Odhlásit se",
  "online.profile.title": "Online profil",
  "online.profile.country": "Země",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 lobby",
  "online.lobby.create": "Vytvořit lobby",
  "online.lobby.join": "Připojit se do lobby",
  "online.lobby.empty": "Žádné dostupné lobby",
  "online.friends.title": "Přátelé",
  "online.friends.add": "Přidat přítele",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Nepřítomen",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS / NASTAVENÍ
  // -----------------------------
  "settings.back": "Zpět",
  "settings.title": "Nastavení",
  "settings.subtitle":
    "Přizpůsobte téma a jazyk aplikace",

  "settings.theme": "Téma",
  "settings.theme.group.neons": "Klasické neony",
  "settings.theme.group.soft": "Jemné barvy",
  "settings.theme.group.dark": "Dark premium témata",

  "settings.theme.gold.label": "Zlatý neon",
  "settings.theme.gold.desc": "Prémiové zlaté téma",

  "settings.theme.pink.label": "Růžový neon",
  "settings.theme.pink.desc": "Arkádová růžová atmosféra",

  "settings.theme.petrol.label": "Petrol modrá",
  "settings.theme.petrol.desc": "Hluboká neonově modrá",

  "settings.theme.green.label": "Zelený neon",
  "settings.theme.green.desc": "Světlý tréninkový styl",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc":
    "Intenzivní fialovo-magenta tón",

  "settings.theme.red.label": "Červená",
  "settings.theme.red.desc": "Agresivní arcade červená",

  "settings.theme.orange.label": "Oranžová",
  "settings.theme.orange.desc":
    "Teplá a energická oranžová",

  "settings.theme.white.label": "Bílá",
  "settings.theme.white.desc": "Moderní světlé téma",

  "settings.theme.blueOcean.label": "Oceánská modrá",
  "settings.theme.blueOcean.desc":
    "Přirozená modrá oceánu a nebe",

  "settings.theme.limeYellow.label": "Limetková žlutá",
  "settings.theme.limeYellow.desc":
    "Super jasná limetková barva",

  "settings.theme.sage.label": "Šalvějová zelená",
  "settings.theme.sage.desc": "Jemné přírodní tóny",

  "settings.theme.skyBlue.label": "Pastelová modrá",
  "settings.theme.skyBlue.desc":
    "Velmi jemná a světlá modrá",

  "settings.theme.darkTitanium.label": "Tmavý titan",
  "settings.theme.darkTitanium.desc":
    "Prémiový matný kovový vzhled",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc":
    "Moderní karbonový efekt",

  "settings.theme.darkFrost.label": "Tmavý frost",
  "settings.theme.darkFrost.desc":
    "Ledově černý futuristický vzhled",

  "settings.theme.darkObsidian.label": "Obsidián",
  "settings.theme.darkObsidian.desc":
    "Lesklá prémiová černá",

  "settings.lang": "Jazyk",

  "settings.reset.title": "Resetovat aplikaci",
  "settings.reset.subtitle":
    "Smaže všechny místní profily, BOTS, statistiky, historii her a nastavení. Nevratná akce.",
  "settings.reset.button": "Resetovat vše",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & sdílení",
  "sync.subtitle": "Uložte a sdílejte svá data",
  "sync.tabs.local": "Místně",
  "sync.tabs.peer": "Zařízení–zařízení",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Místní export",
  "sync.local.export.desc":
    "Zkopírujte tento JSON pro zálohu.",
  "sync.local.export.button": "Vygenerovat export",
  "sync.local.import.title": "Místní import",
  "sync.local.import.desc":
    "Vložte JSON exportovaný z jiného zařízení.",
  "sync.local.import.button": "Import JSON",
  "sync.local.import.success": "Import úspěšný",
  "sync.local.import.error": "Chybný JSON",
  "sync.peer.soon": "Sync zařízení–zařízení již brzy",
  "sync.cloud.soon": "Cloud sync již brzy",

  // -----------------------------
  // ŠTÍTKY / LABELS
  // -----------------------------
  "label.points": "Body",
  "label.legs": "Legy",
  "label.sets": "Sety",
  "label.avg3": "Průměr /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Objem",
  "label.duration": "Doba trvání",
  "label.date": "Datum",
  "label.mode": "Mód",

  // -----------------------------
  // NÁZVY JAZYKŮ (CS)
  // -----------------------------
  "lang.fr": "Francouzština",
  "lang.en": "Angličtina",
  "lang.es": "Španělština",
  "lang.de": "Němčina",
  "lang.it": "Italština",
  "lang.pt": "Portugalština",
  "lang.nl": "Nizozemština",
  "lang.ru": "Ruština",
  "lang.zh": "Čínština",
  "lang.ja": "Japonština",
  "lang.ar": "Arabština",
  "lang.hi": "Hindština",
  "lang.tr": "Turečtina",
  "lang.da": "Dánština",
  "lang.no": "Norština",
  "lang.sv": "Švédština",
  "lang.is": "Islandština",
  "lang.pl": "Polština",
  "lang.ro": "Rumunština",
  "lang.sr": "Srbština",
  "lang.hr": "Chorvatština",
  "lang.cs": "Čeština",
};

export default cs;
