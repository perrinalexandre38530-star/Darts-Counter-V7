export async function hydrateFromOnlineAccount(userId: string) {
    console.log("[hydrate] start for user", userId);
  
    // 1️⃣ charger données online
    const online = await onlineApi.getFullAccountSnapshot(userId);
    if (!online) return;
  
    const {
      profiles,
      activeProfileId,
      dartSets,
      history,
      stats,
    } = online;
  
    // 2️⃣ merger avec local (anti wipe)
    const local = loadStore();
    const mergedProfiles = mergeProfilesSafe(
      local.profiles ?? [],
      profiles ?? []
    );
  
    // 3️⃣ snapshot FINAL
    const nextStore = {
      ...local,
      profiles: mergedProfiles,
      activeProfileId: activeProfileId ?? local.activeProfileId,
      dartSets: dartSets ?? local.dartSets,
    };
  
    // 4️⃣ persistance locale
    saveStore(nextStore);
    writeProfilesCache(mergedProfiles);
  
    // 5️⃣ history / stats
    if (history) History.import(history);
    if (stats) StatsLiteIDB.import(stats);
  
    console.log("[hydrate] done", {
      profiles: mergedProfiles.length,
    });
  
    return nextStore;
  }
  