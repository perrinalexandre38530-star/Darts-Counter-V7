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

export type DartsCompetitionMeta = {
  continent?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  family?: "national_teams" | "continental" | "domestic_league" | "domestic_cup" | "regional" | "amateur" | "youth" | "women" | "world" | "other" | null;
  level?: "elite" | "pro" | "semi_pro" | "amateur" | "grassroots" | "mixed" | null;
  tier?: string | null;
  gender?: "men" | "women" | "mixed" | null;
  age?: string | null;
  regionLabel?: string | null;
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
  competitionMeta?: DartsCompetitionMeta | null;
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
  competitionMeta?: DartsCompetitionMeta | null;
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
  competitionMeta?: DartsCompetitionMeta | null;
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
