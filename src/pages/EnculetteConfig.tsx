import React from "react";
import SimpleRoundsConfig from "./SimpleRoundsConfig";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type EnculetteConfigPayload = CommonConfig;

export default function EnculetteConfig(props: any) {
  return <SimpleRoundsConfig {...props} variantId="enculette" playTab="enculette_play" />;
}
