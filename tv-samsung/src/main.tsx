import * as React from "react";
import { createRoot } from "react-dom/client";
import SamsungTvApp from "../../src/tv/samsung/SamsungTvApp";
import "../../src/tv/samsung/samsung-tv.css";

const TIZEN_RANDOM_UUID_COMPAT_MARKER = "MSS_TIZEN_RANDOM_UUID_COMPAT_V1";

function installTizenRandomUuidCompat() {
  const root = globalThis as any;
  let cryptoApi = root.crypto as any;

  if (!cryptoApi) {
    cryptoApi = {};
    try {
      Object.defineProperty(root, "crypto", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: cryptoApi,
      });
    } catch {
      try { root.crypto = cryptoApi; } catch {}
    }
  }

  if (typeof cryptoApi.randomUUID === "function") return;

  const randomByte = () => Math.floor(Math.random() * 256) & 0xff;
  const bytes = () => {
    const out = new Uint8Array(16);
    try {
      if (typeof cryptoApi.getRandomValues === "function") return cryptoApi.getRandomValues(out);
    } catch {}
    for (let i = 0; i < out.length; i += 1) out[i] = randomByte();
    return out;
  };

  const fallbackRandomUUID = () => {
    const b = bytes();
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (value) => value.toString(16).padStart(2, "0"));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  };

  try {
    Object.defineProperty(cryptoApi, "randomUUID", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: fallbackRandomUUID,
    });
  } catch {
    try { cryptoApi.randomUUID = fallbackRandomUUID; } catch {}
  }

  try { root.__MSS_TIZEN_RANDOM_UUID_COMPAT__ = TIZEN_RANDOM_UUID_COMPAT_MARKER; } catch {}
}

// Samsung Tizen 6.5 expose window.crypto mais pas forcément crypto.randomUUID().
// Certains modules de jeu (dont X01LowScoreSounds) l'utilisent au rendu : on
// installe donc le fallback avant de monter l'application TV partagée.
installTizenRandomUuidCompat();

const root = document.getElementById("root");
if (!root) throw new Error("Samsung TV root element missing");

createRoot(root).render(
  <React.StrictMode>
    <SamsungTvApp />
  </React.StrictMode>
);
