// ============================================
// src/i18n/pt.ts
// Dicionário Português (PT) — v1 completo
// ============================================

import type { Dict } from "../contexts/LangContext";

export const pt: Dict = {
  // -----------------------------
  // NAVEGAÇÃO / TABS
  // -----------------------------
  "nav.home": "Início",
  "nav.local": "Local",
  "nav.games": "Jogos",
  "nav.training": "Treino",
  "nav.online": "Online",
  "nav.stats": "Estatísticas",
  "nav.settings": "Configurações",
  "nav.profiles": "Perfis",
  "nav.sync": "Sync & partilha",
  "nav.back": "Voltar",
  "nav.close": "Fechar",

  // -----------------------------
  // GENÉRICO / COMUM
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Cancelar",
  "common.yes": "Sim",
  "common.no": "Não",
  "common.save": "Guardar",
  "common.edit": "Editar",
  "common.delete": "Apagar",
  "common.confirm": "Confirmar",
  "common.next": "Seguinte",
  "common.prev": "Anterior",
  "common.start": "Começar",
  "common.continue": "Continuar",
  "common.resume": "Retomar",
  "common.pause": "Pausa",
  "common.reset": "Repor",
  "common.shuffle": "Aleatório",
  "common.loading": "A carregar…",
  "common.error": "Ocorreu um erro",
  "common.info": "Info",
  "common.stats": "Estatísticas",
  "common.history": "Histórico",
  "common.tutorial": "Tutorial",
  "common.exit": "Sair",
  "common.backHome": "Voltar ao início",
  "common.player": "Jogador",
  "common.players": "Jogadores",
  "common.team": "Equipa",
  "common.teams": "Equipas",
  "common.points": "Pontos",
  "common.average": "Média",
  "common.best": "Melhor",
  "common.worst": "Pior",
  "common.total": "Total",
  "common.date": "Data",
  "common.time": "Hora",

  // -----------------------------
  // HOME / DASHBOARD
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "Centro de controlo MULTISPORTS SCORING",

  "status.online": "Online",
  "status.away": "Ausente",
  "status.offline": "Offline",

  // Bandeau haut
  "home.welcome": "Bem-vindo",
  "home.welcome.noProfile": "Bem-vindo ao MULTISPORTS SCORING",
  "home.hero.tagline": "Pronto para lançar umas setas?",

  // Carta perfil ativo
  "home.activeProfile.title": "Perfil ativo",
  "home.activeProfile.none": "Nenhum perfil selecionado",
  "home.activeProfile.select": "Selecionar um perfil",
  "home.activeProfile.manage": "Gerir perfis",
  "home.activeProfile.status.online": "Ligado",
  "home.activeProfile.status.offline": "Offline",
  "home.activeProfile.status.guest": "Convidado",
  "home.activeProfile.badge.you": "Tu",
  "home.activeProfile.badge.local": "Local",
  "home.activeProfile.badge.online": "Online",

  // Stats rápidas
  "home.activeProfile.stats.title": "Stats rápidas",
  "home.activeProfile.stats.x01Avg": "Média X01",
  "home.activeProfile.stats.cricketMpr": "MPR Cricket",
  "home.activeProfile.stats.trainingVolume": "Volume de treino",
  "home.activeProfile.stats.lastGame": "Último jogo",
  "home.activeProfile.stats.noGames": "Ainda sem jogos",
  "home.activeProfile.stats.seeAll": "Ver todas as stats",

  // Ações rápidas
  "home.quickActions.title": "Ações rápidas",
  "home.quickActions.playX01": "Iniciar X01",
  "home.quickActions.playCricket": "Iniciar Cricket",
  "home.quickActions.training": "Abrir Treino",
  "home.quickActions.stats": "Ver estatísticas",

  // Carrossel de stats
  "home.statsCarousel.title": "Stats rápidas",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Treino",

  // Bandeau arcade
  "home.arcadeBanner.title": "Info & novidades",
  "home.arcadeBanner.tapForMore": "Toca para ver mais detalhes",
  "home.arcadeBanner.empty": "Nenhuma informação para mostrar",
  "home.arcadeBanner.tag.new": "Novo",
  "home.arcadeBanner.tag.tip": "Dica",
  "home.arcadeBanner.tag.update": "Atualização",

  // Botões de navegação grandes
  "home.nav.profiles": "Perfis",
  "home.nav.profiles.desc": "Perfis locais, avatares & BOTS",
  "home.nav.local": "Local",
  "home.nav.local.desc": "Jogar presencialmente neste alvo",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Jogos à distância com amigos",
  "home.nav.training": "Treino",
  "home.nav.training.desc": "Módulos de treino detalhados",
  "home.nav.stats": "Stats",
  "home.nav.stats.desc": "Dashboards, curvas, histórico",
  "home.nav.settings": "Configurações",
  "home.nav.settings.desc": "Temas, idioma, reset completo",

  // Ticker arcade
  "home.ticker.records": "Últimos recordes",
  "home.ticker.records.text":
    "Vários recordes batidos recentemente, continua assim!",

  "home.ticker.localLast": "Último jogo local",
  "home.ticker.localLast.text":
    "Resumo do último jogo jogado em local.",

  "home.ticker.onlineLast": "Último jogo online",
  "home.ticker.onlineLast.text":
    "O teu último duelo online está pronto para a desforra.",

  "home.ticker.onlineLeader": "Líder do ranking",
  "home.ticker.onlineLeader.text":
    "Descobre quem está no topo do ranking online.",

  "home.ticker.training": "Treino do momento",
  "home.ticker.training.text":
    "Total de sessões de X01 Training e Giro do Relógio.",

  "home.ticker.month": "Stats do mês",
  "home.ticker.month.text":
    "Total de jogos e hits neste mês.",

  "home.ticker.tip": "Dica do dia",
  "home.ticker.tip.text":
    "Consolida o teu checkout preferido repetindo-o regularmente.",

  // -----------------------------
  // GAMES (LISTA DE JOGOS LOCAIS)
  // -----------------------------
  "games.title": "Todos os jogos",
  "games.subtitle": "Escolhe um modo de jogo",
  "games.section.classic": "Clássicos",
  "games.section.training": "Treino",
  "games.section.party": "Fun & party",
  "games.section.other": "Outros modos",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… termina exatamente em 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 a 20 + Bull, abre/fecha e marca pontos.",

  "games.killer.title": "Killer",
  "games.killer.desc": "Torna-te killer e elimina os outros.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Um número por ronda, acerta S / D / T.",

  "games.training.menuTitle": "Treino",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Giro do Relógio",
  "games.training.custom": "Treino personalizado",
  "games.training.evolution": "Stats de evolução",

  "games.info.title": "Info do jogo",
  "games.info.rules": "Regras",
  "games.info.tips": "Dicas",

  // -----------------------------
  // PERFIS LOCAIS
  // -----------------------------
  "profiles.title": "Perfis locais",
  "profiles.subtitle": "Gere os teus jogadores locais",
  "profiles.add": "Adicionar perfil",
  "profiles.edit": "Editar perfil",
  "profiles.delete": "Apagar perfil",
  "profiles.confirmDelete":
    "Apagar definitivamente este perfil?",
  "profiles.name.label": "Nome do jogador",
  "profiles.name.placeholder": "Escolhe um nickname",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Avatar aleatório",
  "profiles.stats.title": "Stats do perfil",
  "profiles.stats.x01": "Stats X01",
  "profiles.stats.cricket": "Stats Cricket",
  "profiles.stats.training": "Stats Training",
  "profiles.status.active": "Ativo",
  "profiles.status.inactive": "Inativo",
  "profiles.selectActive": "Definir como perfil ativo",
  "profiles.list.empty": "Ainda não há perfis",
  "profiles.list.selectHint":
    "Toca num perfil para o selecionar",
  "profiles.hint.avatarTap":
    "Toca no medalhão para mudar o avatar",

  // -----------------------------
  // AVATAR CREATOR / MEDALHÕES
  // -----------------------------
  "avatar.title": "Criador de avatar",
  "avatar.subtitle": "Personaliza o teu medalhão",
  "avatar.style.label": "Estilo",
  "avatar.style.realistic": "Realismo leve",
  "avatar.style.comic": "Comic",
  "avatar.style.flat": "Flat design",
  "avatar.style.exaggerated": "Exagerado",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Pré-visualização",
  "avatar.generate": "Gerar novo avatar",
  "avatar.keep": "Manter este avatar",
  "avatar.cancel": "Cancelar alterações",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "Configurações X01",
  "x01.config.subtitle": "Prepara o teu jogo",
  "x01.config.section.players": "Jogadores",
  "x01.config.section.match": "Formato de jogo",
  "x01.config.section.rules": "Configurações base",
  "x01.config.players.add": "Adicionar jogador",
  "x01.config.players.remove": "Remover",
  "x01.config.players.teams": "Equipas",
  "x01.config.mode.label": "Modo de jogo",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Equipas",
  "x01.config.raceToSets.label": "Sets para vencer",
  "x01.config.raceToLegs.label": "Legs para vencer",
  "x01.config.startingScore.label": "Pontuação inicial",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Personalizado",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Serviço",
  "x01.config.service.random": "Aleatório",
  "x01.config.service.alternate": "Alternado",
  "x01.config.bots.title": "BOTS (IA)",
  "x01.config.bots.add": "Adicionar bot",
  "x01.config.bots.level.easy": "Fácil",
  "x01.config.bots.level.medium": "Médio",
  "x01.config.bots.level.hard": "Difícil",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Iniciar jogo",
  "x01.config.back": "Voltar aos jogos",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Vez de",
  "x01.play.scoreRemaining": "Restantes",
  "x01.play.lastVisit": "Última visita",
  "x01.play.average3": "Média / 3 setas",
  "x01.play.bestVisit": "Melhor visita",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Setas lançadas",
  "x01.play.visits": "Visitas",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Anular visita",
  "x01.play.confirmExit": "Sair do jogo em curso?",
  "x01.play.botThinking": "O bot está a jogar…",
  "x01.play.noScoreYet": "Ainda sem pontuação",
  "x01.play.matchOver": "Jogo terminado",
  "x01.play.legOver": "Leg terminado",
  "x01.play.setOver": "Set terminado",
  "x01.play.nextLeg": "Próximo leg",
  "x01.play.nextSet": "Próximo set",
  "x01.play.backToConfig": "Voltar às configurações",
  "x01.play.saveInHistory": "Guardar no histórico",

  // -----------------------------
  // CRICKET (JOGO + PARAMS)
  // -----------------------------
  "cricket.config.title": "Configurações Cricket",
  "cricket.config.players": "Jogadores",
  "cricket.config.raceTo.label": "Pontos ou legs",
  "cricket.config.pointsWin": "Vitória por pontos",
  "cricket.config.legsWin": "Vitória por legs",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Alvos",
  "cricket.play.hits": "Hits",
  "cricket.play.score": "Pontuação",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Vez de",
  "cricket.play.open": "Aberto",
  "cricket.play.closed": "Fechado",
  "cricket.stats.title": "Stats Cricket",
  "cricket.stats.profile": "Perfil Cricket",
  "cricket.stats.bestMpr": "Melhor MPR",
  "cricket.stats.averageMpr": "MPR médio",
  "cricket.stats.gamesPlayed": "Jogos jogados",
  "cricket.stats.gamesWon": "Jogos ganhos",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Treino",
  "training.menu.subtitle": "Trabalha os teus pontos fortes",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Acompanhamento detalhado de cada seta.",
  "training.menu.clock": "Giro do Relógio",
  "training.menu.clock.desc":
    "Dá a volta a todos os alvos.",
  "training.menu.evolution": "Curva de evolução",
  "training.menu.evolution.desc":
    "Vê a tua progressão ao longo do tempo.",
  "training.menu.custom": "Sessão personalizada",
  "training.menu.resumeLast": "Retomar última sessão",
  "training.menu.noSession":
    "Nenhuma sessão gravada ainda",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Análise de cada seta",
  "training.x01.targetScore.label": "Pontuação inicial",
  "training.x01.throws": "Setas lançadas",
  "training.x01.hitsBySegment": "Hits por segmento",
  "training.x01.hits.single": "Simples",
  "training.x01.hits.double": "Dobles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "Média / seta",
  "training.x01.session.save": "Guardar sessão",
  "training.x01.session.saved": "Sessão guardada",
  "training.x01.session.delete": "Apagar sessão",
  "training.x01.session.confirmDelete":
    "Apagar definitivamente esta sessão de treino?",

  // -----------------------------
  // TRAINING CLOCK (GIRO DO RELÓGIO)
  // -----------------------------
  "training.clock.title": "Giro do Relógio",
  "training.clock.subtitle":
    "Acerta em cada número pela ordem",
  "training.clock.objective.label": "Objetivo",
  "training.clock.objective.allSingles": "Todos os simples",
  "training.clock.objective.allDoubles": "Todos os doubles",
  "training.clock.objective.allTriples": "Todos os trebles",
  "training.clock.objective.custom": "Percurso personalizado",
  "training.clock.timer.label": "Timer",
  "training.clock.timer.off": "Sem timer",
  "training.clock.timer.30": "30 segundos",
  "training.clock.timer.60": "60 segundos",
  "training.clock.timer.120": "120 segundos",
  "training.clock.players": "Jogadores",
  "training.clock.start": "Iniciar treino",
  "training.clock.currentTarget": "Alvo atual",
  "training.clock.progress": "Progresso",
  "training.clock.session.save": "Guardar sessão",
  "training.clock.session.saved":
    "Sessão do relógio guardada",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "Centro de estatísticas",
  "stats.shell.tabs.local": "Perfis locais",
  "stats.shell.tabs.training": "Treino",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Histórico",
  "stats.shell.info": "Escolhe uma secção de stats.",
  "stats.hub.local.title": "Stats dos perfis locais",
  "stats.hub.local.selectProfile":
    "Seleciona um perfil para ver as stats",
  "stats.hub.training.title": "Stats de Treino",
  "stats.hub.online.title": "Stats Online",
  "stats.hub.history.title": "Histórico de jogos",
  "stats.hub.kpi.avg3": "Média /3 setas",
  "stats.hub.kpi.winRate": "Taxa de vitória",
  "stats.hub.kpi.bestLeg": "Melhor leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Forma recente",
  "stats.hub.radar.skills": "Radar de skills",
  "stats.hub.training.clock": "Giro do Relógio",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Volume de treino",
  "stats.hub.empty": "Ainda não há stats disponíveis",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Histórico de jogos",
  "history.subtitle": "Os teus últimos jogos",
  "history.filter.all": "Todos",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Treino",
  "history.empty": "Ainda não há jogos gravados",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Treino",
  "history.details.title": "Detalhes do jogo",
  "history.details.players": "Jogadores",
  "history.details.winner": "Vencedor",
  "history.details.legs": "Legs",
  "history.details.sets": "Sets",
  "history.details.avg3": "Média /3 setas",
  "history.details.checkout": "Checkout",
  "history.delete": "Apagar jogo",
  "history.confirmDelete":
    "Apagar definitivamente este jogo?",

  // -----------------------------
  // ONLINE / MODO ONLINE
  // -----------------------------
  "online.title": "Modo online",
  "online.subtitle": "Joga à distância com os teus amigos",
  "online.login.title": "Login",
  "online.login.nickname": "Nickname",
  "online.login.email": "E-mail (opcional)",
  "online.login.password": "Palavra-passe",
  "online.login.submit": "Entrar",
  "online.signup.title": "Criar conta",
  "online.logout": "Terminar sessão",
  "online.profile.title": "Perfil online",
  "online.profile.country": "País",
  "online.profile.bio": "Bio",
  "online.lobby.title": "Lobbies X01",
  "online.lobby.create": "Criar lobby",
  "online.lobby.join": "Entrar num lobby",
  "online.lobby.empty": "Nenhum lobby disponível",
  "online.friends.title": "Amigos",
  "online.friends.add": "Adicionar amigo",
  "online.friends.status.online": "Online",
  "online.friends.status.away": "Ausente",
  "online.friends.status.offline": "Offline",

  // -----------------------------
  // SETTINGS / CONFIGURAÇÕES
  // -----------------------------
  "settings.title": "Configurações",
  "settings.theme.title": "Temas neon",
  "settings.theme.subtitle": "Escolhe o teu ambiente",
  "settings.theme.current": "Tema atual",
  "settings.theme.applied": "Tema aplicado",
  "settings.lang.title": "Idioma",
  "settings.lang.subtitle": "Idioma da app",
  "settings.lang.help":
    "Os textos da interface estão traduzidos.",
  "settings.section.language": "Idioma",
  "settings.section.theme": "Temas",
  "settings.section.misc": "Outras opções",
  "settings.misc.sounds": "Sons",
  "settings.misc.vibrations": "Vibrações",
  "settings.misc.animations": "Animações visuais",
  "settings.misc.resetApp": "Repor app",
  "settings.misc.resetConfirm":
    "Repor todos os dados locais (perfis, histórico, treino)?",

  // EXTRA Settings (conforme Settings.tsx)
  "settings.back": "Voltar",
  "settings.subtitle":
    "Personaliza o tema e o idioma da aplicação",
  "settings.theme": "Tema",
  "settings.theme.group.neons": "Neons clássicos",
  "settings.theme.group.soft": "Cores suaves",
  "settings.theme.group.dark": "Temas Dark Premium",

  "settings.theme.gold.label": "Gold neon",
  "settings.theme.gold.desc": "Tema dourado premium",

  "settings.theme.pink.label": "Rosa neon",
  "settings.theme.pink.desc": "Ambiente arcade rosa",

  "settings.theme.petrol.label": "Azul petróleo",
  "settings.theme.petrol.desc": "Azul neon profundo",

  "settings.theme.green.label": "Verde neon",
  "settings.theme.green.desc": "Estilo de treino luminoso",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Violeta / magenta intenso",

  "settings.theme.red.label": "Vermelho",
  "settings.theme.red.desc": "Vermelho arcade agressivo",

  "settings.theme.orange.label": "Laranja",
  "settings.theme.orange.desc": "Laranja quente e energético",

  "settings.theme.white.label": "Branco",
  "settings.theme.white.desc": "Tema claro moderno",

  "settings.theme.blueOcean.label": "Azul oceano",
  "settings.theme.blueOcean.desc":
    "Azul natural oceano / céu",

  "settings.theme.limeYellow.label": "Amarelo lima",
  "settings.theme.limeYellow.desc":
    "Cor lima super brilhante",

  "settings.theme.sage.label": "Verde sálvia",
  "settings.theme.sage.desc":
    "Tons verdes suaves e naturais",

  "settings.theme.skyBlue.label": "Azul pastel",
  "settings.theme.skyBlue.desc":
    "Azul muito suave e luminoso",

  "settings.theme.darkTitanium.label": "Titânio escuro",
  "settings.theme.darkTitanium.desc":
    "Look metálico premium mate",

  "settings.theme.darkCarbon.label": "Carbono",
  "settings.theme.darkCarbon.desc":
    "Ambiente moderno em fibra de carbono",

  "settings.theme.darkFrost.label": "Gelo escuro",
  "settings.theme.darkFrost.desc":
    "Preto gelado futurista",

  "settings.theme.darkObsidian.label": "Obsidiana",
  "settings.theme.darkObsidian.desc":
    "Preto polido premium e legível",

  "settings.lang": "Idioma",

  "settings.reset.title": "Repor a aplicação",
  "settings.reset.subtitle":
    "Apaga todos os perfis locais, BOTS, stats, histórico de jogos e definições. Ação definitiva.",
  "settings.reset.button": "Repor tudo",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Sync & partilha",
  "sync.subtitle": "Guarda e partilha os teus dados",
  "sync.tabs.local": "Local",
  "sync.tabs.peer": "Device-to-device",
  "sync.tabs.cloud": "Cloud",
  "sync.local.export.title": "Export local",
  "sync.local.export.desc":
    "Copia este JSON para o guardar noutro sítio.",
  "sync.local.export.button": "Gerar export",
  "sync.local.import.title": "Import local",
  "sync.local.import.desc":
    "Cola aqui um JSON exportado de outro dispositivo.",
  "sync.local.import.button": "Importar JSON",
  "sync.local.import.success": "Import concluído",
  "sync.local.import.error":
    "Import falhou, JSON inválido.",
  "sync.peer.soon": "Sync device-to-device em breve",
  "sync.cloud.soon": "Sync Cloud em breve",

  // -----------------------------
  // LABELS / ETIQUETAS
  // -----------------------------
  "label.points": "Pontos",
  "label.legs": "Legs",
  "label.sets": "Sets",
  "label.avg3": "Média /3 setas",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Volume",
  "label.duration": "Duração",
  "label.date": "Data",
  "label.mode": "Modo",

  // -----------------------------
  // NOMES DAS LÍNGUAS
  // -----------------------------
  "lang.fr": "Francês",
  "lang.en": "Inglês",
  "lang.es": "Espanhol",
  "lang.de": "Alemão",
  "lang.it": "Italiano",
  "lang.pt": "Português",
  "lang.nl": "Holandês",
  "lang.ru": "Russo",
  "lang.zh": "Chinês",
  "lang.ja": "Japonês",
  "lang.ar": "Árabe",
  "lang.hi": "Hindi",
  "lang.tr": "Turco",
  "lang.da": "Dinamarquês",
  "lang.no": "Norueguês",
  "lang.sv": "Sueco",
  "lang.is": "Islandês",
  "lang.pl": "Polaco",
  "lang.ro": "Romeno",
  "lang.sr": "Sérvio",
  "lang.hr": "Croata",
  "lang.cs": "Checo",
};

export default pt;
