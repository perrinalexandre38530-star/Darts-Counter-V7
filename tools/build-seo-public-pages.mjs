import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const CATALOG_PATH = path.join(PUBLIC, 'seo', 'catalog-v2.json');
const SITEMAP_PATH = path.join(PUBLIC, 'sitemap.xml');
const BASE = 'https://multisports-scoring.pages.dev';
const PLAY = 'https://play.google.com/store/apps/details?id=com.multisportsscoring.app';
const TODAY = new Date().toISOString().slice(0, 10);

const locale = {
  fr:{name:'Français',dir:'ltr',home:'Accueil',play:'Voir sur Google Play',web:'Ouvrir l’application Web',features:'Fonctions principales',availability:'Disponibilité',others:'Autres disciplines',languages:'Langues',faq:'Questions fréquentes',faqQ:'À quoi sert cette page ?',faqA:'Cette page publique permet aux utilisateurs et aux moteurs de recherche de découvrir ce module avant d’ouvrir l’application.',android:'Disponible dans la version Android publique et sur le Web/PWA.',webOnly:'Disponible dans le catalogue Web/PWA. La disponibilité dans la version Android publique peut différer.',homeTitle:'MULTISPORTS SCORING – scores et statistiques',homeH1:'Le scoring et la performance de plusieurs disciplines dans une seule application.',homeLead:'MULTISPORTS SCORING réunit scores, statistiques, profils et suivi des performances dans un même univers Android et Web/PWA.',available:'Disciplines disponibles',about:'Un univers multi-sports',aboutText:'Chaque discipline dispose de son propre espace avec ses outils de score, de suivi ou de performance.',scoreTitle:'{sport} : compteur de score',scoreLead:'Suivez les scores, les joueurs et les matchs de {sport} avec MULTISPORTS SCORING.',perfTitle:'{sport} : suivi des performances',perfLead:'Enregistrez et analysez vos activités de {sport} dans MULTISPORTS SCORING.',hubTitle:'{sport} : espace compétitif',hubLead:'Retrouvez les sessions, la progression et les fonctions compétitives de {sport} dans MULTISPORTS SCORING.'},
  en:{name:'English',dir:'ltr',home:'Home',play:'View on Google Play',web:'Open the Web app',features:'Main features',availability:'Availability',others:'Other sports',languages:'Languages',faq:'Frequently asked questions',faqQ:'What is this page for?',faqA:'This public landing page helps users and search engines discover the module before opening the application.',android:'Available in the public Android version and on Web/PWA.',webOnly:'Available in the Web/PWA catalogue. Public Android availability may differ.',homeTitle:'MULTISPORTS SCORING – scores, stats and performance',homeH1:'Scoring and performance for multiple sports in one application.',homeLead:'MULTISPORTS SCORING combines scores, statistics, player profiles and performance tracking across Android and Web/PWA.',available:'Available sports',about:'One multi-sport ecosystem',aboutText:'Each sport has its own space with scoring, tracking or performance tools.',scoreTitle:'{sport} score counter',scoreLead:'Track scores, players and matches for {sport} with MULTISPORTS SCORING.',perfTitle:'{sport} performance tracker',perfLead:'Record and analyse your {sport} activities in MULTISPORTS SCORING.',hubTitle:'{sport} competitive hub',hubLead:'Explore {sport} sessions, progression and competitive features in MULTISPORTS SCORING.'},
  es:{name:'Español',dir:'ltr',home:'Inicio',play:'Ver en Google Play',web:'Abrir la aplicación Web',features:'Funciones principales',availability:'Disponibilidad',others:'Otras disciplinas',languages:'Idiomas',faq:'Preguntas frecuentes',faqQ:'¿Para qué sirve esta página?',faqA:'Esta página pública ayuda a los usuarios y a los motores de búsqueda a descubrir el módulo antes de abrir la aplicación.',android:'Disponible en la versión pública de Android y en Web/PWA.',webOnly:'Disponible en el catálogo Web/PWA. La disponibilidad pública en Android puede variar.',homeTitle:'MULTISPORTS SCORING – marcadores y estadísticas',homeH1:'Marcadores y rendimiento de varios deportes en una sola aplicación.',homeLead:'MULTISPORTS SCORING reúne marcadores, estadísticas, perfiles y seguimiento del rendimiento en Android y Web/PWA.',available:'Disciplinas disponibles',about:'Un universo multideporte',aboutText:'Cada disciplina dispone de su propio espacio con herramientas de puntuación, seguimiento o rendimiento.',scoreTitle:'Marcador de {sport}',scoreLead:'Sigue los puntos, jugadores y partidos de {sport} con MULTISPORTS SCORING.',perfTitle:'Rendimiento de {sport}',perfLead:'Registra y analiza tus actividades de {sport} en MULTISPORTS SCORING.',hubTitle:'Centro competitivo de {sport}',hubLead:'Descubre sesiones, progresión y funciones competitivas de {sport} en MULTISPORTS SCORING.'},
  de:{name:'Deutsch',dir:'ltr',home:'Startseite',play:'Bei Google Play ansehen',web:'Web-App öffnen',features:'Hauptfunktionen',availability:'Verfügbarkeit',others:'Weitere Sportarten',languages:'Sprachen',faq:'Häufige Fragen',faqQ:'Wozu dient diese Seite?',faqA:'Diese öffentliche Seite hilft Nutzern und Suchmaschinen, das Modul vor dem Öffnen der App zu entdecken.',android:'In der öffentlichen Android-Version und im Web/PWA verfügbar.',webOnly:'Im Web/PWA-Katalog verfügbar. Die Verfügbarkeit in der öffentlichen Android-Version kann abweichen.',homeTitle:'MULTISPORTS SCORING – Punkte und Statistiken',homeH1:'Punkte und Leistung für mehrere Sportarten in einer App.',homeLead:'MULTISPORTS SCORING vereint Punktezähler, Statistiken, Profile und Leistungstracking auf Android und Web/PWA.',available:'Verfügbare Sportarten',about:'Ein Multi-Sport-Ökosystem',aboutText:'Jede Sportart besitzt einen eigenen Bereich mit Scoring-, Tracking- oder Leistungsfunktionen.',scoreTitle:'{sport}: Punktezähler',scoreLead:'Verfolge Punkte, Spieler und Matches für {sport} mit MULTISPORTS SCORING.',perfTitle:'{sport}: Leistungstracking',perfLead:'Zeichne deine {sport}-Aktivitäten in MULTISPORTS SCORING auf und analysiere sie.',hubTitle:'{sport}: Wettbewerbsbereich',hubLead:'Nutze {sport}-Sessions, Fortschritt und Wettbewerbsfunktionen in MULTISPORTS SCORING.'},
  it:{name:'Italiano',dir:'ltr',home:'Home',play:'Vedi su Google Play',web:'Apri l’app Web',features:'Funzioni principali',availability:'Disponibilità',others:'Altri sport',languages:'Lingue',faq:'Domande frequenti',faqQ:'A cosa serve questa pagina?',faqA:'Questa pagina pubblica aiuta utenti e motori di ricerca a scoprire il modulo prima di aprire l’app.',android:'Disponibile nella versione Android pubblica e sul Web/PWA.',webOnly:'Disponibile nel catalogo Web/PWA. La disponibilità nella versione Android pubblica può variare.',homeTitle:'MULTISPORTS SCORING – punteggi e statistiche',homeH1:'Punteggi e prestazioni di più sport in un’unica app.',homeLead:'MULTISPORTS SCORING riunisce punteggi, statistiche, profili e monitoraggio delle prestazioni su Android e Web/PWA.',available:'Sport disponibili',about:'Un ecosistema multisport',aboutText:'Ogni sport dispone di un proprio spazio con strumenti di punteggio, monitoraggio o performance.',scoreTitle:'{sport}: segnapunti',scoreLead:'Tieni traccia di punti, giocatori e partite di {sport} con MULTISPORTS SCORING.',perfTitle:'Prestazioni {sport}',perfLead:'Registra e analizza le tue attività di {sport} in MULTISPORTS SCORING.',hubTitle:'Centro competitivo {sport}',hubLead:'Accedi a sessioni, progressione e funzioni competitive di {sport} in MULTISPORTS SCORING.'},
  pt:{name:'Português',dir:'ltr',home:'Início',play:'Ver no Google Play',web:'Abrir a aplicação Web',features:'Principais funções',availability:'Disponibilidade',others:'Outros desportos',languages:'Idiomas',faq:'Perguntas frequentes',faqQ:'Para que serve esta página?',faqA:'Esta página pública ajuda utilizadores e motores de pesquisa a descobrir o módulo antes de abrir a aplicação.',android:'Disponível na versão pública Android e na Web/PWA.',webOnly:'Disponível no catálogo Web/PWA. A disponibilidade na versão pública Android pode ser diferente.',homeTitle:'MULTISPORTS SCORING – placares e estatísticas',homeH1:'Pontuação e desempenho de vários desportos numa única aplicação.',homeLead:'MULTISPORTS SCORING reúne pontuação, estatísticas, perfis e acompanhamento de desempenho em Android e Web/PWA.',available:'Desportos disponíveis',about:'Um ecossistema multidesportivo',aboutText:'Cada desporto tem o seu próprio espaço com ferramentas de pontuação, acompanhamento ou desempenho.',scoreTitle:'Marcador de {sport}',scoreLead:'Acompanhe pontos, jogadores e partidas de {sport} com MULTISPORTS SCORING.',perfTitle:'Desempenho {sport}',perfLead:'Registe e analise as suas atividades de {sport} no MULTISPORTS SCORING.',hubTitle:'Centro competitivo de {sport}',hubLead:'Aceda a sessões, progressão e recursos competitivos de {sport} no MULTISPORTS SCORING.'},
  nl:{name:'Nederlands',dir:'ltr',home:'Home',play:'Bekijken op Google Play',web:'Web-app openen',features:'Belangrijkste functies',availability:'Beschikbaarheid',others:'Andere sporten',languages:'Talen',faq:'Veelgestelde vragen',faqQ:'Waarvoor dient deze pagina?',faqA:'Deze openbare pagina helpt gebruikers en zoekmachines de module te ontdekken voordat de app wordt geopend.',android:'Beschikbaar in de openbare Android-versie en op Web/PWA.',webOnly:'Beschikbaar in de Web/PWA-catalogus. De openbare Android-beschikbaarheid kan afwijken.',homeTitle:'MULTISPORTS SCORING – scores en statistieken',homeH1:'Scores en prestaties voor meerdere sporten in één app.',homeLead:'MULTISPORTS SCORING combineert scores, statistieken, profielen en prestatietracking op Android en Web/PWA.',available:'Beschikbare sporten',about:'Eén multisport-ecosysteem',aboutText:'Elke sport heeft een eigen omgeving met score-, tracking- of prestatietools.',scoreTitle:'{sport}: scoreteller',scoreLead:'Volg scores, spelers en wedstrijden voor {sport} met MULTISPORTS SCORING.',perfTitle:'{sport}: prestatietracker',perfLead:'Registreer en analyseer je {sport}-activiteiten in MULTISPORTS SCORING.',hubTitle:'{sport}: competitiehub',hubLead:'Gebruik {sport}-sessies, voortgang en competitieve functies in MULTISPORTS SCORING.'},
  ru:{name:'Русский',dir:'ltr',home:'Главная',play:'Открыть в Google Play',web:'Открыть Web-приложение',features:'Основные функции',availability:'Доступность',others:'Другие виды спорта',languages:'Языки',faq:'Частые вопросы',faqQ:'Для чего нужна эта страница?',faqA:'Эта публичная страница помогает пользователям и поисковым системам узнать о модуле до открытия приложения.',android:'Доступно в публичной версии Android и в Web/PWA.',webOnly:'Доступно в каталоге Web/PWA. Наличие в публичной версии Android может отличаться.',homeTitle:'MULTISPORTS SCORING – счёт и статистика',homeH1:'Счёт и результаты для нескольких видов спорта в одном приложении.',homeLead:'MULTISPORTS SCORING объединяет счёт, статистику, профили и отслеживание результатов на Android и Web/PWA.',available:'Доступные виды спорта',about:'Единая мультиспортивная система',aboutText:'Для каждого вида спорта есть отдельный раздел с инструментами счёта, отслеживания или результатов.',scoreTitle:'{sport} — счёт',scoreLead:'Отслеживайте очки, игроков и матчи для {sport} в MULTISPORTS SCORING.',perfTitle:'Результаты {sport}',perfLead:'Записывайте и анализируйте занятия {sport} в MULTISPORTS SCORING.',hubTitle:'Центр {sport}',hubLead:'Используйте сессии, прогресс и соревновательные функции {sport} в MULTISPORTS SCORING.'},
  zh:{name:'中文',dir:'ltr',home:'首页',play:'在 Google Play 查看',web:'打开 Web 应用',features:'主要功能',availability:'可用性',others:'其他运动',languages:'语言',faq:'常见问题',faqQ:'这个页面有什么作用？',faqA:'这个公开页面帮助用户和搜索引擎在打开应用之前了解对应模块。',android:'Android 公共版本和 Web/PWA 均可用。',webOnly:'Web/PWA 目录中可用；Android 公共版本的可用性可能不同。',homeTitle:'MULTISPORTS SCORING – 多运动计分与统计',homeH1:'一个应用管理多种运动的计分与表现。',homeLead:'MULTISPORTS SCORING 在 Android 和 Web/PWA 中整合计分、统计、个人资料和运动表现追踪。',available:'可用运动',about:'一个多运动生态',aboutText:'每种运动都有独立空间，提供计分、追踪或表现工具。',scoreTitle:'{sport}计分器',scoreLead:'使用 MULTISPORTS SCORING 记录 {sport} 的比分、玩家和比赛。',perfTitle:'{sport}表现追踪',perfLead:'使用 MULTISPORTS SCORING 记录并分析你的 {sport} 活动。',hubTitle:'{sport}竞技中心',hubLead:'在 MULTISPORTS SCORING 中查看 {sport} 会话、进度与竞技功能。'},
  ja:{name:'日本語',dir:'ltr',home:'ホーム',play:'Google Play で見る',web:'Web アプリを開く',features:'主な機能',availability:'利用状況',others:'その他のスポーツ',languages:'言語',faq:'よくある質問',faqQ:'このページの目的は？',faqA:'この公開ページは、アプリを開く前にユーザーと検索エンジンがモジュールを見つけやすくするためのものです。',android:'Android 公開版と Web/PWA で利用できます。',webOnly:'Web/PWA カタログで利用できます。Android 公開版では利用状況が異なる場合があります。',homeTitle:'MULTISPORTS SCORING – スコア・統計・パフォーマンス',homeH1:'複数スポーツのスコアとパフォーマンスを1つのアプリで。',homeLead:'MULTISPORTS SCORING は Android と Web/PWA でスコア、統計、プロフィール、パフォーマンス追跡をまとめます。',available:'利用できるスポーツ',about:'マルチスポーツの統合環境',aboutText:'各スポーツには、スコア、追跡、パフォーマンス用の専用スペースがあります。',scoreTitle:'{sport} スコアカウンター',scoreLead:'MULTISPORTS SCORING で {sport} のスコア、プレイヤー、試合を記録します。',perfTitle:'{sport} パフォーマンス記録',perfLead:'MULTISPORTS SCORING で {sport} のアクティビティを記録・分析します。',hubTitle:'{sport} 競技ハブ',hubLead:'MULTISPORTS SCORING で {sport} のセッション、進捗、競技機能を利用します。'},
  ar:{name:'العربية',dir:'rtl',home:'الرئيسية',play:'عرض على Google Play',web:'فتح تطبيق الويب',features:'الميزات الرئيسية',availability:'التوفر',others:'رياضات أخرى',languages:'اللغات',faq:'الأسئلة الشائعة',faqQ:'ما فائدة هذه الصفحة؟',faqA:'تساعد هذه الصفحة العامة المستخدمين ومحركات البحث على اكتشاف الوحدة قبل فتح التطبيق.',android:'متاح في إصدار Android العام وعلى Web/PWA.',webOnly:'متاح في كتالوج Web/PWA. قد يختلف التوفر في إصدار Android العام.',homeTitle:'MULTISPORTS SCORING – النتائج والإحصاءات',homeH1:'النتائج والأداء لعدة رياضات في تطبيق واحد.',homeLead:'يجمع MULTISPORTS SCORING تسجيل النتائج والإحصاءات والملفات الشخصية وتتبع الأداء على Android وWeb/PWA.',available:'الرياضات المتاحة',about:'منظومة متعددة الرياضات',aboutText:'لكل رياضة مساحة خاصة بها مع أدوات للنتائج أو التتبع أو الأداء.',scoreTitle:'عداد نقاط {sport}',scoreLead:'تابع النتائج واللاعبين والمباريات في {sport} باستخدام MULTISPORTS SCORING.',perfTitle:'{sport} — متابعة الأداء',perfLead:'سجل وحلل أنشطة {sport} باستخدام MULTISPORTS SCORING.',hubTitle:'مركز {sport}',hubLead:'تابع جلسات {sport} والتقدم والميزات التنافسية في MULTISPORTS SCORING.'},
  hi:{name:'हिन्दी',dir:'ltr',home:'होम',play:'Google Play पर देखें',web:'Web ऐप खोलें',features:'मुख्य सुविधाएँ',availability:'उपलब्धता',others:'अन्य खेल',languages:'भाषाएँ',faq:'अक्सर पूछे जाने वाले प्रश्न',faqQ:'यह पेज किस लिए है?',faqA:'यह सार्वजनिक पेज ऐप खोलने से पहले उपयोगकर्ताओं और सर्च इंजनों को मॉड्यूल खोजने में मदद करता है।',android:'सार्वजनिक Android संस्करण और Web/PWA पर उपलब्ध।',webOnly:'Web/PWA कैटलॉग में उपलब्ध। सार्वजनिक Android उपलब्धता अलग हो सकती है।',homeTitle:'MULTISPORTS SCORING – स्कोर, आँकड़े और प्रदर्शन',homeH1:'कई खेलों का स्कोर और प्रदर्शन एक ही ऐप में।',homeLead:'MULTISPORTS SCORING Android और Web/PWA पर स्कोर, आँकड़े, प्रोफ़ाइल और प्रदर्शन ट्रैकिंग को एक साथ लाता है।',available:'उपलब्ध खेल',about:'एक मल्टी-स्पोर्ट इकोसिस्टम',aboutText:'हर खेल का अपना क्षेत्र है जिसमें स्कोर, ट्रैकिंग या प्रदर्शन टूल हैं।',scoreTitle:'{sport} स्कोर काउंटर',scoreLead:'MULTISPORTS SCORING में {sport} के स्कोर, खिलाड़ी और मैच ट्रैक करें।',perfTitle:'{sport} प्रदर्शन ट्रैकर',perfLead:'MULTISPORTS SCORING में अपनी {sport} गतिविधियाँ रिकॉर्ड और विश्लेषित करें।',hubTitle:'{sport} प्रतिस्पर्धी केंद्र',hubLead:'MULTISPORTS SCORING में {sport} सत्र, प्रगति और प्रतिस्पर्धी फीचर देखें।'},
  tr:{name:'Türkçe',dir:'ltr',home:'Ana sayfa',play:'Google Play’de görüntüle',web:'Web uygulamasını aç',features:'Ana özellikler',availability:'Kullanılabilirlik',others:'Diğer sporlar',languages:'Diller',faq:'Sık sorulan sorular',faqQ:'Bu sayfa ne için kullanılır?',faqA:'Bu herkese açık sayfa, kullanıcıların ve arama motorlarının uygulamayı açmadan önce modülü keşfetmesine yardımcı olur.',android:'Genel Android sürümünde ve Web/PWA üzerinde kullanılabilir.',webOnly:'Web/PWA kataloğunda kullanılabilir. Genel Android kullanılabilirliği farklı olabilir.',homeTitle:'MULTISPORTS SCORING – skorlar ve istatistikler',homeH1:'Birden fazla sporun skoru ve performansı tek uygulamada.',homeLead:'MULTISPORTS SCORING Android ve Web/PWA üzerinde skor, istatistik, profil ve performans takibini bir araya getirir.',available:'Mevcut sporlar',about:'Tek bir çok sporlu ekosistem',aboutText:'Her sporun skor, takip veya performans araçları için özel bir alanı vardır.',scoreTitle:'{sport} skor sayacı',scoreLead:'MULTISPORTS SCORING ile {sport} skorlarını, oyuncuları ve maçları takip edin.',perfTitle:'{sport} performans takibi',perfLead:'MULTISPORTS SCORING ile {sport} aktivitelerinizi kaydedin ve analiz edin.',hubTitle:'{sport} rekabet merkezi',hubLead:'MULTISPORTS SCORING içinde {sport} oturumlarını, ilerlemeyi ve rekabetçi özellikleri kullanın.'},
  da:{name:'Dansk',dir:'ltr',home:'Forside',play:'Se på Google Play',web:'Åbn Web-appen',features:'Vigtigste funktioner',availability:'Tilgængelighed',others:'Andre sportsgrene',languages:'Sprog',faq:'Ofte stillede spørgsmål',faqQ:'Hvad bruges denne side til?',faqA:'Denne offentlige side hjælper brugere og søgemaskiner med at opdage modulet, før appen åbnes.',android:'Tilgængelig i den offentlige Android-version og på Web/PWA.',webOnly:'Tilgængelig i Web/PWA-kataloget. Offentlig Android-tilgængelighed kan variere.',homeTitle:'MULTISPORTS SCORING – resultater og statistik',homeH1:'Score og præstation for flere sportsgrene i én app.',homeLead:'MULTISPORTS SCORING samler score, statistik, profiler og præstationsmåling på Android og Web/PWA.',available:'Tilgængelige sportsgrene',about:'Ét multisport-økosystem',aboutText:'Hver sportsgren har sit eget område med score-, tracking- eller præstationsværktøjer.',scoreTitle:'{sport} pointtæller',scoreLead:'Følg score, spillere og kampe i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} præstationsmåling',perfLead:'Registrer og analyser dine {sport}-aktiviteter med MULTISPORTS SCORING.',hubTitle:'{sport} konkurrencehub',hubLead:'Brug {sport}-sessioner, progression og konkurrencefunktioner i MULTISPORTS SCORING.'},
  no:{name:'Norsk',dir:'ltr',home:'Hjem',play:'Se på Google Play',web:'Åpne Web-appen',features:'Hovedfunksjoner',availability:'Tilgjengelighet',others:'Andre idretter',languages:'Språk',faq:'Ofte stilte spørsmål',faqQ:'Hva brukes denne siden til?',faqA:'Denne offentlige siden hjelper brukere og søkemotorer med å oppdage modulen før appen åpnes.',android:'Tilgjengelig i offentlig Android-versjon og på Web/PWA.',webOnly:'Tilgjengelig i Web/PWA-katalogen. Offentlig Android-tilgjengelighet kan variere.',homeTitle:'MULTISPORTS SCORING – poeng og statistikk',homeH1:'Score og prestasjon for flere idretter i én app.',homeLead:'MULTISPORTS SCORING samler score, statistikk, profiler og prestasjonssporing på Android og Web/PWA.',available:'Tilgjengelige idretter',about:'Ett multisport-økosystem',aboutText:'Hver idrett har sitt eget område med verktøy for score, sporing eller prestasjon.',scoreTitle:'{sport} poengteller',scoreLead:'Følg poeng, spillere og kamper i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} prestasjonsmåling',perfLead:'Registrer og analyser {sport}-aktivitetene dine med MULTISPORTS SCORING.',hubTitle:'{sport} konkurransesenter',hubLead:'Bruk {sport}-økter, progresjon og konkurransefunksjoner i MULTISPORTS SCORING.'},
  sv:{name:'Svenska',dir:'ltr',home:'Hem',play:'Visa på Google Play',web:'Öppna Web-appen',features:'Huvudfunktioner',availability:'Tillgänglighet',others:'Andra sporter',languages:'Språk',faq:'Vanliga frågor',faqQ:'Vad används den här sidan till?',faqA:'Den här offentliga sidan hjälper användare och sökmotorer att upptäcka modulen innan appen öppnas.',android:'Tillgänglig i offentlig Android-version och på Web/PWA.',webOnly:'Tillgänglig i Web/PWA-katalogen. Offentlig Android-tillgänglighet kan skilja sig.',homeTitle:'MULTISPORTS SCORING – poäng och statistik',homeH1:'Poäng och prestation för flera sporter i en app.',homeLead:'MULTISPORTS SCORING samlar poäng, statistik, profiler och prestationsspårning på Android och Web/PWA.',available:'Tillgängliga sporter',about:'Ett multisport-ekosystem',aboutText:'Varje sport har ett eget område med verktyg för poäng, spårning eller prestation.',scoreTitle:'{sport} poängräknare',scoreLead:'Följ poäng, spelare och matcher i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} prestationsmätning',perfLead:'Registrera och analysera dina {sport}-aktiviteter med MULTISPORTS SCORING.',hubTitle:'{sport} tävlingscenter',hubLead:'Använd {sport}-sessioner, progression och tävlingsfunktioner i MULTISPORTS SCORING.'},
  is:{name:'Íslenska',dir:'ltr',home:'Heim',play:'Skoða á Google Play',web:'Opna Web-appið',features:'Helstu eiginleikar',availability:'Framboð',others:'Aðrar íþróttir',languages:'Tungumál',faq:'Algengar spurningar',faqQ:'Til hvers er þessi síða?',faqA:'Þessi opinbera síða hjálpar notendum og leitarvélum að finna eininguna áður en appið er opnað.',android:'Tiltækt í opinberri Android-útgáfu og á Web/PWA.',webOnly:'Tiltækt í Web/PWA. Framboð í opinberri Android-útgáfu getur verið annað.',homeTitle:'MULTISPORTS SCORING – stig og tölfræði',homeH1:'Stig og árangur fyrir margar íþróttir í einu appi.',homeLead:'MULTISPORTS SCORING sameinar stig, tölfræði, prófíla og frammistöðumælingu á Android og Web/PWA.',available:'Tiltækar íþróttir',about:'Eitt fjölíþróttaumhverfi',aboutText:'Hver íþrótt hefur sitt eigið svæði með verkfærum fyrir stig, mælingu eða frammistöðu.',scoreTitle:'{sport} stigateljari',scoreLead:'Fylgstu með stigum, leikmönnum og leikjum í {sport} með MULTISPORTS SCORING.',perfTitle:'{sport} frammistöðumæling',perfLead:'Skráðu og greindu {sport}-æfingar með MULTISPORTS SCORING.',hubTitle:'{sport} keppnismiðstöð',hubLead:'Notaðu {sport}-lotur, framvindu og keppniseiginleika í MULTISPORTS SCORING.'},
  pl:{name:'Polski',dir:'ltr',home:'Strona główna',play:'Zobacz w Google Play',web:'Otwórz aplikację Web',features:'Główne funkcje',availability:'Dostępność',others:'Inne dyscypliny',languages:'Języki',faq:'Najczęstsze pytania',faqQ:'Do czego służy ta strona?',faqA:'Ta publiczna strona pomaga użytkownikom i wyszukiwarkom odkryć moduł przed otwarciem aplikacji.',android:'Dostępne w publicznej wersji Android oraz Web/PWA.',webOnly:'Dostępne w katalogu Web/PWA. Publiczna wersja Android może się różnić.',homeTitle:'MULTISPORTS SCORING – wyniki i statystyki',homeH1:'Wyniki i postępy wielu dyscyplin w jednej aplikacji.',homeLead:'MULTISPORTS SCORING łączy wyniki, statystyki, profile i śledzenie osiągnięć na Androidzie i Web/PWA.',available:'Dostępne dyscypliny',about:'Jeden ekosystem multisportowy',aboutText:'Każda dyscyplina ma własną przestrzeń z narzędziami do wyników, śledzenia lub wydajności.',scoreTitle:'{sport} – licznik punktów',scoreLead:'Śledź wyniki, graczy i mecze {sport} w MULTISPORTS SCORING.',perfTitle:'{sport} – śledzenie wyników',perfLead:'Rejestruj i analizuj aktywności {sport} w MULTISPORTS SCORING.',hubTitle:'{sport} – centrum rywalizacji',hubLead:'Korzystaj z sesji, progresji i funkcji rywalizacji {sport} w MULTISPORTS SCORING.'},
  ro:{name:'Română',dir:'ltr',home:'Acasă',play:'Vezi pe Google Play',web:'Deschide aplicația Web',features:'Funcții principale',availability:'Disponibilitate',others:'Alte sporturi',languages:'Limbi',faq:'Întrebări frecvente',faqQ:'La ce folosește această pagină?',faqA:'Această pagină publică ajută utilizatorii și motoarele de căutare să descopere modulul înainte de a deschide aplicația.',android:'Disponibil în versiunea publică Android și pe Web/PWA.',webOnly:'Disponibil în catalogul Web/PWA. Disponibilitatea Android publică poate diferi.',homeTitle:'MULTISPORTS SCORING – scoruri și statistici',homeH1:'Scor și performanță pentru mai multe sporturi într-o singură aplicație.',homeLead:'MULTISPORTS SCORING reunește scoruri, statistici, profiluri și monitorizarea performanței pe Android și Web/PWA.',available:'Sporturi disponibile',about:'Un singur ecosistem multisport',aboutText:'Fiecare sport are propriul spațiu cu instrumente de scor, monitorizare sau performanță.',scoreTitle:'{sport} – contor de scor',scoreLead:'Urmărește scoruri, jucători și meciuri de {sport} cu MULTISPORTS SCORING.',perfTitle:'Performanță {sport}',perfLead:'Înregistrează și analizează activitățile de {sport} cu MULTISPORTS SCORING.',hubTitle:'{sport} – centru competitiv',hubLead:'Accesează sesiuni, progres și funcții competitive de {sport} în MULTISPORTS SCORING.'},
  sr:{name:'Srpski',dir:'ltr',home:'Početna',play:'Pogledaj na Google Play',web:'Otvori Web aplikaciju',features:'Glavne funkcije',availability:'Dostupnost',others:'Drugi sportovi',languages:'Jezici',faq:'Česta pitanja',faqQ:'Čemu služi ova stranica?',faqA:'Ova javna stranica pomaže korisnicima i pretraživačima da otkriju modul pre otvaranja aplikacije.',android:'Dostupno u javnoj Android verziji i na Web/PWA.',webOnly:'Dostupno u Web/PWA katalogu. Javna Android dostupnost može biti drugačija.',homeTitle:'MULTISPORTS SCORING – rezultati i statistika',homeH1:'Rezultati i napredak za više sportova u jednoj aplikaciji.',homeLead:'MULTISPORTS SCORING objedinjuje rezultate, statistiku, profile i praćenje učinka na Androidu i Web/PWA.',available:'Dostupni sportovi',about:'Jedan multisport ekosistem',aboutText:'Svaki sport ima svoj prostor sa alatima za rezultat, praćenje ili učinak.',scoreTitle:'Rezultat: {sport}',scoreLead:'Pratite rezultat, igrače i mečeve za {sport} u MULTISPORTS SCORING.',perfTitle:'{sport} – praćenje učinka',perfLead:'Beležite i analizirajte {sport} aktivnosti u MULTISPORTS SCORING.',hubTitle:'{sport} – takmičarski centar',hubLead:'Koristite {sport} sesije, napredak i takmičarske funkcije u MULTISPORTS SCORING.'},
  hr:{name:'Hrvatski',dir:'ltr',home:'Početna',play:'Pogledaj na Google Play',web:'Otvori Web aplikaciju',features:'Glavne funkcije',availability:'Dostupnost',others:'Drugi sportovi',languages:'Jezici',faq:'Česta pitanja',faqQ:'Čemu služi ova stranica?',faqA:'Ova javna stranica pomaže korisnicima i tražilicama otkriti modul prije otvaranja aplikacije.',android:'Dostupno u javnoj Android verziji i na Web/PWA.',webOnly:'Dostupno u Web/PWA katalogu. Javna Android dostupnost može se razlikovati.',homeTitle:'MULTISPORTS SCORING – rezultati i statistika',homeH1:'Rezultati i napredak za više sportova u jednoj aplikaciji.',homeLead:'MULTISPORTS SCORING objedinjuje rezultate, statistiku, profile i praćenje izvedbe na Androidu i Web/PWA.',available:'Dostupni sportovi',about:'Jedan multisport ekosustav',aboutText:'Svaki sport ima svoj prostor s alatima za rezultat, praćenje ili izvedbu.',scoreTitle:'Rezultat: {sport}',scoreLead:'Pratite rezultat, igrače i mečeve za {sport} u MULTISPORTS SCORING.',perfTitle:'{sport} – praćenje izvedbe',perfLead:'Bilježite i analizirajte {sport} aktivnosti u MULTISPORTS SCORING.',hubTitle:'{sport} – natjecateljski centar',hubLead:'Koristite {sport} sesije, napredak i natjecateljske funkcije u MULTISPORTS SCORING.'},
  cs:{name:'Čeština',dir:'ltr',home:'Domů',play:'Zobrazit na Google Play',web:'Otevřít Web aplikaci',features:'Hlavní funkce',availability:'Dostupnost',others:'Další sporty',languages:'Jazyky',faq:'Časté otázky',faqQ:'K čemu tato stránka slouží?',faqA:'Tato veřejná stránka pomáhá uživatelům a vyhledávačům objevit modul před otevřením aplikace.',android:'Dostupné ve veřejné Android verzi a na Web/PWA.',webOnly:'Dostupné v katalogu Web/PWA. Veřejná dostupnost na Androidu se může lišit.',homeTitle:'MULTISPORTS SCORING – skóre a statistiky',homeH1:'Skóre a výkon pro více sportů v jedné aplikaci.',homeLead:'MULTISPORTS SCORING spojuje skóre, statistiky, profily a sledování výkonu na Androidu a Web/PWA.',available:'Dostupné sporty',about:'Jeden multisportovní ekosystém',aboutText:'Každý sport má vlastní prostor s nástroji pro skóre, sledování nebo výkon.',scoreTitle:'{sport} – počítadlo skóre',scoreLead:'Sledujte skóre, hráče a zápasy {sport} v MULTISPORTS SCORING.',perfTitle:'{sport} – sledování výkonu',perfLead:'Zaznamenávejte a analyzujte aktivity {sport} v MULTISPORTS SCORING.',hubTitle:'{sport} – soutěžní centrum',hubLead:'Používejte relace, progres a soutěžní funkce {sport} v MULTISPORTS SCORING.'},
};

