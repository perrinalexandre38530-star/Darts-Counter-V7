import React from "react";
import type { EsportsGameDefinition } from "../../esports/types";
import { getEsportsCoverCandidates } from "../../esports/coverArt";

type Props = {
  game: EsportsGameDefinition;
  className?: string;
  eager?: boolean;
};

export default function GameCover({ game, className = "", eager = false }: Props) {
  const candidates = React.useMemo(() => getEsportsCoverCandidates(game), [game.id, game.name]);
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => setIndex(0), [game.id]);
  const src = candidates[index] || "";

  return (
    <div className={`esports-game-cover ${className}`.trim()} style={{ ["--game-cover-accent" as any]: game.accent } as React.CSSProperties}>
      {src ? (
        <img
          src={src}
          alt={`${game.name} cover art`}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <div className="esports-game-cover-fallback" aria-label={game.name}>
          <span>{game.icon}</span>
          <strong>{game.shortName}</strong>
        </div>
      )}
      <span className="esports-game-cover-shine" aria-hidden="true" />
    </div>
  );
}
