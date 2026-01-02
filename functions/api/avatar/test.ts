// ===================================================
// /functions/api/avatar/test.ts
// Endpoint de test Workers AI (img2img)
// - NE SERT QUE POUR LE DEBUG
// - Génère une image à partir d'un petit carré neutre
// ===================================================

const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet: PagesFunction<{ AI: any }> = async ({ env }) => {
  try {
    // On fabrique une mini image PNG bidon (carré noir) juste pour tester.
    // Pour simplifier, on envoie un buffer vide, certains modèles acceptent ça
    // uniquement avec un prompt. Si ça ne passe pas, ce n'est PAS grave :
    // l'important c'est de voir le type de retour.
    const prompt =
      "Simple cartoon icon of a dart player face, gold and black colors.";

    const result = await env.AI.run(MODEL_ID, {
      prompt,
      // image: new Uint8Array(), // à tester si besoin
      strength: 0.6,
    });

    const isArrayBuffer = result instanceof ArrayBuffer;
    const isUint8Array = result instanceof Uint8Array;

    let previewDataUrl: string | null = null;

    if (isArrayBuffer || isUint8Array) {
      const bytes = isArrayBuffer ? new Uint8Array(result as ArrayBuffer) : (result as Uint8Array);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(bin);
      previewDataUrl = `data:image/png;base64,${b64}`;
    }

    return json({
      ok: true,
      modelId: MODEL_ID,
      typeofResult: typeof result,
      constructorName: result && (result as any).constructor?.name,
      isArrayBuffer,
      isUint8Array,
      hasPreview: !!previewDataUrl,
      previewDataUrl,
    });
  } catch (err: any) {
    console.error("[avatar/test] error", err);
    return json(
      {
        ok: false,
        error: "ai_run_failed",
        message: err && err.message ? String(err.message) : "Unknown error",
      },
      500
    );
  }
};
