// ===================================================
// functions/api/avatar/cartoon.ts
// Endpoint serveur pour vraie caricature avatar.
// Priorité : OpenAI Images Edit si OPENAI_API_KEY est configuré.
// Fallback : Cloudflare Workers AI si binding AI disponible.
// Le médaillon n'est jamais généré par l'IA : le front l'applique ensuite
// pour garder un cadre identique et compresser en WebP.
// ===================================================

export interface Env {
  AI?: any;
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
}

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

const STYLE_SNIPPETS: Record<StyleId, string> = {
  realistic:
    "premium hand-drawn cartoon portrait, recognizable face, clean polished illustration, warm skin shading, thick confident outlines, expressive but not distorted",
  comic:
    "comic book caricature portrait, bold black ink outlines, vibrant color blocks, halftone energy, funny expressive smile, playful face exaggeration",
  flat:
    "esport mascot vector avatar, simplified shapes, clean flat colors, thick outlines, punchy contrast, centered face, badge-ready portrait",
  exaggerated:
    "VERY exaggerated funny cartoon caricature, oversized expressive head, big eyes, comic nose and smile, playful asymmetry, bold outlines, vibrant warm colors, hilarious but friendly",
};

function buildPrompt(style: StyleId): string {
  return [
    "Transform the uploaded photo into a square cartoon avatar caricature.",
    "Keep the person recognizable, but make it much more cartoonish, funny and expressive.",
    "Head and shoulders only, centered composition, looking at camera.",
    "Do NOT include text, letters, logo, watermark, badge, circle frame, medallion, UI, hands, or background objects.",
    "Use a simple warm yellow/orange comic background that will fit inside a circular medallion later.",
    STYLE_SNIPPETS[style] || STYLE_SNIPPETS.exaggerated,
  ].join(" ");
}

async function fileToArray(file: File): Promise<number[]> {
  const buf = await file.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

async function resultToDataUrl(result: any): Promise<string | null> {
  if (!result) return null;

  if (typeof result === "string") {
    if (result.startsWith("data:image/")) return result;
    return `data:image/png;base64,${result}`;
  }

  if (result instanceof ReadableStream) {
    const buf = await new Response(result).arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buf)}`;
  }

  if (result.image && typeof result.image === "string") {
    if (result.image.startsWith("data:image/")) return result.image;
    return `data:image/png;base64,${result.image}`;
  }

  if (result.images?.[0] && typeof result.images[0] === "string") {
    const first = result.images[0];
    if (first.startsWith("data:image/")) return first;
    return `data:image/png;base64,${first}`;
  }

  if (result.data?.[0]?.b64_json && typeof result.data[0].b64_json === "string") {
    return `data:image/webp;base64,${result.data[0].b64_json}`;
  }

  if (result.data?.[0]?.url && typeof result.data[0].url === "string") {
    return result.data[0].url;
  }

  return null;
}

async function callOpenAiImageEdit(apiKey: string, file: File, style: StyleId): Promise<string | null> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("image", file, file.name || "avatar-source.webp");
  form.append("prompt", buildPrompt(style));
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("output_format", "webp");
  form.append("output_compression", "82");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!response.ok) {
    const msg = json?.error?.message || text || `openai_${response.status}`;
    throw new Error(msg);
  }

  return await resultToDataUrl(json);
}

async function callCloudflareAi(env: Env, file: File, style: StyleId): Promise<string | null> {
  if (!env.AI?.run) return null;

  const prompt = buildPrompt(style);
  const image = await fileToArray(file);

  const candidates = [
    "@cf/runwayml/stable-diffusion-v1-5-img2img",
    "@cf/lykon/dreamshaper-8-lcm",
  ];

  let lastError = "";
  for (const model of candidates) {
    try {
      const result = await env.AI.run(model, {
        prompt,
        image,
        num_steps: style === "exaggerated" ? 32 : 26,
        strength: style === "realistic" ? 0.58 : style === "flat" ? 0.72 : 0.82,
        guidance: style === "exaggerated" ? 9 : 7.5,
      });
      const dataUrl = await resultToDataUrl(result);
      if (dataUrl) return dataUrl;
      lastError = "empty_ai_result";
    } catch (err: any) {
      lastError = String(err?.message || err || "ai_error");
    }
  }

  throw new Error(lastError || "cloudflare_ai_failed");
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ ok: false, error: "invalid_content_type" }, 400);
    }

    const form = await request.formData();
    const file = form.get("image");
    const styleRaw = String(form.get("style") || "exaggerated");
    const style: StyleId = ["realistic", "comic", "flat", "exaggerated"].includes(styleRaw)
      ? (styleRaw as StyleId)
      : "exaggerated";

    if (!(file instanceof File)) {
      return json({ ok: false, error: "missing_image" }, 400);
    }

    if (file.size > 12 * 1024 * 1024) {
      return json({ ok: false, error: "image_too_large" }, 413);
    }

    const openAiKey = String(env.OPENAI_API_KEY || "").trim();
    if (openAiKey) {
      try {
        const dataUrl = await callOpenAiImageEdit(openAiKey, file, style);
        if (dataUrl) return json({ ok: true, cartoonWebp: dataUrl, provider: "openai", style }, 200);
      } catch (err: any) {
        // On garde un fallback Cloudflare possible si OpenAI échoue.
        const openAiMessage = String(err?.message || err || "openai_error");
        try {
          const dataUrl = await callCloudflareAi(env, file, style);
          if (dataUrl) return json({ ok: true, cartoonPng: dataUrl, provider: "cloudflare", fallbackFrom: "openai", openAiMessage, style }, 200);
        } catch (cfErr: any) {
          return json({ ok: false, error: "ai_generation_failed", provider: "openai", message: openAiMessage, fallbackMessage: String(cfErr?.message || cfErr || "cloudflare_error") }, 502);
        }
      }
    }

    try {
      const dataUrl = await callCloudflareAi(env, file, style);
      if (dataUrl) return json({ ok: true, cartoonPng: dataUrl, provider: "cloudflare", style }, 200);
    } catch (err: any) {
      return json({ ok: false, error: "ai_generation_failed", provider: "cloudflare", message: String(err?.message || err || "cloudflare_error") }, 502);
    }

    return json({ ok: false, error: "ai_binding_missing", message: "Configure OPENAI_API_KEY or Cloudflare AI binding." }, 503);
  } catch (err: any) {
    return json({ ok: false, error: "exception", message: String(err?.message || err || "Unknown error") }, 500);
  }
};

function json(payload: any, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
