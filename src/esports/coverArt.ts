import type { EsportsGameDefinition } from "./types";

// Real box/key art served by Twitch's public category-art CDN. The aliases keep
// generic MSS catalog entries (EA SPORTS FC / Call of Duty) pointed at a
// current concrete title while retaining the generic scoring definition.
const TWITCH_BOX_ART_NAMES: Record<string, string[]> = {
  "rocket-league": ["Rocket League"],
  "valorant": ["VALORANT"],
  "counter-strike-2": ["Counter-Strike 2"],
  "league-of-legends": ["League of Legends"],
  "fortnite": ["Fortnite"],
  "ea-sports-fc": ["EA Sports FC 26", "EA Sports FC 25"],
  "call-of-duty": ["Call of Duty: Black Ops 7", "Call of Duty: Warzone"],
  "overwatch-2": ["Overwatch 2"],
  "rainbow-six-siege": ["Tom Clancy's Rainbow Six Siege"],
  "apex-legends": ["Apex Legends"],
  "pubg": ["PUBG: BATTLEGROUNDS"],
  "dota-2": ["Dota 2"],
  "street-fighter-6": ["Street Fighter 6"],
  "tekken-8": ["Tekken 8"],
  "super-smash-bros-ultimate": ["Super Smash Bros. Ultimate"],
  "mario-kart-8-deluxe": ["Mario Kart 8 Deluxe"],
  "gran-turismo-7": ["Gran Turismo 7"],
  "iracing": ["iRacing"],
  "teamfight-tactics": ["Teamfight Tactics"],
  "hearthstone": ["Hearthstone"],
  "brawl-stars": ["Brawl Stars"],
  "clash-royale": ["Clash Royale"],
  "mobile-legends": ["Mobile Legends: Bang Bang"],
  "pokemon-unite": ["Pokémon UNITE", "Pokemon UNITE"],
  "age-of-empires-iv": ["Age of Empires IV"],
  "starcraft-2": ["StarCraft II"],
  "fall-guys": ["Fall Guys"],
};

// Secondary real-art fallbacks for categories that occasionally change their
// Twitch naming. These are only used if the main box-art CDN request fails.
const FALLBACK_ART: Partial<Record<string, string[]>> = {
  "league-of-legends": [
    "https://eu-images.contentstack.com/v3/assets/blt740a130ae3c5d529/bltabc27118475fef24/650f04f9b87c62fde5092c5b/League_of_Legends.png?auto=webp&disable=upscale&format=jpg&quality=80&width=960",
  ],
  "fortnite": [
    "https://ogre.natalie.mu/media/news/music/2020/0731/Fortnite_keyart.jpg?imdensity=1&imwidth=750",
  ],
  "ea-sports-fc": [
    "https://cdn.awsli.com.br/600x450/2430/2430819/produto/306018610/brazil-xbox-c2c-ea-sports-fc-26-standard-ed--ddp-brl-349-vjbotj6dzp.jpg",
  ],
  "call-of-duty": [
    "https://s.pacn.ws/1/p/yx/call-of-duty-modern-warfare-628629.11.jpg?v=san2tz",
  ],
  "overwatch-2": [
    "https://generation-nintendo.com/images/jeux/3004/jaquette.jpg",
  ],
  "rainbow-six-siege": [
    "https://cdn-products.eneba.com/resized-products/LChS9aAfS9_ixwy4CaHvij2i-Lzcs-DQeY2uuGjsMv4_350x200_2x-0.jpg",
  ],
  "street-fighter-6": [
    "https://gamescorner.bh/cdn/shop/files/26279_1.jpg?v=1686385665",
  ],
  "mario-kart-8-deluxe": [
    "https://level-up.gg/cdn/shop/products/mario-kart-8-deluxe-for-nintendo-switch-285159.jpg?v=1701334684&width=1214",
  ],
};

function twitchBoxArt(name: string): string {
  return `https://static-cdn.jtvnw.net/ttv-boxart/${encodeURIComponent(name)}-600x800.jpg`;
}

export function getEsportsCoverCandidates(game: Pick<EsportsGameDefinition, "id" | "name">): string[] {
  const names = TWITCH_BOX_ART_NAMES[game.id] || [game.name];
  return [...names.map(twitchBoxArt), ...(FALLBACK_ART[game.id] || [])];
}

export function hasRealEsportsCover(gameId: string): boolean {
  return Boolean(TWITCH_BOX_ART_NAMES[gameId]?.length);
}

export const ESPORTS_COVER_GAME_IDS = Object.freeze(Object.keys(TWITCH_BOX_ART_NAMES));
