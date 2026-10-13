from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def edit(rel, fn):
    p = ROOT / rel
    s = p.read_text(encoding="utf-8")
    out = fn(s)
    if out == s:
        raise SystemExit(f"V121: no change applied to {rel}")
    p.write_text(out, encoding="utf-8")
    print(f"patched {rel}")


def patch_storage(s: str) -> str:
    # 1) Future snapshots advertise the effective, normalized profile count.
    s = s.replace(
        '      profiles: profiles.length,\n',
        '      profiles: normalizedPortableProfileCount({ profiles }),\n',
        1,
    )

    marker = 'function expectedPortableCounts(portable: any): PortableAccountRestoreCounts {\n'
    if marker not in s:
        raise SystemExit('V121 storage: expectedPortableCounts marker missing')
    helper = '''function normalizedPortableProfileCount(portable: any): number {\n  const rows = Array.isArray(portable?.profiles) ? portable.profiles : [];\n  const byId = new Set<string>();\n  for (const raw of rows) {\n    if (!raw || typeof raw !== "object") continue;\n    const row = normalizeRestoredLocalProfileMarkers(raw);\n    const id = String(row?.id || "").trim();\n    if (!id || id.startsWith("online:")) continue;\n    byId.add(id);\n  }\n  return byId.size;\n}\n\n'''
    s = s.replace(marker, helper + marker, 1)

    old = '    profiles: Math.max(Number(counts.profiles || 0), Array.isArray(portable?.profiles) ? portable.profiles.length : 0),\n'
    new = '    // V121: les anciens snapshots comptaient aussi les miroirs online et doublons d\'ID.\n    // Le garde-fou doit comparer ce qui est réellement restaurable, pas le compteur brut legacy.\n    profiles: normalizedPortableProfileCount(portable),\n'
    if old not in s:
        raise SystemExit('V121 storage: expected profiles expression missing')
    s = s.replace(old, new, 1)

    old = '    profiles: Array.isArray(store?.profiles) ? store.profiles.filter((p: any) => p && String(p.id || "").trim()).length : 0,\n'
    new = '    profiles: normalizedPortableProfileCount({ profiles: Array.isArray(store?.profiles) ? store.profiles : [] }),\n'
    if old not in s:
        raise SystemExit('V121 storage: restored profiles count expression missing')
    s = s.replace(old, new, 1)
    return s


def patch_owned(s: str) -> str:
    s = s.replace('const HISTORY_BATCH_SIZE = 24;', 'const HISTORY_BATCH_SIZE = 8;', 1)

    # Export exactly the same profile serialization count used by cloud sync.
    pattern = re.compile(r'(function serializeProfiles\(input: any\[\], userId: string\): any\[\] \{.*?\n\})\n\nfunction serializeBots', re.S)
    m = pattern.search(s)
    if not m:
        raise SystemExit('V121 accountOwned: serializeProfiles block missing')
    block = m.group(1)
    addition = block + '''\n\nexport function countAccountOwnedLocalProfilesForUser(input: any[], userId: string): number {\n  return serializeProfiles(Array.isArray(input) ? input : [], userId).length;\n}\n\nfunction serializeBots'''
    s = s[:m.start()] + addition + s[m.end():]

    old = '      if (!id || String((record as any)?.status || "").toLowerCase() !== "finished") return;\n'
    new = '      if (!id || !isAccountSyncFinishedMatch(record)) return;\n'
    if old in s:
        s = s.replace(old, new, 1)

    # Harden Realtime against DELETE/partial payloads. A malformed/partial singleton
    # must never be fed to an array consumer (the former `.length` crash).
    old = '''          const row = (event?.new && Object.keys(event.new).length ? event.new : event?.old) as SyncRow;\n          if (!row) return;\n          if (isOwnRealtimeEcho(row)) {\n'''
    new = '''          const eventNew = event?.new && typeof event.new === "object" ? event.new : null;\n          const eventOld = event?.old && typeof event.old === "object" ? event.old : null;\n          const row = (eventNew && Object.keys(eventNew).length ? eventNew : eventOld) as SyncRow | null;\n          if (!row || typeof row !== "object") return;\n          const rowType = String(row?.document_type || "").trim();\n          if (!rowType) return;\n          const arraySingletons = new Set<string>([DOC.profiles, DOC.bots, DOC.teams, DOC.gallery, DOC.dartSets]);\n          if (!row?.deleted_at && arraySingletons.has(rowType) && !Array.isArray(row?.payload)) {\n            console.warn("[account-sync] realtime singleton payload ignored", {\n              type: rowType, id: row?.document_id, payloadType: typeof row?.payload, eventType: event?.eventType,\n            });\n            return;\n          }\n          if (isOwnRealtimeEcho(row)) {\n'''
    if old not in s:
        raise SystemExit('V121 accountOwned: realtime callback marker missing')
    s = s.replace(old, new, 1)
    return s


