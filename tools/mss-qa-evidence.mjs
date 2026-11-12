/**
 * Deterministic QA log classification. Never publish raw logs or arbitrary log excerpts
 * to public GitHub Issues. Categories are diagnostic hints, not root-cause proof.
 */
const SIGNATURES = [
  {id: 'ANDROID_MEDIA_BUDGET', label: 'Budget médias Android dépassé', re: /GARDE-FOU MÉDIA ANDROID DÉPASSÉ|Android local media.*(?:exceeded|dépasse)|MSS_ANDROID_LOCAL_MEDIA_MAX_MB/i},
  {id: 'ANDROID_GRADLE', label: 'Compilation Gradle Android', re: /Execution failed for task|BUILD FAILED|Gradle build failed/i},
  {id: 'TYPESCRIPT', label: 'Contrôle TypeScript', re: /error TS\d{4}|typescript compilation failed|tsc.*(?:error|failed)/i},
  {id: 'TEST_FAILURE', label: 'Test automatisé en échec', re: /not ok \d+|AssertionError|Tests:.*failed|FAIL\s+\S+\.test/i},
  {id: 'DEPENDENCY', label: 'Installation de dépendances', re: /npm ERR!|npm error|ERESOLVE|Could not resolve all dependencies/i},
  {id: 'AUTH_OR_PERMISSION', label: 'Authentification ou permissions', re: /HTTP 40[13]|Resource not accessible by integration|permission denied|AccessDenied/i},
  {id: 'NETWORK', label: 'Réseau ou délai dépassé', re: /ETIMEDOUT|ECONNRESET|ENOTFOUND|timed out|network unreachable/i},
];
const CHECKS = {
  ANDROID_MEDIA_BUDGET: 'Consulter le rapport de taille Android et vérifier les médias indispensables hors ligne ; ne pas relever le plafond.',
  ANDROID_GRADLE: 'Examiner la première tâche Gradle en échec et comparer la configuration SDK/Java entre les deux SHAs.',
  TYPESCRIPT: 'Reproduire le contrôle TypeScript sur le SHA exact et identifier le fichier et la règle en échec.',
  TEST_FAILURE: 'Relancer uniquement le test concerné et comparer son résultat à la branche de référence.',
  DEPENDENCY: 'Vérifier le lockfile, la version Node et la reproductibilité avec npm ci.',
  AUTH_OR_PERMISSION: 'Vérifier les permissions minimales du job ; ne pas publier ni demander de secrets dans une Issue.',
  NETWORK: 'Distinguer incident externe temporaire et régression reproductible avant toute correction.',
};
export function suggestedChecks(categories) {
  return (Array.isArray(categories) ? categories : [])
    .map(item => CHECKS[item?.id]).filter(Boolean).slice(0, 5);
}

export function classifyLogEvidence(log) {
  const safe = String(log || '').slice(0, 2_000_000);
  // Return only fixed categories, never a user-controlled snippet.
  const categories = SIGNATURES.filter(s => s.re.test(safe)).map(s => ({id: s.id, label: s.label}));
  return {categories, inspected: safe.length > 0, truncated: String(log || '').length > 2_000_000};
}
export function summarizeJobEvidence(results) {
  return results.map(item => ({
    jobId: item.jobId,
    ...classifyLogEvidence(item.text || ''),
    available: Boolean(item.available),
  }));
}
