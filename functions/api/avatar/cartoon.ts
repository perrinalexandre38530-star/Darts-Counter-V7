// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature (img2img) via Workers AI
// - Reçoit un FormData avec "image" (File) + "style" (string)
// - Appelle @cf/runwayml/stable-diffusion-v1-5-img2img
// - Retourne JSON { ok: true, cartoonPng: "data:image/png;base64,..." }
//   compatible avec AvatarCreator.tsx
// ===================================================

export interface Env {
  AI: Ai;
}

// Styles dispo côté front
type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// Petites variations de prompt suivant le style
const STYLE_SNIPPETS: Record<StyleId, string> = {
  realistic:
    "realistic hand-drawn caricature portrait, warm colors, thick outlines, visible brush strokes, humorous but still recognizable face, studio lighting, plain dark background",
  comic:
    "comic-book style caricature portrait, bold black outlines, halftone shadows, vibrant colors, dynamic shading, humorous facial expression, plain dark background",
  flat:
    "flat vector esport logo, stylized face as a mascot, clean shapes, thick outlines, limited color palette, high contrast, centered head only, dark background",
  exaggerated:
    "very exaggerated caricature portrait, over-the-top facial features, strong contrast, painterly brush strokes, humorous and expressive, plain dark background",
};

// Construit le prompt final à partir du style
function buildPrompt(style: StyleId | null): string {
  const base =
    "Cartoon caricature portrait of this person, head and shoulders only, centered in frame, high quality illustration.";
  const snippet =
    (style && STYLE_SNIPPETS[style as StyleId]) || STYLE_SNIPPETS.realistic;
  return `${base} ${snippet}`;
}

// ---------- Helpers ----------

// Lis un File depuis le FormData et renvoie un tableau d'octets (Uint8Array[])
async function fileToUint8ArrayList(file: File): Promise<number[]> {
  const buf = await file.arrayBuffer();
  const uint8 = new Uint8Array(buf);
  // Workers AI attend un "array" de nombres 0..255 (cf docs)
  return Array.from(uint8);
}

// Convertit un ReadableStream (image PNG) -> dataURL base64
async function imageStreamToDataUrl(stream: ReadableStream): Promise<string> {
  const resp = new Response(stream);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return `data:image/png;base64,${b64}`;
}

// ---------- Handler principal ----------

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_content_type",
          message: "Expected multipart/form-data with an image file.",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const form = await request.formData();
    const file = form.get("image");
    const styleRaw = form.get("style");

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "missing_image",
          message: 'FormData must contain a field "image" of type File.',
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Style optionnel
    const style =
      typeof styleRaw === "string" &&
      ["realistic", "comic", "flat", "exaggerated"].includes(
        styleRaw as StyleId
      )
        ? (styleRaw as StyleId)
        : ("realistic" as StyleId);

    const prompt = buildPrompt(style);

    // Conversion de l'image en tableau d'entiers (0..255)
    const imageArray = await fileToUint8ArrayList(file);

    // Appel Workers AI — modèle img2img officiel
    const inputs = {
      prompt,
      image: imageArray,
      // Quelques paramètres raisonnables
      num_steps: 20,
      strength: 0.65,
      guidance: 7.5,
      // pas de seed => null interdit (cf erreur précédente), donc on ne met rien
    };

    const aiResult = await env.AI.run(
      "@cf/runwayml/stable-diffusion-v1-5-img2img",
      inputs
    );

    // D'après la doc, pour ce modèle, la binding retourne un ReadableStream PNG
    const cartoonPng = await imageStreamToDataUrl(aiResult as ReadableStream);

    return new Response(
      JSON.stringify({
        ok: true,
        cartoonPng,
        debug: {
          model: "@cf/runwayml/stable-diffusion-v1-5-img2img",
          style,
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[avatar/cartoon] error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "exception",
        message: String(err?.message || err || "Unknown error"),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
