// ============================================
// src/i18n/nl.ts
// Nederlands (NL) — Dictionnaire complet v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const nl: Dict = {
  // -----------------------------
  // NAVIGATIE / TABS
  // -----------------------------
  "nav.home": "Start",
  "nav.local": "Lokaal",
  "nav.games": "Spellen",
  "nav.training": "Training",
  "nav.online": "Online",
  "nav.stats": "Statistieken",
  "nav.settings": "Instellingen",
  "nav.profiles": "Profielen",
  "nav.sync": "Sync & delen",
  "nav.back": "Terug",
  "nav.close": "Sluiten",

  // -----------------------------
  // ALGEMEEN / COMMON
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Annuleren",
  "common.yes": "Ja",
  "common.no": "Nee",
  "common.save": "Opslaan",
  "common.edit": "Bewerken",
  "common.delete": "Verwijderen",
  "common.confirm": "Bevestigen",
  "common.next": "Volgende",
  "common.prev": "Vorige",
  "common.start": "Starten",
  "common.continue": "Doorgaan",
  "common.resume": "Hervatten",
  "common.pause": "Pauze",
  "common.reset": "Resetten",
  "common.shuffle": "Willekeurig",
  "common.loading": "Laden…",
  "common.error": "Er is een fout opgetreden",
  "common.info": "Info",
  "common.stats": "Statistieken",
  "common.history": "Historiek",
  "common.tutorial": "Tutorial",
  "common.exit": "Afsluiten",
  "common.backHome": "Terug naar start",
  "common.player": "Speler",
  "common.players": "Spelers",
  "common.team": "Team",
  "common.teams": "Teams",
  "common.points": "Punten",
  "common.average": "Gemiddelde",
  "common.best": "Beste",
  "common.worst": "Slechtste",
  "common.total": "Totaal",
  "common.date": "Datum",
  "common.time": "Tijd",

  // -----------------------------
  // HOME / DASHBOARD
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "MULTISPORTS SCORING controlecentrum",

  "status.online": "Online",
  "status.away": "Afwezig",
  "status.offline": "Offline",

  "home.welcome": "Welkom",
  "home.welcome.noProfile": "Welkom bij MULTISPORTS SCORING",
  "home.hero.tagline": "Klaar om wat darts te gooien?",

  // Actief profiel
  "home.activeProfile.title": "Actief profiel",
  "home.activeProfile.none": "Geen profiel geselecteerd",
  "home.activeProfile.select": "Profiel kiezen",
  "home.activeProfile.manage": "Beheer profielen",
  "home.activeProfile.status.online": "Verbonden",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gast",
  "home.activeProfile.badge.you": "Jij",
  "home.activeProfile.badge.local": "Lokaal",
  "home.activeProfile.badge.online": "Online",

  // Stats snel
  "home.activeProfile.stats.title": "Snelle stats",
  "home.activeProfile.stats.x01Avg": "X01 Gem.",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Trainingsvolume",
  "home.activeProfile.stats.lastGame": "Laatste wedstrijd",
  "home.activeProfile.stats.noGames": "Nog geen wedstrijden",
  "home.activeProfile.stats.seeAll": "Alle statistieken",

  // Snelle acties
  "home.quickActions.title": "Snelle acties",
  "home.quickActions.playX01": "Start X01",
  "home.quickActions.playCricket": "Start Cricket",
  "home.quickActions.training": "Training openen",
  "home.quickActions.stats": "Statistieken tonen",

  // Carrousel stats
  "home.statsCarousel.title": "Snelle stats",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // ArcadeTicker
  "home.arcadeBanner.title": "Info & nieuwtjes",
  "home.arcadeBanner.tapForMore": "Tik voor meer details",
  "home.arcadeBanner.empty": "Geen info beschikbaar",
  "home.arcadeBanner.tag.new": "Nieuw",
  "home.arcadeBanner.tag.tip": "Tip",
  "home.arcadeBanner.tag.update": "Update",

  // Navigatie-knoppen groot
  "home.nav.profiles": "Profielen",
  "home.nav.profiles.desc": "Lokale profielen, avatars & bots",
  "home.nav.local": "Lokaal",
  "home.nav.local.desc": "Speel fysiek op dit bord",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Wedstrijden op afstand",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Gedetailleerde trainingsmodules",
  "home.nav.stats": "Statistieken",
  "home.nav.stats.desc": "Dashboards, grafieken, historiek",
  "home.nav.settings": "Instellingen",
  "home.nav.settings.desc": "Thema’s, taal, volledige reset",

  // Ticker texts
  "home.ticker.records": "Laatste records",
  "home.ticker.records.text": "Verschillende records gebroken, goed bezig!",

  "home.ticker.localLast": "Laatste lokale wedstrijd",
  "home.ticker.localLast.text": "Samenvatting van je laatste lokale wedstrijd.",

  "home.ticker.onlineLast": "Laatste online wedstrijd",
  "home.ticker.onlineLast.text":
    "Je laatste online duel is klaar voor de rematch.",

  "home.ticker.onlineLeader": "Klassementsleider",
  "home.ticker.onlineLeader.text":
    "Ontdek wie bovenaan het online klassement staat.",

  "home.ticker.training": "Training van het moment",
  "home.ticker.training.text":
    "Totaal aantal X01 Training en Kloktraining sessies.",

  "home.ticker.month": "Stats van de maand",
  "home.ticker.month.text": "Totaal aantal wedstrijden en hits deze maand.",

  "home.ticker.tip": "Tip van de dag",
  "home.ticker.tip.text":
    "Versterk je favoriete checkout door hem regelmatig te trainen.",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "Alle spellen",
  "games.subtitle": "Kies een spelmodus",
  "games.section.classic": "Klassiek",
  "games.section.training": "Training",
  "games.section.party": "Fun & party",
  "games.section.other": "Andere modi",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… exact eindigen op 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 t/m 20 + Bull. Openen/sluiten & scoren.",

  "games.killer.title": "Killer",
  "games.killer.desc": "Word de killer en elimineer anderen.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Eén nummer per beurt — raak S / D / T.",

  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Kloktraining",
  "games.training.custom": "Aangepaste training",
  "games.training.evolution": "Evolutiestatistieken",

  "games.info.title": "Spelinfo",
  "games.info.rules": "Regels",
  "games.info.tips": "Tips",

  // -----------------------------
  // PROFIELEN
  // -----------------------------
  "profiles.title": "Lokale profielen",
  "profiles.subtitle": "Beheer je lokale spelers",
  "profiles.add": "Profiel toevoegen",
  "profiles.edit": "Profiel bewerken",
  "profiles.delete": "Profiel verwijderen",
  "profiles.confirmDelete": "Profiel definitief verwijderen?",
  "profiles.name.label": "Spelernaam",
  "profiles.name.placeholder": "Typ een bijnaam",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Willekeurige avatar",
  "profiles.stats.title": "Profielstatistieken",
  "profiles.stats.x01": "X01 stats",
  "profiles.stats.cricket": "Cricket stats",
  "profiles.stats.training": "Training stats",
  "profiles.status.active": "Actief",
  "profiles.status.inactive": "Inactief",
  "profiles.selectActive": "Instellen als actief profiel",
  "profiles.list.empty": "Nog geen profielen",
  "profiles.list.selectHint": "Tik op een profiel om te selecteren",
  "profiles.hint.avatarTap": "Tik op het medaillon om de avatar te wijzigen",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar Maker",
  "avatar.subtitle": "Personaliseer je medaillon",
  "avatar.style.label": "Stijl",
  "avatar.style.realistic": "Licht realistisch",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Overdreven",
  "avatar.theme.label": "Thema",
  "avatar.preview.label": "Voorbeeld",
  "avatar.generate": "Nieuwe avatar genereren",
  "avatar.keep": "Avatar behouden",
  "avatar.cancel": "Annuleren",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "X01 Instellingen",
  "x01.config.subtitle": "Bereid je spel voor",
  "x01.config.section.players": "Spelers",
  "x01.config.section.match": "Wedstrijdformaat",
  "x01.config.section.rules": "Basisinstellingen",
  "x01.config.players.add": "Speler toevoegen",
  "x01.config.players.remove": "Verwijderen",
  "x01.config.players.teams": "Teams",
  "x01.config.mode.label": "Spelmodus",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Teams",
  "x01.config.raceToSets.label": "Benodigde sets",
  "x01.config.raceToLegs.label": "Benodigde legs",
  "x01.config.startingScore.label": "Startscore",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Aangepast",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Service",
  "x01.config.service.random": "Willekeurig",
  "x01.config.service.alternate": "Afwisselend",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Bot toevoegen",
  "x01.config.bots.level.easy": "Makkelijk",
  "x01.config.bots.level.medium": "Gemiddeld",
  "x01.config.bots.level.hard": "Moeilijk",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Start wedstrijd",
  "x01.config.back": "Terug naar spellen",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Aan de beurt",
  "x01.play.scoreRemaining": "Resterend",
  "x01.play.lastVisit": "Laatste bezoek",
  "x01.play.average3": "Gem. / 3 darts",
  "x01.play.bestVisit": "Beste bezoek",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Darts gegooid",
  "x01.play.visits": "Bezoeken",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Bezoek ongedaan maken",
  "x01.play.confirmExit": "Wedstrijd verlaten?",
  "x01.play.botThinking": "Bot is aan het spelen…",
  "x01.play.noScoreYet": "Nog geen score",
  "x01.play.matchOver": "Wedstrijd afgelopen",
  "x01.play.legOver": "Leg afgelopen",
  "x01.play.setOver": "Set afgelopen",
  "x01.play.nextLeg": "Volgende leg",
  "x01.play.nextSet": "Volgende set",
  "x01.play.backToConfig": "Terug naar instellingen",
  "x01.play.saveInHistory": "Opslaan in historiek",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket Instellingen",
  "cricket.config.players": "Spelers",
  "cricket.config.raceTo.label": "Punten of legs",
  "cricket.config.pointsWin": "Winst op punten",
  "cricket.config.legsWin": "Winst op legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Targets",
  "cricket.play.hits": "Hits",
  "cricket.play.score": "Score",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Aan de beurt",
  "cricket.play.open": "Open",
  "cricket.play.closed": "Gesloten",
  "cricket.stats.title": "Cricket Stats",
  "cricket.stats.profile": "Cricket Profiel",
  "cricket.stats.bestMpr": "Beste MPR",
  "cricket.stats.averageMpr": "Gem. MPR",
  "cricket.stats.gamesPlayed": "Gespeelde wedstrijden",
  "cricket.stats.gamesWon": "Gewonnen wedstrijden",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Training",
  "training.menu.subtitle": "Werk aan je sterke punten",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Gedetailleerde analyse per dart.",
  "training.menu.clock": "Kloktraining",
  "training.menu.clock.desc": "Raak alle nummers in volgorde.",
  "training.menu.evolution": "Evolutiecurve",
  "training.menu.evolution.desc": "Bekijk je progressie door de tijd.",
  "training.menu.custom": "Aangepaste sessie",
  "training.menu.resumeLast": "Laatste sessie hervatten",
  "training.menu.noSession": "Nog geen sessies opgeslagen",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analyse van elke dart",
  "training.x01.targetScore.label": "Startscore",
  "training.x01.throws": "Darts gegooid",
  "training.x01.hitsBySegment": "Hits per segment",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Triples",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Gem. per dart",
  "training.x01.session.save": "Sessie opslaan",
  "training.x01.session.saved": "Sessie opgeslagen",
  "training.x01.session.delete": "Sessie verwijderen",
  "training.x01.session.confirmDelete":
    "Sessie definitief verwijderen?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Kloktraining",
  "training.clock.subtitle":
    "Raak elk nummer in volgorde",
  "training.clock.objective.label": "Doel",
  "training.clock.objective.allSingles": "Alle singles",
  "training.clock.objective.allDoubles": "Alle doubles",
  "training.clock.objective.allTriples": "Alle triples",
  "training.clock.objective.custom": "Aangepast parcours",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Geen timer",
  "training.clock.timer.30": "30 seconden",
  "training.clock.timer.60": "60 seconden",
  "training.clock.timer.120": "120 seconden",
  "training.clock.players": "Spelers",
  "training.clock.start": "Training starten",
  "training.clock.currentTarget": "Huidig doel",
  "training.clock.progress": "Voortgang",
  "training.clock.session.save": "Sessie opslaan",
  "training.clock.session.saved":
    "Kloksessie opgeslagen",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Statistiekencentrum",
  "stats.shell.tabs.local": "Lokale profielen",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historiek",
  "stats.shell.info": "Kies een statistieksectie.",
  "stats.hub.local.title": "Stats van lokale profielen",
  "stats.hub.local.selectProfile":
    "Selecteer een profiel om stats te bekijken",
  "stats.hub.training.title": "Training Stats",
  "stats.hub.online.title": "Online Stats",
  "stats.hub.history.title": "Wedstrijdhistoriek",
  "stats.hub.kpi.avg3": "Gem. /3 darts",
  "stats.hub.kpi.winRate": "Winpercentage",
  "stats.hub.kpi.bestLeg": "Beste leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Recente vorm",
  "stats.hub.radar.skills": "Skill-radar",
  "stats.hub.training.clock": "Kloktraining",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Trainingsvolume",
  "stats.hub.empty": "Nog geen statistieken beschikbaar",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Wedstrijdhistoriek",
  "history.subtitle": "Je laatste wedstrijden",
  "history.filter.all": "Alle",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Nog geen wedstrijden opgeslagen",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Training",
  "history.details.title": "Wedstrijddetails",
  "history.details.players": "Spelers",
  "history.details.winner": "Winnaar",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Gem. /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Wedstrijd verwijderen",
  "history.confirmDelete": "Wedstrijd definitief verwijderen?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online modus",
  "online.subtitle": "Speel op afstand met vrienden",
  "online.login.title": "Inloggen",
  "online.login.nickname": "Bijnaam",
  "online.login.email": "E-mail (optioneel)",
  "online.login.password": "Wachtwoord",
  "online.login.submit": "Inloggen",
  "online.signup.title": "Account aanmaken",
  "online.logout": "Uitloggen",
  "online.profile.title": "Online profiel",
  "online.profile.country": "Land",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 Lobbies",
  "online.lobby.create": "Lobby maken",
  "online.lobby.join": "Lobby joinen",
  "online.lobby.empty": "Geen lobbies beschikbaar",
  "online.friends.title": "Vrienden",
  "online.friends.add": "Vriend toevoegen",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Afwezig",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // INSTELLINGEN
  // -----------------------------
  "settings.title": "Instellingen",
  "settings.theme.title": "Neon thema’s",
  "settings.theme.subtitle": "Kies je sfeer",
  "settings.theme.current": "Huidig thema",
  "settings.theme.applied": "Thema toegepast",
  "settings.lang.title": "Taal",
  "settings.lang.subtitle": "Taal van de app",
  "settings.lang.help": "De interface is vertaald.",
  "settings.section.language": "Taal",
  "settings.section.theme": "Thema’s",
  "settings.section.misc": "Overige instellingen",
  "settings.misc.sounds": "Geluiden",
  "settings.misc.vibrations": "Vibraties",
  "settings.misc.animations": "Visuele animaties",
  "settings.misc.resetApp": "App resetten",
  "settings.misc.resetConfirm":
    "Alle lokale gegevens resetten (profielen, historiek, training)?",

  // Extra (Settings.tsx)
  "settings.back": "Terug",
  "settings.subtitle":
    "Personaliseer thema en taal van de app",

  "settings.theme": "Thema",
  "settings.theme.group.neons": "Klassieke neons",
  "settings.theme.group.soft": "Zachte kleuren",
  "settings.theme.group.dark": "Dark Premium thema’s",

  "settings.theme.gold.label": "Goud neon",
  "settings.theme.gold.desc": "Premium gouden thema",

  "settings.theme.pink.label": "Neon roze",
  "settings.theme.pink.desc": "Arcade sfeer in roze",

  "settings.theme.petrol.label": "Petrol blauw",
  "settings.theme.petrol.desc": "Diep neon blauw",

  "settings.theme.green.label": "Neon groen",
  "settings.theme.green.desc": "Heldere trainingsstijl",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intens paars/magenta",

  "settings.theme.red.label": "Rood",
  "settings.theme.red.desc": "Fel rood arcade",

  "settings.theme.orange.label": "Oranje",
  "settings.theme.orange.desc": "Warme energieke oranje",

  "settings.theme.white.label": "Wit",
  "settings.theme.white.desc": "Modern licht thema",

  "settings.theme.blueOcean.label": "Oceaanblauw",
  "settings.theme.blueOcean.desc": "Natuurlijk ocean/hemel blauw",

  "settings.theme.limeYellow.label": "Limoengeel",
  "settings.theme.limeYellow.desc": "Super felle limekleur",

  "settings.theme.sage.label": "Saliegroen",
  "settings.theme.sage.desc": "Zachte natuurlijke groentonen",

  "settings.theme.skyBlue.label": "Pastelblauw",
  "settings.theme.skyBlue.desc": "Heel zacht en helder blauw",

  "settings.theme.darkTitanium.label": "Donker titanium",
  "settings.theme.darkTitanium.desc": "Premium matte metaallook",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc": "Moderne carbon fiber look",

  "settings.theme.darkFrost.label": "Donker ijs",
  "settings.theme.darkFrost.desc": "Futuristisch ijzig zwart",

  "settings.theme.darkObsidian.label": "Obsidiaan",
  "settings.theme.darkObsidian.desc":
    "Glanzend premium zwart, erg leesbaar",

  "settings.reset.title": "App resetten",
  "settings.reset.subtitle":
    "Wis alle profielen, bots, stats, historiek en instellingen.",
  "settings.reset.button": "Alles resetten",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Sync & delen",
  "sync.subtitle": "Synchroniseer en deel je gegevens",
  "sync.tabs.local": "Lokaal",
  "sync.tabs.peer": "Device-to-device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokaal exporteren",
  "sync.local.export.desc":
    "Kopieer deze JSON om elders op te slaan.",
  "sync.local.export.button": "Exporteer JSON",
  "sync.local.import.title": "Lokaal importeren",
  "sync.local.import.desc":
    "Plak hier een geëxporteerde JSON.",
  "sync.local.import.button": "Importeren",
  "sync.local.import.success": "Import geslaagd",
  "sync.local.import.error": "Ongeldige JSON.",
  "sync.peer.soon": "Device-to-device sync komt eraan",
  "sync.cloud.soon": "Cloud sync binnenkort beschikbaar",

  // -----------------------------
  // LABELS
  // -----------------------------
  "label.points": "Punten",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Gem. /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volume",
  "label.duration": "Duur",
  "label.date": "Datum",
  "label.mode": "Modus",

  // -----------------------------
  // TAALNAMEN
  // -----------------------------
  "lang.fr": "Frans",
  "lang.en": "Engels",
  "lang.es": "Spaans",
  "lang.de": "Duits",
  "lang.it": "Italiaans",
  "lang.pt": "Portugees",
  "lang.nl": "Nederlands",
  "lang.ru": "Russisch",
  "lang.zh": "Chinees",
  "lang.ja": "Japans",
  "lang.ar": "Arabisch",
  "lang.hi": "Hindi",
  "lang.tr": "Turks",
  "lang.da": "Deens",
  "lang.no": "Noors",
  "lang.sv": "Zweeds",
  "lang.is": "IJslands",
  "lang.pl": "Pools",
  "lang.ro": "Roemeens",
  "lang.sr": "Servisch",
  "lang.hr": "Kroatisch",
  "lang.cs": "Tsjechisch",
};

export default nl;
