/* @ts-nocheck
 * Registre des modes Défis
 * (Ajout Étape 4: baseball, football, rugby, capital)
 */
import count_up from "./count_up";
import halve_it from "./halve_it";
import bobs27 from "./bobs27";
import knockout from "./knockout";
import shooter from "./shooter";

import baseball from "./baseball";
import football from "./football";
import rugby from "./rugby";
import capital from "./capital";

export const DefiModes: any = {
  count_up,
  halve_it,
  bobs27,
  knockout,
  shooter,
  baseball,
  football,
  rugby,
  capital,
};

export type DefiModeId = keyof typeof DefiModes;
