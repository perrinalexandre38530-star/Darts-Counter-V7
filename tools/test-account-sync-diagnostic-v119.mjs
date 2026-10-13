import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const diag = read("src/lib/accountSyncDiagnostics.ts");
const panel = read("src/components/settings/AccountSyncDiagnosticsPanel.tsx");
const settings = read("src/pages/Settings.tsx");
const r2 = read("src/lib/directR2BackupApi.ts");
const media = read("src/lib/userMediaFallback.ts");

const checks = [
  ["diagnostic checks auth, account documents and history/stats", /account_sync_documents/.test(diag) && /history_stats/.test(diag) && /stats_index/.test(diag)],
  ["diagnostic has active Supabase Realtime + RLS probe with cleanup", /diagnostic_probe/.test(diag) && /postgres_changes/.test(diag) && /\.delete\(\)/.test(diag)],
  ["diagnostic has binary R2 round-trip probe with cleanup", /testR2BinaryRoundTrip/.test(diag) && /uploadAccountR2Media/.test(diag) && /downloadAccountR2Media/.test(diag) && /deleteAccountR2Media/.test(diag)],
  ["diagnostic checks local media coverage and object size", /media_coverage/.test(diag) && /media_sizes/.test(diag)],
  ["diagnostic checks restore safety slots and selected destination", /before-restore/.test(diag) && /selectedDestination/.test(diag)],
  ["settings exposes internal account sync diagnostic panel", /AccountSyncDiagnosticsPanel/.test(settings) && /TEST COMPLET \+ RESYNC/.test(panel)],
  ["account-media keys are normalized exactly like Cloudflare safeId", /normalizeAccountR2MediaKey/.test(r2) && /replace\(\/\[\^a-zA-Z0-9_-\]\//.test(r2)],
  ["local media vault exposes metadata-only diagnostics", /getUserMediaVaultDiagnostics/.test(media) && /approxBytes/.test(media) && /byKind/.test(media)],
  ["diagnostic report never embeds media pixels", !/dataUrl\s*:/.test(panel)],
];

let ok = 0;
for (const [label, pass] of checks) {
  if (!pass) {
    console.error(`❌ ${label}`);
    process.exitCode = 1;
  } else {
    ok++;
    console.log(`✅ ${label}`);
  }
}
if (ok === checks.length) console.log(`\n✅ Account Sync internal diagnostic V119: ${ok}/${checks.length}`);
