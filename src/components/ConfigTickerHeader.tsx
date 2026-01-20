// ============================================
// src/components/ConfigTickerHeader.tsx
// Header full-width avec ticker image + BackDot (gauche) + InfoDot (droite)
// - conçu pour remplacer "Titre + annotation" sur les pages CONFIG
// - overlay safe-area, responsive, sans casser les layouts existants
// ============================================

import React from "react";

type Props = {
  src: string;
  alt?: string;

  // Hauteur du ticker (tu peux ajuster selon tes assets)
  height?: number; // px

  // Optionnel : afficher un bouton retour / info
  left?: React.ReactNode;  // ex: <BackDot .../>
  right?: React.ReactNode; // ex: <InfoDot .../>

  // Si tu as un header sticky existant, garde sticky=true.
  sticky?: boolean;

  // Optionnel : arrondis/ombre (souvent utile si tu veux un rendu "carte")
  rounded?: boolean;
};

export default function ConfigTickerHeader({
  src,
  alt = "ticker",
  height = 92,
  left,
  right,
  sticky = true,
  rounded = false,
}: Props) {
  return (
    <div
      className={[
        sticky ? "sticky top-0 z-40" : "",
        "w-full",
        "bg-transparent",
      ].join(" ")}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="relative w-full">
        <img
          src={src}
          alt={alt}
          className={[
            "block w-full object-cover",
            rounded ? "rounded-2xl" : "",
          ].join(" ")}
          style={{ height }}
          draggable={false}
        />

        {/* Overlay boutons */}
        {(left || right) && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full flex items-center justify-between px-3">
              <div className="pointer-events-auto">{left}</div>
              <div className="pointer-events-auto">{right}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
