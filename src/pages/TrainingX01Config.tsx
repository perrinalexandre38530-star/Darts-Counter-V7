import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useCurrentProfile } from "../hooks/useCurrentProfile";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import tickerX01 from "../assets/tickers/ticker_x01.png";
import TrainingParticipantsSelector, {
  buildTrainingParticipantConfig,
  createDefaultTrainingParticipantSelection,
  resolveTrainingParticipants,
  type TrainingParticipantSelection,
} from "../training/ui/TrainingParticipantsSelector";

type Tab = "training" | "training_x01_play";

type Props = {
  store?: any;
  go?: (tab: any, params?: any) => void;
};

const START_CHOICES = [301, 501, 701, 901] as const;
const OUT_CHOICES = ["simple", "double", "master"] as const;

function pillStyle(active: boolean, primary: string, borderSoft: string, text: string): React.CSSProperties {
  return {
    padding: "10px 13px",
    minWidth: 58,
    borderRadius: 999,
    fontWeight: 950,
    border: active ? `1px solid ${primary}` : `1px solid ${borderSoft}`,
    background: active
      ? `linear-gradient(180deg, ${primary}, rgba(0,0,0,.42))`
      : "rgba(8,10,16,.92)",
    color: active ? "#111" : text,
    boxShadow: active ? `0 0 16px ${primary}55` : "none",
    cursor: "pointer",
  };
}

