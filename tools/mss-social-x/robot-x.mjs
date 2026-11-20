#!/usr/bin/env node
// ROBOT MSS — Remplace UNIQUEMENT l'avatar et la couverture du compte X officiel.
// Les identifiants ne sont ni demandés dans le terminal ni exportés :
// l'utilisateur se connecte, si nécessaire, dans le navigateur Chrome dédié.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
// Le moteur s'installe UNIQUEMENT dans tools/mss-social-x/runtime.
// Aucune modification du package.json racine ni de pnpm-lock.yaml.
const playwrightEntry = join(dirname(fileURLToPath(import.meta.url)), 'runtime', 'node_modules', 'playwright', 'index.mjs');
if (!existsSync(playwrightEntry)) {
  console.error('Playwright absent du dossier isolé. Démarrer via DEMARRER_ROBOT_X.cmd.');
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(playwrightEntry).href);
import { HANDLE, PROFILE_URL, assertCorrectAccount, assertJpeg, FILE_TARGETS, CLICK_TARGETS } from './robot-utils.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const logo = join(here, 'assets', 'MSS_LOGO_OFFICIEL.jpg');
const cover = join(here, 'assets', 'MSS_COUVERTURE_OFFICIELLE.jpg');
const base = process.env.LOCALAPPDATA || join(homedir(), '.mss-robots');
const workdir = join(base, 'MSS_ROBOTS', 'X_OFFICIEL');
const profileDir = join(workdir, 'navigateur_mss');
const reportDir = join(workdir, 'rapports');
mkdirSync(reportDir, { recursive: true });

const report = {
  schema: 'mss.social.profile-media.v1',
  account: `@${HANDLE}`,
  site: PROFILE_URL,
  date: new Date().toISOString(),
  result: 'NON_VERIFIE',
  avatar: 'NON_TENTE',
  banner: 'NON_TENTE',
  before: null,
  after: null,
  observations: []
};
const info = (message) => { console.log('🤖 ' + message); report.observations.push(message); };
const delay = ms => new Promise(done => setTimeout(done, ms));
const pathReport = join(reportDir, `rapport_${new Date().toISOString().replace(/[:.]/g,'-')}.json`);

async function firstExisting(scope, selectors) {
  for (const selector of selectors) {
    const candidate = scope.locator(selector).first();
    if (await candidate.count().catch(() => 0)) return { selector, candidate };
  }
  return null;
}

async function getLoggedInHandle(page) {
  const sidebar = page.locator('[data-testid="AppTabBar_Profile_Link"]').first();
  if (!await sidebar.count()) return null;
  const href = await sidebar.getAttribute('href').catch(() => null);
  if (!href) return null;
  return href;
}

