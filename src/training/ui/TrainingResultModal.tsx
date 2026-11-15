import React from "react";
import type { TrainingStats } from "../engine/trainingStats";
import { useAwenaOptional } from "../../awena/AwenaProvider";
import { buildTrainingTechnicalAdvice } from "../profile/trainingTechnicalCoaching";

export type TrainingResultMetric = {
  label: string;
  value: React.ReactNode;
};

export default function TrainingResultModal({
  open,
  success,
  title,
  stats,
  metrics = [],
  summaryCards,
  onClose,
  actionLabel = "RETOUR AU TRAINING",
  note = null,
  coachFocus,
  precisionAvailable = false,
  correctiveRoute,
  onStartCorrection,
}: {
  open: boolean;
  success: boolean;
  title?: string;
  stats: TrainingStats;
  metrics?: TrainingResultMetric[];
  summaryCards?: TrainingResultMetric[];
  onClose: () => void;
  actionLabel?: string;
  note?: React.ReactNode;
  coachFocus?: string;
  /** True only for individual hit data, never for aggregated visit scores. */
  precisionAvailable?: boolean;
  correctiveRoute?: { exerciseId: string; exerciseTitle: string; reason: string; actionLabel: string } | null;
  onStartCorrection?: (exerciseId: string) => void;
}) {
  const awena = useAwenaOptional();
  if (!open) return null;

  const accent = success ? "#27dcff" : "#ff5f9e";
  const safeDarts = Math.max(0, Number((stats as any)?.darts || 0));
  const safeHits = Math.max(0, Number((stats as any)?.hits || 0));
  const hitRate = Math.max(0, Number((stats as any)?.hitRate || 0));
  const score = Math.max(0, Number((stats as any)?.score || 0));
  const advice = buildTrainingTechnicalAdvice({
    focus: coachFocus || title, success, darts: safeDarts, hits: safeHits, score, precisionAvailable,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 700,
        display: "grid",
        placeItems: "center",
        padding: "max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom))",
        boxSizing: "border-box",
        background: "rgba(0,0,0,.82)",
        backdropFilter: "blur(7px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px,100%)",
          boxSizing: "border-box",
          maxHeight: "min(88dvh,calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))",
          overflowY: "auto",
          borderRadius: 24,
          border: `1px solid ${accent}88`,
          background: "linear-gradient(160deg,rgba(7,27,41,.99),rgba(2,9,17,.99))",
          color: "#fff",
          padding: "clamp(10px,3vw,18px)",
          boxShadow: `0 28px 80px rgba(0,0,0,.78), 0 0 28px ${accent}22`,
        }}
      >
        <div
          style={{
            color: accent,
            fontSize: 18,
            fontWeight: 950,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title || (success ? "Session réussie" : "Session terminée")}
        </div>

        <div
          className="mssTrainingResultKpis"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 8,
            marginTop: 14,
          }}
        >
          {(summaryCards?.length ? summaryCards.slice(0, 4).map((card) => [card.label, card.value] as const) : [
            ["SCORE", Math.round(score)],
            ["DARTS", safeDarts],
            ["HITS", safeHits],
            ["PRÉCISION", `${Math.round(hitRate * 100)}%`],
          ]).map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                minWidth: 0,
                padding: "9px 6px",
                textAlign: "center",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.11)",
                background: "rgba(0,0,0,.30)",
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.7, opacity: 0.58 }}>
                {label}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 17,
                  fontWeight: 950,
                  color: accent,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {metrics.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            {metrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(255,255,255,.035)",
                  padding: "9px 10px",
                }}
              >
                <div style={{ fontSize: 9.5, opacity: 0.58, fontWeight: 900, letterSpacing: 0.55 }}>
                  {metric.label}
                </div>
                <div style={{ marginTop: 3, fontWeight: 950, fontSize: 14.5 }}>{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {note ? <div style={{ marginTop: 10 }}>{note}</div> : null}

        <section className="mssTrainingCoachCorrection" aria-label="Correction technique Awena">
          <div className="mssTrainingCoachCorrectionTitle">
            <div><small>AWENA · CORRECTION TECHNIQUE</small><strong>{advice.title}</strong></div>
            <button type="button" onClick={() => { void awena?.say(`${advice.observation} ${advice.correction} ${advice.nextStep}`); }} disabled={!awena}
              aria-label="Écouter la correction technique" title="Écouter avec la voix Awena">🔊</button>
          </div>
          <p>{advice.observation}</p>
          <p><b>À travailler :</b> {advice.correction}</p>
          <div className="mssTrainingCoachNext">↻ {advice.nextStep}</div>
          {correctiveRoute && onStartCorrection && <div className="mssTrainingCorrectiveAction">
            <div><small>EXERCICE CONSEILLÉ</small><strong>{correctiveRoute.exerciseTitle}</strong><span>{correctiveRoute.reason}</span></div>
            <button type="button" onClick={() => onStartCorrection(correctiveRoute.exerciseId)}
              aria-label={`${correctiveRoute.actionLabel} : ${correctiveRoute.exerciseTitle}`}>
              ◎ {correctiveRoute.actionLabel}
            </button>
          </div>}
        </section>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            height: 46,
            marginTop: 16,
            borderRadius: 999,
            border: `1px solid ${accent}88`,
            background: success
              ? "linear-gradient(180deg,#39e4ff,#09afd9)"
              : "linear-gradient(180deg,#ff83b5,#ef397f)",
            color: "#071018",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
