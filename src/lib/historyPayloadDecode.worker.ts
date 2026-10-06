type DecodeRequest = {
  id: number;
  action?: "decode";
  payload: string;
};

type ReadDecodeRequest = {
  id: number;
  action: "read-decode";
  recordId: string;
  dbName: string;
  headerStore: string;
  detailStore: string;
  matchIdIndex?: string;
};

type WorkerRequest = DecodeRequest | ReadDecodeRequest;

type DecodeResponse = {
  id: number;
  action?: "decode" | "read-decode";
  ok: boolean;
  value: any | null;
  header?: any | null;
  found?: boolean;
  stage: string;
  decompressMs: number;
  parseMs: number;
  idbMs?: number;
  totalMs: number;
  payloadChars?: number;
  error?: string;
};

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: DecodeResponse) => void;
};

function stripJsonCommentsAndTrailingCommas(input: string): string {
  if (!input) return input;
  let out = "";
  let inStr = false;
  let esc = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const n = input[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
      continue;
    }
    if (inBlock) {
      if (c === "*" && n === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (c === "/" && n === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += c;
  }
  return out.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonBestEffort(text: string): { value: any | null; parseMs: number } {
  const trimmed = String(text || "").trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return { value: null, parseMs: 0 };
  }

  let started = performance.now();
  try {
    return { value: JSON.parse(trimmed), parseMs: performance.now() - started };
  } catch {
    try {
      const cleaned = stripJsonCommentsAndTrailingCommas(trimmed);
      started = performance.now();
      return { value: JSON.parse(cleaned), parseMs: performance.now() - started };
    } catch {
      return { value: null, parseMs: performance.now() - started };
    }
  }
}

const LZ = (() => {
  const f = String.fromCharCode;
  const api: any = {};

  api.decompressFromUTF16 = function (compressed: string) {
    if (compressed == null) return "";
    let output = "";
    let current = 0;
    let status = 0;
    for (let i = 0; i < compressed.length; i++) {
      const c = compressed.charCodeAt(i) - 32;
      if (status === 0) {
        status = c & 15;
        current = c >> 4;
      } else {
        current = (current << 15) + c;
        status += 15;
        while (status >= 8) {
          status -= 8;
          output += f((current >> status) & 255);
        }
      }
    }
    return api.decompress(output);
  };

  api.decompress = function (compressed: string) {
    if (compressed == null || compressed === "") return "";
    const dictionary: any[] = [0, 1, 2];
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    const result: string[] = [];
    let w: any;
    let c: number;

    const data = {
      string: compressed,
      val: compressed.charCodeAt(0) - 32,
      position: 32768,
      index: 1,
    };

    function readBits(n: number) {
      let bits = 0;
      const maxpower = Math.pow(2, n);
      let power = 1;
      while (power !== maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = 32768;
          data.val = data.string.charCodeAt(data.index++) - 32;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      return bits;
    }

    const next = readBits(2);
    switch (next) {
      case 0:
        c = readBits(8);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 1:
        c = readBits(16);
        dictionary[3] = String.fromCharCode(c);
        w = dictionary[3];
        break;
      case 2:
        return "";
      default:
        return "";
    }

    result.push(w as string);
    while (true) {
      if (data.index > data.string.length) return "";
      let cc = readBits(numBits);
      let entry2: any;

      if (cc === 0) {
        c = readBits(8);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 1) {
        c = readBits(16);
        dictionary[dictSize++] = String.fromCharCode(c);
        cc = dictSize - 1;
        enlargeIn--;
      } else if (cc === 2) {
        return result.join("");
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[cc]) entry2 = dictionary[cc];
      else if (cc === dictSize) entry2 = (w as string) + (w as string).charAt(0);
      else return "";

      result.push(entry2 as string);
      dictionary[dictSize++] = (w as string) + (entry2 as string).charAt(0);
      enlargeIn--;
      w = entry2;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  };

  api.tryDecodeBase64ToString = function (b64: string) {
    try {
      return atob(b64.replace(/[\r\n\s]/g, ""));
    } catch {
      return "";
    }
  };

  return api;
})();

function decodePayload(payload: string): Omit<DecodeResponse, "id"> {
  const totalStart = performance.now();
  let decompressMs = 0;
  let parseMs = 0;

  try {
    const direct = parseJsonBestEffort(payload);
    parseMs += direct.parseMs;
    if (direct.value && typeof direct.value === "object") {
      return {
        ok: true,
        value: direct.value,
        stage: "direct-json",
        decompressMs,
        parseMs,
        totalMs: performance.now() - totalStart,
      };
    }

    let started = performance.now();
    const utf16 = LZ.decompressFromUTF16(payload);
    decompressMs += performance.now() - started;
    const utf16Parsed = parseJsonBestEffort(utf16);
    parseMs += utf16Parsed.parseMs;
    if (utf16Parsed.value && typeof utf16Parsed.value === "object") {
      return {
        ok: true,
        value: utf16Parsed.value,
        stage: "lz-utf16",
        decompressMs,
        parseMs,
        totalMs: performance.now() - totalStart,
      };
    }

    started = performance.now();
    const raw = LZ.decompress(payload);
    decompressMs += performance.now() - started;
    const rawParsed = parseJsonBestEffort(raw);
    parseMs += rawParsed.parseMs;
    if (rawParsed.value && typeof rawParsed.value === "object") {
      return {
        ok: true,
        value: rawParsed.value,
        stage: "lz-raw",
        decompressMs,
        parseMs,
        totalMs: performance.now() - totalStart,
      };
    }

    const isB64 = /^[A-Za-z0-9+/=\r\n\s-]+$/.test(payload) && payload.length > 16;
    if (isB64) {
      started = performance.now();
      const bin = LZ.tryDecodeBase64ToString(payload);
      decompressMs += performance.now() - started;

      const binParsed = parseJsonBestEffort(bin);
      parseMs += binParsed.parseMs;
      if (binParsed.value && typeof binParsed.value === "object") {
        return {
          ok: true,
          value: binParsed.value,
          stage: "base64-json",
          decompressMs,
          parseMs,
          totalMs: performance.now() - totalStart,
        };
      }

      started = performance.now();
      const b64Raw = LZ.decompress(bin);
      decompressMs += performance.now() - started;
      const b64Parsed = parseJsonBestEffort(b64Raw);
      parseMs += b64Parsed.parseMs;
      if (b64Parsed.value && typeof b64Parsed.value === "object") {
        return {
          ok: true,
          value: b64Parsed.value,
          stage: "base64-lz",
          decompressMs,
          parseMs,
          totalMs: performance.now() - totalStart,
        };
      }
    }

    return {
      ok: false,
      value: null,
      stage: "undecodable",
      decompressMs,
      parseMs,
      totalMs: performance.now() - totalStart,
    };
  } catch (error: any) {
    return {
      ok: false,
      value: null,
      stage: "worker-error",
      decompressMs,
      parseMs,
      totalMs: performance.now() - totalStart,
      error: String(error?.message || error || "decode failed"),
    };
  }
}


async function readAndDecodeHistory(request: ReadDecodeRequest): Promise<DecodeResponse> {
  const totalStart = performance.now();
  const idbStart = performance.now();
  let db: IDBDatabase | null = null;

  const reqAsPromise = <T = any>(request: IDBRequest<T>): Promise<T | null> =>
    new Promise((resolve) => {
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => resolve(null);
    });

  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(String(request.dbName || ""));
      const timer = setTimeout(() => reject(new Error("history worker indexedDB.open timeout")), 5000);
      req.onsuccess = () => {
        clearTimeout(timer);
        resolve(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        reject(req.error || new Error("history worker indexedDB.open failed"));
      };
      req.onblocked = () => {
        clearTimeout(timer);
        reject(new Error("history worker indexedDB.open blocked"));
      };
    });

    if (!db.objectStoreNames.contains(request.headerStore) || !db.objectStoreNames.contains(request.detailStore)) {
      return {
        id: request.id,
        action: "read-decode",
        ok: false,
        found: false,
        value: null,
        header: null,
        stage: "idb-stores-missing",
        decompressMs: 0,
        parseMs: 0,
        idbMs: performance.now() - idbStart,
        totalMs: performance.now() - totalStart,
      };
    }

    const tx = db.transaction([request.headerStore, request.detailStore], "readonly");
    const headers = tx.objectStore(request.headerStore);
    const details = tx.objectStore(request.detailStore);
    const recordId = String(request.recordId || "").trim();

    const getByCandidate = async (candidate: string): Promise<any | null> => {
      if (!candidate) return null;
      let header = await reqAsPromise<any>(headers.get(candidate));
      if (header) return header;
      try {
        const ixName = String(request.matchIdIndex || "");
        if (ixName && headers.indexNames.contains(ixName)) {
          header = await reqAsPromise<any>(headers.index(ixName).get(candidate));
          if (header) return header;
        }
      } catch {}
      return null;
    };

    let header = await getByCandidate(recordId);
    if (!header && recordId.includes(":")) {
      header = await getByCandidate(recordId.split(":")[0]?.trim() || "");
    }

    // Legacy safety: only scan when the expected matchId index truly does not exist.
    if (!header) {
      let hasMatchIndex = false;
      try {
        const ixName = String(request.matchIdIndex || "");
        hasMatchIndex = !!ixName && headers.indexNames.contains(ixName);
      } catch {}
      if (!hasMatchIndex) {
        header = await new Promise<any | null>((resolve) => {
          const cursorReq = headers.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return resolve(null);
            const value: any = cursor.value;
            if (String(value?.matchId || "") === recordId) return resolve(value);
            cursor.continue();
          };
          cursorReq.onerror = () => resolve(null);
        });
      }
    }

    if (!header) {
      return {
        id: request.id,
        action: "read-decode",
        ok: false,
        found: false,
        value: null,
        header: null,
        stage: "idb-not-found",
        decompressMs: 0,
        parseMs: 0,
        idbMs: performance.now() - idbStart,
        totalMs: performance.now() - totalStart,
      };
    }

    const detailKey = String(header?.id ?? recordId);
    const detail: any = await reqAsPromise<any>(details.get(detailKey));
    const idbMs = performance.now() - idbStart;
    const compressed = typeof detail?.payloadCompressed === "string" ? detail.payloadCompressed : "";

    if (!compressed) {
      return {
        id: request.id,
        action: "read-decode",
        ok: true,
        found: true,
        value: null,
        header,
        stage: "idb-header-only",
        decompressMs: 0,
        parseMs: 0,
        idbMs,
        totalMs: performance.now() - totalStart,
        payloadChars: 0,
      };
    }

    const decoded = decodePayload(compressed);
    return {
      id: request.id,
      action: "read-decode",
      ...decoded,
      found: true,
      header,
      idbMs,
      payloadChars: compressed.length,
      totalMs: performance.now() - totalStart,
    };
  } catch (error: any) {
    return {
      id: request.id,
      action: "read-decode",
      ok: false,
      found: false,
      value: null,
      header: null,
      stage: "idb-worker-error",
      decompressMs: 0,
      parseMs: 0,
      idbMs: performance.now() - idbStart,
      totalMs: performance.now() - totalStart,
      error: String(error?.message || error || "history worker read failed"),
    };
  } finally {
    try { db?.close(); } catch {}
  }
}

workerScope.onmessage = (event) => {
  const request = event.data as WorkerRequest;
  if ((request as ReadDecodeRequest)?.action === "read-decode") {
    void readAndDecodeHistory(request as ReadDecodeRequest).then((result) => {
      workerScope.postMessage(result);
    });
    return;
  }

  const decoded = decodePayload(String((request as DecodeRequest)?.payload || ""));
  workerScope.postMessage({ id: request.id, action: "decode", ...decoded });
};
