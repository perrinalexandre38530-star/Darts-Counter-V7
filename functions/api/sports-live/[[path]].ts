type Env = {
  DARTS_API_KEY?: string;
  TABLE_TENNIS_API_KEY?: string;
  OPENAI_API_KEY?: string;
  FOOTBALL_DATA_API_KEY?: string;
  LIVE_INTELLIGENCE_MODEL?: string;
};

type NormalPlayer = { id?: string | null; name: string; score?: number | null; countryCode?: string | null; photoUrl?: string | null };
type NormalMatch = {
  id: string;
  competition?: string | null;
  round?: string | null;
  startsAt?: string | null;
  date?: string | null;
  players: NormalPlayer[];
  raw?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
};
type NormalResult = {
  id: string;
  playedOn?: string | null;
  competition?: string | null;
  round?: string | null;
  winner: NormalPlayer;
  loser: NormalPlayer;
  raw?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

const DARTS_BASE = "https://api.dartsapi.com/v1";
const TT_BASE = "https://api.tabletennisapi.com/v1";
const METHODS = "GET, OPTIONS";

function json(payload: unknown, status = 200, cacheSeconds = 60) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${Math.min(cacheSeconds, 60)}, s-maxage=${cacheSeconds}, stale-while-revalidate=${Math.max(cacheSeconds, 120)}`,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": METHODS,
      "access-control-allow-headers": "content-type",
    },
  });
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const EN_MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4,
  jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const FR_MONTHS: Record<string, number> = {
  janv: 0, janvier: 0, fevr: 1, fevrier: 1, févr: 1, février: 1, mars: 2, avr: 3, avril: 3, mai: 4,
  juin: 5, juil: 6, juillet: 6, aout: 7, août: 7, sept: 8, septembre: 8, oct: 9, octobre: 9,
  nov: 10, novembre: 10, dec: 11, déc: 11, decembre: 11, décembre: 11,
};

function dayUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function inferYear(month: number, explicitYear?: number | null) {
  if (explicitYear && explicitYear >= 2000) return explicitYear;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  // Calendars that omit the year generally mean the nearest season occurrence.
  if (month + 5 < currentMonth) return currentYear + 1;
  return currentYear;
}

function classifyDates(start: Date | null, end: Date | null): "live" | "upcoming" | "info" {
  if (!start) return "info";
  const today = dayUtc(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()).getTime();
  const from = dayUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()).getTime();
  const untilDate = end || start;
  const until = dayUtc(untilDate.getUTCFullYear(), untilDate.getUTCMonth(), untilDate.getUTCDate()).getTime();
  if (today >= from && today <= until) return "live";
  if (today < from) return "upcoming";
  return "info";
}

function parseEnglishDateRange(label: string): { start: Date | null; end: Date | null } {
  const raw = String(label || "").replace(/[–—]/g, "-").trim();
  // 20-22 February 2026 / 14 - 18 Oct '26 / 14 Oct 2026
  let m = raw.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+)(?:\s+(?:'?(\d{2})|(20\d{2})))?$/i);
  if (!m) return { start: null, end: null };
  const month = EN_MONTHS[m[3].toLowerCase().replace(/\.$/, "")];
  if (month === undefined) return { start: null, end: null };
  const explicit = m[5] ? Number(m[5]) : m[4] ? 2000 + Number(m[4]) : null;
  const year = inferYear(month, explicit);
  const d1 = Number(m[1]);
  const d2 = Number(m[2] || m[1]);
  return { start: dayUtc(year, month, d1), end: dayUtc(year, month, d2) };
}

function parseFrenchDate(label: string): { start: Date | null; end: Date | null } {
  const raw = String(label || "").toLowerCase().replace(/\./g, "").replace(/[–—]/g, "-").trim();
  const m = raw.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([a-zàâäéèêëîïôöùûüç]+)\s+(20\d{2})$/i);
  if (!m) return { start: null, end: null };
  const key = m[3].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const month = FR_MONTHS[m[3]] ?? FR_MONTHS[key];
  if (month === undefined) return { start: null, end: null };
  const year = Number(m[4]);
  return { start: dayUtc(year, month, Number(m[1])), end: dayUtc(year, month, Number(m[2] || m[1])) };
}

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetch(base: string, key: string, path: string) {
  const response = await timedFetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    },
  }, 5000);
  const body = await response.json().catch(() => ({ error: "invalid_json", message: `HTTP ${response.status}` })) as any;
  return { ok: response.ok, status: response.status, body };
}

function dartPlayer(v: any): NormalPlayer {
  const countryRaw = str(v?.country_code || v?.countryCode || v?.country?.code || v?.nationality_code || v?.nation_code).trim().toUpperCase();
  const photoUrl = str(v?.photo_url || v?.photoUrl || v?.image_url || v?.image || v?.avatar_url || v?.headshot).trim();
  return {
    id: str(v?.player_id || v?.id) || null,
    name: str(v?.name || v?.player_name) || "—",
    score: num(v?.score ?? v?.legs ?? v?.sets),
    countryCode: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : null,
    photoUrl: /^https?:\/\//i.test(photoUrl) ? photoUrl : null,
  };
}

function dartPlayers(v: any): NormalPlayer[] {
  const direct = arr(v?.players).map(dartPlayer).filter((p) => p.name !== "—");
  if (direct.length) return direct.slice(0, 2);
  const candidates = [v?.home, v?.away, v?.home_player, v?.away_player, v?.player1, v?.player2, v?.player_1, v?.player_2].filter(Boolean);
  if (candidates.length) return candidates.map(dartPlayer).filter((p) => p.name !== "—").slice(0, 2);
  return [
    dartPlayer({ id: v?.home_player_id, name: v?.home_player_name, score: v?.home_score }),
    dartPlayer({ id: v?.away_player_id, name: v?.away_player_name, score: v?.away_score }),
  ].filter((p) => p.name !== "—").slice(0, 2);
}

function normalizeDartMatch(v: any, i: number): NormalMatch {
  return {
    id: str(v?.match_id || v?.fixture_id || v?.id) || `darts-${i}`,
    competition: str(v?.event?.name || v?.competition?.name || v?.competition || v?.event_name) || null,
    round: str(v?.round?.name || v?.round) || null,
    startsAt: str(v?.starts_at || v?.start_time || v?.scheduled_at) || null,
    date: str(v?.date) || null,
    players: dartPlayers(v),
    raw: v,
    sourceName: "DartsAPI",
    sourceUrl: "https://dartsapi.com/",
  };
}

function normalizeDartResult(v: any, i: number): NormalResult {
  const players = dartPlayers(v);
  return {
    id: str(v?.match_id || v?.id) || `darts-result-${i}`,
    playedOn: str(v?.played_on || v?.date || v?.finished_at) || null,
    competition: str(v?.event?.name || v?.competition?.name || v?.competition || v?.event_name) || null,
    round: str(v?.round?.name || v?.round) || null,
    winner: v?.winner ? dartPlayer(v.winner) : (players[0] || { name: "—", score: null }),
    loser: v?.loser ? dartPlayer(v.loser) : (players[1] || { name: "—", score: null }),
    raw: v,
    sourceName: "DartsAPI",
    sourceUrl: "https://dartsapi.com/",
  };
}

function ttSideName(side: any): string {
  if (!side) return "—";
  const direct = str(side?.name || side?.display_name || side?.team_name).trim();
  if (direct) return direct;
  const players = arr(side?.players).map((p) => str(p?.name || p?.full_name || p?.display_name).trim()).filter(Boolean);
  if (players.length) return players.join(" / ");
  const person = str(side?.player?.name || side?.player?.full_name).trim();
  return person || "—";
}

function ttSideId(side: any): string | null {
  return str(side?.id || side?.player_id || side?.player?.id) || null;
}

function ttScorePair(v: any): [number | null, number | null] {
  const score = v?.score;
  if (Array.isArray(score)) return [num(score[0]), num(score[1])];
  if (score && typeof score === "object") {
    const a = num(score?.home ?? score?.a ?? score?.side1 ?? score?.left ?? score?.[0]);
    const b = num(score?.away ?? score?.b ?? score?.side2 ?? score?.right ?? score?.[1]);
    if (a !== null || b !== null) return [a, b];
  }
  return [num(v?.score1 ?? v?.home_score ?? v?.side1_score), num(v?.score2 ?? v?.away_score ?? v?.side2_score)];
}

function ttPlayers(v: any): NormalPlayer[] {
  const sides = arr(v?.sides);
  const [aScore, bScore] = ttScorePair(v);
  if (sides.length >= 2) {
    return [
      { id: ttSideId(sides[0]), name: ttSideName(sides[0]), score: aScore },
      { id: ttSideId(sides[1]), name: ttSideName(sides[1]), score: bScore },
    ];
  }
  return [
    { id: null, name: str(v?.player1?.name || v?.home?.name || v?.side1_name) || "—", score: aScore },
    { id: null, name: str(v?.player2?.name || v?.away?.name || v?.side2_name) || "—", score: bScore },
  ];
}

function ttCompetition(v: any): string | null {
  return str(v?.event?.name || v?.event_name || v?.competition?.name || v?.competition || v?.event) || null;
}

function ttRound(v: any): string | null {
  return str(v?.round_name || v?.round?.name || v?.round || v?.discipline) || null;
}

function normalizeTtMatch(v: any, i: number): NormalMatch {
  const date = str(v?.date) || null;
  const start = str(v?.start_time || v?.starts_at || v?.scheduled_at) || null;
  return {
    id: str(v?.id || v?.match_id) || `tt-${i}`,
    competition: ttCompetition(v),
    round: ttRound(v),
    startsAt: start,
    date,
    players: ttPlayers(v),
    raw: v,
  };
}

function normalizeTtResult(v: any, i: number): NormalResult {
  const players = ttPlayers(v);
  const winnerToken = str(v?.winner?.id || v?.winner_id || v?.winner || "").toLowerCase();
  let winner = players[0] || { name: "—", score: null };
  let loser = players[1] || { name: "—", score: null };
  if (winnerToken) {
    const secondMatches = [loser.id, loser.name].some((x) => str(x).toLowerCase() === winnerToken);
    if (secondMatches) [winner, loser] = [loser, winner];
  } else if ((winner.score ?? -1) < (loser.score ?? -1)) {
    [winner, loser] = [loser, winner];
  }
  return {
    id: str(v?.id || v?.match_id) || `tt-result-${i}`,
    playedOn: str(v?.date || v?.finished_at) || null,
    competition: ttCompetition(v),
    round: ttRound(v),
    winner,
    loser,
    raw: v,
  };
}

function payloadRows(body: any, keys: string[] = []): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  for (const key of keys) if (Array.isArray(body?.[key])) return body[key];
  return [];
}

async function dartsOverview(key: string) {
  const usage = await apiFetch(DARTS_BASE, key, "/usage");
  if (!usage.ok) {
    return officialDartsFallbackOverview(`DartsAPI indisponible (HTTP ${usage.status}) : fallback PDC officiel activé.`);
  }
  const plan = str(usage.body?.data?.plan?.key || usage.body?.meta?.plan || "free").toLowerCase();
  const hasLive = plan !== "free" && plan !== "archive";
  const now = new Date();
  const future = new Date(now.getTime() + 21 * 86400000);
  const calls = [
    apiFetch(DARTS_BASE, key, `/fixtures?from=${isoDate(now)}&to=${isoDate(future)}&limit=120`),
    apiFetch(DARTS_BASE, key, "/results?limit=120"),
  ];
  const [fixtures, results] = await Promise.all(calls);
  const live = hasLive ? await apiFetch(DARTS_BASE, key, "/live") : { ok: false, status: 402, body: { data: [] } };
  const warnings: string[] = [];
  if (!fixtures.ok) warnings.push(`Fixtures Darts indisponibles (${fixtures.status}).`);
  if (!results.ok) warnings.push(`Résultats Darts indisponibles (${results.status}).`);
  if (!hasLive) warnings.push("Le plan DartsAPI actuel ne fournit pas le score LIVE ; fixtures/résultats réels restent chargés automatiquement.");
  return {
    status: 200,
    ttl: hasLive ? 120 : 900,
    payload: {
      sport: "darts",
      configured: true,
      automaticData: true,
      provider: "dartsapi",
      plan,
      dataAsOf: str(live.body?.meta?.data_as_of || fixtures.body?.meta?.data_as_of || results.body?.meta?.data_as_of) || null,
      liveAvailable: !!live.ok,
      liveReason: live.ok ? null : "Le direct Darts nécessite un plan DartsAPI compatible LIVE.",
      live: live.ok ? payloadRows(live.body, ["matches", "live"]).map(normalizeDartMatch) : [],
      fixtures: fixtures.ok ? payloadRows(fixtures.body, ["fixtures", "matches"]).map(normalizeDartMatch) : [],
      results: results.ok ? payloadRows(results.body, ["results", "matches"]).map(normalizeDartResult) : [],
      warnings,
    },
  };
}

async function tableTennisOverview(key: string, depth: "fast" | "deep" = "fast") {
  const usage = await apiFetch(TT_BASE, key, "/usage");
  if (!usage.ok) {
    return {
      status: usage.status,
      ttl: 300,
      payload: { configured: false, automaticData: false, provider: "tabletennisapi", liveAvailable: false, liveReason: "Clé Table Tennis API invalide ou indisponible.", live: [], fixtures: [], results: [], warnings: [`Table Tennis API usage HTTP ${usage.status}`] },
    };
  }
  const plan = str(usage.body?.data?.plan?.key || usage.body?.data?.plan || usage.body?.meta?.plan || "free").toLowerCase();
  const hasLive = plan === "live" || plan === "complete";
  const todayDate = new Date();
  const today = isoDate(todayDate);

  const [todayMatches, yesterday] = await Promise.all([
    apiFetch(TT_BASE, key, `/matches?date=${today}&per_page=200`),
    apiFetch(TT_BASE, key, "/results/yesterday"),
  ]);
  const live = hasLive ? await apiFetch(TT_BASE, key, "/live") : { ok: false, status: 403, body: { data: [] } };

  let extraRows: any[] = [];
  let extraFailures = 0;
  if (depth === "deep") {
    const offsets = [-6, -5, -4, -3, -2, 1, 2, 3, 4, 5, 6, 7];
    const settled = await Promise.allSettled(offsets.map(async (offset) => {
      const d = new Date(todayDate);
      d.setUTCDate(d.getUTCDate() + offset);
      const response = await apiFetch(TT_BASE, key, `/matches?date=${isoDate(d)}&per_page=200`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return payloadRows(response.body, ["matches"]);
    }));
    extraRows = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
    extraFailures = settled.filter((item) => item.status === "rejected").length;
  }

  const todayRows = todayMatches.ok ? payloadRows(todayMatches.body, ["matches"]) : [];
  const allRowsRaw = [...todayRows, ...extraRows];
  const seen = new Set<string>();
  const allRows = allRowsRaw.filter((row, index) => {
    const keyValue = str(row?.id || row?.match_id) || `${ttCompetition(row)}|${str(row?.date)}|${ttPlayers(row).map((p) => p.name).join("|")}|${index}`;
    if (seen.has(keyValue)) return false;
    seen.add(keyValue);
    return true;
  });
  const liveRows = live.ok ? payloadRows(live.body, ["matches", "live"]) : allRows.filter((row) => str(row?.status).toLowerCase() === "live");
  const fixtureRows = allRows.filter((row) => ["scheduled", "upcoming", "not_started"].includes(str(row?.status).toLowerCase()));
  const finishedRows = allRows.filter((row) => str(row?.status).toLowerCase() === "finished");
  const yesterdayRows = yesterday.ok ? payloadRows(yesterday.body, ["results", "matches"]) : [];
  const resultRows = [...finishedRows, ...yesterdayRows];

  const warnings: string[] = [];
  if (!todayMatches.ok) warnings.push(`Matchs Ping-Pong indisponibles (${todayMatches.status}).`);
  if (!yesterday.ok) warnings.push(`Résultats Ping-Pong indisponibles (${yesterday.status}).`);
  if (extraFailures) warnings.push(`${extraFailures} journée(s) Ping-Pong profonde(s) indisponible(s), les autres restent chargées.`);
  if (!hasLive) warnings.push("La clé gratuite charge les vrais matchs/résultats ; le flux /live à ~10 s nécessite le plan Live/Complete.");

  return {
    status: 200,
    ttl: hasLive ? 20 : depth === "deep" ? 1800 : 900,
    payload: {
      sport: "pingpong",
      configured: true,
      automaticData: true,
      provider: "tabletennisapi",
      plan,
      dataAsOf: new Date().toISOString(),
      liveAvailable: !!live.ok,
      liveReason: live.ok ? null : "Le direct Ping-Pong à haute fréquence nécessite un plan Table Tennis API Live/Complete.",
      live: liveRows.map(normalizeTtMatch).slice(0, 80),
      fixtures: fixtureRows.map(normalizeTtMatch).slice(0, depth === "deep" ? 240 : 100),
      results: resultRows.map(normalizeTtResult).slice(0, depth === "deep" ? 300 : 120),
      warnings,
    },
  };
}


const PDC_EUROPEAN_TOUR = "https://www.pdc.tv/tournament/european-darts-open-et10?page=33";

function parsePdcOfficialEvents(html: string): NormalEvent[] {
  const lines = htmlLines(html);
  const out: NormalEvent[] = [];
  const dateRe = /^(\d{1,2}(?:-\d{1,2})?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})$/i;

  for (let i = 0; i < lines.length && out.length < 36; i += 1) {
    const line = lines[i];
    if (!dateRe.test(line)) continue;
    let title = "";
    for (let k = i - 1; k >= Math.max(0, i - 4); k -= 1) {
      const candidate = lines[k];
      if (candidate.length >= 5 && candidate.length <= 100 && !looksLikeNoise(candidate) && !dateRe.test(candidate)) {
        title = candidate;
        break;
      }
    }
    if (!title) continue;
    const lowered = title.toLowerCase();
    if (!/(darts|trophy|open|grand prix|championship|masters|tour)/i.test(title)) continue;
    const range = parseEnglishDateRange(line);
    out.push({
      id: `pdc-${out.length}-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 44)}`,
      title,
      subtitle: "Professional Darts Corporation",
      startsAt: range.start?.toISOString() || null,
      dateLabel: line,
      status: classifyDates(range.start, range.end),
      sourceName: "PDC",
      sourceUrl: PDC_EUROPEAN_TOUR,
      watchUrl: "https://video.pdc.tv/",
    });
  }

  const latest = lines.findIndex((line) => /latest news/i.test(line));
  if (latest >= 0) {
    const slice = lines.slice(latest + 1, latest + 45);
    for (const line of slice) {
      if (out.filter((row) => row.status === "result").length >= 5) break;
      if (line.length < 18 || line.length > 160) continue;
      if (!/(wins|beats|edges|powers past|storms to|stuns|claims|clinches|champion)/i.test(line)) continue;
      out.push({
        id: `pdc-result-${out.length}-${line.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 42)}`,
        title: line.replace(/\s*\|.*$/, "").trim(),
        subtitle: "Dernier résultat / actualité PDC",
        status: "result",
        sourceName: "PDC",
        sourceUrl: PDC_EUROPEAN_TOUR,
        resultLabel: "Résultat officiel PDC",
      });
    }
  }

  return uniqEvents(out).slice(0, 48);
}

async function officialDartsFallbackOverview(reason: string) {
  try {
    const html = await fetchOfficialHtml(PDC_EUROPEAN_TOUR);
    const events = parsePdcOfficialEvents(html);
    return {
      status: 200,
      ttl: 1800,
      payload: {
        sport: "darts",
        configured: true,
        automaticData: true,
        provider: "pdc_official",
        plan: "public",
        dataAsOf: new Date().toISOString(),
        liveAvailable: false,
        liveReason: reason,
        live: [], fixtures: [], results: [], events,
        warnings: [
          reason,
          events.length ? "Fallback PDC officiel actif : calendrier et résultats/actus publiques chargés automatiquement." : "PDC accessible mais aucune donnée structurée exploitable détectée."
        ],
      },
    };
  } catch (error: any) {
    return {
      status: 200, ttl: 300,
      payload: {
        sport: "darts", configured: false, automaticData: false, provider: "pdc_official", plan: "public",
        dataAsOf: null, liveAvailable: false, liveReason: reason, live: [], fixtures: [], results: [], events: [],
        warnings: [reason, `Fallback PDC indisponible : ${str(error?.message || error)}`],
      },
    };
  }
}

const ITSF_HOME = "https://www.tablesoccer.org/";
const MOLKKY_CALENDAR = "https://www.molkky.world/fr/tournois/";
const MOLKKY_WORLDS = "https://www.international-molkky.org/world-championships";
const FIPJP_HOME = "https://fipjp.org/en/";

type NormalEvent = {
  id: string;
  title: string;
  subtitle?: string | null;
  startsAt?: string | null;
  dateLabel?: string | null;
  status: "live" | "upcoming" | "result" | "info";
  sourceName?: string | null;
  sourceUrl?: string | null;
  watchUrl?: string | null;
  resultLabel?: string | null;
};

function decodeHtml(input: string) {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&agrave;/gi, "à")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&ouml;/gi, "ö")
    .replace(/&uuml;/gi, "ü")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n) || 32));
}

function htmlLines(html: string): string[] {
  const normalized = decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|li|h1|h2|h3|h4|h5|section|article|tr|td|a)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
  return normalized
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1);
}

async function fetchOfficialHtml(url: string) {
  const response = await timedFetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0 (+https://multisports-scoring.pages.dev)",
    },
  }, 3200);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function uniqEvents(rows: NormalEvent[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.status}|${row.title}|${row.dateLabel || ""}|${row.resultLabel || ""}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeNoise(line: string) {
  return /^(image|view all|home|partners|rankings|singles|doubles|live-streams|upcoming tournaments|tournaments in progress|latest results|latest albums)$/i.test(line.trim());
}

function parseItsfEvents(html: string): NormalEvent[] {
  const lines = htmlLines(html);
  const out: NormalEvent[] = [];
  const dateRe = /^(\d{1,2}(?:\s*-\s*\d{1,2})?\s+[A-Za-z]{3,9}(?:\s*'\s*\d{2}|\s+\d{4})?)$/;
  const progressIndex = lines.findIndex((line) => /tournaments in progress/i.test(line));
  const upcomingIndex = lines.findIndex((line) => /upcoming tournaments/i.test(line));
  const latestIndexBoundary = lines.findIndex((line) => /latest results/i.test(line));

  for (let i = 0; i < lines.length - 1 && out.length < 30; i += 1) {
    const line = lines[i];
    if (!dateRe.test(line)) continue;
    let title = "";
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      const candidate = lines[j];
      if (dateRe.test(candidate)) break;
      if (!looksLikeNoise(candidate) && candidate.length >= 4 && candidate.length <= 120) {
        title = candidate;
        break;
      }
    }
    if (!title) continue;
    const range = parseEnglishDateRange(line);
    const inProgressSection = progressIndex >= 0 && i > progressIndex && (upcomingIndex < 0 || i < upcomingIndex);
    const inUpcomingSection = upcomingIndex >= 0 && i > upcomingIndex && (latestIndexBoundary < 0 || i < latestIndexBoundary);
    const dateStatus = classifyDates(range.start, range.end);
    const status: NormalEvent["status"] = inProgressSection ? "live" : inUpcomingSection ? "upcoming" : dateStatus;
    out.push({
      id: `itsf-${out.length}-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 48)}`,
      title,
      subtitle: inProgressSection ? "Tournoi ITSF / Coral · en cours" : "Tournoi ITSF / Coral",
      startsAt: range.start?.toISOString() || null,
      dateLabel: line,
      status,
      sourceName: "ITSF / Coral",
      sourceUrl: ITSF_HOME,
    });
  }

  const latestIndex = lines.findIndex((line) => /latest results/i.test(line));
  if (latestIndex >= 0) {
    const slice = lines.slice(latestIndex + 1, latestIndex + 80);
    for (let i = 1; i < slice.length && out.filter((row) => row.status === "result").length < 16; i += 1) {
      if (!/winner$/i.test(slice[i])) continue;
      const winnerName = slice[i - 1];
      if (!winnerName || looksLikeNoise(winnerName) || /winner$/i.test(winnerName)) continue;
      let competition = "Dernier résultat ITSF";
      for (let k = i - 2; k >= 0 && k >= i - 10; k -= 1) {
        const candidate = slice[k];
        if (candidate.length > 8 && !looksLikeNoise(candidate) && !/^(PT|ES|FR|DE|US|GB|AT|SK|CZ)$/i.test(candidate)) {
          competition = candidate;
          break;
        }
      }
      out.push({
        id: `itsf-result-${out.length}-${winnerName.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 36)}`,
        title: winnerName,
        subtitle: competition,
        status: "result",
        sourceName: "ITSF / Coral",
        sourceUrl: ITSF_HOME,
        resultLabel: slice[i],
      });
    }
  }

  return uniqEvents(out).slice(0, 48);
}

function parseMolkkyEvents(calendarHtml: string, worldsHtml: string): NormalEvent[] {
  const lines = htmlLines(calendarHtml);
  const out: NormalEvent[] = [];
  const frDate = /(\d{1,2}\s+(?:janv(?:ier)?|févr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?)\.?\s+20\d{2})/i;

  for (let i = 0; i < lines.length && out.length < 36; i += 1) {
    const line = lines[i];
    const match = line.match(frDate);
    if (!match) continue;
    const dateLabel = match[1];
    let title = line.slice(0, match.index || 0).replace(/^[-•\s]+/, "").trim();
    if (!title && i > 0 && !looksLikeNoise(lines[i - 1])) title = lines[i - 1];
    if (!title || title.length < 3 || title.length > 120) continue;
    const country = line.slice((match.index || 0) + dateLabel.length).replace(/^\s*[|·-]\s*/, "").trim();
    const range = parseFrenchDate(dateLabel);
    out.push({
      id: `molkky-${out.length}-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 42)}`,
      title,
      subtitle: country || "Tournoi Mölkky",
      startsAt: range.start?.toISOString() || null,
      dateLabel,
      status: classifyDates(range.start, range.end),
      sourceName: "Mölkky World",
      sourceUrl: MOLKKY_CALENDAR,
    });
  }

  const worldLines = htmlLines(worldsHtml);
  const championship = worldLines.findIndex((line) => /21\.\s*Mölkky World Championships/i.test(line));
  if (championship >= 0) {
    const slice = worldLines.slice(championship, championship + 45);
    const first = slice.find((line) => /^1\.\s+/.test(line));
    const dateLine = slice.find((line) => /August 2026/i.test(line));
    if (first) {
      out.unshift({
        id: "molkky-worlds-2026-result",
        title: "Mölkky World Championships 2026",
        subtitle: dateLine || "Helsinki · Finlande",
        dateLabel: dateLine || "14 - 16 August 2026",
        status: "result",
        sourceName: "International Mölkky Organisation",
        sourceUrl: MOLKKY_WORLDS,
        resultLabel: first.replace(/^1\.\s*/, "Champion : "),
      });
    }
  }

  return uniqEvents(out).slice(0, 48);
}

function parseFipjpEvents(html: string): NormalEvent[] {
  const text = htmlLines(html).join(" \n ");
  const out: NormalEvent[] = [];
  const worldMatch = text.match(/Men.?s Triples and Precision Shooting World Pétanque Championships live[\s\S]{0,220}?from\s+(\d{1,2})\s+to\s+(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/i);
  if (worldMatch) {
    const dateLabel = `${worldMatch[1]}-${worldMatch[2]} ${worldMatch[3]} ${worldMatch[4]}`;
    const range = parseEnglishDateRange(dateLabel);
    out.push({
      id: `fipjp-worlds-${worldMatch[4]}`,
      title: "Men’s Triples & Precision Shooting World Championships",
      subtitle: "FIPJP · Khon Kaen, Thailand",
      startsAt: range.start?.toISOString() || null,
      dateLabel,
      status: classifyDates(range.start, range.end),
      sourceName: "FIPJP",
      sourceUrl: FIPJP_HOME,
      watchUrl: "https://www.youtube.com/@FIPJP",
    });
  }
  if (/new official YouTube channel/i.test(text)) {
    out.push({
      id: "fipjp-youtube-live",
      title: "World Pétanque · chaîne officielle",
      subtitle: "Directs et replays FIPJP",
      status: "info",
      sourceName: "FIPJP",
      sourceUrl: FIPJP_HOME,
      watchUrl: "https://www.youtube.com/@FIPJP",
    });
  }
  return uniqEvents(out);
}

async function officialEventOverview(sport: "babyfoot" | "molkky" | "petanque") {
  try {
    if (sport === "babyfoot") {
      const html = await fetchOfficialHtml(ITSF_HOME);
      const events = parseItsfEvents(html);
      return {
        status: 200,
        ttl: 900,
        payload: {
          sport,
          configured: true,
          automaticData: true,
          provider: "itsf_official",
          plan: "public",
          dataAsOf: new Date().toISOString(),
          liveAvailable: false,
          liveReason: "Le flux public ITSF/Coral fournit automatiquement événements et derniers résultats ; les scores point par point restent dans Coral.",
          live: [], fixtures: [], results: [], events,
          warnings: events.length ? [] : ["ITSF accessible mais aucun événement structuré n’a été détecté dans cette réponse."],
        },
      };
    }

    if (sport === "molkky") {
      const [calendarHtml, worldsHtml] = await Promise.all([
        fetchOfficialHtml(MOLKKY_CALENDAR),
        fetchOfficialHtml(MOLKKY_WORLDS),
      ]);
      const events = parseMolkkyEvents(calendarHtml, worldsHtml);
      return {
        status: 200,
        ttl: 1800,
        payload: {
          sport,
          configured: true,
          automaticData: true,
          provider: "molkky_world",
          plan: "public",
          dataAsOf: new Date().toISOString(),
          liveAvailable: false,
          liveReason: "Calendrier Mölkky World et résultats internationaux chargés automatiquement ; le score lancer par lancer n’est pas publié dans un flux public stable.",
          live: [], fixtures: [], results: [], events,
          warnings: events.length ? [] : ["Aucun événement Mölkky structuré détecté dans la réponse officielle."],
        },
      };
    }

    const html = await fetchOfficialHtml(FIPJP_HOME);
    const events = parseFipjpEvents(html);
    return {
      status: 200,
      ttl: 1800,
      payload: {
        sport,
        configured: true,
        automaticData: true,
        provider: "fipjp_official",
        plan: "public",
        dataAsOf: new Date().toISOString(),
        liveAvailable: false,
        liveReason: "Événements et diffusions FIPJP chargés automatiquement ; aucun flux public de score match structuré suffisamment stable n’est exposé actuellement.",
        live: [], fixtures: [], results: [], events,
        warnings: events.length ? [] : ["FIPJP accessible mais aucun événement structuré n’a été détecté dans cette réponse."],
      },
    };
  } catch (error: any) {
    return {
      status: 200,
      ttl: 300,
      payload: {
        sport,
        configured: false,
        automaticData: false,
        provider: sport === "babyfoot" ? "itsf_official" : sport === "molkky" ? "molkky_world" : "fipjp_official",
        plan: "public",
        dataAsOf: null,
        liveAvailable: false,
        liveReason: "Source officielle temporairement indisponible.",
        live: [], fixtures: [], results: [], events: [],
        warnings: [`Source officielle ${sport} indisponible : ${str(error?.message || error)}`],
      },
    };
  }
}



type IntelligenceKind = "news" | "result" | "live" | "upcoming";
type IntelligenceScope = "local" | "regional" | "world";
type IntelligenceNews = {
  id: string;
  title: string;
  summary?: string | null;
  publishedAt?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  kind: IntelligenceKind;
  resultLabel?: string | null;
  scope?: IntelligenceScope;
  scopeLabel?: string | null;
};

const INTELLIGENCE_SPECS: Record<string, { label: string; query: string; domains: string[] }> = {
  darts: {
    label: "darts / fléchettes",
    query: "darts PDC WDF results scores tournament",
    domains: ["pdc.tv", "dartswdf.com", "dartconnect.com", "modussuperseries.com", "ffdarts.fr"],
  },
  pingpong: {
    label: "table tennis / ping-pong",
    query: "table tennis WTT ITTF results scores",
    domains: ["worldtabletennis.com", "ittf.com", "fftt.com"],
  },
  petanque: {
    label: "pétanque",
    query: "petanque pétanque FIPJP results championnat résultats",
    domains: ["fipjp.org", "ffpjp.org"],
  },
  babyfoot: {
    label: "table soccer / baby-foot",
    query: "table soccer ITSF results foosball tournament",
    domains: ["tablesoccer.org"],
  },
  molkky: {
    label: "Mölkky",
    query: "Molkky Mölkky tournament results world championship",
    domains: ["molkky.world", "international-molkky.org"],
  },
  foot: {
    label: "football / soccer",
    query: "football soccer results scores fixtures championships",
    domains: ["fifa.com", "uefa.com", "lequipe.fr", "bbc.com", "skysports.com", "espn.com", "football-data.org", "thesportsdb.com"],
  },
  padel: {
    label: "padel",
    query: "padel FIP Premier Padel results scores tournament",
    domains: ["padelfip.com", "premierpadel.com", "fft.fr"],
  },
  badminton: {
    label: "badminton",
    query: "badminton BWF results scores tournament",
    domains: ["bwfbadminton.com", "ffbad.org"],
  },
  cornhole: {
    label: "cornhole",
    query: "cornhole ACL ACO results scores tournament",
    domains: ["iplayacl.com", "americancornhole.com", "ofch.fr"],
  },
  palet: {
    label: "palet",
    query: "palet championnat coupe résultats compétition",
    domains: ["le-palet.com"],
  },
  bowling: {
    label: "bowling",
    query: "bowling IBF PBA results scores tournament",
    domains: ["bowling.sport", "pba.com", "ffbsq.fr"],
  },
};


const SPORT_SOURCE_DOMAINS: Record<string, string[]> = {
  darts: ["pdc.tv", "dartswdf.com", "modussuperseries.com", "dartconnect.com", "leaderboard.dartconnect.com", "dartsinfo.co.uk", "dartsnews.com", "live-darts.com", "flechettes.info", "ffdarts.fr", "ddv-online.de", "ndbdarts.nl", "dartsbelgium.be", "champdarts.com", "adodarts.com", "dartscanada.com", "dartsaustralia.com", "dartsnz.nz", "pdcnordic.tv", "bedarts.be", "jsfd.or.jp", "japan-darts.com", "darts.or.jp"],
  pingpong: ["ittf.com", "worldtabletennis.com", "ettu.org", "fftt.com", "tabletennisengland.co.uk"],
  petanque: ["fipjp.org", "ffpjp.org", "compet.ffpjp.org", "boulistenaute.com"],
  babyfoot: ["tablesoccer.org", "ffbabyfoot.fr"],
  molkky: ["molkky.world", "international-molkky.org", "ff-molkky.fr"],
  foot: ["fifa.com", "uefa.com", "ligue1.com", "premierleague.com", "laliga.com", "legaseriea.it", "bundesliga.com", "espn.com", "skysports.com", "lequipe.fr"],
  padel: ["padelfip.com", "premierpadel.com", "fft.fr", "padelmagazine.fr"],
  badminton: ["bwfbadminton.com", "badmintoneurope.com", "ffbad.org"],
  cornhole: ["iplayacl.com", "americancornhole.com", "ofch.fr"],
  palet: ["le-palet.com"],
  bowling: ["pba.com", "bowling.sport", "ffbsq.org", "ffbsq.fr"],
};

const MEDIA_DOMAINS_BY_LANG: Record<string, string[]> = {
  fr: ["lequipe.fr", "eurosport.fr", "rmcsport.bfmtv.com"],
  en: ["espn.com", "skysports.com", "sports.yahoo.com"],
  es: ["marca.com", "as.com", "mundodeportivo.com"],
  de: ["sport1.de", "eurosport.de", "kicker.de"],
  it: ["gazzetta.it", "eurosport.it", "corrieredellosport.it"],
  nl: ["nos.nl", "sportnieuws.nl", "ad.nl"],
  pt: ["abola.pt", "record.pt", "ojogo.pt"],
  pl: ["sport.pl", "przegladsportowy.onet.pl", "tvpsport.pl"],
  da: ["dr.dk", "tv2.dk", "bold.dk"],
  no: ["nrk.no", "tv2.no", "vg.no"],
  sv: ["svt.se", "aftonbladet.se", "expressen.se"],
  is: ["visir.is", "mbl.is"],
  cs: ["sport.cz", "idnes.cz", "ceskatelevize.cz"],
  ro: ["gsp.ro", "digisport.ro", "prosport.ro"],
  sr: ["sportklub.n1info.rs", "mozzartsport.com"],
  hr: ["sportske.jutarnji.hr", "gol.dnevnik.hr"],
  ru: ["championat.com", "sports.ru"],
  tr: ["ntvspor.net", "fanatik.com.tr", "trtspor.com.tr"],
  ar: ["kooora.com", "beinsports.com", "alarabiya.net"],
  hi: ["sportsstar.thehindu.com", "timesofindia.indiatimes.com"],
  ja: ["sports.yahoo.co.jp", "number.bunshun.jp", "nikkansports.com"],
  zh: ["sports.sina.com.cn", "sports.qq.com", "163.com"],
};

const DIRECT_EDITORIAL_PAGES: Record<string, Array<{ url: string; sourceName: string; scope: IntelligenceScope; scopeLabel: string }>> = {
  darts: [
    { url: "https://www.pdc.tv/news", sourceName: "PDC", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.pdc.tv/calendar/", sourceName: "PDC Calendar", scope: "world", scopeLabel: "Monde" },
    { url: "https://dartswdf.com/news", sourceName: "WDF", scope: "world", scopeLabel: "Monde" },
    { url: "https://dartswdf.com/calendar", sourceName: "WDF Calendar", scope: "world", scopeLabel: "Monde" },
    { url: "https://modussuperseries.com/results", sourceName: "MODUS", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.dartconnect.com/fans/", sourceName: "DartConnect", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.dartsnews.com/", sourceName: "DartsNews", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.live-darts.com/", sourceName: "Live Darts", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.flechettes.info/", sourceName: "Flechettes.info", scope: "local", scopeLabel: "FR" },
    { url: "https://dartsinfo.co.uk/", sourceName: "DartsInfo", scope: "regional", scopeLabel: "UK & Europe" },
    { url: "https://dartsnz.nz/results/", sourceName: "Darts New Zealand", scope: "regional", scopeLabel: "Océanie" },
    { url: "https://www.dartsaustralia.com/", sourceName: "Darts Australia", scope: "regional", scopeLabel: "Océanie" },
    { url: "https://www.ffdarts.fr/category/resultat/", sourceName: "FFDarts Résultats", scope: "local", scopeLabel: "France" },
    { url: "https://champdarts.com/news/", sourceName: "CDC", scope: "regional", scopeLabel: "Amérique du Nord / Caraïbes" },
    { url: "https://champdarts.com/blog/blog-single-author-full/", sourceName: "CDC Résultats", scope: "regional", scopeLabel: "Amérique du Nord / Caraïbes" },
    { url: "https://leaderboard.dartconnect.com/", sourceName: "DartConnect Leaderboards", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.live-darts.com/pdc-darts-news/", sourceName: "LiveDarts PDC", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.live-darts.com/pdc-darts-news/european-tour/", sourceName: "LiveDarts European Tour", scope: "regional", scopeLabel: "Europe" },
    { url: "https://pdc-nordic.tv/", sourceName: "PDC Nordic & Baltic", scope: "regional", scopeLabel: "Nordique / Baltique" },
    { url: "https://bedarts.be/startpagina/nieuws/", sourceName: "BeDarts", scope: "regional", scopeLabel: "Benelux" },
    { url: "https://jsfd.or.jp/", sourceName: "JSFD", scope: "regional", scopeLabel: "Japon / Asie" },
    { url: "https://japan-darts.com/", sourceName: "JDO", scope: "regional", scopeLabel: "Japon / Asie" },
    { url: "https://www.darts.or.jp/news/?page=0", sourceName: "Japan Darts Association", scope: "regional", scopeLabel: "Japon / Asie" },
    { url: "https://allthingsdarts.dartscores.co.uk/results", sourceName: "All Things Darts", scope: "world", scopeLabel: "PDC / Monde" },
    { url: "https://allthingsdarts.dartscores.co.uk/past-tournaments", sourceName: "All Things Darts Archive", scope: "world", scopeLabel: "PDC / Monde" },
    { url: "https://www.dartsdatabase.co.uk/", sourceName: "The Darts Database", scope: "world", scopeLabel: "PDC / WDF / Monde" },
    { url: "https://www.englanddarts.co.uk/darts/", sourceName: "England Darts", scope: "regional", scopeLabel: "Angleterre" },
    { url: "https://www.sdadarts.com/", sourceName: "Scottish Darts Association", scope: "regional", scopeLabel: "Écosse" },
    { url: "https://welshdarts.wales/", sourceName: "Welsh Darts Organisation", scope: "regional", scopeLabel: "Pays de Galles" },
    { url: "https://www.ndfc.ca/", sourceName: "NDFC Canada", scope: "regional", scopeLabel: "Canada" },
    { url: "https://www.ndbdarts.nl/", sourceName: "Nederlandse Darts Bond", scope: "regional", scopeLabel: "Pays-Bas / Benelux" },
    { url: "https://ddv-online.de/", sourceName: "Deutscher Dart-Verband", scope: "regional", scopeLabel: "Allemagne / DACH" },
  ],
  pingpong: [
    { url: "https://www.ittf.com/news/", sourceName: "ITTF", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.ittf.com/2026-events-calendar/", sourceName: "ITTF Calendar", scope: "world", scopeLabel: "Monde" },
    { url: "https://worldtabletennis.com/", sourceName: "World Table Tennis", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.ettu.org/en/n/news/", sourceName: "ETTU", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.ettu.org/en/events/", sourceName: "ETTU Events", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.fftt.com/actualites/", sourceName: "FFTT", scope: "local", scopeLabel: "FR" },
    { url: "https://www.fftt.com/competition/", sourceName: "FFTT Compétitions", scope: "local", scopeLabel: "FR" },
    { url: "https://www.tabletennisengland.co.uk/news/", sourceName: "Table Tennis England", scope: "regional", scopeLabel: "UK" },
  ],
  petanque: [
    { url: "https://fipjp.org/index.php/fr/", sourceName: "FIPJP", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.cep-petanque.com/", sourceName: "CEP Pétanque", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.ffpjp.org/", sourceName: "FFPJP", scope: "local", scopeLabel: "FR" },
    { url: "https://compet.ffpjp.org/", sourceName: "FFPJP Compétitions", scope: "local", scopeLabel: "FR" },
    { url: "https://www.petanqueland.fr/officiels-petanque/", sourceName: "PetanqueLand", scope: "local", scopeLabel: "Francophonie" },
    { url: "https://www.loeildubouliste.fr/competitions", sourceName: "L’Œil du Bouliste", scope: "local", scopeLabel: "Francophonie" },
    { url: "https://www.boulistenaute.com/", sourceName: "Boulistenaute", scope: "local", scopeLabel: "Francophonie" },
  ],
  babyfoot: [
    { url: "https://www.tablesoccer.org/", sourceName: "ITSF", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.ffbabyfoot.fr/", sourceName: "FFBabyFoot", scope: "local", scopeLabel: "FR" },
  ],
  molkky: [
    { url: "https://www.molkky.world/fr", sourceName: "Mölkky World", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.molkky.world/fr/tournois/", sourceName: "Mölkky World", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.international-molkky.org/world-championships", sourceName: "International Mölkky", scope: "world", scopeLabel: "Monde" },
    { url: "https://ac.molkkify.app/results", sourceName: "Molkkify Results", scope: "world", scopeLabel: "Monde" },
    { url: "https://ff-molkky.fr/partout-dans-le-monde/", sourceName: "FF Mölkky International", scope: "regional", scopeLabel: "Europe / Monde" },
    { url: "https://www.ff-molkky.fr/", sourceName: "FF Mölkky", scope: "local", scopeLabel: "FR" },
  ],
  foot: [
    { url: "https://www.uefa.com/news-media/news/", sourceName: "UEFA", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.uefa.com/uefachampionsleague/fixtures-results/", sourceName: "UEFA Champions League", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.fifa.com/en/news", sourceName: "FIFA", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.premierleague.com/en/news", sourceName: "Premier League", scope: "regional", scopeLabel: "UK" },
    { url: "https://ligue1.com/", sourceName: "Ligue 1", scope: "local", scopeLabel: "FR" },
    { url: "https://www.espn.com/soccer/", sourceName: "ESPN Soccer", scope: "world", scopeLabel: "Monde" },
  ],
  padel: [
    { url: "https://www.padelfip.com/news/", sourceName: "FIP Padel", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.padelfip.com/titles-and-finals/", sourceName: "FIP Padel", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.padelfip.com/events/", sourceName: "FIP Events", scope: "world", scopeLabel: "Monde" },
    { url: "https://premierpadel.com/en/tournaments", sourceName: "Premier Padel", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.padelscore.org/calendario", sourceName: "PadelScore", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.fft.fr/nos-sports/padel", sourceName: "FFT Padel", scope: "local", scopeLabel: "FR" },
    { url: "https://padelmagazine.fr/", sourceName: "Padel Magazine", scope: "local", scopeLabel: "Francophonie" },
  ],
  badminton: [
    { url: "https://bwfbadminton.com/", sourceName: "BWF", scope: "world", scopeLabel: "Monde" },
    { url: "https://bwfbadminton.com/calendar/", sourceName: "BWF Calendar", scope: "world", scopeLabel: "Monde" },
    { url: "https://bwf.tournamentsoftware.com/", sourceName: "BWF Tournament Software", scope: "world", scopeLabel: "Monde" },
    { url: "https://badmintoneurope.com/web/corporate/news", sourceName: "Badminton Europe", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.ffbad.org/", sourceName: "FFBaD", scope: "local", scopeLabel: "FR" },
  ],
  cornhole: [
    { url: "https://www.iplayacl.com/about/acl-information/acl-news", sourceName: "ACL", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.iplayacl.com/", sourceName: "ACL", scope: "regional", scopeLabel: "Amérique du Nord" },
    { url: "https://americancornhole.com/results/", sourceName: "ACO", scope: "regional", scopeLabel: "Amérique du Nord" },
    { url: "https://www.ofch.fr/evenements/", sourceName: "OFCH", scope: "local", scopeLabel: "FR" },
  ],
  palet: [
    { url: "https://www.le-palet.com/", sourceName: "Palet FNSMR", scope: "local", scopeLabel: "FR" },
  ],
  bowling: [
    { url: "https://www.pba.com/press-media-gallery/news", sourceName: "PBA", scope: "world", scopeLabel: "Monde" },
    { url: "https://www.pba.com/schedule/pba-tour", sourceName: "PBA Tour", scope: "regional", scopeLabel: "Amérique du Nord" },
    { url: "https://bowling.sport/", sourceName: "IBF", scope: "world", scopeLabel: "Monde" },
    { url: "https://etbf.eu/", sourceName: "ETBF", scope: "regional", scopeLabel: "Europe" },
    { url: "https://www.ffbsq.fr/", sourceName: "FFBSQ", scope: "local", scopeLabel: "FR" },
  ],
};

const DARTS_LOCALE_QUERY_PACKS: Record<string, string[]> = {
  fr: [
    "fléchettes résultats France FFDarts WDF",
    "darts PDC WDF MODUS résultats scores",
    "fléchettes Belgique Suisse Canada résultats darts",
  ],
  en: [
    "darts results England Scotland Wales Ireland PDC WDF",
    "darts results USA Canada CDC",
    "darts results Australia New Zealand",
  ],
  es: ["dardos resultados España WDF", "darts resultados Latinoamérica Caribe CDLC"],
  de: ["Darts Ergebnisse Deutschland DDV PDC", "Darts Ergebnisse Österreich Schweiz"],
  it: ["freccette risultati Italia steel darts", "darts risultati Italia WDF"],
  nl: ["darts uitslagen Nederland NDB", "darts uitslagen België"],
  pt: ["dardos resultados Portugal", "darts resultados Brasil Portugal"],
  pl: ["dart wyniki Polska PDO", "darts wyniki Polska WDF"],
  da: ["dart resultater Danmark DDU", "PDC Nordic Baltic resultater"],
  no: ["dart resultater Norge", "PDC Nordic Baltic results"],
  sv: ["dart resultat Sverige", "PDC Nordic Baltic results"],
  is: ["dart úrslit Ísland", "PDC Nordic Baltic results"],
  cs: ["šipky výsledky Česko", "darts Czech results WDF"],
  ro: ["darts rezultate România", "WDF darts Eastern Europe results"],
  sr: ["pikado rezultati Srbija", "WDF darts Balkans results"],
  hr: ["pikado rezultati Hrvatska", "WDF darts Balkans results"],
  ru: ["дартс результаты WDF", "darts Eastern Europe results"],
  tr: ["dart sonuçları Türkiye", "WDF darts Turkey results"],
  ar: ["نتائج الدارتس", "darts Middle East results"],
  hi: ["darts results India", "WDF Asia darts results"],
  ja: ["ダーツ 結果 PDC WDF", "Japan darts results"],
  zh: ["飞镖 比赛 结果 PDC WDF", "China darts results"],
};

const FOOT_LOCALE_QUERY_PACKS: Record<string, string[]> = {
  fr: ["football France Ligue 1 résultats scores", "football équipe de France résultats", "football Ligue des champions résultats France"],
  en: ["football Premier League results scores", "football England Scotland Wales Ireland results", "soccer USA Canada Australia results"],
  es: ["fútbol España LaLiga resultados", "fútbol Latinoamérica resultados", "Champions League resultados fútbol"],
  de: ["Fußball Deutschland Bundesliga Ergebnisse", "Fußball Österreich Schweiz Ergebnisse", "Champions League Ergebnisse"],
  it: ["calcio Italia Serie A risultati", "Champions League calcio risultati"],
  nl: ["voetbal Nederland Eredivisie uitslagen", "voetbal België uitslagen", "Champions League uitslagen"],
  pt: ["futebol Portugal resultados", "futebol Brasil resultados", "Champions League resultados"],
  pl: ["piłka nożna Polska wyniki", "Liga Mistrzów wyniki piłka nożna"],
  da: ["fodbold Danmark resultater", "Champions League fodbold resultater"],
  no: ["fotball Norge resultater", "Champions League fotball resultater"],
  sv: ["fotboll Sverige resultat", "Champions League fotboll resultat"],
  is: ["fótbolti Ísland úrslit", "Champions League football results"],
  cs: ["fotbal Česko výsledky", "Liga mistrů fotbal výsledky"],
  ro: ["fotbal România rezultate", "Champions League rezultate"],
  sr: ["fudbal Srbija rezultati", "Liga šampiona rezultati"],
  hr: ["nogomet Hrvatska rezultati", "Liga prvaka rezultati"],
  ru: ["футбол результаты", "Лига чемпионов результаты"],
  tr: ["futbol Türkiye sonuçları", "Şampiyonlar Ligi sonuçları"],
  ar: ["نتائج كرة القدم", "دوري أبطال أوروبا نتائج"],
  hi: ["football India results", "football Asia results", "Champions League results"],
  ja: ["サッカー 試合 結果", "Jリーグ 結果", "チャンピオンズリーグ 結果"],
  zh: ["足球 比赛 结果 中国", "中超 结果", "欧冠 足球 结果"],
};


const LOCALE_REGION_TERMS: Record<string, string> = {
  fr: "France francophonie Europe",
  en: "UK Ireland USA Canada Australia New Zealand",
  es: "España Latinoamérica Caribe",
  de: "Deutschland Österreich Schweiz DACH",
  it: "Italia Europa",
  nl: "Nederland België Benelux",
  pt: "Portugal Brasil lusófono",
  pl: "Polska Europa",
  da: "Danmark Nordic Baltic",
  no: "Norge Nordic Baltic",
  sv: "Sverige Nordic Baltic",
  is: "Ísland Nordic",
  cs: "Česko Slovensko Europe",
  ro: "România Eastern Europe",
  sr: "Srbija Balkan",
  hr: "Hrvatska Balkan",
  ru: "Eastern Europe",
  tr: "Türkiye Europe Middle East",
  ar: "Middle East Arab",
  hi: "India South Asia",
  ja: "Japan Asia",
  zh: "China Asia",
};



type NewsEdition = {
  hl: string;
  gl: string;
  ceid: string;
  label: string;
};

type IntelligenceFeedPlan = {
  query: string;
  edition: NewsEdition;
  scope: IntelligenceScope;
  scopeLabel: string;
  recencyDays: number;
};

const WORLD_NEWS_EDITIONS: NewsEdition[] = [
  { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Monde" },
  { hl: "en-US", gl: "US", ceid: "US:en", label: "Monde" },
];

const REGIONAL_SCOPE_BY_LANG: Record<string, { label: string; edition: NewsEdition; queries: string[] }> = {
  fr: {
    label: "Europe",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Europe" },
    queries: ["darts Europe PDC WDF European Tour results scores", "darts Europe tournament results"],
  },
  en: {
    label: "Anglophone",
    edition: { hl: "en-US", gl: "US", ceid: "US:en", label: "Anglophone" },
    queries: ["darts UK Ireland USA Canada Australia New Zealand results", "darts CDC Australia New Zealand WDF results"],
  },
  es: {
    label: "Espagne + Amérique latine",
    edition: { hl: "es-419", gl: "MX", ceid: "MX:es-419", label: "Espagne + Amérique latine" },
    queries: ["dardos España Latinoamérica Caribe resultados", "darts CDLC Latin America Caribbean results"],
  },
  de: {
    label: "Europe DACH",
    edition: { hl: "de", gl: "DE", ceid: "DE:de", label: "Europe DACH" },
    queries: ["Darts Europa Deutschland Österreich Schweiz Ergebnisse", "PDC Europe WDF Ergebnisse"],
  },
  it: {
    label: "Europe",
    edition: { hl: "it", gl: "IT", ceid: "IT:it", label: "Europe" },
    queries: ["darts Europa risultati PDC WDF", "freccette Europa risultati"],
  },
  nl: {
    label: "Benelux + Europe",
    edition: { hl: "nl", gl: "NL", ceid: "NL:nl", label: "Benelux + Europe" },
    queries: ["darts Benelux Europa uitslagen PDC WDF", "darts België Nederland uitslagen"],
  },
  pt: {
    label: "Portugal + Brésil",
    edition: { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419", label: "Portugal + Brésil" },
    queries: ["dardos Portugal Brasil resultados", "darts resultados Europa Brasil"],
  },
  pl: {
    label: "Europe",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Europe" },
    queries: ["darts Poland Europe WDF results", "PDC Europe darts results"],
  },
  da: {
    label: "Nordique + Baltique",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Nordique + Baltique" },
    queries: ["PDC Nordic Baltic darts results", "Denmark Sweden Norway Finland darts results"],
  },
  no: {
    label: "Nordique + Baltique",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Nordique + Baltique" },
    queries: ["PDC Nordic Baltic darts results", "Norway Sweden Denmark darts results"],
  },
  sv: {
    label: "Nordique + Baltique",
    edition: { hl: "sv", gl: "SE", ceid: "SE:sv", label: "Nordique + Baltique" },
    queries: ["PDC Nordic Baltic dart resultat", "Sverige Norge Danmark dart resultat"],
  },
  is: {
    label: "Nordique + Baltique",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Nordique + Baltique" },
    queries: ["PDC Nordic Baltic darts results", "Iceland Nordic darts results"],
  },
  cs: {
    label: "Europe centrale",
    edition: { hl: "cs", gl: "CZ", ceid: "CZ:cs", label: "Europe centrale" },
    queries: ["šipky Česko Slovensko Evropa výsledky", "WDF Central Europe darts results"],
  },
  ro: {
    label: "Europe de l’Est",
    edition: { hl: "ro", gl: "RO", ceid: "RO:ro", label: "Europe de l’Est" },
    queries: ["darts România Europa rezultate", "WDF Eastern Europe darts results"],
  },
  sr: {
    label: "Balkans + Europe",
    edition: { hl: "sr", gl: "RS", ceid: "RS:sr", label: "Balkans + Europe" },
    queries: ["pikado Srbija Balkan rezultati", "WDF Balkans darts results"],
  },
  hr: {
    label: "Balkans + Europe",
    edition: { hl: "hr", gl: "HR", ceid: "HR:hr", label: "Balkans + Europe" },
    queries: ["pikado Hrvatska Balkan rezultati", "WDF Balkans darts results"],
  },
  ru: {
    label: "Europe de l’Est",
    edition: { hl: "en-GB", gl: "GB", ceid: "GB:en", label: "Europe de l’Est" },
    queries: ["darts Eastern Europe WDF results", "darts Europe results"],
  },
  tr: {
    label: "Europe + Moyen-Orient",
    edition: { hl: "tr", gl: "TR", ceid: "TR:tr", label: "Europe + Moyen-Orient" },
    queries: ["dart Türkiye Avrupa sonuçları", "darts Middle East Europe results"],
  },
  ar: {
    label: "Moyen-Orient",
    edition: { hl: "ar", gl: "AE", ceid: "AE:ar", label: "Moyen-Orient" },
    queries: ["الدارتس الشرق الأوسط نتائج", "darts Middle East Arab results"],
  },
  hi: {
    label: "Asie",
    edition: { hl: "en-IN", gl: "IN", ceid: "IN:en", label: "Asie" },
    queries: ["darts Asia India WDF results", "PDC Asian Tour darts results"],
  },
  ja: {
    label: "Asie",
    edition: { hl: "ja", gl: "JP", ceid: "JP:ja", label: "Asie" },
    queries: ["ダーツ アジア 結果 PDC WDF", "PDC Asian Tour darts results"],
  },
  zh: {
    label: "Asie",
    edition: { hl: "en-SG", gl: "SG", ceid: "SG:en", label: "Asie" },
    queries: ["darts China Asia PDC WDF results", "PDC Asian Tour darts results"],
  },
};

function globalQueriesFor(sport: string) {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const domains = SPORT_SOURCE_DOMAINS[sport] || spec.domains || [];
  const out = [
    `${spec.query} worldwide results scores`,
    `${spec.query} world live fixtures`,
    `${spec.label} latest news results rankings performance`,
    ...domains.slice(0, 8).map((domain) => `site:${domain} ${spec.label} results news`),
  ];
  if (sport === "darts") out.push("darts PDC WDF MODUS worldwide results scores", "PDC European Tour Players Championship results");
  if (sport === "foot") out.push("football FIFA UEFA worldwide results scores", "Champions League Premier League LaLiga Bundesliga Serie A Ligue 1 results");
  if (sport === "padel") out.push("Premier Padel FIP Tour results finals rankings", "padel world cup results FIP");
  if (sport === "pingpong") out.push("WTT ITTF results champions rankings", "table tennis Europe Asia results");
  if (sport === "badminton") out.push("BWF World Tour results winners rankings", "Badminton Europe results", "BWF tournamentsoftware scores draws results");
  if (sport === "petanque") out.push("FIPJP CEP petanque world european championship results", "petanque national tour results France Europe world");
  if (sport === "molkky") out.push("Molkky world championship results Molkkify", "Molkky European championship results");
  if (sport === "babyfoot") out.push("ITSF World Series table soccer results rankings", "foosball world cup results ITSF");
  if (sport === "cornhole") out.push("ACL cornhole results brackets rankings", "ACO cornhole world championship results");
  if (sport === "bowling") out.push("PBA IBF ETBF bowling results standings", "bowling world championships results");
  if (sport === "palet") out.push("palet Coupe de France résultats FNSMR", "palet Vendée résultats championnat");
  return Array.from(new Set(out)).slice(0, 18);
}

function localQueriesFor(sport: string, lang: string) {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const code = String(lang || "fr").toLowerCase().split(/[-_]/)[0];
  const base: string[] = [];
  if (sport === "darts") base.push(...(DARTS_LOCALE_QUERY_PACKS[code] || DARTS_LOCALE_QUERY_PACKS.en || []));
  else if (sport === "foot") base.push(...(FOOT_LOCALE_QUERY_PACKS[code] || FOOT_LOCALE_QUERY_PACKS.en || []));
  else {
    const localTerms = LOCALE_REGION_TERMS[code] || LOCALE_REGION_TERMS.en;
    base.push(
      `${spec.query} ${localTerms} results scores`,
      `${spec.label} ${localTerms} latest news performance rankings`,
      `${spec.label} ${localTerms} calendar fixtures championship tournament`,
    );
  }

  const mediaDomains = MEDIA_DOMAINS_BY_LANG[code] || MEDIA_DOMAINS_BY_LANG.en || [];
  for (const domain of mediaDomains.slice(0, 3)) {
    base.push(`site:${domain} ${spec.label} results news`);
  }
  return Array.from(new Set(base)).slice(0, 7);
}

function intelligenceFeedPlansFor(sport: string, lang: string): IntelligenceFeedPlan[] {
  const code = String(lang || "fr").toLowerCase().split(/[-_]/)[0];
  const localEdition = { ...localeForNews(lang), label: "Local" };
  const regional = REGIONAL_SCOPE_BY_LANG[code] || REGIONAL_SCOPE_BY_LANG.en;
  const plans: IntelligenceFeedPlan[] = [];

  localQueriesFor(sport, lang).forEach((query) => {
    plans.push({ query, edition: localEdition, scope: "local", scopeLabel: code.toUpperCase(), recencyDays: 120 });
  });

  const regionalQueries = sport === "darts"
    ? regional.queries
    : [
        `${INTELLIGENCE_SPECS[sport]?.query || sport} ${regional.label} results`,
        `${INTELLIGENCE_SPECS[sport]?.query || sport} ${regional.label} latest news`,
        `${INTELLIGENCE_SPECS[sport]?.label || sport} Europe Asia Americas results rankings`,
      ];
  regionalQueries.slice(0, 3).forEach((query) => {
    plans.push({ query, edition: regional.edition, scope: "regional", scopeLabel: regional.label, recencyDays: 90 });
  });

  globalQueriesFor(sport).forEach((query, index) => {
    plans.push({
      query,
      edition: WORLD_NEWS_EDITIONS[index % WORLD_NEWS_EDITIONS.length],
      scope: "world",
      scopeLabel: "Monde",
      recencyDays: 90,
    });
  });

  const seen = new Set<string>();
  return plans.filter((plan) => {
    const key = `${plan.scope}|${plan.edition.gl}|${plan.query.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 28);
}

