import type {
  DartsLiveApiOverview,
  DartsLiveFixture,
  DartsLiveMatch,
  DartsLivePlayer,
  DartsLiveResult,
} from "./types";

const OVERVIEW_URL = "/api/darts-live/overview";

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function payloadRows(payload: any, fallbackKeys: string[] = []): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of fallbackKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function mapPlayer(value: any): DartsLivePlayer {
  return {
    id: text(value?.player_id) || text(value?.id) || null,
    name: text(value?.name) || text(value?.player_name) || "—",
    score: numberOrNull(value?.score ?? value?.legs ?? value?.sets),
  };
}

function nestedPlayers(value: any): DartsLivePlayer[] {
  const direct = asArray(value?.players).map(mapPlayer).filter((p) => p.name !== "—");
  if (direct.length) return direct.slice(0, 2);

  const candidates = [
    value?.home,
    value?.away,
    value?.home_player,
    value?.away_player,
    value?.player1,
    value?.player2,
    value?.player_1,
    value?.player_2,
  ].filter(Boolean);
  if (candidates.length) return candidates.map(mapPlayer).filter((p) => p.name !== "—").slice(0, 2);

  const flat = [
    { id: value?.home_player_id, name: value?.home_player_name, score: value?.home_score },
    { id: value?.away_player_id, name: value?.away_player_name, score: value?.away_score },
  ].map(mapPlayer).filter((p) => p.name !== "—");
  return flat.slice(0, 2);
}

function mapFixture(value: any, index: number): DartsLiveFixture {
  return {
    id: text(value?.fixture_id) || text(value?.id) || `fixture-${index}`,
    competition: text(value?.event?.name) || text(value?.competition?.name) || text(value?.competition) || text(value?.event_name) || null,
    round: text(value?.round?.name) || text(value?.round) || null,
    startsAt: text(value?.starts_at) || text(value?.start_time) || text(value?.scheduled_at) || null,
    date: text(value?.date) || null,
    players: nestedPlayers(value),
  };
}

function mapResult(value: any, index: number): DartsLiveResult {
  const players = nestedPlayers(value);
  return {
    id: text(value?.match_id) || text(value?.id) || `result-${index}`,
    playedOn: text(value?.played_on) || text(value?.date) || text(value?.finished_at) || null,
    competition: text(value?.event?.name) || text(value?.competition?.name) || text(value?.competition) || text(value?.event_name) || null,
    round: text(value?.round?.name) || text(value?.round) || null,
    winner: value?.winner ? mapPlayer(value.winner) : (players[0] || mapPlayer(null)),
    loser: value?.loser ? mapPlayer(value.loser) : (players[1] || mapPlayer(null)),
  };
}

function mapLive(value: any, index: number): DartsLiveMatch {
  return {
    id: text(value?.match_id) || text(value?.fixture_id) || text(value?.id) || `live-${index}`,
    competition: text(value?.event?.name) || text(value?.competition?.name) || text(value?.competition) || text(value?.event_name) || null,
    round: text(value?.round?.name) || text(value?.round) || null,
    startsAt: text(value?.starts_at) || text(value?.start_time) || null,
    players: nestedPlayers(value),
    raw: value,
  };
}

export async function fetchDartsLiveOverview(signal?: AbortSignal): Promise<DartsLiveApiOverview> {
  const response = await fetch(OVERVIEW_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  const body = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(text(body?.message) || text(body?.error) || `DARTS LIVE HTTP ${response.status}`);
  }

  const livePayload = body?.live || {};
  const fixturePayload = body?.fixtures || {};
  const resultPayload = body?.results || {};
  const warnings = asArray(body?.warnings).map((item) => text(item)).filter(Boolean);

  return {
    configured: !!body?.configured,
    provider: "dartsapi",
    plan: text(body?.plan) || text(fixturePayload?.meta?.plan) || text(resultPayload?.meta?.plan) || null,
    dataAsOf:
      text(body?.data_as_of) ||
      text(livePayload?.meta?.data_as_of) ||
      text(fixturePayload?.meta?.data_as_of) ||
      text(resultPayload?.meta?.data_as_of) ||
      null,
    liveAvailable: !!body?.live_available,
    liveReason: text(body?.live_reason) || null,
    live: payloadRows(livePayload, ["matches", "live"]).map(mapLive),
    fixtures: payloadRows(fixturePayload, ["fixtures", "matches"]).map(mapFixture),
    results: payloadRows(resultPayload, ["results", "matches"]).map(mapResult),
    warnings,
  };
}
