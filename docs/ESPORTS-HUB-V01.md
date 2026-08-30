# E-SPORTS HUB V0.1 — foundation

## Runtime policy

- Web/PWA: E-SPORTS HUB is visible in GameSelect.
- Android Store: E-SPORTS is hidden by default and is not part of `ANDROID_STORE_V1_SPORT_IDS`.
- Android preview only: `VITE_ENABLE_ESPORTS_ANDROID_PREVIEW=true` can explicitly unlock it for a dedicated development build.
- Direct E-SPORTS routes are also runtime-gated, so hiding the GameSelect card is not the only protection.

## Delivered foundation

- Generic `EsportsGameDefinition` model: games are data, not hardcoded pages.
- Initial catalog: 27 competitive games across FPS, MOBA, sports, racing, fighting, strategy, battle royale and mobile.
- Gamer profile with platform IDs and looking-for-group status.
- Favorites and active game selection.
- Local rooms with share codes, teams, ready state and match launch state.
- Online room bridge using the existing MULTISPORTS SCORING `onlineApi`: create, join, realtime subscription, ready and start match.
- Generic match result recording and local history.
- Generic E-SPORTS statistics by game.
- Tournament generator: single elimination and round robin.
- Dedicated E-SPORTS BottomNav.

## Routes

- `home` -> E-SPORTS overview when sport is `esports`
- `games` -> game catalog
- `esports_rooms`
- `esports_matches`
- `esports_tournaments`
- `esports_profile`
- `esports_stats`

## Next development layers

1. Persist E-SPORTS tournaments and match results server-side for multi-device accounts.
2. Add live room chat, invitations and friend presence filtered by selected game.
3. Add team/clan entities and LFG/matchmaking filters.
4. Add tournament result entry that automatically advances brackets.
5. Add per-game stat templates and match forms.
6. Add publisher/platform integrations progressively (Steam, Riot, Epic, EA, etc.) where APIs and terms permit.
7. Add public E-SPORTS rankings, seasons, badges and achievements.
