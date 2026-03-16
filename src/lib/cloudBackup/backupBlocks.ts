
import { History } from "../history";
import { loadStore } from "../storage";
import { getAllDartSets } from "../dartSetsStore";

export async function buildBackupBlocks() {
  const store = await loadStore();
  const history = await History.getAll();
  const dartSets = await getAllDartSets();

  return {
    profiles: store?.profiles || [],
    bots: store?.bots || [],
    settings: store?.settings || {},
    stats: store?.stats || {},
    history,
    dartSets
  };
}