function coreIntelligenceFeedPlansFor(sport: string, lang: string): IntelligenceFeedPlan[] {
  const all = intelligenceFeedPlansFor(sport, lang);
  const local = all.filter((plan) => plan.scope === "local").slice(0, 4);
  const regional = all.filter((plan) => plan.scope === "regional").slice(0, 4);
  const world = all.filter((plan) => plan.scope === "world").slice(0, 5);
  return [...local, ...regional, ...world];
}

// Kept for diagnostics / AI prompt metadata.
function intelligenceQueriesFor(sport: string, lang: string) {
  return intelligenceFeedPlansFor(sport, lang).map((plan) => plan.query);
}

function stripTags(value: string) {
  return decodeHtml(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function xmlTag(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? stripTags(m[1]) : "";
}

function xmlSource(block: string) {
  const m = block.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i);
  return m ? stripTags(m[1]) : "";
}

function absoluteHttpUrl(value: string, base?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = base ? new URL(raw, base) : new URL(raw);
    return /^https?:$/i.test(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function xmlImage(block: string) {
  const media = block.match(/<(?:media:content|media:thumbnail)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (media) return absoluteHttpUrl(decodeHtml(media[1]));
  const enclosure = block.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']+["'][^>]*>/i);
  if (enclosure) return absoluteHttpUrl(decodeHtml(enclosure[1]));
  const description = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "";
  const img = description.match(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return img ? absoluteHttpUrl(decodeHtml(img[1])) : null;
}

function ogImageFromHtml(html: string, pageUrl: string) {
  const head = String(html || "").slice(0, 220_000);
  const patterns = [
    /<meta\b[^>]*property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta\b[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["'][^>]*>/i,
  ];
  for (const pattern of patterns) {
    const match = head.match(pattern);
    if (match?.[1]) {
      const url = absoluteHttpUrl(decodeHtml(match[1]), pageUrl);
      if (url) return url;
    }
  }
  return null;
}

async function fetchNewsImage(sourceUrl: string | null | undefined) {
  const url = absoluteHttpUrl(String(sourceUrl || ""));
  if (!url) return null;
  try {
    const response = await timedFetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0",
      },
    }, 2200);
    if (!response.ok) return null;
    const type = String(response.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) return null;
    const html = await response.text();
    return ogImageFromHtml(html, response.url || url);
  } catch {
    return null;
  }
}

async function enrichNewsImages(rows: IntelligenceNews[]) {
  // Media enrichment is DEEP-only. Enrich a useful newspaper-sized front page,
  // but cap concurrency so a slow publisher can never stall the whole response.
  const limit = Math.min(24, rows.length);
  const enriched = rows.slice();
  for (let start = 0; start < limit; start += 6) {
    const batch = rows.slice(start, Math.min(start + 6, limit));
    const resolved = await Promise.all(batch.map(async (row) => {
      if (row.imageUrl) return row;
      const imageUrl = await fetchNewsImage(row.sourceUrl);
      return imageUrl ? { ...row, imageUrl } : row;
    }));
    resolved.forEach((row, index) => { enriched[start + index] = row; });
  }
  return enriched;
}

function classifyHeadline(title: string, summary = ""): IntelligenceKind {
  const text = `${title} ${summary}`.toLowerCase();
  if (/\b(live|en direct|direct live|livescore|live score)\b/.test(text)) return "live";
  if (/\b(result|results|résultat|résultats|wins?|winner|champion|beats?|defeats?|claims?|clinches?|edges?|victory|final score|score final|s'impose|remporte|vainqueur)\b/.test(text)) return "result";
  if (/\b(schedule|calendar|fixture|upcoming|draw|programme|calendrier|à venir|prochain|next tournament|entries)\b/.test(text)) return "upcoming";
  return "news";
}

function normalizeHeadlineKey(value: string) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
}

function explicitScoreFromText(value: string): string | null {
  const text = String(value || "");
  const match = text.match(/(?:^|\s|\()([0-9]{1,3})\s*[-–:]\s*([0-9]{1,3})(?=\s|\)|$)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

function uniqNews(rows: IntelligenceNews[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = normalizeHeadlineKey(row.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function diversifyNews(rows: IntelligenceNews[], max: number) {
  const unique = uniqNews(rows);
  const buckets = new Map<string, IntelligenceNews[]>();
  unique.forEach((row) => {
    const key = `${row.scope || "world"}|${String(row.sourceName || "WEB").toLowerCase()}`;
    const bucket = buckets.get(key) || []; bucket.push(row); buckets.set(key, bucket);
  });
  const keys = Array.from(buckets.keys());
  const out: IntelligenceNews[] = [];
  let index = 0;
  while (out.length < max && keys.some((key) => index < (buckets.get(key)?.length || 0))) {
    for (const key of keys) {
      const row = buckets.get(key)?.[index];
      if (row) out.push(row);
      if (out.length >= max) break;
    }
    index += 1;
  }
  return out;
}


async function directEditorialIntelligence(sport: string, maxPages = 6): Promise<IntelligenceNews[]> {
  const pages = (DIRECT_EDITORIAL_PAGES[sport] || []).slice(0, Math.max(1, maxPages));
  if (!pages.length) return [];
  const settled = await Promise.allSettled(pages.map(async (page, pageIndex) => {
    const response = await timedFetch(page.url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0 (+https://multisports-scoring.pages.dev)",
      },
    }, 3200);
    if (!response.ok) throw new Error(`${page.sourceName} HTTP ${response.status}`);
    const html = await response.text();
    const rows: IntelligenceNews[] = [];
    const seen = new Set<string>();
    const anchorRx = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = anchorRx.exec(html)) && rows.length < 28) {
      const href = absoluteHttpUrl(decodeHtml(match[1]), response.url || page.url);
      const anchorHtml = match[2];
      const title = stripTags(anchorHtml);
      const key = normalizeHeadlineKey(title);
      if (!href || title.length < 28 || title.length > 220 || !key || seen.has(key)) continue;
      if (/^(home|news|results|resultats|calendar|calendrier|ranking|rankings|read more|voir plus|view all|menu|contact|login|sign in)$/i.test(title)) continue;
      if (/privacy|cookie|terms|newsletter|facebook|instagram|youtube|twitter|linkedin/i.test(title)) continue;
      seen.add(key);
      const kind = classifyHeadline(title, "");
      const explicitScore = explicitScoreFromText(title);
      rows.push({
        id: `direct-${sport}-${pageIndex}-${rows.length}-${key.replace(/\s+/g, "-").slice(0, 42)}`,
        title,
        summary: `${page.sourceName} · publication officielle`,
        publishedAt: null,
        sourceName: page.sourceName,
        sourceUrl: href,
        imageUrl: (() => {
          const img = anchorHtml.match(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/i)?.[1];
          return img ? absoluteHttpUrl(decodeHtml(img), response.url || page.url) : null;
        })(),
        kind,
        resultLabel: kind === "result" ? (explicitScore ? `Score ${explicitScore}` : "Résultat publié") : null,
        scope: page.scope,
        scopeLabel: page.scopeLabel,
      });
    }
    return rows;
  }));
  return uniqNews(settled.flatMap((item) => item.status === "fulfilled" ? item.value : [])).slice(0, 72);
}


async function genericRssIntelligence(url: string, sourceName: string, scope: IntelligenceScope, scopeLabel: string, sport: string, limit = 36): Promise<IntelligenceNews[]> {
  try {
    const response = await timedFetch(url, {
      redirect: "follow",
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    }, 2800);
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, limit);
    return items.map((match, index) => {
      const block = match[1];
      const title = xmlTag(block, "title");
      const summary = xmlTag(block, "description");
      const publishedRaw = xmlTag(block, "pubDate");
      const parsed = new Date(publishedRaw);
      const publishedAt = Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
      const sourceUrl = xmlTag(block, "link") || null;
      const imageUrl = xmlImage(block);
      const kind = classifyHeadline(title, summary);
      const explicitScore = explicitScoreFromText(`${title} ${summary}`);
      return {
        id: `rss-${sport}-${sourceName}-${index}-${normalizeHeadlineKey(title).replace(/\s+/g, "-").slice(0, 42)}`,
        title,
        summary: summary && summary !== title ? summary.slice(0, 320) : null,
        publishedAt,
        sourceName,
        sourceUrl,
        imageUrl,
        kind,
        resultLabel: kind === "result" ? (explicitScore ? `Score ${explicitScore}` : "Résultat publié") : null,
        scope,
        scopeLabel,
      } satisfies IntelligenceNews;
    }).filter((row) => row.title.length >= 8);
  } catch {
    return [];
  }
}

async function directDartsNewsFeeds(): Promise<IntelligenceNews[]> {
  const feeds = await Promise.allSettled([
    genericRssIntelligence("https://dartsnews.com/sitemap/news.xml", "DartsNews", "world", "Monde", "darts", 72),
    genericRssIntelligence("https://www.live-darts.com/feed/", "LiveDarts", "world", "Monde", "darts", 56),
    genericRssIntelligence("https://champdarts.com/feed/", "CDC", "regional", "Amérique du Nord / Caraïbes", "darts", 48),
    genericRssIntelligence("https://www.ffdarts.fr/feed/", "FFDarts", "local", "France", "darts", 40),
    genericRssIntelligence("https://www.thesun.co.uk/sport/darts/feed/", "The Sun Darts", "world", "Monde", "darts", 28),
  ]);
  return uniqNews(feeds.flatMap((row) => row.status === "fulfilled" ? row.value : []))
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, 120);
}

async function padelFipFinalEvents(): Promise<NormalEvent[]> {
  try {
    const url = "https://www.padelfip.com/titles-and-finals/";
    const html = await fetchOfficialHtml(url);
    const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].slice(0, 90);
    const events: NormalEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
      const text = stripTags(rows[i][1]);
      const score = text.match(/\b\d{1,2}\s*-\s*\d{1,2}(?:\s*\/\s*\d{1,2}\s*-\s*\d{1,2})+/)?.[0]?.replace(/\s+/g, "") || null;
      if (!score || text.length < 20) continue;
      events.push({
        id: `padel-fip-final-${i}-${normalizeHeadlineKey(text).slice(0, 36)}`,
        title: text.slice(0, 210),
        subtitle: "FIP · Titles & Finals",
        startsAt: null,
        dateLabel: null,
        status: "result",
        sourceName: "FIP Padel",
        sourceUrl: url,
        resultLabel: score,
      });
      if (events.length >= 36) break;
    }
    return events;
  } catch {
    return [];
  }
}

function localeForNews(lang: string) {
  const code = String(lang || "fr").toLowerCase().split(/[-_]/)[0];
  const map: Record<string, { hl: string; gl: string; ceid: string }> = {
    fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
    en: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
    es: { hl: "es", gl: "ES", ceid: "ES:es" },
    de: { hl: "de", gl: "DE", ceid: "DE:de" },
    it: { hl: "it", gl: "IT", ceid: "IT:it" },
    nl: { hl: "nl", gl: "NL", ceid: "NL:nl" },
    pt: { hl: "pt-PT", gl: "PT", ceid: "PT:pt-150" },
    pl: { hl: "pl", gl: "PL", ceid: "PL:pl" },
    da: { hl: "da", gl: "DK", ceid: "DK:da" },
    no: { hl: "no", gl: "NO", ceid: "NO:no" },
    sv: { hl: "sv", gl: "SE", ceid: "SE:sv" },
    cs: { hl: "cs", gl: "CZ", ceid: "CZ:cs" },
    tr: { hl: "tr", gl: "TR", ceid: "TR:tr" },
    ru: { hl: "ru", gl: "RU", ceid: "RU:ru" },
    ja: { hl: "ja", gl: "JP", ceid: "JP:ja" },
    zh: { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" },
    ro: { hl: "ro", gl: "RO", ceid: "RO:ro" },
    sr: { hl: "sr", gl: "RS", ceid: "RS:sr" },
    hr: { hl: "hr", gl: "HR", ceid: "HR:hr" },
    ar: { hl: "ar", gl: "AE", ceid: "AE:ar" },
    hi: { hl: "hi", gl: "IN", ceid: "IN:hi" },
    is: { hl: "is", gl: "IS", ceid: "IS:is" },
  };
  return map[code] || map.en;
}


async function googleNewsIntelligence(sport: string, lang: string, depth: "core" | "deep" = "deep"): Promise<IntelligenceNews[]> {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const plans = depth === "core" ? coreIntelligenceFeedPlansFor(sport, lang) : intelligenceFeedPlansFor(sport, lang);

  const feeds = await Promise.allSettled(plans.map(async (plan, qIndex) => {
    const recencyQuery = `${plan.query} when:${plan.recencyDays}d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(recencyQuery)}&hl=${encodeURIComponent(plan.edition.hl)}&gl=${encodeURIComponent(plan.edition.gl)}&ceid=${encodeURIComponent(plan.edition.ceid)}`;
    const response = await timedFetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    }, 3500);
    if (!response.ok) throw new Error(`News RSS HTTP ${response.status}`);
    const xml = await response.text();
    const perFeedLimit = plan.scope === "local" ? 22 : plan.scope === "regional" ? 18 : 16;
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, perFeedLimit);
    return items.map((match, index) => {
      const block = match[1];
      let title = xmlTag(block, "title");
      const sourceName = xmlSource(block) || "Actualité web";
      const suffix = ` - ${sourceName}`;
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length).trim();
      const summary = xmlTag(block, "description");
      const publishedRaw = xmlTag(block, "pubDate");
      const parsed = new Date(publishedRaw);
      const publishedAt = Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
      const sourceUrl = xmlTag(block, "link") || null;
      const imageUrl = xmlImage(block);
      const kind = classifyHeadline(title, summary);
      const explicitScore = explicitScoreFromText(`${title} ${summary}`);
      return {
        id: `news-${sport}-${plan.scope}-${qIndex}-${index}-${normalizeHeadlineKey(title).replace(/\s+/g, "-").slice(0, 42)}`,
        title,
        summary: summary && summary !== title ? summary.slice(0, 320) : null,
        publishedAt,
        sourceName,
        sourceUrl,
        imageUrl,
        kind,
        resultLabel: kind === "result" ? (explicitScore ? `Score ${explicitScore}` : "Résultat publié") : null,
        scope: plan.scope,
        scopeLabel: plan.scopeLabel,
      } satisfies IntelligenceNews;
    }).filter((row) => row.title.length >= 8);
  }));

  const rows = feeds.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const unique = uniqNews(rows)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));

  // Guarantee visibility of LOCAL + REGIONAL + WORLD before filling with the newest remaining stories.
  const balanced: IntelligenceNews[] = [];
  const used = new Set<string>();
  for (const scope of ["local", "regional", "world"] as IntelligenceScope[]) {
    unique.filter((row) => row.scope === scope).slice(0, 8).forEach((row) => {
      if (!used.has(row.id)) {
        used.add(row.id);
        balanced.push(row);
      }
    });
  }
  unique.forEach((row) => {
    if (!used.has(row.id)) {
      used.add(row.id);
      balanced.push(row);
    }
  });

  return balanced.slice(0, 72);
}


