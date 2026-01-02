// =============================================================
// worker-dart-scan.ts
// Endpoint POST /dart-scan
// - Reçoit FormData: image + options JSON
// - Passe par un pipeline IA (détourage + cartoon + rotation)
// - Sauvegarde main + thumb dans R2
// - Renvoie { mainImageUrl, thumbImageUrl, bgColor }
// =============================================================

export interface Env {
    AI: any;                    // binding Workers AI
    DART_IMAGES_BUCKET: R2Bucket;
    PUBLIC_BASE_URL: string;    // ex: "https://cdn.mondartscounter.com"
  }
  
  type DartScanOptions = {
    bgColor?: string;
    targetAngleDeg?: number;
    cartoonLevel?: number;
  };
  
  type DartScanResult = {
    mainImageUrl: string;
    thumbImageUrl: string;
    bgColor?: string;
  };
  
  export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const url = new URL(request.url);
  
      if (url.pathname === "/dart-scan" && request.method === "POST") {
        return handleDartScan(request, env);
      }
  
      return new Response("Not found", { status: 404 });
    },
  };
  
  // -----------------------------
  // Handler principal /dart-scan
  // -----------------------------
  async function handleDartScan(request: Request, env: Env): Promise<Response> {
    try {
      const formData = await request.formData();
      const file = formData.get("image");
  
      if (!(file instanceof File)) {
        return jsonError("Missing image file", 400);
      }
  
      let options: DartScanOptions = {};
      const rawOptions = formData.get("options");
      if (typeof rawOptions === "string") {
        try {
          options = JSON.parse(rawOptions);
        } catch (e) {
          return jsonError("Invalid options JSON", 400);
        }
      }
  
      const result = await processDartImage(file, options, env);
  
      return Response.json(
        {
          mainImageUrl: result.mainImageUrl,
          thumbImageUrl: result.thumbImageUrl,
          bgColor: result.bgColor,
        },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err: any) {
      console.error("[/dart-scan] error", err);
      return jsonError("Internal error while scanning dart", 500);
    }
  }
  
  // -------------------------------------
  // Pipeline complet : IA + stockage R2
  // -------------------------------------
  async function processDartImage(
    file: File,
    options: DartScanOptions,
    env: Env
  ): Promise<DartScanResult> {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
  
    const bgColor = options.bgColor || "#101020";
    const targetAngleDeg = options.targetAngleDeg ?? 48;
    const cartoonLevel = options.cartoonLevel ?? 0.8;
  
    // 1) Pipeline IA : détourage + fond uni + cartoon + rotation
    // ----------------------------------------------------------------
    // ICI tu branches tes modèles Workers AI / API externe.
    // Exemple de squelette avec Workers AI (à adapter avec tes modèles) :
    //
    // const segmented = await env.AI.run("<ton-model-de-segmentation>", { image: bytes });
    // const cartoonized = await env.AI.run("<ton-model-img2img-cartoon>", {
    //   image: segmented,
    //   prompt: `dartboard steel-tip dart, cartoon style, flat lighting, on solid background ${bgColor}, rotated ~${targetAngleDeg} degrees`,
    //   strength: cartoonLevel,
    // });
    //
    // cartoonPngBytes doit être un Uint8Array PNG final (fond uni, fléchette 1h37).
    //
    // Pour l’exemple, on réutilise directement l’image d’entrée en attendant :
    const cartoonPngBytes = bytes; // TODO: remplacer par la sortie réelle de ton pipeline IA
  
    // 2) Générer une miniature pour l’overlay (thumb)
    //    Tu peux :
    //    - soit utiliser un deuxième modèle / API de resize,
    //    - soit un autre service HTTP qui prend le PNG et renvoie une version réduite.
    //
    // Ici, on suppose que tu as un petit service de resize HTTP (ou Cloudflare Images)
    // → pour l’instant on simplifie : thumb = même image.
    const thumbPngBytes = cartoonPngBytes; // TODO: remplacer par vraie miniature
  
    // 3) Sauvegarde dans R2
    const mainKey = `dart-sets/main-${crypto.randomUUID()}.png`;
    const thumbKey = `dart-sets/thumb-${crypto.randomUUID()}.png`;
  
    await env.DART_IMAGES_BUCKET.put(mainKey, cartoonPngBytes, {
      httpMetadata: { contentType: "image/png" },
    });
    await env.DART_IMAGES_BUCKET.put(thumbKey, thumbPngBytes, {
      httpMetadata: { contentType: "image/png" },
    });
  
    const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  
    const mainImageUrl = `${base}/${mainKey}`;
    const thumbImageUrl = `${base}/${thumbKey}`;
  
    return {
      mainImageUrl,
      thumbImageUrl,
      bgColor,
    };
  }
  
  // -----------------------------
  // Helpers
  // -----------------------------
  function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  