import React from "react";
import {
  ensureGoogleCastReady,
  getGoogleCastAppId,
  getGoogleCastState,
  setGoogleCastAppId,
  subscribeGoogleCastStatus,
} from "../cast/googleCast";

type Props = {
  accent: string;
  textMain: string;
  textSoft: string;
};

export default function GlobalCastButton({ accent, textMain, textSoft }: Props) {
  const [ready, setReady] = React.useState(false);
  const [isCasting, setIsCasting] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    const refresh = () => {
      if (!alive) return;
      const state = getGoogleCastState();
      setReady(!!state?.sdkLoaded);
      setIsCasting(!!state?.isCasting);
    };

    const boot = async () => {
      try {
        if (!getGoogleCastAppId()) {
          setGoogleCastAppId("CC1AD845");
        }
        await ensureGoogleCastReady();
      } catch {}
      refresh();
    };

    boot();
    const off = subscribeGoogleCastStatus(refresh);

    return () => {
      alive = false;
      try {
        off && off();
      } catch {}
    };
  }, []);

  return (
    <div
      className="tab pill"
      title={isCasting ? "Chromecast connecté" : "Chromecast"}
      style={{ color: ready ? accent : textSoft }}
    >
      <span
        className="pill-inner"
        style={{
          borderColor: ready ? `${accent}66` : "transparent",
          boxShadow: isCasting
            ? `0 0 0 1px ${accent}55, 0 0 12px ${accent}CC`
            : ready
            ? `0 0 0 1px ${accent}33, 0 0 8px ${accent}66`
            : "none",
          background: ready ? "rgba(0,0,0,0.22)" : "transparent",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          minWidth: 58,
          position: "relative",
        }}
      >
        <span
          className="tab-icon"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            position: "relative",
            filter: ready ? `drop-shadow(0 0 6px ${accent})` : "none",
          }}
        >
          <google-cast-launcher
            style={{
              width: "22px",
              height: "22px",
              display: "block",
              cursor: "pointer",
              color: ready ? accent : textSoft,
            }}
          />
          {isCasting ? (
            <span
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 6,
                height: 6,
                borderRadius: 999,
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
              }}
            />
          ) : null}
        </span>

        <span
          className="tab-label"
          style={{ color: ready ? textMain : textSoft }}
        >
          Cast
        </span>
      </span>
    </div>
  );
}
