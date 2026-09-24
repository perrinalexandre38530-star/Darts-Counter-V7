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
const ADSENSE_CLIENT = 'ca-pub-5323277022978157';
// AdSense review strategy: only manually curated French editorial pages are
// indexable and allowed to load the web advertising library. The interactive
// PWA shell and template translations never load Google web ads.
const INDEXABLE_LANGS = new Set(['fr']);
const ADSENSE_LOADER = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;
const TEXT_SITEMAP_PATH = path.join(PUBLIC, 'sitemap-google.txt');

const locale = {
  fr:{name:'Français',dir:'ltr',home:'Accueil',play:'Voir sur Google Play',web:'Ouvrir l’application Web',features:'Fonctions principales',availability:'Disponibilité',others:'Autres disciplines',languages:'Langues',faq:'Questions fréquentes',faqQ:'À quoi sert cette page ?',faqA:'Cette page publique permet aux utilisateurs et aux moteurs de recherche de découvrir ce module avant d’ouvrir l’application.',android:'Disponible dans la version Android publique et sur le Web/PWA.',webOnly:'Disponible dans le catalogue Web/PWA. La disponibilité dans la version Android publique peut différer.',homeTitle:'MULTISPORTS SCORING – scores, statistiques et performances sportives',homeH1:'Le scoring et la performance de plusieurs disciplines dans une seule application.',homeLead:'MULTISPORTS SCORING réunit scores, statistiques, profils et suivi des performances dans un même univers Android et Web/PWA.',available:'Disciplines disponibles',about:'Un univers multi-sports',aboutText:'Chaque discipline dispose de son propre espace avec ses outils de score, de suivi ou de performance.',scoreTitle:'Compteur de score {sport}',scoreLead:'Suivez les scores, les joueurs et les matchs de {sport} avec MULTISPORTS SCORING.',perfTitle:'Suivi de performance {sport}',perfLead:'Enregistrez et analysez vos activités de {sport} dans MULTISPORTS SCORING.',hubTitle:'Hub {sport}',hubLead:'Retrouvez les sessions, la progression et les fonctions compétitives de {sport} dans MULTISPORTS SCORING.'},
  en:{name:'English',dir:'ltr',home:'Home',play:'View on Google Play',web:'Open the Web app',features:'Main features',availability:'Availability',others:'Other sports',languages:'Languages',faq:'Frequently asked questions',faqQ:'What is this page for?',faqA:'This public landing page helps users and search engines discover the module before opening the application.',android:'Available in the public Android version and on Web/PWA.',webOnly:'Available in the Web/PWA catalogue. Public Android availability may differ.',homeTitle:'MULTISPORTS SCORING – sports scores, statistics and performance',homeH1:'Scoring and performance for multiple sports in one application.',homeLead:'MULTISPORTS SCORING combines scores, statistics, player profiles and performance tracking across Android and Web/PWA.',available:'Available sports',about:'One multi-sport ecosystem',aboutText:'Each sport has its own space with scoring, tracking or performance tools.',scoreTitle:'{sport} score tracker',scoreLead:'Track scores, players and matches for {sport} with MULTISPORTS SCORING.',perfTitle:'{sport} performance tracker',perfLead:'Record and analyse your {sport} activities in MULTISPORTS SCORING.',hubTitle:'{sport} hub',hubLead:'Explore {sport} sessions, progression and competitive features in MULTISPORTS SCORING.'},
  es:{name:'Español',dir:'ltr',home:'Inicio',play:'Ver en Google Play',web:'Abrir la aplicación Web',features:'Funciones principales',availability:'Disponibilidad',others:'Otras disciplinas',languages:'Idiomas',faq:'Preguntas frecuentes',faqQ:'¿Para qué sirve esta página?',faqA:'Esta página pública ayuda a los usuarios y a los motores de búsqueda a descubrir el módulo antes de abrir la aplicación.',android:'Disponible en la versión pública de Android y en Web/PWA.',webOnly:'Disponible en el catálogo Web/PWA. La disponibilidad pública en Android puede variar.',homeTitle:'MULTISPORTS SCORING – marcadores, estadísticas y rendimiento deportivo',homeH1:'Marcadores y rendimiento de varios deportes en una sola aplicación.',homeLead:'MULTISPORTS SCORING reúne marcadores, estadísticas, perfiles y seguimiento del rendimiento en Android y Web/PWA.',available:'Disciplinas disponibles',about:'Un universo multideporte',aboutText:'Cada disciplina dispone de su propio espacio con herramientas de puntuación, seguimiento o rendimiento.',scoreTitle:'Marcador de {sport}',scoreLead:'Sigue los puntos, jugadores y partidos de {sport} con MULTISPORTS SCORING.',perfTitle:'Seguimiento de rendimiento de {sport}',perfLead:'Registra y analiza tus actividades de {sport} en MULTISPORTS SCORING.',hubTitle:'Hub de {sport}',hubLead:'Descubre sesiones, progresión y funciones competitivas de {sport} en MULTISPORTS SCORING.'},
  de:{name:'Deutsch',dir:'ltr',home:'Startseite',play:'Bei Google Play ansehen',web:'Web-App öffnen',features:'Hauptfunktionen',availability:'Verfügbarkeit',others:'Weitere Sportarten',languages:'Sprachen',faq:'Häufige Fragen',faqQ:'Wozu dient diese Seite?',faqA:'Diese öffentliche Seite hilft Nutzern und Suchmaschinen, das Modul vor dem Öffnen der App zu entdecken.',android:'In der öffentlichen Android-Version und im Web/PWA verfügbar.',webOnly:'Im Web/PWA-Katalog verfügbar. Die Verfügbarkeit in der öffentlichen Android-Version kann abweichen.',homeTitle:'MULTISPORTS SCORING – Sport-Punktezähler, Statistiken und Leistung',homeH1:'Punkte und Leistung für mehrere Sportarten in einer App.',homeLead:'MULTISPORTS SCORING vereint Punktezähler, Statistiken, Profile und Leistungstracking auf Android und Web/PWA.',available:'Verfügbare Sportarten',about:'Ein Multi-Sport-Ökosystem',aboutText:'Jede Sportart besitzt einen eigenen Bereich mit Scoring-, Tracking- oder Leistungsfunktionen.',scoreTitle:'{sport} Punktezähler',scoreLead:'Verfolge Punkte, Spieler und Matches für {sport} mit MULTISPORTS SCORING.',perfTitle:'{sport} Leistungs-Tracker',perfLead:'Zeichne deine {sport}-Aktivitäten in MULTISPORTS SCORING auf und analysiere sie.',hubTitle:'{sport} Hub',hubLead:'Nutze {sport}-Sessions, Fortschritt und Wettbewerbsfunktionen in MULTISPORTS SCORING.'},
  it:{name:'Italiano',dir:'ltr',home:'Home',play:'Vedi su Google Play',web:'Apri l’app Web',features:'Funzioni principali',availability:'Disponibilità',others:'Altri sport',languages:'Lingue',faq:'Domande frequenti',faqQ:'A cosa serve questa pagina?',faqA:'Questa pagina pubblica aiuta utenti e motori di ricerca a scoprire il modulo prima di aprire l’app.',android:'Disponibile nella versione Android pubblica e sul Web/PWA.',webOnly:'Disponibile nel catalogo Web/PWA. La disponibilità nella versione Android pubblica può variare.',homeTitle:'MULTISPORTS SCORING – punteggi, statistiche e prestazioni sportive',homeH1:'Punteggi e prestazioni di più sport in un’unica app.',homeLead:'MULTISPORTS SCORING riunisce punteggi, statistiche, profili e monitoraggio delle prestazioni su Android e Web/PWA.',available:'Sport disponibili',about:'Un ecosistema multisport',aboutText:'Ogni sport dispone di un proprio spazio con strumenti di punteggio, monitoraggio o performance.',scoreTitle:'Segnapunti {sport}',scoreLead:'Tieni traccia di punti, giocatori e partite di {sport} con MULTISPORTS SCORING.',perfTitle:'Monitoraggio prestazioni {sport}',perfLead:'Registra e analizza le tue attività di {sport} in MULTISPORTS SCORING.',hubTitle:'Hub {sport}',hubLead:'Accedi a sessioni, progressione e funzioni competitive di {sport} in MULTISPORTS SCORING.'},
  pt:{name:'Português',dir:'ltr',home:'Início',play:'Ver no Google Play',web:'Abrir a aplicação Web',features:'Principais funções',availability:'Disponibilidade',others:'Outros desportos',languages:'Idiomas',faq:'Perguntas frequentes',faqQ:'Para que serve esta página?',faqA:'Esta página pública ajuda utilizadores e motores de pesquisa a descobrir o módulo antes de abrir a aplicação.',android:'Disponível na versão pública Android e na Web/PWA.',webOnly:'Disponível no catálogo Web/PWA. A disponibilidade na versão pública Android pode ser diferente.',homeTitle:'MULTISPORTS SCORING – placares, estatísticas e desempenho desportivo',homeH1:'Pontuação e desempenho de vários desportos numa única aplicação.',homeLead:'MULTISPORTS SCORING reúne pontuação, estatísticas, perfis e acompanhamento de desempenho em Android e Web/PWA.',available:'Desportos disponíveis',about:'Um ecossistema multidesportivo',aboutText:'Cada desporto tem o seu próprio espaço com ferramentas de pontuação, acompanhamento ou desempenho.',scoreTitle:'Marcador de {sport}',scoreLead:'Acompanhe pontos, jogadores e partidas de {sport} com MULTISPORTS SCORING.',perfTitle:'Acompanhamento de desempenho {sport}',perfLead:'Registe e analise as suas atividades de {sport} no MULTISPORTS SCORING.',hubTitle:'Hub de {sport}',hubLead:'Aceda a sessões, progressão e recursos competitivos de {sport} no MULTISPORTS SCORING.'},
  nl:{name:'Nederlands',dir:'ltr',home:'Home',play:'Bekijken op Google Play',web:'Web-app openen',features:'Belangrijkste functies',availability:'Beschikbaarheid',others:'Andere sporten',languages:'Talen',faq:'Veelgestelde vragen',faqQ:'Waarvoor dient deze pagina?',faqA:'Deze openbare pagina helpt gebruikers en zoekmachines de module te ontdekken voordat de app wordt geopend.',android:'Beschikbaar in de openbare Android-versie en op Web/PWA.',webOnly:'Beschikbaar in de Web/PWA-catalogus. De openbare Android-beschikbaarheid kan afwijken.',homeTitle:'MULTISPORTS SCORING – scores, statistieken en sportprestaties',homeH1:'Scores en prestaties voor meerdere sporten in één app.',homeLead:'MULTISPORTS SCORING combineert scores, statistieken, profielen en prestatietracking op Android en Web/PWA.',available:'Beschikbare sporten',about:'Eén multisport-ecosysteem',aboutText:'Elke sport heeft een eigen omgeving met score-, tracking- of prestatietools.',scoreTitle:'{sport} scoreteller',scoreLead:'Volg scores, spelers en wedstrijden voor {sport} met MULTISPORTS SCORING.',perfTitle:'{sport} prestatietracker',perfLead:'Registreer en analyseer je {sport}-activiteiten in MULTISPORTS SCORING.',hubTitle:'{sport} hub',hubLead:'Gebruik {sport}-sessies, voortgang en competitieve functies in MULTISPORTS SCORING.'},
  ru:{name:'Русский',dir:'ltr',home:'Главная',play:'Открыть в Google Play',web:'Открыть Web-приложение',features:'Основные функции',availability:'Доступность',others:'Другие виды спорта',languages:'Языки',faq:'Частые вопросы',faqQ:'Для чего нужна эта страница?',faqA:'Эта публичная страница помогает пользователям и поисковым системам узнать о модуле до открытия приложения.',android:'Доступно в публичной версии Android и в Web/PWA.',webOnly:'Доступно в каталоге Web/PWA. Наличие в публичной версии Android может отличаться.',homeTitle:'MULTISPORTS SCORING – счёт, статистика и спортивные результаты',homeH1:'Счёт и результаты для нескольких видов спорта в одном приложении.',homeLead:'MULTISPORTS SCORING объединяет счёт, статистику, профили и отслеживание результатов на Android и Web/PWA.',available:'Доступные виды спорта',about:'Единая мультиспортивная система',aboutText:'Для каждого вида спорта есть отдельный раздел с инструментами счёта, отслеживания или результатов.',scoreTitle:'Счётчик {sport}',scoreLead:'Отслеживайте очки, игроков и матчи для {sport} в MULTISPORTS SCORING.',perfTitle:'Отслеживание результатов: {sport}',perfLead:'Записывайте и анализируйте занятия {sport} в MULTISPORTS SCORING.',hubTitle:'Центр {sport}',hubLead:'Используйте сессии, прогресс и соревновательные функции {sport} в MULTISPORTS SCORING.'},
  zh:{name:'中文',dir:'ltr',home:'首页',play:'在 Google Play 查看',web:'打开 Web 应用',features:'主要功能',availability:'可用性',others:'其他运动',languages:'语言',faq:'常见问题',faqQ:'这个页面有什么作用？',faqA:'这个公开页面帮助用户和搜索引擎在打开应用之前了解对应模块。',android:'Android 公共版本和 Web/PWA 均可用。',webOnly:'Web/PWA 目录中可用；Android 公共版本的可用性可能不同。',homeTitle:'MULTISPORTS SCORING – 多运动计分、统计与表现追踪',homeH1:'一个应用管理多种运动的计分与表现。',homeLead:'MULTISPORTS SCORING 在 Android 和 Web/PWA 中整合计分、统计、个人资料和运动表现追踪。',available:'可用运动',about:'一个多运动生态',aboutText:'每种运动都有独立空间，提供计分、追踪或表现工具。',scoreTitle:'{sport}计分器',scoreLead:'使用 MULTISPORTS SCORING 记录 {sport} 的比分、玩家和比赛。',perfTitle:'{sport}表现追踪',perfLead:'使用 MULTISPORTS SCORING 记录并分析你的 {sport} 活动。',hubTitle:'{sport}中心',hubLead:'在 MULTISPORTS SCORING 中查看 {sport} 会话、进度与竞技功能。'},
  ja:{name:'日本語',dir:'ltr',home:'ホーム',play:'Google Play で見る',web:'Web アプリを開く',features:'主な機能',availability:'利用状況',others:'その他のスポーツ',languages:'言語',faq:'よくある質問',faqQ:'このページの目的は？',faqA:'この公開ページは、アプリを開く前にユーザーと検索エンジンがモジュールを見つけやすくするためのものです。',android:'Android 公開版と Web/PWA で利用できます。',webOnly:'Web/PWA カタログで利用できます。Android 公開版では利用状況が異なる場合があります。',homeTitle:'MULTISPORTS SCORING – マルチスポーツのスコア・統計・パフォーマンス',homeH1:'複数スポーツのスコアとパフォーマンスを1つのアプリで。',homeLead:'MULTISPORTS SCORING は Android と Web/PWA でスコア、統計、プロフィール、パフォーマンス追跡をまとめます。',available:'利用できるスポーツ',about:'マルチスポーツの統合環境',aboutText:'各スポーツには、スコア、追跡、パフォーマンス用の専用スペースがあります。',scoreTitle:'{sport} スコアトラッカー',scoreLead:'MULTISPORTS SCORING で {sport} のスコア、プレイヤー、試合を記録します。',perfTitle:'{sport} パフォーマンストラッカー',perfLead:'MULTISPORTS SCORING で {sport} のアクティビティを記録・分析します。',hubTitle:'{sport} ハブ',hubLead:'MULTISPORTS SCORING で {sport} のセッション、進捗、競技機能を利用します。'},
  ar:{name:'العربية',dir:'rtl',home:'الرئيسية',play:'عرض على Google Play',web:'فتح تطبيق الويب',features:'الميزات الرئيسية',availability:'التوفر',others:'رياضات أخرى',languages:'اللغات',faq:'الأسئلة الشائعة',faqQ:'ما فائدة هذه الصفحة؟',faqA:'تساعد هذه الصفحة العامة المستخدمين ومحركات البحث على اكتشاف الوحدة قبل فتح التطبيق.',android:'متاح في إصدار Android العام وعلى Web/PWA.',webOnly:'متاح في كتالوج Web/PWA. قد يختلف التوفر في إصدار Android العام.',homeTitle:'MULTISPORTS SCORING – تسجيل النتائج والإحصاءات والأداء الرياضي',homeH1:'النتائج والأداء لعدة رياضات في تطبيق واحد.',homeLead:'يجمع MULTISPORTS SCORING تسجيل النتائج والإحصاءات والملفات الشخصية وتتبع الأداء على Android وWeb/PWA.',available:'الرياضات المتاحة',about:'منظومة متعددة الرياضات',aboutText:'لكل رياضة مساحة خاصة بها مع أدوات للنتائج أو التتبع أو الأداء.',scoreTitle:'مسجل نتائج {sport}',scoreLead:'تابع النتائج واللاعبين والمباريات في {sport} باستخدام MULTISPORTS SCORING.',perfTitle:'متابعة أداء {sport}',perfLead:'سجل وحلل أنشطة {sport} باستخدام MULTISPORTS SCORING.',hubTitle:'مركز {sport}',hubLead:'تابع جلسات {sport} والتقدم والميزات التنافسية في MULTISPORTS SCORING.'},
  hi:{name:'हिन्दी',dir:'ltr',home:'होम',play:'Google Play पर देखें',web:'Web ऐप खोलें',features:'मुख्य सुविधाएँ',availability:'उपलब्धता',others:'अन्य खेल',languages:'भाषाएँ',faq:'अक्सर पूछे जाने वाले प्रश्न',faqQ:'यह पेज किस लिए है?',faqA:'यह सार्वजनिक पेज ऐप खोलने से पहले उपयोगकर्ताओं और सर्च इंजनों को मॉड्यूल खोजने में मदद करता है।',android:'सार्वजनिक Android संस्करण और Web/PWA पर उपलब्ध।',webOnly:'Web/PWA कैटलॉग में उपलब्ध। सार्वजनिक Android उपलब्धता अलग हो सकती है।',homeTitle:'MULTISPORTS SCORING – खेल स्कोर, आँकड़े और प्रदर्शन',homeH1:'कई खेलों का स्कोर और प्रदर्शन एक ही ऐप में।',homeLead:'MULTISPORTS SCORING Android और Web/PWA पर स्कोर, आँकड़े, प्रोफ़ाइल और प्रदर्शन ट्रैकिंग को एक साथ लाता है।',available:'उपलब्ध खेल',about:'एक मल्टी-स्पोर्ट इकोसिस्टम',aboutText:'हर खेल का अपना क्षेत्र है जिसमें स्कोर, ट्रैकिंग या प्रदर्शन टूल हैं।',scoreTitle:'{sport} स्कोर ट्रैकर',scoreLead:'MULTISPORTS SCORING में {sport} के स्कोर, खिलाड़ी और मैच ट्रैक करें।',perfTitle:'{sport} प्रदर्शन ट्रैकर',perfLead:'MULTISPORTS SCORING में अपनी {sport} गतिविधियाँ रिकॉर्ड और विश्लेषित करें।',hubTitle:'{sport} हब',hubLead:'MULTISPORTS SCORING में {sport} सत्र, प्रगति और प्रतिस्पर्धी फीचर देखें।'},
  tr:{name:'Türkçe',dir:'ltr',home:'Ana sayfa',play:'Google Play’de görüntüle',web:'Web uygulamasını aç',features:'Ana özellikler',availability:'Kullanılabilirlik',others:'Diğer sporlar',languages:'Diller',faq:'Sık sorulan sorular',faqQ:'Bu sayfa ne için kullanılır?',faqA:'Bu herkese açık sayfa, kullanıcıların ve arama motorlarının uygulamayı açmadan önce modülü keşfetmesine yardımcı olur.',android:'Genel Android sürümünde ve Web/PWA üzerinde kullanılabilir.',webOnly:'Web/PWA kataloğunda kullanılabilir. Genel Android kullanılabilirliği farklı olabilir.',homeTitle:'MULTISPORTS SCORING – spor skorları, istatistikler ve performans',homeH1:'Birden fazla sporun skoru ve performansı tek uygulamada.',homeLead:'MULTISPORTS SCORING Android ve Web/PWA üzerinde skor, istatistik, profil ve performans takibini bir araya getirir.',available:'Mevcut sporlar',about:'Tek bir çok sporlu ekosistem',aboutText:'Her sporun skor, takip veya performans araçları için özel bir alanı vardır.',scoreTitle:'{sport} skor takipçisi',scoreLead:'MULTISPORTS SCORING ile {sport} skorlarını, oyuncuları ve maçları takip edin.',perfTitle:'{sport} performans takipçisi',perfLead:'MULTISPORTS SCORING ile {sport} aktivitelerinizi kaydedin ve analiz edin.',hubTitle:'{sport} merkezi',hubLead:'MULTISPORTS SCORING içinde {sport} oturumlarını, ilerlemeyi ve rekabetçi özellikleri kullanın.'},
  da:{name:'Dansk',dir:'ltr',home:'Forside',play:'Se på Google Play',web:'Åbn Web-appen',features:'Vigtigste funktioner',availability:'Tilgængelighed',others:'Andre sportsgrene',languages:'Sprog',faq:'Ofte stillede spørgsmål',faqQ:'Hvad bruges denne side til?',faqA:'Denne offentlige side hjælper brugere og søgemaskiner med at opdage modulet, før appen åbnes.',android:'Tilgængelig i den offentlige Android-version og på Web/PWA.',webOnly:'Tilgængelig i Web/PWA-kataloget. Offentlig Android-tilgængelighed kan variere.',homeTitle:'MULTISPORTS SCORING – sportsresultater, statistik og præstation',homeH1:'Score og præstation for flere sportsgrene i én app.',homeLead:'MULTISPORTS SCORING samler score, statistik, profiler og præstationsmåling på Android og Web/PWA.',available:'Tilgængelige sportsgrene',about:'Ét multisport-økosystem',aboutText:'Hver sportsgren har sit eget område med score-, tracking- eller præstationsværktøjer.',scoreTitle:'{sport} scoretæller',scoreLead:'Følg score, spillere og kampe i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} præstationsmåler',perfLead:'Registrer og analyser dine {sport}-aktiviteter med MULTISPORTS SCORING.',hubTitle:'{sport} hub',hubLead:'Brug {sport}-sessioner, progression og konkurrencefunktioner i MULTISPORTS SCORING.'},
  no:{name:'Norsk',dir:'ltr',home:'Hjem',play:'Se på Google Play',web:'Åpne Web-appen',features:'Hovedfunksjoner',availability:'Tilgjengelighet',others:'Andre idretter',languages:'Språk',faq:'Ofte stilte spørsmål',faqQ:'Hva brukes denne siden til?',faqA:'Denne offentlige siden hjelper brukere og søkemotorer med å oppdage modulen før appen åpnes.',android:'Tilgjengelig i offentlig Android-versjon og på Web/PWA.',webOnly:'Tilgjengelig i Web/PWA-katalogen. Offentlig Android-tilgjengelighet kan variere.',homeTitle:'MULTISPORTS SCORING – sportsscore, statistikk og prestasjon',homeH1:'Score og prestasjon for flere idretter i én app.',homeLead:'MULTISPORTS SCORING samler score, statistikk, profiler og prestasjonssporing på Android og Web/PWA.',available:'Tilgjengelige idretter',about:'Ett multisport-økosystem',aboutText:'Hver idrett har sitt eget område med verktøy for score, sporing eller prestasjon.',scoreTitle:'{sport} poengteller',scoreLead:'Følg poeng, spillere og kamper i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} prestasjonsmåler',perfLead:'Registrer og analyser {sport}-aktivitetene dine med MULTISPORTS SCORING.',hubTitle:'{sport} hub',hubLead:'Bruk {sport}-økter, progresjon og konkurransefunksjoner i MULTISPORTS SCORING.'},
  sv:{name:'Svenska',dir:'ltr',home:'Hem',play:'Visa på Google Play',web:'Öppna Web-appen',features:'Huvudfunktioner',availability:'Tillgänglighet',others:'Andra sporter',languages:'Språk',faq:'Vanliga frågor',faqQ:'Vad används den här sidan till?',faqA:'Den här offentliga sidan hjälper användare och sökmotorer att upptäcka modulen innan appen öppnas.',android:'Tillgänglig i offentlig Android-version och på Web/PWA.',webOnly:'Tillgänglig i Web/PWA-katalogen. Offentlig Android-tillgänglighet kan skilja sig.',homeTitle:'MULTISPORTS SCORING – sportpoäng, statistik och prestation',homeH1:'Poäng och prestation för flera sporter i en app.',homeLead:'MULTISPORTS SCORING samlar poäng, statistik, profiler och prestationsspårning på Android och Web/PWA.',available:'Tillgängliga sporter',about:'Ett multisport-ekosystem',aboutText:'Varje sport har ett eget område med verktyg för poäng, spårning eller prestation.',scoreTitle:'{sport} poängräknare',scoreLead:'Följ poäng, spelare och matcher i {sport} med MULTISPORTS SCORING.',perfTitle:'{sport} prestationsmätare',perfLead:'Registrera och analysera dina {sport}-aktiviteter med MULTISPORTS SCORING.',hubTitle:'{sport} hubb',hubLead:'Använd {sport}-sessioner, progression och tävlingsfunktioner i MULTISPORTS SCORING.'},
  is:{name:'Íslenska',dir:'ltr',home:'Heim',play:'Skoða á Google Play',web:'Opna Web-appið',features:'Helstu eiginleikar',availability:'Framboð',others:'Aðrar íþróttir',languages:'Tungumál',faq:'Algengar spurningar',faqQ:'Til hvers er þessi síða?',faqA:'Þessi opinbera síða hjálpar notendum og leitarvélum að finna eininguna áður en appið er opnað.',android:'Tiltækt í opinberri Android-útgáfu og á Web/PWA.',webOnly:'Tiltækt í Web/PWA. Framboð í opinberri Android-útgáfu getur verið annað.',homeTitle:'MULTISPORTS SCORING – stig, tölfræði og íþróttaárangur',homeH1:'Stig og árangur fyrir margar íþróttir í einu appi.',homeLead:'MULTISPORTS SCORING sameinar stig, tölfræði, prófíla og frammistöðumælingu á Android og Web/PWA.',available:'Tiltækar íþróttir',about:'Eitt fjölíþróttaumhverfi',aboutText:'Hver íþrótt hefur sitt eigið svæði með verkfærum fyrir stig, mælingu eða frammistöðu.',scoreTitle:'{sport} stigateljari',scoreLead:'Fylgstu með stigum, leikmönnum og leikjum í {sport} með MULTISPORTS SCORING.',perfTitle:'{sport} frammistöðumæling',perfLead:'Skráðu og greindu {sport}-æfingar með MULTISPORTS SCORING.',hubTitle:'{sport} miðstöð',hubLead:'Notaðu {sport}-lotur, framvindu og keppniseiginleika í MULTISPORTS SCORING.'},
  pl:{name:'Polski',dir:'ltr',home:'Strona główna',play:'Zobacz w Google Play',web:'Otwórz aplikację Web',features:'Główne funkcje',availability:'Dostępność',others:'Inne dyscypliny',languages:'Języki',faq:'Najczęstsze pytania',faqQ:'Do czego służy ta strona?',faqA:'Ta publiczna strona pomaga użytkownikom i wyszukiwarkom odkryć moduł przed otwarciem aplikacji.',android:'Dostępne w publicznej wersji Android oraz Web/PWA.',webOnly:'Dostępne w katalogu Web/PWA. Publiczna wersja Android może się różnić.',homeTitle:'MULTISPORTS SCORING – wyniki, statystyki i osiągnięcia sportowe',homeH1:'Wyniki i postępy wielu dyscyplin w jednej aplikacji.',homeLead:'MULTISPORTS SCORING łączy wyniki, statystyki, profile i śledzenie osiągnięć na Androidzie i Web/PWA.',available:'Dostępne dyscypliny',about:'Jeden ekosystem multisportowy',aboutText:'Każda dyscyplina ma własną przestrzeń z narzędziami do wyników, śledzenia lub wydajności.',scoreTitle:'Licznik wyniku {sport}',scoreLead:'Śledź wyniki, graczy i mecze {sport} w MULTISPORTS SCORING.',perfTitle:'Śledzenie wyników {sport}',perfLead:'Rejestruj i analizuj aktywności {sport} w MULTISPORTS SCORING.',hubTitle:'Centrum {sport}',hubLead:'Korzystaj z sesji, progresji i funkcji rywalizacji {sport} w MULTISPORTS SCORING.'},
  ro:{name:'Română',dir:'ltr',home:'Acasă',play:'Vezi pe Google Play',web:'Deschide aplicația Web',features:'Funcții principale',availability:'Disponibilitate',others:'Alte sporturi',languages:'Limbi',faq:'Întrebări frecvente',faqQ:'La ce folosește această pagină?',faqA:'Această pagină publică ajută utilizatorii și motoarele de căutare să descopere modulul înainte de a deschide aplicația.',android:'Disponibil în versiunea publică Android și pe Web/PWA.',webOnly:'Disponibil în catalogul Web/PWA. Disponibilitatea Android publică poate diferi.',homeTitle:'MULTISPORTS SCORING – scoruri, statistici și performanță sportivă',homeH1:'Scor și performanță pentru mai multe sporturi într-o singură aplicație.',homeLead:'MULTISPORTS SCORING reunește scoruri, statistici, profiluri și monitorizarea performanței pe Android și Web/PWA.',available:'Sporturi disponibile',about:'Un singur ecosistem multisport',aboutText:'Fiecare sport are propriul spațiu cu instrumente de scor, monitorizare sau performanță.',scoreTitle:'Contor de scor {sport}',scoreLead:'Urmărește scoruri, jucători și meciuri de {sport} cu MULTISPORTS SCORING.',perfTitle:'Monitorizare performanță {sport}',perfLead:'Înregistrează și analizează activitățile de {sport} cu MULTISPORTS SCORING.',hubTitle:'Hub {sport}',hubLead:'Accesează sesiuni, progres și funcții competitive de {sport} în MULTISPORTS SCORING.'},
  sr:{name:'Srpski',dir:'ltr',home:'Početna',play:'Pogledaj na Google Play',web:'Otvori Web aplikaciju',features:'Glavne funkcije',availability:'Dostupnost',others:'Drugi sportovi',languages:'Jezici',faq:'Česta pitanja',faqQ:'Čemu služi ova stranica?',faqA:'Ova javna stranica pomaže korisnicima i pretraživačima da otkriju modul pre otvaranja aplikacije.',android:'Dostupno u javnoj Android verziji i na Web/PWA.',webOnly:'Dostupno u Web/PWA katalogu. Javna Android dostupnost može biti drugačija.',homeTitle:'MULTISPORTS SCORING – rezultati, statistika i sportski učinak',homeH1:'Rezultati i napredak za više sportova u jednoj aplikaciji.',homeLead:'MULTISPORTS SCORING objedinjuje rezultate, statistiku, profile i praćenje učinka na Androidu i Web/PWA.',available:'Dostupni sportovi',about:'Jedan multisport ekosistem',aboutText:'Svaki sport ima svoj prostor sa alatima za rezultat, praćenje ili učinak.',scoreTitle:'Brojač rezultata {sport}',scoreLead:'Pratite rezultat, igrače i mečeve za {sport} u MULTISPORTS SCORING.',perfTitle:'Praćenje učinka {sport}',perfLead:'Beležite i analizirajte {sport} aktivnosti u MULTISPORTS SCORING.',hubTitle:'{sport} centar',hubLead:'Koristite {sport} sesije, napredak i takmičarske funkcije u MULTISPORTS SCORING.'},
  hr:{name:'Hrvatski',dir:'ltr',home:'Početna',play:'Pogledaj na Google Play',web:'Otvori Web aplikaciju',features:'Glavne funkcije',availability:'Dostupnost',others:'Drugi sportovi',languages:'Jezici',faq:'Česta pitanja',faqQ:'Čemu služi ova stranica?',faqA:'Ova javna stranica pomaže korisnicima i tražilicama otkriti modul prije otvaranja aplikacije.',android:'Dostupno u javnoj Android verziji i na Web/PWA.',webOnly:'Dostupno u Web/PWA katalogu. Javna Android dostupnost može se razlikovati.',homeTitle:'MULTISPORTS SCORING – rezultati, statistika i sportska izvedba',homeH1:'Rezultati i napredak za više sportova u jednoj aplikaciji.',homeLead:'MULTISPORTS SCORING objedinjuje rezultate, statistiku, profile i praćenje izvedbe na Androidu i Web/PWA.',available:'Dostupni sportovi',about:'Jedan multisport ekosustav',aboutText:'Svaki sport ima svoj prostor s alatima za rezultat, praćenje ili izvedbu.',scoreTitle:'Brojač rezultata {sport}',scoreLead:'Pratite rezultat, igrače i mečeve za {sport} u MULTISPORTS SCORING.',perfTitle:'Praćenje izvedbe {sport}',perfLead:'Bilježite i analizirajte {sport} aktivnosti u MULTISPORTS SCORING.',hubTitle:'{sport} centar',hubLead:'Koristite {sport} sesije, napredak i natjecateljske funkcije u MULTISPORTS SCORING.'},
  cs:{name:'Čeština',dir:'ltr',home:'Domů',play:'Zobrazit na Google Play',web:'Otevřít Web aplikaci',features:'Hlavní funkce',availability:'Dostupnost',others:'Další sporty',languages:'Jazyky',faq:'Časté otázky',faqQ:'K čemu tato stránka slouží?',faqA:'Tato veřejná stránka pomáhá uživatelům a vyhledávačům objevit modul před otevřením aplikace.',android:'Dostupné ve veřejné Android verzi a na Web/PWA.',webOnly:'Dostupné v katalogu Web/PWA. Veřejná dostupnost na Androidu se může lišit.',homeTitle:'MULTISPORTS SCORING – skóre, statistiky a sportovní výkon',homeH1:'Skóre a výkon pro více sportů v jedné aplikaci.',homeLead:'MULTISPORTS SCORING spojuje skóre, statistiky, profily a sledování výkonu na Androidu a Web/PWA.',available:'Dostupné sporty',about:'Jeden multisportovní ekosystém',aboutText:'Každý sport má vlastní prostor s nástroji pro skóre, sledování nebo výkon.',scoreTitle:'Počítadlo skóre {sport}',scoreLead:'Sledujte skóre, hráče a zápasy {sport} v MULTISPORTS SCORING.',perfTitle:'Sledování výkonu {sport}',perfLead:'Zaznamenávejte a analyzujte aktivity {sport} v MULTISPORTS SCORING.',hubTitle:'Centrum {sport}',hubLead:'Používejte relace, progres a soutěžní funkce {sport} v MULTISPORTS SCORING.'},
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
  darts:['X01 301 / 501 / 701 / 901','Cricket · Killer · Shanghai','Profiles · history · statistics'],
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

const guides = ['x01','cricket','killer','shanghai'];

const frHomeEditorial = [
  ['Une application pensée pour les parties réelles',
   'MULTISPORTS SCORING est d’abord un outil de terrain : on ouvre une discipline, on prépare les joueurs ou les équipes, puis on enregistre le score ou la performance au fil de la partie. Le projet réunit dans la même interface des sports de précision, des jeux de score et des modules de suivi physique. L’objectif est d’éviter de multiplier les applications et les feuilles de score tout en conservant un historique exploitable.'],
  ['Des statistiques reliées aux profils',
   'Les profils servent à conserver les résultats au-delà d’une seule partie. Selon la discipline, l’application peut suivre les victoires, les moyennes, les séries, les records personnels, les historiques de matchs ou les données de performance. Cette continuité permet de comparer les séances dans le temps et de retrouver les résultats d’un joueur sans ressaisie.'],
  ['Android et Web/PWA',
   'La version Android est destinée à une utilisation mobile sur le terrain ou autour d’une cible. La version Web/PWA permet d’ouvrir l’univers MULTISPORTS SCORING depuis un navigateur compatible. Certaines fonctions peuvent arriver à des rythmes différents selon la plateforme : chaque page de discipline indique donc clairement ce qui est disponible plutôt que de présenter comme terminé ce qui est encore en développement.'],
  ['Une base commune, des règles propres à chaque discipline',
   'Le socle de l’application reste cohérent — profils, historiques, statistiques, navigation et sauvegarde — mais chaque discipline conserve ses règles. Un X01 aux fléchettes ne se traite pas comme une mène de pétanque, un set de tennis de table ou une séance de running. Les écrans de score et les indicateurs sont adaptés au contexte sportif afin que l’outil reste lisible pendant l’action.'],
];

const frSportEditorial = {
  darts: [
    ['Suivre une partie sans calcul mental inutile',
     'Le module Fléchettes centralise le score et l’ordre de jeu afin que les joueurs puissent se concentrer sur la cible. X01, Cricket, Killer et Shanghai font partie des modes historiques du projet, auxquels s’ajoutent progressivement d’autres variantes. Les écrans distinguent le score courant, les tours et les informations utiles au mode choisi.'],
    ['X01, sorties et historique',
     'En X01, une partie peut démarrer en 301, 501, 701 ou 901. Les options d’entrée et de sortie permettent d’adapter la partie aux habitudes des joueurs. L’application conserve les résultats et les statistiques associées aux profils afin de retrouver les moyennes et les performances après la partie.'],
    ['Pourquoi utiliser un compteur dédié',
     'Un compteur numérique évite les erreurs de soustraction, accélère les changements de joueur et facilite la consultation de l’historique. Il devient surtout utile lorsqu’on joue régulièrement : les données accumulées donnent une vision plus fiable de la progression qu’une impression basée sur quelques volées réussies.']
  ],
  running: [
    ['Enregistrer une sortie comme une activité complète',
     'RUNNING PERF est conçu pour conserver une sortie avec sa distance, sa durée, son allure, son tracé et les informations utiles à l’analyse. L’objectif n’est pas seulement d’afficher un chronomètre pendant l’effort, mais de pouvoir rouvrir l’activité ensuite et comparer les séances.'],
    ['Carte, allure et dénivelé',
     'Le suivi GPS sert de base au parcours. Les données de vitesse et d’allure doivent rester cohérentes avec le sport pratiqué, qu’il s’agisse de course ou de marche. Le travail du module porte aussi sur le relief, le dénivelé positif et négatif, l’altitude et la lecture du parcours sur une carte.'],
    ['Historique et continuité',
     'Une activité utile doit rester disponible après la fermeture de l’application. Les sorties sont donc pensées comme des objets persistants : on doit pouvoir les retrouver, consulter leur carte et leurs statistiques, puis les supprimer volontairement si nécessaire.']
  ],
  fit: [
    ['Suivre réellement une séance de musculation',
     'FIT PERF enregistre les exercices, séries, répétitions et charges au fil de la séance. Cette granularité est importante : elle permet de calculer le volume de travail et de repérer les progressions au lieu de conserver uniquement un résumé approximatif.'],
    ['Repos, records et estimation du 1RM',
     'Le module inclut un chronomètre de repos et des indicateurs de progression. À partir des séries enregistrées, l’application peut faire ressortir des records personnels et proposer des estimations utiles comme le 1RM, tout en conservant les performances précédentes pour comparaison.'],
    ['Bibliothèque et programmes',
     'La bibliothèque d’exercices sert de base à la création des séances. L’ambition est de garder une interface exploitable pendant l’entraînement : choisir un exercice, saisir rapidement une série, reprendre après le repos et retrouver ensuite l’historique complet.']
  ],
  foot: [
    ['Un tableau de score pour les matchs',
     'Le module Football est destiné au suivi simple d’un match ou d’une rencontre organisée dans l’écosystème MULTISPORTS SCORING. Les équipes, le score et l’historique doivent rester lisibles sans transformer l’écran de jeu en feuille de statistiques complexe.'],
    ['Relier le match à une organisation',
     'Dans les usages club, association ou entreprise, un résultat peut alimenter un calendrier, une compétition ou un classement. Le projet prévoit que les matchs restent liés à leur contexte plutôt que d’exister comme des scores isolés.'],
    ['Historique exploitable',
     'Conserver les rencontres permet de retrouver les scores passés et de construire progressivement des statistiques d’équipe. La disponibilité de ces fonctions peut différer entre la Web/PWA et la version Android publique.']
  ],
  babyfoot: [
    ['Compter vite pendant une partie',
     'Le baby-foot demande une interface très rapide : le score doit pouvoir évoluer sans détourner longtemps l’attention de la table. Le module privilégie donc des actions simples, un affichage clair des équipes et un historique de rencontre.'],
    ['Équipes et séries de matchs',
     'L’intérêt dépasse le score instantané lorsque plusieurs joueurs se retrouvent régulièrement. Les résultats peuvent être associés aux profils ou aux équipes afin de suivre les confrontations et de comparer les performances sur plusieurs parties.'],
    ['Un outil adapté aux lieux et aux clubs',
     'Le baby-foot fait partie des disciplines qui peuvent être utilisées dans un bar, une association ou une entreprise. Cette logique rejoint le module Organisations, destiné à regrouper calendrier, membres, équipes et résultats dans un même espace.']
  ],
  pingpong: [
    ['Points, sets et service',
     'Le tennis de table demande de distinguer le score du set et le score global du match. Le module est pensé pour afficher clairement les points, les joueurs et la progression de la rencontre, avec un historique consultable après la partie.'],
    ['Éviter les erreurs de suivi',
     'Quand les échanges s’enchaînent, une saisie rapide réduit les erreurs et évite de reconstruire le score de mémoire. L’application centralise le déroulement du match et peut ensuite rattacher le résultat aux statistiques des profils.'],
    ['Disponibilité selon la plateforme',
     'Le catalogue Web/PWA peut contenir des fonctions qui ne sont pas encore dans la version Android publique. Cette page indique donc la disponibilité actuelle sans présenter une fonction en développement comme déjà publiée.']
  ],
  petanque: [
    ['Suivre les points mène par mène',
     'La pétanque se prête bien à un suivi numérique parce que le score évolue par mènes. L’application enregistre les points attribués à chaque équipe et maintient le total jusqu’à la fin de la partie.'],
    ['Équipes et historique',
     'Le résultat d’une rencontre peut être conservé avec les joueurs ou les équipes concernés. Cela permet de retrouver les parties précédentes et de constituer progressivement des statistiques sans conserver des feuilles papier.'],
    ['Usage loisir ou club',
     'Le même principe peut servir à une partie amicale comme à une rencontre organisée. Dans un contexte club, les résultats peuvent ensuite rejoindre les outils d’organisation, de calendrier et de classement prévus dans l’application.']
  ],
  molkky: [
    ['Le score particulier du Mölkky',
     'Le Mölkky ne se résume pas à additionner des points : le nombre de quilles renversées et la valeur d’une quille unique modifient le calcul. Un compteur dédié évite les erreurs et garde l’objectif des 50 points visible pour tous les joueurs.'],
    ['Tours et joueurs',
     'Le suivi numérique conserve l’ordre de passage et le score de chaque participant. Cela devient utile dès que plusieurs joueurs participent ou lorsque l’on souhaite garder une trace des résultats sur plusieurs parties.'],
    ['Une discipline encore en évolution dans le catalogue',
     'Le module fait partie du catalogue Web/PWA et son niveau d’intégration Android peut évoluer. Les fonctions annoncées sur cette page restent limitées à ce qui est réellement présent ou planifié dans le projet.']
  ],
  dicegame: [
    ['Un moteur de score générique pour les jeux de dés',
     'Dice Game sert de base aux parties où plusieurs joueurs enchaînent des manches et accumulent des points. L’interface doit permettre de suivre rapidement le tour courant sans perdre le total précédent.'],
    ['Historique des manches',
     'Conserver les manches rend la partie plus lisible et permet de vérifier comment le score final a été construit. Cette logique est particulièrement utile dans les variantes où un mauvais lancer peut modifier fortement le classement.'],
    ['Évolution du module',
     'Le module existe dans le catalogue Web/PWA et peut évoluer avec de nouvelles règles ou variantes. La disponibilité Android publique peut donc différer de celle du Web.']
  ],
  esports: [
    ['Un espace compétitif distinct des sports physiques',
     'Le hub E-sport regroupe les fonctions compétitives qui peuvent être utilisées entièrement en ligne. Il est séparé des sports qui nécessitent une présence physique réelle, afin de ne pas simuler artificiellement des adversaires là où cela n’aurait pas de sens.'],
    ['Sessions classées et progression',
     'Le projet prévoit des sessions ranked, une progression et un réseau compétitif. Les résultats doivent être liés aux profils afin que le classement reflète des parties réellement enregistrées dans l’écosystème.'],
    ['Communauté et disponibilité',
     'Le hub est en évolution et certaines fonctions peuvent être disponibles d’abord sur le Web/PWA. Les pages publiques sont maintenues pour expliquer le fonctionnement réel du module et son état de disponibilité.']
  ]
};

const frGuideEditorial = {
  x01: [
    ['Principe du X01',
     'Chaque joueur commence avec un total défini — le plus souvent 301 ou 501 — puis soustrait la valeur de ses fléchettes. Le but est d’atteindre exactement zéro. Une volée qui ferait passer le score sous zéro est un bust : le score revient alors à sa valeur du début de tour selon les règles retenues.'],
    ['Entrée et sortie',
     'Les variantes Single In, Double In ou Master In déterminent la manière de commencer réellement le décompte. De la même façon, Single Out, Double Out ou Master Out changent la condition de victoire. Le Double Out reste une configuration classique : le joueur doit terminer exactement sur un double.'],
    ['Ce que suit MULTISPORTS SCORING',
     'Le compteur gère le score restant, l’ordre des joueurs, les legs et, en duel, les sets lorsque cette option est utilisée. Les statistiques de partie peuvent ensuite alimenter le profil et l’historique, notamment les moyennes et les sorties réussies.']
  ],
  cricket: [
    ['Cibles utilisées',
     'Le Cricket classique se joue sur les nombres 15, 16, 17, 18, 19, 20 et le Bull. Une cible doit recevoir trois marques pour être fermée. Un simple compte pour une marque, un double pour deux et un triple pour trois.'],
    ['Marquer des points',
     'Lorsqu’un joueur a fermé une cible que son adversaire n’a pas encore fermée, les touches supplémentaires sur cette cible peuvent rapporter des points selon la variante. La partie oppose donc fermeture des zones et gestion du score.'],
    ['Suivi dans l’application',
     'Le tableau de Cricket doit montrer immédiatement quelles zones sont ouvertes, fermées ou encore vulnérables. Le suivi numérique évite de compter mentalement les marques et conserve le résultat final dans l’historique.']
  ],
  killer: [
    ['Objectif',
     'Dans Killer, chaque joueur reçoit ou choisit généralement un numéro. Il doit d’abord remplir la condition prévue pour devenir « killer », puis peut attaquer les vies des autres joueurs en touchant leurs zones. La dernière personne encore en vie gagne.'],
    ['Vies et éliminations',
     'Le cœur du mode est la gestion des vies. L’interface doit donc rendre visibles le numéro associé à chaque joueur, son état et les éliminations, sans obliger à reconstruire la situation à partir des volées précédentes.'],
    ['Variantes et bots',
     'Le projet MULTISPORTS SCORING utilise aussi Killer comme terrain de jeu pour des adversaires IA dédiés. Les variantes exactes peuvent dépendre de la configuration choisie avant la partie.']
  ],
  shanghai: [
    ['Progression par nombres',
     'Shanghai se joue habituellement sur une suite de nombres. À chaque tour, les joueurs visent le nombre imposé et marquent selon qu’ils touchent le simple, le double ou le triple de cette cible.'],
    ['Le Shanghai',
     'La combinaison emblématique consiste à toucher, pendant le même tour, un simple, un double et un triple du nombre demandé. Selon la règle choisie, cette combinaison peut donner une victoire immédiate ou un avantage particulier.'],
    ['Lecture du tour',
     'Un bon écran de Shanghai doit rappeler le nombre en cours, le score du joueur et la progression des manches. MULTISPORTS SCORING conserve cette structure pour limiter les erreurs pendant une partie rapide.']
  ]
};
const guideNames = { x01:'X01', cricket:'Cricket', killer:'Killer', shanghai:'Shanghai' };

const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fill = (template, sport) => template.replace('{sport}', sport);
const urlPath = (full) => new URL(full).pathname;
const localFileFromUrl = (full) => path.join(PUBLIC, urlPath(full).replace(/^\//,''), 'index.html');

function alternates(catalog, sportId=null) {
  const langs = Object.keys(locale).filter((code) => INDEXABLE_LANGS.has(code));
  const links = langs.map((code) => {
    const href = sportId ? catalog.sports.find((s)=>s.id===sportId).routes[code] : `${BASE}/${code}/`;
    return `<link rel="alternate" hreflang="${code}" href="${escapeHtml(href)}">`;
  });
  const def = sportId ? catalog.sports.find((s)=>s.id===sportId).routes.fr : `${BASE}/fr/`;
  links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(def)}">`);
  return links.join('');
}

function jsonLd({lang,url,title,description,breadcrumb}) {
  return JSON.stringify({
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'Organization','@id':`${BASE}/#organization`,name:'MULTISPORTS SCORING',url:`${BASE}/`,logo:`${BASE}/app-512.png`},
      {'@type':['SoftwareApplication','MobileApplication'],'@id':`${BASE}/#app`,name:'MULTISPORTS SCORING',url:`${BASE}/`,downloadUrl:PLAY,image:`${BASE}/app-512.png`,operatingSystem:'Android, Web',applicationCategory:'SportsApplication',offers:{'@type':'Offer',price:'0',priceCurrency:'EUR'}},
      {'@type':'WebPage',url,name:title,description,inLanguage:lang,about:{'@id':`${BASE}/#app`}},
      {'@type':'BreadcrumbList',itemListElement:breadcrumb.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:item.url}))},
    ]
  });
}

