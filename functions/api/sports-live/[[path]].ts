type Env = {
  DARTS_API_KEY?: string;
  TABLE_TENNIS_API_KEY?: string;
  OPENAI_API_KEY?: string;
  LIVE_INTELLIGENCE_MODEL?: string;
};

type NormalPlayer = { id?: string | null; name: string; score?: number | null };
type NormalMatch = {
  id: string;
  competition?: string | null;
  round?: string | null;
  startsAt?: string | null;
  date?: string | null;
  players: NormalPlayer[];
  raw?: unknown;
};
type NormalResult = {
  id: string;
  playedOn?: string | null;
  competition?: string | null;
  round?: string | null;
  winner: NormalPlayer;
  loser: NormalPlayer;
  raw?: unknown;
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

async function apiFetch(base: string, key: string, path: string) {
  const response = await fetch(`${base}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
    },
  });
  const body = await response.json().catch(() => ({ error: "invalid_json", message: `HTTP ${response.status}` })) as any;
  return { ok: response.ok, status: response.status, body };
}

function dartPlayer(v: any): NormalPlayer {
  return {
    id: str(v?.player_id || v?.id) || null,
    name: str(v?.name || v?.player_name) || "—",
    score: num(v?.score ?? v?.legs ?? v?.sets),
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
  const future = new Date(now.getTime() + 7 * 86400000);
  const calls = [
    apiFetch(DARTS_BASE, key, `/fixtures?from=${isoDate(now)}&to=${isoDate(future)}&limit=60`),
    apiFetch(DARTS_BASE, key, "/results?limit=50"),
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

async function tableTennisOverview(key: string) {
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
  const today = isoDate(new Date());

  const [todayMatches, yesterday] = await Promise.all([
    apiFetch(TT_BASE, key, `/matches?date=${today}&per_page=200`),
    apiFetch(TT_BASE, key, "/results/yesterday"),
  ]);
  const live = hasLive ? await apiFetch(TT_BASE, key, "/live") : { ok: false, status: 403, body: { data: [] } };

  const todayRows = todayMatches.ok ? payloadRows(todayMatches.body, ["matches"]) : [];
  const liveRows = live.ok ? payloadRows(live.body, ["matches", "live"]) : todayRows.filter((row) => str(row?.status).toLowerCase() === "live");
  const fixtureRows = todayRows.filter((row) => ["scheduled", "upcoming", "not_started"].includes(str(row?.status).toLowerCase()));
  const finishedToday = todayRows.filter((row) => str(row?.status).toLowerCase() === "finished");
  const yesterdayRows = yesterday.ok ? payloadRows(yesterday.body, ["results", "matches"]) : [];
  const resultRows = [...finishedToday, ...yesterdayRows].slice(0, 80);

  const warnings: string[] = [];
  if (!todayMatches.ok) warnings.push(`Matchs Ping-Pong indisponibles (${todayMatches.status}).`);
  if (!yesterday.ok) warnings.push(`Résultats Ping-Pong indisponibles (${yesterday.status}).`);
  if (!hasLive) warnings.push("La clé gratuite charge les vrais matchs/résultats du jour ; le flux /live à ~10 s nécessite le plan Live/Complete.");

  return {
    status: 200,
    ttl: hasLive ? 20 : 3600,
    payload: {
      sport: "pingpong",
      configured: true,
      automaticData: true,
      provider: "tabletennisapi",
      plan,
      dataAsOf: new Date().toISOString(),
      liveAvailable: !!live.ok,
      liveReason: live.ok ? null : "Le direct Ping-Pong à haute fréquence nécessite un plan Table Tennis API Live/Complete.",
      live: liveRows.map(normalizeTtMatch),
      fixtures: fixtureRows.map(normalizeTtMatch),
      results: resultRows.map(normalizeTtResult),
      warnings,
    },
  };
}



const PDC_EUROPEAN_TOUR = "https://www.pdc.tv/tournament/european-darts-open-et10?page=33";

function parsePdcOfficialEvents(html: string): NormalEvent[] {
  const lines = htmlLines(html);
  const out: NormalEvent[] = [];
  const dateRe = /^(\d{1,2}(?:-\d{1,2})?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})$/i;

  for (let i = 0; i < lines.length && out.length < 14; i += 1) {
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

  return uniqEvents(out).slice(0, 18);
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
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0 (+https://multisports-scoring.pages.dev)",
    },
  });
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

  for (let i = 0; i < lines.length - 1 && out.length < 12; i += 1) {
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
    for (let i = 1; i < slice.length && out.filter((row) => row.status === "result").length < 8; i += 1) {
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

  return uniqEvents(out).slice(0, 18);
}

function parseMolkkyEvents(calendarHtml: string, worldsHtml: string): NormalEvent[] {
  const lines = htmlLines(calendarHtml);
  const out: NormalEvent[] = [];
  const frDate = /(\d{1,2}\s+(?:janv(?:ier)?|févr(?:ier)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|août|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|déc(?:embre)?)\.?\s+20\d{2})/i;

  for (let i = 0; i < lines.length && out.length < 14; i += 1) {
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

  return uniqEvents(out).slice(0, 18);
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
  const out = [
    `${spec.query} worldwide results scores`,
    `${spec.query} world live fixtures`,
  ];
  if (sport === "darts") {
    out.push(
      "darts PDC WDF MODUS worldwide results scores",
      "site:pdc.tv darts results",
      "site:dartswdf.com darts results",
      "site:modussuperseries.com darts results fixtures",
    );
  }
  return Array.from(new Set(out)).slice(0, 6);
}

function localQueriesFor(sport: string, lang: string) {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const code = String(lang || "fr").toLowerCase().split(/[-_]/)[0];
  if (sport === "darts") {
    return Array.from(new Set([
      ...(DARTS_LOCALE_QUERY_PACKS[code] || DARTS_LOCALE_QUERY_PACKS.en || []),
      `${spec.query} results scores`,
    ])).slice(0, 4);
  }
  return [`${spec.query} results scores`, `${spec.query} live fixtures`];
}

function intelligenceFeedPlansFor(sport: string, lang: string): IntelligenceFeedPlan[] {
  const code = String(lang || "fr").toLowerCase().split(/[-_]/)[0];
  const localEdition = { ...localeForNews(lang), label: "Local" };
  const regional = REGIONAL_SCOPE_BY_LANG[code] || REGIONAL_SCOPE_BY_LANG.en;
  const plans: IntelligenceFeedPlan[] = [];

  localQueriesFor(sport, lang).forEach((query) => {
    plans.push({ query, edition: localEdition, scope: "local", scopeLabel: code.toUpperCase(), recencyDays: 90 });
  });

  const regionalQueries = sport === "darts"
    ? regional.queries
    : [`${INTELLIGENCE_SPECS[sport]?.query || sport} ${regional.label} results`, `${INTELLIGENCE_SPECS[sport]?.query || sport} ${regional.label} live`];
  regionalQueries.slice(0, 2).forEach((query) => {
    plans.push({ query, edition: regional.edition, scope: "regional", scopeLabel: regional.label, recencyDays: 60 });
  });

  globalQueriesFor(sport).forEach((query, index) => {
    plans.push({
      query,
      edition: WORLD_NEWS_EDITIONS[index % WORLD_NEWS_EDITIONS.length],
      scope: "world",
      scopeLabel: "Monde",
      recencyDays: 45,
    });
  });

  const seen = new Set<string>();
  return plans.filter((plan) => {
    const key = `${plan.scope}|${plan.edition.gl}|${plan.query.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
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
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0",
      },
    });
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
  const first = rows.slice(0, 8);
  const enriched = await Promise.all(first.map(async (row) => {
    if (row.imageUrl) return row;
    const imageUrl = await fetchNewsImage(row.sourceUrl);
    return imageUrl ? { ...row, imageUrl } : row;
  }));
  return [...enriched, ...rows.slice(8)];
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


async function googleNewsIntelligence(sport: string, lang: string): Promise<IntelligenceNews[]> {
  const spec = INTELLIGENCE_SPECS[sport];
  if (!spec) return [];
  const plans = intelligenceFeedPlansFor(sport, lang);

  const feeds = await Promise.allSettled(plans.map(async (plan, qIndex) => {
    const recencyQuery = `${plan.query} when:${plan.recencyDays}d`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(recencyQuery)}&hl=${encodeURIComponent(plan.edition.hl)}&gl=${encodeURIComponent(plan.edition.gl)}&ceid=${encodeURIComponent(plan.edition.ceid)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "MULTISPORTS-SCORING-LIVE/1.0" },
    });
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
  const prompt = `Today is ${today}. Search the web for the latest verified ${spec.label} competition news, official results, current live events and upcoming official events from the last 14 days and the next 14 days. Prioritize official federation/tour sources and reputable sports media. Return ONLY valid JSON with this exact shape: {"items":[{"title":"...","summary":"...","publishedAt":"ISO date or null","sourceName":"...","sourceUrl":"https://...","imageUrl":"https://... or null","kind":"news|result|live|upcoming","resultLabel":"explicit published score/result or null","scope":"local|regional|world","scopeLabel":"country/region/world label"}]}. Maximum 40 items. ALWAYS cover three mandatory scopes: (1) local sources relevant to the requested language/country, (2) regional/continental sources, and (3) worldwide sources and major international circuits. The selected language is a priority, never a geographic filter. For example fr must include France/francophone + Europe + World; zh must include China + Asia + World; ja must include Japan + Asia + World; en must include UK/Ireland + North America + Oceania + World. IMPORTANT: never invent a score, winner, date or live status. resultLabel may contain a numeric score ONLY when a searched source explicitly states that score. Language for title/summary: ${lang || "fr"}.`;
  const response = await fetch("https://api.openai.com/v1/responses", {
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
  });
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

async function directDartsResults(lang: string): Promise<{ results: NormalResult[]; fixtures: NormalMatch[]; events: NormalEvent[] }> {
  const results: NormalResult[] = [];
  const fixtures: NormalMatch[] = [];
  const events: NormalEvent[] = [];

  try {
    const html = await fetchOfficialHtml("https://modussuperseries.com/results");
    const lines = htmlLines(html);
    for (let i = 0; i < lines.length - 2 && results.length < 32; i += 1) {
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
        raw: { source: "MODUS" },
      });
    }
  } catch {}

  {
    try {
      const html = await fetchOfficialHtml("https://dartsnz.nz/results/");
      const lines = htmlLines(html);
      let section = "Darts New Zealand";
      for (let i = 0; i < lines.length - 3 && results.length < 44; i += 1) {
        if (/^(Mens|Ladies|Mixed|Open|Youth).{0,60}$/i.test(lines[i])) section = lines[i].slice(0, 80);
        if (!/^Final$/i.test(lines[i])) continue;
        const candidates = lines.slice(i + 1, i + 6).map(parseTrailingScoreName).filter(Boolean) as Array<{score:number;name:string}>;
        if (candidates.length < 2) continue;
        const a = candidates[0], b = candidates[1];
        const winner = a.score >= b.score ? a : b;
        const loser = a.score >= b.score ? b : a;
        results.push({
          id: `dartsnz-${i}-${winner.name}-${loser.name}`.replace(/[^a-z0-9-]+/gi, "-").slice(0, 120),
          playedOn: null,
          competition: `Darts New Zealand · ${section}`,
          round: "Final",
          winner: { name: winner.name, score: winner.score },
          loser: { name: loser.name, score: loser.score },
          raw: { source: "Darts New Zealand" },
        });
      }
    } catch {}
  }

  return { results, fixtures, events };
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

async function enrichWithLiveIntelligence(env: Env, sport: string, lang: string, base: { status: number; ttl: number; payload: any }) {
  const warnings = arr(base.payload?.warnings).map(str).filter(Boolean);
  let rss: IntelligenceNews[] = [];
  let ai: IntelligenceNews[] = [];
  try {
    rss = await googleNewsIntelligence(sport, lang);
  } catch (error: any) {
    warnings.push(`Fil actualités web indisponible : ${str(error?.message || error)}`);
  }

  // L'IA web est un enrichissement facultatif. Le RSS garantit qu'il y a du contenu même sans clé OpenAI.
  if (str(env?.OPENAI_API_KEY).trim()) {
    try {
      ai = await openAiWebIntelligence(env, sport, lang);
    } catch (error: any) {
      warnings.push(`LIVE Intelligence IA indisponible : ${str(error?.message || error)}`);
    }
  }

  const mergedNews = uniqNews([...ai, ...rss]).sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))).slice(0, 72);
  const news = await enrichNewsImages(mergedNews);
  const intelligenceEvents = news.map((row) => newsToEvent(row, sport)).filter(Boolean) as NormalEvent[];
  let direct = { results: [] as NormalResult[], fixtures: [] as NormalMatch[], events: [] as NormalEvent[] };
  if (sport === "darts") {
    try { direct = await directDartsResults(lang); } catch {}
  }
  const mergedEvents = uniqEvents([...(arr(base.payload?.events) as NormalEvent[]), ...direct.events, ...intelligenceEvents]).slice(0, 40);
  const provider = ai.length ? "openai_web" : rss.length ? "news_rss" : "none";

  return {
    ...base,
    ttl: Math.min(base.ttl || 1800, ai.length ? 1800 : 900),
    payload: {
      ...base.payload,
      configured: !!base.payload?.configured || news.length > 0,
      automaticData: !!base.payload?.automaticData || news.length > 0,
      results: uniqNormalResults([...direct.results, ...(arr(base.payload?.results) as NormalResult[])]).slice(0, 60),
      fixtures: [...direct.fixtures, ...(arr(base.payload?.fixtures) as NormalMatch[])].slice(0, 40),
      events: mergedEvents,
      news,
      intelligence: {
        enabled: news.length > 0,
        provider,
        aiEnabled: !!str(env?.OPENAI_API_KEY).trim(),
        count: news.length,
        localCount: news.filter((item) => item.scope === "local").length,
        regionalCount: news.filter((item) => item.scope === "regional").length,
        worldCount: news.filter((item) => item.scope === "world" || !item.scope).length,
        queryCount: intelligenceFeedPlansFor(sport, lang).length,
        directResultCount: direct.results.length,
        updatedAt: new Date().toISOString(),
      },
      warnings,
    },
  };
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
  const lang = str(new URL(context.request.url).searchParams.get("lang") || "fr").toLowerCase();
  if (action !== "overview") return json({ error: "not_found", message: "Unknown LIVE SPORTS endpoint." }, 404, 60);

  if (sport === "darts") {
    const key = str(context.env?.DARTS_API_KEY).trim();
    return cachedResponse(context, async () => {
      const base = key
        ? await dartsOverview(key)
        : await officialDartsFallbackOverview("DARTS_API_KEY absente : LIVE Intelligence complète les actualités/résultats publics. Le score LIVE chiffré nécessite DartsAPI Live ou DartConnect API.");
      return enrichWithLiveIntelligence(context.env, sport, lang, base);
    });
  }

  if (sport === "pingpong") {
    const key = str(context.env?.TABLE_TENNIS_API_KEY).trim();
    return cachedResponse(context, async () => {
      const base = key
        ? await tableTennisOverview(key)
        : { status: 200, ttl: 900, payload: { sport, configured: false, automaticData: false, provider: "tabletennisapi", plan: null, dataAsOf: null, liveAvailable: false, liveReason: "TABLE_TENNIS_API_KEY non configurée côté Cloudflare.", live: [], fixtures: [], results: [], events: [], warnings: ["LIVE Intelligence charge quand même l'actualité Ping-Pong ; ajoute TABLE_TENNIS_API_KEY pour les scores structurés."] } };
      return enrichWithLiveIntelligence(context.env, sport, lang, base);
    });
  }

  if (sport === "babyfoot" || sport === "molkky" || sport === "petanque") {
    return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, await officialEventOverview(sport)));
  }

  return cachedResponse(context, async () => enrichWithLiveIntelligence(context.env, sport, lang, { status: 200, ttl: 900, payload: { sport, configured: false, automaticData: false, provider: "official_links", plan: null, dataAsOf: null, liveAvailable: false, liveReason: "Aucun provider score structuré n'est encore branché pour ce sport.", live: [], fixtures: [], results: [], events: [], warnings: [] } }));
};
