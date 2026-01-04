import { pushSnapshot } from "./onlineApi";

let timer: any = null;

export function scheduleSnapshotSave() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pushSnapshot();
  }, 1500);
}