// ============================================
// src/components/profile/PlayerPrefsBlock.tsx
// Bloc "Préférences du joueur" (locales)
// - Langue préférée
// - Thème préféré
// - Format X01 favori
// - Double-out par défaut
// - Volume SFX
// - Voix TTS
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang, type Lang } from "../../contexts/LangContext";
import { THEMES, type ThemeId } from "../../theme/themePresets";
import type { Profile } from "../../lib/types";

export type PlayerPrefs = {
  appLang?: Lang | string;
  appTheme?: ThemeId | string;
  favX01?: number | string;
  favDoubleOut?: boolean | string | number;
  ttsVoice?: string;
  sfxVolume?: number | string; // 0–100
};

type Props = {
  active: Profile | null;
  value?: Partial<PlayerPrefs> | null;
  onPatch: (patch: Partial<PlayerPrefs>) => void;
  compact?: boolean;
};

const LANG_OPTIONS = ["fr", "en", "es", "de", "it", "pt", "nl"] as const;
const X01_OPTIONS = [301, 501, 701, 901] as const;
const TTS_OPTIONS = ["default", "female", "male", "robot"] as const;

function normalizeLang(input: unknown, fallback: Lang): Lang {
  const raw = String(input ?? "").trim().toLowerCase();
  return (LANG_OPTIONS.includes(raw as (typeof LANG_OPTIONS)[number]) ? raw : fallback) as Lang;
}

function normalizeTheme(input: unknown): ThemeId {
  const raw = String(input ?? "").trim();
  const rawLower = raw.toLowerCase();
  const ids = THEMES.map((th) => String(th.id));
  const idMatch = ids.find((id) => id.toLowerCase() === rawLower);
  if (idMatch) return idMatch as ThemeId;

  const labelMatch = THEMES.find((th) => String(th.label ?? th.id).trim().toLowerCase() === rawLower);
  if (labelMatch) return labelMatch.id as ThemeId;

  return (THEMES[0]?.id || "gold") as ThemeId;
}

function normalizeFavX01(input: unknown): number {
  const n = Number(input);
  return X01_OPTIONS.includes(n as (typeof X01_OPTIONS)[number]) ? n : 501;
}

function normalizeDoubleOut(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input !== 0;
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return true;
  if (["false", "0", "off", "no", "non"].includes(raw)) return false;
  if (["true", "1", "on", "yes", "oui"].includes(raw)) return true;
  return true;
}

function normalizeTtsVoice(input: unknown): string {
  const raw = String(input ?? "").trim().toLowerCase();
  if (TTS_OPTIONS.includes(raw as (typeof TTS_OPTIONS)[number])) return raw;
  if (raw.includes("fem")) return "female";
  if (raw.includes("masc") || raw.includes("male") || raw.includes("homme")) return "male";
  if (raw.includes("robot")) return "robot";
  return "default";
}

function normalizeSfxVolume(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return 80;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export default function PlayerPrefsBlock({ active, value, onPatch, compact = false }: Props) {
  const { theme } = useTheme();
  const { lang, t } = useLang();

  if (!active) return null;

  const overlay = (value && Object.keys(value).length ? value : null) as Partial<PlayerPrefs> | null;
  const privateInfo = (((active as any)?.privateInfo || {}) as PlayerPrefs);
  const preferences = (((active as any)?.preferences || {}) as PlayerPrefs);

  const current: Required<Omit<PlayerPrefs, never>> = {
    appLang: normalizeLang(overlay?.appLang ?? privateInfo.appLang ?? preferences.appLang, lang),
    appTheme: normalizeTheme(overlay?.appTheme ?? privateInfo.appTheme ?? preferences.appTheme),
    favX01: normalizeFavX01(overlay?.favX01 ?? privateInfo.favX01 ?? preferences.favX01),
    favDoubleOut: normalizeDoubleOut(overlay?.favDoubleOut ?? privateInfo.favDoubleOut ?? preferences.favDoubleOut),
    ttsVoice: normalizeTtsVoice(overlay?.ttsVoice ?? privateInfo.ttsVoice ?? preferences.ttsVoice),
    sfxVolume: normalizeSfxVolume(overlay?.sfxVolume ?? privateInfo.sfxVolume ?? preferences.sfxVolume),
  };

  function update<K extends keyof PlayerPrefs>(key: K, nextValue: PlayerPrefs[K]) {
    onPatch({ [key]: nextValue });
  }

  return (
    <section
      style={{
        marginTop: compact ? 6 : 18,
        padding: 14,
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${theme.borderSoft}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 8,
          color: theme.primary,
        }}
      >
        {t("profiles.prefs.title", "Préférences du joueur")}
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.lang", "Langue préférée")}
        </span>
        <select
          className="input"
          value={current.appLang}
          onChange={(e) => update("appLang", e.target.value as Lang)}
        >
          {LANG_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.theme", "Thème préféré")}
        </span>
        <select
          className="input"
          value={current.appTheme}
          onChange={(e) => update("appTheme", e.target.value as ThemeId)}
        >
          {THEMES.map((th) => (
            <option key={th.id} value={th.id}>
              {th.label ?? th.id}
            </option>
          ))}
        </select>
      </label>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.x01", "Format X01 favori")}
        </span>
        <select
          className="input"
          value={current.favX01}
          onChange={(e) => update("favX01", Number(e.target.value))}
        >
          {X01_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          fontSize: 12,
        }}
      >
        <input
          type="checkbox"
          checked={current.favDoubleOut}
          onChange={(e) => update("favDoubleOut", e.target.checked)}
        />
        {t("profiles.prefs.doubleOut", "Double-out par défaut")}
      </label>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.sfx", "Volume effets (SFX)")}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={current.sfxVolume}
          onChange={(e) => update("sfxVolume", Number(e.target.value))}
        />
      </label>

      <label
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.tts", "Voix TTS")}
        </span>
        <select
          className="input"
          value={current.ttsVoice}
          onChange={(e) => update("ttsVoice", e.target.value)}
        >
          <option value="default">
            {t("profiles.prefs.tts.default", "Défaut")}
          </option>
          <option value="female">
            {t("profiles.prefs.tts.female", "Voix féminine")}
          </option>
          <option value="male">
            {t("profiles.prefs.tts.male", "Voix masculine")}
          </option>
          <option value="robot">
            {t("profiles.prefs.tts.robot", "Voix robot")}
          </option>
        </select>
      </label>
    </section>
  );
}