function bingRealUrl(raw: string) {
  try {
    const url = new URL(raw);
    const real = url.searchParams.get("url");
    return absoluteHttpUrl(real ? decodeURIComponent(real) : raw) || absoluteHttpUrl(raw);
  } catch {
    return absoluteHttpUrl(raw);
  }
}

function bingMarket(edition: NewsEdition) {
  const hl = String(edition.hl || "en-US");
  if (hl.includes("-")) return hl;
  return `${hl}-${edition.gl || "US"}`;
}

async function bingNewsIntelligence(sport: string, lang: string, depth: "core" | "deep" = "deep"): Promise<IntelligenceNews[]> {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const plans = (depth === "core" ? coreIntelligenceFeedPlansFor(sport, lang) : intelligenceFeedPlansFor(sport, lang)).slice(0, depth === "core" ? 5 : 12);
  const feeds = await Promise.allSettled(plans.map(async (plan, qIndex) => {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(plan.query)}&format=rss&setmkt=${encodeURIComponent(bingMarket(plan.edition))}`;
    const response = await timedFetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    }, 3200);
    if (!response.ok) throw new Error(`Bing News RSS HTTP ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 12);
    return items.map((match, index) => {
      const block = match[1];
      const title = xmlTag(block, "title");
      const summary = xmlTag(block, "description");
      const publishedRaw = xmlTag(block, "pubDate");
      const parsed = new Date(publishedRaw);
      const publishedAt = Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
      const rawLink = xmlTag(block, "link");
      const sourceUrl = bingRealUrl(rawLink);
      const sourceName = xmlSource(block) || "Bing News";
      const imageUrl = xmlImage(block);
      const kind = classifyHeadline(title, summary);
      const explicitScore = explicitScoreFromText(`${title} ${summary}`);
      return {
        id: `bing-${sport}-${plan.scope}-${qIndex}-${index}-${normalizeHeadlineKey(title).replace(/\s+/g, "-").slice(0, 42)}`,
        title,
        summary: summary && summary !== title ? summary.slice(0, 320) : null,
        publishedAt,
        sourceName,
        sourceUrl,
        imageUrl,
        kind,
        resultLabel: kind === "result" ? (explicitScore ? `Score ${explicitScore}` : "Résultat publié") : null,
        scope: plan.scope,
        scopeLabel: plan.scopeLabel,
      } satisfies IntelligenceNews;
    }).filter((row) => row.title.length >= 8);
  }));
  return uniqNews(feeds.flatMap((result) => result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")))
    .slice(0, 60);
}

async function yahooSoccerNews(lang: string): Promise<IntelligenceNews[]> {
  try {
    const response = await timedFetch("https://sports.yahoo.com/soccer/rss/", {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    }, 3200);
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 28);
    return items.map((match, index) => {
      const block = match[1];
      const title = xmlTag(block, "title");
      const summary = xmlTag(block, "description");
      const publishedRaw = xmlTag(block, "pubDate");
      const parsed = new Date(publishedRaw);
      const publishedAt = Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
      const sourceUrl = absoluteHttpUrl(xmlTag(block, "link"));
      const imageUrl = xmlImage(block);
      const kind = classifyHeadline(title, summary);
      const explicitScore = explicitScoreFromText(`${title} ${summary}`);
      return {
        id: `yahoo-foot-${index}-${normalizeHeadlineKey(title).replace(/\s+/g, "-").slice(0, 42)}`,
        title,
        summary: summary && summary !== title ? summary.slice(0, 320) : null,
        publishedAt,
        sourceName: "Yahoo Sports",
        sourceUrl,
        imageUrl,
        kind,
        resultLabel: kind === "result" ? (explicitScore ? `Score ${explicitScore}` : "Résultat publié") : null,
        scope: "world" as IntelligenceScope,
        scopeLabel: "Monde",
      } satisfies IntelligenceNews;
    }).filter((row) => row.title.length >= 8);
  } catch {
    return [];
  }
}

