// ============================================
// src/i18n/pl.ts
// Słownik polski (PL) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const pl: Dict = {
  // -----------------------------
  // NAWIGACJA / ZAKŁADKI
  // -----------------------------
  "nav.home": "Strona główna",
  "nav.local": "Lokalnie",
  "nav.games": "Gry",
  "nav.training": "Trening",
  "nav.online": "Online",
  "nav.stats": "Statystyki",
  "nav.settings": "Ustawienia",
  "nav.profiles": "Profile",
  "nav.sync": "Sync i udostępnianie",
  "nav.back": "Wstecz",
  "nav.close": "Zamknij",

  // -----------------------------
  // OGÓLNE / WSPÓLNE
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Anuluj",
  "common.yes": "Tak",
  "common.no": "Nie",
  "common.save": "Zapisz",
  "common.edit": "Edytuj",
  "common.delete": "Usuń",
  "common.confirm": "Potwierdź",
  "common.next": "Dalej",
  "common.prev": "Wstecz",
  "common.start": "Start",
  "common.continue": "Kontynuuj",
  "common.resume": "Wznów",
  "common.pause": "Pauza",
  "common.reset": "Resetuj",
  "common.shuffle": "Losowo",
  "common.loading": "Ładowanie…",
  "common.error": "Wystąpił błąd",
  "common.info": "Info",
  "common.stats": "Statystyki",
  "common.history": "Historia",
  "common.tutorial": "Samouczek",
  "common.exit": "Wyjdź",
  "common.backHome": "Powrót do strony głównej",
  "common.player": "Zawodnik",
  "common.players": "Zawodnicy",
  "common.team": "Drużyna",
  "common.teams": "Drużyny",
  "common.points": "Punkty",
  "common.average": "Średnia",
  "common.best": "Najlepszy",
  "common.worst": "Najsłabszy",
  "common.total": "Razem",
  "common.date": "Data",
  "common.time": "Godzina",

  // -----------------------------
  // HOME — STRONA GŁÓWNA
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Centrum sterowania MULTISPORTS SCORING",

  "status.online": "Online",
  "status.away": "Zaraz wracam",
  "status.offline": "Offline",

  // Nagłówek
  "home.welcome": "Witaj",
  "home.welcome.noProfile": "Witaj w MULTISPORTS SCORING",
  "home.hero.tagline": "Gotowy na kilka rzutów?",

  // Karta aktywnego profilu
  "home.activeProfile.title": "Aktywny profil",
  "home.activeProfile.none": "Nie wybrano żadnego profilu",
  "home.activeProfile.select": "Wybierz profil",
  "home.activeProfile.manage": "Zarządzaj profilami",
  "home.activeProfile.status.online": "Połączony",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Gość",
  "home.activeProfile.badge.you": "Ty",
  "home.activeProfile.badge.local": "Lokalny",
  "home.activeProfile.badge.online": "Online",

  // Statystyki w karcie
  "home.activeProfile.stats.title": "Szybkie statystyki",
  "home.activeProfile.stats.x01Avg": "Średnia X01",
  "home.activeProfile.stats.cricketMpr": "MPR Cricket",
  "home.activeProfile.stats.trainingVolume": "Objętość treningu",
  "home.activeProfile.stats.lastGame": "Ostatni mecz",
  "home.activeProfile.stats.noGames": "Brak rozegranych meczów",
  "home.activeProfile.stats.seeAll": "Zobacz wszystkie statystyki",

  // Szybkie akcje
  "home.quickActions.title": "Szybkie akcje",
  "home.quickActions.playX01": "Rozpocznij X01",
  "home.quickActions.playCricket": "Rozpocznij Cricket",
  "home.quickActions.training": "Przejdź do Treningu",
  "home.quickActions.stats": "Pokaż statystyki",

  // Karuzela statystyk
  "home.statsCarousel.title": "Szybkie statystyki",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Trening",

  // Pasek arcade / tikker
  "home.arcadeBanner.title": "Informacje i nowości",
  "home.arcadeBanner.tapForMore": "Dotknij, aby zobaczyć więcej",
  "home.arcadeBanner.empty": "Brak informacji do wyświetlenia",
  "home.arcadeBanner.tag.new": "Nowość",
  "home.arcadeBanner.tag.tip": "Porada",
  "home.arcadeBanner.tag.update": "Aktualizacja",

  // Duże przyciski nawigacji
  "home.nav.profiles": "Profile",
  "home.nav.profiles.desc": "Profile lokalne, awatary i BOTS",
  "home.nav.local": "Lokalnie",
  "home.nav.local.desc": "Gra na tej tarczy",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Mecze zdalne ze znajomymi",
  "home.nav.training": "Trening",
  "home.nav.training.desc": "Zaawansowane moduły treningowe",
  "home.nav.stats": "Statystyki",
  "home.nav.stats.desc": "Panele, wykresy, historia",
  "home.nav.settings": "Ustawienia",
  "home.nav.settings.desc": "Motywy, język, reset aplikacji",

  // -----------------------------
  // DASHBOARD / TICKER
  // -----------------------------
  "home.ticker.records": "Ostatnie rekordy",
  "home.ticker.records.text":
    "Kilka rekordów pobito ostatnio – tak trzymaj!",

  "home.ticker.localLast": "Ostatni mecz lokalny",
  "home.ticker.localLast.text":
    "Podsumowanie ostatniego meczu lokalnego.",

  "home.ticker.onlineLast": "Ostatni mecz online",
  "home.ticker.onlineLast.text":
    "Twój ostatni mecz online czeka na rewanż.",

  "home.ticker.onlineLeader": "Lider rankingu",
  "home.ticker.onlineLeader.text":
    "Sprawdź, kto prowadzi w rankingu online.",

  "home.ticker.training": "Trening dnia",
  "home.ticker.training.text":
    "Suma sesji X01 Training i Tour de l’Horloge.",

  "home.ticker.month": "Statystyki miesiąca",
  "home.ticker.month.text":
    "Łączna liczba meczów i trafień w tym miesiącu.",

  "home.ticker.tip": "Porada dnia",
  "home.ticker.tip.text":
    "Utrwal ulubione wyjścia ćwicząc je regularnie.",

  // -----------------------------
  // GAMES — LISTA GIER
  // -----------------------------
  "games.title": "Wszystkie gry",
  "games.subtitle": "Wybierz tryb gry",
  "games.section.classic": "Klasyczne",
  "games.section.training": "Trening",
  "games.section.party": "Imprezowe",
  "games.section.other": "Inne tryby",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… zakończ dokładnie na 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "Od 15 do 20 + Bull, otwieraj/zamykaj i punktuj.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Zostań killerem i eliminuj pozostałych.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Jedna liczba na rundę – traf S / D / T.",
  "games.training.menuTitle": "Trening",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Tour de l’Horloge",
  "games.training.custom": "Trening niestandardowy",
  "games.training.evolution": "Statystyki progresu",
  "games.info.title": "Informacje o grze",
  "games.info.rules": "Zasady",
  "games.info.tips": "Porady",

  // -----------------------------
  // PROFILE LOKALNE
  // -----------------------------
  "profiles.title": "Profile lokalne",
  "profiles.subtitle": "Zarządzaj lokalnymi zawodnikami",
  "profiles.add": "Dodaj profil",
  "profiles.edit": "Edytuj profil",
  "profiles.delete": "Usuń profil",
  "profiles.confirmDelete": "Usunąć ten profil na stałe?",
  "profiles.name.label": "Nazwa zawodnika",
  "profiles.name.placeholder": "Wpisz pseudonim",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Losowy avatar",
  "profiles.stats.title": "Statystyki profilu",
  "profiles.stats.x01": "Statystyki X01",
  "profiles.stats.cricket": "Statystyki Cricket",
  "profiles.stats.training": "Statystyki treningu",
  "profiles.status.active": "Aktywny",
  "profiles.status.inactive": "Nieaktywny",
  "profiles.selectActive": "Ustaw jako profil aktywny",
  "profiles.list.empty": "Brak profili",
  "profiles.list.selectHint": "Dotknij profil, aby go wybrać",
  "profiles.hint.avatarTap":
    "Dotknij medalionu, aby zmienić avatar",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "Kreator avatara",
  "avatar.subtitle": "Spersonalizuj swój medalion",
  "avatar.style.label": "Styl",
  "avatar.style.realistic": "Lekko realistyczny",
  "avatar.style.comic": "Komiks",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Przesadzony",
  "avatar.theme.label": "Motyw",
  "avatar.preview.label": "Podgląd",
  "avatar.generate": "Wygeneruj nowy avatar",
  "avatar.keep": "Zachowaj ten avatar",
  "avatar.cancel": "Anuluj zmiany",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "Ustawienia X01",
  "x01.config.subtitle": "Przygotuj mecz",
  "x01.config.section.players": "Zawodnicy",
  "x01.config.section.match": "Format meczu",
  "x01.config.section.rules": "Ustawienia podstawowe",
  "x01.config.players.add": "Dodaj zawodnika",
  "x01.config.players.remove": "Usuń",
  "x01.config.players.teams": "Drużyny",
  "x01.config.mode.label": "Tryb gry",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Drużyny",
  "x01.config.raceToSets.label": "Wygrane sety",
  "x01.config.raceToLegs.label": "Wygrane legi",
  "x01.config.startingScore.label": "Punkty startowe",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Własne",
  "x01.config.in.label": "Wejście",
  "x01.config.out.label": "Wyjście",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Serwis",
  "x01.config.service.random": "Losowo",
  "x01.config.service.alternate": "Naprzemiennie",
  "x01.config.bots.title": "BOTS (SI)",
  "x01.config.bots.add": "Dodaj bota",
  "x01.config.bots.level.easy": "Łatwy",
  "x01.config.bots.level.medium": "Średni",
  "x01.config.bots.level.hard": "Trudny",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Rozpocznij mecz",
  "x01.config.back": "Wróć do gier",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Kolej:",
  "x01.play.scoreRemaining": "Pozostało",
  "x01.play.lastVisit": "Ostatnia wizyta",
  "x01.play.average3": "Średnia / 3 lotki",
  "x01.play.bestVisit": "Najlepsza wizyta",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Rzucone lotki",
  "x01.play.visits": "Wizyty",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Cofnij wizytę",
  "x01.play.confirmExit": "Opuścić trwający mecz?",
  "x01.play.botThinking": "Bot wykonuje ruch…",
  "x01.play.noScoreYet": "Brak wyników",
  "x01.play.matchOver": "Mecz zakończony",
  "x01.play.legOver": "Leg zakończony",
  "x01.play.setOver": "Set zakończony",
  "x01.play.nextLeg": "Następny leg",
  "x01.play.nextSet": "Następny set",
  "x01.play.backToConfig": "Wróć do ustawień",
  "x01.play.saveInHistory": "Zapisz w historii",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Ustawienia Cricket",
  "cricket.config.players": "Zawodnicy",
  "cricket.config.raceTo.label": "Punkty lub legi",
  "cricket.config.pointsWin": "Wygrana na punkty",
  "cricket.config.legsWin": "Wygrana na legi",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Cele",
  "cricket.play.hits": "Trafienia",
  "cricket.play.score": "Wynik",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Kolej:",
  "cricket.play.open": "Otwarte",
  "cricket.play.closed": "Zamknięte",
  "cricket.stats.title": "Statystyki Cricket",
  "cricket.stats.profile": "Profil Cricket",
  "cricket.stats.bestMpr": "Najlepsze MPR",
  "cricket.stats.averageMpr": "Średnie MPR",
  "cricket.stats.gamesPlayed": "Rozegrane mecze",
  "cricket.stats.gamesWon": "Wygrane mecze",

  // -----------------------------
  // MENU TRENINGOWE
  // -----------------------------
  "training.menu.title": "Trening",
  "training.menu.subtitle": "Pracuj nad swoimi mocnymi stronami",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Dokładne śledzenie każdej lotki.",
  "training.menu.clock": "Tour de l’Horloge",
  "training.menu.clock.desc": "Obejdź wszystkie cele po kolei.",
  "training.menu.evolution": "Krzywa progresu",
  "training.menu.evolution.desc":
    "Zobacz swój postęp w czasie.",
  "training.menu.custom": "Sesja niestandardowa",
  "training.menu.resumeLast": "Wznów ostatnią sesję",
  "training.menu.noSession": "Brak zapisanych sesji",

  // -----------------------------
  // TRENING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Analiza każdego rzutu",
  "training.x01.targetScore.label": "Punkty startowe",
  "training.x01.throws": "Rzuty",
  "training.x01.hitsBySegment": "Trafienia według segmentu",
  "training.x01.hits.single": "Single",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busty",
  "training.x01.avgPerDart": "Średnia / lotkę",
  "training.x01.session.save": "Zapisz sesję",
  "training.x01.session.saved": "Sesja zapisana",
  "training.x01.session.delete": "Usuń sesję",
  "training.x01.session.confirmDelete":
    "Usunąć tę sesję treningową na stałe?",

  // -----------------------------
  // TRENING CLOCK / TOUR DE L’HORLOGE
  // -----------------------------
  "training.clock.title": "Tour de l’Horloge",
  "training.clock.subtitle": "Traf każdy numer po kolei",
  "training.clock.objective.label": "Cel",
  "training.clock.objective.allSingles": "Wszystkie single",
  "training.clock.objective.allDoubles": "Wszystkie double",
  "training.clock.objective.allTriples": "Wszystkie triple",
  "training.clock.objective.custom": "Trasa niestandardowa",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Bez timera",
  "training.clock.timer.30": "30 sekund",
  "training.clock.timer.60": "60 sekund",
  "training.clock.timer.120": "120 sekund",
  "training.clock.players": "Zawodnicy",
  "training.clock.start": "Rozpocznij trening",
  "training.clock.currentTarget": "Aktualny cel",
  "training.clock.progress": "Postęp",
  "training.clock.session.save": "Zapisz tę sesję",
  "training.clock.session.saved":
    "Sesja Tour de l’Horloge zapisana",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Centrum statystyk",
  "stats.shell.tabs.local": "Profile lokalne",
  "stats.shell.tabs.training": "Trening",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historia",
  "stats.shell.info": "Wybierz sekcję statystyk.",
  "stats.hub.local.title": "Statystyki profili lokalnych",
  "stats.hub.local.selectProfile":
    "Wybierz profil, aby zobaczyć statystyki",
  "stats.hub.training.title": "Statystyki treningu",
  "stats.hub.online.title": "Statystyki online",
  "stats.hub.history.title": "Historia meczów",
  "stats.hub.kpi.avg3": "Średnia /3 lotki",
  "stats.hub.kpi.winRate": "Współczynnik zwycięstw",
  "stats.hub.kpi.bestLeg": "Najlepszy leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Ostatnia forma",
  "stats.hub.radar.skills": "Radar umiejętności",
  "stats.hub.training.clock": "Tour de l’Horloge",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Objętość treningu",
  "stats.hub.empty": "Brak dostępnych statystyk",

  // -----------------------------
  // HISTORIA
  // -----------------------------
  "history.title": "Historia meczów",
  "history.subtitle": "Twoje ostatnie mecze",
  "history.filter.all": "Wszystkie",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Trening",
  "history.empty": "Brak zapisanych meczów",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Trening",
  "history.details.title": "Szczegóły meczu",
  "history.details.players": "Zawodnicy",
  "history.details.winner": "Zwycięzca",
  "history.details.legs": "Legi",
  "history.details.sets": "Sety",
  "history.details.avg3": "Średnia /3 lotki",
  "history.details.checkout": "Checkout",
  "history.delete": "Usuń mecz",
  "history.confirmDelete": "Usunąć ten mecz na stałe?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "Tryb online",
  "online.subtitle": "Graj na odległość ze znajomymi",
  "online.login.title": "Logowanie",
  "online.login.nickname": "Pseudonim",
  "online.login.email": "E-mail (opcjonalnie)",
  "online.login.password": "Hasło",
  "online.login.submit": "Zaloguj się",
  "online.signup.title": "Utwórz konto",
  "online.logout": "Wyloguj",
  "online.profile.title": "Profil online",
  "online.profile.country": "Kraj",
  "online.profile.bio": "Opis",
  "online.lobby.title": "Pokoje X01",
  "online.lobby.create": "Utwórz pokój",
  "online.lobby.join": "Dołącz do pokoju",
  "online.lobby.empty": "Brak dostępnych pokoi",
  "online.friends.title": "Znajomi",
  "online.friends.add": "Dodaj znajomego",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Zaraz wracam",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // USTAWIENIA (OGÓLNE)
  // -----------------------------
  "settings.title": "Ustawienia",
  "settings.theme.title": "Motywy neonowe",
  "settings.theme.subtitle": "Wybierz swój klimat",
  "settings.theme.current": "Aktualny motyw",
  "settings.theme.applied": "Motyw zastosowany",
  "settings.lang.title": "Język",
  "settings.lang.subtitle": "Język aplikacji",
  "settings.lang.help": "Teksty interfejsu są tłumaczone.",
  "settings.section.language": "Język",
  "settings.section.theme": "Motywy",
  "settings.section.misc": "Inne opcje",
  "settings.misc.sounds": "Dźwięki",
  "settings.misc.vibrations": "Wibracje",
  "settings.misc.animations": "Animacje wizualne",
  "settings.misc.resetApp": "Resetuj aplikację",
  "settings.misc.resetConfirm":
    "Zresetować wszystkie dane lokalne (profile, historia, trening)?",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync i udostępnianie",
  "sync.subtitle": "Zapisuj i udostępniaj swoje dane",
  "sync.tabs.local": "Lokalnie",
  "sync.tabs.peer": "Urządzenie–urządzenie",
  "sync.tabs.cloud": "Chmura",
  "sync.local.export.title": "Eksport lokalny",
  "sync.local.export.desc":
    "Skopiuj ten JSON, aby zapisać go w innym miejscu.",
  "sync.local.export.button": "Wygeneruj eksport",
  "sync.local.import.title": "Import lokalny",
  "sync.local.import.desc":
    "Wklej tutaj JSON wyeksportowany z innego urządzenia.",
  "sync.local.import.button": "Importuj JSON",
  "sync.local.import.success": "Import zakończony sukcesem",
  "sync.local.import.error": "Import nieudany, nieprawidłowy JSON.",
  "sync.peer.soon": "Sync urządzenie–urządzenie wkrótce",
  "sync.cloud.soon": "Sync w chmurze wkrótce",

  // -----------------------------
  // LABELS / ETYKIETY
  // -----------------------------
  "label.points": "Punkty",
  "label.legs": "Legi",
  "label.sets": "Sety",
  "label.avg3": "Średnia /3 lotki",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Objętość",
  "label.duration": "Czas trwania",
  "label.date": "Data",
  "label.mode": "Tryb",

  // -----------------------------
  // USTAWIENIA — PRZYCISK WSTECZ + MOTYWY + RESET
  // -----------------------------
  "settings.back": "Wstecz",
  "settings.subtitle":
    "Spersonalizuj motyw i język aplikacji",

  "settings.theme": "Motyw",
  "settings.theme.group.neons": "Klasyczne neony",
  "settings.theme.group.soft": "Delikatne kolory",
  "settings.theme.group.dark": "Ciemne motywy premium",

  "settings.theme.gold.label": "Złoty neon",
  "settings.theme.gold.desc": "Złoty motyw premium",

  "settings.theme.pink.label": "Różowy neon",
  "settings.theme.pink.desc": "Różowa atmosfera arcade",

  "settings.theme.petrol.label": "Petrolowy niebieski",
  "settings.theme.petrol.desc": "Głęboki neonowy niebieski",

  "settings.theme.green.label": "Zielony neon",
  "settings.theme.green.desc": "Jasny, treningowy styl",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Mocny fiolet / magenta",

  "settings.theme.red.label": "Czerwony",
  "settings.theme.red.desc": "Agresywny czerwony arcade",

  "settings.theme.orange.label": "Pomarańczowy",
  "settings.theme.orange.desc": "Ciepły, energetyczny pomarańczowy",

  "settings.theme.white.label": "Biały",
  "settings.theme.white.desc": "Nowoczesne, jasne tło",

  "settings.theme.blueOcean.label": "Niebieski ocean",
  "settings.theme.blueOcean.desc": "Naturalny błękit oceanu / nieba",

  "settings.theme.limeYellow.label": "Limonkowy żółty",
  "settings.theme.limeYellow.desc": "Bardzo jaskrawy limonkowy kolor",

  "settings.theme.sage.label": "Szałwiowa zieleń",
  "settings.theme.sage.desc": "Naturalne, miękkie odcienie zieleni",

  "settings.theme.skyBlue.label": "Pastelowy niebieski",
  "settings.theme.skyBlue.desc": "Bardzo miękki i jasny niebieski",

  "settings.theme.darkTitanium.label": "Ciemny tytan",
  "settings.theme.darkTitanium.desc":
    "Matowy, metaliczny, premium wygląd",

  "settings.theme.darkCarbon.label": "Carbon",
  "settings.theme.darkCarbon.desc": "Nowoczesny, karbonowy klimat",

  "settings.theme.darkFrost.label": "Ciemny frost",
  "settings.theme.darkFrost.desc": "Mroźna, futurystyczna czerń",

  "settings.theme.darkObsidian.label": "Obsydian",
  "settings.theme.darkObsidian.desc":
    "Polerowana czerń o wysokiej czytelności",

  "settings.lang": "Język",

  "settings.reset.title": "Resetuj aplikację",
  "settings.reset.subtitle":
    "Usuń wszystkie profile lokalne, BOTS, statystyki, historię meczów i ustawienia. Operacja nieodwracalna.",
  "settings.reset.button": "Resetuj wszystko",

  // -----------------------------
  // NAZWY JĘZYKÓW (PL)
  // -----------------------------
  "lang.fr": "Francuski",
  "lang.en": "Angielski",
  "lang.es": "Hiszpański",
  "lang.de": "Niemiecki",
  "lang.it": "Włoski",
  "lang.pt": "Portugalski",
  "lang.nl": "Niderlandzki",
  "lang.ru": "Rosyjski",
  "lang.zh": "Chiński",
  "lang.ja": "Japoński",
  "lang.ar": "Arabski",
  "lang.hi": "Hindi",
  "lang.tr": "Turecki",
  "lang.da": "Duński",
  "lang.no": "Norweski",
  "lang.sv": "Szwedzki",
  "lang.is": "Islandzki",
  "lang.pl": "Polski",
  "lang.ro": "Rumuński",
  "lang.sr": "Serbski",
  "lang.hr": "Chorwacki",
  "lang.cs": "Czeski",
};

export default pl;
