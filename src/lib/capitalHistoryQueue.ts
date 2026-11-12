/** Écritures de checkpoints d'une même partie CAPITAL, dans l'ordre de soumission.
 * Une erreur d'un checkpoint ne doit pas empêcher la sauvegarde finale.
 * Aucun écrasement d'un résultat terminé par un enregistrement tardif.
 */
export function createCapitalHistoryWriteQueue<RecordType>(
  persist: (record: RecordType) => Promise<void>,
  onError: (error: unknown) => void = () => {},
): (record: RecordType) => Promise<void> {
  let tail: Promise<void> = Promise.resolve();
  return (record: RecordType): Promise<void> => {
    const operation = tail.then(() => persist(record));
    tail = operation.catch(onError);
    return operation;
  };
}
