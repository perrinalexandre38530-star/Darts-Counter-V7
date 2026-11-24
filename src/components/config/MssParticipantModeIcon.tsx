import duelMask from "../../ui_assets/participants/duel.png";
import teamsMask from "../../ui_assets/participants/teams.png";
import multiMask from "../../ui_assets/participants/multi.png";

/**
 * Pictogrammes MSS normalisés pour les formats de participants.
 * Les PNG servent de MASQUES alpha : la couleur vient toujours de currentColor,
 * elle-même héritée du ThemeContext par le bouton parent.
 */
export type MssParticipantMode = "duel" | "teams" | "multi";

const modeMasks: Record<MssParticipantMode, string> = {
  duel: duelMask,
  teams: teamsMask,
  multi: multiMask,
};

export default function MssParticipantModeIcon({
  kind,
  size = 36,
}: {
  kind: MssParticipantMode;
  size?: number;
}) {
  const mask = `url("${modeMasks[kind]}")`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: "currentColor",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
