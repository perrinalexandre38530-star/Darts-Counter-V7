import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import TrainingHeader from "./TrainingHeader";
import ProfileAvatar from "../../components/ProfileAvatar";

export type TrainingKpi = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
};

const FULLSCREEN_STYLE_ID = "dc-training-fullscreen-style";
const FULLSCREEN_CLASS = "dc-training-fullscreen-play";

export default function TrainingPlayLayout({
  title,
  tickerId,
  rules,
  onExit,
  eyebrow,
  target,
  targetHint,
  progress,
  kpis,
  participant,
  participantIndex,
  participantTotal,
  children,
}: {
  title: string;
  tickerId?: string;
  rules: React.ReactNode;
  onExit: () => void;
  eyebrow?: string;
  target: React.ReactNode;
  targetHint?: React.ReactNode;
  progress?: { value: number; max: number; label?: string } | null;
  kpis?: TrainingKpi[];
  participant?: any;
  participantIndex?: number;
  participantTotal?: number;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const accent = "#27dcff";

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {}

    document.body.classList.add(FULLSCREEN_CLASS);

    let style = document.getElementById(FULLSCREEN_STYLE_ID) as HTMLStyleElement | null;
    let created = false;
    if (!style) {
      style = document.createElement("style");
      style.id = FULLSCREEN_STYLE_ID;
      style.textContent = `
        body.${FULLSCREEN_CLASS} .bottom-nav,
        body.${FULLSCREEN_CLASS} .dc-tabbar,
        body.${FULLSCREEN_CLASS} .tabbar,
        body.${FULLSCREEN_CLASS} .bottom-tabbar,
        body.${FULLSCREEN_CLASS} nav[role="navigation"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
      `;
      document.head.appendChild(style);
      created = true;
    }

    return () => {
      document.body.classList.remove(FULLSCREEN_CLASS);
      if (created) style?.remove();
    };
  }, []);

  const safeMax = Math.max(1, Number(progress?.max || 1));
  const safeValue = Math.max(0, Number(progress?.value || 0));
  const pct = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
  const shownKpis = Array.isArray(kpis) ? kpis.slice(0, 4) : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <TrainingHeader title={title} tickerId={tickerId} onBack={onExit} rules={rules} />

      <main
        style={{
          width: "min(760px,100%)",
          margin: "0 auto",
          padding: "10px 10px calc(16px + env(safe-area-inset-bottom))",
        }}
      >
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 20,
            border: "1px solid rgba(39,220,255,.40)",
            background: "linear-gradient(135deg,rgba(10,43,60,.96),rgba(2,13,24,.97))",
            boxShadow: "0 14px 36px rgba(0,0,0,.34), inset 0 0 34px rgba(39,220,255,.05)",
            padding: "13px 15px",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              right: -72,
              top: -105,
              background: "rgba(39,220,255,.10)",
              filter: "blur(5px)",
            }}
          />

          {participant ? (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                paddingBottom: 8,
                borderBottom: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <ProfileAvatar
                name={participant?.name || "Joueur"}
                dataUrl={participant?.avatarDataUrl || participant?.avatarUrl || undefined}
                size={34}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, color: accent, fontWeight: 950, textTransform: "uppercase", letterSpacing: .8 }}>
                  {Number(participantTotal || 1) > 1 ? `Joueur ${Number(participantIndex || 1)}/${Number(participantTotal || 1)}` : "Joueur"}
                </div>
                <div style={{ marginTop: 1, fontSize: 12.5, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {participant?.name || "Joueur"}{participant?.teamName ? ` • ${participant.teamName}` : ""}
                </div>
              </div>
            </div>
          ) : null}

          {eyebrow ? (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 950,
                letterSpacing: 1.25,
                color: accent,
                opacity: 0.92,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              position: "relative",
              marginTop: 3,
              fontSize: "clamp(28px,7.5vw,48px)",
              lineHeight: 1.05,
              fontWeight: 950,
              letterSpacing: -1,
            }}
          >
            {target}
          </div>

          {targetHint ? (
            <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.35, opacity: 0.72, fontWeight: 700 }}>
              {targetHint}
            </div>
          ) : null}

          {progress ? (
            <div style={{ marginTop: 11 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  fontSize: 10,
                  fontWeight: 950,
                  letterSpacing: 0.65,
                  opacity: 0.72,
                }}
              >
                <span>{progress.label || "PROGRESSION"}</span>
                <span>
                  {Math.min(safeValue, safeMax)} / {safeMax}
                </span>
              </div>
              <div
                style={{
                  height: 7,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.08)",
                  overflow: "hidden",
                  marginTop: 5,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg,#16bde8,#46e7ff)",
                    boxShadow: "0 0 12px rgba(39,220,255,.42)",
                    transition: "width .16s ease",
                  }}
                />
              </div>
            </div>
          ) : null}
        </section>

        {shownKpis.length ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${shownKpis.length},minmax(0,1fr))`,
              gap: 7,
              marginTop: 8,
            }}
          >
            {shownKpis.map((kpi, index) => (
              <div
                key={`${kpi.label}-${index}`}
                style={{
                  minWidth: 0,
                  borderRadius: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: "rgba(4,17,28,.80)",
                  padding: "8px 5px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 8.5,
                    fontWeight: 950,
                    letterSpacing: 0.55,
                    opacity: 0.58,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {kpi.label}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: "clamp(14px,4vw,18px)",
                    fontWeight: 950,
                    color: accent,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {kpi.value}
                </div>
                {kpi.sub ? <div style={{ marginTop: 1, fontSize: 8.5, opacity: 0.5 }}>{kpi.sub}</div> : null}
              </div>
            ))}
          </section>
        ) : null}

        <section style={{ marginTop: 8 }}>{children}</section>
      </main>
    </div>
  );
}
