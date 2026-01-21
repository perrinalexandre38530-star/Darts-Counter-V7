// ============================================
// src/i18n/hi.ts
// हिन्दी — पूर्ण शब्दकोश v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const hi: Dict = {
  // -----------------------------
  // नेविगेशन / टैब्स
  // -----------------------------
  "nav.home": "होम",
  "nav.local": "लोकल",
  "nav.games": "गेम्स",
  "nav.training": "ट्रेनिंग",
  "nav.online": "ऑनलाइन",
  "nav.stats": "स्टैट्स",
  "nav.settings": "सेटिंग्स",
  "nav.profiles": "प्रोफ़ाइल",
  "nav.sync": "सिंक और शेयर",
  "nav.back": "वापस",
  "nav.close": "बंद करें",

  // -----------------------------
  // सामान्य / कॉमन
  // -----------------------------
  "common.ok": "ठीक है",
  "common.cancel": "रद्द",
  "common.yes": "हाँ",
  "common.no": "नहीं",
  "common.save": "सेव करें",
  "common.edit": "संपादित करें",
  "common.delete": "हटाएँ",
  "common.confirm": "पुष्टि करें",
  "common.next": "आगे",
  "common.prev": "पीछे",
  "common.start": "शुरू करें",
  "common.continue": "जारी रखें",
  "common.resume": "फिर शुरू करें",
  "common.pause": "पॉज़",
  "common.reset": "रीसेट",
  "common.shuffle": "रैंडम",
  "common.loading": "लोड हो रहा है…",
  "common.error": "एक त्रुटि हुई",
  "common.info": "जानकारी",
  "common.stats": "सांख्यिकी",
  "common.history": "इतिहास",
  "common.tutorial": "ट्यूटोरियल",
  "common.exit": "बाहर निकलें",
  "common.backHome": "होम पर वापस जाएँ",
  "common.player": "खिलाड़ी",
  "common.players": "खिलाड़ी",
  "common.team": "टीम",
  "common.teams": "टीमें",
  "common.points": "अंक",
  "common.average": "औसत",
  "common.best": "सर्वश्रेष्ठ",
  "common.worst": "सबसे खराब",
  "common.total": "कुल",
  "common.date": "तारीख",
  "common.time": "समय",

  // -----------------------------
  // HOME / डैशबोर्ड
  // -----------------------------
  "home.title": "डैशबोर्ड",
  "home.subtitle": "MULTISPORTS SCORING नियंत्रण केंद्र",

  "status.online": "ऑनलाइन",
  "status.away": "अनुपस्थित",
  "status.offline": "ऑफ़लाइन",

  "home.welcome": "स्वागत है",
  "home.welcome.noProfile": "MULTISPORTS SCORING में आपका स्वागत है",
  "home.hero.tagline": "कुछ डार्ट फेंकने के लिए तैयार हैं?",

  // Active Profile
  "home.activeProfile.title": "सक्रिय प्रोफ़ाइल",
  "home.activeProfile.none": "कोई प्रोफ़ाइल चयनित नहीं",
  "home.activeProfile.select": "प्रोफ़ाइल चुनें",
  "home.activeProfile.manage": "प्रोफ़ाइल प्रबंधित करें",

  "home.activeProfile.status.online": "कनेक्टेड",
  "home.activeProfile.status.offline": "ऑफ़लाइन",
  "home.activeProfile.status.guest": "अतिथि",

  "home.activeProfile.badge.you": "आप",
  "home.activeProfile.badge.local": "लोकल",
  "home.activeProfile.badge.online": "ऑनलाइन",

  // Stats section
  "home.activeProfile.stats.title": "त्वरित आँकड़े",
  "home.activeProfile.stats.x01Avg": "X01 औसत",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "ट्रेनिंग वॉल्यूम",
  "home.activeProfile.stats.lastGame": "आखिरी गेम",
  "home.activeProfile.stats.noGames": "अभी तक कोई गेम नहीं",
  "home.activeProfile.stats.seeAll": "सभी स्टैट्स देखें",

  // Quick actions
  "home.quickActions.title": "त्वरित क्रियाएँ",
  "home.quickActions.playX01": "X01 शुरू करें",
  "home.quickActions.playCricket": "Cricket शुरू करें",
  "home.quickActions.training": "ट्रेनिंग मोड",
  "home.quickActions.stats": "सांख्यिकी देखें",

  // Carousel
  "home.statsCarousel.title": "त्वरित आँकड़े",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "ट्रेनिंग",

  // Arcade ticker
  "home.arcadeBanner.title": "जानकारी और अपडेट",
  "home.arcadeBanner.tapForMore": "अधिक जानकारी के लिए टैप करें",
  "home.arcadeBanner.empty": "अभी कोई जानकारी नहीं",
  "home.arcadeBanner.tag.new": "नया",
  "home.arcadeBanner.tag.tip": "टिप",
  "home.arcadeBanner.tag.update": "अपडेट",

  // Big nav buttons
  "home.nav.profiles": "प्रोफ़ाइल",
  "home.nav.profiles.desc": "लोकल प्रोफ़ाइल, अवतार और बॉट्स",
  "home.nav.local": "लोकल",
  "home.nav.local.desc": "इस डार्टबोर्ड पर खेलें",
  "home.nav.online": "ऑनलाइन",
  "home.nav.online.desc": "दोस्तों के साथ दूरस्थ मैच",
  "home.nav.training": "ट्रेनिंग",
  "home.nav.training.desc": "विस्तृत प्रशिक्षण मॉड्यूल",
  "home.nav.stats": "सांख्यिकी",
  "home.nav.stats.desc": "डैशबोर्ड, ग्राफ़, इतिहास",
  "home.nav.settings": "सेटिंग्स",
  "home.nav.settings.desc": "थीम, भाषा और उन्नत विकल्प",

  // -----------------------------
  // TICKER
  // -----------------------------
  "home.ticker.records": "नवीनतम रिकॉर्ड",
  "home.ticker.records.text": "आपने हाल ही में कई रिकॉर्ड तोड़े हैं!",

  "home.ticker.localLast": "आखिरी लोकल मैच",
  "home.ticker.localLast.text": "आपके आखिरी स्थानीय मैच का सारांश।",

  "home.ticker.onlineLast": "आखिरी ऑनलाइन मैच",
  "home.ticker.onlineLast.text": "आपका पिछला ऑनलाइन मैच तैयार है।",

  "home.ticker.onlineLeader": "लीडरबोर्ड लीडर",
  "home.ticker.onlineLeader.text": "देखें ऑनलाइन रैंकिंग में कौन आगे है।",

  "home.ticker.training": "चल रही ट्रेनिंग",
  "home.ticker.training.text": "X01 ट्रेनिंग और घड़ी सत्रों का कुल।",

  "home.ticker.month": "इस महीने के आँकड़े",
  "home.ticker.month.text": "इस महीने के मैच और हिट्स।",

  "home.ticker.tip": "दिन की टिप",
  "home.ticker.tip.text":
    "अपनी पसंदीदा फिनिश को नियमित रूप से दोहराएँ।",

  // -----------------------------
  // GAMES
  // -----------------------------
  "games.title": "सभी गेम्स",
  "games.subtitle": "मोड चुनें",
  "games.section.classic": "क्लासिक",
  "games.section.training": "ट्रेनिंग",
  "games.section.party": "पार्टी",
  "games.section.other": "अन्य मोड",

  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701 — बिल्कुल 0 पर खत्म करें।",

  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15 से 20 + Bull, ओपन/क्लोज़ और स्कोर।",

  "games.killer.title": "Killer",
  "games.killer.desc": "किलर बनें और अन्य खिलाड़ियों को हटाएँ।",

  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "हर राउंड में नया नंबर — S/D/T को हिट करें।",

  "games.training.menuTitle": "ट्रेनिंग",
  "games.training.x01Solo": "X01 सोलो ट्रेनिंग",
  "games.training.clock": "घड़ी प्रशिक्षण",
  "games.training.custom": "कस्टम प्रशिक्षण",
  "games.training.evolution": "उन्नति आँकड़े",

  "games.info.title": "गेम जानकारी",
  "games.info.rules": "नियम",
  "games.info.tips": "टिप्स",

  // -----------------------------
  // PROFILES
  // -----------------------------
  "profiles.title": "लोकल प्रोफ़ाइल",
  "profiles.subtitle": "अपने स्थानीय खिलाड़ियों का प्रबंधन करें",
  "profiles.add": "प्रोफ़ाइल जोड़ें",
  "profiles.edit": "प्रोफ़ाइल संपादित करें",
  "profiles.delete": "प्रोफ़ाइल हटाएँ",
  "profiles.confirmDelete": "क्या आप वाकई इस प्रोफ़ाइल को हटाना चाहते हैं?",
  "profiles.name.label": "खिलाड़ी का नाम",
  "profiles.name.placeholder": "उपनाम दर्ज करें",
  "profiles.avatar.label": "अवतार",
  "profiles.avatar.random": "रैंडम अवतार",
  "profiles.stats.title": "प्रोफ़ाइल आँकड़े",
  "profiles.stats.x01": "X01 स्टैट्स",
  "profiles.stats.cricket": "Cricket स्टैट्स",
  "profiles.stats.training": "ट्रेनिंग स्टैट्स",
  "profiles.status.active": "सक्रिय",
  "profiles.status.inactive": "निष्क्रिय",
  "profiles.selectActive": "सक्रिय प्रोफ़ाइल बनाएं",
  "profiles.list.empty": "अभी कोई प्रोफ़ाइल नहीं",
  "profiles.list.selectHint": "चुनने के लिए टैप करें",
  "profiles.hint.avatarTap": "अवतार बदलने के लिए टैप करें",

  // -----------------------------
  // AVATAR CREATOR
  // -----------------------------
  "avatar.title": "अवतार निर्माता",
  "avatar.subtitle": "अपना मेडल कस्टमाइज़ करें",
  "avatar.style.label": "स्टाइल",
  "avatar.style.realistic": "हल्का वास्तविक",
  "avatar.style.comic": "कॉमिक",
  "avatar.style.flat": "फ्लैट",
  "avatar.style.exaggerated": "अतिरंजित",
  "avatar.theme.label": "थीम",
  "avatar.preview.label": "पूर्वावलोकन",
  "avatar.generate": "नया अवतार जनरेट करें",
  "avatar.keep": "इस अवतार को रखें",
  "avatar.cancel": "रद्द करें",

  // -----------------------------
  // X01 CONFIG
  // -----------------------------
  "x01.config.title": "X01 सेटिंग्स",
  "x01.config.subtitle": "अपना मैच तैयार करें",
  "x01.config.section.players": "खिलाड़ी",
  "x01.config.section.match": "मैच फॉर्मेट",
  "x01.config.section.rules": "बुनियादी सेटिंग्स",
  "x01.config.players.add": "खिलाड़ी जोड़ें",
  "x01.config.players.remove": "हटाएँ",
  "x01.config.players.teams": "टीमें",
  "x01.config.mode.label": "गेम मोड",
  "x01.config.mode.solo": "सोलो",
  "x01.config.mode.multi": "मल्टी",
  "x01.config.mode.teams": "टीमें",
  "x01.config.raceToSets.label": "सेट जीत लक्ष्य",
  "x01.config.raceToLegs.label": "लेग जीत लक्ष्य",
  "x01.config.startingScore.label": "शुरुआती स्कोर",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "कस्टम",

  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "सिंपल इन",
  "x01.config.in.double": "डबल इन",
  "x01.config.in.master": "मास्टर इन",
  "x01.config.out.simple": "सिंपल आउट",
  "x01.config.out.double": "डबल आउट",
  "x01.config.out.master": "मास्टर आउट",

  "x01.config.service.label": "सर्विस",
  "x01.config.service.random": "रैंडम",
  "x01.config.service.alternate": "बारी-बारी",

  "x01.config.bots.title": "बॉट्स (AI)",
  "x01.config.bots.add": "बॉट जोड़ें",
  "x01.config.bots.level.easy": "आसान",
  "x01.config.bots.level.medium": "मध्यम",
  "x01.config.bots.level.hard": "कठिन",
  "x01.config.bots.level.pro": "प्रो",

  "x01.config.startMatch": "मैच शुरू करें",
  "x01.config.back": "गेम्स पर वापस जाएँ",

  // -----------------------------
  // X01 PLAY
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "लेग",
  "x01.play.set": "सेट",
  "x01.play.currentPlayer": "टर्न:",
  "x01.play.scoreRemaining": "शेष",
  "x01.play.lastVisit": "आखिरी विज़िट",
  "x01.play.average3": "औसत / 3 डार्ट",
  "x01.play.bestVisit": "सर्वश्रेष्ठ विज़िट",
  "x01.play.checkout": "चेकआउट",
  "x01.play.dartsThrown": "डार्ट्स फेंके",
  "x01.play.visits": "विज़िट",
  "x01.play.bust": "बस्ट",
  "x01.play.undo": "विज़िट हटाएँ",
  "x01.play.confirmExit": "क्या आप मैच छोड़ना चाहते हैं?",
  "x01.play.botThinking": "बॉट खेल रहा है…",
  "x01.play.noScoreYet": "अभी कोई स्कोर नहीं",
  "x01.play.matchOver": "मैच समाप्त",
  "x01.play.legOver": "लेग समाप्त",
  "x01.play.setOver": "सेट समाप्त",
  "x01.play.nextLeg": "अगला लेग",
  "x01.play.nextSet": "अगला सेट",
  "x01.play.backToConfig": "सेटिंग्स पर लौटें",
  "x01.play.saveInHistory": "इतिहास में सेव करें",

  // -----------------------------
  // क्रिकेट
  // -----------------------------
  "cricket.config.title": "Cricket सेटिंग्स",
  "cricket.config.players": "खिलाड़ी",
  "cricket.config.raceTo.label": "अंक या लेग",
  "cricket.config.pointsWin": "अंकों से जीत",
  "cricket.config.legsWin": "लेग से जीत",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "टारगेट",
  "cricket.play.hits": "हिट्स",
  "cricket.play.score": "स्कोर",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "टर्न:",
  "cricket.play.open": "ओपन",
  "cricket.play.closed": "क्लोज़",
  "cricket.stats.title": "Cricket आँकड़े",
  "cricket.stats.profile": "Cricket प्रोफ़ाइल",
  "cricket.stats.bestMpr": "सर्वश्रेष्ठ MPR",
  "cricket.stats.averageMpr": "औसत MPR",
  "cricket.stats.gamesPlayed": "खेले गए मैच",
  "cricket.stats.gamesWon": "जीते गए मैच",

  // -----------------------------
  // ट्रेनिंग मेन्यू
  // -----------------------------
  "training.menu.title": "ट्रेनिंग",
  "training.menu.subtitle": "अपनी कौशल बढ़ाएँ",
  "training.menu.x01Solo": "X01 सोलो ट्रेनिंग",
  "training.menu.x01Solo.desc": "प्रत्येक डार्ट का विस्तृत विश्लेषण",
  "training.menu.clock": "घड़ी प्रशिक्षण",
  "training.menu.clock.desc": "सभी लक्ष्य क्रम से हिट करें",
  "training.menu.evolution": "उन्नति चार्ट",
  "training.menu.evolution.desc": "समय के साथ अपना विकास देखें",
  "training.menu.custom": "कस्टम सत्र",
  "training.menu.resumeLast": "पिछला सत्र जारी रखें",
  "training.menu.noSession": "अभी कोई सत्र नहीं",

  // -----------------------------
  // TRAINING X01
  // -----------------------------
  "training.x01.title": "X01 सोलो ट्रेनिंग",
  "training.x01.subtitle": "हर डार्ट का विश्लेषण",
  "training.x01.targetScore.label": "शुरुआती स्कोर",
  "training.x01.throws": "फेंके गए डार्ट्स",
  "training.x01.hitsBySegment": "सेगमेंट अनुसार हिट्स",
  "training.x01.hits.single": "सिंगल",
  "training.x01.hits.double": "डबल",
  "training.x01.hits.triple": "ट्रिपल",
  "training.x01.hits.bull": "बुल",
  "training.x01.hits.dBull": "डबल बुल",
  "training.x01.busts": "बस्ट्स",
  "training.x01.avgPerDart": "औसत प्रति डार्ट",
  "training.x01.session.save": "सत्र सेव करें",
  "training.x01.session.saved": "सत्र सेव किया गया",
  "training.x01.session.delete": "सत्र हटाएँ",
  "training.x01.session.confirmDelete":
    "इस प्रशिक्षण सत्र को हटाएँ?",

  // -----------------------------
  // TRAINING CLOCK
  // -----------------------------
  "training.clock.title": "घड़ी प्रशिक्षण",
  "training.clock.subtitle": "क्रम में प्रत्येक नंबर हिट करें",
  "training.clock.objective.label": "उद्देश्य",
  "training.clock.objective.allSingles": "सभी सिंगल",
  "training.clock.objective.allDoubles": "सभी डबल",
  "training.clock.objective.allTriples": "सभी ट्रिपल",
  "training.clock.objective.custom": "कस्टम मार्ग",
  "training.clock.timer.label": "टाइमर",
  "training.clock.timer.off": "टाइमर बंद",
  "training.clock.timer.30": "30 सेकंड",
  "training.clock.timer.60": "60 सेकंड",
  "training.clock.timer.120": "120 सेकंड",
  "training.clock.players": "खिलाड़ी",
  "training.clock.start": "प्रशिक्षण शुरू करें",
  "training.clock.currentTarget": "वर्तमान लक्ष्य",
  "training.clock.progress": "प्रगति",
  "training.clock.session.save": "सत्र सेव करें",
  "training.clock.session.saved":
    "घड़ी प्रशिक्षण सत्र सेव किया गया",

  // -----------------------------
  // STATSHUB
  // -----------------------------
  "stats.shell.title": "सांख्यिकी केंद्र",
  "stats.shell.tabs.local": "लोकल प्रोफ़ाइल",
  "stats.shell.tabs.training": "ट्रेनिंग",
  "stats.shell.tabs.online": "ऑनलाइन",
  "stats.shell.tabs.history": "इतिहास",
  "stats.shell.info": "एक श्रेणी चुनें",
  "stats.hub.local.title": "लोकल प्रोफ़ाइल आँकड़े",
  "stats.hub.local.selectProfile":
    "स्टैट्स देखने के लिए प्रोफ़ाइल चुनें",
  "stats.hub.training.title": "ट्रेनिंग आँकड़े",
  "stats.hub.online.title": "ऑनलाइन आँकड़े",
  "stats.hub.history.title": "मैच इतिहास",
  "stats.hub.kpi.avg3": "औसत /3 डार्ट",
  "stats.hub.kpi.winRate": "विजय दर",
  "stats.hub.kpi.bestLeg": "सर्वश्रेष्ठ लेग",
  "stats.hub.kpi.checkoutRate": "चेकआउट %",
  "stats.hub.sparkline.recent": "हालिया फॉर्म",
  "stats.hub.radar.skills": "कौशल रडार",
  "stats.hub.training.clock": "घड़ी प्रशिक्षण",
  "stats.hub.training.x01": "X01 ट्रेनिंग",
  "stats.hub.training.volume": "ट्रेनिंग वॉल्यूम",
  "stats.hub.empty": "कोई आँकड़े उपलब्ध नहीं",

  // -----------------------------
  // HISTORY
  // -----------------------------
  "history.title": "मैच इतिहास",
  "history.subtitle": "आपके हाल के मैच",
  "history.filter.all": "सभी",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "अभी कोई मैच नहीं",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Training",
  "history.details.title": "मैच विवरण",
  "history.details.players": "खिलाड़ी",
  "history.details.winner": "विजेता",
  "history.details.legs": "लेग",
  "history.details.sets": "सेट",
  "history.details.avg3": "औसत /3 डार्ट",
  "history.details.checkout": "चेकआउट",
  "history.delete": "मैच हटाएँ",
  "history.confirmDelete": "क्या मैच हटाना है?",

  // -----------------------------
  // ONLINE
  // -----------------------------
  "online.title": "ऑनलाइन मोड",
  "online.subtitle": "दोस्तों के साथ दूरस्थ खेल",
  "online.login.title": "लॉगिन",
  "online.login.nickname": "उपनाम",
  "online.login.email": "ईमेल (वैकल्पिक)",
  "online.login.password": "पासवर्ड",
  "online.login.submit": "लॉगिन",
  "online.signup.title": "खाता बनाएँ",
  "online.logout": "लॉगआउट",

  "online.profile.title": "ऑनलाइन प्रोफ़ाइल",
  "online.profile.country": "देश",
  "online.profile.bio": "बायो",

  "online.lobby.title": "X01 लॉबी",
  "online.lobby.create": "लॉबी बनाएँ",
  "online.lobby.join": "लॉबी जॉइन करें",
  "online.lobby.empty": "कोई लॉबी उपलब्ध नहीं",

  "online.friends.title": "दोस्त",
  "online.friends.add": "दोस्त जोड़ें",
  "online.friends.status.online": "ऑनलाइन",
  "online.friends.status.away": "अनुपस्थित",
  "online.friends.status.offline": "ऑफ़लाइन",

  // -----------------------------
  // SETTINGS
  // -----------------------------
  "settings.title": "सेटिंग्स",
  "settings.theme.title": "नीयन थीम्स",
  "settings.theme.subtitle": "अपना माहौल चुनें",
  "settings.theme.current": "वर्तमान थीम",
  "settings.theme.applied": "लागू की गई थीम",
  "settings.lang.title": "भाषा",
  "settings.lang.subtitle": "ऐप की भाषा",
  "settings.lang.help": "इंटरफ़ेस अनुवादित है।",
  "settings.section.language": "भाषा",
  "settings.section.theme": "थीम्स",
  "settings.section.misc": "अन्य सेटिंग्स",
  "settings.misc.sounds": "ध्वनि",
  "settings.misc.vibrations": "कंपन",
  "settings.misc.animations": "एनिमेशन",
  "settings.misc.resetApp": "ऐप रीसेट",
  "settings.misc.resetConfirm": "सभी लोकल डेटा मिटाएँ?",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "सिंक और शेयर",
  "sync.subtitle": "अपने डेटा का बैकअप लें",
  "sync.tabs.local": "लोकल",
  "sync.tabs.peer": "डिवाइस-टू-डिवाइस",
  "sync.tabs.cloud": "क्लाउड",

  "sync.local.export.title": "लोकल एक्सपोर्ट",
  "sync.local.export.desc": "इस JSON को कॉपी करें और सुरक्षित रखें।",
  "sync.local.export.button": "एक्सपोर्ट बनाएँ",

  "sync.local.import.title": "लोकल इम्पोर्ट",
  "sync.local.import.desc":
    "किसी अन्य डिवाइस से एक्सपोर्ट किया JSON पेस्ट करें।",
  "sync.local.import.button": "JSON इम्पोर्ट करें",
  "sync.local.import.success": "इम्पोर्ट सफल",
  "sync.local.import.error": "JSON अमान्य है",

  "sync.peer.soon": "डिवाइस-टू-डिवाइस सिंक जल्द ही",
  "sync.cloud.soon": "क्लाउड सिंक जल्द ही",

  // -----------------------------
  // LABELS
  // -----------------------------
  "label.points": "अंक",
  "label.legs": "लेग",
  "label.sets": "सेट",
  "label.avg3": "औसत /3 डार्ट",
  "label.mpr": "MPR",
  "label.checkout": "चेकआउट",
  "label.volume": "वॉल्यूम",
  "label.duration": "अवधि",
  "label.date": "तारीख",
  "label.mode": "मोड",

  // -----------------------------
  // LANG NAMES
  // -----------------------------
  "lang.fr": "फ़्रेंच",
  "lang.en": "अंग्रेज़ी",
  "lang.es": "स्पेनिश",
  "lang.de": "जर्मन",
  "lang.it": "इटालियन",
  "lang.pt": "पुर्तगाली",
  "lang.nl": "डच",
  "lang.ru": "रूसी",
  "lang.zh": "चीनी",
  "lang.ja": "जापानी",
  "lang.ar": "अरबी",
  "lang.hi": "हिंदी",
  "lang.tr": "तुर्की",
  "lang.da": "डेनिश",
  "lang.no": "नॉर्वेजियन",
  "lang.sv": "स्वीडिश",
  "lang.is": "आइसलैंडिक",
  "lang.pl": "पोलिश",
  "lang.ro": "रोमानियाई",
  "lang.sr": "सर्बियाई",
  "lang.hr": "क्रोएशियाई",
  "lang.cs": "चेक",
};

export default hi;
