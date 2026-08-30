import {
  NAVIGATION_MUSIC_TRACKS,
  type NavigationMusicTrackId,
} from "../lib/navigationMusicCatalog";

export type AwenaMusicIntent =
  | { kind: "play"; trackId: NavigationMusicTrackId; trackName: string; confidence: number }
  | { kind: "list" }
  | { kind: "missing-title" }
  | { kind: "unavailable"; requestedTitle: string | null }
  | { kind: "none" };

function normalize(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’'“”«»„‟`´]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLAY_WORDS = [
  // FR / EN / ES / DE / IT / PT / NL
  "lance", "lancer", "joue", "jouer", "mets", "mettre", "demarre", "demarrer", "passe",
  "play", "start", "launch", "put on",
  "pon", "poner", "reproduce", "reproducir", "toca", "tocar", "lanza",
  "spiele", "spielen", "starte", "abspielen",
  "riproduci", "suona", "avvia", "metti",
  "toca", "reproduz", "reproduzir", "inicia",
  "speel", "afspelen", "start",
  // PL / RO / HR / SR / CS / TR / Scandinavian / Icelandic
  "odtworz", "odtworz", "zagraj", "uruchom",
  "reda", "porneste", "ruleaza",
  "pusti", "pokreni", "reproduciraj",
  "пусти", "покрени", "репродукуј",
  "prehraj", "spust", "spustit",
  "cal", "oynat", "baslat", "baslat",
  "spela", "starta", "spill", "spil", "afspil", "spille", "spila", "spilaðu",
  // RU / UA-like / scripts supported by Awena
  "включи", "запусти", "проиграй", "сыграй",
  // Chinese / Japanese / Arabic / Hindi
  "播放", "放", "开始播放", "再生", "かけて", "流して", "شغل", "شغلي", "ابدأ", "चलाओ", "बजाओ", "शुरू",
];

const MUSIC_WORDS = [
  "musique", "musiques", "morceau", "morceaux", "chanson", "chansons", "titre", "titres", "piste", "pistes", "son", "sons",
  "music", "song", "songs", "track", "tracks", "title", "playlist",
  "musica", "cancion", "canciones", "tema", "temas", "pista", "pistas",
  "musik", "lied", "lieder", "titel",
  "musica", "brano", "brani", "canzone", "canzoni",
  "muziek", "nummer", "nummers",
  "muzyka", "utwor", "utwory", "piosenka", "piosenki",
  "muzica", "melodie", "melodii",
  "glazba", "pjesma", "pjesme", "pesma", "pesme", "музика", "песма", "песме",
  "hudba", "skladba", "skladby", "muzik", "sarki", "sarkilar", "şarkı", "şarkılar",
  "musik", "lat", "låt", "latar", "låtar", "sang", "sange", "sanger", "lag", "log", "lög", "tonlist", "tónlist",
  "музыка", "песня", "песни", "трек", "треки",
  "音乐", "歌曲", "曲目", "音楽", "曲", "歌", "موسيقى", "اغنية", "أغنية", "أغاني", "संगीत", "गाना", "गाने",
];

const LIST_WORDS = [
  "liste", "listes", "disponible", "disponibles", "quels", "quelles", "connais", "catalogue", "bibliotheque", "choix",
  "list", "available", "what songs", "which songs", "catalog", "library",
  "lista", "disponibles", "cuales", "catalogo", "biblioteca",
  "liste", "verfugbar", "welche", "katalog", "bibliothek",
  "elenco", "disponibili", "quali", "catalogo",
  "lista", "disponiveis", "quais", "catalogo",
  "lijst", "beschikbaar", "welke",
  "lista", "dostepne", "jakie", "katalog",
  "lista", "disponibile", "care",
  "popis", "dostupne", "koje", "списак", "доступне", "које",
  "seznam", "dostupne", "ktere",
  "liste", "mevcut", "hangi",
  "lista", "tillgangliga", "tillgängliga", "vilka", "tilgaengelige", "tilgængelige", "hvilke", "tilgjengelige", "hvaða",
  "список", "доступные", "какие",
  "列表", "可用", "哪些", "一覧", "利用可能", "どの", "قائمة", "متاحة", "ما هي", "सूची", "उपलब्ध", "कौन",
];

const EXTERNAL_WORDS = [
  "telephone", "tel", "mobile", "appareil", "dossier", "fichier", "fichiers", "mp3", "spotify", "deezer", "youtube", "apple music", "externe", "local",
  "phone", "device", "folder", "file", "files", "external",
  "telefono", "dispositivo", "carpeta", "archivo", "externa",
  "telefon", "gerat", "ordner", "datei", "extern",
  "telefono", "dispositivo", "cartella", "file", "esterna",
  "telemovel", "dispositivo", "pasta", "ficheiro", "externa",
  "telefoon", "apparaat", "map", "bestand", "extern",
  "telefon", "urzadzenie", "folder", "plik", "zewnetrzna",
  "telefon", "dispozitiv", "folder", "fisier", "externa",
  "mobitel", "uredaj", "mapa", "datoteka", "vanjska",
  "телефон", "уређај", "фолдер", "датотека", "спољна",
  "telefon", "zarizeni", "slozka", "soubor", "externi",
  "telefon", "cihaz", "klasor", "dosya", "harici",
  "手机", "设备", "文件夹", "文件", "外部", "端末", "フォルダ", "ファイル", "外部", "هاتف", "جهاز", "مجلد", "ملف", "خارجي", "फोन", "डिवाइस", "फ़ोल्डर", "फाइल", "बाहरी",
];

