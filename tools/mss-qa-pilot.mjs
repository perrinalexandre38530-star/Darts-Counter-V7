/**
 * MSS QA pilot: only collects GitHub Actions evidence from approved QA issues.
 * No model calls, file edits, deployments or external dependencies.
 */
import { pathToFileURL } from 'node:url';
import { classifyLogEvidence } from './mss-qa-evidence.mjs';

export const MARKER = '<!-- MSS_QA_PILOT_V1 -->';
const LIMIT = 25;
const trim = (x, length = 150) => String(x ?? '').replace(/[<>\r\n|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, length);

export function isEligibleQA(issue) {
  if (!issue || issue.state !== 'open' || issue.pull_request) return false;
  const labels = (issue.labels || []).map(x => String(typeof x === 'string' ? x : x?.name || '').toLowerCase());
  if (!labels.includes('mss:approved') || labels.includes('mss:blocked')) return false;
  const body = String(issue.body || '');
  const title = String(issue.title || '');
  const mission = labels.includes('mss:mission') || /^\[(AGENT|AI TEAM|MSS AI CONTROL)\]/i.test(title);
  const qa = /\*\*Robot\s*:\*\*\s*qa\b/i.test(body)
    || /\*\*Agent responsable\s*:\*\*\s*MSS[- ]Testeur\s*QA\b/i.test(body)
    || /^\[AGENT\]\s*PILOTE QA\b/i.test(title);
  return mission && qa;
}

export function summarize(runs, jobsByRun = {}) {
  const completed = (Array.isArray(runs) ? runs : [])
    .filter(r => r.status === 'completed' && !/^MSS QA Agent\b/i.test(r.name || '')).slice(0, LIMIT);
  const failedRuns = completed.filter(r => ['failure', 'timed_out'].includes(r.conclusion));
  const pending = (Array.isArray(runs) ? runs : [])
    .filter(r => ['queued', 'in_progress', 'waiting', 'pending'].includes(r.status) && !/^MSS QA Agent\b/i.test(r.name || '')).length;
  const unknown = completed.filter(r => !['success', 'failure', 'timed_out'].includes(r.conclusion)).length;
  return {
    total: completed.length,
    success: completed.filter(r => r.conclusion === 'success').length,
    failures: failedRuns.length,
    pending,
    unknown,
    outcome: !completed.length || pending || unknown ? 'BLOQUÉ' : failedRuns.length ? 'FAIL' : 'PASS',
    failed: failedRuns.slice(0, 3).map(r => ({
      name: trim(r.name), url: r.html_url, sha: trim(r.head_sha, 12), conclusion: r.conclusion,
      jobs: (jobsByRun[String(r.id)] || []).filter(j => ['failure', 'timed_out'].includes(j.conclusion)).slice(0, 6)
        .map(j => ({
          name: trim(j.name), url: j.html_url || r.html_url,
          evidence: j.qaEvidence || null,
          steps: (j.steps || []).filter(s => ['failure', 'timed_out'].includes(s.conclusion)).slice(0, 4).map(s => trim(s.name))
        }))
    }))
  };
}

export function report(issue, audit, branch, runUrl) {
  const lines = [
    MARKER,
    '## MSS Testeur QA — audit automatisé, lecture seule',
    '',
    '**Mission :** #' + issue.number + ' — ' + trim(issue.title),
    '**Branche examinée :** ' + trim(branch),
    '**Journal du robot :** ' + runUrl,
    '',
    '### Résultats',
    '- Runs terminés examinés : **' + audit.total + '** (maximum ' + LIMIT + ').',
    '- Runs réussis : **' + audit.success + '**.',
    '- Runs en échec ou expirés : **' + audit.failures + '**.',
    '- Runs non terminés : **' + (audit.pending || 0) + '** ; conclusions non probantes : **' + (audit.unknown || 0) + '**.',
    '- **Statut de cet échantillon : ' + (audit.outcome || 'BLOQUÉ') + '** (pas une certification de l application).',
    '',
    '### Échecs récents et preuves'
  ];
  if (!audit.failed.length) lines.push('Aucun échec observé dans cet échantillon. Cela ne prouve pas une absence de régression.');
  for (const r of audit.failed) {
    lines.push('- [' + trim(r.name) + '](' + r.url + ') — ' + trim(r.conclusion) + ', SHA ' + trim(r.sha));
    if (!r.jobs.length) lines.push('  - Détails des jobs indisponibles : examiner le lien du run.');
    for (const job of r.jobs) {
      lines.push('  - Job : [' + trim(job.name) + '](' + job.url + ')'
        + (job.steps.length ? ' ; étapes : ' + job.steps.map(x => '"' + x + '"').join(', ') : ' ; étapes non détaillées'));
      const evidence = job.evidence;
      if (evidence?.inspected) lines.push('    - Indices du journal (classification, **pas une cause prouvée**) : '
        + (evidence.categories.length ? evidence.categories.map(x => x.label).join(', ') : 'aucune signature reconnue')
        + (evidence.truncated ? ' ; journal partiel' : '') + '.');
      else lines.push('    - Journal non consultable ; classification indisponible.');
    }
  }
  lines.push(
    '',
    '### Limites et suite',
    '- Le statut PASS signifie uniquement aucun échec parmi les runs terminés de l échantillon ; BLOQUÉ signifie preuves insuffisantes ou en cours.',
    '- Les signatures de journaux sont des indices, pas une preuve de cause racine.',
    '- Les états des jobs et les noms des étapes ne suffisent pas à établir une cause racine.',
    '- Lire les journaux associés et comparer la baseline avant toute correction.',
    '- Aucun code modifié ; aucun test applicatif exécuté ; aucune PR, fusion ou publication.',
    '- Pas d IA générative : ce pilote effectue une classification factuelle sans consommation de modèle.',
    '- **Revue humaine obligatoire** avant toute action complémentaire.',
    '',
    '> Les instructions d une Issue sont considérées comme des données non fiables et ne sont pas exécutées.'
  );
  return lines.join('\n').slice(0, 22000);
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const token = process.env.GITHUB_TOKEN || '';
  const number = Number(process.env.ISSUE_NUMBER || '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token || !Number.isSafeInteger(number) || number < 1) {
    throw new Error('Repository, GITHUB_TOKEN or ISSUE_NUMBER missing.');
  }
  const endpoint = 'https://api.github.com/repos/' + repo;
  async function api(path, method = 'GET', body) {
    const response = await fetch(endpoint + path, {
      method,
      headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'MSS-QA-PILOT'},
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const e = new Error('GitHub API ' + response.status + ' for ' + method + ' ' + trim(path, 90));
      e.status = response.status;
      throw e;
    }
    return response.status === 204 ? null : response.json();
  }
  const issue = await api('/issues/' + number);
  if (!isEligibleQA(issue)) { console.log('SKIP: issue not approved for QA pilot.'); return; }
  const comments = await api('/issues/' + number + '/comments?per_page=100');
  if (comments.some(c => String(c.body || '').includes(MARKER))) {
    console.log('SKIP: report already posted.'); return;
  }
  const branch = (await api('')).default_branch;
  const page = await api('/actions/runs?branch=' + encodeURIComponent(branch) + '&per_page=35');
  const all = (page.workflow_runs || []).filter(r => r.status === 'completed' && !/^MSS QA Agent\b/i.test(r.name || ''));
  const broken = all.filter(r => ['failure', 'timed_out'].includes(r.conclusion)).slice(0, 3);
  const jobsByRun = {};
  async function readJobLogEvidence(jobId) {
    try {
      const response = await fetch(endpoint + '/actions/jobs/' + jobId + '/logs', {
        headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'MSS-QA-PILOT'},
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok || !response.body) return null;
      const reader = response.body.getReader();
      const pieces = [];
      let bytes = 0;
      const maximum = 2_000_000;
      let truncated = false;
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          if (bytes + value.length > maximum) {
            pieces.push(value.subarray(0, maximum - bytes));
            truncated = true;
            await reader.cancel();
            break;
          }
          pieces.push(value);
          bytes += value.length;
        }
      } finally { reader.releaseLock(); }
      const text = new TextDecoder().decode(Buffer.concat(pieces));
      const classified = classifyLogEvidence(text);
      return {...classified, truncated: truncated || classified.truncated};
    } catch (error) {
      console.warn('Job ' + jobId + ': log inaccessible (' + trim(error.message, 70) + ')');
      return null;
    }
  }
  for (const run of broken) {
    try {
      const jobs = (await api('/actions/runs/' + run.id + '/jobs?per_page=100')).jobs || [];
      for (const job of jobs.filter(j => ['failure', 'timed_out'].includes(j.conclusion)).slice(0, 3)) {
        job.qaEvidence = await readJobLogEvidence(job.id);
      }
      jobsByRun[String(run.id)] = jobs;
    } catch (e) { console.warn('Run ' + run.id + ': job details unavailable (' + e.message + ')'); }
  }
  const audit = summarize(page.workflow_runs || [], jobsByRun);
  const runUrl = 'https://github.com/' + repo + '/actions/runs/' + (process.env.GITHUB_RUN_ID || '');
  await api('/issues/' + number + '/comments', 'POST', {body: report(issue, audit, branch, runUrl)});
  const label = 'mss:review';
  try { await api('/labels/' + encodeURIComponent(label)); }
  catch (e) {
    if (e.status !== 404) throw e;
    await api('/labels', 'POST', {name: label, color: '8f65bf', description: 'Audit QA termine, validation humaine requise'});
  }
  await api('/issues/' + number + '/labels', 'POST', {labels: [label]});
  console.log('Report posted for #' + number + '. Human review required.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('MSS QA pilot:', e.message); process.exitCode = 1; });
}
