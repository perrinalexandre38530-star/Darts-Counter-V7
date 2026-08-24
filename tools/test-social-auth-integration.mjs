import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const check = (name, ok) => checks.push({ name, ok: !!ok });

const social = read("src/lib/socialAuth.ts");
const login = read("src/pages/AuthV7Login.tsx");
const accountStart = read("src/pages/AccountStart.tsx");
const app = read("src/App.tsx");
const settings = read("src/pages/Settings.tsx");
const settingsAccount = read("src/pages/SettingsAccount.tsx");
const authHook = read("src/hooks/useAuthOnline.tsx");
const main = read("src/main.tsx");
const manifest = read("android/app/src/main/AndroidManifest.xml");
const activity = read("android/app/src/main/java/com/multisportsscoring/app/MainActivity.java");
const plugin = read("android/app/src/main/java/com/multisportsscoring/app/SocialAuthPlugin.java");
const callback = read("public/auth-callback.html");
const setup = read("docs/SOCIAL_AUTH_SETUP.md");
const profileImport = read("src/lib/socialProfileImport.ts");
const onlineApi = read("src/lib/onlineApi.ts");
const accountBridge = read("src/lib/accountBridge.ts");

const providers = [
  "google",
  "apple",
  "facebook",
  "azure",
  "x",
  "discord",
  "instagram",
  "snapchat",
  "tiktok",
  "linkedin",
  "github",
  "spotify",
  "twitch",
  "kakao",
];

for (const provider of providers) {
  check(`provider ${provider}`, social.includes(`\"${provider}\"`));
}

check("14 social providers", providers.every((p) => social.includes(`\"${p}\"`)));
check("Primary provider group", social.includes("SOCIAL_AUTH_PRIMARY_PROVIDERS") && login.includes("SOCIAL_AUTH_PRIMARY_PROVIDERS.map"));
check("Secondary provider group", social.includes("SOCIAL_AUTH_SECONDARY_PROVIDERS") && login.includes("SOCIAL_AUTH_SECONDARY_PROVIDERS.map"));
check("4 primary providers", social.includes(`SOCIAL_AUTH_PRIMARY_PROVIDERS: readonly SocialAuthProvider[] = [
  "facebook",
  "google",
  "azure",
  "apple",
] as const;`));
check("10 secondary providers", social.includes(`SOCIAL_AUTH_SECONDARY_PROVIDERS: readonly SocialAuthProvider[] = [
  "x",
  "discord",
  "instagram",
  "snapchat",
  "tiktok",
  "linkedin",
  "github",
  "spotify",
  "twitch",
  "kakao",
] as const;`));
check("Expandable login UI", login.includes("Plus de connexions") && login.includes("showMoreSocial"));
check("Social providers visible on welcome portal", accountStart.includes("SOCIAL_AUTH_PRIMARY_PROVIDERS.map") && accountStart.includes("Plus de connexions") && accountStart.includes("Connexion rapide"));
check("Welcome portal has exactly 4 primary via shared config", accountStart.includes("SOCIAL_AUTH_PRIMARY_PROVIDERS") && social.includes('"facebook",\n  "google",\n  "azure",\n  "apple",'));
check("Global app gate requires session", app.includes("const needsSession = !isAuthFlow && !isStandaloneCompanion") && app.includes('go("account_start")'));
check("Bottom navigation hidden while signed out", app.includes('const appChromeAllowed = online?.ready && online.status === "signed_in"') && app.includes("appChromeAllowed && !HIDE_BOTTOM_NAV_TABS.has(tab)"));
check("Awena hidden on auth shell", app.includes("{appChromeAllowed && (") && app.includes("<AwenaOverlay"));
check("Explicit logout guard", onlineApi.includes("dc_explicit_logout_v1") && onlineApi.includes("markExplicitLogout()") && onlineApi.includes("isExplicitlyLoggedOut()"));
check("Supabase local session really signed out", onlineApi.includes('supabase.auth.signOut({ scope: "local" })') && onlineApi.includes("clearSupabaseBrowserAuthStorage({ includeCompatSession: true })"));
check("Settings logout lands on locked welcome", settings.includes('forceAuthRoute("#/account/start", false)') && settingsAccount.includes('window.location.hash = "#/account/start"'));
check("Auth hook blocks stale restore after logout", authHook.includes("if (isExplicitlyLoggedOut()) return null") && authHook.includes('const AUTH_REDIRECT_LOGIN = "#/account/start"'));
check("Microsoft uses Azure", social.includes('oauthProvider: "azure"') && social.includes('scopes: "email"'));
check("LinkedIn OIDC", social.includes('oauthProvider: "linkedin_oidc"'));
check("Instagram custom OAuth", social.includes('oauthProvider: "custom:instagram"') && setup.includes("Instagram Pro"));
check("TikTok custom OAuth", social.includes('oauthProvider: "custom:tiktok"'));
check("Snapchat runtime provider", social.includes('oauthProvider: "snapchat"'));
check("Supabase OAuth", social.includes("signInWithOAuth"));
check("PKCE native redirect", social.includes("multisportsscoring://auth/callback"));
check("Native external browser", social.includes("skipBrowserRedirect: native") && plugin.includes("Intent.ACTION_VIEW"));
check("Native callback exchange", social.includes("exchangeCodeForSession(code)"));
check("Native bridge boot", main.includes("initNativeSocialAuthBridge()"));
check("Android plugin registered", activity.includes("registerPlugin(SocialAuthPlugin.class)"));
check("Android deep-link intent filter", manifest.includes('android:scheme="multisportsscoring"') && manifest.includes('android:pathPrefix="/callback"'));
check("Web callback bridge", callback.includes('/#/auth/callback') && social.includes('/auth-callback.html'));
check("Social profile metadata import", profileImport.includes("extractSocialProfileSeed") && profileImport.includes("user_metadata") && profileImport.includes("identity_data"));
check("Social avatar import", profileImport.includes("avatar_url") && profileImport.includes("picture") && profileImport.includes("profile_image_url"));
check("Social personal fields import", profileImport.includes("first_name") && profileImport.includes("last_name") && profileImport.includes("birth_date") && profileImport.includes("city") && profileImport.includes("phone"));
check("Existing profile is protected", profileImport.includes("buildMissingSocialProfilePatch") && profileImport.includes("ne sont jamais remplacés"));
check("Profile creation uses OAuth metadata", onlineApi.includes("buildSocialProfileCreatePayload(authUser, userId)") && onlineApi.includes("getOrCreateProfile(supabaseUserId, nickname, user)"));
check("Online nickname mapped", onlineApi.includes("nickname: (row.nickname ?? row.display_name ??"));
check("Medallion receives online avatar", accountBridge.includes("getOnlineAvatar") && accountBridge.includes("avatarUrl") && accountBridge.includes("avatarDataUrl"));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log(`${c.ok ? "✅" : "❌"} ${c.name}`);
if (failed.length) process.exit(1);
console.log(`\n${checks.length} contrôles OAuth social étendu OK.`);
