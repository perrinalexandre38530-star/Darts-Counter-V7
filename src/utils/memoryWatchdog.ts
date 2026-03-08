export function startMemoryWatchdog() {
    if (!(performance as any).memory) return;
  
    setInterval(() => {
      const mem = (performance as any).memory;
  
      const used = mem.usedJSHeapSize / 1024 / 1024;
  
      if (used > 800) {
        console.warn("Memory high:", used, "MB");
  
        location.reload();
      }
    }, 20000);
  }