import type { SportId } from "../contexts/SportContext";

export type SportLiveSportId =
  | "darts"
  | "petanque"
  | "pingpong"
  | "babyfoot"
  | "molkky"
  | "padel"
  | "badminton"
  | "cornhole"
  | "palet"
  | "bowling";
import type { DartsLiveFixture, DartsLiveMatch, DartsLiveResult } from "../dartsLive/types";

export type SportLiveRegion =
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

export type SportLiveSourceKind =
  | "governing_body"
  | "live_scores"
  | "tour"
  | "streaming"
  | "calendar"
  | "results";

export type SportLiveSource = {
  id: string;
  sport: SportLiveSportId;
  name: string;
  shortName?: string;
  description: string;
  kind: SportLiveSourceKind;
  regions: SportLiveRegion[];
  locales?: string[];
  official: boolean;
  homeUrl: string;
  scoresUrl?: string;
  resultsUrl?: string;
  calendarUrl?: string;
  watchUrl?: string;
  badges?: string[];
};

export type SportLiveMeta = {
  id: SportLiveSportId;
  icon: string;
  label: string;
  shortLabel: string;
  accent: string;
};

export type SportLiveLocaleProfile = {
  locale: string;
  label: string;
  preferredRegions: SportLiveRegion[];
  fallbackRegions: SportLiveRegion[];
};

export type SportLiveEvent = {
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


export type SportLiveNewsItem = {
  id: string;
  title: string;
  summary?: string | null;
  publishedAt?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  kind: "news" | "result" | "live" | "upcoming";
  resultLabel?: string | null;
};

export type SportLiveIntelligence = {
  enabled: boolean;
  provider: "openai_web" | "news_rss" | "none";
  aiEnabled: boolean;
  count: number;
  updatedAt?: string | null;
};

export type SportLiveOverview = {
  sport: SportLiveSportId;
  automaticData: boolean;
  configured: boolean;
  provider: "dartsapi" | "pdc_official" | "tabletennisapi" | "itsf_official" | "molkky_world" | "fipjp_official" | "official_links";
  plan?: string | null;
  dataAsOf?: string | null;
  liveAvailable: boolean;
  liveReason?: string | null;
  live: DartsLiveMatch[];
  fixtures: DartsLiveFixture[];
  results: DartsLiveResult[];
  events?: SportLiveEvent[];
  news?: SportLiveNewsItem[];
  intelligence?: SportLiveIntelligence | null;
  warnings?: string[];
};
