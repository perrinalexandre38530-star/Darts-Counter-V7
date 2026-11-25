// ============================================
// src/i18n/index.ts
// Index i18n — importe toutes les langues
// ============================================

import type { Dict } from "../contexts/LangContext";

import { fr } from "./fr";
import { en } from "./en";
import { es } from "./es";
import { de } from "./de";
import { it } from "./it";
import { pt } from "./pt";
import { nl } from "./nl";
import { ru } from "./ru";
import { zh } from "./zh";
import { ja } from "./ja";
import { ar } from "./ar";
import { hi } from "./hi";
import { tr } from "./tr";
import { da } from "./da";
import { no } from "./no";
import { sv } from "./sv";
import { is } from "./is";
import { pl } from "./pl";
import { ro } from "./ro";
import { sr } from "./sr";
import { hr } from "./hr";
import { cs } from "./cs";
import { frAuto, enAuto, esAuto } from "./auto";
import { frExtras, enExtras, esExtras } from "./extras";
import { CORE_UI_OVERRIDES } from "./coreUiOverrides";

// Mapping global utilisable par LangContext
export const DICT: Record<string, Dict> = {
  fr: { ...fr, ...frAuto, ...frExtras, ...(CORE_UI_OVERRIDES.fr || {}) },
  en: { ...en, ...enAuto, ...enExtras, ...(CORE_UI_OVERRIDES.en || {}) },
  es: { ...es, ...esAuto, ...esExtras, ...(CORE_UI_OVERRIDES.es || {}) },
  de: { ...de, ...(CORE_UI_OVERRIDES.de || {}) },
  it: { ...it, ...(CORE_UI_OVERRIDES.it || {}) },
  pt: { ...pt, ...(CORE_UI_OVERRIDES.pt || {}) },
  nl: { ...nl, ...(CORE_UI_OVERRIDES.nl || {}) },
  ru: { ...ru, ...(CORE_UI_OVERRIDES.ru || {}) },
  zh: { ...zh, ...(CORE_UI_OVERRIDES.zh || {}) },
  ja: { ...ja, ...(CORE_UI_OVERRIDES.ja || {}) },
  ar: { ...ar, ...(CORE_UI_OVERRIDES.ar || {}) },
  hi: { ...hi, ...(CORE_UI_OVERRIDES.hi || {}) },
  tr: { ...tr, ...(CORE_UI_OVERRIDES.tr || {}) },
  da: { ...da, ...(CORE_UI_OVERRIDES.da || {}) },
  no: { ...no, ...(CORE_UI_OVERRIDES.no || {}) },
  sv: { ...sv, ...(CORE_UI_OVERRIDES.sv || {}) },
  is: { ...is, ...(CORE_UI_OVERRIDES.is || {}) },
  pl: { ...pl, ...(CORE_UI_OVERRIDES.pl || {}) },
  ro: { ...ro, ...(CORE_UI_OVERRIDES.ro || {}) },
  sr: { ...sr, ...(CORE_UI_OVERRIDES.sr || {}) },
  hr: { ...hr, ...(CORE_UI_OVERRIDES.hr || {}) },
  cs: { ...cs, ...(CORE_UI_OVERRIDES.cs || {}) },
};

