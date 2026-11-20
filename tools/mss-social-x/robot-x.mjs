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

// Cette étape gère le seul point humain possible : une vérification Google/X.
// La session TinyFish (cloud) ne peut pas être lue depuis un Chrome Playwright local.
// Ce navigateur dédié conserve sa session de lancement en lancement.
async function ensureLoggedIn(page) {
  info('ETAPE 1/3 : contrôle de la connexion X du navigateur dédié.');
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(1600);
  let logged = await getLoggedInHandle(page);
  if (logged) {
    assertCorrectAccount(logged);
    info('Compte @multisportsscor déjà connecté : aucune reconnexion nécessaire.');
    return;
  }

  info('Première utilisation : Chrome local n\'hérite PAS de la connexion TinyFish dans le cloud.');
  info('Le robot va ouvrir la connexion Google de X. Il faut uniquement confirmer la connexion MSS si Google le demande.');
  info('NE PAS cliquer sur « Suivre » et NE PAS créer de nouveau compte : le compte X MSS existe déjà.');
  await page.goto('https://x.com/i/flow/login', {
    waitUntil: 'domcontentloaded', timeout: 60000
  }).catch(() => {});
  await delay(1800);

  // Cliquer une seule fois sur l'authentification Google si le bouton est présent.
  // Si X modifie son interface, l'utilisateur peut le cliquer dans le Chrome ouvert.
  const googleLogin = page.getByRole('button', {
    name: /continuer avec google|se connecter avec google|sign in with google|continue with google/i
  }).first();
  const googleByText = page.getByText(
    /continuer avec google|se connecter avec google|sign in with google|continue with google/i
  ).first();
  try {
    if (await googleLogin.isVisible({ timeout: 4500 }).catch(() => false)) {
      await googleLogin.click({ timeout: 5000 });
      info('Le robot a choisi « Continuer avec Google ». Valider le compte Google MSS si demandé.');
    } else if (await googleByText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await googleByText.click({ timeout: 5000 });
      info('Le robot a choisi la connexion Google. Valider le compte MSS si demandé.');
    } else {
      info('Bouton Google non trouvé automatiquement. Dans Chrome, cliquer une fois sur « Continuer avec Google ».');
    }
  } catch (err) {
    info('Connexion Google : clic non disponible (' + err.message.slice(0,100) + '). Le navigateur reste ouvert.');
  }

  // Sur certains flux OAuth, X réutilise la page initiale et Google ouvre un onglet.
  // Nous surveillons la page X principale ; les onglets supplémentaires restent accessibles.
  info('Le robot vérifie automatiquement la connexion toutes les 2 secondes, pendant 15 minutes au maximum.');
  const until = Date.now() + 15 * 60 * 1000;
  let lastReminder = 0;
  while (Date.now() < until) {
    try {
      if (!page.isClosed()) {
        logged = await getLoggedInHandle(page);
        if (logged) {
          assertCorrectAccount(logged);
          info('Compte X OFFICIEL vérifié : @multisportsscor. Le robot reprend le téléversement.');
          return;
        }
      }
    } catch (err) {
      // Si la session est un AUTRE compte X, arrêter immédiatement, même si la page est instable.
      if (/SÉCURITÉ/.test(err.message)) throw err;
    }
    if (Date.now() - lastReminder > 60000) {
      info('En attente d\'une connexion X MSS. Terminer uniquement la validation Google dans le Chrome du robot.');
      lastReminder = Date.now();
    }
    await delay(2000);
  }
  throw new Error('Connexion X MSS non constatée. Aucun logo ni couverture envoyé. Relancer le CMD après connexion.');
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
