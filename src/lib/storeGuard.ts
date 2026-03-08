export function guardStore(store: any) {
    if (!store) return {};
  
    if (typeof store !== "object") return {};
  
    return store;
  }