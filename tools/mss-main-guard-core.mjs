/** Pure decision engine for the MSS single-main synchronization sentinel. */
export function assessMain({ branch, localSha, remoteSha, dirty = false, trackingSha = null, trackingKnown = false, remoteChecked = true }) {
  const errors = [];
  const warnings = [];
  if (branch !== 'main') errors.push(`Branche locale « ${branch || 'inconnue'} » : seule main est autorisée.`);
  if (dirty) errors.push('Modifications locales détectées : sauvegarder le travail avant synchronisation.');
  if (!localSha) errors.push('Commit local impossible à identifier.');
  if (!remoteChecked || !remoteSha) errors.push('Commit GitHub main non vérifié : synchronisation non certifiable.');
  else if (localSha && localSha !== remoteSha) errors.push(`Écart de commit : local ${localSha.slice(0, 12)} / GitHub ${remoteSha.slice(0, 12)}.`);
  if (trackingKnown && trackingSha && remoteSha && trackingSha !== remoteSha) warnings.push('Référence origin/main locale obsolète : git fetch origin nécessaire.');
  return { ok: errors.length === 0, errors, warnings, branch, localSha, remoteSha };
}
