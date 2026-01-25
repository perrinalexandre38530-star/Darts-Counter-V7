// TrainingShell — layout commun fidèle X01/Killer
import React from "react";
import TrainingHeader from "../ui/TrainingHeader";
import TrainingFooter from "../ui/TrainingFooter";

export default function TrainingShell({ header, body, footer }:{header:React.ReactNode; body:React.ReactNode; footer?:React.ReactNode}) {
  return (
    <div className="container">
      {header}
      <div style={{padding:12}}>{body}</div>
      {footer}
    </div>
  );
}
