import { useEffect, useRef } from 'react'
import type { BulkUploadJobStatus } from '@/api/v6/uploadAndIndex'
import { getBulkUploadJobStatus } from '@/api/v6/uploadAndIndex'

const POLL_INTERVAL_MS = 2500

/**
 * Polls GET /uploadAndIndex/bulkUpload/jobs/{jobId} for every distinct
 * jobId in `jobIds`, one interval per job, mirroring
 * ProcessingBackgroundManager's poll-then-setInterval-then-clear-on-terminal
 * shape. Stops polling a job once isTerminal && ocrPending === 0.
 */
export function useBulkUploadJobPolling(
  jobIds: string[],
  onUpdate: (jobId: string, status: BulkUploadJobStatus) => void,
) {
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  )
  const terminalJobIdsRef = useRef<Set<string>>(new Set())
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const timers = timersRef.current
    const activeIds = new Set(jobIds)

    // Stop polling jobs that are no longer relevant (removed from the queue).
    timers.forEach((timerId, jobId) => {
      if (!activeIds.has(jobId)) {
        clearInterval(timerId)
        timers.delete(jobId)
      }
    })

    activeIds.forEach((jobId) => {
      if (timers.has(jobId) || terminalJobIdsRef.current.has(jobId)) return

      const poll = async () => {
        const { data, error } = await getBulkUploadJobStatus(jobId)
        if (error || !data) return

        onUpdateRef.current(jobId, data)

        if (data.isTerminal && data.ocrPending === 0) {
          terminalJobIdsRef.current.add(jobId)
          const timerId = timers.get(jobId)
          if (timerId) {
            clearInterval(timerId)
            timers.delete(jobId)
          }
        }
      }

      void poll()
      const timerId = setInterval(poll, POLL_INTERVAL_MS)
      timers.set(jobId, timerId)
    })
  }, [jobIds])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timerId) => clearInterval(timerId))
      timers.clear()
    }
  }, [])
}
