
export function createBackupManifest(blocks:any){
  const list = Object.entries(blocks).map(([id,data])=>{
    const json = JSON.stringify(data||{});
    return {
      id,
      size: json.length,
      updatedAt: Date.now()
    }
  });

  return {
    backupId: crypto.randomUUID(),
    createdAt: Date.now(),
    schemaVersion: 2,
    blocks:list
  };
}
