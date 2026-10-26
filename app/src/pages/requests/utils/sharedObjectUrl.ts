// One object URL per file, shared by every screen that previews it.
//
// An uploaded file is previewed on the New Request screen and again on the
// request page that opens right after. With a separate URL on each screen, the
// second preview cannot reuse the first (a different URL means a different
// file to the viewer), so the email is downloaded and parsed twice. The URL is
// kept for the life of the page; it points at a file the user already chose.
const urls = new WeakMap<Blob, string>()

export const getSharedObjectUrl = (file: Blob): string => {
  const existing = urls.get(file)
  if (existing) return existing
  const url = URL.createObjectURL(file)
  urls.set(file, url)
  return url
}
