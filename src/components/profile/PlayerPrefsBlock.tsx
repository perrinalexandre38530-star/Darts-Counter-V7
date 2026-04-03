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
  appLang?: Lang;
  appTheme?: ThemeId;
  favX01?: number;
  favDoubleOut?: boolean;
  ttsVoice?: string;
  sfxVolume?: number; // 0–100
};

type Props = {
  active: Profile | null;
  value?: Partial<PlayerPrefs> | null;
  onPatch: (patch: Partial<PlayerPrefs>) => void;
  compact?: boolean;
};

export default function PlayerPrefsBlock({ active, value, onPatch, compact = false }: Props) {
  const { theme } = useTheme();
  const { lang, t } = useLang();

  const merged = React.useMemo<PlayerPrefs>(() => {
    const base = (((active as any)?.privateInfo || {}) as PlayerPrefs);
    const incoming = ((value || {}) as PlayerPrefs);
    return {
      appLang: incoming.appLang ?? base.appLang ?? lang,
      appTheme: incoming.appTheme ?? base.appTheme ?? (THEMES[0]?.id || "gold"),
      favX01: incoming.favX01 ?? base.favX01 ?? 501,
      favDoubleOut: incoming.favDoubleOut ?? base.favDoubleOut ?? true,
      ttsVoice: incoming.ttsVoice ?? base.ttsVoice ?? "default",
      sfxVolume: incoming.sfxVolume ?? base.sfxVolume ?? 80,
    };
  }, [
    active,
    value,
    lang,
  ]);

  function update<K extends keyof PlayerPrefs>(key: K, nextValue: PlayerPrefs[K]) {
    onPatch({ [key]: nextValue });
  }

  if (!active) return null;

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
          value={merged.appLang || lang}
          onChange={(e) => update("appLang", e.target.value as Lang)}
        >
          {["fr", "en", "es", "de", "it", "pt", "nl"].map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.theme", "Thème préféré")}
        </span>
        <select
          className="input"
          value={merged.appTheme || (THEMES[0]?.id || "gold")}
          onChange={(e) => update("appTheme", e.target.value as ThemeId)}
        >
          {THEMES.map((th) => (
            <option key={th.id} value={th.id}>
              {th.label ?? th.id}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.x01", "Format X01 favori")}
        </span>
        <select
          className="input"
          value={Number(merged.favX01 ?? 501)}
          onChange={(e) => update("favX01", Number(e.target.value))}
        >
          {[301, 501, 701, 901].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={!!merged.favDoubleOut}
          onChange={(e) => update("favDoubleOut", e.target.checked)}
        />
        {t("profiles.prefs.doubleOut", "Double-out par défaut")}
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.sfx", "Volume effets (SFX)")}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Number(merged.sfxVolume ?? 80)}
          onChange={(e) => update("sfxVolume", Number(e.target.value))}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: theme.textSoft }}>
          {t("profiles.prefs.tts", "Voix TTS")}
        </span>
        <select
          className="input"
          value={merged.ttsVoice || "default"}
          onChange={(e) => update("ttsVoice", e.target.value)}
        >
          <option value="default">{t("profiles.prefs.tts.default", "Défaut")}</option>
          <option value="female">{t("profiles.prefs.tts.female", "Voix féminine")}</option>
          <option value="male">{t("profiles.prefs.tts.male", "Voix masculine")}</option>
          <option value="robot">{t("profiles.prefs.tts.robot", "Voix robot")}</option>
        </select>
      </label>
    </section>
  );
}

