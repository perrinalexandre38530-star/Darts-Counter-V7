/** Attend le commit effectif History V4 avant de déclarer une partie enregistrée.
 * Conserve une seule écriture en vol par match, permet un nouveau test après échec.
 * Cette porte ne modifie elle-même ni History ni le stockage local. */
export function createConfirmedHistorySaveGate() {
  const committed = new Set<string>();
  const pending = new Map<string, Promise<boolean>>();
  return {
    isSaved(matchId: string): boolean { return committed.has(String(matchId || "").trim()); },
    save(matchId: string, commit: () => boolean | void | Promise<boolean | void>): Promise<boolean> {
      const id = String(matchId || "").trim();
      if (!id) return Promise.resolve(false);
      if (committed.has(id)) return Promise.resolve(true);
      const inFlight = pending.get(id);
      if (inFlight) return inFlight;
      const operation = Promise.resolve().then(commit).then(result => {
        const confirmed = result === true;
        if (confirmed) committed.add(id);
        return confirmed;
      }).catch(error => {
        console.warn("[History V4] Enregistrement non confirmé", error);
        return false;
      }).finally(() => { pending.delete(id); });
      pending.set(id, operation);
      return operation;
    },
  };
}