// Training hub category labels, kept in the shared dictionary.
const trainingHubCopy: Record<string, string[]> = {
  "fr": [
    "Entraînements libres",
    "Pratique à ton rythme",
    "Retrouve tous les entraînements libres.",
    "Défis • Records • Classements",
    "Le même catalogue de défis que dans Jeux."
  ],
  "en": [
    "Free training",
    "Practice at your own pace",
    "Find all free training modes.",
    "Challenges • Records • Rankings",
    "The same challenge catalogue as in Games."
  ],
  "es": [
    "Entrenamiento libre",
    "Practica a tu ritmo",
    "Todos los entrenamientos libres.",
    "Desafíos • Récords • Clasificaciones",
    "El mismo catálogo de desafíos que en Juegos."
  ],
  "de": [
    "Freies Training",
    "Trainiere in deinem Tempo",
    "Alle freien Trainingsmodi.",
    "Herausforderungen • Rekorde • Ranglisten",
    "Derselbe Herausforderungskatalog wie in Spiele."
  ],
  "it": [
    "Allenamento libero",
    "Allenati al tuo ritmo",
    "Tutti gli allenamenti liberi.",
    "Sfide • Record • Classifiche",
    "Lo stesso catalogo di sfide dei Giochi."
  ],
  "pt": [
    "Treino livre",
    "Treina ao teu ritmo",
    "Todos os treinos livres.",
    "Desafios • Recordes • Classificações",
    "O mesmo catálogo de desafios dos Jogos."
  ],
  "nl": [
    "Vrij trainen",
    "Train op je eigen tempo",
    "Alle vrije trainingen.",
    "Uitdagingen • Records • Ranglijsten",
    "Dezelfde uitdagingen als in Games."
  ],
  "ru": [
    "Свободная тренировка",
    "Тренируйтесь в своём темпе",
    "Все свободные тренировки.",
    "Испытания • Рекорды • Рейтинги",
    "Тот же каталог испытаний, что и в играх."
  ],
  "zh": [
    "自由训练",
    "按自己的节奏练习",
    "所有自由训练模式。",
    "挑战 • 纪录 • 排行榜",
    "与游戏菜单相同的挑战目录。"
  ],
  "ja": [
    "自由練習",
    "自分のペースで練習",
    "すべての自由練習モード。",
    "チャレンジ • 記録 • ランキング",
    "ゲームと同じチャレンジ一覧。"
  ],
  "ar": [
    "تدريب حر",
    "تدرّب بالوتيرة التي تناسبك",
    "جميع أوضاع التدريب الحر.",
    "تحديات • أرقام قياسية • تصنيفات",
    "نفس قائمة التحديات في الألعاب."
  ],
  "hi": [
    "मुक्त अभ्यास",
    "अपनी गति से अभ्यास करें",
    "सभी मुक्त अभ्यास मोड।",
    "चुनौतियाँ • रिकॉर्ड • रैंकिंग",
    "खेलों वाली ही चुनौती सूची।"
  ],
  "tr": [
    "Serbest antrenman",
    "Kendi hızında çalış",
    "Tüm serbest antrenmanlar.",
    "Mücadeleler • Rekorlar • Sıralamalar",
    "Oyunlardaki aynı mücadele kataloğu."
  ],
  "da": [
    "Fri træning",
    "Træn i dit eget tempo",
    "Alle frie træningsformer.",
    "Udfordringer • Rekorder • Ranglister",
    "Samme udfordringer som i Spil."
  ],
  "no": [
    "Fri trening",
    "Tren i ditt eget tempo",
    "Alle frie treningsmoduser.",
    "Utfordringer • Rekorder • Rangeringer",
    "Samme utfordringer som i Spill."
  ],
  "sv": [
    "Fri träning",
    "Träna i din egen takt",
    "Alla fria träningslägen.",
    "Utmaningar • Rekord • Rankningar",
    "Samma utmaningar som i Spel."
  ],
  "is": [
    "Frjáls þjálfun",
    "Æfðu á þínum hraða",
    "Allar frjálsar æfingar.",
    "Áskoranir • Met • Stigalistar",
    "Sömu áskoranir og í leikjum."
  ],
  "pl": [
    "Trening dowolny",
    "Ćwicz we własnym tempie",
    "Wszystkie tryby treningu dowolnego.",
    "Wyzwania • Rekordy • Rankingi",
    "Ten sam katalog wyzwań co w grach."
  ],
  "ro": [
    "Antrenament liber",
    "Exersează în ritmul tău",
    "Toate modurile de antrenament liber.",
    "Provocări • Recorduri • Clasamente",
    "Același catalog de provocări ca în Jocuri."
  ],
  "sr": [
    "Slobodan trening",
    "Vežbaj svojim tempom",
    "Svi slobodni treninzi.",
    "Izazovi • Rekordi • Rang-liste",
    "Isti katalog izazova kao u igrama."
  ],
  "hr": [
    "Slobodni trening",
    "Vježbaj svojim tempom",
    "Svi slobodni treninzi.",
    "Izazovi • Rekordi • Ljestvice",
    "Isti katalog izazova kao u igrama."
  ],
  "cs": [
    "Volný trénink",
    "Trénuj vlastním tempem",
    "Všechny režimy volného tréninku.",
    "Výzvy • Rekordy • Žebříčky",
    "Stejný katalog výzev jako ve hrách."
  ]
};
for (const [language, copy] of Object.entries(trainingHubCopy)) {
  Object.assign(DICT[language], {
    "training.menu.free.title": copy[0],
    "training.menu.free.subtitle": copy[1],
    "training.menu.free.info": copy[2],
    "training.menu.sharedChallenge.title": "CHALLENGE",
    "training.menu.sharedChallenge.subtitle": copy[3],
    "training.menu.sharedChallenge.info": copy[4],
  });
}
