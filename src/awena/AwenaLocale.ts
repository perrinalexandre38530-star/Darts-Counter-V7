import type { Lang } from "../contexts/LangContext";

type UiStrings = {
  rules: string;
  configuration: string;
  records: string;
  thisScreen: string;
  navigation: string;
  whatDoYouKnow: string;
  advice: string;
  whatToAim: string;
  placeholder: string;
  voicePreparing: string;
  ready: string;
  stopVoice: string;
  listen: string;
  intro: string;
  assistantDescriptor: string;
  automaticTranslation: string;
  openAwena: string;
  tutorial: string;
  prerequisites: string;
  troubleshoot: string;
};

const FR: UiStrings = {
  rules: "Règles",
  configuration: "Configuration",
  records: "Records",
  thisScreen: "Cet écran",
  navigation: "Navigation",
  whatDoYouKnow: "Que sais-tu ?",
  advice: "Conseil",
  whatToAim: "Que viser ?",
  placeholder: "Pose une question à Awena…",
  voicePreparing: "Voix en préparation…",
  ready: "Je suis prête.",
  stopVoice: "Arrêter Awena et afficher toute la réponse",
  listen: "Écouter Awena",
  intro: "Bonjour, moi c'est Awena. Je peux t'expliquer les modes de jeu, te guider dans l'application et t'aider pendant tes parties.",
  assistantDescriptor: "ASSISTANTE MULTISPORTS SCORING · LOCAL V9.3.1 · MODE MULTILINGUE",
  automaticTranslation: "Traduction automatique · sur appareil",
  openAwena: "Ouvrir Awena",
  tutorial: "Tutoriel pas à pas",
  prerequisites: "Prérequis",
  troubleshoot: "Diagnostic",
};