function extractOpenAIText(body: any): string {
  if (typeof body?.output_text === "string" && body.output_text.trim()) return body.output_text.trim();
  for (const item of arr(body?.output)) {
    if (item?.type !== "message") continue;
    for (const content of arr(item?.content)) {
      if ((content?.type === "output_text" || content?.type === "text") && typeof content?.text === "string") return content.text.trim();
    }
  }
  return "";
}

function parseAiJson(text: string): any {
  const clean = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(clean.slice(start, end + 1)); } catch { return null; }
}

async function openAiWebIntelligence(env: Env, sport: string, lang: string): Promise<IntelligenceNews[]> {
  const key = str(env?.OPENAI_API_KEY).trim();
  const spec = INTELLIGENCE_SPECS[sport];
  if (!key || !spec) return [];
  const model = str(env?.LIVE_INTELLIGENCE_MODEL).trim() || "gpt-6-luna";
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. Search the web broadly for the latest verified ${spec.label} competition news, official match results, current live events, rankings/performances and upcoming official events from the last 30 days and the next 30 days. Cover the user-language area AND Europe/continental circuits AND the rest of the world; never let one country or one federation dominate. For darts explicitly include PDC, WDF, MODUS, DartConnect/DCTV, CDC North America/Latin America, PDC Nordic & Baltic, France, Benelux/DACH, Australia and New Zealand when relevant. Prioritize official federation/tour sources and reputable specialist sports media. Return ONLY valid JSON with this exact shape: {"items":[{"title":"...","summary":"...","publishedAt":"ISO date or null","sourceName":"...","sourceUrl":"https://...","imageUrl":"https://... or null","kind":"news|result|live|upcoming","resultLabel":"explicit published score/result or null","scope":"local|regional|world","scopeLabel":"country/region/world label"}]}. Maximum 40 items. ALWAYS cover three mandatory scopes: (1) local sources relevant to the requested language/country, (2) regional/continental sources, and (3) worldwide sources and major international circuits. The selected language is a priority, never a geographic filter. For example fr must include France/francophone + Europe + World; zh must include China + Asia + World; ja must include Japan + Asia + World; en must include UK/Ireland + North America + Oceania + World. IMPORTANT: never invent a score, winner, date or live status. resultLabel may contain a numeric score ONLY when a searched source explicitly states that score. Language for title/summary: ${lang || "fr"}.`;
  const response = await timedFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: prompt,
    }),
  }, 7500);
  if (!response.ok) throw new Error(`OpenAI web search HTTP ${response.status}`);
  const body = await response.json().catch(() => null) as any;
  const parsed = parseAiJson(extractOpenAIText(body));
  const rows = arr(parsed?.items).map((item, index): IntelligenceNews | null => {
    const title = str(item?.title).trim();
    const sourceUrl = str(item?.sourceUrl).trim();
    if (!title || !/^https:\/\//i.test(sourceUrl)) return null;
    const requested = str(item?.kind).toLowerCase();
    const kind: IntelligenceKind = (["news", "result", "live", "upcoming"] as string[]).includes(requested) ? requested as IntelligenceKind : classifyHeadline(title, str(item?.summary));
    const date = new Date(str(item?.publishedAt));
    return {
      id: `ai-${sport}-${index}-${normalizeHeadlineKey(title).replace(/\s+/g, "-").slice(0, 42)}`,
      title,
      summary: str(item?.summary).trim().slice(0, 320) || null,
      publishedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null,
      sourceName: str(item?.sourceName).trim() || "Web",
      sourceUrl,
      imageUrl: absoluteHttpUrl(str(item?.imageUrl)) || null,
      kind,
      resultLabel: kind === "result" ? (str(item?.resultLabel).trim().slice(0, 120) || "Résultat publié") : null,
      scope: (["local", "regional", "world"] as string[]).includes(str(item?.scope).toLowerCase()) ? str(item?.scope).toLowerCase() as IntelligenceScope : "world",
      scopeLabel: str(item?.scopeLabel).trim().slice(0, 80) || "Monde",
    };
  }).filter(Boolean) as IntelligenceNews[];
  return uniqNews(rows).slice(0, 24);
}

function parseLeadingScoreName(line: string) {
  const m = String(line || "").trim().match(/^(\d{1,2})\s+(.{2,90})$/);
  if (!m) return null;
  const score = Number(m[1]);
  const name = m[2].trim();
  if (!Number.isFinite(score) || !name || /^match\b/i.test(name)) return null;
  return { score, name };
}

function parseTrailingScoreName(line: string) {
  const m = String(line || "").trim().match(/^(.{2,100}?)\s+(\d{1,2})$/);
  if (!m) return null;
  const score = Number(m[2]);
  const name = m[1].trim();
  if (!Number.isFinite(score) || !name || /^match\b/i.test(name)) return null;
  return { score, name };
}


function cleanDartsInfoName(value: string) {
  return String(value || "")
    .replace(/[🏴🇦-🇿]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:Latest results|Event Results|All results|Recently finished)\s*/i, "")
    .trim()
    .slice(0, 90);
}

function parseDartsInfoResults(html: string): NormalResult[] {
  const lines = htmlLines(html);
  const out: NormalResult[] = [];
  let competition = "DartsInfo · résultats récents";
  for (let i = 0; i < lines.length && out.length < 80; i += 1) {
    const line = lines[i];
    const eventLabel = line.match(/^Latest results\s+(.{4,100})$/i);
    if (eventLabel) {
      competition = eventLabel[1].trim();
      continue;
    }
    const score = line.match(/(\d{1,2})\s*[–—-]\s*(\d{1,2})/);
    if (!score || score.index == null) continue;
    const left = cleanDartsInfoName(line.slice(0, score.index));
    let tail = line.slice(score.index + score[0].length).trim();
    tail = tail.split(/(?:→|·\s*(?:Final|Semi|Quarter|Last|Round|Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b)/i)[0];
    const right = cleanDartsInfoName(tail);
    if (left.length < 2 || right.length < 2 || left.length > 90 || right.length > 90) continue;
    const aScore = Number(score[1]);
    const bScore = Number(score[2]);
    if (!Number.isFinite(aScore) || !Number.isFinite(bScore) || aScore === bScore) continue;
    const winner = aScore > bScore ? { name: left, score: aScore } : { name: right, score: bScore };
    const loser = aScore > bScore ? { name: right, score: bScore } : { name: left, score: aScore };
    out.push({
      id: `dartsinfo-${i}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 120),
      playedOn: null,
      competition,
      round: null,
      winner,
      loser,
      raw: { source: "DartsInfo", sourceUrl: "https://dartsinfo.co.uk/" },
      sourceName: "DartsInfo", sourceUrl: "https://dartsinfo.co.uk/",
    });
  }
  return out;
}

