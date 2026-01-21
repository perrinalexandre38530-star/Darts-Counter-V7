// ============================================
// src/i18n/ru.ts
// Русский (RU) — Полный словарь v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const ru: Dict = {
  // -----------------------------
  // НАВИГАЦИЯ / ВКЛАДКИ
  // -----------------------------
  "nav.home": "Главная",
  "nav.local": "Локально",
  "nav.games": "Игры",
  "nav.training": "Тренировка",
  "nav.online": "Онлайн",
  "nav.stats": "Статистика",
  "nav.settings": "Настройки",
  "nav.profiles": "Профили",
  "nav.sync": "Синхронизация и обмен",
  "nav.back": "Назад",
  "nav.close": "Закрыть",

  // -----------------------------
  // ОБЩЕЕ
  // -----------------------------
  "common.ok": "OK",
  "common.cancel": "Отмена",
  "common.yes": "Да",
  "common.no": "Нет",
  "common.save": "Сохранить",
  "common.edit": "Редактировать",
  "common.delete": "Удалить",
  "common.confirm": "Подтвердить",
  "common.next": "Далее",
  "common.prev": "Назад",
  "common.start": "Начать",
  "common.continue": "Продолжить",
  "common.resume": "Возобновить",
  "common.pause": "Пауза",
  "common.reset": "Сбросить",
  "common.shuffle": "Случайно",
  "common.loading": "Загрузка…",
  "common.error": "Произошла ошибка",
  "common.info": "Инфо",
  "common.stats": "Статистика",
  "common.history": "История",
  "common.tutorial": "Обучение",
  "common.exit": "Выйти",
  "common.backHome": "На главную",
  "common.player": "Игрок",
  "common.players": "Игроки",
  "common.team": "Команда",
  "common.teams": "Команды",
  "common.points": "Очки",
  "common.average": "Среднее",
  "common.best": "Лучшее",
  "common.worst": "Худшее",
  "common.total": "Итого",
  "common.date": "Дата",
  "common.time": "Время",

  // -----------------------------
  // HOME / DASHBOARD
  // -----------------------------
  "home.title": "Дэшборд",
  "home.subtitle": "Центр управления MULTISPORTS SCORING",

  "status.online": "В сети",
  "status.away": "Отошёл",
  "status.offline": "Не в сети",

  "home.welcome": "Добро пожаловать",
  "home.welcome.noProfile": "Добро пожаловать в MULTISPORTS SCORING",
  "home.hero.tagline": "Готов бросить пару дротиков?",

  // Активный профиль
  "home.activeProfile.title": "Активный профиль",
  "home.activeProfile.none": "Профиль не выбран",
  "home.activeProfile.select": "Выбрать профиль",
  "home.activeProfile.manage": "Управление профилями",
  "home.activeProfile.status.online": "Подключён",
  "home.activeProfile.status.offline": "Не в сети",
  "home.activeProfile.status.guest": "Гость",
  "home.activeProfile.badge.you": "Вы",
  "home.activeProfile.badge.local": "Локальный",
  "home.activeProfile.badge.online": "Онлайн",

  // Быстрые статистики в карте профиля
  "home.activeProfile.stats.title": "Быстрые статсы",
  "home.activeProfile.stats.x01Avg": "Среднее X01",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Объём тренинга",
  "home.activeProfile.stats.lastGame": "Последний матч",
  "home.activeProfile.stats.noGames": "Матчей ещё нет",
  "home.activeProfile.stats.seeAll": "Все статистики",

  // Быстрые действия
  "home.quickActions.title": "Быстрые действия",
  "home.quickActions.playX01": "Запустить X01",
  "home.quickActions.playCricket": "Запустить Cricket",
  "home.quickActions.training": "Открыть тренинг",
  "home.quickActions.stats": "Показать статистику",

  // Карусель статсов
  "home.statsCarousel.title": "Быстрые статсы",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Тренинг",

  // ArcadeTicker / баннер
  "home.arcadeBanner.title": "Инфо и новости",
  "home.arcadeBanner.tapForMore": "Нажмите для подробностей",
  "home.arcadeBanner.empty": "Пока нет информации для отображения",
  "home.arcadeBanner.tag.new": "Новое",
  "home.arcadeBanner.tag.tip": "Совет",
  "home.arcadeBanner.tag.update": "Обновление",

  // Крупные кнопки навигации
  "home.nav.profiles": "Профили",
  "home.nav.profiles.desc": "Локальные профили, аватары и боты",
  "home.nav.local": "Локальный режим",
  "home.nav.local.desc": "Игра на этой мишени",
  "home.nav.online": "Онлайн",
  "home.nav.online.desc": "Матчи на расстоянии",
  "home.nav.training": "Тренинг",
  "home.nav.training.desc": "Подробные режимы тренировки",
  "home.nav.stats": "Статистика",
  "home.nav.stats.desc": "Дэшборды, графики, история",
  "home.nav.settings": "Настройки",
  "home.nav.settings.desc": "Темы, язык и полный сброс",

  // Ticker — тексты
  "home.ticker.records": "Последние рекорды",
  "home.ticker.records.text":
    "Недавно было побито несколько рекордов — продолжай в том же духе!",

  "home.ticker.localLast": "Последний локальный матч",
  "home.ticker.localLast.text":
    "Краткий обзор последнего локального матча.",

  "home.ticker.onlineLast": "Последний онлайн матч",
  "home.ticker.onlineLast.text":
    "Твой последний онлайн матч ждёт реванша.",

  "home.ticker.onlineLeader": "Лидер рейтинга",
  "home.ticker.onlineLeader.text":
    "Узнай, кто сейчас на вершине онлайн рейтинга.",

  "home.ticker.training": "Тренинг сейчас",
  "home.ticker.training.text":
    "Всего сессий X01 Training и «Часы».",

  "home.ticker.month": "Статистика за месяц",
  "home.ticker.month.text":
    "Общее количество матчей и попаданий за этот месяц.",

  "home.ticker.tip": "Совет дня",
  "home.ticker.tip.text":
    "Закрепляй любимый финиш, регулярно отрабатывая его.",

  // -----------------------------
  // GAMES / ИГРЫ
  // -----------------------------
  "games.title": "Все игры",
  "games.subtitle": "Выберите режим игры",
  "games.section.classic": "Классические",
  "games.section.training": "Тренировка",
  "games.section.party": "Весёлые",
  "games.section.other": "Другие режимы",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… закончите ровно на 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull. Открывайте/закрывайте и набирайте очки.",

  "games.killer.title": "Killer",
  "games.killer.desc": "Станьте киллером и выбейте остальных.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Один номер за раунд, цельтесь в S / D / T.",

  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Часы",
  "games.training.custom": "Пользовательский тренинг",
  "games.training.evolution": "Статистика прогресса",

  "games.info.title": "Инфо об игре",
  "games.info.rules": "Правила",
  "games.info.tips": "Советы",

  // -----------------------------
  // ЛОКАЛЬНЫЕ ПРОФИЛИ
  // -----------------------------
  "profiles.title": "Локальные профили",
  "profiles.subtitle": "Управление вашими локальными игроками",
  "profiles.add": "Добавить профиль",
  "profiles.edit": "Редактировать профиль",
  "profiles.delete": "Удалить профиль",
  "profiles.confirmDelete":
    "Удалить этот профиль окончательно?",
  "profiles.name.label": "Имя игрока",
  "profiles.name.placeholder": "Введите никнейм",
  "profiles.avatar.label": "Аватар",
  "profiles.avatar.random": "Случайный аватар",
  "profiles.stats.title": "Статистика профиля",
  "profiles.stats.x01": "X01 статистика",
  "profiles.stats.cricket": "Cricket статистика",
  "profiles.stats.training": "Training статистика",
  "profiles.status.active": "Активен",
  "profiles.status.inactive": "Неактивен",
  "profiles.selectActive": "Сделать активным профилем",
  "profiles.list.empty": "Пока нет ни одного профиля",
  "profiles.list.selectHint":
    "Нажмите на профиль, чтобы выбрать его",
  "profiles.hint.avatarTap":
    "Нажмите на медальон, чтобы сменить аватар",

  // -----------------------------
  // AVATAR CREATOR / МЕДАЛЬОНЫ
  // -----------------------------
  "avatar.title": "Создание аватара",
  "avatar.subtitle": "Настройте свой медальон",
  "avatar.style.label": "Стиль",
  "avatar.style.realistic": "Лёгкий реализм",
  "avatar.style.comic": "Комикс",
  "avatar.style.flat": "Flat-дизайн",
  "avatar.style.exaggerated": "Утриванный",
  "avatar.theme.label": "Тема",
  "avatar.preview.label": "Превью",
  "avatar.generate": "Сгенерировать новый аватар",
  "avatar.keep": "Сохранить этот аватар",
  "avatar.cancel": "Отменить изменения",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "Настройки X01",
  "x01.config.subtitle": "Подготовьте матч",
  "x01.config.section.players": "Игроки",
  "x01.config.section.match": "Формат матча",
  "x01.config.section.rules": "Базовые настройки",
  "x01.config.players.add": "Добавить игрока",
  "x01.config.players.remove": "Удалить",
  "x01.config.players.teams": "Команды",
  "x01.config.mode.label": "Режим игры",
  "x01.config.mode.solo": "Соло",
  "x01.config.mode.multi": "Мульти",
  "x01.config.mode.teams": "Команды",
  "x01.config.raceToSets.label": "Победа по сетам",
  "x01.config.raceToLegs.label": "Победа по легам",
  "x01.config.startingScore.label": "Стартовый счёт",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Свой",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Single out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Начинает",
  "x01.config.service.random": "Случайно",
  "x01.config.service.alternate": "По очереди",
  "x01.config.bots.title": "BOTS (ИИ)",
  "x01.config.bots.add": "Добавить бота",
  "x01.config.bots.level.easy": "Лёгкий",
  "x01.config.bots.level.medium": "Средний",
  "x01.config.bots.level.hard": "Сложный",
  "x01.config.bots.level.pro": "Про",
  "x01.config.startMatch": "Запустить матч",
  "x01.config.back": "Назад к играм",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Лег",
  "x01.play.set": "Сет",
  "x01.play.currentPlayer": "Ход игрока",
  "x01.play.scoreRemaining": "Осталось",
  "x01.play.lastVisit": "Последний визит",
  "x01.play.average3": "Среднее / 3 дротика",
  "x01.play.bestVisit": "Лучший визит",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Брошено дротиков",
  "x01.play.visits": "Визиты",
  "x01.play.bust": "Баст",
  "x01.play.undo": "Отменить визит",
  "x01.play.confirmExit": "Выйти из текущего матча?",
  "x01.play.botThinking": "Бот делает ход…",
  "x01.play.noScoreYet": "Счёта пока нет",
  "x01.play.matchOver": "Матч завершён",
  "x01.play.legOver": "Лег завершён",
  "x01.play.setOver": "Сет завершён",
  "x01.play.nextLeg": "Следующий лег",
  "x01.play.nextSet": "Следующий сет",
  "x01.play.backToConfig": "Назад к настройкам",
  "x01.play.saveInHistory": "Сохранить в историю",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "Настройки Cricket",
  "cricket.config.players": "Игроки",
  "cricket.config.raceTo.label": "Очки или леги",
  "cricket.config.pointsWin": "Победа по очкам",
  "cricket.config.legsWin": "Победа по легам",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Цели",
  "cricket.play.hits": "Попадания",
  "cricket.play.score": "Счёт",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Ход игрока",
  "cricket.play.open": "Открыто",
  "cricket.play.closed": "Закрыто",
  "cricket.stats.title": "Cricket статистика",
  "cricket.stats.profile": "Cricket профиль",
  "cricket.stats.bestMpr": "Лучший MPR",
  "cricket.stats.averageMpr": "Средний MPR",
  "cricket.stats.gamesPlayed": "Сыграно матчей",
  "cricket.stats.gamesWon": "Выиграно матчей",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Тренировка",
  "training.menu.subtitle": "Прокачай свои сильные стороны",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Подробный мониторинг каждого дротика.",
  "training.menu.clock": "Часы",
  "training.menu.clock.desc":
    "Обойди все цели по кругу.",
  "training.menu.evolution": "Кривая прогресса",
  "training.menu.evolution.desc":
    "Смотри свой прогресс во времени.",
  "training.menu.custom": "Пользовательская сессия",
  "training.menu.resumeLast": "Продолжить последнюю сессию",
  "training.menu.noSession":
    "Пока нет сохранённых сессий",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Анализ каждого дротика",
  "training.x01.targetScore.label": "Стартовый счёт",
  "training.x01.throws": "Брошено дротиков",
  "training.x01.hitsBySegment": "Попадания по сегментам",
  "training.x01.hits.single": "Синглы",
  "training.x01.hits.double": "Даблы",
  "training.x01.hits.triple": "Триплы",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Басты",
  "training.x01.avgPerDart": "Среднее за дротик",
  "training.x01.session.save": "Сохранить сессию",
  "training.x01.session.saved": "Сессия сохранена",
  "training.x01.session.delete": "Удалить сессию",
  "training.x01.session.confirmDelete":
    "Удалить эту тренировочную сессию окончательно?",

  // -----------------------------
  // TRAINING CLOCK / ЧАСЫ
  // -----------------------------
  "training.clock.title": "Часы",
  "training.clock.subtitle":
    "Попадай в каждое число по порядку",
  "training.clock.objective.label": "Цель",
  "training.clock.objective.allSingles": "Все синглы",
  "training.clock.objective.allDoubles": "Все даблы",
  "training.clock.objective.allTriples": "Все триплы",
  "training.clock.objective.custom": "Свой маршрут",
  "training.clock.timer.label": "Таймер",
  "training.clock.timer.off": "Без таймера",
  "training.clock.timer.30": "30 секунд",
  "training.clock.timer.60": "60 секунд",
  "training.clock.timer.120": "120 секунд",
  "training.clock.players": "Игроки",
  "training.clock.start": "Начать тренинг",
  "training.clock.currentTarget": "Текущая цель",
  "training.clock.progress": "Прогресс",
  "training.clock.session.save": "Сохранить сессию",
  "training.clock.session.saved":
    "Сессия «Часы» сохранена",

  // -----------------------------
  // STATSHUB / ЦЕНТР СТАТИСТИКИ
  // -----------------------------
  "stats.shell.title": "Центр статистики",
  "stats.shell.tabs.local": "Локальные профили",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "История",
  "stats.shell.info": "Выберите раздел статистики.",
  "stats.hub.local.title": "Статистика локальных профилей",
  "stats.hub.local.selectProfile":
    "Выберите профиль, чтобы видеть статистику",
  "stats.hub.training.title": "Training статистика",
  "stats.hub.online.title": "Online статистика",
  "stats.hub.history.title": "История матчей",
  "stats.hub.kpi.avg3": "Среднее /3 дротика",
  "stats.hub.kpi.winRate": "Процент побед",
  "stats.hub.kpi.bestLeg": "Лучший лег",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Текущая форма",
  "stats.hub.radar.skills": "Радар навыков",
  "stats.hub.training.clock": "Часы",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Объём тренингов",
  "stats.hub.empty": "Статистики пока нет",

  // -----------------------------
  // HISTORY / ИСТОРИЯ
  // -----------------------------
  "history.title": "История матчей",
  "history.subtitle": "Ваши последние матчи",
  "history.filter.all": "Все",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Пока нет сохранённых матчей",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Тренировка",
  "history.details.title": "Детали матча",
  "history.details.players": "Игроки",
  "history.details.winner": "Победитель",
  "history.details.legs": "Леги",
  "history.details.sets": "Сеты",
  "history.details.avg3": "Среднее /3 дротика",
  "history.details.checkout": "Checkout",
  "history.delete": "Удалить матч",
  "history.confirmDelete":
    "Удалить этот матч окончательно?",

  // -----------------------------
  // ONLINE / ОНЛАЙН РЕЖИМ
  // -----------------------------
  "online.title": "Онлайн режим",
  "online.subtitle": "Играйте с друзьями на расстоянии",
  "online.login.title": "Вход",
  "online.login.nickname": "Никнейм",
  "online.login.email": "E-mail (необязательно)",
  "online.login.password": "Пароль",
  "online.login.submit": "Войти",
  "online.signup.title": "Создать аккаунт",
  "online.logout": "Выйти",
  "online.profile.title": "Онлайн профиль",
  "online.profile.country": "Страна",
  "online.profile.bio": "Био",
  "online.lobby.title": "X01 лобби",
  "online.lobby.create": "Создать лобби",
  "online.lobby.join": "Войти в лобби",
  "online.lobby.empty": "Нет доступных лобби",
  "online.friends.title": "Друзья",
  "online.friends.add": "Добавить друга",
  "online.friends.status.online": "В сети",
  "online.friends.status.away": "Отошёл",
  "online.friends.status.offline": "Не в сети",

  // -----------------------------
  // SETTINGS / НАСТРОЙКИ
  // -----------------------------
  "settings.title": "Настройки",
  "settings.theme.title": "Неоновые темы",
  "settings.theme.subtitle": "Выберите своё настроение",
  "settings.theme.current": "Текущая тема",
  "settings.theme.applied": "Тема применена",
  "settings.lang.title": "Язык",
  "settings.lang.subtitle": "Язык приложения",
  "settings.lang.help": "Тексты интерфейса переведены.",
  "settings.section.language": "Язык",
  "settings.section.theme": "Темы",
  "settings.section.misc": "Прочие настройки",
  "settings.misc.sounds": "Звуки",
  "settings.misc.vibrations": "Вибрация",
  "settings.misc.animations": "Визуальные анимации",
  "settings.misc.resetApp": "Сбросить приложение",
  "settings.misc.resetConfirm":
    "Сбросить все локальные данные (профили, история, тренинг)?",

  // Доп. блок для Settings.tsx
  "settings.back": "Назад",
  "settings.subtitle":
    "Настройте тему и язык приложения",

  "settings.theme": "Тема",
  "settings.theme.group.neons": "Классические неоны",
  "settings.theme.group.soft": "Мягкие цвета",
  "settings.theme.group.dark": "Тёмные премиум темы",

  "settings.theme.gold.label": "Золотой неон",
  "settings.theme.gold.desc": "Премиальная золотая тема",

  "settings.theme.pink.label": "Розовый неон",
  "settings.theme.pink.desc": "Аркадная розовая атмосфера",

  "settings.theme.petrol.label": "Нефтяной синий",
  "settings.theme.petrol.desc": "Глубокий неоновый синий",

  "settings.theme.green.label": "Неоновый зелёный",
  "settings.theme.green.desc": "Яркий тренировочный стиль",

  "settings.theme.magenta.label": "Маджента",
  "settings.theme.magenta.desc": "Насыщенный фиолетовый/маджента",

  "settings.theme.red.label": "Красный",
  "settings.theme.red.desc": "Агрессивный аркадный красный",

  "settings.theme.orange.label": "Оранжевый",
  "settings.theme.orange.desc": "Тёплый энергичный оранжевый",

  "settings.theme.white.label": "Белый",
  "settings.theme.white.desc": "Современная светлая тема",

  "settings.theme.blueOcean.label": "Океанический синий",
  "settings.theme.blueOcean.desc":
    "Естественный цвет океана и неба",

  "settings.theme.limeYellow.label": "Лаймовый жёлтый",
  "settings.theme.limeYellow.desc":
    "Очень яркий лаймовый цвет",

  "settings.theme.sage.label": "Шалфейный зелёный",
  "settings.theme.sage.desc":
    "Мягкие натуральные зелёные тона",

  "settings.theme.skyBlue.label": "Небесно-голубой",
  "settings.theme.skyBlue.desc":
    "Очень мягкий и светлый голубой",

  "settings.theme.darkTitanium.label": "Тёмный титан",
  "settings.theme.darkTitanium.desc":
    "Премиальный матовый металл",

  "settings.theme.darkCarbon.label": "Карбон",
  "settings.theme.darkCarbon.desc":
    "Современная карбоновая атмосфера",

  "settings.theme.darkFrost.label": "Тёмный иней",
  "settings.theme.darkFrost.desc":
    "Ледяной футуристический чёрный",

  "settings.theme.darkObsidian.label": "Обсидиан",
  "settings.theme.darkObsidian.desc":
    "Глянцевый премиальный чёрный, хорошо читается",

  "settings.lang": "Язык",

  "settings.reset.title": "Сбросить приложение",
  "settings.reset.subtitle":
    "Удалить все локальные профили, ботов, статсы, историю матчей и настройки. Действие необратимо.",
  "settings.reset.button": "Сбросить всё",

  // -----------------------------
  // SYNC / СИНХРОНИЗАЦИЯ
  // -----------------------------
  "sync.title": "Синхронизация и обмен",
  "sync.subtitle": "Сохраняйте и делитесь данными",
  "sync.tabs.local": "Локально",
  "sync.tabs.peer": "Устройство-к-устройству",
  "sync.tabs.cloud": "Облако",
  "sync.local.export.title": "Локальный экспорт",
  "sync.local.export.desc":
    "Скопируйте этот JSON, чтобы сохранить его в другом месте.",
  "sync.local.export.button": "Создать экспорт",
  "sync.local.import.title": "Локальный импорт",
  "sync.local.import.desc":
    "Вставьте сюда JSON, экспортированный с другого устройства.",
  "sync.local.import.button": "Импортировать JSON",
  "sync.local.import.success": "Импорт выполнен",
  "sync.local.import.error": "Импорт не удался, некорректный JSON.",
  "sync.peer.soon":
    "Синхронизация устройство-к-устройству скоро будет доступна",
  "sync.cloud.soon": "Облачная синхронизация скоро будет доступна",

  // -----------------------------
  // LABELS / МЕТКИ
  // -----------------------------
  "label.points": "Очки",
  "label.legs": "Леги",
  "label.sets": "Сеты",
  "label.avg3": "Среднее /3 дротика",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Объём",
  "label.duration": "Длительность",
  "label.date": "Дата",
  "label.mode": "Режим",

  // -----------------------------
  // НАЗВАНИЯ ЯЗЫКОВ (RU)
  // -----------------------------
  "lang.fr": "Французский",
  "lang.en": "Английский",
  "lang.es": "Испанский",
  "lang.de": "Немецкий",
  "lang.it": "Итальянский",
  "lang.pt": "Португальский",
  "lang.nl": "Нидерландский",
  "lang.ru": "Русский",
  "lang.zh": "Китайский",
  "lang.ja": "Японский",
  "lang.ar": "Арабский",
  "lang.hi": "Хинди",
  "lang.tr": "Турецкий",
  "lang.da": "Датский",
  "lang.no": "Норвежский",
  "lang.sv": "Шведский",
  "lang.is": "Исландский",
  "lang.pl": "Польский",
  "lang.ro": "Румынский",
  "lang.sr": "Сербский",
  "lang.hr": "Хорватский",
  "lang.cs": "Чешский",
};

export default ru;
