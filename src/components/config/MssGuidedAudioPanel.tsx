import React from "react";

function AudioRowIcon({ kind, accent }: { kind: "arcade" | "hits" | "voice"; accent: string }) {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 27px" }}>
      {kind === "arcade" && <><path d="M7 10h4l5-4v12l-5-4H7z"/><path d="M18 9c2 1.5 2 4.5 0 6M20 6c3.5 3 3.5 9 0 12"/></>}
      {kind === "hits" && <><path d="M2.5 10v4M6.2 7v10M9.8 4v16M13.5 8v8M17.1 5.5v13M20.8 9v6" strokeWidth="2.2"/></>}
      {kind === "voice" && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></>}
    </svg>
  );
}

function VoiceChoiceIcon({ kind, accent }: { kind: string; accent: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: accent }}>
      {kind === "default" && <><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></>}
      {kind === "female" && <><circle {...p} cx="12" cy="9" r="4.4"/><path {...p} d="M12 13.4V21"/><path {...p} d="M9 18h6"/></>}
      {kind === "male" && <><path {...p} d="M15 4h5v5"/><path {...p} d="M14 10 20 4"/><circle {...p} cx="10" cy="14" r="5"/></>}
      {kind === "robot" && <><rect {...p} x="6" y="7" width="12" height="10" rx="2.4"/><path {...p} d="M12 4v3M9 20h6"/><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r="1" fill="currentColor" stroke="none"/><path {...p} d="M9 15h6"/></>}
    </svg>
  );
}

function VoiceChoiceBadge({ kind, accent, active }: { kind: string; accent: string; active?: boolean }) {
  const borderColor = active ? accent : "rgba(255,255,255,.10)";
  const background = active ? `${accent}14` : "rgba(255,255,255,.03)";
  if (kind === "awena") {
    return (
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          border: `1px solid ${borderColor}`,
          background: `url(/awena/awena-voice-face.webp) center / cover no-repeat, rgba(9,11,23,.86)`,
          boxShadow: active ? `0 0 14px ${accent}24` : "none",
          overflow: "hidden",
        }}
      />
    );
  }
  return (
    <div style={{ width: 52, height: 52, borderRadius: 16, border: `1px solid ${borderColor}`, background, display: "grid", placeItems: "center" }}>
      <VoiceChoiceIcon kind={kind} accent={accent} />
    </div>
  );
}

function detectVoiceKind(id: string, label: string) {
  const value = `${id} ${label}`.toLowerCase();
  if (value.includes("awena")) return "awena";
  if (value.includes("robot")) return "robot";
  if (value.includes("mascul")) return "male";
  if (value.includes("fem")) return "female";
  return "default";
}

const voiceHints: Record<string, string> = {
  default: "Voix standard de l'application.",
  female: "Annonce claire avec voix féminine.",
  male: "Annonce claire avec voix masculine.",
  robot: "Rendu synthétique plus technique.",
  awena: "Voix officielle d'Awena.",
};

/**
 * MSS CONFIG — étape audio guidée, dissociée du mode de saisie.
 * Les réglages restent contrôlés et persistés par le configurateur appelant.
 */