const UI: Partial<Record<Lang, Partial<UiStrings>>> = {
  en: { rules: "Rules", configuration: "Configuration", records: "Records", thisScreen: "This screen", navigation: "Navigation", whatDoYouKnow: "What do you know?", advice: "Advice", whatToAim: "What to aim at?", placeholder: "Ask Awena a question…", voicePreparing: "Preparing voice…", ready: "I'm ready.", stopVoice: "Stop Awena and show the full answer", listen: "Listen to Awena" },
  es: { rules: "Reglas", configuration: "Configuración", records: "Récords", thisScreen: "Esta pantalla", navigation: "Navegación", whatDoYouKnow: "¿Qué sabes?", advice: "Consejo", whatToAim: "¿A qué apuntar?", placeholder: "Haz una pregunta a Awena…", voicePreparing: "Preparando voz…", ready: "Estoy lista.", stopVoice: "Detener a Awena y mostrar toda la respuesta", listen: "Escuchar a Awena" },
  de: { rules: "Regeln", configuration: "Konfiguration", records: "Rekorde", thisScreen: "Dieser Bildschirm", navigation: "Navigation", whatDoYouKnow: "Was weißt du?", advice: "Tipp", whatToAim: "Worauf zielen?", placeholder: "Stelle Awena eine Frage…", voicePreparing: "Stimme wird vorbereitet…", ready: "Ich bin bereit.", stopVoice: "Awena stoppen und die ganze Antwort anzeigen", listen: "Awena anhören" },
  it: { rules: "Regole", configuration: "Configurazione", records: "Record", thisScreen: "Questa schermata", navigation: "Navigazione", whatDoYouKnow: "Cosa sai?", advice: "Consiglio", whatToAim: "Dove mirare?", placeholder: "Fai una domanda ad Awena…", voicePreparing: "Preparazione della voce…", ready: "Sono pronta.", stopVoice: "Ferma Awena e mostra tutta la risposta", listen: "Ascolta Awena" },
  pt: { rules: "Regras", configuration: "Configuração", records: "Recordes", thisScreen: "Este ecrã", navigation: "Navegação", whatDoYouKnow: "O que sabes?", advice: "Conselho", whatToAim: "Onde apontar?", placeholder: "Faz uma pergunta à Awena…", voicePreparing: "A preparar a voz…", ready: "Estou pronta.", stopVoice: "Parar Awena e mostrar a resposta completa", listen: "Ouvir Awena" },
  nl: { rules: "Regels", configuration: "Configuratie", records: "Records", thisScreen: "Dit scherm", navigation: "Navigatie", whatDoYouKnow: "Wat weet je?", advice: "Advies", whatToAim: "Waarop mikken?", placeholder: "Stel Awena een vraag…", voicePreparing: "Stem voorbereiden…", ready: "Ik ben klaar.", stopVoice: "Awena stoppen en het volledige antwoord tonen", listen: "Luister naar Awena" },
  ru: { rules: "Правила", configuration: "Настройка", records: "Рекорды", thisScreen: "Этот экран", navigation: "Навигация", whatDoYouKnow: "Что ты знаешь?", advice: "Совет", whatToAim: "Куда целиться?", placeholder: "Задайте вопрос Awena…", voicePreparing: "Подготовка голоса…", ready: "Я готова.", stopVoice: "Остановить Awena и показать весь ответ", listen: "Слушать Awena" },
  zh: { rules: "规则", configuration: "配置", records: "纪录", thisScreen: "当前页面", navigation: "导航", whatDoYouKnow: "你知道什么？", advice: "建议", whatToAim: "瞄准哪里？", placeholder: "向 Awena 提问…", voicePreparing: "正在准备语音…", ready: "我准备好了。", stopVoice: "停止 Awena 并显示完整回答", listen: "聆听 Awena" },
  ja: { rules: "ルール", configuration: "設定", records: "記録", thisScreen: "この画面", navigation: "ナビゲーション", whatDoYouKnow: "何を知ってる？", advice: "アドバイス", whatToAim: "どこを狙う？", placeholder: "Awena に質問する…", voicePreparing: "音声を準備中…", ready: "準備できました。", stopVoice: "Awena を停止して回答全文を表示", listen: "Awena を聴く" },
  ar: { rules: "القواعد", configuration: "الإعداد", records: "الأرقام القياسية", thisScreen: "هذه الشاشة", navigation: "التنقل", whatDoYouKnow: "ماذا تعرفين؟", advice: "نصيحة", whatToAim: "إلى ماذا أصوّب؟", placeholder: "اسأل Awena سؤالاً…", voicePreparing: "جارٍ تجهيز الصوت…", ready: "أنا جاهزة.", stopVoice: "إيقاف Awena وعرض الإجابة كاملة", listen: "استمع إلى Awena" },
  hi: { rules: "नियम", configuration: "कॉन्फ़िगरेशन", records: "रिकॉर्ड", thisScreen: "यह स्क्रीन", navigation: "नेविगेशन", whatDoYouKnow: "तुम क्या जानती हो?", advice: "सलाह", whatToAim: "कहाँ निशाना लगाएँ?", placeholder: "Awena से सवाल पूछें…", voicePreparing: "आवाज़ तैयार हो रही है…", ready: "मैं तैयार हूँ।", stopVoice: "Awena को रोकें और पूरा उत्तर दिखाएँ", listen: "Awena को सुनें" },
  tr: { rules: "Kurallar", configuration: "Yapılandırma", records: "Rekorlar", thisScreen: "Bu ekran", navigation: "Gezinme", whatDoYouKnow: "Neler biliyorsun?", advice: "Tavsiye", whatToAim: "Nereye nişan almalı?", placeholder: "Awena'ya bir soru sor…", voicePreparing: "Ses hazırlanıyor…", ready: "Hazırım.", stopVoice: "Awena'yı durdur ve yanıtın tamamını göster", listen: "Awena'yı dinle" },
  da: { rules: "Regler", configuration: "Konfiguration", records: "Rekorder", thisScreen: "Denne skærm", navigation: "Navigation", whatDoYouKnow: "Hvad ved du?", advice: "Råd", whatToAim: "Hvor skal jeg sigte?", placeholder: "Stil Awena et spørgsmål…", voicePreparing: "Forbereder stemme…", ready: "Jeg er klar.", stopVoice: "Stop Awena og vis hele svaret", listen: "Lyt til Awena" },
  no: { rules: "Regler", configuration: "Konfigurasjon", records: "Rekorder", thisScreen: "Denne skjermen", navigation: "Navigasjon", whatDoYouKnow: "Hva vet du?", advice: "Råd", whatToAim: "Hvor skal jeg sikte?", placeholder: "Still Awena et spørsmål…", voicePreparing: "Forbereder stemmen…", ready: "Jeg er klar.", stopVoice: "Stopp Awena og vis hele svaret", listen: "Lytt til Awena" },
  sv: { rules: "Regler", configuration: "Konfiguration", records: "Rekord", thisScreen: "Den här skärmen", navigation: "Navigering", whatDoYouKnow: "Vad vet du?", advice: "Råd", whatToAim: "Var ska jag sikta?", placeholder: "Ställ en fråga till Awena…", voicePreparing: "Förbereder röst…", ready: "Jag är redo.", stopVoice: "Stoppa Awena och visa hela svaret", listen: "Lyssna på Awena" },
  is: { rules: "Reglur", configuration: "Stillingar", records: "Met", thisScreen: "Þessi skjár", navigation: "Leiðsögn", whatDoYouKnow: "Hvað veistu?", advice: "Ráð", whatToAim: "Hvert á að miða?", placeholder: "Spyrðu Awena…", voicePreparing: "Undirbý rödd…", ready: "Ég er tilbúin.", stopVoice: "Stöðva Awena og sýna allt svarið", listen: "Hlusta á Awena" },
  pl: { rules: "Zasady", configuration: "Konfiguracja", records: "Rekordy", thisScreen: "Ten ekran", navigation: "Nawigacja", whatDoYouKnow: "Co wiesz?", advice: "Porada", whatToAim: "Gdzie celować?", placeholder: "Zadaj Awena pytanie…", voicePreparing: "Przygotowywanie głosu…", ready: "Jestem gotowa.", stopVoice: "Zatrzymaj Awena i pokaż całą odpowiedź", listen: "Posłuchaj Awena" },
  ro: { rules: "Reguli", configuration: "Configurare", records: "Recorduri", thisScreen: "Acest ecran", navigation: "Navigare", whatDoYouKnow: "Ce știi?", advice: "Sfat", whatToAim: "Unde să țintesc?", placeholder: "Pune-i o întrebare lui Awena…", voicePreparing: "Se pregătește vocea…", ready: "Sunt gata.", stopVoice: "Oprește Awena și afișează răspunsul complet", listen: "Ascultă Awena" },
  sr: { rules: "Правила", configuration: "Подешавање", records: "Рекорди", thisScreen: "Овај екран", navigation: "Навигација", whatDoYouKnow: "Шта знаш?", advice: "Савет", whatToAim: "Где да гађам?", placeholder: "Питај Awena…", voicePreparing: "Припрема гласа…", ready: "Спремна сам.", stopVoice: "Заустави Awena и прикажи цео одговор", listen: "Слушај Awena" },
  hr: { rules: "Pravila", configuration: "Postavke", records: "Rekordi", thisScreen: "Ovaj zaslon", navigation: "Navigacija", whatDoYouKnow: "Što znaš?", advice: "Savjet", whatToAim: "Gdje ciljati?", placeholder: "Pitaj Awena…", voicePreparing: "Priprema glasa…", ready: "Spremna sam.", stopVoice: "Zaustavi Awena i prikaži cijeli odgovor", listen: "Slušaj Awena" },
  cs: { rules: "Pravidla", configuration: "Konfigurace", records: "Rekordy", thisScreen: "Tato obrazovka", navigation: "Navigace", whatDoYouKnow: "Co víš?", advice: "Rada", whatToAim: "Kam mířit?", placeholder: "Zeptej se Awena…", voicePreparing: "Připravuji hlas…", ready: "Jsem připravená.", stopVoice: "Zastavit Awena a zobrazit celou odpověď", listen: "Poslechnout Awena" },
};


