
import React, { useEffect, useState } from "react";
import { buildDiagnostic } from "../lib/diagnosticPro";

export default function MonitoringPanel() {
  const [diag, setDiag] = useState<any>(null);

  useEffect(() => {
    const i = setInterval(() => {
      setDiag(buildDiagnostic());
    }, 2000);
    return () => clearInterval(i);
  }, []);

  if (!diag) return null;

  return (
    <div style={{position:"fixed",bottom:10,right:10,background:"#111",color:"#0f0",padding:10,fontSize:12,zIndex:9999}}>
      <div>RAM: {diag.memory.usedMB}/{diag.memory.limitMB} MB</div>
      <div>Store: {diag.storeKB} KB</div>
    </div>
  );
}
