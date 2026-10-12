import { supabase } from "./supabaseClient";

const ORGANIZATION_MEDIA_BUCKET = "avatars";

function cleanSegment(value: unknown): string {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) throw new Error("Image invalide.");
  const meta = parts[0] || "";
  const b64 = parts.slice(1).join(",");
  const mime = (meta.match(/data:(.*?);base64/i) || [])[1] || "image/webp";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Blob([out], { type: mime });
}

function extFromMime(mime: string): string {
  const value = String(mime || "").toLowerCase();
  if (value.includes("jpeg") || value.includes("jpg")) return "jpg";
  if (value.includes("png")) return "png";
  if (value.includes("gif")) return "gif";
  return "webp";
}

export async function uploadOrganizationPublicMedia(opts: {
  organizationId: string;
  kind: "logo" | "cover";
  dataUrl: string;
  userId?: string | null;
  updatedAt?: number;
}): Promise<{ publicUrl: string; path: string }> {
  const organizationId = cleanSegment(opts.organizationId);
  const kind = opts.kind;
  const dataUrl = String(opts.dataUrl || "").trim();
  if (!organizationId || !dataUrl.startsWith("data:image/")) return { publicUrl: "", path: "" };

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = String(sessionData?.session?.user?.id || "").trim();
  const requestedUserId = String(opts.userId || "").trim();
  const userId = cleanSegment(sessionUserId || requestedUserId);
  if (!userId || !sessionUserId) return { publicUrl: "", path: "" };

  const blob = dataUrlToBlob(dataUrl);
  const mime = blob.type || "image/webp";
  const updatedAt = Math.max(1, Number(opts.updatedAt || Date.now()) || Date.now());
  const path = `${userId}/organizations/${organizationId}/${kind}-${updatedAt}.${extFromMime(mime)}`;

  const { error } = await supabase.storage.from(ORGANIZATION_MEDIA_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: mime,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(ORGANIZATION_MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = String(data?.publicUrl || "").trim();
  if (!publicUrl) throw new Error("URL publique du visuel organisation introuvable.");
  return { publicUrl, path };
}
