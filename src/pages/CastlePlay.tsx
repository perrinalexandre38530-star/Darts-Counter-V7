import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerCastle from "../assets/tickers/ticker_castle.png";
export default function CastlePlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="CASTLE" ticker={tickerCastle} accent="#ffb33f" configTab="castle_config" />; }
