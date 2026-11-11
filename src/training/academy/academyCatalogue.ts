import { MSS_ACADEMY_LESSONS } from "./academyLessons";
import { MSS_ACADEMY_MORE_LESSONS } from "./academyMoreLessons";

/** Extend the V166 catalogue without changing a single existing lesson ID or stored result. */
export const MSS_ACADEMY_CATALOGUE = [...MSS_ACADEMY_LESSONS, ...MSS_ACADEMY_MORE_LESSONS];