export default function TrainingX01Config({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const currentProfile = useCurrentProfile() as any;
  const profiles = React.useMemo(
    () => (Array.isArray(store?.profiles) ? store.profiles : currentProfile ? [currentProfile] : []),
    [store?.profiles, currentProfile]
  );
  const activeProfileId = String(store?.activeProfileId || currentProfile?.id || "").trim();

  const [startScore, setStartScore] = React.useState<(typeof START_CHOICES)[number]>(501);
  const [outMode, setOutMode] = React.useState<(typeof OUT_CHOICES)[number]>("double");
  const [voiceScoreEnabled, setVoiceScoreEnabled] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [participants, setParticipants] = React.useState<TrainingParticipantSelection>(() => {
    const base = createDefaultTrainingParticipantSelection(profiles);
    if (activeProfileId) return { ...base, selectedPlayerIds: [activeProfileId] };
    return base;
  });

  React.useEffect(() => {
    if (participants.participantMode !== "players" || participants.selectedPlayerIds.length > 0) return;
    const fallback = activeProfileId || String(profiles?.[0]?.id || "").trim();
    if (fallback) setParticipants((prev) => ({ ...prev, selectedPlayerIds: [fallback] }));
  }, [activeProfileId, participants.participantMode, participants.selectedPlayerIds.length, profiles]);

  React.useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const resolvedParticipants = React.useMemo(
    () => resolveTrainingParticipants(participants, profiles),
    [participants, profiles]
  );
  const canLaunch = resolvedParticipants.length > 0;

  function launch() {
    if (!go || !canLaunch) return;
    const now = Date.now();
    const participantConfig = buildTrainingParticipantConfig(participants, profiles);
    go("training_x01_play" as Tab, {
      config: {
        startScore,
        outMode,
        voiceScoreInputEnabled: voiceScoreEnabled,
        locked: true,
        training: true,
        modeId: "training_x01",
        groupSessionId: `training-group-training_x01-${now}-${Math.random().toString(36).slice(2, 8)}`,
        groupStartedAt: now,
        ...participantConfig,
      },
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: "0 16px 110px",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          paddingTop: "env(safe-area-inset-top)",
          marginBottom: 14,
          marginLeft: -16,
          marginRight: -16,
          background: theme.bg,
        }}
      >
        <div style={{ position: "relative" }}>
          <img
            src={tickerX01 as any}
            alt="Training X01"
            draggable={false}
            style={{ width: "100%", height: 92, objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              pointerEvents: "none",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <BackDot
                onClick={() => go?.("training" as Tab)}
                title={t("common.back", "Retour")}
                color={theme.primary}
                glow={`${theme.primary}88`}
                size={46}
              />
            </div>
            <div style={{ pointerEvents: "auto" }}>
              <InfoDot
                onClick={() => setInfoOpen(true)}
                title={t("common.rules", "Règles")}
                color={theme.primary}
                glow={`${theme.primary}88`}
                size={46}
              />
            </div>
          </div>
        </div>
      </div>

      {infoOpen ? (
        <div
          onClick={() => setInfoOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,.76)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px,94vw)",
              maxHeight: "82vh",
              overflowY: "auto",
              background: theme.card,
              border: `1px solid ${theme.primary}66`,
              borderRadius: 20,
              padding: 16,
              boxShadow: "0 18px 50px rgba(0,0,0,.72)",
            }}
          >
            <div style={{ fontWeight: 1000, color: theme.primary, fontSize: 17, marginBottom: 9 }}>
              Training X01
            </div>
            <div style={{ fontSize: 12.5, color: theme.textSoft, lineHeight: 1.55 }}>
              <p style={{ marginTop: 0 }}>Tout le monde joue exactement la même configuration d'entraînement : même score de départ et même règle de sortie.</p>
              <p>Il n'y a pas de mode match : les joueurs s'entraînent chacun à leur tour. En multi-joueurs ou en équipes, un comparatif final est généré et sauvegardé dans Statistiques Training.</p>
              <p style={{ marginBottom: 0 }}>Les variantes 301 / 501 / 701 / 901 et Simple / Double / Master Out restent enregistrées séparément dans les statistiques.</p>
            </div>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              style={{ ...pillStyle(true, theme.primary, theme.borderSoft, theme.text), width: "100%", marginTop: 14 }}
            >
              {t("common.close", "Fermer")}
            </button>
          </div>
        </div>
      ) : null}

      <TrainingParticipantsSelector
        profiles={profiles}
        value={participants}
        onChange={setParticipants}
        maxPlayers={12}
      />

      <section
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 18,
          padding: 13,
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 10, color: theme.primary, textTransform: "uppercase", letterSpacing: .8, fontSize: 12 }}>
          Score de départ
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {START_CHOICES.map((score) => (
            <button key={score} type="button" onClick={() => setStartScore(score)} style={pillStyle(startScore === score, theme.primary, theme.borderSoft, theme.text)}>
              {score}
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 18,
          padding: 13,
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 10, color: theme.primary, textTransform: "uppercase", letterSpacing: .8, fontSize: 12 }}>
          Règle de sortie
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {OUT_CHOICES.map((mode) => (
            <button key={mode} type="button" onClick={() => setOutMode(mode)} style={{ ...pillStyle(outMode === mode, theme.primary, theme.borderSoft, theme.text), textTransform: "capitalize" }}>
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: 12,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          borderRadius: 18,
          padding: 13,
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 5 }}>Commande vocale (saisie scores)</div>
        <div style={{ fontSize: 12, color: theme.textSoft, marginBottom: 10 }}>
          Dicte tes 3 fléchettes. Récapitulatif + confirmation avant validation.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setVoiceScoreEnabled(false)} style={pillStyle(!voiceScoreEnabled, theme.primary, theme.borderSoft, theme.text)}>OFF</button>
          <button type="button" onClick={() => setVoiceScoreEnabled(true)} style={pillStyle(voiceScoreEnabled, theme.primary, theme.borderSoft, theme.text)}>ON</button>
        </div>
      </section>

      <section
        style={{
          marginTop: 12,
          borderRadius: 16,
          border: `1px solid ${theme.primary}44`,
          background: `${theme.primary}0d`,
          padding: "10px 12px",
          color: theme.textSoft,
          fontSize: 11,
          lineHeight: 1.45,
        }}
      >
        <strong style={{ color: theme.primary }}>{resolvedParticipants.length}</strong> participant{resolvedParticipants.length > 1 ? "s" : ""} • {participants.participantMode === "teams" ? "Training en équipes" : resolvedParticipants.length > 1 ? "Training multi-joueurs" : "Training solo"} • {startScore} • {outMode.toUpperCase()} OUT
      </section>

      <button
        type="button"
        disabled={!canLaunch}
        onClick={launch}
        style={{
          marginTop: 16,
          width: "100%",
          minHeight: 54,
          borderRadius: 18,
          border: `1px solid ${canLaunch ? theme.primary : theme.borderSoft}`,
          background: canLaunch
            ? `linear-gradient(180deg, ${theme.primary}, rgba(0,0,0,.45))`
            : "rgba(255,255,255,.05)",
          color: canLaunch ? "#111" : theme.textSoft,
          fontWeight: 1000,
          letterSpacing: .8,
          textTransform: "uppercase",
          boxShadow: canLaunch ? `0 14px 30px rgba(0,0,0,.6), 0 0 18px ${theme.primary}55` : "none",
          cursor: canLaunch ? "pointer" : "not-allowed",
        }}
      >
        Lancer la session Training
      </button>
    </div>
  );
}
