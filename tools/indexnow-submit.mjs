import fs from "node:fs";
import path from "node:path";

const KEY = "1108833352f54cfeab6a1a8058d44aa4";
const KEY_FILE = `public/${KEY}.txt`;
const SITEMAP_FILE = "public/sitemap.xml";
const ENDPOINT = "https://api.indexnow.org/indexnow";

function readSitemapUrls() {
  const xml = fs.readFileSync(SITEMAP_FILE, "utf8");
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error(`Aucune URL trouvée dans ${SITEMAP_FILE}`);
  }

  return [...new Set(urls)];
}

function readChangedFiles(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

function mapChangedFilesToUrls(changedFiles, allUrls) {
  const byPathname = new Map(
    allUrls.map((url) => [new URL(url).pathname, url])
  );
  const selected = new Set();

  const addPath = (pathname) => {
    const url = byPathname.get(pathname);
    if (url) selected.add(url);
  };

  const addAllStaticSeoPages = () => {
    for (const url of allUrls) {
      const pathname = new URL(url).pathname;
      if (pathname !== "/") selected.add(url);
    }
  };

  for (const file of changedFiles) {
    // Si le sitemap change, il peut contenir de nouvelles URLs : on les renvoie toutes.
    if (file === "public/sitemap.xml") {
      for (const url of allUrls) selected.add(url);
      continue;
    }

    // Page d'accueil / application React principale.
    if (
      file === "index.html" ||
      file.startsWith("src/") ||
      file === "package.json" ||
      file === "package-lock.json" ||
      file.startsWith("vite.config.") ||
      file === "public/manifest.webmanifest" ||
      file === "public/robots.txt" ||
      file === "public/llms.txt"
    ) {
      addPath("/");
      continue;
    }

    // CSS commun des pages SEO statiques.
    if (file.startsWith("public/seo/")) {
      addAllStaticSeoPages();
      continue;
    }

    // Pages SEO statiques.
    const staticPageMap = {
      "public/fr/index.html": "/fr/",
      "public/en/index.html": "/en/",
      "public/es/index.html": "/es/",
      "public/fr/flechettes/index.html": "/fr/flechettes/",
      "public/en/darts/index.html": "/en/darts/",
      "public/es/dardos/index.html": "/es/dardos/",
      "public/fr/running/index.html": "/fr/running/",
      "public/en/running/index.html": "/en/running/",
      "public/es/running/index.html": "/es/running/",
    };

    if (staticPageMap[file]) {
      addPath(staticPageMap[file]);
      continue;
    }

    // Les autres fichiers publics peuvent modifier le rendu de la PWA principale.
    if (
      file.startsWith("public/") &&
      file !== KEY_FILE &&
      !file.startsWith("public/google")
    ) {
      addPath("/");
    }
  }

  return [...selected];
}

async function main() {
  if (!fs.existsSync(KEY_FILE)) {
    throw new Error(`Clé IndexNow introuvable : ${KEY_FILE}`);
  }

  const storedKey = fs.readFileSync(KEY_FILE, "utf8").trim();
  if (storedKey !== KEY) {
    throw new Error(`Le contenu de ${KEY_FILE} ne correspond pas à la clé IndexNow attendue.`);
  }

  const allUrls = readSitemapUrls();
  const host = new URL(allUrls[0]).host;
  const keyLocation = `https://${host}/${KEY}.txt`;

  const args = process.argv.slice(2);
  const allMode = args.includes("--all");
  const dryRun = args.includes("--dry-run");
  const listIndex = args.indexOf("--changed-file-list");
  const changedFileList = listIndex >= 0 ? args[listIndex + 1] : null;

  const urls = allMode
    ? allUrls
    : mapChangedFilesToUrls(readChangedFiles(changedFileList), allUrls);

  if (urls.length === 0) {
    console.log("IndexNow : aucune URL publique concernée par ce push. Aucun envoi.");
    return;
  }

  const payload = {
    host,
    key: KEY,
    keyLocation,
    urlList: urls,
  };

  console.log(`IndexNow : ${urls.length} URL(s) à notifier :`);
  for (const url of urls) console.log(`- ${url}`);

  if (dryRun || process.env.INDEXNOW_DRY_RUN === "1") {
    console.log("IndexNow : mode dry-run, aucune requête envoyée.");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "user-agent": "MULTISPORTS-SCORING-IndexNow/1.0",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  // 200 = accepté et traité ; 202 = accepté, validation de clé en cours.
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(
      `IndexNow a refusé la requête (${response.status} ${response.statusText})` +
        (responseText ? ` : ${responseText}` : "")
    );
  }

  console.log(`IndexNow : requête acceptée (HTTP ${response.status}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
