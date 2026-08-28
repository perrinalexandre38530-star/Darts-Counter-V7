# wger exercise catalogue attribution

FIT PERF can optionally load public exercise metadata from the wger REST API:

- Project: wger Workout Manager
- Website/API: https://wger.de/api/v2/
- Source code: https://github.com/wger-project/wger

The wger application code is licensed under AGPL-3.0-or-later. Exercise content and media can carry Creative Commons and/or per-item licensing metadata. FIT PERF therefore stores the licence/author metadata returned by the API on each imported exercise and displays source/licence attribution in the exercise detail view when wger content is used.

No wger application source code is bundled into MULTISPORTS SCORING by the FIT catalogue integration. The integration consumes the public API and caches only normalized exercise records required by the app.
