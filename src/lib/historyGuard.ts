
// src/lib/historyGuard.ts
// évite les crashs si une entrée history est corrompue

export function isValidHistoryRow(row: any) {
  if (!row) return false
  if (!row.id) return false
  if (!row.createdAt) return false
  return true
}

export function filterValidHistory(rows: any[]) {
  if (!Array.isArray(rows)) return []
  return rows.filter(isValidHistoryRow)
}
