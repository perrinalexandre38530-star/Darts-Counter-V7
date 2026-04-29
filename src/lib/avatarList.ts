export function getAvatarList(lang: string) {
    const isFR = lang === "fr";
  
    return isFR
      ? Array.from({ length: 200 }, (_, i) => `/avatars/fr/${i + 1}.png`)
      : Array.from({ length: 200 }, (_, i) => `/avatars/en/${i + 1}.png`);
  }