function head({catalog,lang,url,title,description,sportId=null}) {
  const indexable = INDEXABLE_LANGS.has(lang);
  const robots = indexable
    ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    : 'noindex,follow';
  const ads = indexable ? ADSENSE_LOADER : '';
  return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escapeHtml(url)}">${alternates(catalog,sportId)}<meta property="og:type" content="website"><meta property="og:site_name" content="MULTISPORTS SCORING"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(url)}"><meta property="og:image" content="${BASE}/app-512.png"><link rel="stylesheet" href="/seo/seo.css">${ads}`;
}

function languageLinks(catalog, sportId=null) {
  return Object.keys(locale).map((code)=>{
    const href = sportId ? urlPath(catalog.sports.find((s)=>s.id===sportId).routes[code]) : `/${code}/`;
    return `<a hreflang="${code}" href="${href}">${escapeHtml(locale[code].name)}</a>`;
  }).join(' · ');
}

function editorialSections(items = []) {
  return items.map(([title, body]) => `<section class="editorial"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`).join('');
}

function sportLinks(catalog, lang, current) {
  return catalog.sports.filter((s)=>s.id!==current).map((s)=>`<a href="${urlPath(s.routes[lang])}">${escapeHtml(sportNames[lang][s.id])}</a>`).join(' · ');
}

function homePage(catalog, lang) {
  const t = locale[lang];
  const url = `${BASE}/${lang}/`;
  const cards = catalog.sports.map((s)=>`<article class="card"><h2><a href="${urlPath(s.routes[lang])}">${escapeHtml(sportNames[lang][s.id])}</a></h2><p>${escapeHtml(s.androidPublicV1 ? t.android : t.webOnly)}</p></article>`).join('');
  const ld = jsonLd({lang,url,title:t.homeTitle,description:t.homeLead,breadcrumb:[{name:t.home,url}]});
  const editorial = lang === 'fr' ? editorialSections(frHomeEditorial) : '';
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({catalog,lang,url,title:t.homeTitle,description:t.homeLead})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING</div><h1>${escapeHtml(t.homeH1)}</h1><p class="lead">${escapeHtml(t.homeLead)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><a class="cta" href="/">${escapeHtml(t.web)}</a></header>${editorial}<section><h2>${escapeHtml(t.available)}</h2><div class="grid">${cards}</div></section><section><h2>${escapeHtml(t.about)}</h2><p>${escapeHtml(t.aboutText)}</p></section><section><h2>${escapeHtml(t.languages)}</h2><p>${languageLinks(catalog)}</p></section><footer><strong>MULTISPORTS SCORING</strong><br>Android · Web/PWA</footer></main></body></html>`;
}

