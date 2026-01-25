import React from "react";
import SimpleRoundsConfig from "./SimpleRoundsConfig";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type HappyMilleConfigPayload = CommonConfig;

export default function HappyMilleConfig(props: any) {
  return <SimpleRoundsConfig {...props} variantId="happy_mille" playTab="happy_mille_play" />;
}
