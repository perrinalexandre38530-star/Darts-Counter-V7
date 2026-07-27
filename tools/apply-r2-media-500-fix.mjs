import fs from 'node:fs';

function mustReplace(path, before, after, label) {
  const src = fs.readFileSync(path, 'utf8');
  if (!src.includes(before)) throw new Error(`${label}: pattern not found in ${path}`);
  fs.writeFileSync(path, src.replace(before, after));
}

const directPath = 'src/lib/directR2BackupApi.ts';
const routePath = 'functions/api/storage/backups/[[path]].ts';

mustReplace(
  directPath,
  `const REQUEST_TIMEOUT_UPLOAD_MS = 60_000;\n`,
  `const REQUEST_TIMEOUT_UPLOAD_MS = 60_000;\n\n// R2 media writes must be serialized. A full account can contain hundreds of\n// avatars/gallery/dartset images; firing every POST at once overloads the Pages\n// Function and makes all requests contend on the same media manifest.\nconst MEDIA_UPLOAD_MAX_ATTEMPTS = 4;\nconst MEDIA_UPLOAD_RETRY_BASE_MS = 350;\nlet mediaUploadTail: Promise<void> = Promise.resolve();\n\nfunction sleepMs(ms: number): Promise<void> {\n  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));\n}\n\nfunction enqueueR2MediaUpload<T>(task: () => Promise<T>): Promise<T> {\n  const run = mediaUploadTail.then(task, task);\n  mediaUploadTail = run.then(() => undefined, () => undefined);\n  return run;\n}\n\nfunction transientR2Status(error: any): boolean {\n  const status = Number(error?.status || 0);\n  return status === 500 || status === 502 || status === 503 || status === 504;\n}\n`,
  'insert media queue'
);

mustReplace(
  directPath,
  `  throw conciseR2Error(response.status, payload, text, auth.kind);\n`,
  `  const error = conciseR2Error(response.status, payload, text, auth.kind);\n  (error as any).status = response.status;\n  (error as any).code = String(payload?.code || "");\n  throw error;\n`,
  'tag R2 HTTP error'
);

{
  const src = fs.readFileSync(directPath, 'utf8');
  const re = /export async function uploadDirectR2MediaFallback\(args: \{[\s\S]*?\n\}\n\nexport async function downloadDirectR2MediaFallback/;
  if (!re.test(src)) throw new Error('uploadDirectR2MediaFallback block not found');
  const replacement = `export async function uploadDirectR2MediaFallback(args: {\n  key: string;\n  kind?: string;\n  dataUrl: string;\n  updatedAt?: number | null;\n  sourceUrl?: string | null;\n}): Promise<DirectR2MediaFallback> {\n  const key = String(args?.key || "").trim();\n  const dataUrl = String(args?.dataUrl || "").trim();\n  if (!key || !dataUrl) throw new Error("Clé ou média R2 manquant.");\n\n  return enqueueR2MediaUpload(async () => {\n    let lastError: any = null;\n    for (let attempt = 1; attempt <= MEDIA_UPLOAD_MAX_ATTEMPTS; attempt += 1) {\n      try {\n        const payload = await requestDirect(\`/media/\${encodeURIComponent(key)}\`, {\n          method: "POST",\n          body: JSON.stringify({\n            key,\n            kind: args.kind || "user_image",\n            dataUrl,\n            updatedAt: args.updatedAt ?? Date.now(),\n            sourceUrl: args.sourceUrl ?? null,\n          }),\n        });\n        return payload?.media || { key, kind: args.kind || "user_image", dataUrl };\n      } catch (error: any) {\n        lastError = error;\n        if (!transientR2Status(error) || attempt >= MEDIA_UPLOAD_MAX_ATTEMPTS) throw error;\n        await sleepMs(MEDIA_UPLOAD_RETRY_BASE_MS * Math.pow(2, attempt - 1));\n      }\n    }\n    throw lastError || new Error("Écriture média R2 impossible.");\n  });\n}\n\nexport async function downloadDirectR2MediaFallback`;
  fs.writeFileSync(directPath, src.replace(re, replacement));
}

{
  const src = fs.readFileSync(routePath, 'utf8');
  const before = `        const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);\n        mediaManifest.media[mediaKey] = {\n          key: mediaKey,\n          kind: payload.kind,\n          sizeBytes,\n          checksum,\n          updatedAtMs: payload.updatedAtMs,\n          sourceUrl: payload.sourceUrl,\n        };\n        await writeMediaMirrorManifest(bucket, mediaManifest);\n        return json({ ok: true, media: payload, audit: { total: Object.keys(mediaManifest.media).length }, authMode: identity.authMode }, 201);`;
  const after = `        // L'objet image est déjà durablement écrit dans R2. Le manifeste est un\n        // index secondaire : une contention ou une erreur de mise à jour ne doit\n        // jamais transformer un média réellement sauvegardé en HTTP 500.\n        let manifestUpdated = false;\n        let manifestTotal: number | null = null;\n        try {\n          const mediaManifest = await readMediaMirrorManifest(bucket, identity.userId);\n          mediaManifest.media[mediaKey] = {\n            key: mediaKey,\n            kind: payload.kind,\n            sizeBytes,\n            checksum,\n            updatedAtMs: payload.updatedAtMs,\n            sourceUrl: payload.sourceUrl,\n          };\n          await writeMediaMirrorManifest(bucket, mediaManifest);\n          manifestUpdated = true;\n          manifestTotal = Object.keys(mediaManifest.media).length;\n        } catch (manifestError: any) {\n          console.warn("[r2-media] manifest update deferred", mediaKey, manifestError?.message || manifestError);\n        }\n        return json({\n          ok: true,\n          media: payload,\n          audit: { total: manifestTotal, manifestUpdated },\n          authMode: identity.authMode,\n        }, 201);`;
  if (!src.includes(before)) throw new Error('media manifest POST block not found');
  fs.writeFileSync(routePath, src.replace(before, after));
}

console.log('R2 media 500 resilience patch applied.');
