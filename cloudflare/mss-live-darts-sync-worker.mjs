/** Separate Cloudflare Worker: Pages Functions cannot receive Cron Triggers.
 * Secrets: LIVE_SYNC_TARGET (Pages base URL, HTTPS only),
 * LIVE_OFFICIAL_INGEST_TOKEN (same value configured on Pages).
 */
export default {
  async scheduled(controller, env, ctx) {
    const origin = String(env.LIVE_SYNC_TARGET || "").trim();
    const token = String(env.LIVE_OFFICIAL_INGEST_TOKEN || "").trim();
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error("LIVE_SYNC_TARGET must be an HTTPS origin"); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || !token)
      throw new Error("LIVE_SYNC_TARGET origin or LIVE_OFFICIAL_INGEST_TOKEN missing/invalid");
    const mode = String(controller.cron || "").startsWith("15 ") ? "backfill" : "recent";
    const endpoint = `${parsed.origin}/api/sports-live/darts/results-sync`;
    const task = async () => {
      const response = await fetch(endpoint, {
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({mode}),
      });
      const body=await response.json().catch(()=>null);
      if (!response.ok || !body?.ok) throw new Error(`LIVE Darts ${mode} sync rejected (HTTP ${response.status}; ${String(body?.error || "unknown").slice(0,150)})`);
      console.log("MSS LIVE Darts ingestion",JSON.stringify({mode,periods:body.runs?.map(row=>row.period),matches:body.runs?.reduce((s,row)=>s+row.received,0),date:body.updatedAt}));
    };
    ctx.waitUntil(task());
  },
  async fetch() { return new Response("Not found",{status:404}); },
};