function sportPage(catalog, lang, sport) {
  const t = locale[lang];
  const name = sportNames[lang][sport.id];
  const category = sportCategory[sport.id];
  const titleBase = category==='perf' ? fill(t.perfTitle,name) : category==='hub' ? fill(t.hubTitle,name) : fill(t.scoreTitle,name);
  const description = category==='perf' ? fill(t.perfLead,name) : category==='hub' ? fill(t.hubLead,name) : fill(t.scoreLead,name);
  const title = `${titleBase} | MULTISPORTS SCORING`;
  const url = sport.routes[lang];
  const featureItems = features[sport.id].map((x)=>`<li>${escapeHtml(x)}</li>`).join('');
  const dartsGuides = sport.id==='darts' && ['fr','en','es'].includes(lang)
    ? `<section><h2>${lang==='fr'?'Guides fléchettes':lang==='es'?'Guías de dardos':'Darts guides'}</h2><p>${guides.map((g)=>`<a href="${urlPath(url)}${g}/">${guideNames[g]}</a>`).join(' · ')}</p></section>` : '';
  const editorial = lang === 'fr' ? editorialSections(frSportEditorial[sport.id] || []) : '';
  const ld = jsonLd({lang,url,title,description,breadcrumb:[{name:t.home,url:`${BASE}/${lang}/`},{name,url}]});
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({catalog,lang,url,title,description,sportId:sport.id})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING · ${escapeHtml(name)}</div><h1>${escapeHtml(titleBase)}</h1><p class="lead">${escapeHtml(description)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><a class="cta" href="/">${escapeHtml(t.web)}</a><nav><a href="/${lang}/">${escapeHtml(t.home)}</a></nav></header>${editorial}<section><h2>${escapeHtml(t.features)}</h2><ul>${featureItems}</ul></section><section><h2>${escapeHtml(t.availability)}</h2><p>${escapeHtml(sport.androidPublicV1 ? t.android : t.webOnly)}</p></section>${dartsGuides}<section><h2>${escapeHtml(t.faq)}</h2><ul><li><strong>${escapeHtml(t.faqQ)}</strong><br>${escapeHtml(t.faqA)}</li></ul></section><section><h2>${escapeHtml(t.others)}</h2><p>${sportLinks(catalog,lang,sport.id)}</p></section><section><h2>${escapeHtml(t.languages)}</h2><p>${languageLinks(catalog,sport.id)}</p></section><footer><strong>MULTISPORTS SCORING</strong><br>Android · Web/PWA</footer></main></body></html>`;
}

function guidePage(catalog, lang, guide) {
  const t = locale[lang];
  const sport = catalog.sports.find((s)=>s.id==='darts');
  const sportUrl = sport.routes[lang];
  const url = `${sportUrl}${guide}/`;
  const sportName = sportNames[lang].darts;
  const title = `${guideNames[guide]} ${sportName} | MULTISPORTS SCORING`;
  const descriptions = {
    fr:`Découvrez le mode ${guideNames[guide]} aux fléchettes, son principe et son suivi dans MULTISPORTS SCORING.`,
    en:`Discover the ${guideNames[guide]} darts mode, its objective and score tracking in MULTISPORTS SCORING.`,
    es:`Descubre el modo ${guideNames[guide]} de dardos, su objetivo y el seguimiento del marcador en MULTISPORTS SCORING.`,
  };
  const descriptionsByGuide = {
    x01:['301 / 501 / 701 / 901','Reach zero exactly','X01 scoring and match statistics'],
    cricket:['Numbers 15 to 20 and Bull','Open and close targets','Strategic scoring'],
    killer:['Player numbers','Lives and eliminations','Last surviving player wins'],
    shanghai:['Rounds 1 to 20','Singles, doubles and triples','Shanghai scoring'],
  };
  const desc = descriptions[lang];
  const editorial = lang === 'fr' ? editorialSections(frGuideEditorial[guide] || []) : '';
  const ld = jsonLd({lang,url,title,description:desc,breadcrumb:[{name:t.home,url:`${BASE}/${lang}/`},{name:sportName,url:sportUrl},{name:guideNames[guide],url}]});
  return `<!doctype html><html lang="${lang}" dir="${t.dir}"><head>${head({catalog,lang,url,title,description:desc,sportId:'darts'})}<script type="application/ld+json">${ld}</script></head><body><main class="wrap"><header class="hero"><div class="brand">MULTISPORTS SCORING · ${escapeHtml(sportName)} · ${guideNames[guide]}</div><h1>${guideNames[guide]}</h1><p class="lead">${escapeHtml(desc)}</p><a class="cta" href="${PLAY}">${escapeHtml(t.play)}</a><nav><a href="/${lang}/">${escapeHtml(t.home)}</a><a href="${urlPath(sportUrl)}">${escapeHtml(sportName)}</a></nav></header>${editorial}<section><h2>${escapeHtml(t.features)}</h2><ul>${descriptionsByGuide[guide].map((x)=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section><h2>${escapeHtml(t.languages)}</h2><p>${['fr','en','es'].map((code)=>`<a href="${urlPath(catalog.sports.find((s)=>s.id==='darts').routes[code])}${guide}/">${locale[code].name}</a>`).join(' · ')}</p></section><footer><strong>MULTISPORTS SCORING</strong><br>Android · Web/PWA</footer></main></body></html>`;
}

async function writeFile(file, content) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  await fs.writeFile(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH,'utf8'));
  for (const lang of Object.keys(locale)) {
    await writeFile(path.join(PUBLIC, lang, 'index.html'), homePage(catalog,lang));
  }
  for (const sport of catalog.sports) {
    for (const lang of Object.keys(locale)) {
      await writeFile(localFileFromUrl(sport.routes[lang]), sportPage(catalog,lang,sport));
    }
  }
  for (const lang of ['fr','en','es']) {
    const sport = catalog.sports.find((s)=>s.id==='darts');
    for (const guide of guides) {
      await writeFile(path.join(PUBLIC, urlPath(sport.routes[lang]).replace(/^\//,''), guide, 'index.html'), guidePage(catalog,lang,guide));
    }
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  const add = (url, priority, alternatesMap) => {
    sitemap.push('  <url>',`    <loc>${url}</loc>`,`    <lastmod>${TODAY}</lastmod>`,'    <changefreq>weekly</changefreq>',`    <priority>${priority}</priority>`);
    for (const [lang,href] of Object.entries(alternatesMap)) sitemap.push(`    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`);
    sitemap.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${alternatesMap.en || BASE+'/'}" />`,'  </url>');
  };
  const indexableLangs = Object.keys(locale).filter((lang) => INDEXABLE_LANGS.has(lang));
  const homeMap = Object.fromEntries(indexableLangs.map((lang)=>[lang,`${BASE}/${lang}/`]));
  const textUrls = [];
  for (const lang of indexableLangs) {
    const pageUrl = `${BASE}/${lang}/`;
    add(pageUrl,'0.9',homeMap);
    textUrls.push(pageUrl);
  }
  for (const sport of catalog.sports) {
    const map = Object.fromEntries(indexableLangs.map((lang)=>[lang,sport.routes[lang]]));
    for (const lang of indexableLangs) {
      add(sport.routes[lang],['darts','running','fit'].includes(sport.id)?'0.9':'0.8',map);
      textUrls.push(sport.routes[lang]);
    }
  }
  const darts = catalog.sports.find((s)=>s.id==='darts');
  for (const guide of guides) {
    const map = Object.fromEntries(indexableLangs.map((lang)=>[lang,`${darts.routes[lang]}${guide}/`]));
    for (const lang of indexableLangs) {
      add(map[lang],'0.8',map);
      textUrls.push(map[lang]);
    }
  }
  sitemap.push('</urlset>');
  await writeFile(SITEMAP_PATH,sitemap.join('\n'));
  await writeFile(TEXT_SITEMAP_PATH,textUrls.join('\n'));
  console.log(`SEO pages generated: ${Object.keys(locale).length} languages served, ${indexableLangs.length} curated language(s) indexed, ${catalog.sports.length} sports, ${guides.length} Darts guides.`);
}

main().catch((error)=>{console.error(error);process.exit(1);});
