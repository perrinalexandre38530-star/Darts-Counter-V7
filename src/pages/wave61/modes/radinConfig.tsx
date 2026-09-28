import React from "react";
import Wave61SharedConfig, { type Wave61DedicatedOption } from "../../Wave61SharedConfig";

export const WAVE61_MODE_ID = "radin" as const;

const DEDICATED_OPTIONS: Wave61DedicatedOption[] = [
  { key: "startWallet", label: "Caisse de départ", type: "select", defaultValue: 100, options: [{ value: 60, label: "60" }, { value: 100, label: "100 · Standard" }, { value: 150, label: "150" }] },
  { key: "targetWallet", label: "Caisse pour gagner", type: "select", defaultValue: 250, options: [{ value: 200, label: "200 · Rapide" }, { value: 250, label: "250 · Standard" }, { value: 350, label: "350 · Long" }] },
  { key: "missFee", label: "Coût d'un MISS", type: "select", defaultValue: 12, options: [{ value: 6, label: "6 · Doux" }, { value: 12, label: "12 · Standard" }, { value: 20, label: "20 · Radin extrême" }] },
  { key: "bullRebate", label: "Coupon BULL", type: "select", defaultValue: 25, options: [{ value: 15, label: "15" }, { value: 25, label: "25 · Standard" }, { value: 40, label: "40" }] },
];

const DEDICATED_INTRO = "Chaque fléchette coûte quelque chose. Les bonnes zones rapportent davantage qu'elles ne coûtent, les MISS font très mal au portefeuille et les BULLS offrent des coupons.";

export default function DedicatedWave61Config(props: any) {
  return <Wave61SharedConfig {...props} forcedModeId={WAVE61_MODE_ID} dedicatedOptions={DEDICATED_OPTIONS} dedicatedIntro={DEDICATED_INTRO} />;
}
