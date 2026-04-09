import { pushStoreToNas } from "./nasAutoSync";

let started = false;
let timer: number | null = null;

export function startNasBackgroundSync(): void {
  if (started) return;
  started = true;

  window.setTimeout(() => {
    pushStoreToNas().catch(() => {});
  }, 4000);

  timer = window.setInterval(() => {
    pushStoreToNas().catch(() => {});
  }, 60000);
}

export function stopNasBackgroundSync(): void {
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
  started = false;
}
