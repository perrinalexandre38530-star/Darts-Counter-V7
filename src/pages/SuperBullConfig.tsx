import React from "react";
import SimpleRoundsConfig from "./SimpleRoundsConfig";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type SuperBullConfigPayload = CommonConfig;

export default function SuperBullConfig(props: any) {
  return <SimpleRoundsConfig {...props} variantId="super_bull" playTab="super_bull_play" />;
}
