import Wave61SharedConfig from "../../Wave61SharedConfig";

export default function UnePtiteRacletteConfig() {
  return (
    <Wave61SharedConfig
      modeId="une_ptite_raclette"
      introTitle="UNE P'TITE RACLETTE ?"
      introBody="Un mode fun et gourmand : tu transformes tes fléchettes en portions de fromage, pommes de terre et charcuterie. Chaque recette complète sert une raclette et le premier à atteindre l'objectif remporte la soirée."
      optionGroups={[
        {
          title: "SERVICE & RECETTE",
          options: [
            {
              key: "recipeCheese",
              label: "Fromage nécessaire",
              type: "segmented",
              defaultValue: 6,
              choices: [
                { label: "4", value: 4 },
                { label: "6", value: 6 },
                { label: "8", value: 8 },
              ],
            },
            {
              key: "recipePotato",
              label: "Pommes de terre nécessaires",
              type: "segmented",
              defaultValue: 3,
              choices: [
                { label: "2", value: 2 },
                { label: "3", value: 3 },
                { label: "4", value: 4 },
              ],
            },
            {
              key: "recipeCharcuterie",
              label: "Charcuterie nécessaire",
              type: "segmented",
              defaultValue: 3,
              choices: [
                { label: "2", value: 2 },
                { label: "3", value: 3 },
                { label: "4", value: 4 },
              ],
            },
          ],
        },
        {
          title: "BONUS",
          options: [
            {
              key: "racletteBonus",
              label: "Bonus par raclette servie",
              type: "segmented",
              defaultValue: 100,
              choices: [
                { label: "+50", value: 50 },
                { label: "+100", value: 100 },
                { label: "+150", value: 150 },
              ],
            },
            {
              key: "visitVarietyBonus",
              label: "Bonus “plateau complet”",
              type: "segmented",
              defaultValue: 15,
              choices: [
                { label: "OFF", value: 0 },
                { label: "+10", value: 10 },
                { label: "+15", value: 15 },
                { label: "+25", value: 25 },
              ],
            },
          ],
        },
        {
          title: "AMBIANCE",
          options: [
            {
              key: "missPenalty",
              label: "Pénalité “raclette refroidie”",
              type: "segmented",
              defaultValue: 5,
              choices: [
                { label: "0", value: 0 },
                { label: "5", value: 5 },
                { label: "10", value: 10 },
                { label: "20", value: 20 },
              ],
            },
          ],
        },
      ]}
      tips={[
        "1 · 4 · 7 · 10 · 13 · 16 · 19 = FROMAGE",
        "2 · 5 · 8 · 11 · 14 · 17 · 20 = POMMES DE TERRE",
        "3 · 6 · 9 · 12 · 15 · 18 = CHARCUTERIE",
        "BULL 25 / 50 réchauffe tout le poêlon et ajoute des portions à chaque ingrédient.",
      ]}
    />
  );
}
