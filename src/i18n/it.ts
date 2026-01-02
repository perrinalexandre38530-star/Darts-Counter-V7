// ============================================
// src/i18n/it.ts
// Dizionario Italiano (IT) — v1 completo
// ============================================

import type { Dict } from "../contexts/LangContext";

export const it: Dict = {
  // -----------------------------
  // NAVIGAZIONE / TABS
  // -----------------------------
  "nav.home": "Home",
  "nav.local": "Locale",
  "nav.games": "Giochi",
  "nav.training": "Allenamento",
  "nav.online": "Online",
  "nav.stats": "Statistiche",
  "nav.settings": "Impostazioni",
  "nav.profiles": "Profili",
  "nav.sync": "Sync & condivisione",
  "nav.back": "Indietro",
  "nav.close": "Chiudi",

  // -----------------------------
  // GENERICO / COMUNE
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Annulla",
  "common.yes": "Sì",
  "common.no": "No",
  "common.save": "Salva",
  "common.edit": "Modifica",
  "common.delete": "Elimina",
  "common.confirm": "Conferma",
  "common.next": "Avanti",
  "common.prev": "Indietro",
  "common.start": "Avvia",
  "common.continue": "Continua",
  "common.resume": "Riprendi",
  "common.pause": "Pausa",
  "common.reset": "Reset",
  "common.shuffle": "Casuale",
  "common.loading": "Caricamento…",
  "common.error": "Si è verificato un errore",
  "common.info": "Info",
  "common.stats": "Statistiche",
  "common.history": "Storico",
  "common.tutorial": "Tutorial",
  "common.exit": "Esci",
  "common.backHome": "Torna alla home",
  "common.player": "Giocatore",
  "common.players": "Giocatori",
  "common.team": "Squadra",
  "common.teams": "Squadre",
  "common.points": "Punti",
  "common.average": "Media",
  "common.best": "Migliore",
  "common.worst": "Peggiore",
  "common.total": "Totale",
  "common.date": "Data",
  "common.time": "Ora",

  // -----------------------------
  // HOME
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Centro di controllo Darts Counter",

  "status.online": "Online",
  "status.away": "Assente",
  "status.offline": "Offline",

  "home.welcome": "Benvenuto",
  "home.welcome.noProfile": "Benvenuto in Darts Counter",
  "home.hero.tagline": "Pronto a lanciare qualche freccetta?",

  // Profilo attivo
  "home.activeProfile.title": "Profilo attivo",
  "home.activeProfile.none": "Nessun profilo selezionato",
  "home.activeProfile.select": "Seleziona un profilo",
  "home.activeProfile.manage": "Gestisci i profili",
  "home.activeProfile.status.online": "Connesso",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Ospite",
  "home.activeProfile.badge.you": "Tu",
  "home.activeProfile.badge.local": "Locale",
  "home.activeProfile.badge.online": "Online",

  // Stats rapide
  "home.activeProfile.stats.title": "Statistiche rapide",
  "home.activeProfile.stats.x01Avg": "Media X01",
  "home.activeProfile.stats.cricketMpr": "MPR Cricket",
  "home.activeProfile.stats.trainingVolume": "Volume training",
  "home.activeProfile.stats.lastGame": "Ultima partita",
  "home.activeProfile.stats.noGames": "Ancora nessuna partita",
  "home.activeProfile.stats.seeAll": "Vedi tutte le statistiche",

  // Azioni rapide
  "home.quickActions.title": "Azioni rapide",
  "home.quickActions.playX01": "Avvia X01",
  "home.quickActions.playCricket": "Avvia Cricket",
  "home.quickActions.training": "Apri Training",
  "home.quickActions.stats": "Vedi statistiche",

  // Carosello stats
  "home.statsCarousel.title": "Statistiche rapide",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Bandeau arcade
  "home.arcadeBanner.title": "Info & novità",
  "home.arcadeBanner.tapForMore": "Tocca per saperne di più",
  "home.arcadeBanner.empty": "Nessuna informazione disponibile",
  "home.arcadeBanner.tag.new": "Nuovo",
  "home.arcadeBanner.tag.tip": "Consiglio",
  "home.arcadeBanner.tag.update": "Update",

  // Bottoni navigazione
  "home.nav.profiles": "Profili",
  "home.nav.profiles.desc": "Profili locali, avatar & BOTS",
  "home.nav.local": "Locale",
  "home.nav.local.desc": "Gioca dal vivo sulla tua board",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Partite a distanza con gli amici",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Moduli di allenamento avanzati",
  "home.nav.stats": "Statistiche",
  "home.nav.stats.desc": "Dashboard, grafici & storico",
  "home.nav.settings": "Impostazioni",
  "home.nav.settings.desc": "Temi, lingue & opzioni",

  // Ticker arcade
  "home.ticker.records": "Ultimi record",
  "home.ticker.records.text":
    "Diversi record battuti di recente, continua così!",

  "home.ticker.localLast": "Ultima partita locale",
  "home.ticker.localLast.text":
    "Riepilogo dell’ultima partita giocata in locale.",

  "home.ticker.onlineLast": "Ultima partita online",
  "home.ticker.onlineLast.text":
    "La tua ultima partita online è pronta per la rivincita.",

  "home.ticker.onlineLeader": "Leader della classifica",
  "home.ticker.onlineLeader.text":
    "Scopri chi è in cima alla classifica online.",

  "home.ticker.training": "Training attuale",
  "home.ticker.training.text":
    "Totale sessioni X01 Training e Giro dell’Orologio.",

  "home.ticker.month": "Statistiche del mese",
  "home.ticker.month.text":
    "Totale delle partite e dei colpi di questo mese.",

  "home.ticker.tip": "Consiglio del giorno",
  "home.ticker.tip.text":
    "Consolida la tua chiusura preferita ripetendola spesso.",

  // -----------------------------
  // GIOCHI
  // -----------------------------
  "games.title": "Tutti i giochi",
  "games.subtitle": "Scegli una modalità di gioco",
  "games.section.classic": "Classici",
  "games.section.training": "Allenamento",
  "games.section.party": "Party & divertimento",
  "games.section.other": "Altre modalità",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… chiudi esattamente a 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull, apri/chiudi e segna.",

  "games.killer.title": "Killer",
  "games.killer.desc": "Diventa killer ed elimina gli altri giocatori.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Un numero per round: colpisci S / D / T.",

  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Giro dell’orologio",
  "games.training.custom": "Allenamento personalizzato",
  "games.training.evolution": "Statistiche di evoluzione",

  "games.info.title": "Info gioco",
  "games.info.rules": "Regole",
  "games.info.tips": "Consigli",

  // -----------------------------
  // PROFILI LOCALI
  // -----------------------------
  "profiles.title": "Profili locali",
  "profiles.subtitle": "Gestisci i profili locali",
  "profiles.add": "Aggiungi profilo",
  "profiles.edit": "Modifica profilo",
  "profiles.delete": "Elimina profilo",
  "profiles.confirmDelete": "Eliminare definitivamente questo profilo?",
  "profiles.name.label": "Nome giocatore",
  "profiles.name.placeholder": "Inserisci un nickname",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Avatar casuale",
  "profiles.stats.title": "Statistiche profilo",
  "profiles.stats.x01": "Statistiche X01",
  "profiles.stats.cricket": "Statistiche Cricket",
  "profiles.stats.training": "Statistiche Training",
  "profiles.status.active": "Attivo",
  "profiles.status.inactive": "Inattivo",
  "profiles.selectActive": "Imposta come profilo attivo",
  "profiles.list.empty": "Nessun profilo disponibile",
  "profiles.list.selectHint":
    "Tocca un profilo per selezionarlo",
  "profiles.hint.avatarTap":
    "Tocca il medaglione per cambiare avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Creator avatar",
  "avatar.subtitle": "Personalizza il tuo medaglione",
  "avatar.style.label": "Stile",
  "avatar.style.realic": "Realismo leggero",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Esagerato",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Anteprima",
  "avatar.generate": "Genera nuovo avatar",
  "avatar.keep": "Mantieni questo avatar",
  "avatar.cancel": "Annulla modifiche",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "Impostazioni X01",
  "x01.config.subtitle": "Prepara la tua partita",
  "x01.config.section.players": "Giocatori",
  "x01.config.section.match": "Formato partita",
  "x01.config.section.rules": "Regole base",
  "x01.config.players.add": "Aggiungi giocatore",
  "x01.config.players.remove": "Rimuovi",
  "x01.config.players.teams": "Squadre",
  "x01.config.mode.label": "Modalità",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Squadre",
  "x01.config.raceToSets.label": "Set da vincere",
  "x01.config.raceToLegs.label": "Leg da vincere",
  "x01.config.startingScore.label": "Punteggio iniziale",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Personalizzato",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Servizio",
  "x01.config.service.random": "Casuale",
  "x01.config.service.alternate": "Alternato",
  "x01.config.bots.title": "BOTS (IA)",
  "x01.config.bots.add": "Aggiungi bot",
  "x01.config.bots.level.easy": "Facile",
  "x01.config.bots.level.medium": "Medio",
  "x01.config.bots.level.hard": "Difficile",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Avvia partita",
  "x01.config.back": "Torna ai giochi",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Turno di",
  "x01.play.scoreRemaining": "Rimanenti",
  "x01.play.lastVisit": "Ultima visita",
  "x01.play.average3": "Media / 3 frecce",
  "x01.play.bestVisit": "Miglior visita",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Frecce lanciate",
  "x01.play.visits": "Visite",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Annulla visita",
  "x01.play.confirmExit": "Uscire dalla partita?",
  "x01.play.botThinking": "Il bot sta giocando…",
  "x01.play.noScoreYet": "Ancora nessun punteggio",
  "x01.play.matchOver": "Partita terminata",
  "x01.play.legOver": "Leg terminato",
  "x01.play.setOver": "Set terminato",
  "x01.play.nextLeg": "Prossimo leg",
  "x01.play.nextSet": "Prossimo set",
  "x01.play.backToConfig": "Torna alle impostazioni",
  "x01.play.saveInHistory":
    "Salva nello storico",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Impostazioni Cricket",
  "cricket.config.players": "Giocatori",
  "cricket.config.raceTo.label": "Punti o leg",
  "cricket.config.pointsWin": "Vittoria a punti",
  "cricket.config.legsWin": "Vittoria a leg",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Bersagli",
  "cricket.play.hits": "Colpi",
  "cricket.play.score": "Punteggio",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Turno di",
  "cricket.play.open": "Aperto",
  "cricket.play.closed": "Chiuso",
  "cricket.stats.title": "Statistiche Cricket",
  "cricket.stats.profile": "Profilo Cricket",
  "cricket.stats.bestMpr": "Miglior MPR",
  "cricket.stats.averageMpr": "MPR medio",
  "cricket.stats.gamesPlayed": "Partite giocate",
  "cricket.stats.gamesWon": "Partite vinte",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Allenamento",
  "training.menu.subtitle": "Allena i tuoi punti forti",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Analisi dettagliata di ogni freccia.",
  "training.menu.clock": "Giro dell’orologio",
  "training.menu.clock.desc":
    "Colpisci tutti i bersagli in ordine.",
  "training.menu.evolution": "Curva di evoluzione",
  "training.menu.evolution.desc":
    "Visualizza i tuoi progressi nel tempo.",
  "training.menu.custom": "Sessione personalizzata",
  "training.menu.resumeLast": "Riprendi l’ultima sessione",
  "training.menu.noSession":
    "Nessuna sessione salvata al momento",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analisi di ogni freccia",
  "training.x01.targetScore.label": "Punteggio iniziale",
  "training.x01.throws": "Frecce lanciate",
  "training.x01.hitsBySegment": "Colpi per segmento",
  "training.x01.hits.single": "Singoli",
  "training.x01.hits.double": "Doppi",
  "training.x01.hits.triple": "Tripli",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Bust",
  "training.x01.avgPerDart": "Media / freccia",
  "training.x01.session.save": "Salva sessione",
  "training.x01.session.saved": "Sessione salvata",
  "training.x01.session.delete": "Elimina sessione",
  "training.x01.session.confirmDelete":
    "Eliminare definitivamente questa sessione?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Giro dell’orologio",
  "training.clock.subtitle": "Colpisci ogni numero in ordine",
  "training.clock.objective.label": "Obiettivo",
  "training.clock.objective.allSingles": "Tutti i singoli",
  "training.clock.objective.allDoubles": "Tutti i doppi",
  "training.clock.objective.allTriples": "Tutti i tripli",
  "training.clock.objective.custom": "Percorso personalizzato",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Senza timer",
  "training.clock.timer.30": "30 secondi",
  "training.clock.timer.60": "60 secondi",
  "training.clock.timer.120": "120 secondi",
  "training.clock.players": "Giocatori",
  "training.clock.start": "Avvia allenamento",
  "training.clock.currentTarget": "Bersaglio attuale",
  "training.clock.progress": "Progresso",
  "training.clock.session.save": "Salva sessione",
  "training.clock.session.saved":
    "Sessione giro orologio salvata",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "Centro statistiche",
  "stats.shell.tabs.local": "Profili locali",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Storico",
  "stats.shell.info":
    "Seleziona una sezione delle statistiche.",
  "stats.hub.local.title": "Stats profili locali",
  "stats.hub.local.selectProfile":
    "Seleziona un profilo per vedere le stats",
  "stats.hub.training.title": "Stats Training",
  "stats.hub.online.title": "Stats Online",
  "stats.hub.history.title": "Storico partite",
  "stats.hub.kpi.avg3": "Media /3 frecce",
  "stats.hub.kpi.winRate": "Win rate",
  "stats.hub.kpi.bestLeg": "Miglior leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Forma recente",
  "stats.hub.radar.skills": "Radar abilità",
  "stats.hub.training.clock": "Giro dell’orologio",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Volume allenamento",
  "stats.hub.empty": "Nessuna statistica disponibile",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "Storico partite",
  "history.subtitle": "Le tue ultime partite",
  "history.filter.all": "Tutte",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Nessuna partita registrata",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Allenamento",
  "history.details.title": "Dettagli partita",
  "history.details.players": "Giocatori",
  "history.details.winner": "Vincitore",
  "history.details.legs": "Leg",
  "history.details.sets": "Set",
  "history.details.avg3": "Media /3 frecce",
  "history.details.checkout": "Checkout",
  "history.delete": "Elimina partita",
  "history.confirmDelete":
    "Eliminare definitivamente questa partita?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Modalità online",
  "online.subtitle": "Gioca a distanza con gli amici",
  "online.login.title": "Login",
  "online.login.nickname": "Nickname",
  "online.login.email": "E-mail (opzionale)",
  "online.login.password": "Password",
  "online.login.submit": "Accedi",
  "online.signup.title": "Crea account",
  "online.logout": "Disconnetti",
  "online.profile.title": "Profilo online",
  "online.profile.country": "Paese",
  "online.profile.bio": "Bio",
  "online.lobby.title": "Lobby X01",
  "online.lobby.create": "Crea lobby",
  "online.lobby.join": "Entra nella lobby",
  "online.lobby.empty": "Nessuna lobby disponibile",
  "online.friends.title": "Amici",
  "online.friends.add": "Aggiungi amico",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Assente",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "Impostazioni",
  "settings.theme.title": "Temi neon",
  "settings.theme.subtitle": "Seleziona la tua atmosfera",
  "settings.theme.current": "Tema attuale",
  "settings.theme.applied": "Tema applicato",
  "settings.lang.title": "Lingua",
  "settings.lang.subtitle": "Lingua dell’app",
  "settings.lang.help":
    "Tutti i testi dell’interfaccia sono tradotti.",
  "settings.section.language": "Lingua",
  "settings.section.theme": "Temi",
  "settings.section.misc": "Altre impostazioni",
  "settings.misc.sounds": "Suoni",
  "settings.misc.vibrations": "Vibrazioni",
  "settings.misc.animations": "Animazioni visive",
  "settings.misc.resetApp": "Resetta app",
  "settings.misc.resetConfirm":
    "Resettare tutti i dati locali (profili, storico, training)?",

  // Gruppi temi
  "settings.theme.group.neons": "Neon classici",
  "settings.theme.group.soft": "Colori soft",
  "settings.theme.group.dark": "Dark premium",

  // Temi
  "settings.theme.gold.label": "Oro neon",
  "settings.theme.gold.desc": "Tema dorato premium",

  "settings.theme.pink.label": "Rosa neon",
  "settings.theme.pink.desc": "Atmosfera arcade rosa",

  "settings.theme.petrol.label": "Blu petrolio",
  "settings.theme.petrol.desc": "Blu neon profondo",

  "settings.theme.green.label": "Verde neon",
  "settings.theme.green.desc": "Stile allenamento luminoso",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Viola intenso",

  "settings.theme.red.label": "Rosso",
  "settings.theme.red.desc": "Rosso aggressivo arcade",

  "settings.theme.orange.label": "Arancione",
  "settings.theme.orange.desc": "Tono caldo e energico",

  "settings.theme.white.label": "Bianco",
  "settings.theme.white.desc": "Tema chiaro moderno",

  "settings.theme.blueOcean.label": "Blu oceano",
  "settings.theme.blueOcean.desc":
    "Blu naturale oceano/cielo",

  "settings.theme.limeYellow.label": "Giallo lime",
  "settings.theme.limeYellow.desc":
    "Colore lime molto acceso",

  "settings.theme.sage.label": "Verde salvia",
  "settings.theme.sage.desc":
    "Toni verdi morbidi e naturali",

  "settings.theme.skyBlue.label": "Blu pastello",
  "settings.theme.skyBlue.desc": "Blu molto morbido",

  "settings.theme.darkTitanium.label": "Titanio scuro",
  "settings.theme.darkTitanium.desc":
    "Aspetto metallico premium",

  "settings.theme.darkCarbon.label": "Carbonio",
  "settings.theme.darkCarbon.desc":
    "Atmosfera moderna in carbonio",

  "settings.theme.darkFrost.label": "Gelo scuro",
  "settings.theme.darkFrost.desc":
    "Nero ghiacciato futuristico",

  "settings.theme.darkObsidian.label": "Ossidiana",
  "settings.theme.darkObsidian.desc":
    "Nero lucido premium",

  "settings.reset.title": "Resetta l’app",
  "settings.reset.subtitle":
    "Cancella tutti i profili, BOTS, statistiche, storico e impostazioni. Azione definitiva.",
  "settings.reset.button": "Reset completo",

  // -----------------------------
  // SYNC
  // -----------------------------
  "sync.title": "Sync & condivisione",
  "sync.subtitle": "Salva e condividi i tuoi dati",
  "sync.tabs.local": "Locale",
  "sync.tabs.peer": "Device-to-device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Export locale",
  "sync.local.export.desc":
    "Copia questo JSON per salvarlo altrove.",
  "sync.local.export.button": "Genera export",
  "sync.local.import.title": "Import locale",
  "sync.local.import.desc":
    "Incolla qui un JSON esportato da un altro dispositivo.",
  "sync.local.import.button": "Importa JSON",
  "sync.local.import.success": "Import riuscito",
  "sync.local.import.error":
    "Import fallito, JSON non valido.",
  "sync.peer.soon": "Sync device-to-device in arrivo",
  "sync.cloud.soon": "Sync Cloud in arrivo",

  // -----------------------------
  // LABELS
  // -----------------------------
  "label.points": "Punti",
  "label.legs": "Leg",
  "label.sets": "Set",
  "label.avg3": "Media /3 frecce",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volume",
  "label.duration": "Durata",
  "label.date": "Data",
  "label.mode": "Modalità",

  // -----------------------------
  // NOMI DELLE LINGUE
  // -----------------------------
  "lang.fr": "Francese",
  "lang.en": "Inglese",
  "lang.es": "Spagnolo",
  "lang.de": "Tedesco",
  "lang.it": "Italiano",
  "lang.pt": "Portoghese",
  "lang.nl": "Olandese",
  "lang.ru": "Russo",
  "lang.zh": "Cinese",
  "lang.ja": "Giapponese",
  "lang.ar": "Arabo",
  "lang.hi": "Hindi",
  "lang.tr": "Turco",
  "lang.da": "Danese",
  "lang.no": "Norvegese",
  "lang.sv": "Svedese",
  "lang.is": "Islandese",
  "lang.pl": "Polacco",
  "lang.ro": "Romeno",
  "lang.sr": "Serbo",
  "lang.hr": "Croato",
  "lang.cs": "Ceco",
};

export default it;
