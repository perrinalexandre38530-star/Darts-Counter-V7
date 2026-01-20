import React from "react";
import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";

export default function TourDeLHorlogePlay() {
  return (
    <div className="page">
      <PageHeader title="TOURDELHORLOGE" left={<BackDot />} />
      <div className="content">
        <p>Mode TourDeLHorloge — moteur RoundTarget branché.</p>
      </div>
    </div>
  );
}
