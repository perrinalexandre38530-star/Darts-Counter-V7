// ============================================
// src/i18n/tr.ts
// Dictionnaire Turc (TR) — v1
// ============================================

import type { Dict } from "../contexts/LangContext";

export const tr: Dict = {
  // -----------------------------
  // NAVIGATION / TABS
  // -----------------------------
  "nav.home": "Ana ekran",
  "nav.local": "Yerel",
  "nav.games": "Oyunlar",
  "nav.training": "Antrenman",
  "nav.online": "Çevrim içi",
  "nav.stats": "İstatistikler",
  "nav.settings": "Ayarlar",
  "nav.profiles": "Profiller",
  "nav.sync": "Senkron & paylaşım",
  "nav.back": "Geri",
  "nav.close": "Kapat",

  // -----------------------------
  // GÉNÉRIQUE / COMMUN
  // -----------------------------
  "common.ok": "Tamam",
  "common.cancel": "İptal",
  "common.yes": "Evet",
  "common.no": "Hayır",
  "common.save": "Kaydet",
  "common.edit": "Düzenle",
  "common.delete": "Sil",
  "common.confirm": "Onayla",
  "common.next": "İleri",
  "common.prev": "Geri",
  "common.start": "Başlat",
  "common.continue": "Devam et",
  "common.resume": "Kaldığın yerden devam",
  "common.pause": "Duraklat",
  "common.reset": "Sıfırla",
  "common.shuffle": "Rastgele",
  "common.loading": "Yükleniyor…",
  "common.error": "Bir hata oluştu",
  "common.info": "Bilgi",
  "common.stats": "İstatistikler",
  "common.history": "Geçmiş",
  "common.tutorial": "Eğitim",
  "common.exit": "Çık",
  "common.backHome": "Ana ekrana dön",
  "common.player": "Oyuncu",
  "common.players": "Oyuncular",
  "common.team": "Takım",
  "common.teams": "Takımlar",
  "common.points": "Puan",
  "common.average": "Ortalama",
  "common.best": "En iyi",
  "common.worst": "En kötü",
  "common.total": "Toplam",
  "common.date": "Tarih",
  "common.time": "Saat",

  // -----------------------------
  // HOME — PAGE + CARTE PROFIL + BANDEAU ARCADE
  // -----------------------------
  "home.title": "Dashboard",
  "home.subtitle": "MULTISPORTS SCORING kontrol merkezi",
  "status.online": "Çevrim içi",
  "status.away": "Uzakta",
  "status.offline": "Çevrim dışı",

  // Bandeau haut
  "home.welcome": "Hoş geldin",
  "home.welcome.noProfile": "MULTISPORTS SCORING’a hoş geldin",
  "home.hero.tagline": "Birkaç dart atmaya hazır mısın?",

  // Carte profil actif
  "home.activeProfile.title": "Aktif profil",
  "home.activeProfile.none": "Seçili profil yok",
  "home.activeProfile.select": "Bir profil seç",
  "home.activeProfile.manage": "Profilleri yönet",
  "home.activeProfile.status.online": "Bağlı",
  "home.activeProfile.status.offline": "Çevrim dışı",
  "home.activeProfile.status.guest": "Misafir",
  "home.activeProfile.badge.you": "Sen",
  "home.activeProfile.badge.local": "Yerel",
  "home.activeProfile.badge.online": "Online",

  // Stats dans la carte
  "home.activeProfile.stats.title": "Hızlı istatistikler",
  "home.activeProfile.stats.x01Avg": "X01 ortalama",
  "home.activeProfile.stats.cricketMpr": "Cricket MPR",
  "home.activeProfile.stats.trainingVolume": "Antrenman hacmi",
  "home.activeProfile.stats.lastGame": "Son maç",
  "home.activeProfile.stats.noGames": "Henüz maç yok",
  "home.activeProfile.stats.seeAll": "Tüm istatistikleri gör",

  // Actions rapides
  "home.quickActions.title": "Hızlı eylemler",
  "home.quickActions.playX01": "X01 başlat",
  "home.quickActions.playCricket": "Cricket başlat",
  "home.quickActions.training": "Antrenmana git",
  "home.quickActions.stats": "İstatistikleri aç",

  // Carrousel / bandeau de stats
  "home.statsCarousel.title": "Hızlı istatistikler",
  "home.statsCarousel.x01": "X01",
  "home.statsCarousel.cricket": "Cricket",
  "home.statsCarousel.training": "Training",

  // Bandeau arcade (ArcadeTicker)
  "home.arcadeBanner.title": "Bilgiler & yenilikler",
  "home.arcadeBanner.tapForMore": "Daha fazlası için dokun",
  "home.arcadeBanner.empty": "Şu anda gösterilecek bilgi yok",
  "home.arcadeBanner.tag.new": "Yeni",
  "home.arcadeBanner.tag.tip": "İpucu",
  "home.arcadeBanner.tag.update": "Güncelleme",

  // Gros boutons de navigation
  "home.nav.profiles": "Profiller",
  "home.nav.profiles.desc": "Yerel profiller, avatarlar ve BOTS",
  "home.nav.local": "Yerel",
  "home.nav.local.desc": "Bu tahtada oyna",
  "home.nav.online": "Online",
  "home.nav.online.desc": "Arkadaşlarınla uzaktan maçlar",
  "home.nav.training": "Training",
  "home.nav.training.desc": "Detaylı antrenman modülleri",
  "home.nav.stats": "Stats",
  "home.nav.stats.desc": "Paneller, grafikler, geçmiş",
  "home.nav.settings": "Ayarlar",
  "home.nav.settings.desc": "Temalar, dil ve tam sıfırlama",

  // -----------------------------
  // HOME / DASHBOARD — TICKER
  // -----------------------------
  "home.ticker.records": "Son rekorlar",
  "home.ticker.records.text":
    "Son zamanlarda birçok rekor kırdın, böyle devam et!",

  "home.ticker.localLast": "Son yerel maç",
  "home.ticker.localLast.text":
    "Son yerel maçının özeti.",

  "home.ticker.onlineLast": "Son online maç",
  "home.ticker.onlineLast.text":
    "Son online düellon rövanşa hazır.",

  "home.ticker.onlineLeader": "Liderlik tablosu",
  "home.ticker.onlineLeader.text":
    "Online sıralamanın zirvesinde kim var, keşfet.",

  "home.ticker.training": "Gündemdeki antrenman",
  "home.ticker.training.text":
    "X01 Training ve Saat turu seanslarının toplamı.",

  "home.ticker.month": "Aylık istatistikler",
  "home.ticker.month.text":
    "Bu ayki maç ve isabet toplamı.",

  "home.ticker.tip": "Günün ipucu",
  "home.ticker.tip.text":
    "Favori bitirişini düzenli olarak tekrar ederek pekiştir.",

  // -----------------------------
  // GAMES (LISTE DE JEUX LOCAUX)
  // -----------------------------
  "games.title": "Tüm oyunlar",
  "games.subtitle": "Bir oyun modu seç",
  "games.section.classic": "Klasikler",
  "games.section.training": "Antrenman",
  "games.section.party": "Eğlence & parti",
  "games.section.other": "Diğer modlar",
  "games.x01.title": "X01",
  "games.x01.desc": "301 / 501 / 701… tam 0’a in.",
  "games.cricket.title": "Cricket",
  "games.cricket.desc": "15–20 + Bull, aç / kapa ve puan topla.",
  "games.killer.title": "Killer",
  "games.killer.desc": "Killer ol ve diğerlerini ele.",
  "games.shanghai.title": "Shanghai",
  "games.shanghai.desc": "Her tur farklı sayı, S / D / T hedefle.",
  "games.training.menuTitle": "Training",
  "games.training.x01Solo": "X01 Solo Training",
  "games.training.clock": "Saat turu",
  "games.training.custom": "Kişisel antrenman",
  "games.training.evolution": "Gelişim istatistikleri",
  "games.info.title": "Oyun bilgisi",
  "games.info.rules": "Kurallar",
  "games.info.tips": "İpuçları",

  // -----------------------------
  // PROFILS LOCAUX
  // -----------------------------
  "profiles.title": "Yerel profiller",
  "profiles.subtitle": "Yerel oyuncularını yönet",
  "profiles.add": "Profil ekle",
  "profiles.edit": "Profili düzenle",
  "profiles.delete": "Profili sil",
  "profiles.confirmDelete": "Bu profili kalıcı olarak silmek istiyor musun?",
  "profiles.name.label": "Oyuncu adı",
  "profiles.name.placeholder": "Bir takma ad yaz",
  "profiles.avatar.label": "Avatar",
  "profiles.avatar.random": "Rastgele avatar",
  "profiles.stats.title": "Profil istatistikleri",
  "profiles.stats.x01": "X01 istatistikleri",
  "profiles.stats.cricket": "Cricket istatistikleri",
  "profiles.stats.training": "Training istatistikleri",
  "profiles.status.active": "Aktif",
  "profiles.status.inactive": "Pasif",
  "profiles.selectActive": "Aktif profil olarak ayarla",
  "profiles.list.empty": "Şimdilik profil yok",
  "profiles.list.selectHint":
    "Seçmek için bir profile dokun",
  "profiles.hint.avatarTap":
    "Avatarı değiştirmek için madalyona dokun",

  // -----------------------------
  // AVATAR CREATOR / MÉDAILLONS
  // -----------------------------
  "avatar.title": "Avatar oluşturucu",
  "avatar.subtitle": "Madalyonunu kişiselleştir",
  "avatar.style.label": "Stil",
  "avatar.style.realistic": "Hafif gerçekçi",
  "avatar.style.comic": "Çizgi roman",
  "avatar.style.flat": "Flat tasarım",
  "avatar.style.exaggerated": "Abartılı",
  "avatar.theme.label": "Tema",
  "avatar.preview.label": "Önizleme",
  "avatar.generate": "Yeni avatar oluştur",
  "avatar.keep": "Bu avatarı koru",
  "avatar.cancel": "Değişikliği iptal et",

  // -----------------------------
  // X01 CONFIG V3
  // -----------------------------
  "x01.config.title": "X01 ayarları",
  "x01.config.subtitle": "Maçını hazırla",
  "x01.config.section.players": "Oyuncular",
  "x01.config.section.match": "Maç formatı",
  "x01.config.section.rules": "Temel ayarlar",
  "x01.config.players.add": "Oyuncu ekle",
  "x01.config.players.remove": "Kaldır",
  "x01.config.players.teams": "Takımlar",
  "x01.config.mode.label": "Oyun modu",
  "x01.config.mode.solo": "Solo",
  "x01.config.mode.multi": "Multi",
  "x01.config.mode.teams": "Takımlar",
  "x01.config.raceToSets.label": "Gerekli set sayısı",
  "x01.config.raceToLegs.label": "Gerekli leg sayısı",
  "x01.config.startingScore.label": "Başlangıç skoru",
  "x01.config.startingScore.301": "301",
  "x01.config.startingScore.501": "501",
  "x01.config.startingScore.701": "701",
  "x01.config.startingScore.custom": "Özel",
  "x01.config.in.label": "In",
  "x01.config.out.label": "Out",
  "x01.config.in.simple": "Simple in",
  "x01.config.in.double": "Double in",
  "x01.config.in.master": "Master in",
  "x01.config.out.simple": "Simple out",
  "x01.config.out.double": "Double out",
  "x01.config.out.master": "Master out",
  "x01.config.service.label": "Başlama",
  "x01.config.service.random": "Rastgele",
  "x01.config.service.alternate": "Sırayla",
  "x01.config.bots.title": "BOTS (Yapay zeka)",
  "x01.config.bots.add": "Bot ekle",
  "x01.config.bots.level.easy": "Kolay",
  "x01.config.bots.level.medium": "Orta",
  "x01.config.bots.level.hard": "Zor",
  "x01.config.bots.level.pro": "Pro",
  "x01.config.startMatch": "Maçı başlat",
  "x01.config.back": "Oyunlara geri dön",

  // -----------------------------
  // X01 PLAY V3
  // -----------------------------
  "x01.play.title": "X01",
  "x01.play.leg": "Leg",
  "x01.play.set": "Set",
  "x01.play.currentPlayer": "Sıradaki",
  "x01.play.scoreRemaining": "Kalan",
  "x01.play.lastVisit": "Son ziyaret",
  "x01.play.average3": "Ortalama / 3 dart",
  "x01.play.bestVisit": "En iyi ziyaret",
  "x01.play.checkout": "Checkout",
  "x01.play.dartsThrown": "Atılan dart",
  "x01.play.visits": "Ziyaret",
  "x01.play.bust": "Bust",
  "x01.play.undo": "Ziyareti geri al",
  "x01.play.confirmExit": "Devam eden maçtan çıkmak istiyor musun?",
  "x01.play.botThinking": "Bot oynuyor…",
  "x01.play.noScoreYet": "Henüz skor yok",
  "x01.play.matchOver": "Maç bitti",
  "x01.play.legOver": "Leg bitti",
  "x01.play.setOver": "Set bitti",
  "x01.play.nextLeg": "Sonraki leg",
  "x01.play.nextSet": "Sonraki set",
  "x01.play.backToConfig": "Ayarlar ekranına dön",
  "x01.play.saveInHistory": "Geçmişe kaydet",

  // -----------------------------
  // CRICKET (JEU + PARAMS)
  // -----------------------------
  "cricket.config.title": "Cricket ayarları",
  "cricket.config.players": "Oyuncular",
  "cricket.config.raceTo.label": "Puan veya leg",
  "cricket.config.pointsWin": "Puana göre galibiyet",
  "cricket.config.legsWin": "Leg’e göre galibiyet",
  "cricket.play.title": "Cricket",
  "cricket.play.targets": "Hedefler",
  "cricket.play.hits": "Vuruşlar",
  "cricket.play.score": "Skor",
  "cricket.play.marksPerRound": "MPR",
  "cricket.play.currentPlayer": "Sıradaki",
  "cricket.play.open": "Açık",
  "cricket.play.closed": "Kapalı",
  "cricket.stats.title": "Cricket istatistikleri",
  "cricket.stats.profile": "Cricket profili",
  "cricket.stats.bestMpr": "En iyi MPR",
  "cricket.stats.averageMpr": "Ortalama MPR",
  "cricket.stats.gamesPlayed": "Oynanan maçlar",
  "cricket.stats.gamesWon": "Kazanılan maçlar",

  // -----------------------------
  // TRAINING MENU
  // -----------------------------
  "training.menu.title": "Antrenman",
  "training.menu.subtitle": "Güçlü yanlarını çalış",
  "training.menu.x01Solo": "X01 Solo Training",
  "training.menu.x01Solo.desc":
    "Her dart için detaylı takip.",
  "training.menu.clock": "Saat turu",
  "training.menu.clock.desc": "Bütün hedefleri sırayla dolaş.",
  "training.menu.evolution": "Gelişim eğrisi",
  "training.menu.evolution.desc":
    "Zaman içindeki ilerlemeni görselleştir.",
  "training.menu.custom": "Kişisel seans",
  "training.menu.resumeLast": "Son seansı devam ettir",
  "training.menu.noSession":
    "Şimdilik kayıtlı seans yok",

  // -----------------------------
  // TRAINING X01 SOLO
  // -----------------------------
  "training.x01.title": "X01 Solo Training",
  "training.x01.subtitle": "Her dartın analizi",
  "training.x01.targetScore.label": "Başlangıç skoru",
  "training.x01.throws": "Atılan dartlar",
  "training.x01.hitsBySegment": "Segmente göre vuruşlar",
  "training.x01.hits.single": "Tekler",
  "training.x01.hits.double": "Double",
  "training.x01.hits.triple": "Triple",
  "training.x01.hits.bull": "Bull",
  "training.x01.hits.dBull": "Double bull",
  "training.x01.busts": "Bustlar",
  "training.x01.avgPerDart": "Dart başına ortalama",
  "training.x01.session.save": "Seansı kaydet",
  "training.x01.session.saved": "Seans kaydedildi",
  "training.x01.session.delete": "Seansı sil",
  "training.x01.session.confirmDelete":
    "Bu antrenman seansı kalıcı olarak silinsin mi?",

  // -----------------------------
  // TRAINING CLOCK (TOUR DE L'HORLOGE)
  // -----------------------------
  "training.clock.title": "Saat turu",
  "training.clock.subtitle": "Her sayıyı sırayla vur",
  "training.clock.objective.label": "Hedef",
  "training.clock.objective.allSingles": "Tüm tekler",
  "training.clock.objective.allDoubles": "Tüm double’lar",
  "training.clock.objective.allTriples": "Tüm triple’lar",
  "training.clock.objective.custom": "Kişisel rota",
  "training.clock.timer.label": "Zamanlayıcı",
  "training.clock.timer.off": "Zamansız",
  "training.clock.timer.30": "30 saniye",
  "training.clock.timer.60": "60 saniye",
  "training.clock.timer.120": "120 saniye",
  "training.clock.players": "Oyuncular",
  "training.clock.start": "Antrenmanı başlat",
  "training.clock.currentTarget": "Güncel hedef",
  "training.clock.progress": "İlerleme",
  "training.clock.session.save": "Seansı kaydet",
  "training.clock.session.saved":
    "Saat turu seansı kaydedildi",

  // -----------------------------
  // STATSHUB / STATS SHELL
  // -----------------------------
  "stats.shell.title": "İstatistik merkezi",
  "stats.shell.tabs.local": "Yerel profiller",
  "stats.shell.tabs.training": "Training",
  "stats.shell.tabs.online": "Online",
  "stats.shell.tabs.history": "Geçmiş",
  "stats.shell.info": "Bir istatistik bölümü seç.",
  "stats.hub.local.title": "Yerel profil istatistikleri",
  "stats.hub.local.selectProfile":
    "İstatistikleri görmek için bir profil seç",
  "stats.hub.training.title": "Training istatistikleri",
  "stats.hub.online.title": "Online istatistikleri",
  "stats.hub.history.title": "Maç geçmişi",
  "stats.hub.kpi.avg3": "Ortalama /3 dart",
  "stats.hub.kpi.winRate": "G.alma oranı",
  "stats.hub.kpi.bestLeg": "En iyi leg",
  "stats.hub.kpi.checkoutRate": "Checkout %",
  "stats.hub.sparkline.recent": "Son form",
  "stats.hub.radar.skills": "Yetenek radarı",
  "stats.hub.training.clock": "Saat turu",
  "stats.hub.training.x01": "X01 Training",
  "stats.hub.training.volume": "Antrenman hacmi",
  "stats.hub.empty": "Henüz istatistik yok",

  // -----------------------------
  // HISTORY PAGE
  // -----------------------------
  "history.title": "Maç geçmişi",
  "history.subtitle": "Son maçların",
  "history.filter.all": "Tümü",
  "history.filter.x01": "X01",
  "history.filter.cricket": "Cricket",
  "history.filter.training": "Training",
  "history.empty": "Henüz kayıtlı maç yok",
  "history.match.type.x01": "X01",
  "history.match.type.cricket": "Cricket",
  "history.match.type.training": "Antrenman",
  "history.details.title": "Maç detayları",
  "history.details.players": "Oyuncular",
  "history.details.winner": "Kazanan",
  "history.details.legs": "Leg",
  "history.details.sets": "Set",
  "history.details.avg3": "Ortalama /3 dart",
  "history.details.checkout": "Checkout",
  "history.delete": "Bu maçı sil",
  "history.confirmDelete":
    "Bu maç kalıcı olarak silinsin mi?",

  // -----------------------------
  // ONLINE / MODE EN LIGNE
  // -----------------------------
  "online.title": "Online mod",
  "online.subtitle": "Arkadaşlarınla uzaktan oyna",
  "online.login.title": "Giriş",
  "online.login.nickname": "Kullanıcı adı",
  "online.login.email": "E-posta (opsiyonel)",
  "online.login.password": "Şifre",
  "online.login.submit": "Giriş yap",
  "online.signup.title": "Hesap oluştur",
  "online.logout": "Çıkış yap",
  "online.profile.title": "Online profil",
  "online.profile.country": "Ülke",
  "online.profile.bio": "Biyografi",
  "online.lobby.title": "X01 lobileri",
  "online.lobby.create": "Lobi oluştur",
  "online.lobby.join": "Lobiye katıl",
  "online.lobby.empty": "Şu anda uygun lobi yok",
  "online.friends.title": "Arkadaşlar",
  "online.friends.add": "Arkadaş ekle",
  "online.friends.status.online": "Çevrim içi",
  "online.friends.status.away": "Uzakta",
  "online.friends.status.offline": "Çevrim dışı",

  // -----------------------------
  // SETTINGS / RÉGLAGES (ancienne partie générale)
  // -----------------------------
  "settings.title": "Ayarlar",
  "settings.theme.title": "Neon temalar",
  "settings.theme.subtitle": "Kendi atmosferini seç",
  "settings.theme.current": "Mevcut tema",
  "settings.theme.applied": "Tema uygulandı",
  "settings.lang.title": "Dil",
  "settings.lang.subtitle": "Uygulama dili",
  "settings.lang.help": "Arayüz metinleri çevrildi.",
  "settings.section.language": "Dil",
  "settings.section.theme": "Temalar",
  "settings.section.misc": "Diğer ayarlar",
  "settings.misc.sounds": "Sesler",
  "settings.misc.vibrations": "Titreşim",
  "settings.misc.animations": "Görsel animasyonlar",
  "settings.misc.resetApp": "Uygulamayı sıfırla",
  "settings.misc.resetConfirm":
    "Tüm yerel veriler (profiller, geçmiş, training) sıfırlansın mı?",

  // -----------------------------
  // SYNC CENTER
  // -----------------------------
  "sync.title": "Senkron & paylaşım",
  "sync.subtitle": "Verilerini kaydet ve paylaş",
  "sync.tabs.local": "Yerel",
  "sync.tabs.peer": "Cihazdan cihaza",
  "sync.tabs.cloud": "Bulut",
  "sync.local.export.title": "Yerel dışa aktarma",
  "sync.local.export.desc":
    "Bu JSON’u kopyalayıp başka yerde sakla.",
  "sync.local.export.button": "Dışa aktarmayı üret",
  "sync.local.import.title": "Yerel içe aktarma",
  "sync.local.import.desc":
    "Başka bir cihazdan dışa aktarılan JSON’u buraya yapıştır.",
  "sync.local.import.button": "JSON içe aktar",
  "sync.local.import.success": "İçe aktarma başarılı",
  "sync.local.import.error": "İçe aktarma başarısız, JSON geçersiz.",
  "sync.peer.soon": "Cihazdan cihaza sync yakında",
  "sync.cloud.soon": "Bulut sync yakında",

  // -----------------------------
  // DIVERS / ÉTIQUETTES
  // -----------------------------
  "label.points": "Puan",
  "label.legs": "Leg",
  "label.sets": "Set",
  "label.avg3": "Ortalama /3 dart",
  "label.mpr": "MPR",
  "label.checkout": "Checkout",
  "label.volume": "Hacim",
  "label.duration": "Süre",
  "label.date": "Tarih",
  "label.mode": "Mod",

  // -----------------------------
  // SETTINGS NOUVELLE PAGE (Home > Réglages)
  // -----------------------------
  "settings.back": "Geri",
  "settings.subtitle":
    "Uygulamanın temasını ve dilini kişiselleştir",

  "settings.theme": "Tema",
  "settings.theme.group.neons": "Klasik neons",
  "settings.theme.group.soft": "Yumuşak renkler",
  "settings.theme.group.dark": "Dark Premium temalar",

  "settings.theme.gold.label": "Altın neon",
  "settings.theme.gold.desc": "Premium altın tema",

  "settings.theme.pink.label": "Pembe neon",
  "settings.theme.pink.desc": "Pembe arcade havası",

  "settings.theme.petrol.label": "Petrol mavisi",
  "settings.theme.petrol.desc": "Derin neon mavi",

  "settings.theme.green.label": "Yeşil neon",
  "settings.theme.green.desc": "Parlak antrenman stili",

  "settings.theme.magenta.label": "Magenta",
  "settings.theme.magenta.desc": "Yoğun mor / magenta",

  "settings.theme.red.label": "Kırmızı",
  "settings.theme.red.desc": "Agresif arcade kırmızısı",

  "settings.theme.orange.label": "Turuncu",
  "settings.theme.orange.desc": "Sıcak ve enerjik turuncu",

  "settings.theme.white.label": "Beyaz",
  "settings.theme.white.desc": "Modern açık arka plan",

  "settings.theme.blueOcean.label": "Okyanus mavisi",
  "settings.theme.blueOcean.desc": "Doğal okyanus / gökyüzü mavisi",

  "settings.theme.limeYellow.label": "Lime sarı",
  "settings.theme.limeYellow.desc": "Çok parlak lime tonu",

  "settings.theme.sage.label": "Adaçayı yeşili",
  "settings.theme.sage.desc": "Yumuşak doğal yeşiller",

  "settings.theme.skyBlue.label": "Pastel mavi",
  "settings.theme.skyBlue.desc": "Çok yumuşak ve parlak mavi",

  "settings.theme.darkTitanium.label": "Koyu titanyum",
  "settings.theme.darkTitanium.desc": "Mat metal premium görünüm",

  "settings.theme.darkCarbon.label": "Karbon",
  "settings.theme.darkCarbon.desc": "Modern karbon fiber havası",

  "settings.theme.darkFrost.label": "Koyu buz",
  "settings.theme.darkFrost.desc": "Buzlu futuristik siyah",

  "settings.theme.darkObsidian.label": "Obsidyen",
  "settings.theme.darkObsidian.desc":
    "Parlak, okunabilir premium siyah",

  "settings.lang": "Dil",

  "settings.reset.title": "Uygulamayı sıfırla",
  "settings.reset.subtitle":
    "Tüm yerel profiller, BOTS, istatistikler, maç geçmişi ve ayarlar silinir. İşlem geri alınamaz.",
  "settings.reset.button": "Her şeyi sıfırla",

  // -----------------------------
  // Noms de langues (TR)
  // -----------------------------
  "lang.fr": "Fransızca",
  "lang.en": "İngilizce",
  "lang.es": "İspanyolca",
  "lang.de": "Almanca",
  "lang.it": "İtalyanca",
  "lang.pt": "Portekizce",
  "lang.nl": "Felemenkçe",
  "lang.ru": "Rusça",
  "lang.zh": "Çince",
  "lang.ja": "Japonca",
  "lang.ar": "Arapça",
  "lang.hi": "Hintçe",
  "lang.tr": "Türkçe",
  "lang.da": "Danca",
  "lang.no": "Norveççe",
  "lang.sv": "İsveççe",
  "lang.is": "İzlandaca",
  "lang.pl": "Lehçe",
  "lang.ro": "Romence",
  "lang.sr": "Sırpça",
  "lang.hr": "Hırvatça",
  "lang.cs": "Çekçe",
};

export default tr;
