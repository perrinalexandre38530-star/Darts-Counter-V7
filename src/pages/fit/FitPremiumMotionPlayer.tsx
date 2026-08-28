import React from "react";
import type { AwenaPremiumMotionSlot } from "../../fit/awenaPremiumMotions";
import LOGO from "../../assets/LOGO.png";

export default function FitPremiumMotionPlayer({
  slot,
  compact = false,
  onFail,
  showBadge = true,
}: {
  slot: AwenaPremiumMotionSlot;
  compact?: boolean;
  onFail?: () => void;
  showBadge?: boolean;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(true);
  const [pageVisible, setPageVisible] = React.useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  const [videoFailed, setVideoFailed] = React.useState(false);
  const [frameFailed, setFrameFailed] = React.useState(false);
  const [frameIndex, setFrameIndex] = React.useState(0);
  const reduced = React.useMemo(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches), []);

  React.useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setVisible(Boolean(entries[0]?.isIntersecting)), { rootMargin: "90px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const video = slot.video?.sources?.length ? slot.video : undefined;
  const frameSequence = slot.frameSequence?.frames?.length ? slot.frameSequence : undefined;
  const canUseVideo = Boolean(video && !videoFailed);
  const canUseFrames = Boolean(frameSequence && !frameFailed);
  const playing = visible && pageVisible && !reduced;

  React.useEffect(() => {
    if (!canUseFrames || canUseVideo || !frameSequence) return;
    if (!playing) {
      setFrameIndex(0);
      return;
    }
    const order = frameSequence.order?.length ? frameSequence.order : frameSequence.frames.map((_, index) => index);
    const frameMs = 1000 / Math.max(.5, frameSequence.fps || 3);
    let raf = 0;
    let last = performance.now();
    let cursor = 0;
    const tick = (now: number) => {
      if (now - last >= frameMs) {
        cursor = (cursor + 1) % order.length;
        setFrameIndex(order[cursor] ?? 0);
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [canUseFrames, canUseVideo, frameSequence, playing]);

  React.useEffect(() => {
    if (canUseVideo || canUseFrames) return;
    onFail?.();
  }, [canUseVideo, canUseFrames, onFail]);

  const height = compact ? 130 : 260; // legacy sizing reference: compact ? 168 : 260
  const frameSrc = frameSequence?.frames[Math.min(frameIndex, Math.max(0, (frameSequence?.frames.length || 1) - 1))];

  return (
    <div ref={hostRef} style={{ position: "relative", width: "100%", height, minHeight: height, overflow: "hidden", background: "radial-gradient(circle at 50% 42%,rgba(246,194,86,.12),rgba(2,4,9,.98) 68%)" }}>
      {canUseVideo && video ? (
        <video
          muted
          loop
          autoPlay={playing}
          playsInline
          preload="metadata"
          poster={video.poster}
          onError={() => setVideoFailed(true)}
          ref={(node) => {
            if (!node) return;
            if (playing) void node.play().catch(() => undefined);
            else node.pause();
          }}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        >
          {video.sources.map((source) => <source key={source.src} src={source.src} type={source.type}/>) }
        </video>
      ) : canUseFrames && frameSequence && frameSrc ? (
        <img
          src={reduced ? (frameSequence.poster || frameSequence.frames[0]) : frameSrc}
          alt={`Animation 3D premium ${slot.label}`}
          draggable={false}
          onError={() => setFrameFailed(true)}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        />
      ) : null}
      {showBadge ? <div style={{ position: "absolute", left: 8, top: 8, display: "inline-flex", alignItems: "center", gap: 7, minHeight: compact ? 24 : 28, padding: compact ? "0 7px 0 4px" : "0 9px 0 4px", borderRadius: 999, background: "rgba(3,5,10,.82)", border: "1px solid rgba(246,194,86,.26)", color: "#f6c256", pointerEvents: "none" }}>
        <img src={LOGO} alt="" aria-hidden="true" style={{ width: compact ? 16 : 18, height: compact ? 16 : 18, borderRadius: 999, objectFit: "contain" }} />
        <span style={{ fontSize: compact ? 5.9 : 6.8, fontWeight: 1000, letterSpacing: .75, lineHeight: 1.05 }}>MULTISPORTS<br/>SCORING</span>
      </div> : null}
    </div>
  );
}
