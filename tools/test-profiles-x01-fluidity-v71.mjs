import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function must(cond, msg) { if (!cond) throw new Error(msg); }

const profiles = read('src/pages/Profiles.tsx');
const dartsets = read('src/lib/dartSetsStore.ts');
const dartImg = read('src/components/DartSetImage.tsx');
const avatar = read('src/components/ProfileAvatar.tsx');
const x01 = read('src/pages/X01ConfigV3.tsx');

must(dartsets.includes('let allSelectableCache: DartSet[] | null = null'), 'Cache sélecteur DartSets global absent');
must(dartsets.includes('let publicSelectorCache: DartSet[] | null = null'), 'Cache DartSets publics absent');
must(dartsets.includes('const profileSelectorCache = new Map<string, DartSet[]>()'), 'Cache DartSets par profil absent');
must(dartsets.includes('export async function resolveDartSetLocalImageSrc'), 'Résolveur image DartSet local absent');
must(!/now\s*-\s*loadAllCacheAt\s*<\s*750/.test(dartsets), 'Ancien TTL 750ms DartSets encore présent');

must(profiles.includes('function LocalProfileGridAvatar'), 'Avatar grille ultra-léger absent');
must(profiles.includes('readLocalUserMediaFallback(profileAvatarMediaKey(id))'), 'Fallback avatar grille IndexedDB local absent');
must(profiles.includes('<LocalProfileGridAvatar profile={profile} size={76} />'), 'La grille utilise encore ProfileAvatar lourd');
must(!profiles.includes('const avatarCacheById = React.useMemo'), 'Lecture cache avatar de tous les profils encore présente');
must(profiles.includes('if (view === "locals") return;'), 'Les traitements globaux avatars ne sont pas suspendus dans Profils locaux');
must(profiles.includes('React.useEffect(() => {\n    if (view !== "locals"'), 'Reset scroll locaux ne doit plus être en useLayoutEffect');

must(avatar.includes('fallbackMode?: "full" | "local"'), 'Mode fallback avatar local absent');
must(avatar.includes('readLocalUserMediaFallback(mediaKey)'), 'ProfileAvatar ne possède pas de récupération locale légère');

must(dartImg.includes('function clearResolvedDartSetImageCache()'), 'Invalidation cache image DartSet absente');
must(dartImg.includes('dc-user-media-restored'), 'Cache image DartSet non invalidé après restauration média');
must(dartImg.includes('visibility: loaded ? "visible" : "hidden"'), 'Icône image cassée navigateur peut encore fuiter');

must(x01.includes('function x01DartSetVisualScore'), 'Sélection du DartSet visuellement le plus riche absente');
must(x01.includes('x01DartSetVisualScore(set) > x01DartSetVisualScore(existing)'), 'Dédoublonnage X01 garde encore le premier objet stale');
must(x01.includes('const canonical = dartSetId ? x01GetDartSetByIdLoose(dartSetId) : null'), 'Fallback canonique DartSet X01 absent');
must(x01.includes('recovery="local"'), 'Sélecteur DartSet X01 lance encore la récupération distante pour toutes les cartes');

console.log('V71 PROFILES + X01 FLUIDITY contract: OK');
