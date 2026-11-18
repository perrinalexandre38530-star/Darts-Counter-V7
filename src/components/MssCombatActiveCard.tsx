import React from "react";

type Props = {
  name: string; avatar?: string | null; accent: string;
  label: string; value: React.ReactNode; detail?: string;
  objective: string; rightTitle: string; rightValue: React.ReactNode;
  rightDetail?: React.ReactNode; children?: React.ReactNode;
};
/** Structure reprise du joueur actif LOTERIE : panneau personnage à gauche,
 * objectif immédiatement lisible à droite. Aucun état du moteur de jeu ici. */
export default function MssCombatActiveCard({name,avatar,accent,label,value,detail,objective,rightTitle,rightValue,rightDetail,children}:Props) {
 return <section className="mss-combat-active-card" style={{['--combat-accent' as any]:accent}} aria-label={`Joueur actif ${name}`}>
  <div className="mss-combat-active-main">
   <div className="mss-combat-active-identity">
    <span className="mss-combat-active-watermark" aria-hidden="true">{avatar?<img src={avatar} alt="" />:(name?.[0]||'J')}</span>
    <div className="mss-combat-active-avatar">{avatar?<img src={avatar} alt="" />:(name?.[0]||'J')}</div>
    <div className="mss-combat-active-copy"><small>JOUEUR ACTIF · {label}</small><strong>{name}</strong><span className="mss-combat-active-value">{value}</span>{detail&&<span className="mss-combat-active-detail">{detail}</span>}</div>
   </div>
   <div className="mss-combat-active-goal">
    <span className="mss-combat-goal-title">◎ OBJECTIF</span>
    <div className="mss-combat-goal-main"><small>{rightTitle}</small><strong>{rightValue}</strong></div>
    <p>{objective}</p>
    {rightDetail&&<div className="mss-combat-goal-detail">{rightDetail}</div>}
   </div>
  </div>
  {children&&<div className="mss-combat-active-footer">{children}</div>}
 </section>
}
