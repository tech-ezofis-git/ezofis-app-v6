export interface EntryBatchResult<T> {
  failed: { item: T; result: { error?: string; inUse?: boolean } }[]
  succeeded: T[]
}

/**
 * Runs one API call per entry, a few at a time (there is no bulk endpoint),
 * and splits the entries into the ones that worked and the ones that failed.
 */
export const runEntryBatch = async <T>(
  items: T[],
  task: (item: T) => Promise<{ error?: string; inUse?: boolean }>,
  batchSize = 5,
): Promise<EntryBatchResult<T>> => {
  const result: EntryBatchResult<T> = { failed: [], succeeded: [] }
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize)
    const outcomes = await Promise.all(
      batch.map((item) =>
        task(item).catch((e: unknown) => ({
          error: e instanceof Error ? e.message : String(e),
        })),
      ),
    )
    outcomes.forEach((outcome, index) => {
      if (outcome?.error)
        result.failed.push({ item: batch[index], result: outcome })
      else result.succeeded.push(batch[index])
    })
  }
  return result
}
