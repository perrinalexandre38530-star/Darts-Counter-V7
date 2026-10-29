export type DartsLiveRegion =
  | "global"
  | "france"
  | "francophone"
  | "uk_ireland"
  | "north_america"
  | "oceania"
  | "spain"
  | "latin_america"
  | "dach"
  | "benelux"
  | "italy"
  | "portugal"
  | "nordic_baltic"
  | "poland"
  | "czechia"
  | "balkans"
  | "eastern_europe"
  | "turkey"
  | "arab_middle_east"
  | "india_asia"
  | "japan_asia"
  | "china_asia"
  | "europe"
  | "asia";

export type DartsLiveSourceKind =
  | "governing_body"
  | "live_scores"
  | "tour"
  | "streaming"
  | "calendar"
  | "results";

export type DartsLiveSource = {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  kind: DartsLiveSourceKind;
  regions: DartsLiveRegion[];
  locales?: string[];
  official: boolean;
  homeUrl: string;
  scoresUrl?: string;
  resultsUrl?: string;
  calendarUrl?: string;
  watchUrl?: string;
  badges?: string[];
};

export type DartsLiveLocaleProfile = {
  locale: string;
  label: string;
  preferredRegions: DartsLiveRegion[];
  fallbackRegions: DartsLiveRegion[];
};

export type DartsLivePlayer = {
  id?: string | null;
  name: string;
  score?: number | null;
  countryCode?: string | null;
  photoUrl?: string | null;
};

export type DartsLiveFixture = {
  id: string;
  competition?: string | null;
  round?: string | null;
  startsAt?: string | null;
  date?: string | null;
  players: DartsLivePlayer[];
  raw?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export type DartsLiveResult = {
  id: string;
  playedOn?: string | null;
  competition?: string | null;
  round?: string | null;
  winner: DartsLivePlayer;
  loser: DartsLivePlayer;
  raw?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export type DartsLiveMatch = {
  id: string;
  competition?: string | null;
  round?: string | null;
  startsAt?: string | null;
  players: DartsLivePlayer[];
  raw?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export type DartsLiveApiOverview = {
  configured: boolean;
  provider: "dartsapi";
  plan?: string | null;
  dataAsOf?: string | null;
  liveAvailable: boolean;
  liveReason?: string | null;
  live: DartsLiveMatch[];
  fixtures: DartsLiveFixture[];
  results: DartsLiveResult[];
  warnings?: string[];
};
