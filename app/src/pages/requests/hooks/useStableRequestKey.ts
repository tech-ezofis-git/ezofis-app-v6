import { useRef } from 'react'

/**
 * A key for "which request is open" that stays the same while it is still the
 * same request. A request often gains ids after it is created (processId,
 * transactionId, itemId arrive once the agent finishes); a key built from
 * whichever ids are present would change then and remount / reload views such
 * as the document preview. Here the key only changes when none of the new
 * ids match an id already seen for the current request.
 */
export const useStableRequestKey = (ids: unknown[]): string => {
  const ref = useRef<{ ids: Set<string>; key: string } | null>(null)
  const present = ids
    .map((id) => String(id ?? '').trim())
    .filter((id) => id && id !== 'undefined' && id !== 'null')

  const current = ref.current
  if (current && present.some((id) => current.ids.has(id))) {
    present.forEach((id) => current.ids.add(id))
    return current.key
  }
  const key = present[0] || ''
  ref.current = key ? { ids: new Set(present), key } : null
  return key
}
