type DecodeRequest = {
  id: number;
  payload: string;
};

type DecodeResponse = {
  id: number;
  ok: boolean;
  value: any | null;
  stage: string;
  decompressMs: number;
  parseMs: number;
  totalMs: number;
  error?: string;
};

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<DecodeRequest>) => void) | null;
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

workerScope.onmessage = (event) => {
  const request = event.data;
  const decoded = decodePayload(String(request?.payload || ""));
  workerScope.postMessage({ id: request.id, ...decoded });
};
