import React from "react";
import SimpleRoundsConfig from "./SimpleRoundsConfig";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type CountUpConfigPayload = CommonConfig;

export default function CountUpConfig(props: any) {
  return <SimpleRoundsConfig {...props} variantId="count_up" playTab="count_up_play" />;
}
