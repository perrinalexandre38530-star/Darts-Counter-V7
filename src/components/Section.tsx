import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
};

/**
 * Section — titre "signature" identique aux menus Config (X01/Killer/Shanghai)
 * - Titre en MAJ, couleur thème (primary)
 * - Plus de "pill" néon autour du titre
 */
export default function Section({ title, children, right }: Props) {
  const { theme } = useTheme();
  const primary = theme?.primary || "var(--dc-accent)";

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div
        className="row-between"
        style={{ marginBottom: 10, alignItems: "center" }}
      >
        <h3
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontWeight: 800,
            color: primary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {right}
      </div>

      {children}
    </div>
  );
}