def patch_diag(s: str) -> str:
    # Import canonical counter from the serializer itself.
    import_marker = 'import { loadStatsIndex } from "./stats/rebuildStatsFromHistory";\n'
    if import_marker not in s:
        raise SystemExit('V121 diag: import marker missing')
    s = s.replace(import_marker, import_marker + 'import { countAccountOwnedLocalProfilesForUser } from "./accountOwnedSync";\n', 1)
    s = s.replace('  version: "v119";', '  version: "v121";', 1)
    s = s.replace('const LAST_REPORT_KEY = "dc_account_sync_diagnostic_v119";', 'const LAST_REPORT_KEY = "dc_account_sync_diagnostic_v121";', 1)
    s = s.replace('version: "v119", generatedAt', 'version: "v121", generatedAt')
    s = s.replace('internal-diagnostic-v119', 'internal-diagnostic-v121')

    old = '  const localProfiles = Array.isArray(store?.profiles) ? store.profiles.filter((p: any) => !isCanonicalAccountProfile(p, userId)) : [];\n'
    new = '''  const localProfiles = Array.isArray(store?.profiles)\n    ? store.profiles.filter((p: any) => p && String(p?.id || "").trim() && !isCanonicalAccountProfile(p, userId))\n    : [];\n  const syncedLocalProfileCount = countAccountOwnedLocalProfilesForUser(Array.isArray(store?.profiles) ? store.profiles : [], userId);\n'''
    if old not in s:
        raise SystemExit('V121 diag: localProfiles marker missing')
    s = s.replace(old, new, 1)
    s = s.replace('    profiles: localProfiles.length,\n', '    profiles: syncedLocalProfileCount,\n', 1)

    # Surface the auth retry state so a future report tells us whether the JWT was
    # renewed instead of merely saying that R2 failed.
    auth_add_marker = '  add(checks, { id: "auth", label: "Compte connecté", status: "ok", detail: `UID ${userId.slice(0, 8)}… — session Supabase valide.` });\n'
    auth_add = auth_add_marker + '''  try {\n    const authDiag: any = (window as any).__mscAccountMediaAuthDiag || null;\n    add(checks, {\n      id: "account_media_auth",\n      label: "JWT Supabase / bridge R2 média",\n      status: authDiag?.ok === false ? "warn" : "ok",\n      detail: authDiag\n        ? `Dernier refresh média : ${authDiag.ok ? "OK" : "à reprendre"}${authDiag.retryStatus ? ` · retry HTTP ${authDiag.retryStatus}` : ""}.`\n        : "Session Supabase active ; le refresh R2 sera déclenché automatiquement au premier 401/403.",\n      data: authDiag || { lazyRefresh: true },\n    });\n  } catch {}\n'''
    if auth_add_marker not in s:
        raise SystemExit('V121 diag: auth add marker missing')
    s = s.replace(auth_add_marker, auth_add, 1)
    return s


edit('src/lib/storage.ts', patch_storage)
edit('src/lib/accountOwnedSync.ts', patch_owned)
edit('src/lib/accountSyncDiagnostics.ts', patch_diag)
print('V121 source patch complete')
