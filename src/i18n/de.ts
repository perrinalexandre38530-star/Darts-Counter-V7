// ============================================
// src/i18n/de.ts
// Deutsches Wörterbuch (DE) — v1 komplett
// ============================================

import type { Dict } from "../contexts/LangContext";

export const de: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Start",
  "nav.local": "Lokal",
  "nav.games": "Spiele",
  "nav.training": "Training",
  "nav.online": "Online",
  "nav.stats": "Statistiken",
  "nav.settings": "Einstellungen",
  "nav.profiles": "Profile",
  "nav.sync": "Sync & Teilen",
  "nav.back": "Zurück",
  "nav.close": "Schließen",

  // -----------------------------
  // GÉNÉRIQUE / COMMUN
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Abbrechen",
  "common.yes": "Ja",
  "common.no": "Nein",
  "common.save": "Speichern",
  "common.edit": "Bearbeiten",
  "common.delete": "Löschen",
  "common.confirm": "Bestätigen",
  "common.next": "Weiter",
  "common.prev": "Zurück",
  "common.start": "Starten",
  "common.continue": "Fortfahren",
  "common.resume": "Wieder aufnehmen",
  "common.pause": "Pause",
  "common.reset": "Zurücksetzen",
  "common.shuffle": "Zufällig",
  "common.loading": "Laden…",
  "common.error": "Ein Fehler ist aufgetreten",
  "common.info": "Infos",
  "common.stats": "Statistiken",
  "common.history": "Verlauf",
  "common.tutorial": "Tutorial",
  "common.exit": "Beenden",
  "common.backHome": "Zurück zum Start",
  "common.player": "Spieler",
  "common.players": "Spieler",
  "common.team": "Team",
  "common.teams": "Teams",
  "common.points": "Punkte",
  "common.average": "Durchschnitt",
  "common.best": "Beste",
  "common.worst": "Schlechteste",
  "common.total": "Gesamt",
  "common.date": "Datum",
  "common.time": "Uhrzeit",

  // -----------------------------
  // HOME / STATUS
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "MULTISPORTS SCORING Kontrollzentrum",

  "status.online": "Online",
  "status.away": "Abwesend",
  "status.offline": "Offline",

  "home.welcome": "Willkommen",
  "home.welcome.noProfile": "Willkommen bei MULTISPORTS SCORING",
  "home.hero.tagline": "Bereit für ein paar Darts?",

  // Carte profil
  "home.activeProfile.title": "Aktives Profil",
  "home.activeProfile.none": "Kein Profil ausgewählt",
  "home.activeProfile.select": "Profil auswählen",
  "home.activeProfile.manage": "Profile verwalten",
  "home.activeProfile.status.online": "Verbunden",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gast",
  "home.activeProfile.badge.you": "Du",
  "home.activeProfile.badge.local": "Lokal",
  "home.activeProfile.badge.online": "Online",

  // Stats rapides
  "home.activeProfile.stats.title": "Schnellstatistiken",
  "home.activeProfile.stats.x01Avg": "X01 Durchschnitt",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Trainingsvolumen",
  "home.activeProfile.stats.lastGame": "Letztes Spiel",
  "home.activeProfile.stats.noGames": "Noch kein Spiel",
  "home.activeProfile.stats.seeAll": "Alle Statistiken ansehen",

  // Quick actions
  "home.quickActions.title": "Schnellaktionen",
  "home.quickActions.playX01": "X01 starten",
  "home.quickActions.playCricket": "Cricket starten",
  "home.quickActions.training": "Training öffnen",
  "home.quickActions.stats": "Statistiken anzeigen",

  // Carrousel
  "home.statsCarousel.title": "Schnellstatistiken",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Bandeau arcade
  "home.arcadeBanner.title": "Infos & Neuigkeiten",
  "home.arcadeBanner.tapForMore": "Tippen für Details",
  "home.arcadeBanner.empty": "Keine Informationen verfügbar",
  "home.arcadeBanner.tag.new": "Neu",
  "home.arcadeBanner.tag.tip": "Tipp",
  "home.arcadeBanner.tag.update": "Update",

  // Gros boutons
  "home.nav.profiles": "Profile",
  "home.nav.profiles.desc": "Lokale Profile, Avatare & BOTS",
  "home.nav.local": "Lokal",
  "home.nav.local.desc": "Lokal auf deinem Dartboard spielen",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Online-Matches mit Freunden",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detaillierte Trainingsmodule",
  "home.nav.stats": "Statistiken",
  "home.nav.stats.desc": "Dashboards, Kurven, Spielverlauf",
  "home.nav.settings": "Einstellungen",
  "home.nav.settings.desc": "Themes, Sprache & Optionen",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "Alle Spiele",
  "games.subtitle": "Wähle einen Spielmodus",
  "games.section.classic": "Klassisch",
  "games.section.training": "Training",
  "games.section.party": "Party & Fun",
  "games.section.other": "Andere Modi",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… beende genau auf 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull, öffnen/schließen & punkten.",

  "games.killer.title": "Killer",
  "games.killer.desc": "Werde Killer und eliminiere die anderen.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Eine Zahl pro Runde, triff S / D / T.",

  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Uhrentraining",
  "games.training.custom": "Benutzerdefiniertes Training",
  "games.training.evolution": "Fortschrittsstatistik",

  "games.info.title": "Spielinfos",
  "games.info.rules": "Regeln",
  "games.info.tips": "Tipps",

  // -----------------------------
  // PROFILES
  // -----------------------------
  "profiles.title": "Lokale Profile",
  "profiles.subtitle": "Verwalte deine lokalen Spieler",
  "profiles.add": "Profil hinzufügen",
  "profiles.edit": "Profil bearbeiten",
  "profiles.delete": "Profil löschen",
  "profiles.confirmDelete": "Dieses Profil endgültig löschen?",
  "profiles.name.label": "Spielername",
  "profiles.name.placeholder": "Nickname eingeben",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Zufallsavatar",
  "profiles.stats.title": "Profilstatistiken",
  "profiles.stats.x01": "X01 Statistiken",
  "profiles.stats.cricket": "Cricket Statistiken",
  "profiles.stats.training": "Training Statistiken",
  "profiles.status.active": "Aktiv",
  "profiles.status.inactive": "Inaktiv",
  "profiles.selectActive": "Als aktives Profil festlegen",
  "profiles.list.empty": "Noch keine Profile",
  "profiles.list.selectHint": "Tippe auf ein Profil, um es auszuwählen",
  "profiles.hint.avatarTap": "Avatar antippen, um ihn zu ändern",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Avatar Creator",
  "avatar.subtitle": "Passe deinen Medaillon-Avatar an",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Leichter Realismus",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat Design",
  "avatar.style.exaggerated": "Überzeichnet",
  "avatar.theme.label": "Thema",
  "avatar.preview.label": "Vorschau",
  "avatar.generate": "Neuen Avatar generieren",
  "avatar.keep": "Diesen Avatar behalten",
  "avatar.cancel": "Änderung abbrechen",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01 Einstellungen",
  "x01.config.subtitle": "Spiel vorbereiten",
  "x01.config.section.players": "Spieler",
  "x01.config.section.match": "Matchformat",
  "x01.config.section.rules": "Basisregeln",
  "x01.config.players.add": "Spieler hinzufügen",
  "x01.config.players.remove": "Entfernen",
  "x01.config.players.teams": "Teams",
  "x01.config.mode.label": "Spielmodus",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Teams",

  "x01.config.raceToSets.label": "Sieg-Sets",
  "x01.config.raceToLegs.label": "Sieg-Legs",

  "x01.config.startingScore.label": "Startpunkte",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Benutzerdefiniert",

  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single In",
  "x01.config.in.double": "Double In",
  "x01.config.in.master": "Master In",
  "x01.config.out.simple": "Single Out",
  "x01.config.out.double": "Double Out",
  "x01.config.out.master": "Master Out",

  "x01.config.service.label": "Service",
  "x01.config.service.random": "Zufällig",
  "x01.config.service.alternate": "Abwechselnd",

  "x01.config.bots.title": "BOTS (KI)",
  "x01.config.bots.add": "Bot hinzufügen",
  "x01.config.bots.level.easy": "Leicht",
  "x01.config.bots.level.medium": "Mittel",
  "x01.config.bots.level.hard": "Schwierig",
  "x01.config.bots.level.pro": "Pro",

  "x01.config.startMatch": "Match starten",
  "x01.config.back": "Zurück zu den Spielen",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Am Zug",
  "x01.play.scoreRemaining": "Verbleibend",
  "x01.play.lastVisit": "Letzter Besuch",
  "x01.play.average3": "Durchschnitt / 3 Darts",
  "x01.play.bestVisit": "Beste Aufnahme",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Geworfene Darts",
  "x01.play.visits": "Besuche",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Aufnahme zurücknehmen",
  "x01.play.confirmExit": "Match wirklich verlassen?",
  "x01.play.botThinking": "Bot spielt…",
  "x01.play.noScoreYet": "Noch kein Score",
  "x01.play.matchOver": "Match beendet",
  "x01.play.legOver": "Leg beendet",
  "x01.play.setOver": "Set beendet",
  "x01.play.nextLeg": "Nächstes Leg",
  "x01.play.nextSet": "Nächstes Set",
  "x01.play.backToConfig": "Zurück zu den Einstellungen",
  "x01.play.saveInHistory": "Zum Verlauf hinzufügen",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Cricket Einstellungen",
  "cricket.config.players": "Spieler",
  "cricket.config.raceTo.label": "Punkte oder Legs",
  "cricket.config.pointsWin": "Sieg nach Punkten",
  "cricket.config.legsWin": "Sieg nach Legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Felder",
  "cricket.play.hits": "Treffer",
  "cricket.play.score": "Punkte",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Am Zug",
  "cricket.play.open": "Offen",
  "cricket.play.closed": "Geschlossen",
  "cricket.stats.title": "Cricket Statistiken",
  "cricket.stats.profile": "Cricket Profil",
  "cricket.stats.bestMpr": "Bester MPR",
  "cricket.stats.averageMpr": "Durchschnittlicher MPR",
  "cricket.stats.gamesPlayed": "Gespielte Spiele",
  "cricket.stats.gamesWon": "Gewonnene Spiele",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Training",
  "training.menu.subtitle": "Verbessere deine Stärken",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Detaillierte Analyse jedes Darts.",
  "training.menu.clock": "Uhrentraining",
  "training.menu.clock.desc": "Treffe alle Felder der Reihe nach.",
  "training.menu.evolution": "Fortschrittskurve",
  "training.menu.evolution.desc": "Entwicklung im Laufe der Zeit ansehen.",
  "training.menu.custom": "Benutzerdefinierte Session",
  "training.menu.resumeLast": "Letzte Session fortsetzen",
  "training.menu.noSession": "Noch keine Session gespeichert",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analyse jedes Darts",
  "training.x01.targetScore.label": "Startscore",
  "training.x01.throws": "Geworfene Darts",
  "training.x01.hitsBySegment": "Treffer pro Segment",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Triples",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double Bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Durchschnitt / Dart",
  "training.x01.session.save": "Session speichern",
  "training.x01.session.saved": "Session gespeichert",
  "training.x01.session.delete": "Session löschen",
  "training.x01.session.confirmDelete":
    "Diese Trainingssession endgültig löschen?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Uhrentraining",
  "training.clock.subtitle": "Triff jede Zahl der Reihe nach",
  "training.clock.objective.label": "Ziel",
  "training.clock.objective.allSingles": "Alle Singles",
  "training.clock.objective.allDoubles": "Alle Doubles",
  "training.clock.objective.allTriples": "Alle Triples",
  "training.clock.objective.custom": "Eigene Reihenfolge",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Ohne Timer",
  "training.clock.timer.30": "30 Sekunden",
  "training.clock.timer.60": "60 Sekunden",
  "training.clock.timer.120": "120 Sekunden",
  "training.clock.players": "Spieler",
  "training.clock.start": "Training starten",
  "training.clock.currentTarget": "Aktuelles Ziel",
  "training.clock.progress": "Fortschritt",
  "training.clock.session.save": "Session speichern",
  "training.clock.session.saved": "Uhrentraining gespeichert",

  // -----------------------------
  // STATS HUB
  // -----------------------------
  "stats.shell.title": "Statistikzentrum",
  "stats.shell.tabs.local": "Lokale Profile",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Verlauf",
  "stats.shell.info": "Wähle einen Statistikbereich.",
  "stats.hub.local.title": "Lokale Profilstatistiken",
  "stats.hub.local.selectProfile":
    "Wähle ein Profil, um die Statistiken zu sehen",
  "stats.hub.training.title": "Training Statistiken",
  "stats.hub.online.title": "Online Statistiken",
  "stats.hub.history.title": "Matchverlauf",
  "stats.hub.kpi.avg3": "Durchschnitt /3 Darts",
  "stats.hub.kpi.winRate": "Siegquote",
  "stats.hub.kpi.bestLeg": "Bestes Leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Aktuelle Form",
  "stats.hub.radar.skills": "Fähigkeitsradar",
  "stats.hub.training.clock": "Uhrentraining",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Trainingsvolumen",
  "stats.hub.empty": "Noch keine Statistiken verfügbar",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Matchverlauf",
  "history.subtitle": "Deine letzten Matches",
  "history.filter.all": "Alle",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Noch keine gespeicherten Matches",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Training",
  "history.details.title": "Matchdetails",
  "history.details.players": "Spieler",
  "history.details.winner": "Sieger",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Durchschnitt /3 Darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Match löschen",
  "history.confirmDelete": "Match endgültig löschen?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Online Modus",
  "online.subtitle": "Spiele aus der Ferne mit Freunden",
  "online.login.title": "Login",
  "online.login.nickname": "Nickname",
  "online.login.email": "E-Mail (optional)",
  "online.login.password": "Passwort",
  "online.login.submit": "Einloggen",
  "online.signup.title": "Konto erstellen",
  "online.logout": "Ausloggen",
  "online.profile.title": "Online Profil",
  "online.profile.country": "Land",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 Lobbies",
  "online.lobby.create": "Lobby erstellen",
  "online.lobby.join": "Lobby beitreten",
  "online.lobby.empty": "Noch keine verfügbaren Lobbies",
  "online.friends.title": "Freunde",
  "online.friends.add": "Freund hinzufügen",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Abwesend",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Einstellungen",
  "settings.theme.title": "Neon-Themes",
  "settings.theme.subtitle": "Wähle deine Atmosphäre",
  "settings.theme.current": "Aktuelles Theme",
  "settings.theme.applied": "Theme angewendet",
  "settings.lang.title": "Sprache",
  "settings.lang.subtitle": "App-Sprache",
  "settings.lang.help": "Alle UI-Texte wurden übersetzt.",
  "settings.section.language": "Sprache",
  "settings.section.theme": "Themes",
  "settings.section.misc": "Weitere Einstellungen",
  "settings.misc.sounds": "Sounds",
  "settings.misc.vibrations": "Vibrationen",
  "settings.misc.animations": "Visuelle Animationen",
  "settings.misc.resetApp": "App zurücksetzen",
  "settings.misc.resetConfirm":
    "Alle lokalen Daten zurücksetzen (Profile, Training, Verlauf)?",

  // Extra thèmes
  "settings.theme.group.neons": "Klassische Neons",
  "settings.theme.group.soft": "Sanfte Farben",
  "settings.theme.group.dark": "Dark Premium",

  "settings.theme.gold.label": "Neon Gold",
  "settings.theme.gold.desc": "Edles goldenes Theme",

  "settings.theme.pink.label": "Neon Pink",
  "settings.theme.pink.desc": "Pinkfarbene Arcade-Atmosphäre",

  "settings.theme.petrol.label": "Petrolblau",
  "settings.theme.petrol.desc": "Tiefes Neonblau",

  "settings.theme.green.label": "Neon Grün",
  "settings.theme.green.desc": "Helles Trainingsgrün",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intensives Violett/Magenta",

  "settings.theme.red.label": "Rot",
  "settings.theme.red.desc": "Aggressives Arcade-Rot",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Warm und energiegeladen",

  "settings.theme.white.label": "Weiß",
  "settings.theme.white.desc": "Helles modernes Theme",

  "settings.theme.blueOcean.label": "Ozeanblau",
  "settings.theme.blueOcean.desc": "Natürliches Ozean-/Himmelblau",

  "settings.theme.limeYellow.label": "Limegelb",
  "settings.theme.limeYellow.desc": "Extrem leuchtendes Lime",

  "settings.theme.sage.label": "Salbeigrün",
  "settings.theme.sage.desc": "Weiche, natürliche Grüntöne",

  "settings.theme.skyBlue.label": "Pastellblau",
  "settings.theme.skyBlue.desc": "Sehr weiches, helles Blau",

  "settings.theme.darkTitanium.label": "Dunkles Titan",
  "settings.theme.darkTitanium.desc": "Matte Premium-Metalloptik",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc": "Moderne Carbon-Atmosphäre",

  "settings.theme.darkFrost.label": "Dunkler Frost",
  "settings.theme.darkFrost.desc": "Eisiges futuristisches Schwarz",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc": "Poliertes Premium-Schwarz",

  "settings.reset.title": "App zurücksetzen",
  "settings.reset.subtitle":
    "Löscht alle lokalen Profile, BOTS, Statistiken, Matchverläufe und Einstellungen. Diese Aktion ist endgültig.",
  "settings.reset.button": "Alles zurücksetzen",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Sync & Teilen",
  "sync.subtitle": "Speichere & teile deine Daten",
  "sync.tabs.local": "Lokal",
  "sync.tabs.peer": "Device-to-Device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Lokaler Export",
  "sync.local.export.desc": "Kopiere diesen JSON, um ihn zu sichern.",
  "sync.local.export.button": "Export generieren",
  "sync.local.import.title": "Lokaler Import",
  "sync.local.import.desc":
    "Füge hier einen exportierten JSON ein.",
  "sync.local.import.button": "JSON importieren",
  "sync.local.import.success": "Import erfolgreich",
  "sync.local.import.error": "Import fehlgeschlagen: ungültiger JSON.",
  "sync.peer.soon": "Device-to-Device Sync kommt bald",
  "sync.cloud.soon": "Cloud Sync kommt bald",

  // -----------------------------
  // LABELS
  //------------------------------
  "label.points": "Punkte",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Durchschnitt /3 Darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volumen",
  "label.duration": "Dauer",
  "label.date": "Datum",
  "label.mode": "Modus",

  // -----------------------------
  // LANG NAMES
  // -----------------------------
  "lang.fr": "Französisch",
  "lang.en": "Englisch",
  "lang.es": "Spanisch",
  "lang.de": "Deutsch",
  "lang.it": "Italienisch",
  "lang.pt": "Portugiesisch",
  "lang.nl": "Niederländisch",
  "lang.ru": "Russisch",
  "lang.zh": "Chinesisch",
  "lang.ja": "Japanisch",
  "lang.ar": "Arabisch",
  "lang.hi": "Hindi",
  "lang.tr": "Türkisch",
  "lang.da": "Dänisch",
  "lang.no": "Norwegisch",
  "lang.sv": "Schwedisch",
  "lang.is": "Isländisch",
  "lang.pl": "Polnisch",
  "lang.ro": "Rumänisch",
  "lang.sr": "Serbisch",
  "lang.hr": "Kroatisch",
  "lang.cs": "Tschechisch",
};

export default de;
