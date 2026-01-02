// ============================================
// src/i18n/ar.ts
// العربية — قاموس كامل v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const ar: Dict = {
  // -----------------------------
  // التنقل / التبويبات
  // -----------------------------
  "nav.home": "الرئيسية",
  "nav.local": "محلي",
  "nav.games": "الألعاب",
  "nav.training": "التدريب",
  "nav.online": "أونلاين",
  "nav.stats": "الإحصائيات",
  "nav.settings": "الإعدادات",
  "nav.profiles": "الملفات الشخصية",
  "nav.sync": "المزامنة والمشاركة",
  "nav.back": "رجوع",
  "nav.close": "إغلاق",

  // -----------------------------
  // عام / مشترك
  // -----------------------------
  "common.ok": "موافق",
  "common.cancel": "إلغاء",
  "common.yes": "نعم",
  "common.no": "لا",
  "common.save": "حفظ",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.confirm": "تأكيد",
  "common.next": "التالي",
  "common.prev": "السابق",
  "common.start": "ابدأ",
  "common.continue": "متابعة",
  "common.resume": "استئناف",
  "common.pause": "إيقاف مؤقت",
  "common.reset": "إعادة تعيين",
  "common.shuffle": "عشوائي",
  "common.loading": "جارٍ التحميل…",
  "common.error": "حدث خطأ",
  "common.info": "معلومات",
  "common.stats": "إحصائيات",
  "common.history": "السجل",
  "common.tutorial": "دليل",
  "common.exit": "خروج",
  "common.backHome": "العودة إلى الرئيسية",
  "common.player": "لاعب",
  "common.players": "لاعبون",
  "common.team": "فريق",
  "common.teams": "فرق",
  "common.points": "نقاط",
  "common.average": "متوسط",
  "common.best": "أفضل",
  "common.worst": "أسوأ",
  "common.total": "الإجمالي",
  "common.date": "التاريخ",
  "common.time": "الوقت",

  // -----------------------------
  // الصفحة الرئيسية / Dashboard
  // -----------------------------
  "home.title": "لوحة التحكم",
  "home.subtitle": "مركز التحكم في Darts Counter",

  "status.online": "متصل",
  "status.away": "بعيد",
  "status.offline": "غير متصل",

  // الشريط العلوي
  "home.welcome": "مرحبًا",
  "home.welcome.noProfile": "مرحبًا في Darts Counter",
  "home.hero.tagline": "هل أنت جاهز لرمي بعض السهام؟",

  // بطاقة الملف الشخصي النشط
  "home.activeProfile.title": "الملف النشط",
  "home.activeProfile.none": "لا يوجد ملف محدد",
  "home.activeProfile.select": "اختر ملفًا",
  "home.activeProfile.manage": "إدارة الملفات",
  "home.activeProfile.status.online": "متصل",
  "home.activeProfile.status.offline": "غير متصل",
  "home.activeProfile.status.guest": "ضيف",
  "home.activeProfile.badge.you": "أنت",
  "home.activeProfile.badge.local": "محلي",
  "home.activeProfile.badge.online": "أونلاين",

  // الإحصائيات السريعة في البطاقة
  "home.activeProfile.stats.title": "إحصائيات سريعة",
  "home.activeProfile.stats.x01Avg": "متوسط X01",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "حجم التدريب",
  "home.activeProfile.stats.lastGame": "آخر مباراة",
  "home.activeProfile.stats.noGames": "لا توجد مباريات بعد",
  "home.activeProfile.stats.seeAll": "عرض كل الإحصائيات",

  // إجراءات سريعة
  "home.quickActions.title": "إجراءات سريعة",
  "home.quickActions.playX01": "بدء X01",
  "home.quickActions.playCricket": "بدء Cricket",
  "home.quickActions.training": "فتح التدريب",
  "home.quickActions.stats": "عرض الإحصائيات",

  // كاروسيل الإحصائيات
  "home.statsCarousel.title": "إحصائيات سريعة",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "تدريب",

  // شريط الآركيد / ArcadeTicker
  "home.arcadeBanner.title": "معلومات وتحديثات",
  "home.arcadeBanner.tapForMore": "المس للحصول على المزيد",
  "home.arcadeBanner.empty": "لا توجد معلومات للعرض الآن",
  "home.arcadeBanner.tag.new": "جديد",
  "home.arcadeBanner.tag.tip": "نصيحة",
  "home.arcadeBanner.tag.update": "تحديث",

  // الأزرار الكبيرة للتنقل
  "home.nav.profiles": "الملفات الشخصية",
  "home.nav.profiles.desc": "ملفات محلية، صور رمزية وروبوتات",
  "home.nav.local": "محلي",
  "home.nav.local.desc": "اللعب على هذا اللوح",
  "home.nav.online": "أونلاين",
  "home.nav.online.desc": "مباريات عن بُعد مع الأصدقاء",
  "home.nav.training": "تدريب",
  "home.nav.training.desc": "وحدات تدريب مفصلة",
  "home.nav.stats": "إحصائيات",
  "home.nav.stats.desc": "لوحات معلومات ومنحنيات وسجل",
  "home.nav.settings": "الإعدادات",
  "home.nav.settings.desc": "السمات، اللغة، وإعادة التعيين الكامل",

  // Ticker / ملخصات
  "home.ticker.records": "آخر الأرقام القياسية",
  "home.ticker.records.text":
    "لقد حطمت عدة أرقام قياسية مؤخرًا، واصل التقدم!",

  "home.ticker.localLast": "آخر مباراة محلية",
  "home.ticker.localLast.text":
    "ملخص آخر مباراة لعبت محليًا.",

  "home.ticker.onlineLast": "آخر مباراة أونلاين",
  "home.ticker.onlineLast.text":
    "مباراتك الأونلاين الأخيرة جاهزة لمباراة ثأرية.",

  "home.ticker.onlineLeader": "متصدر الترتيب",
  "home.ticker.onlineLeader.text":
    "اكتشف من في صدارة الترتيب الأونلاين.",

  "home.ticker.training": "تدريب الوقت الحالي",
  "home.ticker.training.text":
    "إجمالي جلسات X01 Training و Tour de l’Horloge.",

  "home.ticker.month": "إحصائيات هذا الشهر",
  "home.ticker.month.text":
    "إجمالي المباريات والضربات لهذا الشهر.",

  "home.ticker.tip": "نصيحة اليوم",
  "home.ticker.tip.text":
    "ثبّت إنهاءك المفضل عبر تكراره بانتظام.",

  // -----------------------------
  // الألعاب / GAMES
  // -----------------------------
  "games.title": "كل الألعاب",
  "games.subtitle": "اختر وضع اللعب",
  "games.section.classic": "كلاسيكي",
  "games.section.training": "تدريب",
  "games.section.party": "حفلات ومرح",
  "games.section.other": "أوضاع أخرى",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… انتهِ بالضبط عند 0.",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "من 15 إلى 20 + Bull، افتح/أغلق وسجّل نقاطًا.",

  "games.killer.title": "Killer",
  "games.killer.desc": "كن القاتل وأقصِ اللاعبين الآخرين.",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "رقم واحد في كل جولة، استهدف S / D / T.",

  "games.training.menuTitle": "تدريب",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Tour de l'Horloge",
  "games.training.custom": "تدريب مخصص",
  "games.training.evolution": "إحصائيات التطور",
  "games.info.title": "معلومات اللعبة",
  "games.info.rules": "القواعد",
  "games.info.tips": "نصائح",

  // -----------------------------
  // الملفات الشخصية المحلية
  // -----------------------------
  "profiles.title": "ملفات محلية",
  "profiles.subtitle": "إدارة لاعبيك المحليين",
  "profiles.add": "إضافة ملف",
  "profiles.edit": "تعديل الملف",
  "profiles.delete": "حذف الملف",
  "profiles.confirmDelete": "حذف هذا الملف نهائيًا؟",
  "profiles.name.label": "اسم اللاعب",
  "profiles.name.placeholder": "أدخل لقبًا",
  "profiles.avatar.label": "الصورة الرمزية",
  "profiles.avatar.random": "صورة عشوائية",
  "profiles.stats.title": "إحصائيات الملف",
  "profiles.stats.x01": "إحصائيات X01",
  "profiles.stats.cricket": "إحصائيات Cricket",
  "profiles.stats.training": "إحصائيات التدريب",
  "profiles.status.active": "نشط",
  "profiles.status.inactive": "غير نشط",
  "profiles.selectActive": "تعيين كملف نشط",
  "profiles.list.empty": "لا يوجد ملفات حتى الآن",
  "profiles.list.selectHint": "المس ملفًا لاختياره",
  "profiles.hint.avatarTap": "المس الميدالية لتغيير الصورة الرمزية",

  // -----------------------------
  // مُنشئ الصور الرمزية / Avatar Creator
  // -----------------------------
  "avatar.title": "منشئ الصورة الرمزية",
  "avatar.subtitle": "خصص ميداليتك",
  "avatar.style.label": "الأسلوب",
  "avatar.style.realistic": "واقعي خفيف",
  "avatar.style.comic": "كوميك",
  "avatar.style.flat": "تصميم مسطح",
  "avatar.style.exaggerated": "مبالغ فيه",
  "avatar.theme.label": "السمة",
  "avatar.preview.label": "معاينة",
  "avatar.generate": "إنشاء صورة جديدة",
  "avatar.keep": "الاحتفاظ بهذه الصورة",
  "avatar.cancel": "إلغاء التعديل",

  // -----------------------------
  // إعدادات X01
  // -----------------------------
  "x01.config.title": "إعدادات X01",
  "x01.config.subtitle": "حضّر مباراتك",
  "x01.config.section.players": "اللاعبون",
  "x01.config.section.match": "تنسيق المباراة",
  "x01.config.section.rules": "إعدادات أساسية",
  "x01.config.players.add": "إضافة لاعب",
  "x01.config.players.remove": "إزالة",
  "x01.config.players.teams": "الفرق",
  "x01.config.mode.label": "وضع اللعب",
  "x01.config.mode.solo": "فردي",
  "x01.config.mode.multi": "متعدد",
  "x01.config.mode.teams": "فرق",
  "x01.config.raceToSets.label": "عدد المجموعات للفوز",
  "x01.config.raceToLegs.label": "عدد الأشواط للفوز",
  "x01.config.startingScore.label": "النقاط الابتدائية",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "مخصص",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Single In",
  "x01.config.in.double": "Double In",
  "x01.config.in.master": "Master In",
  "x01.config.out.simple": "Single Out",
  "x01.config.out.double": "Double Out",
  "x01.config.out.master": "Master Out",
  "x01.config.service.label": "الإرسال",
  "x01.config.service.random": "عشوائي",
  "x01.config.service.alternate": "بالتناوب",
  "x01.config.bots.title": "الروبوتات (ذكاء اصطناعي)",
  "x01.config.bots.add": "إضافة روبوت",
  "x01.config.bots.level.easy": "سهل",
  "x01.config.bots.level.medium": "متوسط",
  "x01.config.bots.level.hard": "صعب",
  "x01.config.bots.level.pro": "محترف",
  "x01.config.startMatch": "بدء المباراة",
  "x01.config.back": "الرجوع إلى الألعاب",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "شوط",
  "x01.play.set": "مجموعة",
  "x01.play.currentPlayer": "دور",
  "x01.play.scoreRemaining": "المتبقي",
  "x01.play.lastVisit": "آخر جولة",
  "x01.play.average3": "متوسط / 3 سهام",
  "x01.play.bestVisit": "أفضل جولة",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "عدد السهام",
  "x01.play.visits": "الجولات",
  "x01.play.bust": "Bust",
  "x01.play.undo": "التراجع عن الجولة",
  "x01.play.confirmExit": "مغادرة المباراة الجارية؟",
  "x01.play.botThinking": "الروبوت يلعب…",
  "x01.play.noScoreYet": "لا توجد نقاط بعد",
  "x01.play.matchOver": "انتهت المباراة",
  "x01.play.legOver": "انتهى الشوط",
  "x01.play.setOver": "انتهت المجموعة",
  "x01.play.nextLeg": "الشوط التالي",
  "x01.play.nextSet": "المجموعة التالية",
  "x01.play.backToConfig": "العودة إلى الإعدادات",
  "x01.play.saveInHistory": "حفظ في السجل",

  // -----------------------------
  // CRICKET
  // -----------------------------
  "cricket.config.title": "إعدادات Cricket",
  "cricket.config.players": "اللاعبون",
  "cricket.config.raceTo.label": "نقاط أو أشواط",
  "cricket.config.pointsWin": "فوز بالنقاط",
  "cricket.config.legsWin": "فوز بالأشواط",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "الأهداف",
  "cricket.play.hits": "الإصابات",
  "cricket.play.score": "النتيجة",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "دور",
  "cricket.play.open": "مفتوح",
  "cricket.play.closed": "مغلق",
  "cricket.stats.title": "إحصائيات Cricket",
  "cricket.stats.profile": "ملف Cricket",
  "cricket.stats.bestMpr": "أفضل MPR",
  "cricket.stats.averageMpr": "متوسط MPR",
  "cricket.stats.gamesPlayed": "المباريات",
  "cricket.stats.gamesWon": "المباريات الرابحة",

  // -----------------------------
  // قائمة التدريب
  // -----------------------------
  "training.menu.title": "التدريب",
  "training.menu.subtitle": "طوّر نقاط قوتك",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc": "متابعة تفصيلية لكل سهـم.",
  "training.menu.clock": "Tour de l'Horloge",
  "training.menu.clock.desc": "قم بالدوران على جميع الأهداف.",
  "training.menu.evolution": "منحنى التطور",
  "training.menu.evolution.desc": "شاهد تطورك عبر الزمن.",
  "training.menu.custom": "جلسة مخصصة",
  "training.menu.resumeLast": "متابعة آخر جلسة",
  "training.menu.noSession": "لا توجد جلسات محفوظة بعد",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "تحليل كل سهم",
  "training.x01.targetScore.label": "النقاط الابتدائية",
  "training.x01.throws": "عدد السهام",
  "training.x01.hitsBySegment": "الإصابات حسب القطاع",
  "training.x01.hits.single": "Singles",
  "training.x01.hits.double": "Doubles",
  "training.x01.hits.triple": "Trebles",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Busts",
  "training.x01.avgPerDart": "متوسط لكل سهم",
  "training.x01.session.save": "حفظ الجلسة",
  "training.x01.session.saved": "تم حفظ الجلسة",
  "training.x01.session.delete": "حذف الجلسة",
  "training.x01.session.confirmDelete":
    "حذف هذه الجلسة التدريبية نهائيًا؟",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "Tour de l'Horloge",
  "training.clock.subtitle": "المس كل رقم بالترتيب",
  "training.clock.objective.label": "الهدف",
  "training.clock.objective.allSingles": "كل الـ Singles",
  "training.clock.objective.allDoubles": "كل الـ Doubles",
  "training.clock.objective.allTriples": "كل الـ Triples",
  "training.clock.objective.custom": "مسار مخصص",
  "training.clock.timer.label": "المؤقت",
  "training.clock.timer.off": "بدون مؤقت",
  "training.clock.timer.30": "30 ثانية",
  "training.clock.timer.60": "60 ثانية",
  "training.clock.timer.120": "120 ثانية",
  "training.clock.players": "اللاعبون",
  "training.clock.start": "بدء التدريب",
  "training.clock.currentTarget": "الهدف الحالي",
  "training.clock.progress": "التقدم",
  "training.clock.session.save": "حفظ الجلسة",
  "training.clock.session.saved": "تم حفظ جلسة Tour de l'Horloge",

  // -----------------------------
  // STATSHUB / مركز الإحصائيات
  // -----------------------------
  "stats.shell.title": "مركز الإحصائيات",
  "stats.shell.tabs.local": "ملفات محلية",
  "stats.shell.tabs.training": "تدريب",
  "stats.shell.tabs.online": "أونلاين",
  "stats.shell.tabs.history": "السجل",
  "stats.shell.info": "اختر قسم الإحصائيات.",
  "stats.hub.local.title": "إحصائيات الملفات المحلية",
  "stats.hub.local.selectProfile":
    "اختر ملفًا لعرض الإحصائيات",
  "stats.hub.training.title": "إحصائيات التدريب",
  "stats.hub.online.title": "إحصائيات الأونلاين",
  "stats.hub.history.title": "سجل المباريات",
  "stats.hub.kpi.avg3": "متوسط /3 سهام",
  "stats.hub.kpi.winRate": "نسبة الفوز",
  "stats.hub.kpi.bestLeg": "أفضل شوط",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "المستوى الحالي",
  "stats.hub.radar.skills": "رادار المهارات",
  "stats.hub.training.clock": "Tour de l'Horloge",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "حجم التدريب",
  "stats.hub.empty": "لا توجد إحصائيات بعد",

  // -----------------------------
  // HISTORY / السجل
  // -----------------------------
  "history.title": "سجل المباريات",
  "history.subtitle": "آخر مبارياتك",
  "history.filter.all": "الكل",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "لا توجد مباريات محفوظة",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "تدريب",
  "history.details.title": "تفاصيل المباراة",
  "history.details.players": "اللاعبون",
  "history.details.winner": "الفائز",
  "history.details.legs": "الأشواط",
  "history.details.sets": "المجموعات",
  "history.details.avg3": "متوسط /3 سهام",
  "history.details.checkout": "Checkout",
  "history.delete": "حذف المباراة",
  "history.confirmDelete": "حذف هذه المباراة نهائيًا؟",

  // -----------------------------
  // ONLINE / الوضع الأونلاين
  // -----------------------------
  "online.title": "الوضع الأونلاين",
  "online.subtitle": "العب مع أصدقائك عن بُعد",
  "online.login.title": "تسجيل الدخول",
  "online.login.nickname": "اللقب",
  "online.login.email": "البريد الإلكتروني (اختياري)",
  "online.login.password": "كلمة المرور",
  "online.login.submit": "دخول",
  "online.signup.title": "إنشاء حساب",
  "online.logout": "تسجيل الخروج",
  "online.profile.title": "الملف الأونلاين",
  "online.profile.country": "البلد",
  "online.profile.bio": "نبذة",
  "online.lobby.title": "صالات X01",
  "online.lobby.create": "إنشاء صالة",
  "online.lobby.join": "الانضمام إلى صالة",
  "online.lobby.empty": "لا توجد صالات متاحة حاليًا",
  "online.friends.title": "الأصدقاء",
  "online.friends.add": "إضافة صديق",
  "online.friends.status.online": "متصل",
  "online.friends.status.away": "بعيد",
  "online.friends.status.offline": "غير متصل",

  // -----------------------------
  // SETTINGS / الإعدادات (قسم عام)
  // -----------------------------
  "settings.title": "الإعدادات",
  "settings.theme.title": "سمات نيون",
  "settings.theme.subtitle": "اختر الأجواء التي تفضلها",
  "settings.theme.current": "السمة الحالية",
  "settings.theme.applied": "تم تطبيق السمة",
  "settings.lang.title": "اللغة",
  "settings.lang.subtitle": "لغة التطبيق",
  "settings.lang.help": "تمت ترجمة نصوص الواجهة.",
  "settings.section.language": "اللغة",
  "settings.section.theme": "السمات",
  "settings.section.misc": "إعدادات أخرى",
  "settings.misc.sounds": "الأصوات",
  "settings.misc.vibrations": "الاهتزازات",
  "settings.misc.animations": "الرسوم المتحركة",
  "settings.misc.resetApp": "إعادة تعيين التطبيق",
  "settings.misc.resetConfirm":
    "إعادة تعيين كل البيانات المحلية (الملفات، السجل، التدريب)؟",

  // -----------------------------
  // SYNC CENTER / مركز المزامنة
  // -----------------------------
  "sync.title": "المزامنة والمشاركة",
  "sync.subtitle": "احفظ بياناتك وشاركها",
  "sync.tabs.local": "محلي",
  "sync.tabs.peer": "جهاز إلى جهاز",
  "sync.tabs.cloud": "سحابة",
  "sync.local.export.title": "تصدير محلي",
  "sync.local.export.desc": "انسخ هذا JSON للاحتفاظ به في مكان آخر.",
  "sync.local.export.button": "إنشاء ملف التصدير",
  "sync.local.import.title": "استيراد محلي",
  "sync.local.import.desc":
    "ألصق هنا JSON المُصدَّر من جهاز آخر.",
  "sync.local.import.button": "استيراد JSON",
  "sync.local.import.success": "تم الاستيراد بنجاح",
  "sync.local.import.error": "فشل الاستيراد، JSON غير صالح.",
  "sync.peer.soon": "مزامنة جهاز إلى جهاز ستتوفر قريبًا",
  "sync.cloud.soon": "مزامنة السحابة ستتوفر قريبًا",

  // -----------------------------
  // تسميات / Labels
  // -----------------------------
  "label.points": "نقاط",
  "label.legs": "أشواط",
  "label.sets": "مجموعات",
  "label.avg3": "متوسط /3 سهام",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "الحجم",
  "label.duration": "المدة",
  "label.date": "التاريخ",
  "label.mode": "الوضع",

  // -----------------------------
  // SETTINGS (بلوك الإعدادات المفصل كما في FR)
  // -----------------------------
  "settings.back": "رجوع",
  "settings.subtitle":
    "خصص سمة التطبيق ولغته",

  "settings.theme": "السمة",
  "settings.theme.group.neons": "نيون كلاسيكي",
  "settings.theme.group.soft": "ألوان ناعمة",
  "settings.theme.group.dark": "سمات داكنة مميزة",

  "settings.theme.gold.label": "نيون ذهبي",
  "settings.theme.gold.desc": "سمة ذهبية مميزة",

  "settings.theme.pink.label": "نيون وردي",
  "settings.theme.pink.desc": "أجواء آركيد وردية",

  "settings.theme.petrol.label": "أزرق بترولي",
  "settings.theme.petrol.desc": "أزرق نيون عميق",

  "settings.theme.green.label": "نيون أخضر",
  "settings.theme.green.desc": "أسلوب تدريب مشرق",

  "settings.theme.magenta.label": "ماجنتا",
  "settings.theme.magenta.desc": "بنفسجي / ماجنتا قوي",

  "settings.theme.red.label": "أحمر",
  "settings.theme.red.desc": "أحمر آركيد حاد",

  "settings.theme.orange.label": "برتقالي",
  "settings.theme.orange.desc": "برتقالي دافئ وحيوي",

  "settings.theme.white.label": "أبيض",
  "settings.theme.white.desc": "خلفية فاتحة عصرية",

  "settings.theme.blueOcean.label": "أزرق المحيط",
  "settings.theme.blueOcean.desc": "أزرق طبيعي يشبه البحر والسماء",

  "settings.theme.limeYellow.label": "أصفر ليموني",
  "settings.theme.limeYellow.desc": "لون ليموني فاقع جدًا",

  "settings.theme.sage.label": "أخضر Sage",
  "settings.theme.sage.desc": "درجات خضراء ناعمة وطبيعية",

  "settings.theme.skyBlue.label": "أزرق سماوي",
  "settings.theme.skyBlue.desc": "أزرق ناعم ومضيء جدًا",

  "settings.theme.darkTitanium.label": "تيتانيوم داكن",
  "settings.theme.darkTitanium.desc": "مظهر معدني مطفي مميز",

  "settings.theme.darkCarbon.label": "كربون",
  "settings.theme.darkCarbon.desc": "أجواء حديثة بتأثير ألياف الكربون",

  "settings.theme.darkFrost.label": "جليد داكن",
  "settings.theme.darkFrost.desc": "أسود متجمد بمظهر مستقبلي",

  "settings.theme.darkObsidian.label": "أوبسيديان",
  "settings.theme.darkObsidian.desc":
    "أسود لامع مميز مع قابلية قراءة ممتازة",

  "settings.lang": "اللغة",

  "settings.reset.title": "إعادة تعيين التطبيق",
  "settings.reset.subtitle":
    "يمحو كل الملفات المحلية والروبوتات والإحصائيات وسجل المباريات والإعدادات. هذا الإجراء نهائي.",
  "settings.reset.button": "إعادة تعيين الكل",

  // -----------------------------
  // أسماء اللغات (AR)
  // -----------------------------
  "lang.fr": "الفرنسية",
  "lang.en": "الإنجليزية",
  "lang.es": "الإسبانية",
  "lang.de": "الألمانية",
  "lang.it": "الإيطالية",
  "lang.pt": "البرتغالية",
  "lang.nl": "الهولندية",
  "lang.ru": "الروسية",
  "lang.zh": "الصينية",
  "lang.ja": "اليابانية",
  "lang.ar": "العربية",
  "lang.hi": "الهندية",
  "lang.tr": "التركية",
  "lang.da": "الدانماركية",
  "lang.no": "النرويجية",
  "lang.sv": "السويدية",
  "lang.is": "الآيسلندية",
  "lang.pl": "البولندية",
  "lang.ro": "الرومانية",
  "lang.sr": "الصربية",
  "lang.hr": "الكرواتية",
  "lang.cs": "التشيكية",
};

export default ar;
