export async function importSafe(loader: any) {
    try {
      return await loader();
    } catch (e: any) {
      const msg = String(e?.message || "");
  
      if (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("ChunkLoadError")
      ) {
        console.warn("Chunk load failed, reloading app");
        location.reload();
      }
  
      throw e;
    }
  }