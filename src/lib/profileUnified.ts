
export type UnifiedProfile={
  id:string
  name:string
  avatarDataUrl?:string|null
}

export function normalizeProfile(raw:any):UnifiedProfile{
  const avatar =
    raw?.avatarDataUrl ||
    raw?.avatar_data_url ||
    raw?.avatar ||
    raw?.avatarUrl ||
    raw?.avatar_url ||
    null

  const name =
    raw?.name ||
    raw?.displayName ||
    raw?.display_name ||
    raw?.nickname ||
    raw?.username ||
    "Player"

  return {
    id:String(raw?.id || ""),
    name,
    avatarDataUrl:avatar
  }
}
