// src/i18n/es.ts
import type { Dict } from "../contexts/LangContext";

export const es: Dict = {
  // ============================================
  // Diccionario ES completo (v1)
  // - Claves planas: "seccion.subSeccion.clave"
  // ============================================

  // -----------------------------
  // NAVEGACIÓN / TABS
  // -----------------------------
  "nav.home": "Inicio",
  "nav.local": "Local",
  "nav.games": "Juegos",
  "nav.training": "Entrenamiento",
  "nav.online": "En línea",
  "nav.stats": "Stats",
  "nav.settings": "Ajustes",
  "nav.profiles": "Perfiles",
  "nav.sync": "Sync y compartir",
  "nav.back": "Atrás",
  "nav.close": "Cerrar",

  // -----------------------------
  // GENÉRICO / COMÚN
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Cancelar",
  "common.yes": "Sí",
  "common.no": "No",
  "common.save": "Guardar",
  "common.edit": "Editar",
  "common.delete": "Eliminar",
  "common.confirm": "Confirmar",
  "common.next": "Siguiente",
  "common.prev": "Anterior",
  "common.start": "Empezar",
  "common.continue": "Continuar",
  "common.resume": "Reanudar",
  "common.pause": "Pausa",
  "common.reset": "Reiniciar",
  "common.shuffle": "Aleatorio",
  "common.loading": "Cargando…",
  "common.error": "Ha ocurrido un error",
  "common.info": "Info",
  "common.stats": "Estadísticas",
  "common.history": "Historial",
  "common.tutorial": "Tutorial",
  "common.exit": "Salir",
  "common.backHome": "Volver al inicio",
  "common.player": "Jugador",
  "common.players": "Jugadores",
  "common.team": "Equipo",
  "common.teams": "Equipos",
  "common.points": "Puntos",
  "common.average": "Media",
  "common.best": "Mejor",
  "common.worst": "Peor",
  "common.total": "Total",
  "common.date": "Fecha",
  "common.time": "Hora",

  // -----------------------------
  // HOME — PÁGINA + PERFIL + BANNER ARCADE
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Centro de control Darts Counter",

  "status.online": "En línea",
  "status.away": "Ausente",
  "status.offline": "Desconectado",

  // Banda superior
  "home.welcome": "Bienvenido",
  "home.welcome.noProfile": "Bienvenido a Darts Counter",
  "home.hero.tagline": "¿Listo para lanzar unas dianas?",

  // Tarjeta de perfil activo
  "home.activeProfile.title": "Perfil activo",
  "home.activeProfile.none": "Ningún perfil seleccionado",
  "home.activeProfile.select": "Seleccionar un perfil",
  "home.activeProfile.manage": "Gestionar perfiles",
  "home.activeProfile.status.online": "Conectado",
  "home.activeProfile.status.offline": "Desconectado",
  "home.activeProfile.status.guest": "Invitado",
  "home.activeProfile.badge.you": "Tú",
  "home.activeProfile.badge.local": "Local",
  "home.activeProfile.badge.online": "Online",

  // Stats rápidas en la tarjeta
  "home.activeProfile.stats.title": "Stats rápidas",
  "home.activeProfile.stats.x01Avg": "Media X01",
  "home.activeProfile.stats.cricketMpr": "MPR Cricket",
  "home.activeProfile.stats.trainingVolume": "Volumen training",
  "home.activeProfile.stats.lastGame": "Último partido",
  "home.activeProfile.stats.noGames": "Aún sin partido",
  "home.activeProfile.stats.seeAll": "Ver todas las stats",

  // Acciones rápidas
  "home.quickActions.title": "Acciones rápidas",
  "home.quickActions.playX01": "Lanzar un X01",
  "home.quickActions.playCricket": "Lanzar un Cricket",
  "home.quickActions.training": "Ir a Training",
  "home.quickActions.stats": "Ver estadísticas",

  // Carrusel de stats
  "home.statsCarousel.title": "Stats rápidas",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Banner arcade (ArcadeTicker)
  "home.arcadeBanner.title": "Info y novedades",
  "home.arcadeBanner.tapForMore": "Toca para más detalles",
  "home.arcadeBanner.empty": "Sin información por mostrar de momento",
  "home.arcadeBanner.tag.new": "Nuevo",
  "home.arcadeBanner.tag.tip": "Truco",
  "home.arcadeBanner.tag.update": "Update",

  // Botones grandes de navegación
  "home.nav.profiles": "Perfiles",
  "home.nav.profiles.desc": "Perfiles locales, avatares y BOTS",
  "home.nav.local": "Local",
  "home.nav.local.desc": "Jugar en este tablero",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Partidos a distancia con amigos",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Módulos de entrenamiento detallados",
  "home.nav.stats": "Stats",
  "home.nav.stats.desc": "Dashboards, gráficas, historial",
  "home.nav.settings": "Ajustes",
  "home.nav.settings.desc": "Temas, idioma y reset completo",

  // Ticker arcade
  "home.ticker.records": "Últimos récords",
  "home.ticker.records.text":
    "¡Varios récords batidos recientemente, sigue así!",

  "home.ticker.localLast": "Último partido local",
  "home.ticker.localLast.text":
    "Resumen del último partido jugado en local.",

  "home.ticker.onlineLast": "Último partido online",
  "home.ticker.onlineLast.text":
    "Tu último duelo online está listo para la revancha.",

  "home.ticker.onlineLeader": "Líder del ranking",
  "home.ticker.onlineLeader.text":
    "Descubre quién está en cabeza del ranking online.",

  "home.ticker.training": "Training del momento",
  "home.ticker.training.text":
    "Total de sesiones Training X01 y Tour de l’Horloge.",

  "home.ticker.month": "Stats del mes",
  "home.ticker.month.text":
    "Total de partidos e impactos de este mes.",

  "home.ticker.tip": "Truco del día",
  "home.ticker.tip.text":
    "Fija tu checkout favorito repitiéndolo con regularidad.",

  // -----------------------------
  // GAMES (LISTA DE MODOS LOCALES)
  // -----------------------------
  "games.title": "Todos los juegos",
  "games.subtitle": "Elige un modo de juego",
  "games.section.classic": "Clásicos",
  "games.section.training": "Entrenamiento",
  "games.section.party": "Fun & party",
  "games.section.other": "Otros modos",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… termina exactamente en 0.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "Del 15 al 20 + Bull, abre/cierra y puntúa.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Conviértete en killer y elimina a los demás.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Un número por ronda, apunta a S / D / T.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Ronda del reloj",
  "games.training.custom": "Entrenamiento personalizado",
  "games.training.evolution": "Stats de evolución",
  "games.info.title": "Info del juego",
  "games.info.rules": "Reglas",
  "games.info.tips": "Consejos",

  // -----------------------------
  // PERFILES LOCALES
  // -----------------------------
  "profiles.title": "Perfiles locales",
  "profiles.subtitle": "Gestiona tus jugadores locales",
  "profiles.add": "Añadir perfil",
  "profiles.edit": "Editar perfil",
  "profiles.delete": "Eliminar perfil",
  "profiles.confirmDelete": "¿Eliminar este perfil definitivamente?",
  "profiles.name.label": "Nombre del jugador",
  "profiles.name.placeholder": "Introduce un apodo",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Avatar aleatorio",
  "profiles.stats.title": "Stats del perfil",
  "profiles.stats.x01": "Stats X01",
  "profiles.stats.cricket": "Stats Cricket",
  "profiles.stats.training": "Stats Training",
  "profiles.status.active": "Activo",
  "profiles.status.inactive": "Inactivo",
  "profiles.selectActive": "Definir como perfil activo",
  "profiles.list.empty": "Aún no hay perfiles",
  "profiles.list.selectHint": "Toca un perfil para seleccionarlo",
  "profiles.hint.avatarTap": "Toca el medallón para cambiar el avatar",

  // -----------------------------
  // AVATAR CREATOR / MEDALLONES
  // -----------------------------
  "avatar.title": "Creador de avatar",
  "avatar.subtitle": "Personaliza tu medallón",
  "avatar.style.label": "Estilo",
  "avatar.style.realistic": "Realismo ligero",
  "avatar.style.comic": "Cómic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Exagerado",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Vista previa",
  "avatar.generate": "Generar nuevo avatar",
  "avatar.keep": "Conservar este avatar",
  "avatar.cancel": "Cancelar cambios",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "Ajustes X01",
  "x01.config.subtitle": "Prepara tu partida",
  "x01.config.section.players": "Jugadores",
  "x01.config.section.match": "Formato de partido",
  "x01.config.section.rules": "Parámetros básicos",
  "x01.config.players.add": "Añadir jugador",
  "x01.config.players.remove": "Quitar",
  "x01.config.players.teams": "Equipos",
  "x01.config.mode.label": "Modo de juego",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Equipos",
  "x01.config.raceToSets.label": "Sets ganadores",
  "x01.config.raceToLegs.label": "Legs ganadores",
  "x01.config.startingScore.label": "Puntuación inicial",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Perso",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Saque",
  "x01.config.service.random": "Aleatorio",
  "x01.config.service.alternate": "Alternado",
  "x01.config.bots.title": "BOTS (IA)",
  "x01.config.bots.add": "Añadir bot",
  "x01.config.bots.level.easy": "Fácil",
  "x01.config.bots.level.medium": "Medio",
  "x01.config.bots.level.hard": "Difícil",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Lanzar partida",
  "x01.config.back": "Volver a los juegos",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Turno de",
  "x01.play.scoreRemaining": "Restante",
  "x01.play.lastVisit": "Última visita",
  "x01.play.average3": "Media / 3 dardos",
  "x01.play.bestVisit": "Mejor visita",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Dardos lanzados",
  "x01.play.visits": "Visitas",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Deshacer visita",
  "x01.play.confirmExit": "¿Salir de la partida en curso?",
  "x01.play.botThinking": "El bot está jugando…",
  "x01.play.noScoreYet": "Aún sin puntuación",
  "x01.play.matchOver": "Partido terminado",
  "x01.play.legOver": "Leg terminado",
  "x01.play.setOver": "Set terminado",
  "x01.play.nextLeg": "Siguiente leg",
  "x01.play.nextSet": "Siguiente set",
  "x01.play.backToConfig": "Volver a los ajustes",
  "x01.play.saveInHistory": "Guardar en el historial",

  // -----------------------------
  // CRICKET (JUEGO + PARAMS)
  // -----------------------------
  "cricket.config.title": "Ajustes Cricket",
  "cricket.config.players": "Jugadores",
  "cricket.config.raceTo.label": "Puntos o legs",
  "cricket.config.pointsWin": "Victoria a puntos",
  "cricket.config.legsWin": "Victoria a legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Dianas",
  "cricket.play.hits": "Hits",
  "cricket.play.score": "Puntuación",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Turno de",
  "cricket.play.open": "Abierto",
  "cricket.play.closed": "Cerrado",
  "cricket.stats.title": "Stats Cricket",
  "cricket.stats.profile": "Perfil Cricket",
  "cricket.stats.bestMpr": "Mejor MPR",
  "cricket.stats.averageMpr": "MPR medio",
  "cricket.stats.gamesPlayed": "Partidas jugadas",
  "cricket.stats.gamesWon": "Partidas ganadas",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Entrenamiento",
  "training.menu.subtitle": "Trabaja tus puntos fuertes",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "Seguimiento detallado de cada dardo.",
  "training.menu.clock": "Ronda del reloj",
  "training.menu.clock.desc": "Recorre todas las dianas.",
  "training.menu.evolution": "Curva de evolución",
  "training.menu.evolution.desc": "Visualiza tu progreso en el tiempo.",
  "training.menu.custom": "Sesión personalizada",
  "training.menu.resumeLast": "Reanudar última sesión",
  "training.menu.noSession": "Aún no hay sesiones guardadas",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Análisis de cada dardo",
  "training.x01.targetScore.label": "Puntuación inicial",
  "training.x01.throws": "Dardos lanzados",
  "training.x01.hitsBySegment": "Hits por segmento",
  "training.x01.hits.single": "Simples",
  "training.x01.hits.double": "Dobles",
  "training.x01.hits.triple": "Triples",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Media / dardo",
  "training.x01.session.save": "Guardar sesión",
  "training.x01.session.saved": "Sesión guardada",
  "training.x01.session.delete": "Eliminar sesión",
  "training.x01.session.confirmDelete":
    "¿Eliminar definitivamente esta sesión de entrenamiento?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Ronda del reloj",
  "training.clock.subtitle": "Toca cada número en orden",
  "training.clock.objective.label": "Objetivo",
  "training.clock.objective.allSingles": "Todos los simples",
  "training.clock.objective.allDoubles": "Todos los dobles",
  "training.clock.objective.allTriples": "Todos los triples",
  "training.clock.objective.custom": "Recorrido personalizado",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Sin timer",
  "training.clock.timer.30": "30 segundos",
  "training.clock.timer.60": "60 segundos",
  "training.clock.timer.120": "120 segundos",
  "training.clock.players": "Jugadores",
  "training.clock.start": "Iniciar entrenamiento",
  "training.clock.currentTarget": "Diana actual",
  "training.clock.progress": "Progreso",
  "training.clock.session.save": "Guardar esta sesión",
  "training.clock.session.saved": "Sesión del reloj guardada",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Centro de estadísticas",
  "stats.shell.tabs.local": "Perfiles locales",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Historial",
  "stats.shell.info": "Elige una sección de stats.",
  "stats.hub.local.title": "Stats de perfiles locales",
  "stats.hub.local.selectProfile":
    "Selecciona un perfil para ver las stats",
  "stats.hub.training.title": "Stats Training",
  "stats.hub.online.title": "Stats Online",
  "stats.hub.history.title": "Historial de partidos",
  "stats.hub.kpi.avg3": "Media /3 dardos",
  "stats.hub.kpi.winRate": "Porcentaje de victoria",
  "stats.hub.kpi.bestLeg": "Mejor leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Forma reciente",
  "stats.hub.radar.skills": "Radar de habilidades",
  "stats.hub.training.clock": "Ronda del reloj",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Volumen de entrenamiento",
  "stats.hub.empty": "Aún no hay stats disponibles",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Historial de partidos",
  "history.subtitle": "Tus últimos partidos",
  "history.filter.all": "Todos",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Aún no hay partidos guardados",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Entrenamiento",
  "history.details.title": "Detalles del partido",
  "history.details.players": "Jugadores",
  "history.details.winner": "Ganador",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Media /3 dardos",
  "history.details.checkout": "Checkout",
  "history.delete": "Eliminar este partido",
  "history.confirmDelete": "¿Eliminar este partido definitivamente?",

  // -----------------------------
  // ONLINE / MODO EN LÍNEA
  // -----------------------------
  "online.title": "Modo online",
  "online.subtitle": "Juega con tus amigos a distancia",
  "online.login.title": "Conexión",
  "online.login.nickname": "Apodo",
  "online.login.email": "E-mail (opcional)",
  "online.login.password": "Contraseña",
  "online.login.submit": "Conectarse",
  "online.signup.title": "Crear cuenta",
  "online.logout": "Cerrar sesión",
  "online.profile.title": "Perfil online",
  "online.profile.country": "País",
  "online.profile.bio": "Bio",
  "online.lobby.title": "Salas X01",
  "online.lobby.create": "Crear sala",
  "online.lobby.join": "Unirse a una sala",
  "online.lobby.empty": "Ninguna sala disponible por ahora",
  "online.friends.title": "Amigos",
  "online.friends.add": "Añadir amigo",
  "online.friends.status.online": "En línea",
  "online.friends.status.away": "Ausente",
  "online.friends.status.offline": "Desconectado",

  // -----------------------------
  // SETTINGS / AJUSTES
  // -----------------------------
  "settings.title": "Ajustes",
  "settings.theme.title": "Temas neón",
  "settings.theme.subtitle": "Elige tu ambiente",
  "settings.theme.current": "Tema actual",
  "settings.theme.applied": "Tema aplicado",
  "settings.lang.title": "Idioma",
  "settings.lang.subtitle": "Idioma de la app",
  "settings.lang.help": "Los textos de la interfaz están traducidos.",
  "settings.section.language": "Idioma",
  "settings.section.theme": "Temas",
  "settings.section.misc": "Otros ajustes",
  "settings.misc.sounds": "Sonidos",
  "settings.misc.vibrations": "Vibraciones",
  "settings.misc.animations": "Animaciones visuales",
  "settings.misc.resetApp": "Reiniciar la app",
  "settings.misc.resetConfirm":
    "¿Reiniciar todos los datos locales (perfiles, historial, training)?",

  // Bloque extra de ajustes (Settings.tsx)
  "settings.back": "Atrás",
  "settings.subtitle":
    "Personaliza el tema y el idioma de la app",

  "settings.theme": "Tema",
  "settings.theme.group.neons": "Neones clásicos",
  "settings.theme.group.soft": "Colores suaves",
  "settings.theme.group.dark": "Temas Dark Premium",

  "settings.theme.gold.label": "Gold neón",
  "settings.theme.gold.desc": "Tema dorado premium",

  "settings.theme.pink.label": "Rosa flúor",
  "settings.theme.pink.desc": "Ambiente arcade rosa",

  "settings.theme.petrol.label": "Azul petróleo",
  "settings.theme.petrol.desc": "Azul neón profundo",

  "settings.theme.green.label": "Verde neón",
  "settings.theme.green.desc": "Estilo de práctica luminoso",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Violeta / magenta intenso",

  "settings.theme.red.label": "Rojo",
  "settings.theme.red.desc": "Rojo arcade agresivo",

  "settings.theme.orange.label": "Naranja",
  "settings.theme.orange.desc": "Naranja cálido y enérgico",

  "settings.theme.white.label": "Blanco",
  "settings.theme.white.desc": "Fondo claro moderno",

  "settings.theme.blueOcean.label": "Azul océano",
  "settings.theme.blueOcean.desc": "Azul océano / cielo natural",

  "settings.theme.limeYellow.label": "Amarillo lima",
  "settings.theme.limeYellow.desc": "Color lima súper llamativo",

  "settings.theme.sage.label": "Verde salvia",
  "settings.theme.sage.desc": "Tonos verdes naturales y suaves",

  "settings.theme.skyBlue.label": "Azul pastel",
  "settings.theme.skyBlue.desc": "Azul muy suave y luminoso",

  "settings.theme.darkTitanium.label": "Titanio oscuro",
  "settings.theme.darkTitanium.desc": "Look metálico mate premium",

  "settings.theme.darkCarbon.label": "Carbono",
  "settings.theme.darkCarbon.desc":
    "Ambiente moderno de fibra de carbono",

  "settings.theme.darkFrost.label": "Escarcha oscura",
  "settings.theme.darkFrost.desc": "Negro helado futurista",

  "settings.theme.darkObsidian.label": "Obsidiana",
  "settings.theme.darkObsidian.desc":
    "Negro pulido premium y muy legible",

  "settings.lang": "Idioma",

  "settings.reset.title": "Reiniciar la aplicación",
  "settings.reset.subtitle":
    "Borra todos los perfiles locales, BOTS, stats, historial de partidos y ajustes. Acción definitiva.",
  "settings.reset.button": "Reiniciar todo",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync y compartir",
  "sync.subtitle": "Guarda y comparte tus datos",
  "sync.tabs.local": "Local",
  "sync.tabs.peer": "Device a device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Export local",
  "sync.local.export.desc":
    "Copia este JSON para guardarlo en otro lugar.",
  "sync.local.export.button": "Generar export",
  "sync.local.import.title": "Import local",
  "sync.local.import.desc":
    "Pega aquí un JSON exportado desde otro dispositivo.",
  "sync.local.import.button": "Importar JSON",
  "sync.local.import.success": "Import correcto",
  "sync.local.import.error": "Import imposible, JSON no válido.",
  "sync.peer.soon": "Sync device-a-device disponible pronto",
  "sync.cloud.soon": "Sync Cloud disponible pronto",

  // -----------------------------
  // LABELS / VARIOS
  // -----------------------------
  "label.points": "Puntos",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Media /3 dardos",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volumen",
  "label.duration": "Duración",
  "label.date": "Fecha",
  "label.mode": "Modo",

  // Nombres de idiomas (ES)
  "lang.fr": "Francés",
  "lang.en": "Inglés",
  "lang.es": "Español",
  "lang.de": "Alemán",
  "lang.it": "Italiano",
  "lang.pt": "Portugués",
  "lang.nl": "Neerlandés",
  "lang.ru": "Ruso",
  "lang.zh": "Chino",
  "lang.ja": "Japonés",
  "lang.ar": "Árabe",
  "lang.hi": "Hindi",
  "lang.tr": "Turco",
  "lang.da": "Danés",
  "lang.no": "Noruego",
  "lang.sv": "Sueco",
  "lang.is": "Islandés",
  "lang.pl": "Polaco",
  "lang.ro": "Rumano",
  "lang.sr": "Serbio",
  "lang.hr": "Croata",
  "lang.cs": "Checo",
};

export default es;