async function ensureLoggedIn(page) {
  info('Ouverture du compte X MSS dans le navigateur du robot.');
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(2500);
  let logged = await getLoggedInHandle(page);
  if (logged) {
    assertCorrectAccount(logged);
    return;
  }
  info('Une connexion X est nécessaire UNE SEULE FOIS dans cette fenêtre. Connecte le compte MSS, puis le robot reprendra automatiquement.');
  await page.goto('https://x.com/i/flow/login', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  const until = Date.now() + 20 * 60 * 1000;
  while (Date.now() < until) {
    logged = await getLoggedInHandle(page).catch(() => null);
    if (logged) {
      assertCorrectAccount(logged);
      info('Compte X MSS connecté et vérifié.');
      return;
    }
    await delay(2000);
  }
  throw new Error('Connexion X non confirmée après 20 minutes. Aucun fichier téléversé.');
}

async function snapshotMedia(page) {
  return page.evaluate(() => {
    const src = [...document.images].map(im => im.currentSrc || im.src || '');
    const bg = [...document.querySelectorAll('[style]')].map(el => getComputedStyle(el).backgroundImage || '');
    const all = [...src, ...bg];
    return {
      profileImage: all.find(x => /pbs\.twimg\.com\/profile_images\//i.test(x)) || null,
      bannerImage: all.find(x => /pbs\.twimg\.com\/profile_banners\//i.test(x)) || null
    };
  });
}

async function openEditor(page) {
  const button = await firstExisting(page, [
    '[data-testid="editProfileButton"]',
    'button:has-text("Edit profile")',
    'button:has-text("Modifier le profil")',
    'a:has-text("Edit profile")'
  ]);
  if (!button) throw new Error('Bouton Edit profile introuvable. Interface X peut avoir changé.');
  await button.candidate.click({ timeout: 15000 });
  const dialog = page.locator('[role="dialog"]').last();
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  return dialog;
}

async function handleCrop(page, kind) {
  // X peut ouvrir une fenêtre de recadrage (Apply/Appliquer).
  const apply = page.getByRole('button', { name: /^(Apply|Appliquer)$/i }).last();
  if (await apply.isVisible({ timeout: 7000 }).catch(() => false)) {
    await apply.click({ timeout: 10000 });
    info(`Recadrage ${kind} validé dans X.`);
    await delay(1000);
  } else {
    info(`Aucun écran « Appliquer » distinct observé pour ${kind}.`);
  }
}

async function setFile(page, dialog, kind, file) {
  const direct = await firstExisting(dialog, FILE_TARGETS[kind]);
  if (direct) {
    await direct.candidate.setInputFiles(file, { timeout: 20000 });
    info(`Fichier ${kind} transféré via ${direct.selector}.`);
    await handleCrop(page, kind);
    return;
  }
  // Si l'input est caché derrière l'icône appareil photo, intercepter le sélecteur natif.
  for (const selector of CLICK_TARGETS[kind]) {
    const element = dialog.locator(selector).first();
    if (!await element.count()) continue;
    if (!await element.isVisible().catch(() => false)) continue;
    const chooser = page.waitForEvent('filechooser', { timeout: 6500 }).catch(() => null);
    try { await element.click({ timeout: 10000 }); } catch { continue; }
    const fileChooser = await chooser;
    if (fileChooser) {
      await fileChooser.setFiles(file);
      info(`Fichier ${kind} transféré via le bouton appareil photo.`);
      await handleCrop(page, kind);
      return;
    }
    // Certains designs placent l'input dans l'élément après clic.
    const afterClick = await firstExisting(dialog, FILE_TARGETS[kind]);
    if (afterClick) {
      await afterClick.candidate.setInputFiles(file, { timeout: 20000 });
      info(`Fichier ${kind} transféré après ouverture du sélecteur.`);
      await handleCrop(page, kind);
      return;
    }
  }
  // Refuser un choix aveugle par index : pourrait intervertir l'avatar et la couverture.
  const count = await dialog.locator('input[type="file"]').count().catch(() => 0);
  throw new Error(`Champ ${kind} non identifié (${count} input(s) fichier). Arrêt sécurisé sans échange des images.`);
}

async function main() {
  assertJpeg(logo);
  assertJpeg(cover);
  let browser = null;
  try {
    info('Fichiers officiels fournis par le propriétaire vérifiés. Aucun remplacement graphique.');
    try {
      browser = await chromium.launchPersistentContext(profileDir, {
        channel: 'chrome', headless: false, viewport: { width: 1440, height: 900 },
        acceptDownloads: true, locale: 'fr-FR'
      });
    } catch (error) {
      if (process.platform !== 'win32') {
        browser = await chromium.launchPersistentContext(profileDir, {
          executablePath: '/usr/bin/chromium', headless: false,
          viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: 'fr-FR'
        });
      } else {
        throw new Error('Google Chrome introuvable. Il doit être installé sur Windows. Détail : ' + error.message);
      }
    }
    const page = browser.pages()[0] || await browser.newPage();
    page.setDefaultTimeout(15000);
    await ensureLoggedIn(page);
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2300);
    report.before = await snapshotMedia(page);
    const editor = await openEditor(page);
    for (const [kind, file] of [['banner',cover], ['avatar',logo]]) {
      try {
        info(`Installation de ${kind === 'banner' ? 'la couverture' : 'l\'avatar'}…`);
        await setFile(page, editor, kind, file);
        report[kind] = 'TRANSMIS_AU_FORMULAIRE';
      } catch (err) {
        report[kind] = 'ECHEC : ' + err.message;
        info(`Blocage ${kind} : ${err.message}`);
      }
    }
    if (report.banner !== 'TRANSMIS_AU_FORMULAIRE' && report.avatar !== 'TRANSMIS_AU_FORMULAIRE') {
      throw new Error('Aucun fichier n’a été chargé ; la page X a peut-être changé.');
    }
    const save = await firstExisting(page, [
      '[data-testid="Profile_Save_Button"]',
      'button:has-text("Save")',
      'button:has-text("Enregistrer")'
    ]);
    if (!save) throw new Error('Bouton d’enregistrement du profil introuvable : ne pas annoncer de succès.');
    await save.candidate.click({ timeout: 15000 });
    info('Enregistrement demandé à X. Vérification du profil public…');
    await delay(2500);
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2500);
    report.after = await snapshotMedia(page);
    for (const [kind, field] of [['avatar','profileImage'], ['banner','bannerImage']]) {
      if (report[kind] !== 'TRANSMIS_AU_FORMULAIRE') continue;
      const updated = report.after?.[field];
      const before = report.before?.[field];
      if (updated && (!before || updated !== before)) {
        report[kind] = 'VERIFIE_PUBLIC';
      } else {
        report[kind] = 'ENREGISTREMENT_A_CONTROLER';
      }
    }
    report.result = report.avatar === 'VERIFIE_PUBLIC' && report.banner === 'VERIFIE_PUBLIC' ? 'SUCCES_CONFIRME' : 'PARTIEL_OU_A_VERIFIER';
    const screenshot = join(reportDir, 'profil_x_apres.png');
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
    info(`Vérification : avatar = ${report.avatar}, couverture = ${report.banner}.`);
    info(`Capture enregistrée localement : ${screenshot}`);
  } catch (error) {
    report.result = 'BLOQUE';
    report.error = error.message;
    console.error('\n❌ ' + error.message);
  } finally {
    report.finished = new Date().toISOString();
    writeFileSync(pathReport, JSON.stringify(report, null, 2), 'utf8');
    info(`Rapport : ${pathReport}`);
    if (browser) await browser.close().catch(() => {});
    console.log('\nCompte cible : ' + PROFILE_URL);
    console.log('Statut : ' + report.result);
    console.log('Ce robot ne publie aucun post et ne modifie ni biographie ni lien.');
  }
  if (report.result === 'BLOQUE') process.exitCode = 1;
}

await main();
