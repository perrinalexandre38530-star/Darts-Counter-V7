#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const manifest = read('android/app/src/main/AndroidManifest.xml');
const plugin = read('android/app/src/main/java/com/multisportsscoring/app/HealthConnectPlugin.java');
const bridge = read('src/activity/healthConnectBridge.ts');
const panel = read('src/pages/running/RunningConnectionsPanel.tsx');

const checks = [];
const check = (label, ok) => checks.push({ label, ok: !!ok });

for (const permission of [
  'READ_EXERCISE', 'WRITE_EXERCISE', 'READ_EXERCISE_ROUTES', 'WRITE_EXERCISE_ROUTE',
  'READ_HEART_RATE', 'WRITE_HEART_RATE', 'READ_DISTANCE', 'WRITE_DISTANCE',
  'READ_SPEED', 'WRITE_SPEED', 'READ_ELEVATION_GAINED', 'WRITE_ELEVATION_GAINED',
  'READ_STEPS', 'WRITE_STEPS',
]) {
  check(`Manifest Health Connect ${permission}`, manifest.includes(`android.permission.health.${permission}`));
}

check('Permissions import/export séparées', plugin.includes('IMPORT_WORKOUT_PERMISSIONS') && plugin.includes('EXPORT_WORKOUT_PERMISSIONS'));
check('Demande import/export ciblée', plugin.includes('"export".equalsIgnoreCase(mode) ? EXPORT_WORKOUT_PERMISSIONS : IMPORT_WORKOUT_PERMISSIONS'));
check('WRITE_HEART_RATE réellement écrit', plugin.includes('new HeartRateRecord(') && plugin.includes('heartRateSamplesWritten'));
check('WRITE_SPEED réellement écrit', plugin.includes('new SpeedRecord(') && plugin.includes('speedSamplesWritten'));
check('WRITE_STEPS réellement écrit via cadence', plugin.includes('new StepsCadenceRecord(') && plugin.includes('cadenceSamplesWritten'));
check('Lectures optionnelles protégées par permission', plugin.includes('permissions.contains("android.permission.health.READ_HEART_RATE")') && plugin.includes('permissions.contains("android.permission.health.READ_SPEED")') && plugin.includes('permissions.contains("android.permission.health.READ_STEPS")'));
check('Bridge exporte les échantillons réels', bridge.includes('sensorSamples: exportSensorSamples(activity)'));
check('Vitesse GPS exportable', bridge.includes('haversineMeters(previous, point) / dt'));
check('UI autorise import/export séparément', panel.includes('requestHealthConnectWorkoutPermissions(mode)') || (panel.includes('grantHealth("import")') && panel.includes('grantHealth("export")')));
check('UI disclosure Health Connect visible', panel.includes('disclosure:') && panel.includes('données réellement enregistrées'));

const failed = checks.filter((row) => !row.ok);
for (const row of checks) console.log(`${row.ok ? '✅' : '❌'} ${row.label}`);
if (failed.length) {
  console.error(`\n❌ HEALTH CONNECT COMPLIANCE CHECK FAILED (${failed.length})`);
  process.exit(1);
}
console.log(`\n✅ HEALTH CONNECT COMPLIANCE CHECK OK — ${checks.length}/${checks.length}`);
