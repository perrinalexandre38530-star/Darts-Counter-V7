/**
 * File d'écriture ordonnée pour les checkpoints de modes de jeu.
 * N'ajoute aucune nouvelle source de vérité : History V4 reste l'unique stockage.
 * Une erreur sur le dernier état n'est pas masquée par une écriture antérieure.
 */
export type CheckpointWriteStatus = "idle" | "saving" | "saved" | "error";
export type CheckpointWriterCallbacks<T> = {
  onStatus?: (status: CheckpointWriteStatus) => void;
  onSaved?: (record: T) => void;
  onError?: (error: unknown) => void;
};

export function createMatchCheckpointWriter<T>(
  write: (record: T) => Promise<void>,
  callbacks: CheckpointWriterCallbacks<T> = {},
) {
  let tail: Promise<void> = Promise.resolve();
  let pending = 0;
  let latest: T | undefined;
  let latestSequence = 0;
  let failedLatest: unknown = null;
  let status: CheckpointWriteStatus = "idle";
  const setStatus = (next: CheckpointWriteStatus) => {
    if (status !== next) {
      status = next;
      try { callbacks.onStatus?.(status); } catch { /* UI observer must not break persistence */ }
    }
  };

  function enqueue(record: T): Promise<void> {
    latest = record;
    const sequence = ++latestSequence;
    pending += 1;
    failedLatest = null;
    setStatus("saving");
    // Les records sont immuables : aucune écriture ultérieure ne modifie ce snapshot.
    const task = tail.catch(() => undefined)
      .then(() => write(record))
      .then(() => {
        pending -= 1;
        if (sequence === latestSequence) {
          failedLatest = null;
          setStatus(pending ? "saving" : "saved");
        }
        try { callbacks.onSaved?.(record); } catch { /* persisted successfully despite UI callback failure */ }
      })
      .catch((error) => {
        pending -= 1;
        if (sequence === latestSequence) {
          failedLatest = error || new Error("Enregistrement impossible");
          setStatus(pending ? "saving" : "error");
        }
        try { callbacks.onError?.(error); } catch { /* preserve original write failure */ }
      });
    tail = task;
    return task;
  }

  async function drain(): Promise<boolean> {
    // En cas de nouvelles écritures, attendre leur dernier snapshot également.
    while (pending > 0) await tail;
    return failedLatest === null && status !== "error";
  }

  function retry(): Promise<void> | null {
    if (pending || failedLatest === null || latest === undefined) return null;
    return enqueue(latest);
  }

  return {
    enqueue, drain, retry,
    get status() { return status; },
    get isBusy() { return pending > 0; },
    get hasError() { return failedLatest !== null; },
  };
}
