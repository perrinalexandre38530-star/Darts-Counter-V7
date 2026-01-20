import React from "react";
import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";

export default function TourDeLHorlogeConfig() {
  return (
    <div className="page">
      <PageHeader title="TOURDELHORLOGE" left={<BackDot />} right={<InfoDot />} />
      <div className="content">
        <p>Configuration par défaut basée sur RoundTargetEngine.</p>
      </div>
    </div>
  );
}
