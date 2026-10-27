type Env = {
  DARTS_API_KEY?: string;
  TABLE_TENNIS_API_KEY?: string;
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
  if (action !== "overview") return json({ error: "not_found", message: "Unknown LIVE SPORTS endpoint." }, 404, 60);

  if (sport === "darts") {
    const key = str(context.env?.DARTS_API_KEY).trim();
    if (!key) return cachedResponse(context, () => officialDartsFallbackOverview("DARTS_API_KEY absente : calendrier/résultats publics PDC chargés en fallback. Le score LIVE chiffré nécessite DartsAPI Live ou DartConnect API."));
    return cachedResponse(context, () => dartsOverview(key));
  }

  if (sport === "pingpong") {
    const key = str(context.env?.TABLE_TENNIS_API_KEY).trim();
    if (!key) return json({ sport, configured: false, automaticData: false, provider: "tabletennisapi", plan: null, dataAsOf: null, liveAvailable: false, liveReason: "TABLE_TENNIS_API_KEY non configurée côté Cloudflare.", live: [], fixtures: [], results: [], warnings: ["Ajoute TABLE_TENNIS_API_KEY dans les secrets Cloudflare Pages pour charger automatiquement les vrais scores Ping-Pong."] }, 200, 300);
    return cachedResponse(context, () => tableTennisOverview(key));
  }

  if (sport === "babyfoot" || sport === "molkky" || sport === "petanque") {
    return cachedResponse(context, () => officialEventOverview(sport));
  }

  return json({ sport, configured: false, automaticData: false, provider: "official_links", plan: null, dataAsOf: null, liveAvailable: false, liveReason: "Aucun provider structuré n'est encore branché pour ce sport.", live: [], fixtures: [], results: [], warnings: [] }, 200, 600);
};
