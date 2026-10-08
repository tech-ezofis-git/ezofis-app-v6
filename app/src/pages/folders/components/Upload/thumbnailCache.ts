const thumbnailCache = new Map<string, string>()

export const getCachedThumbnail = (key: string) =>
  thumbnailCache.get(key) ?? null

export const setCachedThumbnail = (key: string, url: string) => {
  const previous = thumbnailCache.get(key)
  if (previous && previous !== url && previous.startsWith('blob:')) {
    URL.revokeObjectURL(previous)
  }
  thumbnailCache.set(key, url)
}
