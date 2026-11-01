import type { SearchIntent } from './domain';

/**
 * High-intent acquisition themes. Queries deliberately describe a real user
 * looking for help so Brave is biased toward forums, Q&A and community posts
 * rather than app-store pages or SEO listicles.
 */
export const SEARCH_INTENTS: SearchIntent[] = [
  {
    key: 'darts-score-app',
    canonicalQuery: 'forum reddit discussion looking for recommend an app to count darts scores X01 cricket killer and keep player statistics',
    description: 'People actively seeking a darts scoring/statistics application.'
  },
  {
    key: 'darts-training-app',
    canonicalQuery: 'forum reddit discussion looking for darts training app practice routines checkout training accuracy progression statistics',
    description: 'Darts players seeking structured training and progression tracking.'
  },
  {
    key: 'darts-league-friends',
    canonicalQuery: 'forum reddit discussion looking for darts app league friends local matches rankings tournament score tracking',
    description: 'Darts groups seeking leagues, rankings and match tracking.'
  },
  {
    key: 'running-gps-app',
    canonicalQuery: 'forum reddit discussion recommend a running app to record GPS routes compare times sessions rankings and friends',
    description: 'People seeking GPS running tracking, performance comparison, rankings or social features.'
  },
  {
    key: 'running-challenges-friends',
    canonicalQuery: 'forum reddit discussion looking for running app challenges with friends rankings routes personal records motivation',
    description: 'Runners seeking social challenges and friendly competition.'
  },
  {
    key: 'multisport-score-stats',
    canonicalQuery: 'forum reddit discussion recommend one app to track several sports scores results statistics rankings challenges between friends',
    description: 'People seeking one app for scoring and statistics across multiple sports.'
  },
  {
    key: 'petanque-score-app',
    canonicalQuery: 'forum reddit discussion recommend an app to keep petanque boules scores statistics matches teams and rankings',
    description: 'People seeking petanque/boules scoring and statistics.'
  },
  {
    key: 'table-tennis-score-app',
    canonicalQuery: 'forum reddit discussion looking for table tennis ping pong score app match history statistics rankings friends',
    description: 'Table-tennis players seeking scorekeeping and statistics.'
  },
  {
    key: 'foosball-score-app',
    canonicalQuery: 'forum reddit discussion looking for foosball table football score app teams match history statistics rankings',
    description: 'Foosball players seeking scorekeeping and rankings.'
  },
  {
    key: 'molkky-score-app',
    canonicalQuery: 'forum reddit discussion looking for molkky score counter app players games history statistics',
    description: 'Mölkky players seeking easy scoring and game history.'
  },
  {
    key: 'indoor-games-score-app',
    canonicalQuery: 'forum reddit discussion recommend an app to keep score and statistics for party games table tennis foosball darts molkky',
    description: 'People seeking scoring/statistics for indoor and casual sports.'
  },
  {
    key: 'sport-social-challenges',
    canonicalQuery: 'forum reddit discussion recommend a sports app to play with friends compare performances create challenges rankings and leaderboards',
    description: 'People seeking social sports, challenges and performance comparison.'
  },
  {
    key: 'find-sport-partners',
    canonicalQuery: 'forum reddit discussion looking for app to find local sports partners opponents teammates and organize matches',
    description: 'People seeking partners or opponents for local sport.'
  },
  {
    key: 'club-casual-leaderboard',
    canonicalQuery: 'forum reddit discussion looking for simple app for club friends leaderboard match results statistics without complicated software',
    description: 'Clubs and friend groups seeking lightweight rankings and stats.'
  },
  {
    key: 'wearables-sport-app',
    canonicalQuery: 'forum reddit discussion recommend a sports app compatible with smartwatch fitness watch GPS wearable to import sessions routes performance',
    description: 'People seeking smartwatch/wearable integration for sport sessions.'
  },
  {
    key: 'replace-paper-score',
    canonicalQuery: 'forum reddit discussion tired of paper score sheets looking for app score counter history statistics for games sports with friends',
    description: 'People explicitly wanting to replace manual/paper scoring.'
  }
];
