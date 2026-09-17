import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerHareHounds from "../assets/tickers/ticker_hare_hounds.png";
export default function HareHoundsPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="HARE & HOUNDS" ticker={tickerHareHounds} accent="#f6b63b" configTab="hare_hounds_config" />; }
