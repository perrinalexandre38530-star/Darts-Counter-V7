// src/lib/perfProbe.ts

type ProbeEvent = {
    label: string
    mem: number
    time: number
    route?: string
  }
  
  const events: ProbeEvent[] = []
  
  function getMem(): number {
    try {
      const m: any = (performance as any).memory
      if (!m) return 0
      return Math.round(m.usedJSHeapSize / 1024 / 1024)
    } catch {
      return 0
    }
  }
  
  export function probe(label: string) {
    const mem = getMem()
  
    const e: ProbeEvent = {
      label,
      mem,
      time: Date.now(),
      route: location.hash || location.pathname
    }
  
    events.push(e)
  
    console.log(
      `%c[PROBE]`,
      "color:#00ff88;font-weight:bold",
      label,
      "mem:",
      mem,
      "MB"
    )
  }
  
  export function getProbeEvents() {
    return events
  }