function includesPhrase(normalizedText: string, phrase: string) {
  const needle = normalize(phrase);
  if (!needle) return false;
  if (/[^a-z0-9 ]/i.test(needle)) return normalizedText.includes(needle);
  return ` ${normalizedText} `.includes(` ${needle} `) || normalizedText.includes(needle);
}

function hasAny(text: string, phrases: readonly string[]) {
  return phrases.some((phrase) => includesPhrase(text, phrase));
}

function levenshtein(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x) return y.length;
  if (!y) return x.length;
  const prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j += 1) {
      const old = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return prev[y.length];
}

function similarity(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  const denom = Math.max(x.length, y.length, 1);
  return 1 - levenshtein(x, y) / denom;
}

function stripGenericWords(text: string) {
  let out = ` ${normalize(text)} `;
  const generic = [
    "awena", "avena", ...PLAY_WORDS, ...MUSIC_WORDS,
    "s il te plait", "please", "por favor", "bitte", "per favore",
    "un", "une", "le", "la", "les", "du", "de", "des", "mon", "ma", "mes",
    "a", "an", "the", "some", "my", "from",
    "el", "la", "los", "las", "un", "una", "mi",
    "der", "die", "das", "ein", "eine", "mein", "meine",
    "il", "lo", "i", "gli", "una", "mio", "mia",
    "o", "a", "os", "as", "um", "uma", "meu", "minha",
  ];
  for (const word of generic.sort((a, b) => b.length - a.length)) {
    const normalized = normalize(word);
    if (!normalized) continue;
    out = out.replace(new RegExp(`(^|\\s)${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "g"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

function matchTrack(text: string) {
  const normalizedText = normalize(text);
  if (!normalizedText) return null;

  // Exact/contained title is the safest path and works well with quoted titles.
  const exact = [...NAVIGATION_MUSIC_TRACKS]
    .sort((a, b) => b.name.length - a.name.length)
    .find((track) => {
      const title = normalize(track.name);
      const id = normalize(track.id.replace(/_/g, " "));
      return normalizedText === title
        || normalizedText.includes(title)
        || normalizedText.includes(id);
    });
  if (exact) return { track: exact, confidence: 1 };

  const candidate = stripGenericWords(text);
  if (candidate.length < 4) return null;

  let best: { track: (typeof NAVIGATION_MUSIC_TRACKS)[number]; confidence: number } | null = null;
  let second = 0;
  for (const track of NAVIGATION_MUSIC_TRACKS) {
    const score = Math.max(
      similarity(candidate, track.name),
      similarity(candidate, track.id.replace(/_/g, " ")),
    );
    if (!best || score > best.confidence) {
      second = best?.confidence ?? 0;
      best = { track, confidence: score };
    } else if (score > second) {
      second = score;
    }
  }
  if (!best) return null;

  // Conservative fuzzy threshold: accept a small STT deformation only when the
  // best candidate is clearly better than the runner-up.
  if (best.confidence >= 0.76 && best.confidence - second >= 0.08) return best;
  return null;
}

export function parseAwenaMusicIntent(input: string): AwenaMusicIntent {
  const normalizedText = normalize(input);
  if (!normalizedText) return { kind: "none" };

  const mentionsMusic = hasAny(normalizedText, MUSIC_WORDS);
  const asksForList = hasAny(normalizedText, LIST_WORDS) && (mentionsMusic || hasAny(normalizedText, ["playlist", "catalogue", "catalog", "bibliotheque", "library"]));
  if (asksForList) return { kind: "list" };

  const wantsPlay = hasAny(normalizedText, PLAY_WORDS);
  if (!wantsPlay) return { kind: "none" };

  const matched = matchTrack(input);
  if (matched) {
    return {
      kind: "play",
      trackId: matched.track.id,
      trackName: matched.track.name,
      confidence: matched.confidence,
    };
  }

  const requested = stripGenericWords(input);
  const explicitExternal = hasAny(normalizedText, EXTERNAL_WORDS);
  const quotedTitle = /[“”«»"']\s*[^“”«»"']{2,}\s*[“”«»"']/.test(String(input || ""));
  if (explicitExternal || (mentionsMusic && requested) || (quotedTitle && requested)) {
    return { kind: "unavailable", requestedTitle: requested || null };
  }
  if (mentionsMusic) return { kind: "missing-title" };
  return { kind: "none" };
}

export function awenaMusicCatalogText() {
  return NAVIGATION_MUSIC_TRACKS.map((track) => track.name).join(", ");
}

export function awenaMusicTrackCount() {
  return NAVIGATION_MUSIC_TRACKS.length;
}
