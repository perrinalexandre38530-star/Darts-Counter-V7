// ============================================
// Store size guard (anti mobile crash)
// ============================================

export function estimateObjectSize(obj: any) {
    try {
      const json = JSON.stringify(obj);
      return json.length;
    } catch {
      return 0;
    }
  }
  
  export function guardStoreSize(store: any) {
    const size = estimateObjectSize(store);
  
    const MB = Math.round(size / 1024 / 1024);
  
    if (MB > 8) {
      console.warn("STORE TOO BIG:", MB, "MB");
  
      try {
        localStorage.setItem(
          "dc_store_size_warning",
          JSON.stringify({
            sizeMB: MB,
            at: Date.now()
          })
        );
      } catch {}
    }
  
    return store;
  }