import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const x01 = read('src/pages/X01ConfigV3.tsx');
const profiles = read('src/pages/Profiles.tsx');
const prefs = read('src/components/profile/PlayerPrefsBlock.tsx');
const selector = read('src/components/DartSetSelector.tsx');
const avatar = read('src/components/ProfileAvatar.tsx');
const stableProfiles = read('src/hooks/useStableProfiles.ts');
const app = read('src/App.tsx');

assert(x01.includes('import DartSetImage from "../components/DartSetImage"'), 'X01 doit utiliser DartSetImage');
assert(x01.includes('x01DartSetVisualSignature'), 'X01 doit invalider aussi les changements visuels du set');
assert(x01.includes('x01DartSetPickerRevision'), 'X01 doit utiliser une révision légère pour le cache DartSet');
const storageVersionBlock = x01.slice(x01.indexOf('function x01DartSetStorageVersion'), x01.indexOf('function x01GetCachedPickerDartSets'));
assert(!storageVersionBlock.includes('localStorage.getItem'), 'X01 ne doit plus relire la grosse clé DartSet sur chaque badge');
assert(x01.includes('const onUpdated = () => { x01InvalidateDartSetPickerCache(); reloadSets(); };'), 'X01 doit rafraîchir le cache sur événement DartSet');
assert((x01.match(/<DartSetImage/g) || []).length >= 2, 'Le badge sélectionné et la grille X01 doivent utiliser le resolver média robuste');

assert(selector.includes('import DartSetImage from "./DartSetImage"'), 'Le sélecteur partagé doit utiliser DartSetImage');
assert(!selector.includes('backgroundImage: `url(${url})`'), 'Le sélecteur partagé ne doit plus contourner le resolver média');

const gridStart = profiles.indexOf('function LocalProfileGridCard(');
const gridEnd = profiles.indexOf('function LocalAssociationsPanel', gridStart);
const gridBlock = profiles.slice(gridStart, gridEnd);
assert(!gridBlock.includes('useBasicStats('), 'La grille Profils locaux ne doit pas lancer une hydratation stats par carte');
assert(gridBlock.includes('animateGlow={false}'), 'Les couronnes de la grille doivent rester légères');
assert(profiles.includes('listDetailOpen && !deferHeavy && !localNavBusy'), 'Les stats détaillées locales ne doivent démarrer qu’après ouverture de la fiche');
assert(profiles.includes('if (view !== "friends") return;'), 'La projection réseau des profils liés doit être réservée à la vue Amis');
assert(profiles.includes('view === "me" && meHeavyReady && !!active?.id'), 'Les stats Mon Profil doivent être différées jusqu’au paint de la vue');
assert(profiles.includes('slotKey="page-profiles-under-header"'), 'La bannière Profils doit conserver une clé stable entre sous-pages');
assert(profiles.includes('setView(next);') && profiles.includes('window.setTimeout(() => {\n        profilesDiagMark'), 'La vue Profils doit être publiée avant son diagnostic');

assert(prefs.includes('"robot", "awena"'), 'AWENA doit être une préférence TTS valide');
assert(prefs.includes('<option value="awena">'), 'AWENA doit apparaître dans la liste de voix Mon Profil');
assert(profiles.includes('placeholder={placeholder ?? (isPassword ? "••••••••" : undefined)}'), 'Le champ mot de passe doit afficher un masque visuel');
assert(profiles.includes('setShowPassword((visible) => !visible)'), 'Le champ mot de passe doit fournir un bouton œil');

assert(avatar.includes('displayingFreshCachedThumb'), 'Un avatar déjà en miniature cache ne doit pas relancer son miroir média');
assert(stableProfiles.includes('function compactMediaSig'), 'La signature des profils ne doit plus concaténer des photos géantes');

const commitStart = app.indexOf('function commitGo(');
const commitEnd = app.indexOf('if (\n      next === "auth_callback"', commitStart);
const commitBlock = app.slice(commitStart, commitEnd);
assert(commitBlock.indexOf('setTab(next);') >= 0, 'Navigation: setTab absent');
assert(commitBlock.indexOf('setTab(next);') < commitBlock.indexOf('window.setTimeout(scheduleNavBookkeeping, 0);'), 'Navigation: le paint doit passer avant le bookkeeping');

console.log('V70 FLUIDITY + MEDIA + PROFILE contract: OK');
