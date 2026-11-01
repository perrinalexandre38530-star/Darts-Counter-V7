import type { SearchIntent } from './domain';

/**
 * Conversion-first acquisition themes.
 * Each query is deliberately phrased like a real recommendation/problem search
 * so Brave favours community questions and forum discussions over SEO pages.
 * Highest-converting intents are kept first because scheduled scans rotate the list.
 */
export const SEARCH_INTENTS: SearchIntent[] = [
  {
    key: 'darts-score-app',
    canonicalQuery: 'darts scoring app recommend forum reddit discussion X01 cricket killer statistics match history friends',
    description: 'Darts players explicitly looking for a scoring/statistics application.'
  },
  {
    key: 'darts-counter-alternative',
    canonicalQuery: 'DartCounter alternative recommend darts scoring app forum reddit statistics training friends leagues',
    description: 'Darts players actively comparing or replacing an existing scoring app.'
  },
  {
    key: 'replace-paper-score',
    canonicalQuery: 'replace paper score sheet with app forum reddit darts table tennis foosball petanque score history statistics',
    description: 'People explicitly wanting to replace manual or paper scoring.'
  },
  {
    key: 'darts-training-app',
    canonicalQuery: 'darts training app recommend forum reddit checkout practice accuracy routines progression statistics',
    description: 'Darts players seeking structured training and progression tracking.'
  },
  {
    key: 'darts-league-friends',
    canonicalQuery: 'darts league friends app recommend forum reddit local matches rankings tournament score tracking',
    description: 'Darts groups seeking leagues, rankings and match tracking.'
  },
  {
    key: 'multisport-score-stats',
    canonicalQuery: 'one app several sports score statistics rankings friends recommend forum reddit darts ping pong foosball petanque',
    description: 'People seeking one app for scoring and statistics across multiple sports.'
  },
  {
    key: 'table-tennis-score-app',
    canonicalQuery: 'table tennis ping pong score app recommend forum reddit match history statistics rankings friends',
    description: 'Table-tennis players seeking scorekeeping and statistics.'
  },
  {
    key: 'petanque-score-app',
    canonicalQuery: 'petanque boules score app recommend forum discussion matches teams statistics rankings',
    description: 'People seeking petanque/boules scoring and statistics.'
  },
  {
    key: 'foosball-score-app',
    canonicalQuery: 'foosball table football score app recommend forum discussion teams match history statistics rankings',
    description: 'Foosball players seeking scorekeeping and rankings.'
  },
  {
    key: 'molkky-score-app',
    canonicalQuery: 'molkky score counter app recommend forum discussion players games history statistics',
    description: 'Mölkky players seeking easy scoring and game history.'
  },
  {
    key: 'club-casual-leaderboard',
    canonicalQuery: 'simple app club friends leaderboard match results statistics recommend forum without complicated software',
    description: 'Clubs and friend groups seeking lightweight rankings and stats.'
  },
  {
    key: 'sport-social-challenges',
    canonicalQuery: 'sports app challenges with friends rankings leaderboards compare performance recommend forum discussion',
    description: 'People explicitly seeking social sports challenges and performance comparison.'
  },
  {
    key: 'find-sport-partners',
    canonicalQuery: 'app find local sports partners opponents teammates organize matches recommend forum discussion',
    description: 'People explicitly seeking partners or opponents for local sport.'
  },
  {
    key: 'running-gps-app',
    canonicalQuery: 'running GPS app recommend forum routes sessions personal records statistics friends compare times',
    description: 'People seeking GPS running tracking, performance comparison or social features.'
  },
  {
    key: 'running-challenges-friends',
    canonicalQuery: 'running app challenges friends rankings routes personal records recommend forum discussion motivation',
    description: 'Runners seeking social challenges and friendly competition.'
  },
  {
    key: 'wearables-sport-app',
    canonicalQuery: 'sports app smartwatch GPS wearable import sessions routes performance recommend forum discussion',
    description: 'People seeking smartwatch or wearable integration for sport sessions.'
  },
  {
    key: 'indoor-games-score-app',
    canonicalQuery: 'score counter app party games darts table tennis foosball molkky recommend forum statistics history',
    description: 'People explicitly seeking scoring/statistics for indoor and casual sports.'
  }
];
