import { BatardConfig } from "./batardTypes";

export const classicPreset: BatardConfig = {
  winMode: "SCORE_MAX",
  failPolicy: "NONE",
  failValue: 0,
  rounds: [
    { id: "1", label: "Simple 20", target: 20, multiplierRule: "SINGLE" },
    { id: "2", label: "Double 20", target: 20, multiplierRule: "DOUBLE" },
    { id: "3", label: "Triple 20", target: 20, multiplierRule: "TRIPLE" },
    { id: "4", label: "Bull", bullOnly: true, multiplierRule: "ANY" },
    { id: "5", label: "Score Max", multiplierRule: "ANY" }
  ]
};

export const progressifPreset: BatardConfig = {
  winMode: "RACE_TO_FINISH",
  failPolicy: "FREEZE",
  failValue: 0,
  rounds: Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    label: `Hit ${i + 1}`,
    target: i + 1,
    multiplierRule: "ANY"
  }))
};
