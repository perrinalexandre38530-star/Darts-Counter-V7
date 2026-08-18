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

export function awenaUi(lang: Lang | string | undefined): UiStrings {
  const code = String(lang || "fr").toLowerCase().split("-")[0] as Lang;
  return { ...FR, ...(UI[code] || {}) };
}
