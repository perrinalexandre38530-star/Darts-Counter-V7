import type { SearchIntent } from './domain';

export const SEARCH_INTENTS: SearchIntent[] = [
  {
    key: 'darts-score-app',
    canonicalQuery: 'looking for the best app to count darts scores and track player statistics X01 cricket killer darts',
    description: 'People actively seeking a darts scoring/statistics application.'
  },
  {
    key: 'running-gps-app',
    canonicalQuery: 'looking for a running app to record GPS routes compare times sessions rankings and friends',
    description: 'People seeking GPS running tracking, performance comparison, rankings or social features.'
  },
  {
    key: 'multisport-score-stats',
    canonicalQuery: 'looking for an app to track sports scores results statistics rankings challenges between friends',
    description: 'People seeking one app for scoring and statistics across multiple sports.'
  },
  {
    key: 'petanque-score-app',
    canonicalQuery: 'looking for an app to keep petanque boules scores statistics matches and rankings',
    description: 'People seeking petanque/boules scoring and statistics.'
  },
  {
    key: 'indoor-games-score-app',
    canonicalQuery: 'looking for an app to keep score and statistics for table tennis ping pong foosball molkky games',
    description: 'People seeking scoring/statistics for indoor and casual sports.'
  },
  {
    key: 'sport-social-challenges',
    canonicalQuery: 'looking for a sports app to find partners friends compare performances create challenges and rankings',
    description: 'People seeking social sports, partners, challenges and performance comparison.'
  },
  {
    key: 'wearables-sport-app',
    canonicalQuery: 'looking for a sports app compatible with smartwatch fitness watch GPS wearable to import sessions and routes',
    description: 'People seeking smartwatch/wearable integration for sport sessions.'
  }
];