type AwenaExtraUi = Pick<UiStrings,
  "intro" | "assistantDescriptor" | "automaticTranslation" | "openAwena" | "tutorial" | "prerequisites" | "troubleshoot"
>;

const EXTRA_UI: Partial<Record<Lang, AwenaExtraUi>> = {
  en: {
    intro: "Hi, I'm Awena. I can explain the game modes, guide you through the app and help you during matches.",
    assistantDescriptor: "MULTISPORTS SCORING ASSISTANT · LOCAL V9.3.1 · MULTILINGUAL MODE",
    automaticTranslation: "Automatic translation · on device", openAwena: "Open Awena", tutorial: "Step-by-step", prerequisites: "Prerequisites", troubleshoot: "Troubleshoot",
  },
  es: {
    intro: "Hola, soy Awena. Puedo explicarte los modos de juego, guiarte por la aplicación y ayudarte durante tus partidas.",
    assistantDescriptor: "ASISTENTE MULTISPORTS SCORING · LOCAL V9.3.1 · MODO MULTILINGÜE",
    automaticTranslation: "Traducción automática · en el dispositivo", openAwena: "Abrir Awena", tutorial: "Tutorial paso a paso", prerequisites: "Requisitos previos", troubleshoot: "Diagnóstico",
  },
  de: {
    intro: "Hallo, ich bin Awena. Ich kann dir die Spielmodi erklären, dich durch die App führen und dir während deiner Partien helfen.",
    assistantDescriptor: "MULTISPORTS-SCORING-ASSISTENTIN · LOCAL V9.3.1 · MEHRSPRACHIGER MODUS",
    automaticTranslation: "Automatische Übersetzung · auf dem Gerät", openAwena: "Awena öffnen", tutorial: "Schritt für Schritt", prerequisites: "Voraussetzungen", troubleshoot: "Fehlersuche",
  },
  it: {
    intro: "Ciao, sono Awena. Posso spiegarti le modalità di gioco, guidarti nell'app e aiutarti durante le partite.",
    assistantDescriptor: "ASSISTENTE MULTISPORTS SCORING · LOCAL V9.3.1 · MODALITÀ MULTILINGUE",
    automaticTranslation: "Traduzione automatica · sul dispositivo", openAwena: "Apri Awena", tutorial: "Passo dopo passo", prerequisites: "Prerequisiti", troubleshoot: "Diagnostica",
  },
  pt: {
    intro: "Olá, sou a Awena. Posso explicar os modos de jogo, orientar-te na aplicação e ajudar-te durante as partidas.",
    assistantDescriptor: "ASSISTENTE MULTISPORTS SCORING · LOCAL V9.3.1 · MODO MULTILINGUE",
    automaticTranslation: "Tradução automática · no dispositivo", openAwena: "Abrir Awena", tutorial: "Passo a passo", prerequisites: "Pré-requisitos", troubleshoot: "Diagnóstico",
  },
  nl: {
    intro: "Hallo, ik ben Awena. Ik kan de spelmodi uitleggen, je door de app begeleiden en je tijdens wedstrijden helpen.",
    assistantDescriptor: "MULTISPORTS SCORING-ASSISTENT · LOCAL V9.3.1 · MEERTALIGE MODUS",
    automaticTranslation: "Automatische vertaling · op het apparaat", openAwena: "Awena openen", tutorial: "Stap voor stap", prerequisites: "Vereisten", troubleshoot: "Probleemoplossing",
  },
  ru: {
    intro: "Привет, я Awena. Я могу объяснить игровые режимы, помочь ориентироваться в приложении и сопровождать тебя во время матчей.",
    assistantDescriptor: "АССИСТЕНТ MULTISPORTS SCORING · LOCAL V9.3.1 · МНОГОЯЗЫЧНЫЙ РЕЖИМ",
    automaticTranslation: "Автоматический перевод · на устройстве", openAwena: "Открыть Awena", tutorial: "Пошагово", prerequisites: "Требования", troubleshoot: "Диагностика",
  },
  zh: {
    intro: "你好，我是 Awena。我可以讲解游戏模式、引导你使用应用，并在比赛过程中帮助你。",
    assistantDescriptor: "MULTISPORTS SCORING 助手 · LOCAL V9.3.1 · 多语言模式",
    automaticTranslation: "自动翻译 · 设备端", openAwena: "打开 Awena", tutorial: "分步教程", prerequisites: "准备事项", troubleshoot: "故障排查",
  },
  ja: {
    intro: "こんにちは、Awenaです。ゲームモードの説明、アプリ内の案内、試合中のサポートができます。",
    assistantDescriptor: "MULTISPORTS SCORING アシスタント · LOCAL V9.3.1 · 多言語モード",
    automaticTranslation: "自動翻訳 · 端末上", openAwena: "Awenaを開く", tutorial: "ステップごと", prerequisites: "事前準備", troubleshoot: "トラブル診断",
  },
  ar: {
    intro: "مرحبًا، أنا Awena. يمكنني شرح أوضاع اللعب وإرشادك داخل التطبيق ومساعدتك أثناء المباريات.",
    assistantDescriptor: "مساعدة MULTISPORTS SCORING · LOCAL V9.3.1 · وضع متعدد اللغات",
    automaticTranslation: "ترجمة تلقائية · على الجهاز", openAwena: "فتح Awena", tutorial: "خطوة بخطوة", prerequisites: "المتطلبات", troubleshoot: "التشخيص",
  },
  hi: {
    intro: "नमस्ते, मैं Awena हूँ। मैं गेम मोड समझा सकती हूँ, ऐप में आपका मार्गदर्शन कर सकती हूँ और मैच के दौरान आपकी मदद कर सकती हूँ।",
    assistantDescriptor: "MULTISPORTS SCORING सहायक · LOCAL V9.3.1 · बहुभाषी मोड",
    automaticTranslation: "स्वचालित अनुवाद · डिवाइस पर", openAwena: "Awena खोलें", tutorial: "चरण-दर-चरण", prerequisites: "पूर्व आवश्यकताएँ", troubleshoot: "समस्या निदान",
  },
  tr: {
    intro: "Merhaba, ben Awena. Oyun modlarını açıklayabilir, uygulamada sana rehberlik edebilir ve maçlar sırasında yardımcı olabilirim.",
    assistantDescriptor: "MULTISPORTS SCORING ASİSTANI · LOCAL V9.3.1 · ÇOK DİLLİ MOD",
    automaticTranslation: "Otomatik çeviri · cihazda", openAwena: "Awena'yı aç", tutorial: "Adım adım", prerequisites: "Ön koşullar", troubleshoot: "Sorun giderme",
  },
  da: {
    intro: "Hej, jeg er Awena. Jeg kan forklare spiltilstandene, guide dig gennem appen og hjælpe dig under kampene.",
    assistantDescriptor: "MULTISPORTS SCORING-ASSISTENT · LOCAL V9.3.1 · FLERSPROGET TILSTAND",
    automaticTranslation: "Automatisk oversættelse · på enheden", openAwena: "Åbn Awena", tutorial: "Trin for trin", prerequisites: "Forudsætninger", troubleshoot: "Fejlfinding",
  },
  no: {
    intro: "Hei, jeg er Awena. Jeg kan forklare spillmodusene, veilede deg i appen og hjelpe deg under kampene.",
    assistantDescriptor: "MULTISPORTS SCORING-ASSISTENT · LOCAL V9.3.1 · FLERSPRÅKLIG MODUS",
    automaticTranslation: "Automatisk oversettelse · på enheten", openAwena: "Åpne Awena", tutorial: "Trinn for trinn", prerequisites: "Forutsetninger", troubleshoot: "Feilsøking",
  },
  sv: {
    intro: "Hej, jag är Awena. Jag kan förklara spellägena, guida dig i appen och hjälpa dig under matcherna.",
    assistantDescriptor: "MULTISPORTS SCORING-ASSISTENT · LOCAL V9.3.1 · FLERSPRÅKIGT LÄGE",
    automaticTranslation: "Automatisk översättning · på enheten", openAwena: "Öppna Awena", tutorial: "Steg för steg", prerequisites: "Förutsättningar", troubleshoot: "Felsökning",
  },
  is: {
    intro: "Halló, ég er Awena. Ég get útskýrt leikjahamina, leiðbeint þér í appinu og hjálpað þér meðan á leikjum stendur.",
    assistantDescriptor: "MULTISPORTS SCORING-AÐSTOÐ · LOCAL V9.3.1 · FJÖLTUNGUMÁLASTILLING",
    automaticTranslation: "Sjálfvirk þýðing · í tækinu", openAwena: "Opna Awena", tutorial: "Skref fyrir skref", prerequisites: "Forsendur", troubleshoot: "Bilanagreining",
  },
  pl: {
    intro: "Cześć, jestem Awena. Mogę wyjaśnić tryby gry, poprowadzić cię po aplikacji i pomagać podczas meczów.",
    assistantDescriptor: "ASYSTENTKA MULTISPORTS SCORING · LOCAL V9.3.1 · TRYB WIELOJĘZYCZNY",
    automaticTranslation: "Automatyczne tłumaczenie · na urządzeniu", openAwena: "Otwórz Awena", tutorial: "Krok po kroku", prerequisites: "Wymagania", troubleshoot: "Diagnostyka",
  },
  ro: {
    intro: "Salut, sunt Awena. Pot explica modurile de joc, te pot ghida prin aplicație și te pot ajuta în timpul meciurilor.",
    assistantDescriptor: "ASISTENT MULTISPORTS SCORING · LOCAL V9.3.1 · MOD MULTILINGV",
    automaticTranslation: "Traducere automată · pe dispozitiv", openAwena: "Deschide Awena", tutorial: "Pas cu pas", prerequisites: "Cerințe", troubleshoot: "Diagnostic",
  },
  sr: {
    intro: "Здраво, ја сам Awena. Могу да објасним режиме игре, водим те кроз апликацију и помажем током мечева.",
    assistantDescriptor: "MULTISPORTS SCORING АСИСТЕНТ · LOCAL V9.3.1 · ВИШЕЈЕЗИЧНИ РЕЖИМ",
    automaticTranslation: "Аутоматски превод · на уређају", openAwena: "Отвори Awena", tutorial: "Корак по корак", prerequisites: "Предуслови", troubleshoot: "Дијагностика",
  },
  hr: {
    intro: "Bok, ja sam Awena. Mogu objasniti načine igre, voditi te kroz aplikaciju i pomagati tijekom mečeva.",
    assistantDescriptor: "MULTISPORTS SCORING ASISTENT · LOCAL V9.3.1 · VIŠEJEZIČNI NAČIN",
    automaticTranslation: "Automatski prijevod · na uređaju", openAwena: "Otvori Awena", tutorial: "Korak po korak", prerequisites: "Preduvjeti", troubleshoot: "Dijagnostika",
  },
  cs: {
    intro: "Ahoj, jsem Awena. Mohu vysvětlit herní režimy, provést tě aplikací a pomáhat ti během zápasů.",
    assistantDescriptor: "ASISTENTKA MULTISPORTS SCORING · LOCAL V9.3.1 · VÍCEJAZYČNÝ REŽIM",
    automaticTranslation: "Automatický překlad · v zařízení", openAwena: "Otevřít Awena", tutorial: "Krok za krokem", prerequisites: "Předpoklady", troubleshoot: "Diagnostika",
  },
};

export function awenaUi(lang: Lang | string | undefined): UiStrings {
  const code = String(lang || "fr").toLowerCase().split("-")[0] as Lang;
  return { ...FR, ...(UI[code] || {}), ...(EXTRA_UI[code] || {}) };
}
