import fs from 'node:fs';
import assert from 'node:assert/strict';

const profiles = fs.readFileSync(new URL('../src/pages/Profiles.tsx', import.meta.url), 'utf8');
const avatar = fs.readFileSync(new URL('../src/components/ProfileAvatar.tsx', import.meta.url), 'utf8');
const selector = fs.readFileSync(new URL('../src/components/PlayerPagedSelector.tsx', import.meta.url), 'utf8');
const x01 = fs.readFileSync(new URL('../src/pages/X01ConfigV3.tsx', import.meta.url), 'utf8');

assert.match(profiles, /localGridAvatarFailed/, 'grid must remember failed avatar sources');
assert.match(profiles, /markLocalGridAvatarFailed\(id, src\)/, 'broken grid image must be excluded from the next recovery attempt');
assert.match(profiles, /resolveUserMediaFallback\(mediaKey, primaryHint/, 'grid must use robust media recovery when detail has an avatar but list does not');
assert.match(profiles, /resolveAvatarFallback\(id\)/, 'grid must retain the avatar R2/browser recovery fallback');
assert.match(profiles, /loading="eager"[\s\S]{0,200}decoding="async"/, 'the nine visible grid avatars must not be delayed by nested lazy-loading');
assert.match(profiles, /précharge silencieusement la page voisine/, 'local profile paging should prefetch a neighboring page');

assert.match(avatar, /loading\?: "eager" \| "lazy"/, 'ProfileAvatar must expose an explicit loading mode');
assert.match(avatar, /props\.loading \?\? \(size <= 96 \? "lazy" : "eager"\)/, 'ProfileAvatar must preserve the old default while allowing visible grids to opt into eager');

assert.match(selector, /Le store d'usage|compteurs modernes|scan de l'historique/, 'selector history migration must be documented/deferred');
assert.match(selector, /Object\.keys\(persisted \|\| \{\}\)\.length > 0/, 'selector must not rescan full history when usage counters already exist');
assert.match(selector, /starTargets/, 'selector must scope star stats to visible or selected profiles');
assert.doesNotMatch(selector, /Promise\.all\(ids\.map\(async \(id\)/, 'selector must not load star stats for every profile in parallel');
assert.match(selector, /fallbackMode="local"/, 'visible X01 profile cards must avoid remote fallback storms');
assert.match(selector, /animateGlow=\{false\}/, 'profile selector stars should be static to reduce GPU work');

assert.match(x01, /Object\.keys\(persistedUsage\)\.length > 0/, 'X01 config must skip legacy History.list migration when counters already exist');
assert.match(x01, /ouvrir d'abord le modal, puis rafraîchir la bibliothèque/, 'dartset modal must open before a heavy refresh');
assert.match(x01, /contentVisibility: "auto"/, 'dartset tiles should be render-contained');
assert.match(x01, /createCooperativeYielder\(6\)/, 'selected-player star stats should yield to navigation');

console.log('✅ V74 PROFILES AVATAR + X01 NAVIGATION FLUIDITY CONTRACT OK');
