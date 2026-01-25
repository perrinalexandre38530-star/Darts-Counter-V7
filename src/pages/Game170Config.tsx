import React from "react";
import SimpleRoundsConfig from "./SimpleRoundsConfig";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type Game170ConfigPayload = CommonConfig;

export default function Game170Config(props: any) {
  return <SimpleRoundsConfig {...props} variantId="game_170" playTab="game_170_play" />;
}
