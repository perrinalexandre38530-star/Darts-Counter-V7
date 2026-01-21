// ============================================
// src/i18n/en.ts
// Dictionnaire Anglais complet (base = FR v1)
// ============================================

import type { Dict } from "../contexts/LangContext";

export const en: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Home",
  "nav.local": "Local",
  "nav.games": "Games",
  "nav.training": "Training",
  "nav.online": "Online",
  "nav.stats": "Stats",
  "nav.settings": "Settings",
  "nav.profiles": "Profiles",
  "nav.sync": "Sync & share",
  "nav.back": "Back",
  "nav.close": "Close",

  // -----------------------------
  // GENERIC / COMMON
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.yes": "Yes",
  "common.no": "No",
  "common.save": "Save",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.next": "Next",
  "common.prev": "Previous",
  "common.start": "Start",
  "common.continue": "Continue",
  "common.resume": "Resume",
  "common.pause": "Pause",
  "common.reset": "Reset",
  "common.shuffle": "Shuffle",
  "common.loading": "Loading…",
  "common.error": "An error occurred",
  "common.info": "Info",
  "common.stats": "Statistics",
  "common.history": "History",
  "common.tutorial": "Tutorial",
  "common.exit": "Quit",
  "common.backHome": "Back to home",
  "common.player": "Player",
  "common.players": "Players",
  "common.team": "Team",
  "common.teams": "Teams",
  "common.points": "Points",
  "common.average": "Average",
  "common.best": "Best",
  "common.worst": "Worst",
  "common.total": "Total",
  "common.date": "Date",
  "common.time": "Time",

  // -----------------------------
  // HOME — PAGE + PROFILE CARD + ARCADE BANNER
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "MULTISPORTS SCORING control center",

  "status.online": "Online",
  "status.away": "Away",
  "status.offline": "Offline",

  // Top ribbon
  "home.welcome": "Welcome",
  "home.welcome.noProfile": "Welcome to MULTISPORTS SCORING",
  "home.hero.tagline": "Ready to throw some darts?",

  // Active profile card
  "home.activeProfile.title": "Active profile",
  "home.activeProfile.none": "No profile selected",
  "home.activeProfile.select": "Select a profile",
  "home.activeProfile.manage": "Manage profiles",
  "home.activeProfile.status.online": "Online",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Guest",
  "home.activeProfile.badge.you": "You",
  "home.activeProfile.badge.local": "Local",
  "home.activeProfile.badge.online": "Online",

  // Quick stats in card
  "home.activeProfile.stats.title": "Quick stats",
  "home.activeProfile.stats.x01Avg": "X01 average",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Training volume",
  "home.activeProfile.stats.lastGame": "Last match",
  "home.activeProfile.stats.noGames": "No match yet",
  "home.activeProfile.stats.seeAll": "See all stats",

  // Quick actions
  "home.quickActions.title": "Quick actions",
  "home.quickActions.playX01": "Start an X01",
  "home.quickActions.playCricket": "Start a Cricket",
  "home.quickActions.training": "Open Training",
  "home.quickActions.stats": "View statistics",

  // Stats carousel
  "home.statsCarousel.title": "Quick stats",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Arcade banner (ArcadeTicker)
  "home.arcadeBanner.title": "Info & news",
  "home.arcadeBanner.tapForMore": "Tap for more details",
  "home.arcadeBanner.empty": "No info to display yet",
  "home.arcadeBanner.tag.new": "New",
  "home.arcadeBanner.tag.tip": "Tip",
  "home.arcadeBanner.tag.update": "Update",

  // Big navigation buttons
  "home.nav.profiles": "Profiles",
  "home.nav.profiles.desc": "Local profiles, avatars & BOTS",
  "home.nav.local": "Local",
  "home.nav.local.desc": "Play on this dartboard",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Remote matches with your friends",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detailed training modules",
  "home.nav.stats": "Stats",
  "home.nav.stats.desc": "Dashboards, charts, history",
  "home.nav.settings": "Settings",
  "home.nav.settings.desc": "Themes, language, full reset",

  // Arcade ticker messages
  "home.ticker.records": "Latest records",
  "home.ticker.records.text":
    "Several records were broken recently, keep it up!",

  "home.ticker.localLast": "Last local match",
  "home.ticker.localLast.text":
    "Summary of the last match played locally.",

  "home.ticker.onlineLast": "Last online match",
  "home.ticker.onlineLast.text":
    "Your last online duel is ready for a rematch.",

  "home.ticker.onlineLeader": "Leaderboard leader",
  "home.ticker.onlineLeader.text":
    "See who is currently on top of the online leaderboard.",

  "home.ticker.training": "Training focus",
  "home.ticker.training.text":
    "Total Training X01 and Clock sessions.",

  "home.ticker.month": "Monthly stats",
  "home.ticker.month.text":
    "Total matches and hits for this month.",

  "home.ticker.tip": "Tip of the day",
  "home.ticker.tip.text":
    "Lock in your favourite finish by replaying it regularly.",

  // -----------------------------
  // GAMES (LOCAL MODES LIST)
  // -----------------------------
  "games.title": "All games",
  "games.subtitle": "Choose a game mode",
  "games.section.classic": "Classics",
  "games.section.training": "Training",
  "games.section.party": "Fun & party",
  "games.section.other": "Other modes",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… finish exactly at 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 to 20 + Bull, open/close and score.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Become the killer and knock others out.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "One number per round, hit S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Clock around the board",
  "games.training.custom": "Custom training",
  "games.training.evolution": "Progress stats",
  "games.info.title": "Game info",
  "games.info.rules": "Rules",
  "games.info.tips": "Tips",

  // -----------------------------
  // LOCAL PROFILES
  // -----------------------------
  "profiles.title": "Local profiles",
  "profiles.subtitle": "Manage your local players",
  "profiles.add": "Add profile",
  "profiles.edit": "Edit profile",
  "profiles.delete": "Delete profile",
  "profiles.confirmDelete": "Delete this profile permanently?",
  "profiles.name.label": "Player name",
  "profiles.name.placeholder": "Enter a nickname",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Random avatar",
  "profiles.stats.title": "Profile stats",
  "profiles.stats.x01": "X01 stats",
  "profiles.stats.cricket": "Cricket stats",
  "profiles.stats.training": "Training stats",
  "profiles.status.active": "Active",
  "profiles.status.inactive": "Inactive",
  "profiles.selectActive": "Set as active profile",
  "profiles.list.empty": "No profile yet",
  "profiles.list.selectHint": "Tap a profile to select it",
  "profiles.hint.avatarTap": "Tap the medallion to change the avatar",

  // -----------------------------
  // AVATAR CREATOR / MEDALLIONS
  // -----------------------------
  "avatar.title": "Avatar creator",
  "avatar.subtitle": "Customize your medallion",
  "avatar.style.label": "Style",
  "avatar.style.realistic": "Light realism",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Exaggerated",
  "avatar.theme.label": "Theme",
  "avatar.preview.label": "Preview",
  "avatar.generate": "Generate a new avatar",
  "avatar.keep": "Keep this avatar",
  "avatar.cancel": "Cancel changes",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "X01 settings",
  "x01.config.subtitle": "Prepare your match",
  "x01.config.section.players": "Players",
  "x01.config.section.match": "Match format",
  "x01.config.section.rules": "Basic settings",
  "x01.config.players.add": "Add player",
  "x01.config.players.remove": "Remove",
  "x01.config.players.teams": "Teams",
  "x01.config.mode.label": "Game mode",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Teams",
  "x01.config.raceToSets.label": "Sets to win",
  "x01.config.raceToLegs.label": "Legs to win",
  "x01.config.startingScore.label": "Starting score",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Custom",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Throw",
  "x01.config.service.random": "Random",
  "x01.config.service.alternate": "Alternate",
  "x01.config.bots.title": "BOTS (AI)",
  "x01.config.bots.add": "Add bot",
  "x01.config.bots.level.easy": "Easy",
  "x01.config.bots.level.medium": "Medium",
  "x01.config.bots.level.hard": "Hard",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Start match",
  "x01.config.back": "Back to games",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Turn",
  "x01.play.scoreRemaining": "Remaining",
  "x01.play.lastVisit": "Last visit",
  "x01.play.average3": "Average / 3 darts",
  "x01.play.bestVisit": "Best visit",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Darts thrown",
  "x01.play.visits": "Visits",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Undo visit",
  "x01.play.confirmExit": "Leave the current match?",
  "x01.play.botThinking": "Bot is playing…",
  "x01.play.noScoreYet": "No score yet",
  "x01.play.matchOver": "Match finished",
  "x01.play.legOver": "Leg finished",
  "x01.play.setOver": "Set finished",
  "x01.play.nextLeg": "Next leg",
  "x01.play.nextSet": "Next set",
  "x01.play.backToConfig": "Back to settings",
  "x01.play.saveInHistory": "Save to history",

  // -----------------------------
  // CRICKET (GAME + PARAMS)
  // -----------------------------
  "cricket.config.title": "Cricket settings",
  "cricket.config.players": "Players",
  "cricket.config.raceTo.label": "Points or legs",
  "cricket.config.pointsWin": "Win by points",
  "cricket.config.legsWin": "Win by legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Targets",
  "cricket.play.hits": "Hits",
  "cricket.play.score": "Score",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Turn",
  "cricket.play.open": "Open",
  "cricket.play.closed": "Closed",
  "cricket.stats.title": "Cricket stats",
  "cricket.stats.profile": "Cricket profile",
  "cricket.stats.bestMpr": "Best MPR",
  "cricket.stats.averageMpr": "Average MPR",
  "cricket.stats.gamesPlayed": "Games played",
  "cricket.stats.gamesWon": "Games won",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Training",
  "training.menu.subtitle": "Work on your strengths",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Detailed tracking for every dart.",
  "training.menu.clock": "Clock around the board",
  "training.menu.clock.desc": "Go through all the targets.",
  "training.menu.evolution": "Progress curve",
  "training.menu.evolution.desc": "See your evolution over time.",
  "training.menu.custom": "Custom session",
  "training.menu.resumeLast": "Resume last session",
  "training.menu.noSession": "No saved session yet",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analyse every dart",
  "training.x01.targetScore.label": "Starting score",
  "training.x01.throws": "Darts thrown",
  "training.x01.hitsBySegment": "Hits by segment",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Average / dart",
  "training.x01.session.save": "Save session",
  "training.x01.session.saved": "Session saved",
  "training.x01.session.delete": "Delete session",
  "training.x01.session.confirmDelete":
    "Delete this training session permanently?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Clock around the board",
  "training.clock.subtitle": "Hit each number in order",
  "training.clock.objective.label": "Objective",
  "training.clock.objective.allSingles": "All singles",
  "training.clock.objective.allDoubles": "All doubles",
  "training.clock.objective.allTriples": "All triples",
  "training.clock.objective.custom": "Custom path",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "No timer",
  "training.clock.timer.30": "30 seconds",
  "training.clock.timer.60": "60 seconds",
  "training.clock.timer.120": "120 seconds",
  "training.clock.players": "Players",
  "training.clock.start": "Start training",
  "training.clock.currentTarget": "Current target",
  "training.clock.progress": "Progress",
  "training.clock.session.save": "Save this session",
  "training.clock.session.saved": "Clock session saved",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Stats center",
  "stats.shell.tabs.local": "Local profiles",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "History",
  "stats.shell.info": "Choose a stats section.",
  "stats.hub.local.title": "Local profile stats",
  "stats.hub.local.selectProfile":
    "Select a profile to see stats",
  "stats.hub.training.title": "Training stats",
  "stats.hub.online.title": "Online stats",
  "stats.hub.history.title": "Match history",
  "stats.hub.kpi.avg3": "Average /3 darts",
  "stats.hub.kpi.winRate": "Win rate",
  "stats.hub.kpi.bestLeg": "Best leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Recent form",
  "stats.hub.radar.skills": "Skills radar",
  "stats.hub.training.clock": "Clock",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Training volume",
  "stats.hub.empty": "No stats available yet",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Match history",
  "history.subtitle": "Your latest matches",
  "history.filter.all": "All",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "No saved match yet",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Training",
  "history.details.title": "Match details",
  "history.details.players": "Players",
  "history.details.winner": "Winner",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Average /3 darts",
  "history.details.checkout": "Checkout",
  "history.delete": "Delete this match",
  "history.confirmDelete": "Delete this match permanently?",

  // -----------------------------
  // ONLINE MODE
  // -----------------------------
  "online.title": "Online mode",
  "online.subtitle": "Play with your friends remotely",
  "online.login.title": "Login",
  "online.login.nickname": "Nickname",
  "online.login.email": "Email (optional)",
  "online.login.password": "Password",
  "online.login.submit": "Sign in",
  "online.signup.title": "Create account",
  "online.logout": "Log out",
  "online.profile.title": "Online profile",
  "online.profile.country": "Country",
  "online.profile.bio": "Bio",
  "online.lobby.title": "X01 lobbies",
  "online.lobby.create": "Create lobby",
  "online.lobby.join": "Join lobby",
  "online.lobby.empty": "No lobby available yet",
  "online.friends.title": "Friends",
  "online.friends.add": "Add friend",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Away",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Settings",
  "settings.theme.title": "Neon themes",
  "settings.theme.subtitle": "Choose your vibe",
  "settings.theme.current": "Current theme",
  "settings.theme.applied": "Theme applied",
  "settings.lang.title": "Language",
  "settings.lang.subtitle": "App language",
  "settings.lang.help": "Interface texts are translated.",
  "settings.section.language": "Language",
  "settings.section.theme": "Themes",
  "settings.section.misc": "Other settings",
  "settings.misc.sounds": "Sounds",
  "settings.misc.vibrations": "Vibrations",
  "settings.misc.animations": "Visual animations",
  "settings.misc.resetApp": "Reset app",
  "settings.misc.resetConfirm":
    "Reset all local data (profiles, history, training)?",

  // Extra settings block (page Settings.tsx)
  "settings.back": "Back",
  "settings.subtitle":
    "Customize the app theme and language",

  "settings.theme": "Theme",
  "settings.theme.group.neons": "Classic neons",
  "settings.theme.group.soft": "Soft colors",
  "settings.theme.group.dark": "Dark premium themes",

  "settings.theme.gold.label": "Gold neon",
  "settings.theme.gold.desc": "Premium gold theme",

  "settings.theme.pink.label": "Pink neon",
  "settings.theme.pink.desc": "Pink arcade vibe",

  "settings.theme.petrol.label": "Petrol blue",
  "settings.theme.petrol.desc": "Deep neon blue",

  "settings.theme.green.label": "Green neon",
  "settings.theme.green.desc": "Bright practice style",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Intense violet / magenta",

  "settings.theme.red.label": "Red",
  "settings.theme.red.desc": "Aggressive arcade red",

  "settings.theme.orange.label": "Orange",
  "settings.theme.orange.desc": "Warm energetic orange",

  "settings.theme.white.label": "White",
  "settings.theme.white.desc": "Modern light background",

  "settings.theme.blueOcean.label": "Ocean blue",
  "settings.theme.blueOcean.desc": "Natural ocean / sky blue",

  "settings.theme.limeYellow.label": "Lime yellow",
  "settings.theme.limeYellow.desc": "Super flashy lime color",

  "settings.theme.sage.label": "Sage green",
  "settings.theme.sage.desc": "Soft and natural greens",

  "settings.theme.skyBlue.label": "Pastel blue",
  "settings.theme.skyBlue.desc": "Very soft and bright blue",

  "settings.theme.darkTitanium.label": "Dark titanium",
  "settings.theme.darkTitanium.desc": "Matte premium metal look",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc": "Modern carbon fiber vibe",

  "settings.theme.darkFrost.label": "Dark frost",
  "settings.theme.darkFrost.desc": "Frosty futuristic black",

  "settings.theme.darkObsidian.label": "Obsidian",
  "settings.theme.darkObsidian.desc":
    "Polished black, premium and readable",

  "settings.lang": "Language",

  "settings.reset.title": "Reset the app",
  "settings.reset.subtitle":
    "Deletes all local profiles, BOTS, stats, match history and settings. This cannot be undone.",
  "settings.reset.button": "Reset everything",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & share",
  "sync.subtitle": "Save and share your data",
  "sync.tabs.local": "Local",
  "sync.tabs.peer": "Device to device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Local export",
  "sync.local.export.desc": "Copy this JSON to save it elsewhere.",
  "sync.local.export.button": "Generate export",
  "sync.local.import.title": "Local import",
  "sync.local.import.desc":
    "Paste here a JSON exported from another device.",
  "sync.local.import.button": "Import JSON",
  "sync.local.import.success": "Import successful",
  "sync.local.import.error": "Import failed, invalid JSON.",
  "sync.peer.soon": "Device-to-device sync coming soon",
  "sync.cloud.soon": "Cloud sync coming soon",

  // -----------------------------
  // LABELS / MISC
  // -----------------------------
  "label.points": "Points",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Average /3 darts",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volume",
  "label.duration": "Duration",
  "label.date": "Date",
  "label.mode": "Mode",

  // Language names (EN)
  "lang.fr": "French",
  "lang.en": "English",
  "lang.es": "Spanish",
  "lang.de": "German",
  "lang.it": "Italian",
  "lang.pt": "Portuguese",
  "lang.nl": "Dutch",
  "lang.ru": "Russian",
  "lang.zh": "Chinese",
  "lang.ja": "Japanese",
  "lang.ar": "Arabic",
  "lang.hi": "Hindi",
  "lang.tr": "Turkish",
  "lang.da": "Danish",
  "lang.no": "Norwegian",
  "lang.sv": "Swedish",
  "lang.is": "Icelandic",
  "lang.pl": "Polish",
  "lang.ro": "Romanian",
  "lang.sr": "Serbian",
  "lang.hr": "Croatian",
  "lang.cs": "Czech",
};

export default en;