export default function MssGuidedAudioPanel({
  accent, arcade, hits, voice, onArcadeChange, onHitsChange, onVoiceChange,
  voiceId, voices, onVoiceIdChange,
}: {
  accent: string;
  arcade: boolean;
  hits: boolean;
  voice: boolean;
  onArcadeChange: (enabled: boolean) => void;
  onHitsChange: (enabled: boolean) => void;
  onVoiceChange: (enabled: boolean) => void;
  voiceId: string;
  voices: ReadonlyArray<{ id: string; label: string }>;
  onVoiceIdChange: (id: string) => void;
}) {
  const [voicePickerOpen, setVoicePickerOpen] = React.useState(false);
  const selectedVoice = React.useMemo(
    () => voices.find((entry) => entry.id === voiceId) || voices[0] || { id: "default", label: "Défaut" },
    [voices, voiceId]
  );

  const options = [
    { id: "arcade", name: "SONS ARCADE", hint: "BULL, DOUBLE, TRIPLE, 180, BUST et victoire", checked: arcade, setChecked: onArcadeChange },
    { id: "hits", name: "BRUITAGES", hint: "Impacts de fléchettes", checked: hits, setChecked: onHitsChange },
    { id: "voice", name: "ANNONCES VOCALES", hint: "Scores et fin de match", checked: voice, setChecked: onVoiceChange },
  ] as const;

  const selectedVoiceKind = detectVoiceKind(String(selectedVoice?.id || "default"), String(selectedVoice?.label || "Défaut"));

  return (
    <section aria-label="Réglages audio du mode de jeu" style={{ minWidth: 0 }}>
      <h3 style={{ color: accent, fontSize: 13, fontWeight: 950, letterSpacing: 1, margin: "0 0 11px" }}>MODE AUDIO</h3>
      <div style={{ display: "grid", gap: 0 }}>
        {options.map((option, i) => (
          <div key={option.id} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", padding: "11px 3px", borderTop: i ? "1px solid rgba(255,255,255,.07)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <AudioRowIcon kind={option.id} accent={accent} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "#f5f6fb", fontWeight: 950 }}>{option.name}</div>
                <div style={{ fontSize: 10.5, color: "#aeb7cb", marginTop: 3, lineHeight: 1.3 }}>{option.hint}</div>
              </div>
            </div>
            <button type="button" role="switch" aria-checked={option.checked} aria-label={`${option.name} ${option.checked ? "activé" : "désactivé"}`}
              onClick={() => option.setChecked(!option.checked)}
              style={{ width: 41, height: 41, flex: "0 0 41px", borderRadius: "50%", cursor: "pointer",
                border: `1.5px solid ${option.checked ? accent : "#ef5a74"}`,
                background: option.checked ? `${accent}26` : "transparent", boxShadow: option.checked ? `0 0 11px ${accent}24` : "none",
                display: "grid", placeItems: "center", color: option.checked ? accent : "#ef5a74", fontSize: 20, fontWeight: 900 }}>
              {option.checked ? "✓" : ""}
            </button>
          </div>
        ))}
      </div>

      {voice && (
        <div style={{ marginTop: 9, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ color: "#c9d1e5", fontSize: 11.5, fontWeight: 900, marginBottom: 8 }}>VOIX DE L'ANNONCEUR</div>
          <button
            type="button"
            onClick={() => setVoicePickerOpen(true)}
            style={{
              width: "100%",
              borderRadius: 15,
              border: `1px solid ${accent}4f`,
              background: "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.02))",
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              cursor: "pointer",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, textAlign: "left" }}>
              <div style={{ width: 48, height: 48, flex: "0 0 48px" }}>
                <div style={{ transform: "scale(.923)", transformOrigin: "center" }}>
                  <VoiceChoiceBadge kind={selectedVoiceKind} accent={accent} active />
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 950, color: accent }}>{selectedVoice?.label || "Défaut"}</div>
                <div style={{ fontSize: 10.5, color: "#aeb7cb", marginTop: 3, lineHeight: 1.35 }}>{voiceHints[selectedVoiceKind] || voiceHints.default}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#f7f8fd", whiteSpace: "nowrap" }}>CHOISIR</div>
          </button>
        </div>
      )}

      {voicePickerOpen && (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Choix de la voix de l'annonceur"
            onClick={() => setVoicePickerOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1400, background: "rgba(2,4,10,.72)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", padding: 18 }}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(92vw, 430px)", borderRadius: 24, border: `1px solid ${accent}55`, background: "linear-gradient(180deg, rgba(11,14,28,.98), rgba(5,7,15,.98))", boxShadow: `0 20px 56px rgba(0,0,0,.72), 0 0 24px ${accent}18`, padding: 16, color: "#fff" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ color: accent, fontSize: 14, fontWeight: 1000, letterSpacing: .8 }}>VOIX DE L'ANNONCEUR</div>
                <div style={{ color: "#aeb7cb", fontSize: 11, marginTop: 4 }}>Choisis la voix préférentielle utilisée pendant la partie.</div>
              </div>
              <button
                type="button"
                onClick={() => setVoicePickerOpen(false)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {voices.map((option) => {
                const kind = detectVoiceKind(String(option.id), String(option.label));
                const active = option.id === selectedVoice?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onVoiceIdChange(option.id);
                      setVoicePickerOpen(false);
                    }}
                    style={{
                      minWidth: 0,
                      borderRadius: 18,
                      border: `1px solid ${active ? accent : "rgba(255,255,255,.10)"}`,
                      background: active ? `${accent}18` : "rgba(255,255,255,.03)",
                      color: "#fff",
                      padding: 12,
                      display: "grid",
                      justifyItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      boxShadow: active ? `0 0 16px ${accent}20` : "none",
                    }}
                  >
                    <VoiceChoiceBadge kind={kind} accent={accent} active={active} />
                    <div style={{ fontWeight: 950, fontSize: 12, color: active ? accent : "#fff" }}>{option.label}</div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.35, color: "#aeb7cb" }}>{voiceHints[kind] || voiceHints.default}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
