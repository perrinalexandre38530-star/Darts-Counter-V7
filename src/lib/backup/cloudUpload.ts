import { supabase } from "../supabaseClient";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let to: any;
  const timeout = new Promise<T>((_, rej) => {
    to = setTimeout(() => rej(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(to));
}


/**
 * Upload a JSON backup blob to Supabase Storage bucket.
 * Bucket name default: "backups". Path: <userId>/<filename>
 */
export async function uploadBackupJsonToSupabase(args: {
  bucket?: string;
  filename: string;
  jsonObject: any;
}): Promise<void> {
  const bucket = args.bucket ?? "backups";

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData?.user?.id;
  if (!userId) throw new Error("Utilisateur non connecté");

  const blob = new Blob([JSON.stringify(args.jsonObject)], { type: "application/json" });
  const path = `${userId}/${args.filename}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: "application/json" });
  if (error) throw error;
}
