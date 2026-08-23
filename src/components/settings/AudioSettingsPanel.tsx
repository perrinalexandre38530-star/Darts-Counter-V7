import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import React from "react";
import SplashScreen from "../SplashScreen";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  getAudioPreferences,
  NAVIGATION_MUSIC_PREVIEW_EVENT,
  resetAudioPreferences,
  subscribeAudioPreferences,
  updateAudioPreferences,
  type AudioPreferences,
} from "../../lib/audioPreferences";
import {
  NAVIGATION_MUSIC_TRACKS,
  type NavigationMusicTrackId,
} from "../../lib/navigationMusicCatalog";
import {
  getStartupIntroEnabled,
  setStartupIntroEnabled,
  stopStartupIntroAudio,
} from "../../lib/startupAudioPrefs";

const CARD_BG = "linear-gradient(180deg,rgba(12,18,34,.92),rgba(6,9,20,.96))";
const INNER_BG = "rgba(255,255,255,.032)";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export default function AudioSettingsPanel() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [prefs, setPrefs] = React.useState<AudioPreferences>(() => getAudioPreferences());
  const [introEnabled, setIntroEnabledState] = React.useState<boolean>(() => getStartupIntroEnabled());
  const [previewTrackId, setPreviewTrackId] = React.useState<NavigationMusicTrackId | null>(null);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => subscribeAudioPreferences(setPrefs), []);

  const patch = React.useCallback((next: Partial<AudioPreferences>) => {
    setPrefs(updateAudioPreferences(next));
  }, []);

  const stopPreview = React.useCallback((resumeNavigation = true) => {
    const audio = previewAudioRef.current;
    if (audio) {
      try { audio.pause(); } catch {}
      try { audio.currentTime = 0; } catch {}
    }
    previewAudioRef.current = null;
    setPreviewTrackId(null);
    if (resumeNavigation && typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent(NAVIGATION_MUSIC_PREVIEW_EVENT, { detail: { active: false } })); } catch {}
    }
  }, []);

  React.useEffect(() => {
    return () => {
      const audio = previewAudioRef.current;
      if (audio) {
        try { audio.pause(); } catch {}
      }
      if (typeof window !== "undefined") {
        try { window.dispatchEvent(new CustomEvent(NAVIGATION_MUSIC_PREVIEW_EVENT, { detail: { active: false } })); } catch {}
      }
    };
  }, []);

  const previewTrack = React.useCallback((id: NavigationMusicTrackId) => {
    if (!prefs.masterEnabled) return;
    if (previewTrackId === id) {
      stopPreview();
      return;
    }
    stopPreview(false);
    const track = NAVIGATION_MUSIC_TRACKS.find((item) => item.id === id);
    if (!track) return;
    try {
      const audio = new Audio(track.url);
      audio.preload = "auto";
      audio.volume = clamp01(prefs.navigationVolume);
      audio.addEventListener("ended", () => stopPreview(), { once: true });
      previewAudioRef.current = audio;
      setPreviewTrackId(id);
      window.dispatchEvent(new CustomEvent(NAVIGATION_MUSIC_PREVIEW_EVENT, { detail: { active: true } }));
      void audio.play().catch(() => stopPreview());
    } catch {
      stopPreview();
    }
  }, [prefs.masterEnabled, prefs.navigationVolume, previewTrackId, stopPreview]);

  React.useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.volume = clamp01(prefs.navigationVolume);
    if (!prefs.masterEnabled) stopPreview();
  }, [prefs.masterEnabled, prefs.navigationVolume, stopPreview]);

  const setIntro = (next: boolean) => {
    setIntroEnabledState(next);
    setStartupIntroEnabled(next);
    if (!next) stopStartupIntroAudio();
  };

  const toggleTrack = (id: NavigationMusicTrackId) => {
    const enabled = new Set(prefs.enabledTrackIds);
    if (enabled.has(id)) enabled.delete(id);
    else enabled.add(id);
    patch({ enabledTrackIds: prefs.trackOrder.filter((trackId) => enabled.has(trackId)) });
  };

  const selectAllTracks = () => patch({ enabledTrackIds: [...prefs.trackOrder] });
  const selectOnlyTrack = (id: NavigationMusicTrackId) => patch({ enabledTrackIds: [id] });

  const moveTrack = (id: NavigationMusicTrackId, direction: -1 | 1) => {
    const order = [...prefs.trackOrder];
    const index = order.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    const current = order[index];
    const swap = order[nextIndex];
    if (current === undefined || swap === undefined) return;
    order[index] = swap;
    order[nextIndex] = current;
    patch({ trackOrder: order });
  };

  const sectionStyle: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0 12px 28px rgba(0,0,0,.28)",
  };

  const sectionTitle = (eyebrow: string, title: string, subtitle: string) => (
    <div style={{ marginBottom: 11 }}>
      <div style={{ color: theme.primary, fontSize: 9.5, fontWeight: 1000, letterSpacing: .9, textTransform: "uppercase" }}>{eyebrow}</div>
      <div style={{ marginTop: 3, color: theme.text, fontSize: 16, fontWeight: 1000 }}>{title}</div>
      <div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.45 }}>{subtitle}</div>
    </div>
  );

  const toggle = (enabled: boolean, onClick: () => void, onLabel = "ON", offLabel = "OFF") => (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 74,
        minHeight: 36,
        borderRadius: 999,
        border: `1px solid ${enabled ? theme.primary : "rgba(255,100,115,.55)"}`,
        background: enabled ? `${theme.primary}20` : "rgba(255,70,90,.08)",
        color: enabled ? theme.primary : "#ff8190",
        fontSize: 11,
        fontWeight: 1000,
        cursor: "pointer",
        boxShadow: enabled ? `0 0 14px ${theme.primary}22` : "none",
      }}
    >
      {enabled ? onLabel : offLabel}
    </button>
  );

  const toggleRow = (label: string, subtitle: string, enabled: boolean, onClick: () => void) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${theme.borderSoft}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>{label}</div>
        <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.8, lineHeight: 1.35 }}>{subtitle}</div>
      </div>
      {toggle(enabled, onClick)}
    </div>
  );

  const rangeRow = (label: string, value: number, onChange: (value: number) => void, disabled = false) => (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${theme.borderSoft}`, opacity: disabled ? .45 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>{label}</div>
        <div style={{ minWidth: 46, textAlign: "right", color: theme.primary, fontSize: 11, fontWeight: 1000 }}>{Math.round(value * 100)} %</div>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(clamp01(Number(event.target.value)))}
        style={{ width: "100%", accentColor: theme.primary, cursor: disabled ? "not-allowed" : "pointer" }}
      />
    </div>
  );

  const enabledCount = prefs.enabledTrackIds.length;

  return (
    <div>
      <section style={{ ...sectionStyle, borderColor: prefs.masterEnabled ? `${theme.primary}66` : "rgba(255,95,110,.45)" }}>
        {sectionTitle(
          L("CONTRÔLE GÉNÉRAL", "MASTER CONTROL", "CONTROL GENERAL"),
          L("Audio de l’application", "Application audio", "Audio de la aplicación"),
          L("Coupe ou réactive en une seule fois les musiques, bruitages, clics et voix qui respectent le contrôle audio global.", "Mute or restore music, effects, clicks and voices that use the global audio control.", "Silencia o restaura música, efectos, clics y voces que usan el control global."),
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <button type="button" onClick={() => patch({ masterEnabled: true })} style={{ minHeight: 50, borderRadius: 15, border: `1px solid ${prefs.masterEnabled ? theme.primary : theme.borderSoft}`, background: prefs.masterEnabled ? `${theme.primary}20` : INNER_BG, color: prefs.masterEnabled ? theme.primary : theme.textSoft, fontSize: 13, fontWeight: 1000, cursor: "pointer" }}>{L("SON ACTIVÉ", "SOUND ON", "SONIDO ACTIVADO")}</button>
          <button type="button" onClick={() => patch({ masterEnabled: false })} style={{ minHeight: 50, borderRadius: 15, border: `1px solid ${!prefs.masterEnabled ? "rgba(255,100,115,.8)" : theme.borderSoft}`, background: !prefs.masterEnabled ? "rgba(255,70,90,.11)" : INNER_BG, color: !prefs.masterEnabled ? "#ff8190" : theme.textSoft, fontSize: 13, fontWeight: 1000, cursor: "pointer" }}>{L("TOUT COUPER", "MUTE ALL", "SILENCIAR TODO")}</button>
        </div>
      </section>

      <section style={sectionStyle}>
        {sectionTitle(
          L("AMBIANCE", "AMBIENCE", "AMBIENTE"),
          L("Musique de navigation", "Navigation music", "Música de navegación"),
          L("Active les pistes jouées sur toutes les pages hors partie, choisis leur ordre et règle leur niveau sonore.", "Choose the tracks played across every non-gameplay page, their order and volume.", "Elige las pistas de todas las páginas fuera de partida, su orden y volumen."),
        )}

        {toggleRow(
          L("Fond musical", "Background music", "Música de fondo"),
          enabledCount === 0
            ? L("Aucune piste sélectionnée.", "No track selected.", "Ninguna pista seleccionada.")
            : L(`${enabledCount} piste${enabledCount > 1 ? "s" : ""} active${enabledCount > 1 ? "s" : ""}.`, `${enabledCount} active track${enabledCount > 1 ? "s" : ""}.`, `${enabledCount} pista${enabledCount > 1 ? "s" : ""} activa${enabledCount > 1 ? "s" : ""}.`),
          prefs.navigationMusicEnabled,
          () => patch({ navigationMusicEnabled: !prefs.navigationMusicEnabled }),
        )}

        {rangeRow(L("Volume de la musique", "Music volume", "Volumen de música"), prefs.navigationVolume, (navigationVolume) => patch({ navigationVolume }), !prefs.masterEnabled || !prefs.navigationMusicEnabled)}

        <div style={{ padding: "10px 0", borderTop: `1px solid ${theme.borderSoft}` }}>
          <div style={{ color: theme.text, fontSize: 12, fontWeight: 950, marginBottom: 8 }}>{L("Mode de lecture", "Playback mode", "Modo de reproducción")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => patch({ navigationPlaybackMode: "random" })} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${prefs.navigationPlaybackMode === "random" ? theme.primary : theme.borderSoft}`, background: prefs.navigationPlaybackMode === "random" ? `${theme.primary}18` : INNER_BG, color: prefs.navigationPlaybackMode === "random" ? theme.primary : theme.textSoft, fontWeight: 1000, cursor: "pointer" }}>{L("ALÉATOIRE", "RANDOM", "ALEATORIO")}</button>
            <button type="button" onClick={() => patch({ navigationPlaybackMode: "ordered" })} style={{ minHeight: 42, borderRadius: 13, border: `1px solid ${prefs.navigationPlaybackMode === "ordered" ? theme.primary : theme.borderSoft}`, background: prefs.navigationPlaybackMode === "ordered" ? `${theme.primary}18` : INNER_BG, color: prefs.navigationPlaybackMode === "ordered" ? theme.primary : theme.textSoft, fontWeight: 1000, cursor: "pointer" }}>{L("ORDRE PRÉCIS", "EXACT ORDER", "ORDEN EXACTO")}</button>
          </div>
          <div style={{ marginTop: 7, color: theme.textSoft, fontSize: 9.6, lineHeight: 1.4 }}>
            {prefs.navigationPlaybackMode === "random"
              ? L("Chaque piste active passe une fois avant un nouveau mélange, sans répétition immédiate.", "Each active track plays once before reshuffling, without an immediate repeat.", "Cada pista activa suena una vez antes de mezclar de nuevo, sin repetición inmediata.")
              : L("Les pistes suivent exactement l’ordre affiché ci-dessous, puis la liste recommence.", "Tracks follow the exact order shown below, then the list loops.", "Las pistas siguen exactamente el orden mostrado y luego la lista se repite.")}
          </div>
        </div>

        <div style={{ paddingTop: 10, borderTop: `1px solid ${theme.borderSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>{L("Playlist", "Playlist", "Lista")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={selectAllTracks} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: INNER_BG, color: theme.textSoft, padding: "5px 8px", fontSize: 9, fontWeight: 950, cursor: "pointer" }}>{L("TOUTES", "ALL", "TODAS")}</button>
              <button type="button" onClick={() => patch({ enabledTrackIds: [] })} style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: INNER_BG, color: theme.textSoft, padding: "5px 8px", fontSize: 9, fontWeight: 950, cursor: "pointer" }}>{L("AUCUNE", "NONE", "NINGUNA")}</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {prefs.trackOrder.map((id, index) => {
              const track = NAVIGATION_MUSIC_TRACKS.find((item) => item.id === id);
              if (!track) return null;
              const active = prefs.enabledTrackIds.includes(id);
              const previewing = previewTrackId === id;
              return (
                <div key={id} style={{ display: "grid", gridTemplateColumns: prefs.navigationPlaybackMode === "ordered" ? "38px minmax(0,1fr) auto" : "minmax(0,1fr) auto", alignItems: "center", gap: 8, borderRadius: 14, border: `1px solid ${active ? `${theme.primary}55` : theme.borderSoft}`, background: active ? `${theme.primary}0D` : INNER_BG, padding: 9, opacity: active ? 1 : .62 }}>
                  {prefs.navigationPlaybackMode === "ordered" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <button type="button" disabled={index === 0} onClick={() => moveTrack(id, -1)} style={{ height: 22, borderRadius: 7, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", color: theme.textSoft, cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? .3 : 1 }}>↑</button>
                      <button type="button" disabled={index === prefs.trackOrder.length - 1} onClick={() => moveTrack(id, 1)} style={{ height: 22, borderRadius: 7, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", color: theme.textSoft, cursor: index === prefs.trackOrder.length - 1 ? "not-allowed" : "pointer", opacity: index === prefs.trackOrder.length - 1 ? .3 : 1 }}>↓</button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => toggleTrack(id)} style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 9, textAlign: "left", border: 0, background: "transparent", color: theme.text, padding: 0, cursor: "pointer" }}>
                    <span style={{ width: 24, height: 24, flex: "0 0 auto", borderRadius: 999, border: `1px solid ${active ? theme.primary : theme.borderSoft}`, background: active ? `${theme.primary}24` : "rgba(0,0,0,.25)", display: "grid", placeItems: "center", color: active ? theme.primary : theme.textSoft, fontSize: 12, fontWeight: 1000 }}>{active ? "✓" : index + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 11.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.name}</span>
                      <span style={{ display: "block", marginTop: 2, color: theme.textSoft, fontSize: 9.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pickLegacyLocalizedText(lang, track.subtitle.fr, track.subtitle.en, track.subtitle.es)}</span>
                    </span>
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <button type="button" onClick={() => selectOnlyTrack(id)} title={L("Lire uniquement cette piste", "Use only this track", "Usar solo esta pista")} style={{ minWidth: 34, height: 32, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: INNER_BG, color: theme.textSoft, fontSize: 9, fontWeight: 1000, cursor: "pointer" }}>1×</button>
                    <button type="button" disabled={!prefs.masterEnabled} onClick={() => previewTrack(id)} style={{ minWidth: 38, height: 32, borderRadius: 10, border: `1px solid ${previewing ? theme.primary : theme.borderSoft}`, background: previewing ? `${theme.primary}20` : INNER_BG, color: previewing ? theme.primary : theme.textSoft, fontSize: 13, cursor: prefs.masterEnabled ? "pointer" : "not-allowed" }}>{previewing ? "■" : "▶"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {toggleRow(
          L("Priorité à la voix d’Awena", "Awena voice priority", "Prioridad a la voz de Awena"),
          L("La musique baisse automatiquement pendant ses annonces sans perdre sa position.", "Music automatically ducks during announcements without losing its position.", "La música baja durante sus anuncios sin perder la posición."),
          prefs.duckAwenaEnabled,
          () => patch({ duckAwenaEnabled: !prefs.duckAwenaEnabled }),
        )}
        {rangeRow(L("Niveau pendant la voix", "Level during voice", "Nivel durante la voz"), prefs.duckAwenaRatio, (duckAwenaRatio) => patch({ duckAwenaRatio }), !prefs.duckAwenaEnabled)}

        <div style={{ marginTop: 4, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", padding: 9, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.45 }}>
          {L("Comportement conservé : continuité entre les pages, pause pendant une vidéo audible, arrêt et remise à zéro sur les écrans PLAY, puis nouvelle session au retour.", "Preserved behavior: continuous across pages, paused for audible video, stopped and reset on PLAY screens, then restarted on return.", "Comportamiento conservado: continuidad entre páginas, pausa con vídeo audible, parada y reinicio en PLAY y nueva sesión al volver.")}
        </div>
      </section>

      <section style={sectionStyle}>
        {sectionTitle(
          L("PARTIES", "GAMEPLAY", "PARTIDAS"),
          L("Sons et bruitages de jeu", "Game sounds and effects", "Sonidos y efectos de juego"),
          L("Ces préférences deviennent les valeurs globales utilisées par les modes et sont reprises dans les menus de configuration compatibles.", "These global defaults are reused by compatible game configuration screens.", "Estas preferencias globales se reutilizan en los menús de configuración compatibles."),
        )}
        {toggleRow(L("Bruitages de partie", "Game effects", "Efectos de partida"), L("Contrôle général des sons joués pendant les matchs et entraînements.", "Master control for sounds played during matches and training.", "Control general de sonidos durante partidas y entrenamientos."), prefs.gameplaySfxEnabled, () => patch({ gameplaySfxEnabled: !prefs.gameplaySfxEnabled }))}
        {toggleRow(L("Impacts et segments", "Impacts and segments", "Impactos y segmentos"), L("Fléchette, simple, double, triple, bull et autres validations directes.", "Dart hits, singles, doubles, triples, bull and direct confirmations.", "Dardos, simples, dobles, triples, bull y confirmaciones directas."), prefs.impactSfxEnabled, () => patch({ impactSfxEnabled: !prefs.impactSfxEnabled }))}
        {toggleRow(L("Arcade, jingles et événements", "Arcade, jingles and events", "Arcade, jingles y eventos"), L("Intros de mode, bust, 180, victoire, élimination et événements spéciaux.", "Mode intros, bust, 180, victory, elimination and special events.", "Intros, bust, 180, victoria, eliminación y eventos especiales."), prefs.arcadeSfxEnabled, () => patch({ arcadeSfxEnabled: !prefs.arcadeSfxEnabled }))}
        {rangeRow(L("Volume général des bruitages", "Global effects volume", "Volumen general de efectos"), prefs.gameplaySfxVolume, (gameplaySfxVolume) => patch({ gameplaySfxVolume }), !prefs.gameplaySfxEnabled || !prefs.masterEnabled)}
        {toggleRow(L("Clics et confirmations des menus", "Menu clicks and confirmations", "Clics y confirmaciones de menús"), L("Sons courts de navigation, validation et boutons compatibles.", "Short navigation, validation and compatible button sounds.", "Sonidos cortos de navegación, validación y botones compatibles."), prefs.uiSfxEnabled, () => patch({ uiSfxEnabled: !prefs.uiSfxEnabled }))}
        {rangeRow(L("Volume des menus", "Menu volume", "Volumen de menús"), prefs.uiSfxVolume, (uiSfxVolume) => patch({ uiSfxVolume }), !prefs.uiSfxEnabled || !prefs.masterEnabled)}
      </section>

      <section style={sectionStyle}>
        {sectionTitle(
          L("DÉMARRAGE", "STARTUP", "INICIO"),
          L("Intro animée", "Animated intro", "Intro animada"),
          L("Conserve le réglage déjà présent : ON joue l’intro complète, OFF ouvre directement la sélection des jeux.", "Keeps the existing behavior: ON plays the full intro, OFF opens game selection directly.", "Mantiene el comportamiento existente: ON reproduce la intro y OFF abre directamente la selección de juegos."),
        )}
        <div style={{ height: 245, borderRadius: 17, border: `1px solid ${introEnabled ? `${theme.primary}77` : theme.borderSoft}`, overflow: "hidden", position: "relative", background: "#07070b" }}>
          <SplashScreen onFinish={() => {}} previewLoop />
          <div style={{ position: "absolute", top: 9, right: 9, zIndex: 10, borderRadius: 999, border: `1px solid ${introEnabled ? theme.primary : theme.borderSoft}`, background: "rgba(0,0,0,.72)", color: introEnabled ? theme.primary : theme.textSoft, padding: "5px 9px", fontSize: 9, fontWeight: 1000 }}>{introEnabled ? L("ACTIVÉE", "ENABLED", "ACTIVADA") : L("DÉSACTIVÉE", "DISABLED", "DESACTIVADA")}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 10 }}>
          <button type="button" onClick={() => setIntro(true)} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${introEnabled ? theme.primary : theme.borderSoft}`, background: introEnabled ? `${theme.primary}20` : INNER_BG, color: introEnabled ? theme.primary : theme.textSoft, fontWeight: 1000, cursor: "pointer" }}>ON</button>
          <button type="button" onClick={() => setIntro(false)} style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${!introEnabled ? "rgba(255,100,115,.75)" : theme.borderSoft}`, background: !introEnabled ? "rgba(255,70,90,.1)" : INNER_BG, color: !introEnabled ? "#ff8190" : theme.textSoft, fontWeight: 1000, cursor: "pointer" }}>OFF</button>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          stopPreview();
          const restored = resetAudioPreferences();
          setPrefs(restored);
          setIntroEnabledState(true);
          setStartupIntroEnabled(true);
        }}
        style={{ width: "100%", minHeight: 44, borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.textSoft, fontSize: 10.5, fontWeight: 1000, cursor: "pointer" }}
      >
        {L("RÉTABLIR LES RÉGLAGES AUDIO PAR DÉFAUT", "RESTORE DEFAULT AUDIO SETTINGS", "RESTAURAR AJUSTES DE AUDIO")}
      </button>

      <div style={{ height: 8 }} />
    </div>
  );
}