function cleanScoreSide(value: string) {
  return String(value || "")
    .replace(/\(\d{1,3}\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:Quarterfinals?|Semifinals?|Final|Round of \d+|Last \d+)\s*/i, "")
    .trim()
    .slice(0, 100);
}

function parseGenericDartsScoreLines(html: string, sourceName: string, sourceUrl: string, competition: string, limit = 90): NormalResult[] {
  const lines = htmlLines(html);
  const out: NormalResult[] = [];
  let round: string | null = null;
  for (let i = 0; i < lines.length && out.length < limit; i += 1) {
    const line = lines[i];
    if (/^(quarter-?finals?|semi-?finals?|final|round (?:of )?\d+|last \d+)$/i.test(line)) { round = line; continue; }
    const match = line.match(/^(.{2,100}?)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(.{2,100})$/);
    if (!match) continue;
    const left = cleanScoreSide(match[1]);
    const right = cleanScoreSide(match[4]);
    const aScore = Number(match[2]);
    const bScore = Number(match[3]);
    if (!left || !right || left === right || aScore === bScore || /^(october|september|august|july|june|may|april|march|february|january)\b/i.test(left)) continue;
    const winner = aScore > bScore ? { name: left, score: aScore } : { name: right, score: bScore };
    const loser = aScore > bScore ? { name: right, score: bScore } : { name: left, score: aScore };
    out.push({
      id: `${sourceName}-${i}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 120),
      playedOn: null, competition, round, winner, loser,
      raw: { source: sourceName, sourceUrl }, sourceName, sourceUrl,
    });
  }
  return out;
}

function parseDartsNzResults(html: string): NormalResult[] {
  const lines = htmlLines(html);
  const out: NormalResult[] = [];
  let section = "Darts New Zealand";
  let round: string | null = null;
  let pending: { score: number; name: string; index: number } | null = null;
  const roundRx = /^(Last\s+\d+|Quarter-?finals?|Semi-?finals?|Final)$/i;
  const sectionRx = /^(Mens|Ladies|Mixed|Open|Youth|Junior|Pairs|Teams?).{0,70}$/i;
  for (let i = 0; i < lines.length && out.length < 180; i += 1) {
    const line = lines[i];
    if (sectionRx.test(line) && !roundRx.test(line)) {
      section = line.slice(0, 90);
      pending = null;
      continue;
    }
    if (roundRx.test(line)) {
      round = line.replace(/^Quarterfinals$/i, "Quarter-finals").replace(/^Semifinals$/i, "Semi-finals");
      pending = null;
      continue;
    }
    if (/^Winner$/i.test(line)) { pending = null; continue; }
    if (!round) continue;
    const candidate = parseTrailingScoreName(line);
    if (!candidate) continue;
    if (!pending) { pending = { ...candidate, index: i }; continue; }
    const a = pending;
    const b = candidate;
    pending = null;
    if (a.name === b.name || a.score === b.score) continue;
    const winner = a.score > b.score ? a : b;
    const loser = a.score > b.score ? b : a;
    out.push({
      id: `dartsnz-${section}-${round}-${a.index}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 150),
      playedOn: null,
      competition: `Darts New Zealand · ${section}`,
      round,
      winner: { name: winner.name, score: winner.score, countryCode: "NZ" },
      loser: { name: loser.name, score: loser.score, countryCode: "NZ" },
      raw: { source: "Darts New Zealand", sourceUrl: "https://dartsnz.nz/results/" },
      sourceName: "Darts New Zealand", sourceUrl: "https://dartsnz.nz/results/",
    });
  }
  return uniqNormalResults(out);
}