const sportNames = {
  fr:{darts:'Fléchettes',running:'Running',fit:'FIT PERF',foot:'Football',babyfoot:'Baby-foot',pingpong:'Ping-pong',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Dice Game',esports:'E-sport'},
  en:{darts:'Darts',running:'Running',fit:'FIT PERF',foot:'Football',babyfoot:'Foosball',pingpong:'Table tennis',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Dice Game',esports:'Esports'},
  es:{darts:'Dardos',running:'Running',fit:'FIT PERF',foot:'Fútbol',babyfoot:'Futbolín',pingpong:'Tenis de mesa',petanque:'Petanca',molkky:'Mölkky',dicegame:'Juego de dados',esports:'Esports'},
  de:{darts:'Darts',running:'Laufen',fit:'FIT PERF',foot:'Fußball',babyfoot:'Tischfußball',pingpong:'Tischtennis',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Würfelspiel',esports:'E-Sport'},
  it:{darts:'Freccette',running:'Corsa',fit:'FIT PERF',foot:'Calcio',babyfoot:'Calcio balilla',pingpong:'Tennistavolo',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Gioco di dadi',esports:'Esports'},
  pt:{darts:'Dardos',running:'Corrida',fit:'FIT PERF',foot:'Futebol',babyfoot:'Matraquilhos',pingpong:'Ténis de mesa',petanque:'Petanca',molkky:'Mölkky',dicegame:'Jogo de dados',esports:'Esports'},
  nl:{darts:'Darts',running:'Hardlopen',fit:'FIT PERF',foot:'Voetbal',babyfoot:'Tafelvoetbal',pingpong:'Tafeltennis',petanque:'Petanque',molkky:'Mölkky',dicegame:'Dobbelspel',esports:'Esports'},
  ru:{darts:'Дартс',running:'Бег',fit:'FIT PERF',foot:'Футбол',babyfoot:'Настольный футбол',pingpong:'Настольный теннис',petanque:'Петанк',molkky:'Мёлкки',dicegame:'Игра в кости',esports:'Киберспорт'},
  zh:{darts:'飞镖',running:'跑步',fit:'FIT PERF',foot:'足球',babyfoot:'桌上足球',pingpong:'乒乓球',petanque:'法式滚球',molkky:'Mölkky',dicegame:'骰子游戏',esports:'电子竞技'},
  ja:{darts:'ダーツ',running:'ランニング',fit:'FIT PERF',foot:'サッカー',babyfoot:'テーブルサッカー',pingpong:'卓球',petanque:'ペタンク',molkky:'モルック',dicegame:'ダイスゲーム',esports:'eスポーツ'},
  ar:{darts:'السهام',running:'الجري',fit:'FIT PERF',foot:'كرة القدم',babyfoot:'كرة قدم الطاولة',pingpong:'تنس الطاولة',petanque:'البيتانك',molkky:'Mölkky',dicegame:'لعبة النرد',esports:'الرياضات الإلكترونية'},
  hi:{darts:'डार्ट्स',running:'रनिंग',fit:'FIT PERF',foot:'फुटबॉल',babyfoot:'टेबल फुटबॉल',pingpong:'टेबल टेनिस',petanque:'पेटांक',molkky:'Mölkky',dicegame:'डाइस गेम',esports:'ईस्पोर्ट्स'},
  tr:{darts:'Dart',running:'Koşu',fit:'FIT PERF',foot:'Futbol',babyfoot:'Langırt',pingpong:'Masa tenisi',petanque:'Petank',molkky:'Mölkky',dicegame:'Zar oyunu',esports:'Espor'},
  da:{darts:'Dart',running:'Løb',fit:'FIT PERF',foot:'Fodbold',babyfoot:'Bordfodbold',pingpong:'Bordtennis',petanque:'Petanque',molkky:'Mölkky',dicegame:'Terningespil',esports:'Esport'},
  no:{darts:'Dart',running:'Løping',fit:'FIT PERF',foot:'Fotball',babyfoot:'Bordfotball',pingpong:'Bordtennis',petanque:'Petanque',molkky:'Mölkky',dicegame:'Terningespill',esports:'E-sport'},
  sv:{darts:'Dart',running:'Löpning',fit:'FIT PERF',foot:'Fotboll',babyfoot:'Bordsfotboll',pingpong:'Bordtennis',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Tärningsspel',esports:'E-sport'},
  is:{darts:'Pílukast',running:'Hlaup',fit:'FIT PERF',foot:'Fótbolti',babyfoot:'Borðfótbolti',pingpong:'Borðtennis',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Teningaleikur',esports:'Rafíþróttir'},
  pl:{darts:'Rzutki',running:'Bieganie',fit:'FIT PERF',foot:'Piłka nożna',babyfoot:'Piłkarzyki',pingpong:'Tenis stołowy',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Gra w kości',esports:'Esport'},
  ro:{darts:'Darts',running:'Alergare',fit:'FIT PERF',foot:'Fotbal',babyfoot:'Fotbal de masă',pingpong:'Tenis de masă',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Joc de zaruri',esports:'Esports'},
  sr:{darts:'Pikado',running:'Trčanje',fit:'FIT PERF',foot:'Fudbal',babyfoot:'Stoni fudbal',pingpong:'Stoni tenis',petanque:'Petank',molkky:'Mölkky',dicegame:'Igra kockicama',esports:'Esport'},
  hr:{darts:'Pikado',running:'Trčanje',fit:'FIT PERF',foot:'Nogomet',babyfoot:'Stolni nogomet',pingpong:'Stolni tenis',petanque:'Petanka',molkky:'Mölkky',dicegame:'Igra s kockicama',esports:'Esport'},
  cs:{darts:'Šipky',running:'Běh',fit:'FIT PERF',foot:'Fotbal',babyfoot:'Stolní fotbal',pingpong:'Stolní tenis',petanque:'Pétanque',molkky:'Mölkky',dicegame:'Kostková hra',esports:'Esport'},
};

const sportCategory = { darts:'score',running:'perf',fit:'perf',foot:'score',babyfoot:'score',pingpong:'score',petanque:'score',molkky:'score',dicegame:'score',esports:'hub' };
const features = {
  darts:['X01 301 / 501 / 701 / 901','Cricket · Killer · Shanghai · Challenge','Darts Poker · Gros 6 · CRADOS','Profils · historique · statistiques · X01 online'],
  running:['GPS tracking','Distance · pace · time','Session history'],
  fit:['Sets · reps · loads','Rest timer · volume','Personal records · 1RM'],
  foot:['Scoreboard','Teams · matches','History · statistics'],
  babyfoot:['Scoreboard','Teams · matches','Quick score tracking'],
  pingpong:['Points · sets','Players · matches','Match history'],
  petanque:['Points by ends','Teams','Match tracking'],
  molkky:['Pins 1–12','Target: 50 points','Player score tracking'],
  dicegame:['Players','Rounds','Score tracking'],
  esports:['E-Sports Hub','Ranked sessions','Progression · competitive network'],
};

const DARTS_LANGS = ['fr','en','es'];
const DISCOVERY_ROUTES = {
  fr:`${BASE}/fr/decouvrir/`,
  en:`${BASE}/en/discover/`,
  es:`${BASE}/es/descubrir/`,
};
const PRIORITY_DARTS_GUIDES = ['dart-counter','x01','statistics','online-x01','challenge','cricket','killer'];
const dartsLandingCopy = {
  fr:{
    title:'Compteur de fléchettes | MULTISPORTS SCORING',
    h1:'Compteur de fléchettes complet : X01, Cricket, Killer, Challenge et plus',
    description:'MULTISPORTS SCORING est une application de compteur de fléchettes sur Android et Web/PWA avec X01, Cricket, Killer, Shanghai, Challenge, statistiques, profils et historique.',
    lead:'Scorez vos parties de fléchettes, suivez vos profils et retrouvez vos statistiques dans MULTISPORTS SCORING. L’application réunit les classiques X01 et Cricket avec des modes originaux et des outils de progression.'
  },
  en:{
    title:'Darts scorer and dart counter app | MULTISPORTS SCORING',
    h1:'Darts scorer and dart counter for X01, Cricket, Killer, Challenge and more',
    description:'MULTISPORTS SCORING is a darts scorer and dart counter app for Android and Web/PWA with X01, Cricket, Killer, Shanghai, Challenge, statistics, profiles and match history.',
    lead:'Score darts matches, manage player profiles and review statistics in MULTISPORTS SCORING. The app combines classic X01 and Cricket scoring with original modes and progression tools.'
  },
  es:{
    title:'Contador y marcador de dardos | MULTISPORTS SCORING',
    h1:'Contador de dardos para X01, Cricket, Killer, Challenge y más',
    description:'MULTISPORTS SCORING es una aplicación de contador de dardos para Android y Web/PWA con X01, Cricket, Killer, Shanghai, Challenge, estadísticas, perfiles e historial.',
    lead:'Anota partidas de dardos, gestiona perfiles y consulta estadísticas en MULTISPORTS SCORING. La aplicación combina X01 y Cricket con modos originales y herramientas de progresión.'
  },
};

const dartsGuides = {
  'dart-counter': {
    slugs:{fr:'compteur-flechettes',en:'dart-counter',es:'contador-dardos'},
    names:{fr:'Compteur de fléchettes',en:'Dart counter',es:'Contador de dardos'},
    titles:{
      fr:'Compteur de fléchettes gratuit | MULTISPORTS SCORING',
      en:'Free Dart Counter | MULTISPORTS SCORING',
      es:'Contador de dardos gratis | MULTISPORTS SCORING',
    },
    descriptions:{
      fr:'Utilisez MULTISPORTS SCORING comme compteur de fléchettes pour X01, Cricket, Killer, Challenge et d’autres modes, avec profils, historique et statistiques.',
      en:'Use MULTISPORTS SCORING as a dart counter for X01, Cricket, Killer, Challenge and other modes, with player profiles, match history and statistics.',
      es:'Usa MULTISPORTS SCORING como contador de dardos para X01, Cricket, Killer, Challenge y otros modos, con perfiles, historial y estadísticas.',
    },
    sections:{
      fr:[
        {h:'Un compteur de fléchettes pour jouer immédiatement',items:['Saisie des scores pensée pour téléphone, tablette et Web/PWA.','Profils joueurs, historique des parties et statistiques réunis dans la même application.','Modes classiques et créations originales accessibles depuis le même univers Darts.']},
        {h:'Modes de fléchettes disponibles',items:['X01 : 301, 501, 701 et 901.','Cricket, Killer et Shanghai.','Challenge, Darts Poker, Gros 6, CRADOS et autres variantes.']},
      ],
      en:[
        {h:'A dart counter built for real matches',items:['Fast score entry for phone, tablet and Web/PWA.','Player profiles, match history and statistics in the same application.','Classic games and original darts modes inside one Darts hub.']},
        {h:'Darts modes',items:['X01: 301, 501, 701 and 901.','Cricket, Killer and Shanghai.','Challenge, Darts Poker, Gros 6, CRADOS and other variants.']},
      ],
      es:[
        {h:'Un contador de dardos para partidas reales',items:['Entrada rápida de puntuaciones en móvil, tableta y Web/PWA.','Perfiles, historial de partidas y estadísticas en la misma aplicación.','Juegos clásicos y modos originales dentro del mismo espacio de dardos.']},
        {h:'Modos de dardos',items:['X01: 301, 501, 701 y 901.','Cricket, Killer y Shanghai.','Challenge, Darts Poker, Gros 6, CRADOS y otras variantes.']},
      ],
    },
    faqs:{
      fr:[{q:'MULTISPORTS SCORING peut-il servir de compteur pour une partie de 501 ?',a:'Oui. Le module X01 prend en charge notamment 301, 501, 701 et 901 avec suivi de partie et statistiques.'},{q:'L’application se limite-t-elle aux fléchettes ?',a:'Non. MULTISPORTS SCORING est une application multisports ; les fléchettes disposent toutefois de leur propre univers de scoring et de statistiques.'}],
      en:[{q:'Can MULTISPORTS SCORING score a 501 darts match?',a:'Yes. The X01 module supports 301, 501, 701 and 901 with match tracking and statistics.'},{q:'Is the app only for darts?',a:'No. MULTISPORTS SCORING is a multi-sport application, while darts has its own scoring and statistics ecosystem.'}],
      es:[{q:'¿MULTISPORTS SCORING sirve para contar una partida de 501?',a:'Sí. El módulo X01 admite 301, 501, 701 y 901 con seguimiento de partida y estadísticas.'},{q:'¿La aplicación es solo para dardos?',a:'No. MULTISPORTS SCORING es una aplicación multideporte, aunque los dardos tienen su propio espacio de puntuación y estadísticas.'}],
    },
    intents:['dart counter','darts scorer','darts scorekeeper','compteur de fléchettes','application fléchettes','contador de dardos'],
  },
  x01: {
    slugs:{fr:'x01',en:'x01',es:'x01'}, names:{fr:'X01',en:'X01',es:'X01'},
    titles:{fr:'Compteur X01 301–901 | MULTISPORTS SCORING',en:'X01 Darts Scorer 301/501 | MULTISPORTS SCORING',es:'Marcador X01 301–901 | MULTISPORTS SCORING'},
    descriptions:{fr:'Comptez vos parties X01 301, 501, 701 ou 901 avec MULTISPORTS SCORING : options d’entrée/sortie, sets, legs, annulation et statistiques.',en:'Score X01 darts games in 301, 501, 701 or 901 with MULTISPORTS SCORING, including in/out options, sets, legs, undo and statistics.',es:'Anota partidas X01 de 301, 501, 701 o 901 con MULTISPORTS SCORING, con opciones de entrada/salida, sets, legs, deshacer y estadísticas.'},
    sections:{fr:[{h:'X01 dans MULTISPORTS SCORING',items:['Parties 301, 501, 701 et 901.','Gestion des legs et des sets selon la configuration.','Historique, statistiques et reprise de partie.']}],en:[{h:'X01 in MULTISPORTS SCORING',items:['301, 501, 701 and 901 games.','Legs and sets according to match configuration.','Match history, statistics and resume support.']}],es:[{h:'X01 en MULTISPORTS SCORING',items:['Partidas de 301, 501, 701 y 901.','Legs y sets según la configuración.','Historial, estadísticas y reanudación de partida.']}]},
    faqs:{fr:[{q:'Peut-on jouer au 501 ?',a:'Oui, 501 fait partie des formats X01 proposés aux côtés de 301, 701 et 901.'}],en:[{q:'Does it support 501 darts?',a:'Yes. 501 is available alongside 301, 701 and 901.'}],es:[{q:'¿Incluye 501?',a:'Sí. 501 está disponible junto con 301, 701 y 901.'}]}, intents:['501 darts scorer','X01 scorer','301 darts app','compteur 501','marcador 501'],
  },
  cricket: {
    slugs:{fr:'cricket',en:'cricket',es:'cricket'}, names:{fr:'Cricket',en:'Cricket',es:'Cricket'},
    titles:{fr:'Compteur Cricket fléchettes | MULTISPORTS SCORING',en:'Cricket darts scorer | MULTISPORTS SCORING',es:'Marcador Cricket de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Comptez une partie de Cricket aux fléchettes avec les cibles 15 à 20 et Bull, suivi des fermetures, points et statistiques.',en:'Score Cricket darts with targets 15 to 20 and Bull, tracking closes, points and match statistics.',es:'Anota Cricket de dardos con objetivos 15 a 20 y Bull, siguiendo cierres, puntos y estadísticas.'},
    sections:{fr:[{h:'Suivi du Cricket',items:['Cibles 15, 16, 17, 18, 19, 20 et Bull.','Ouverture et fermeture des cibles.','Suivi des points et statistiques de partie.']}],en:[{h:'Cricket scoring',items:['Targets 15, 16, 17, 18, 19, 20 and Bull.','Open and close target tracking.','Points and match statistics.']}],es:[{h:'Puntuación Cricket',items:['Objetivos 15, 16, 17, 18, 19, 20 y Bull.','Seguimiento de apertura y cierre.','Puntos y estadísticas de partida.']}]},
    faqs:{fr:[{q:'Quelles cibles sont suivies en Cricket ?',a:'Le mode suit les cibles 15 à 20 ainsi que le Bull.'}],en:[{q:'Which targets are used in Cricket?',a:'The mode tracks 15 through 20 plus Bull.'}],es:[{q:'¿Qué objetivos usa Cricket?',a:'El modo sigue del 15 al 20 y Bull.'}]}, intents:['cricket darts scorer','compteur cricket fléchettes','marcador cricket dardos'],
  },
  killer: {
    slugs:{fr:'killer',en:'killer',es:'killer'}, names:{fr:'Killer',en:'Killer',es:'Killer'},
    titles:{fr:'Compteur Killer fléchettes | MULTISPORTS SCORING',en:'Killer darts scorer | MULTISPORTS SCORING',es:'Marcador Killer de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Jouez au Killer aux fléchettes avec numéros joueurs, vies, phase Killer, éliminations, bots et suivi de partie dans MULTISPORTS SCORING.',en:'Play Killer darts with player numbers, lives, Killer phase, eliminations, bots and match tracking in MULTISPORTS SCORING.',es:'Juega a Killer con números de jugador, vidas, fase Killer, eliminaciones, bots y seguimiento de partida en MULTISPORTS SCORING.'},
    sections:{fr:[{h:'Killer : vies et éliminations',items:['Chaque joueur évolue autour de son numéro.','Le passage en Killer permet d’attaquer les adversaires.','Le suivi des vies et des éliminations est géré par l’application.']}],en:[{h:'Killer: lives and eliminations',items:['Each player plays around their assigned number.','Becoming a Killer opens the elimination phase.','Lives and eliminations are tracked by the app.']}],es:[{h:'Killer: vidas y eliminaciones',items:['Cada jugador juega alrededor de su número asignado.','Convertirse en Killer abre la fase de eliminación.','La aplicación controla vidas y eliminaciones.']}]},
    faqs:{fr:[{q:'Le mode Killer gère-t-il les vies ?',a:'Oui. Les vies, le statut Killer et les éliminations sont suivis pendant la partie.'}],en:[{q:'Does Killer track lives?',a:'Yes. Lives, Killer status and eliminations are tracked during the match.'}],es:[{q:'¿Killer controla las vidas?',a:'Sí. Se siguen vidas, estado Killer y eliminaciones durante la partida.'}]}, intents:['killer darts app','killer darts scorer','compteur killer fléchettes'],
  },
  shanghai: {
    slugs:{fr:'shanghai',en:'shanghai',es:'shanghai'}, names:{fr:'Shanghai',en:'Shanghai',es:'Shanghai'},
    titles:{fr:'Compteur Shanghai fléchettes | MULTISPORTS SCORING',en:'Shanghai darts scorer | MULTISPORTS SCORING',es:'Marcador Shanghai de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Suivez une partie de Shanghai aux fléchettes, les manches, simples, doubles, triples et le score avec MULTISPORTS SCORING.',en:'Track a Shanghai darts game with rounds, singles, doubles, triples and scoring in MULTISPORTS SCORING.',es:'Sigue una partida Shanghai de dardos con rondas, simples, dobles, triples y puntuación en MULTISPORTS SCORING.'},
    sections:{fr:[{h:'Le Shanghai dans l’application',items:['Progression par manches et cibles.','Prise en compte des simples, doubles et triples.','Score et historique intégrés à l’univers Darts.']}],en:[{h:'Shanghai in the app',items:['Round-by-round target progression.','Singles, doubles and triples are tracked.','Score and history are integrated into the Darts hub.']}],es:[{h:'Shanghai en la aplicación',items:['Progresión por rondas y objetivos.','Seguimiento de simples, dobles y triples.','Puntuación e historial integrados en el espacio Darts.']}]},
    faqs:{fr:[{q:'Le Shanghai suit-il les doubles et triples ?',a:'Oui. Le mode distingue les simples, doubles et triples.'}],en:[{q:'Does Shanghai track doubles and triples?',a:'Yes. The mode distinguishes singles, doubles and triples.'}],es:[{q:'¿Shanghai distingue dobles y triples?',a:'Sí. El modo distingue simples, dobles y triples.'}]}, intents:['shanghai darts scorer','compteur shanghai fléchettes'],
  },
  challenge: {
    slugs:{fr:'challenge',en:'challenge',es:'challenge'}, names:{fr:'Challenge',en:'Challenge',es:'Challenge'},
    titles:{fr:'Challenge fléchettes | MULTISPORTS SCORING',en:'Darts Challenge | MULTISPORTS SCORING',es:'Challenge de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Le mode Challenge de MULTISPORTS SCORING mesure vos touches S, D, T, Bull et MISS sur des objectifs configurables, en solo ou à plusieurs.',en:'MULTISPORTS SCORING Challenge tracks S, D, T, Bull and MISS results on configurable targets for solo or multiplayer darts sessions.',es:'Challenge en MULTISPORTS SCORING registra S, D, T, Bull y MISS sobre objetivos configurables para sesiones individuales o multijugador.'},
    sections:{fr:[{h:'Un mode de précision',items:['Saisie S, D, T, 25, 50 et MISS.','Objectifs et nombre de tours configurables.','Solo, duel, multi et équipes avec suivi des séries de touches.']}],en:[{h:'Accuracy-focused darts mode',items:['Inputs for S, D, T, 25, 50 and MISS.','Configurable targets and number of rounds.','Solo, duel, multiplayer and teams with hit streak tracking.']}],es:[{h:'Modo centrado en la precisión',items:['Entradas S, D, T, 25, 50 y MISS.','Objetivos y número de rondas configurables.','Solo, duelo, multijugador y equipos con seguimiento de rachas.']}]},
    faqs:{fr:[{q:'Challenge peut-il se jouer en solo ?',a:'Oui. Le mode prévoit le solo ainsi que le duel, le multi et les équipes.'}],en:[{q:'Can Challenge be played solo?',a:'Yes. Challenge supports solo, duel, multiplayer and team configurations.'}],es:[{q:'¿Challenge se puede jugar en solitario?',a:'Sí. Admite solo, duelo, multijugador y equipos.'}]}, intents:['darts accuracy training','challenge darts app','entrainement précision fléchettes'],
  },
  'darts-poker': {
    slugs:{fr:'darts-poker',en:'darts-poker',es:'darts-poker'}, names:{fr:'Darts Poker',en:'Darts Poker',es:'Darts Poker'},
    titles:{fr:'Darts Poker | MULTISPORTS SCORING',en:'Darts Poker mode | MULTISPORTS SCORING',es:'Darts Poker de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Darts Poker mélange fléchettes et mécanique de cartes dans MULTISPORTS SCORING avec suivi des mains, cibles et tours.',en:'Darts Poker combines darts with card-hand mechanics in MULTISPORTS SCORING, tracking hands, targets and turns.',es:'Darts Poker combina dardos y mecánica de cartas en MULTISPORTS SCORING con seguimiento de manos, objetivos y turnos.'},
    sections:{fr:[{h:'Fléchettes + cartes',items:['Mode original basé sur des mains de cartes.','Les touches sur la cible alimentent la mécanique de jeu.','Tours et progression suivis directement dans l’application.']}],en:[{h:'Darts meets cards',items:['Original mode built around card hands.','Dartboard hits feed the game mechanic.','Turns and progression are tracked inside the app.']}],es:[{h:'Dardos y cartas',items:['Modo original basado en manos de cartas.','Los impactos en la diana alimentan la mecánica de juego.','Turnos y progresión controlados por la aplicación.']}]},
    faqs:{fr:[{q:'Darts Poker est-il un simple compteur X01 ?',a:'Non. C’est un mode original qui combine scoring de fléchettes et logique de cartes.'}],en:[{q:'Is Darts Poker just X01 scoring?',a:'No. It is an original mode combining darts scoring with card mechanics.'}],es:[{q:'¿Darts Poker es solo X01?',a:'No. Es un modo original que combina puntuación de dardos con mecánica de cartas.'}]}, intents:['darts poker game','poker darts app','mode poker fléchettes'],
  },
  'gros-6': {
    slugs:{fr:'gros-6',en:'gros-6',es:'gros-6'}, names:{fr:'Gros 6',en:'Gros 6',es:'Gros 6'},
    titles:{fr:'Gros 6 – jeu de fléchettes | MULTISPORTS SCORING',en:'Gros 6 darts game | MULTISPORTS SCORING',es:'Gros 6 – juego de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Découvrez Gros 6 dans MULTISPORTS SCORING, un mode de fléchettes avec zones Gros/Petit, configuration guidée et suivi de partie.',en:'Discover Gros 6 in MULTISPORTS SCORING, a darts mode with Gros/Petit target zones, guided setup and match tracking.',es:'Descubre Gros 6 en MULTISPORTS SCORING, un modo de dardos con zonas Gros/Petit, configuración guiada y seguimiento de partida.'},
    sections:{fr:[{h:'Un mode original',items:['Saisie dédiée aux zones de jeu Gros et Petit.','Configuration guidée pour préparer la partie.','Suivi des joueurs et de la progression pendant le match.']}],en:[{h:'An original darts mode',items:['Dedicated scoring for Gros and Petit target zones.','Guided configuration before the match.','Player and match progression tracking.']}],es:[{h:'Un modo original',items:['Puntuación dedicada a zonas Gros y Petit.','Configuración guiada antes de la partida.','Seguimiento de jugadores y progresión.']}]},
    faqs:{fr:[{q:'Gros 6 dispose-t-il d’une configuration guidée ?',a:'Oui. Une configuration guidée accompagne la préparation de la partie.'}],en:[{q:'Does Gros 6 have guided setup?',a:'Yes. Guided setup helps configure the match before play.'}],es:[{q:'¿Gros 6 tiene configuración guiada?',a:'Sí. La configuración guiada ayuda a preparar la partida.'}]}, intents:['gros 6 darts','jeu gros 6 fléchettes'],
  },
  crados: {
    slugs:{fr:'crados',en:'crados',es:'crados'}, names:{fr:'CRADOS',en:'CRADOS',es:'CRADOS'},
    titles:{fr:'CRADOS fléchettes | MULTISPORTS SCORING',en:'CRADOS darts mode | MULTISPORTS SCORING',es:'CRADOS dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'CRADOS est un mode arcade original de MULTISPORTS SCORING avec jauge, règles de touches spécifiques, bots IA et statistiques.',en:'CRADOS is an original arcade darts mode in MULTISPORTS SCORING with a gauge, custom hit rules, AI bots and statistics.',es:'CRADOS es un modo arcade original de MULTISPORTS SCORING con medidor, reglas de impacto propias, bots de IA y estadísticas.'},
    sections:{fr:[{h:'Un mode arcade exclusif',items:['Règles de score différentes d’un X01 classique.','Jauge de progression visible pendant la partie.','Bots IA, historique et statistiques dédiées.']}],en:[{h:'An original arcade mode',items:['Scoring rules differ from classic X01.','A progression gauge is visible during play.','AI bots, history and dedicated statistics.']}],es:[{h:'Un modo arcade original',items:['Reglas de puntuación diferentes de X01.','Medidor de progresión durante la partida.','Bots de IA, historial y estadísticas específicas.']}]},
    faqs:{fr:[{q:'CRADOS est-il un mode X01 ?',a:'Non. CRADOS utilise ses propres règles et sa propre logique de progression.'}],en:[{q:'Is CRADOS an X01 mode?',a:'No. CRADOS uses its own scoring rules and progression logic.'}],es:[{q:'¿CRADOS es un modo X01?',a:'No. CRADOS utiliza sus propias reglas y lógica de progresión.'}]}, intents:['crados darts','arcade darts game','jeu fléchettes original'],
  },
  'training-x01': {
    slugs:{fr:'entrainement-x01',en:'x01-training',es:'entrenamiento-x01'}, names:{fr:'Entraînement X01',en:'X01 training',es:'Entrenamiento X01'},
    titles:{fr:'Entraînement X01 | MULTISPORTS SCORING',en:'X01 Darts Training | MULTISPORTS SCORING',es:'Entrenamiento X01 | MULTISPORTS SCORING'},
    descriptions:{fr:'Entraînez-vous au X01 avec MULTISPORTS SCORING et suivez vos séances, vos performances et votre progression dans le temps.',en:'Train X01 darts with MULTISPORTS SCORING and track sessions, performance and progress over time.',es:'Entrena X01 con MULTISPORTS SCORING y sigue sesiones, rendimiento y progreso con el tiempo.'},
    sections:{fr:[{h:'S’entraîner et mesurer sa progression',items:['Sessions d’entraînement X01 dédiées.','Statistiques et historique pour comparer les séances.','Profils joueurs pour conserver la progression individuelle.']}],en:[{h:'Train and measure progress',items:['Dedicated X01 training sessions.','Statistics and history to compare sessions.','Player profiles preserve individual progress.']}],es:[{h:'Entrenar y medir el progreso',items:['Sesiones dedicadas de entrenamiento X01.','Estadísticas e historial para comparar sesiones.','Perfiles para conservar el progreso individual.']}]},
    faqs:{fr:[{q:'Peut-on suivre sa progression ?',a:'Oui. Les séances et statistiques permettent de suivre l’évolution d’un profil dans le temps.'}],en:[{q:'Can I track improvement over time?',a:'Yes. Sessions and statistics help track a player profile over time.'}],es:[{q:'¿Se puede seguir la progresión?',a:'Sí. Las sesiones y estadísticas permiten seguir la evolución del perfil.'}]}, intents:['darts training app','x01 training','application entrainement fléchettes'],
  },
  statistics: {
    slugs:{fr:'statistiques-flechettes',en:'darts-statistics',es:'estadisticas-dardos'}, names:{fr:'Statistiques fléchettes',en:'Darts statistics',es:'Estadísticas de dardos'},
    titles:{fr:'Stats fléchettes et historique | MULTISPORTS SCORING',en:'Darts Statistics and History | MULTISPORTS SCORING',es:'Estadísticas de dardos | MULTISPORTS SCORING'},
    descriptions:{fr:'Retrouvez vos statistiques de fléchettes, historiques de parties, profils et records dans MULTISPORTS SCORING.',en:'Review darts statistics, match history, player profiles and records in MULTISPORTS SCORING.',es:'Consulta estadísticas de dardos, historial de partidas, perfiles y récords en MULTISPORTS SCORING.'},
    sections:{fr:[{h:'Des données après la partie',items:['Historique des parties enregistrées.','Statistiques rattachées aux profils joueurs.','Indicateurs et records selon les modes pris en charge.']}],en:[{h:'Data beyond the match',items:['Saved match history.','Statistics linked to player profiles.','Mode-specific indicators and records.']}],es:[{h:'Datos después de la partida',items:['Historial de partidas guardadas.','Estadísticas vinculadas a perfiles.','Indicadores y récords según el modo.']}]},
    faqs:{fr:[{q:'Les statistiques sont-elles liées aux profils ?',a:'Oui. Les profils permettent de conserver un suivi individuel des performances.'}],en:[{q:'Are statistics linked to player profiles?',a:'Yes. Player profiles preserve individual performance tracking.'}],es:[{q:'¿Las estadísticas están vinculadas a perfiles?',a:'Sí. Los perfiles permiten conservar el seguimiento individual del rendimiento.'}]}, intents:['darts statistics app','darts stats tracker','statistiques fléchettes'],
  },
  'online-x01': {
    slugs:{fr:'flechettes-en-ligne',en:'online-darts',es:'dardos-online'}, names:{fr:'X01 en ligne',en:'Online X01',es:'X01 online'},
    titles:{fr:'Fléchettes en ligne X01 | MULTISPORTS SCORING',en:'Online darts – X01 scoring | MULTISPORTS SCORING',es:'Dardos online X01 | MULTISPORTS SCORING'},
    descriptions:{fr:'MULTISPORTS SCORING propose un parcours X01 online pour jouer à distance tout en conservant le scoring et le suivi de partie.',en:'MULTISPORTS SCORING includes an online X01 flow for remote darts matches while keeping score and match tracking.',es:'MULTISPORTS SCORING incluye un flujo X01 online para partidas a distancia con puntuación y seguimiento del encuentro.'},
    sections:{fr:[{h:'X01 à distance',items:['Lobby et partie X01 online dédiés.','Scoring synchronisé pour le déroulement du match.','Intégration avec l’écosystème de profils et de statistiques.']}],en:[{h:'Remote X01 matches',items:['Dedicated online X01 lobby and play flow.','Synchronized scoring during the match.','Integrated with player profiles and statistics.']}],es:[{h:'Partidas X01 a distancia',items:['Lobby y partida X01 online dedicados.','Puntuación sincronizada durante el encuentro.','Integración con perfiles y estadísticas.']}]},
    faqs:{fr:[{q:'Tous les modes sont-ils jouables en ligne ?',a:'Cette page décrit spécifiquement le parcours X01 online actuellement intégré à l’application.'}],en:[{q:'Are all darts modes online?',a:'This page specifically describes the online X01 flow currently integrated into the app.'}],es:[{q:'¿Todos los modos están online?',a:'Esta página describe específicamente el flujo X01 online integrado en la aplicación.'}]}, intents:['online darts scorer','play darts online x01','fléchettes en ligne x01'],
  },
};

const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fill = (template, sport) => template.replace('{sport}', sport);
const urlPath = (full) => new URL(full).pathname;
const localFileFromUrl = (full) => path.join(PUBLIC, urlPath(full).replace(/^\//,''), 'index.html');

function alternateTags(alternatesMap, defaultUrl) {
  const links = Object.entries(alternatesMap).map(([code,href]) => `<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultUrl || alternatesMap.en || BASE+'/')}">`);
  return links.join('');
}

function appEntity() {
  return {
    '@type':['SoftwareApplication','MobileApplication'],
    '@id':`${BASE}/#app`,
    name:'MULTISPORTS SCORING',
    alternateName:['Multisports Scoring','MULTISPORTS SCORING Darts'],
    url:`${BASE}/`,
    downloadUrl:PLAY,
    image:`${BASE}/app-512.png`,
    operatingSystem:'Android, Web/PWA',
    applicationCategory:'SportsApplication',
    applicationSubCategory:'Darts scorer and multi-sport score tracker',
    description:'MULTISPORTS SCORING is a multi-sport scoring, statistics and performance application with a dedicated darts scorer for X01, Cricket, Killer, Shanghai, Challenge and original game modes.',
    isAccessibleForFree:true,
    offers:{'@type':'Offer',price:'0',priceCurrency:'EUR'},
    featureList:['Darts score counter','X01 301 / 501 / 701 / 901','Cricket darts scoring','Killer darts','Shanghai darts','Challenge darts','Darts Poker','Gros 6','CRADOS','Player profiles','Match history','Darts statistics','Online X01','Multi-sport scoring'],
    sameAs:[PLAY,'https://github.com/perrinalexandre38530-star/Darts-Counter-V7'],
  };
}

function jsonLd({lang,url,title,description,breadcrumb,faqItems=[]}) {
  const graph = [
    {'@type':'Organization','@id':`${BASE}/#organization`,name:'MULTISPORTS SCORING',url:`${BASE}/`,logo:`${BASE}/app-512.png`},
    {'@type':'WebSite','@id':`${BASE}/#website`,url:`${BASE}/`,name:'MULTISPORTS SCORING',publisher:{'@id':`${BASE}/#organization`}},
    appEntity(),
    {'@type':'WebPage','@id':`${url}#webpage`,url,name:title,description,inLanguage:lang,isPartOf:{'@id':`${BASE}/#website`},about:{'@id':`${BASE}/#app`}},
    {'@type':'BreadcrumbList',itemListElement:breadcrumb.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:item.url}))},
  ];
  if (faqItems.length) graph.push({'@type':'FAQPage','@id':`${url}#faq`,mainEntity:faqItems.map((f)=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))});
  return JSON.stringify({'@context':'https://schema.org','@graph':graph});
}

function head({lang,url,title,description,alternatesMap}) {
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="${escapeHtml(url)}">${alternateTags(alternatesMap,alternatesMap.en || url)}<meta property="og:type" content="website"><meta property="og:site_name" content="MULTISPORTS SCORING"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(url)}"><meta property="og:image" content="${BASE}/app-512.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${BASE}/app-512.png"><link rel="alternate" type="application/ld+json" href="/seo/entity.json"><link rel="stylesheet" href="/seo/seo.css">`;
}

function languageLinks(catalog, sportId=null) {
  return Object.keys(locale).map((code)=>{
    const href = sportId ? urlPath(catalog.sports.find((s)=>s.id===sportId).routes[code]) : `/${code}/`;
    return `<a hreflang="${code}" href="${href}">${escapeHtml(locale[code].name)}</a>`;
  }).join(' · ');
}

function sportLinks(catalog, lang, current) {
  return catalog.sports.filter((s)=>s.id!==current).map((s)=>`<a href="${urlPath(s.routes[lang])}">${escapeHtml(sportNames[lang][s.id])}</a>`).join(' · ');
}

function guideUrl(catalog, lang, guideId) {
  const darts = catalog.sports.find((s)=>s.id==='darts');
  return `${darts.routes[lang]}${dartsGuides[guideId].slugs[lang]}/`;
}

function guideAlternates(catalog, guideId) {
  return Object.fromEntries(DARTS_LANGS.map((lang)=>[lang,guideUrl(catalog,lang,guideId)]));
}

function relatedGuideLinks(catalog, lang, currentId) {
  return Object.entries(dartsGuides)
    .filter(([id])=>id!==currentId)
    .map(([id,g])=>`<a href="${urlPath(guideUrl(catalog,lang,id))}">${escapeHtml(g.names[lang])}</a>`)
    .join(' · ');
}

function discoveryLabel(lang) {
  if (lang==='fr') return 'Répertoire public · Fléchettes & application';
  if (lang==='es') return 'Directorio público · Dardos y aplicación';
  return 'Public directory · Darts & app';
}

function discoveryFooter(lang) {
  if (!DARTS_LANGS.includes(lang)) return '<footer><strong>MULTISPORTS SCORING</strong><br>Android · Web/PWA</footer>';
  const route = DISCOVERY_ROUTES[lang];
  return `<footer><strong>MULTISPORTS SCORING</strong><br>Android · Web/PWA · <a href="${urlPath(route)}">${escapeHtml(discoveryLabel(lang))}</a></footer>`;
}

function priorityDartsLinks(catalog, lang) {
  return PRIORITY_DARTS_GUIDES.map((id)=>`<a href="${urlPath(guideUrl(catalog,lang,id))}">${escapeHtml(dartsGuides[id].names[lang])}</a>`).join(' · ');
}

function homeDiscoverySection(catalog, lang) {
  if (!DARTS_LANGS.includes(lang)) return '';
  const sport = catalog.sports.find((s)=>s.id==='darts');
  const copy = {
    fr:{h:'Vous cherchez une application de fléchettes ?',p:'Accédez directement au compteur de fléchettes MULTISPORTS SCORING, aux règles X01, aux statistiques, au jeu en ligne et aux principaux modes Darts.',all:'Voir tout l’univers Fléchettes'},
    en:{h:'Looking for a darts scoring app?',p:'Go directly to the MULTISPORTS SCORING dart counter, X01 scoring, darts statistics, online play and the main Darts modes.',all:'Explore the full Darts hub'},
    es:{h:'¿Buscas una aplicación para puntuar dardos?',p:'Accede directamente al contador de dardos de MULTISPORTS SCORING, X01, estadísticas, juego online y los principales modos.',all:'Ver todo el universo de Dardos'},
  }[lang];
  return `<section class="discovery"><h2>${escapeHtml(copy.h)}</h2><p>${escapeHtml(copy.p)}</p><p class="link-cloud"><a href="${urlPath(sport.routes[lang])}">${escapeHtml(copy.all)}</a> · ${priorityDartsLinks(catalog,lang)} · <a href="${urlPath(DISCOVERY_ROUTES[lang])}">${escapeHtml(discoveryLabel(lang))}</a></p></section>`;
}

function homePage(catalog, lang) {
  const t = locale[lang];
  const url = `${BASE}/${lang}/`;
  const homeMap = Object.fromEntries(Object.keys(locale).map((code)=>[code,`${BASE}/${code}/`]));
  const cards = catalog.sports.map((s)=>`<article class="card"><h2><a href="${urlPath(s.routes[lang])}">${escapeHtml(sportNames[lang][s.id])}</a></h2><p>${escapeHtml(s.androidPublicV1 ? t.android : t.webOnly)}</p></article>`).join('');
  const ld = jsonLd({lang,url,title:t.homeTitle,description:t.homeLead,breadcrumb:[{name:t.home,url}]});
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({lang,url,title:t.homeTitle,description:t.homeLead,alternatesMap:homeMap})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING</div><h1>${escapeHtml(t.homeH1)}</h1><p class="lead">${escapeHtml(t.homeLead)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><a class="cta" href="/">${escapeHtml(t.web)}</a></header>${homeDiscoverySection(catalog,lang)}<section><h2>${escapeHtml(t.available)}</h2><div class="grid">${cards}</div></section><section><h2>${escapeHtml(t.about)}</h2><p>${escapeHtml(t.aboutText)}</p></section><section><h2>${escapeHtml(t.languages)}</h2><p>${languageLinks(catalog)}</p></section>${discoveryFooter(lang)}</main></body></html>`;
}

function sportPage(catalog, lang, sport) {
  const t = locale[lang];
  const name = sportNames[lang][sport.id];
  const category = sportCategory[sport.id];
  const dartsCopy = sport.id==='darts' ? dartsLandingCopy[lang] : null;
  const titleBase = dartsCopy?.h1 || (category==='perf' ? fill(t.perfTitle,name) : category==='hub' ? fill(t.hubTitle,name) : fill(t.scoreTitle,name));
  const description = dartsCopy?.description || (category==='perf' ? fill(t.perfLead,name) : category==='hub' ? fill(t.hubLead,name) : fill(t.scoreLead,name));
  const lead = dartsCopy?.lead || description;
  const title = dartsCopy?.title || `${titleBase} | MULTISPORTS SCORING`;
  const url = sport.routes[lang];
  const featureItems = features[sport.id].map((x)=>`<li>${escapeHtml(x)}</li>`).join('');
  const dartsGuideSection = sport.id==='darts' && DARTS_LANGS.includes(lang)
    ? `<section class="discovery"><h2>${lang==='fr'?'Compteur, X01, statistiques et modes fléchettes':lang==='es'?'Contador, X01, estadísticas y modos de dardos':'Dart counter, X01, statistics and darts modes'}</h2><p>${lang==='fr'?'Cette page est le hub public de MULTISPORTS SCORING pour découvrir les fonctions fléchettes avant d’ouvrir l’application.':lang==='es'?'Esta página es el hub público de MULTISPORTS SCORING para descubrir las funciones de dardos antes de abrir la aplicación.':'This is the public MULTISPORTS SCORING hub for discovering Darts features before opening the app.'}</p><div class="guide-grid">${Object.entries(dartsGuides).map(([id,g])=>`<article class="mini-card"><a href="${urlPath(guideUrl(catalog,lang,id))}"><strong>${escapeHtml(g.names[lang])}</strong></a><span>${escapeHtml(g.descriptions[lang])}</span></article>`).join('')}</div><p class="link-cloud"><a href="${urlPath(DISCOVERY_ROUTES[lang])}">${escapeHtml(discoveryLabel(lang))}</a></p></section>` : '';
  const ld = jsonLd({lang,url,title,description,breadcrumb:[{name:t.home,url:`${BASE}/${lang}/`},{name,url}]});
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({lang,url,title,description,alternatesMap:sport.routes})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING · ${escapeHtml(name)}</div><h1>${escapeHtml(titleBase)}</h1><p class="lead">${escapeHtml(lead)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><a class="cta" href="/">${escapeHtml(t.web)}</a><nav><a href="/${lang}/">${escapeHtml(t.home)}</a>${DARTS_LANGS.includes(lang)?`<a href="${urlPath(DISCOVERY_ROUTES[lang])}">${escapeHtml(discoveryLabel(lang))}</a>`:''}</nav></header><section><h2>${escapeHtml(t.features)}</h2><ul>${featureItems}</ul></section><section><h2>${escapeHtml(t.availability)}</h2><p>${escapeHtml(sport.androidPublicV1 ? t.android : t.webOnly)}</p></section>${dartsGuideSection}<section><h2>${escapeHtml(t.faq)}</h2><ul><li><strong>${escapeHtml(t.faqQ)}</strong><br>${escapeHtml(t.faqA)}</li></ul></section><section><h2>${escapeHtml(t.others)}</h2><p>${sportLinks(catalog,lang,sport.id)}</p></section><section><h2>${escapeHtml(t.languages)}</h2><p>${languageLinks(catalog,sport.id)}</p></section>${discoveryFooter(lang)}</main></body></html>`;
}

function guidePage(catalog, lang, guideId) {
  const t = locale[lang];
  const guide = dartsGuides[guideId];
  const sport = catalog.sports.find((s)=>s.id==='darts');
  const sportUrl = sport.routes[lang];
  const url = guideUrl(catalog,lang,guideId);
  const sportName = sportNames[lang].darts;
  const title = guide.titles[lang];
  const desc = guide.descriptions[lang];
  const faqItems = guide.faqs[lang] || [];
  const sections = guide.sections[lang].map((section)=>`<section><h2>${escapeHtml(section.h)}</h2><ul>${section.items.map((x)=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section>`).join('');
  const faq = faqItems.length ? `<section><h2>${escapeHtml(t.faq)}</h2><ul>${faqItems.map((f)=>`<li><strong>${escapeHtml(f.q)}</strong><br>${escapeHtml(f.a)}</li>`).join('')}</ul></section>` : '';
  const alternatesMap = guideAlternates(catalog,guideId);
  const ld = jsonLd({lang,url,title,description:desc,faqItems,breadcrumb:[{name:t.home,url:`${BASE}/${lang}/`},{name:sportName,url:sportUrl},{name:guide.names[lang],url}]});
  const start = lang==='fr' ? 'Continuer dans l’univers Fléchettes' : lang==='es' ? 'Seguir explorando Dardos' : 'Continue exploring Darts';
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({lang,url,title,description:desc,alternatesMap})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING · ${escapeHtml(sportName)} · ${escapeHtml(guide.names[lang])}</div><h1>${escapeHtml(title.replace(/ \| MULTISPORTS SCORING$/,''))}</h1><p class="lead">${escapeHtml(desc)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><a class="cta" href="/">${escapeHtml(t.web)}</a><nav><a href="/${lang}/">${escapeHtml(t.home)}</a><a href="${urlPath(sportUrl)}">${escapeHtml(sportName)}</a><a href="${urlPath(DISCOVERY_ROUTES[lang])}">${escapeHtml(discoveryLabel(lang))}</a></nav></header>${sections}${faq}<section class="discovery"><h2>${escapeHtml(start)}</h2><p class="link-cloud"><a href="${urlPath(sportUrl)}">${escapeHtml(sportName)}</a> · ${priorityDartsLinks(catalog,lang)}</p></section><section><h2>${lang==='fr'?'Autres guides fléchettes':lang==='es'?'Otras guías de dardos':'More darts guides'}</h2><p>${relatedGuideLinks(catalog,lang,guideId)}</p></section><section><h2>${escapeHtml(t.languages)}</h2><p>${DARTS_LANGS.map((code)=>`<a hreflang="${code}" href="${urlPath(guideUrl(catalog,code,guideId))}">${escapeHtml(locale[code].name)}</a>`).join(' · ')}</p></section>${discoveryFooter(lang)}</main></body></html>`;
}

function discoveryPage(catalog, lang) {
  const t = locale[lang];
  const sport = catalog.sports.find((s)=>s.id==='darts');
  const url = DISCOVERY_ROUTES[lang];
  const copy = {
    fr:{title:'Découvrir MULTISPORTS SCORING – fléchettes',h1:'Découvrir MULTISPORTS SCORING : compteur de fléchettes, scores et statistiques',lead:'Un répertoire public et crawlable pour découvrir les principales fonctions de MULTISPORTS SCORING, avec un accès direct au compteur de fléchettes, X01, Cricket, Killer, Challenge, statistiques et jeu en ligne.',darts:'Fléchettes : pages prioritaires',app:'Application et téléchargement',sports:'Autres disciplines'},
    en:{title:'Discover MULTISPORTS SCORING – darts and multi-sport',h1:'Discover MULTISPORTS SCORING: dart counter, scores and statistics',lead:'A public crawlable directory for the main MULTISPORTS SCORING features, with direct access to the dart counter, X01, Cricket, Killer, Challenge, statistics and online play.',darts:'Darts: priority pages',app:'App and download',sports:'Other sports'},
    es:{title:'Descubrir MULTISPORTS SCORING – dardos y multideporte',h1:'Descubrir MULTISPORTS SCORING: contador de dardos, marcadores y estadísticas',lead:'Un directorio público rastreable para descubrir las principales funciones de MULTISPORTS SCORING, con acceso directo al contador de dardos, X01, Cricket, Killer, Challenge, estadísticas y juego online.',darts:'Dardos: páginas prioritarias',app:'Aplicación y descarga',sports:'Otros deportes'},
  }[lang];
  const alternatesMap = DISCOVERY_ROUTES;
  const itemList = PRIORITY_DARTS_GUIDES.map((id,index)=>({'@type':'ListItem',position:index+1,name:dartsGuides[id].names[lang],url:guideUrl(catalog,lang,id)}));
  const graph = JSON.parse(jsonLd({lang,url,title:copy.title,description:copy.lead,breadcrumb:[{name:t.home,url:`${BASE}/${lang}/`},{name:discoveryLabel(lang),url}]}));
  graph['@graph'].push({'@type':'CollectionPage','@id':`${url}#directory`,url,name:copy.h1,inLanguage:lang,about:{'@id':`${BASE}/#app`},mainEntity:{'@type':'ItemList',itemListElement:itemList}});
  const guideCards = Object.entries(dartsGuides).map(([id,g])=>`<article class="mini-card"><a href="${urlPath(guideUrl(catalog,lang,id))}"><strong>${escapeHtml(g.names[lang])}</strong></a><span>${escapeHtml(g.descriptions[lang])}</span></article>`).join('');
  const sportCards = catalog.sports.filter((s)=>s.id!=='darts').map((s)=>`<article class="mini-card"><a href="${urlPath(s.routes[lang])}"><strong>${escapeHtml(sportNames[lang][s.id])}</strong></a><span>${escapeHtml(s.androidPublicV1?t.android:t.webOnly)}</span></article>`).join('');
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({lang,url,title:copy.title,description:copy.lead,alternatesMap})}<script type="application/ld+json">${JSON.stringify(graph)}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING · DISCOVERY</div><h1>${escapeHtml(copy.h1)}</h1><p class="lead">${escapeHtml(copy.lead)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><nav><a href="/${lang}/">${escapeHtml(t.home)}</a><a href="${urlPath(sport.routes[lang])}">${escapeHtml(sportNames[lang].darts)}</a></nav></header><section class="discovery"><h2>${escapeHtml(copy.darts)}</h2><p class="link-cloud">${priorityDartsLinks(catalog,lang)}</p><div class="guide-grid">${guideCards}</div></section><section><h2>${escapeHtml(copy.app)}</h2><p><a href="${PLAY}">${escapeHtml(t.play)}</a> · <a href="/">${escapeHtml(t.web)}</a> · <a href="/seo/entity.json">SoftwareApplication JSON-LD</a> · <a href="/llms-full.txt">AI product facts</a></p></section><section><h2>${escapeHtml(copy.sports)}</h2><div class="guide-grid">${sportCards}</div></section><section><h2>${escapeHtml(t.languages)}</h2><p>${DARTS_LANGS.map((code)=>`<a hreflang="${code}" href="${urlPath(DISCOVERY_ROUTES[code])}">${escapeHtml(locale[code].name)}</a>`).join(' · ')}</p></section>${discoveryFooter(lang)}</main></body></html>`;
}

async function writeFile(file, content) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  await fs.writeFile(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

async function writeMachineReadableFiles(catalog) {
  const guideEntries = Object.entries(dartsGuides).map(([id,g])=>({
    id,
    names:g.names,
    urls:Object.fromEntries(DARTS_LANGS.map((lang)=>[lang,guideUrl(catalog,lang,id)])),
    searchIntents:g.intents,
  }));
  const entity = {
    '@context':'https://schema.org',
    ...appEntity(),
    subjectOf:[
      {'@type':'WebPage',url:`${BASE}/fr/flechettes/`,name:'Compteur de fléchettes MULTISPORTS SCORING'},
      {'@type':'WebPage',url:`${BASE}/en/darts/`,name:'MULTISPORTS SCORING darts scorer'},
      {'@type':'WebPage',url:`${BASE}/es/dardos/`,name:'Contador de dardos MULTISPORTS SCORING'},
      {'@type':'CollectionPage',url:DISCOVERY_ROUTES.fr,name:'Répertoire public MULTISPORTS SCORING'},
      {'@type':'CollectionPage',url:DISCOVERY_ROUTES.en,name:'MULTISPORTS SCORING public directory'},
      {'@type':'CollectionPage',url:DISCOVERY_ROUTES.es,name:'Directorio público MULTISPORTS SCORING'},
    ],
  };
  await writeFile(path.join(PUBLIC,'seo','entity.json'),JSON.stringify(entity,null,2));
  await writeFile(path.join(PUBLIC,'seo','darts-guides-v1.json'),JSON.stringify({
    product:'MULTISPORTS SCORING',
    category:'Darts scorer / dart counter / multi-sport scoring app',
    canonicalBase:BASE,
    googlePlay:PLAY,
    languages:DARTS_LANGS,
    genericSearchIntents:['dart counter','darts scorer','darts scorekeeper','compteur de fléchettes','application fléchettes','contador de dardos','marcador de dardos'],
    discoveryHubs:DISCOVERY_ROUTES,
    priorityGuideIds:PRIORITY_DARTS_GUIDES,
    guides:guideEntries,
  },null,2));
  await writeFile(path.join(PUBLIC,'seo','discovery-v6.json'),JSON.stringify({
    product:'MULTISPORTS SCORING',
    version:'V6 Discovery Boost',
    canonicalBase:BASE,
    discoveryHubs:DISCOVERY_ROUTES,
    priorityUrls:Object.fromEntries(DARTS_LANGS.map((lang)=>[lang,[catalog.sports.find((s)=>s.id==='darts').routes[lang],...PRIORITY_DARTS_GUIDES.map((id)=>guideUrl(catalog,lang,id))]])),
    indexNow:{keyLocation:`${BASE}/e68390561d47e281d51d8f33b20b1ec4.txt`,submitCommand:'npm run seo:indexnow'},
  },null,2));

  const lines = [
    '# MULTISPORTS SCORING — public product facts',
    '',
    '> MULTISPORTS SCORING is a free multi-sport scoring, statistics and performance application for Android and Web/PWA, with a dedicated Darts ecosystem.',
    '',
    `Canonical website: ${BASE}/`,
    `Google Play: ${PLAY}`,
    `Machine-readable app entity: ${BASE}/seo/entity.json`,
    `Machine-readable Darts catalogue: ${BASE}/seo/darts-guides-v1.json`,
    `FR discovery hub: ${DISCOVERY_ROUTES.fr}`,
    `EN discovery hub: ${DISCOVERY_ROUTES.en}`,
    `ES discovery hub: ${DISCOVERY_ROUTES.es}`,
    '',
    '## Darts discovery terms',
    'MULTISPORTS SCORING can be described as a dart counter, darts scorer, darts scorekeeper, X01 scorer, Cricket darts scorer and darts statistics app.',
    '',
    '## Darts features and modes',
    '- X01: 301, 501, 701 and 901',
    '- Cricket',
    '- Killer',
    '- Shanghai',
    '- Challenge',
    '- Darts Poker',
    '- Gros 6',
    '- CRADOS',
    '- X01 training',
    '- Player profiles, match history and darts statistics',
    '- Online X01 flow',
    '',
    '## Public Darts pages',
    ...guideEntries.flatMap((g)=>DARTS_LANGS.map((lang)=>`- ${lang}: ${g.names[lang]} — ${g.urls[lang]}`)),
    '',
    '## Multi-sport scope',
    'The application also contains or exposes scoring/performance modules beyond darts. Platform availability can differ by module and release; the language sport pages and machine-readable catalogue provide the current public-site declarations.',
  ];
  await writeFile(path.join(PUBLIC,'llms-full.txt'),lines.join('\n'));
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH,'utf8'));
  for (const lang of Object.keys(locale)) {
    await writeFile(path.join(PUBLIC, lang, 'index.html'), homePage(catalog,lang));
  }
  for (const lang of DARTS_LANGS) {
    await writeFile(localFileFromUrl(DISCOVERY_ROUTES[lang]), discoveryPage(catalog,lang));
  }
  for (const sport of catalog.sports) {
    for (const lang of Object.keys(locale)) {
      await writeFile(localFileFromUrl(sport.routes[lang]), sportPage(catalog,lang,sport));
    }
  }
  for (const lang of DARTS_LANGS) {
    for (const guideId of Object.keys(dartsGuides)) {
      const target = path.join(PUBLIC, urlPath(guideUrl(catalog,lang,guideId)).replace(/^\//,''), 'index.html');
      await writeFile(target, guidePage(catalog,lang,guideId));
    }
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  const sitemapUrls = [];
  const add = (url, priority, alternatesMap) => {
    sitemapUrls.push(url);
    sitemap.push('  <url>',`    <loc>${url}</loc>`,`    <lastmod>${TODAY}</lastmod>`,'    <changefreq>weekly</changefreq>',`    <priority>${priority}</priority>`);
    for (const [lang,href] of Object.entries(alternatesMap)) sitemap.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`);
    sitemap.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${alternatesMap.en || BASE+'/'}" />`,'  </url>');
  };
  const homeMap = Object.fromEntries(Object.keys(locale).map((lang)=>[lang,`${BASE}/${lang}/`]));
  for (const lang of Object.keys(locale)) add(`${BASE}/${lang}/`,'0.9',homeMap);
  for (const lang of DARTS_LANGS) add(DISCOVERY_ROUTES[lang],'1.0',DISCOVERY_ROUTES);
  for (const sport of catalog.sports) {
    for (const lang of Object.keys(locale)) add(sport.routes[lang],['darts','running','fit'].includes(sport.id)?'0.9':'0.8',sport.routes);
  }
  for (const guideId of Object.keys(dartsGuides)) {
    const map = guideAlternates(catalog,guideId);
    for (const lang of DARTS_LANGS) add(map[lang],guideId==='dart-counter'?'0.9':'0.8',map);
  }
  sitemap.push('</urlset>');
  await writeFile(SITEMAP_PATH,sitemap.join('\n'));
  await writeFile(path.join(PUBLIC,'sitemap-google.txt'),sitemapUrls.join('\n'));
  await writeMachineReadableFiles(catalog);
  console.log(`SEO pages generated: ${Object.keys(locale).length} languages, ${catalog.sports.length} sports, ${Object.keys(dartsGuides).length} Darts guides + ${DARTS_LANGS.length} discovery hubs.`);
}

main().catch((error)=>{console.error(error);process.exit(1);});
