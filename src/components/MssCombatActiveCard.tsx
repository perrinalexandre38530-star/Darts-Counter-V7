import React from "react";

type Props = {
  name: string;
  avatar?: string | null;
  accent: string;
  label: string;
  value: React.ReactNode;
  detail?: string;
  objective: string;
  rightTitle: string;
  rightValue: React.ReactNode;
  rightDetail?: React.ReactNode;
  children?: React.ReactNode;
};

/** Présentation de jeu uniquement : le moteur et les calculs restent dans la page hôte.
 * Identité à gauche, consigne opérationnelle à droite, comme le joueur actif LOTERIE. */
export default function MssCombatActiveCard({
  name, avatar, accent, label, value, detail, objective,
  rightTitle, rightValue, rightDetail, children,
}: Props) {
  return (
    <section
      className="mss-combat-active-card mss-combat-active-card-v219"
      style={{ ["--combat-accent" as any]: accent }}
      aria-label={`Joueur actif ${name}`}
    >
      <div className="mss-combat-active-main">
        <div className="mss-combat-active-identity">
          <div className="mss-combat-active-avatar">
            {avatar ? <img src={avatar} alt="" /> : <span>{name?.slice(0, 1) || "J"}</span>}
          </div>
          <div className="mss-combat-active-copy">
            <small>JOUEUR ACTIF · {label}</small>
            <strong title={name}>{name}</strong>
            <div className="mss-combat-active-result">
              <span className="mss-combat-active-value">{value}</span>
              {detail && <span className="mss-combat-active-detail">{detail}</span>}
            </div>
          </div>
        </div>
        <div className="mss-combat-active-goal">
          <span className="mss-combat-goal-title">◎ OBJECTIF</span>
          <div className="mss-combat-goal-main">
            <small>{rightTitle}</small>
            <strong>{rightValue}</strong>
          </div>
          <p>{objective}</p>
          {rightDetail && <div className="mss-combat-goal-detail">{rightDetail}</div>}
        </div>
      </div>
      {children && <div className="mss-combat-active-footer">{children}</div>}
    </section>
  );
}