const DARTS_COUNTRY_CODES: Record<string, string> = {
  "england":"GB", "scotland":"GB", "wales":"GB", "northern ireland":"GB", "ireland":"IE",
  "netherlands":"NL", "germany":"DE", "belgium":"BE", "australia":"AU", "new zealand":"NZ",
  "canada":"CA", "usa":"US", "united states":"US", "czechia":"CZ", "czech republic":"CZ", "poland":"PL",
  "austria":"AT", "sweden":"SE", "denmark":"DK", "norway":"NO", "finland":"FI", "france":"FR",
  "spain":"ES", "italy":"IT", "portugal":"PT", "japan":"JP", "china":"CN"
};
const DARTS_COUNTRY_WORDS = new Set(Object.keys(DARTS_COUNTRY_CODES));
function parseAllThingsPlayerLine(line: string): NormalPlayer | null {
  let value = String(line || "").replace(/\s+/g, " ").trim();
  if (!value) return null;
  for (const country of Object.keys(DARTS_COUNTRY_CODES).sort((a, b) => b.length - a.length)) {
    const rx = new RegExp(`\\s+${country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (rx.test(value)) return { name: value.replace(rx, "").trim(), countryCode: DARTS_COUNTRY_CODES[country] };
  }
  return { name: value };
}
function plausibleDartsPlayerLine(line: string) {
  const value = String(line || "").trim();
  if (value.length < 3 || value.length > 80) return false;
  if (DARTS_COUNTRY_WORDS.has(value.toLowerCase())) return false;
  if (/^(final|result|semi|quarter|round|best of|match report|leg-by-leg|more match|archive|past pdc|completed|pdc match|today|yesterday|tomorrow|results)$/i.test(value)) return false;
  if (/^\d+(?:\.\d+)?%?$/.test(value) || /^\d{1,2}\s+\d{1,2}$/.test(value) || /^[A-Z]{1,3}$/.test(value)) return false;
  if (/(3-dart avg|180s|checkout|100\+|140\+|highest checkout)/i.test(value)) return false;
  return /[a-zÀ-ÿ]/i.test(value);
}

function parseAllThingsDartsResultPage(html: string, sourceUrl: string, fallbackCompetition = "PDC · résultats récents"): NormalResult[] {
  const lines = htmlLines(html);
  const out: NormalResult[] = [];
  for (let i = 0; i < lines.length && out.length < 180; i += 1) {
    const score = lines[i].match(/^(\d{1,2})\s+(\d{1,2})$/);
    if (!score || Number(score[1]) === Number(score[2])) continue;
    let left: NormalPlayer | null = null;
    let right: NormalPlayer | null = null;
    let competition = fallbackCompetition;
    let round: string | null = null;
    for (let j = i - 1; j >= Math.max(0, i - 7); j -= 1) {
      if (!left && plausibleDartsPlayerLine(lines[j])) left = parseAllThingsPlayerLine(lines[j]);
      if (/(championship|trophy|masters|grand prix|open|matchplay|world series|premier league)/i.test(lines[j])) {
        competition = lines[j].replace(/\s+(Final|Semi-finals?|Quarter-finals?|Round of \d+)$/i, "").trim().slice(0, 100) || fallbackCompetition;
        const rm = lines[j].match(/(Final|Semi-finals?|Quarter-finals?|Round of \d+)$/i);
        if (rm) round = rm[1];
        break;
      }
    }
    for (let j = i + 1; j <= Math.min(lines.length - 1, i + 7); j += 1) {
      if (plausibleDartsPlayerLine(lines[j])) { right = parseAllThingsPlayerLine(lines[j]); break; }
    }
    if (!left || !right || left.name === right.name) continue;
    const aScore = Number(score[1]);
    const bScore = Number(score[2]);
    const leftScored: NormalPlayer = { ...left, score: aScore };
    const rightScored: NormalPlayer = { ...right, score: bScore };
    const winner = aScore > bScore ? leftScored : rightScored;
    const loser = aScore > bScore ? rightScored : leftScored;
    out.push({
      id: `allthings-${competition}-${round || "match"}-${i}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 150),
      playedOn: null, competition, round, winner, loser,
      raw: { source: "All Things Darts", sourceUrl }, sourceName: "All Things Darts", sourceUrl,
    });
  }
  return uniqNormalResults(out);
}

