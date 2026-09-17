import React from "react";
import NewDartsModePlayPlaceholder from "./newModes/NewDartsModePlayPlaceholder";
import tickerMenteur from "../assets/tickers/ticker_menteur.png";
export default function MenteurPlay(props: any) { return <NewDartsModePlayPlaceholder {...props} title="MENTEUR" ticker={tickerMenteur} accent="#ffbf37" configTab="menteur_config" />; }
