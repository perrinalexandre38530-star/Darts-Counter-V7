// @ts-nocheck
// ============================================
// src/lib/matchShare.ts
// Partage d'UNE partie (History entry) via:
// - Packet JSON stable (MatchSharePacket)
// - Web Share (Android) avec fichier .json si supporté
// - Fallback: clipboard + download
// ============================================

export type MatchSharePacketV1 = {
  version: 1;
  app: "multisports-scoring";
  exportedAt: string;
  kind: string;
  matchId: string;
  summary: {
    title: string;
    status: "finished" | "in_progress" | "saved";
    finishedAt?: string;
    players: Array<{ name: string; id?: string }>;
    scoreLine?: string;
  };
  payload: any;
};

export function isMatchSharePacketV1(x: any): x is MatchSharePacketV1 {
  return (
    !!x &&
    x.version === 1 &&
    x.app === "multisports-scoring" &&
    typeof x.exportedAt === "string" &&
    typeof x.kind === "string" &&
    typeof x.matchId === "string" &&
    !!x.summary &&
    typeof x.summary.title === "string" &&
    Array.isArray(x.summary.players) &&
    x.payload !== undefined
  );
}

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function buildMatchSharePacket(entry: any): MatchSharePacketV1 {
  const kind = safeStr(entry?.kind || entry?.sport || entry?.game?.mode || "match").toLowerCase();
  const matchId = safeStr(entry?.id || entry?.matchId || entry?.resumeId || (globalThis.crypto?.randomUUID?.() || String(Date.now())));
  const statusRaw = safeStr(entry?.status).toLowerCase();
  const status: any =
    statusRaw === "finished" ? "finished" :
    statusRaw === "in_progress" ? "in_progress" :
    (entry?.summary?.finished ? "finished" : "saved");

  const title = safeStr(entry?.summary?.title || entry?.summary?.modeLabel || entry?.summary?.mode || entry?.game?.mode || kind).toUpperCase();
  const players = (entry?.players || entry?.summary?.players || []).map((p: any) => ({
    name: safeStr(p?.name || p?.displayName || p?.username || p),
    id: safeStr(p?.id || p?.playerId || p?.profileId || p?._id || ""),
  })).filter((p: any) => p.name);

  const scoreLine =
    safeStr(entry?.summary?.scoreLine || entry?.summary?.line || entry?.scoreLine || entry?.summary?.finalScore || "");

  const finishedAt = entry?.finishedAt || entry?.endedAt || entry?.summary?.finishedAt || entry?.updatedAt || undefined;

  // payload: on privilégie un payload "décodé" si dispo
  const payload = entry?.decoded ?? entry?.payload ?? entry;

  return {
    version: 1,
    app: "multisports-scoring",
    exportedAt: new Date().toISOString(),
    kind,
    matchId,
    summary: {
      title: title || kind.toUpperCase(),
      status,
      finishedAt: finishedAt ? safeStr(finishedAt) : undefined,
      players,
      scoreLine: scoreLine || undefined,
    },
    payload,
  };
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function shareMatchPacket(packet: MatchSharePacketV1) {
  const json = JSON.stringify(packet, null, 2);
  const fileName = `match_${packet.kind}_${packet.matchId}.json`;
  const file = new File([json], fileName, { type: "application/json" });

  const nav: any = navigator as any;
  const canShareFiles = !!nav?.canShare?.({ files: [file] });

  try {
    if (nav?.share && canShareFiles) {
      await nav.share({
        title: packet.summary.title,
        text: (packet.summary.scoreLine || "").trim(),
        files: [file],
      });
      return { ok: true };
    }
    if (nav?.share) {
      await nav.share({
        title: packet.summary.title,
        text: json,
      });
      return { ok: true, fallback: "share-text" };
    }
    if ((navigator as any)?.clipboard?.writeText) {
      await (navigator as any).clipboard.writeText(json);
    }
    downloadBlob(json, fileName, "application/json");
    return { ok: true, fallback: "clipboard+download" };
  } catch (e) {
    return { ok: false, error: e };
  }
}

export async function shareOneMatch(entry: any) {
  const packet = buildMatchSharePacket(entry);
  return shareMatchPacket(packet);
}