async function allThingsDartsStructuredResults(): Promise<NormalResult[]> {
  const hub = "https://allthingsdarts.dartscores.co.uk/past-tournaments";
  try {
    const html = await fetchOfficialHtml(hub);
    const links: Array<{ url: string; title: string }> = [{ url: "https://allthingsdarts.dartscores.co.uk/results", title: "PDC · résultats récents" }];
    const seen = new Set(links.map((row) => row.url));
    const rx = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && links.length < 8) {
      const title = stripTags(m[2]).replace(/\s+/g, " ").trim();
      if (!/(players championship|championship|trophy|masters|grand prix|open|matchplay|world series)/i.test(title)) continue;
      const url = absoluteHttpUrl(decodeHtml(m[1]), hub);
      if (!url || seen.has(url) || !/allthingsdarts\.dartscores\.co\.uk/i.test(url)) continue;
      seen.add(url);
      links.push({ url, title: title.slice(0, 100) });
    }
    const settled = await Promise.allSettled(links.map(async ({ url, title }) => parseAllThingsDartsResultPage(await fetchOfficialHtml(url), url, title)));
    return uniqNormalResults(settled.flatMap((row) => row.status === "fulfilled" ? row.value : [])).slice(0, 300);
  } catch { return []; }
}

async function liveDartsStructuredResults(): Promise<NormalResult[]> {
  const hub = "https://www.live-darts.com/pdc-darts-news/";
  try {
    const html = await fetchOfficialHtml(hub);
    const links: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();
    const rx = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html)) && links.length < 7) {
      const title = stripTags(m[2]);
      if (!/(results|live scores|schedule of play|draw)/i.test(title) || !/2026|darts/i.test(title)) continue;
      const url = absoluteHttpUrl(decodeHtml(m[1]), hub);
      if (!url || seen.has(url) || !/live-darts\.com/i.test(url)) continue;
      seen.add(url); links.push({ url, title });
    }
    const settled = await Promise.allSettled(links.map(async ({ url, title }) => {
      const page = await fetchOfficialHtml(url);
      return parseGenericDartsScoreLines(page, "LiveDarts", url, title.replace(/\s*\|.*$/, "").slice(0, 90), 70);
    }));
    return uniqNormalResults(settled.flatMap((row) => row.status === "fulfilled" ? row.value : [])).slice(0, 160);
  } catch { return []; }
}

function resultSourceKey(row: NormalResult) {
  return String(row.sourceName || (row.raw as any)?.source || "OTHER").toUpperCase();
}

function diversifyDartsResults(rows: NormalResult[], max = 180) {
  const unique = uniqNormalResults(rows);
  const buckets = new Map<string, NormalResult[]>();
  unique.forEach((row) => {
    const key = resultSourceKey(row);
    const bucket = buckets.get(key) || []; bucket.push(row); buckets.set(key, bucket);
  });
  const keys = Array.from(buckets.keys());
  const out: NormalResult[] = [];
  let index = 0;
  while (out.length < max && keys.some((key) => index < (buckets.get(key)?.length || 0))) {
    for (const key of keys) {
      const row = buckets.get(key)?.[index];
      if (row) out.push(row);
      if (out.length >= max) break;
    }
    index += 1;
  }
  return out;
}

async function directDartsResults(lang: string, depth: "fast" | "deep" = "deep"): Promise<{ results: NormalResult[]; fixtures: NormalMatch[]; events: NormalEvent[] }> {
  const results: NormalResult[] = [];
  const fixtures: NormalMatch[] = [];
  const events: NormalEvent[] = [];

  const [modusReq, nzReq, dartsInfoReq, modusHomeReq, cdcReq, liveDartsReq, allThingsReq] = await Promise.allSettled([
    fetchOfficialHtml("https://modussuperseries.com/results"),
    depth === "deep" ? fetchOfficialHtml("https://dartsnz.nz/results/") : Promise.resolve(""),
    depth === "deep" ? fetchOfficialHtml("https://dartsinfo.co.uk/") : Promise.resolve(""),
    fetchOfficialHtml("https://modussuperseries.com/"),
    depth === "deep" ? fetchOfficialHtml("https://champdarts.com/blog/blog-single-author-full/") : Promise.resolve(""),
    depth === "deep" ? liveDartsStructuredResults() : Promise.resolve([] as NormalResult[]),
    depth === "deep" ? allThingsDartsStructuredResults() : Promise.resolve([] as NormalResult[]),
  ]);

  if (modusReq.status === "fulfilled") {
    const lines = htmlLines(modusReq.value);
    for (let i = 0; i < lines.length - 2 && results.length < 70; i += 1) {
      if (!/^Match\s+\d+$/i.test(lines[i])) continue;
      const a = parseLeadingScoreName(lines[i + 1]);
      const b = parseLeadingScoreName(lines[i + 2]);
      if (!a || !b || (a.score === 0 && b.score === 0)) continue;
      const winner = a.score >= b.score ? a : b;
      const loser = a.score >= b.score ? b : a;
      results.push({
        id: `modus-${i}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 120),
        playedOn: null,
        competition: "MODUS Super Series",
        round: lines[i],
        winner: { name: winner.name, score: winner.score },
        loser: { name: loser.name, score: loser.score },
        raw: { source: "MODUS", sourceUrl: "https://modussuperseries.com/results" }, sourceName: "MODUS", sourceUrl: "https://modussuperseries.com/results",
      });
    }
  }

  if (nzReq.status === "fulfilled" && nzReq.value) {
    results.push(...parseDartsNzResults(nzReq.value));
  }

  if (dartsInfoReq.status === "fulfilled") {
    results.push(...parseDartsInfoResults(dartsInfoReq.value));
  }

  if (cdcReq.status === "fulfilled" && cdcReq.value) {
    results.push(...parseGenericDartsScoreLines(cdcReq.value, "CDC", "https://champdarts.com/blog/blog-single-author-full/", "CDC · North America / Latin America", 110));
  }
  if (liveDartsReq.status === "fulfilled") results.push(...liveDartsReq.value);
  if (allThingsReq.status === "fulfilled") results.push(...allThingsReq.value);

  if (modusHomeReq.status === "fulfilled") {
    const lines = htmlLines(modusHomeReq.value);
    const start = lines.findIndex((line) => /Upcoming Fixtures/i.test(line));
    const slice = start >= 0 ? lines.slice(start + 1, start + 90) : lines;
    for (let i = 0; i < slice.length - 2 && fixtures.length < 36; i += 1) {
      const time = slice[i].match(/^(\d{1,2}:\d{2})$/)?.[1];
      if (!time) continue;
      const a = slice[i + 1];
      const b = slice[i + 2];
      if (!a || !b || /watch live/i.test(a) || /watch live/i.test(b) || a.length > 80 || b.length > 80) continue;
      const now = new Date();
      const [hh, mm] = time.split(":").map(Number);
      const starts = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
      if (starts.getTime() < now.getTime() - 2 * 3600_000) starts.setUTCDate(starts.getUTCDate() + 1);
      fixtures.push({
        id: `modus-fixture-${i}-${a}-${b}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 120),
        competition: "MODUS Super Series",
        round: "Upcoming fixture",
        startsAt: starts.toISOString(),
        date: starts.toISOString().slice(0, 10),
        players: [{ name: a }, { name: b }],
        raw: { source: "MODUS", sourceUrl: "https://modussuperseries.com/" }, sourceName: "MODUS", sourceUrl: "https://modussuperseries.com/",
      });
    }
  }

  return { results: diversifyDartsResults(results, depth === "deep" ? 420 : 100), fixtures: fixtures.slice(0, 64), events };
}

const SPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

function dateOffsetIso(offsetDays: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function sportsDbPlayers(row: any): NormalPlayer[] {
  return [
    { id: str(row?.idHomeTeam) || null, name: str(row?.strHomeTeam) || "—", score: num(row?.intHomeScore) },
    { id: str(row?.idAwayTeam) || null, name: str(row?.strAwayTeam) || "—", score: num(row?.intAwayScore) },
  ];
}

function sportsDbStartsAt(row: any) {
  const date = str(row?.dateEvent);
  const time = str(row?.strTime || row?.strTimestamp);
  if (str(row?.strTimestamp)) return str(row?.strTimestamp);
  if (!date) return null;
  const iso = `${date}T${time || "12:00:00"}`;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString() : date;
}

async function sportsDbFootballOverview(depth: "fast" | "deep" = "fast") {
  const offsets = depth === "deep" ? [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7] : [-1, 0, 1, 2];
  const settled = await Promise.allSettled(offsets.map(async (offset) => {
    const date = dateOffsetIso(offset);
    const response = await timedFetch(`${SPORTSDB_BASE}/eventsday.php?d=${encodeURIComponent(date)}&s=Soccer`, {
      headers: { Accept: "application/json", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    }, 3500);
    if (!response.ok) throw new Error(`TheSportsDB HTTP ${response.status}`);
    const body = await response.json().catch(() => ({})) as any;
    return arr(body?.events);
  }));
  const rows = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  const seen = new Set<string>();
  const live: NormalMatch[] = [];
  const fixtures: NormalMatch[] = [];
  const results: NormalResult[] = [];
  const events: NormalEvent[] = [];

  rows.forEach((row, index) => {
    const id = str(row?.idEvent) || `sportsdb-foot-${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    const players = sportsDbPlayers(row);
    const [home, away] = players;
    const competition = str(row?.strLeague || row?.strLeagueAlternate) || "Football";
    const round = str(row?.intRound || row?.strSeason) || null;
    const startsAt = sportsDbStartsAt(row);
    const status = str(row?.strStatus || row?.strPostponed).toLowerCase();
    const hasScore = home?.score !== null && home?.score !== undefined && away?.score !== null && away?.score !== undefined;
    const isLive = /live|in progress|1st half|2nd half|halftime|extra time|penalties/.test(status);
    const date = str(row?.dateEvent) || null;
    const match: NormalMatch = { id, competition, round, startsAt, date, players, raw: row };
    if (isLive) {
      live.push(match);
      return;
    }
    if (hasScore) {
      const hs = Number(home.score), as = Number(away.score);
      if (hs === as) {
        events.push({
          id: `draw-${id}`,
          title: `${home.name} ${hs}-${as} ${away.name}`,
          subtitle: competition,
          startsAt,
          dateLabel: date,
          status: "result",
          sourceName: "TheSportsDB",
          sourceUrl: str(row?.strEventOfficial || row?.strVideo) || "https://www.thesportsdb.com/",
          resultLabel: `${hs}-${as} · Match nul`,
        });
      } else {
        const winner = hs > as ? home : away;
        const loser = hs > as ? away : home;
        results.push({ id, playedOn: date, competition, round, winner, loser, raw: row });
      }
      return;
    }
    fixtures.push(match);
  });

  return { live: live.slice(0, 60), fixtures: fixtures.slice(0, depth === "deep" ? 220 : 80), results: results.slice(0, depth === "deep" ? 240 : 80), events: events.slice(0, depth === "deep" ? 120 : 40) };
}

function footballDataPlayers(row: any): NormalPlayer[] {
  const score = row?.score?.fullTime || row?.score?.regularTime || row?.score?.halfTime || {};
  return [
    { id: str(row?.homeTeam?.id) || null, name: str(row?.homeTeam?.name || row?.homeTeam?.shortName) || "—", score: num(score?.home) },
    { id: str(row?.awayTeam?.id) || null, name: str(row?.awayTeam?.name || row?.awayTeam?.shortName) || "—", score: num(score?.away) },
  ];
}

async function footballDataOverview(key: string, depth: "fast" | "deep" = "fast") {
  const dateFrom = dateOffsetIso(depth === "deep" ? -7 : -1);
  const dateTo = dateOffsetIso(depth === "deep" ? 7 : 3);
  const response = await timedFetch(`${FOOTBALL_DATA_BASE}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
    headers: { Accept: "application/json", "X-Auth-Token": key },
  }, 4500);
  if (!response.ok) throw new Error(`football-data.org HTTP ${response.status}`);
  const body = await response.json().catch(() => ({})) as any;
  const rows = arr(body?.matches);
  const live: NormalMatch[] = [];
  const fixtures: NormalMatch[] = [];
  const results: NormalResult[] = [];
  const events: NormalEvent[] = [];
  rows.forEach((row, index) => {
    const id = str(row?.id) || `football-data-${index}`;
    const players = footballDataPlayers(row);
    const [home, away] = players;
    const competition = str(row?.competition?.name) || "Football";
    const round = str(row?.stage || row?.matchday) || null;
    const startsAt = str(row?.utcDate) || null;
    const date = startsAt ? startsAt.slice(0, 10) : null;
    const status = str(row?.status).toUpperCase();
    const match: NormalMatch = { id, competition, round, startsAt, date, players, raw: row };
    if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) { live.push(match); return; }
    if (status === "FINISHED" && home?.score != null && away?.score != null) {
      if (Number(home.score) === Number(away.score)) {
        events.push({ id: `draw-${id}`, title: `${home.name} ${home.score}-${away.score} ${away.name}`, subtitle: competition, startsAt, dateLabel: date, status: "result", sourceName: "football-data.org", sourceUrl: "https://www.football-data.org/", resultLabel: `${home.score}-${away.score} · Match nul` });
      } else {
        const winner = Number(home.score) > Number(away.score) ? home : away;
        const loser = Number(home.score) > Number(away.score) ? away : home;
        results.push({ id, playedOn: date, competition, round, winner, loser, raw: row });
      }
      return;
    }
    fixtures.push(match);
  });
  return { live: live.slice(0, 60), fixtures: fixtures.slice(0, depth === "deep" ? 220 : 90), results: results.slice(0, depth === "deep" ? 240 : 90), events: events.slice(0, depth === "deep" ? 120 : 40) };
}

async function footballOverview(env: Env, depth: "fast" | "deep" = "fast") {
  const warnings: string[] = [];
  let provider = "thesportsdb";
  let data = { live: [] as NormalMatch[], fixtures: [] as NormalMatch[], results: [] as NormalResult[], events: [] as NormalEvent[] };
  const footballDataKey = str(env?.FOOTBALL_DATA_API_KEY).trim();
  if (footballDataKey) {
    try {
      data = await footballDataOverview(footballDataKey, depth);
      provider = "football_data";
    } catch (error: any) {
      warnings.push(`football-data.org indisponible : ${str(error?.message || error)}. Fallback TheSportsDB activé.`);
    }
  }
  if (!data.live.length && !data.fixtures.length && !data.results.length && !data.events.length) {
    try {
      data = await sportsDbFootballOverview(depth);
      provider = "thesportsdb";
    } catch (error: any) {
      warnings.push(`TheSportsDB indisponible : ${str(error?.message || error)}`);
    }
  }
  return {
    status: 200,
    ttl: data.live.length ? 60 : 600,
    payload: {
      sport: "foot",
      configured: data.live.length + data.fixtures.length + data.results.length + data.events.length > 0,
      automaticData: true,
      provider,
      plan: provider === "football_data" ? "api" : "free",
      dataAsOf: new Date().toISOString(),
      liveAvailable: data.live.length > 0,
      liveReason: data.live.length ? null : "Aucun match live détecté dans les flux football actuels.",
      live: data.live,
      fixtures: data.fixtures,
      results: data.results,
      events: data.events,
      warnings,
    },
  };
}

function uniqNormalResults(rows: NormalResult[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const names = [row.winner?.name, row.loser?.name].map((v) => normalizeHeadlineKey(String(v || ""))).sort().join("|");
    const scores = [row.winner?.score, row.loser?.score].map((v) => v == null ? "" : String(v)).sort().join("|");
    const key = `${normalizeHeadlineKey(String(row.competition || ""))}|${names}|${scores}`;
    if (!names || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newsToEvent(row: IntelligenceNews, sport: string): NormalEvent | null {
  if (row.kind === "news") return null;
  return {
    id: `intel-event-${row.id}`,
    title: row.title,
    subtitle: row.summary || row.sourceName || "Actualité sportive",
    startsAt: row.publishedAt || null,
    dateLabel: row.publishedAt ? row.publishedAt.slice(0, 10) : null,
    status: row.kind === "result" ? "result" : row.kind === "live" ? "live" : "upcoming",
    sourceName: row.sourceName || "Web",
    sourceUrl: row.sourceUrl || null,
    resultLabel: row.kind === "result" ? row.resultLabel || "Résultat publié" : null,
  };
}

async function enrichWithLiveIntelligence(
  env: Env,
  sport: string,
  lang: string,
  base: { status: number; ttl: number; payload: any },
  depth: "core" | "deep" = "core",
) {
  const deep = depth === "deep";
  const warnings = arr(base.payload?.warnings).map(str).filter(Boolean);
  let google: IntelligenceNews[] = [];
  let bing: IntelligenceNews[] = [];
  let yahoo: IntelligenceNews[] = [];
  let directEditorial: IntelligenceNews[] = [];
  let directRss: IntelligenceNews[] = [];
  let ai: IntelligenceNews[] = [];

  // CORE is intentionally bounded so the journal appears quickly after the
  // structured feed. DEEP runs later from the frontend and can fan out widely.
  const directPageBudget = deep ? (sport === "darts" ? 22 : 14) : (sport === "darts" ? 8 : 6);
  const newsSettled = await Promise.allSettled([
    googleNewsIntelligence(sport, lang, deep ? "deep" : "core"),
    deep ? bingNewsIntelligence(sport, lang, "deep") : Promise.resolve([] as IntelligenceNews[]),
    sport === "foot" ? yahooSoccerNews(lang) : Promise.resolve([] as IntelligenceNews[]),
    directEditorialIntelligence(sport, directPageBudget),
    sport === "darts" ? directDartsNewsFeeds() : Promise.resolve([] as IntelligenceNews[]),
  ]);
  if (newsSettled[0].status === "fulfilled") google = newsSettled[0].value;
  else warnings.push(`Google News indisponible : ${str(newsSettled[0].reason?.message || newsSettled[0].reason)}`);
  if (newsSettled[1].status === "fulfilled") bing = newsSettled[1].value;
  else if (deep) warnings.push(`Bing News indisponible : ${str(newsSettled[1].reason?.message || newsSettled[1].reason)}`);
  if (newsSettled[2].status === "fulfilled") yahoo = newsSettled[2].value;
  if (newsSettled[3].status === "fulfilled") directEditorial = newsSettled[3].value;
  else warnings.push(`Sources éditoriales directes indisponibles : ${str(newsSettled[3].reason?.message || newsSettled[3].reason)}`);
  if (newsSettled[4].status === "fulfilled") directRss = newsSettled[4].value;

  // AI web and page-image crawling are deliberately DEEP-only. They can never
  // delay the first structured result cards nor the normal news layer.
  if (deep && str(env?.OPENAI_API_KEY).trim()) {
    try {
      ai = await openAiWebIntelligence(env, sport, lang);
    } catch (error: any) {
      warnings.push(`LIVE Intelligence IA indisponible : ${str(error?.message || error)}`);
    }
  }

  const chronologicalNews = uniqNews([...ai, ...directRss, ...google, ...bing, ...yahoo, ...directEditorial])
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  const mergedNews = diversifyNews(chronologicalNews, deep ? (sport === "foot" ? 240 : sport === "darts" ? 280 : 220) : (sport === "foot" ? 150 : sport === "darts" ? 180 : 135));
  const news = deep ? await enrichNewsImages(mergedNews) : mergedNews;
  const intelligenceEvents = news.map((row) => newsToEvent(row, sport)).filter(Boolean) as NormalEvent[];

  let direct = { results: [] as NormalResult[], fixtures: [] as NormalMatch[], events: [] as NormalEvent[] };
  if (deep && sport === "darts") {
    try { direct = await directDartsResults(lang, "deep"); } catch {}
  }
  const extraStructuredEvents = deep && sport === "padel" ? await padelFipFinalEvents() : [];
  const mergedEvents = uniqEvents([
    ...(arr(base.payload?.events) as NormalEvent[]),
    ...direct.events,
    ...extraStructuredEvents,
    ...intelligenceEvents,
  ]).slice(0, deep ? 240 : 140);
  const provider = ai.length ? "openai_web" : (google.length || bing.length || yahoo.length || directEditorial.length || directRss.length) ? "news_rss" : "none";
  const selectedPlans = deep ? intelligenceFeedPlansFor(sport, lang) : coreIntelligenceFeedPlansFor(sport, lang);

  return {
    ...base,
    ttl: Math.min(base.ttl || 1800, deep ? 1800 : 600),
    payload: {
      ...base.payload,
      configured: !!base.payload?.configured || news.length > 0 || direct.results.length > 0,
      automaticData: !!base.payload?.automaticData || news.length > 0 || direct.results.length > 0,
      results: sport === "darts" ? diversifyDartsResults([...direct.results, ...(arr(base.payload?.results) as NormalResult[])], deep ? 480 : 140) : uniqNormalResults([...direct.results, ...(arr(base.payload?.results) as NormalResult[])]).slice(0, deep ? 180 : 120),
      fixtures: [...direct.fixtures, ...(arr(base.payload?.fixtures) as NormalMatch[])].slice(0, deep ? 140 : 90),
      events: mergedEvents,
      news,
      intelligence: {
        enabled: news.length > 0,
        provider,
        aiEnabled: deep && !!str(env?.OPENAI_API_KEY).trim(),
        count: news.length,
        localCount: news.filter((item) => item.scope === "local").length,
        regionalCount: news.filter((item) => item.scope === "regional").length,
        worldCount: news.filter((item) => item.scope === "world" || !item.scope).length,
        queryCount: selectedPlans.length + (deep ? Math.min(12, selectedPlans.length) : 0) + (sport === "foot" ? 1 : 0) + Math.min(directPageBudget, DIRECT_EDITORIAL_PAGES[sport]?.length || 0) + (sport === "darts" ? 2 : 0),
        directResultCount: direct.results.length + extraStructuredEvents.length,
        updatedAt: new Date().toISOString(),
      },
      warnings,
    },
  };
}

async function fastOverview(env: Env, sport: string, lang: string) {
  if (sport === "darts") {
    const key = str(env?.DARTS_API_KEY).trim();
    const basePromise = key
      ? dartsOverview(key)
      : Promise.resolve({
          status: 200,
          ttl: 120,
          payload: {
            sport: "darts", configured: false, automaticData: true, provider: "official_links", plan: "fast",
            dataAsOf: new Date().toISOString(), liveAvailable: false,
            liveReason: "Chargement rapide des résultats publics ; enrichissement complet en cours.",
            live: [], fixtures: [], results: [], events: [], news: [], warnings: [],
          },
        });
    const [base, direct] = await Promise.all([
      basePromise,
      directDartsResults(lang, "fast").catch(() => ({ results: [] as NormalResult[], fixtures: [] as NormalMatch[], events: [] as NormalEvent[] })),
    ]);
    return {
      ...base,
      ttl: 120,
      payload: {
        ...base.payload,
        configured: !!base.payload?.configured || direct.results.length > 0 || direct.fixtures.length > 0,
        automaticData: true,
        results: diversifyDartsResults([...direct.results, ...(arr(base.payload?.results) as NormalResult[])], 120),
        fixtures: [...direct.fixtures, ...(arr(base.payload?.fixtures) as NormalMatch[])].slice(0, 60),
        events: uniqEvents([...(arr(base.payload?.events) as NormalEvent[]), ...direct.events]).slice(0, 60),
        news: arr(base.payload?.news),
        intelligence: {
          enabled: false,
          provider: "fast_structured",
          aiEnabled: false,
          count: 0,
          localCount: 0,
          regionalCount: 0,
          worldCount: 0,
          queryCount: 0,
          directResultCount: direct.results.length,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  if (sport === "pingpong") {
    const key = str(env?.TABLE_TENNIS_API_KEY).trim();
    if (key) return tableTennisOverview(key);
    return { status: 200, ttl: 180, payload: { sport, configured: false, automaticData: false, provider: "official_links", plan: "fast", dataAsOf: new Date().toISOString(), liveAvailable: false, liveReason: "Enrichissement complet en cours.", live: [], fixtures: [], results: [], events: [], news: [], warnings: [] } };
  }

  if (sport === "foot") return footballOverview(env);
  if (sport === "babyfoot" || sport === "molkky" || sport === "petanque") return officialEventOverview(sport);
  return { status: 200, ttl: 180, payload: { sport, configured: false, automaticData: false, provider: "official_links", plan: "fast", dataAsOf: new Date().toISOString(), liveAvailable: false, liveReason: "Enrichissement complet en cours.", live: [], fixtures: [], results: [], events: [], news: [], warnings: [] } };
}

async function cachedResponse(context: any, loader: () => Promise<{ status: number; ttl: number; payload: any }>) {
  const cache = (caches as any).default;
  const cacheKey = new Request(context.request.url, { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const out = await loader();
  const response = json(out.payload, out.status, out.ttl);
  if (out.status >= 200 && out.status < 300) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": METHODS,
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const raw = context.params?.path;
  const path = Array.isArray(raw) ? raw : String(raw || "").split("/").filter(Boolean);
  const sport = str(path[0] || "darts").toLowerCase();
  const action = str(path[1] || "overview").toLowerCase();
  const requestUrl = new URL(context.request.url);
  const lang = str(requestUrl.searchParams.get("lang") || "fr").toLowerCase();
  const phase = str(requestUrl.searchParams.get("phase") || "full").toLowerCase();
  if (action !== "overview") return json({ error: "not_found", message: "Unknown LIVE SPORTS endpoint." }, 404, 60);

  if (phase === "fast") {
    return cachedResponse(context, async () => fastOverview(context.env, sport, lang));
  }

  const isDeep = phase === "deep";

  // FULL is the fast journal layer. Structured scores were already requested by
  // phase=fast, so do not fetch the same slow federation/API pages twice before
  // returning news. The frontend merges both phases and keeps the structured rows.
  if (!isDeep) {
    const provider = sport === "pingpong" ? "tabletennisapi" : sport === "darts" ? "pdc_official" : "official_links";
    const base = {
      status: 200,
      ttl: 600,
      payload: {
        sport,
        configured: false,
        automaticData: false,
        provider,
        plan: "journal-core",
        dataAsOf: new Date().toISOString(),
        liveAvailable: false,
        liveReason: "Données structurées chargées séparément par le flux rapide.",
        live: [], fixtures: [], results: [], events: [], news: [], warnings: [],
      },
    };
    return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, base, "core"));
  }

  // DEEP runs after the page is usable. It can afford broader official sources,
  // deeper result history, Bing, optional OpenAI web search and media enrichment.
  if (sport === "darts") {
    const key = str(context.env?.DARTS_API_KEY).trim();
    return cachedResponse(context, async () => {
      const base = key
        ? await dartsOverview(key)
        : await officialDartsFallbackOverview("DARTS_API_KEY absente : collecteurs publics PDC/MODUS/WDF/DartConnect utilisés ; le score LIVE chiffré nécessite un provider compatible LIVE.");
      return enrichWithLiveIntelligence(context.env, sport, lang, base, "deep");
    });
  }

  if (sport === "pingpong") {
    const key = str(context.env?.TABLE_TENNIS_API_KEY).trim();
    return cachedResponse(context, async () => {
      const base = key
        ? await tableTennisOverview(key, "deep")
        : { status: 200, ttl: 900, payload: { sport, configured: false, automaticData: false, provider: "tabletennisapi", plan: "deep", dataAsOf: null, liveAvailable: false, liveReason: "TABLE_TENNIS_API_KEY non configurée côté Cloudflare.", live: [], fixtures: [], results: [], events: [], warnings: ["LIVE Intelligence charge quand même l'actualité Ping-Pong ; ajoute TABLE_TENNIS_API_KEY pour les scores structurés."] } };
      return enrichWithLiveIntelligence(context.env, sport, lang, base, "deep");
    });
  }

  if (sport === "foot") {
    return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, await footballOverview(context.env, "deep"), "deep"));
  }

  if (sport === "babyfoot" || sport === "molkky" || sport === "petanque") {
    return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, await officialEventOverview(sport), "deep"));
  }

  return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, {
    status: 200,
    ttl: 900,
    payload: {
      sport,
      configured: false,
      automaticData: false,
      provider: "official_links",
      plan: "deep",
      dataAsOf: new Date().toISOString(),
      liveAvailable: false,
      liveReason: "Collecteurs directs, calendriers officiels et LIVE Intelligence utilisés pour ce sport.",
      live: [], fixtures: [], results: [], events: [], warnings: [],
    },
  }, "deep"));
};
