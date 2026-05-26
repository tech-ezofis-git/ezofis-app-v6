import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import requestApi from '@/api/requests/requests'
import Icon from '@/components/base/icon/Icon'
import requestStore from '../stores/useRequestStore'

const POLLING_INTERVAL = 10000 // 10 seconds

export const ProcessingBackgroundManager = () => {
  const {
    processingProcesses,
    rawWorkflowData,
    removeProcessingProcess,
    updateProcessingProcess,
  } = requestStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (processingProcesses.length === 0) return

    const pollers = processingProcesses.map((process) => {
      const processId = process.processId || process.id
      const workflowId = process.workflowId || rawWorkflowData?.id

      if (!processId || !workflowId) return null

      const poll = async () => {
        try {
          const payload = {
            currentPage: 1,
            filterBy: [],
            itemsPerPage: 5,
            sortBy: { criteria: '', order: 'DESC' },
          }

          const findItemInResponse = (data: any) => {
            if (Array.isArray(data)) {
              for (const group of data) {
                if (group.items && Array.isArray(group.items)) {
                  const found = group.items.find(
                    (i: any) => String(i.processId) === String(processId),
                  )
                  if (found) return found
                }
                if (group.value && Array.isArray(group.value)) {
                  const found = group.value.find(
                    (i: any) => String(i.processId) === String(processId),
                  )
                  if (found) return found
                }
              }
            } else if (data?.data && Array.isArray(data.data)) {
              return data.data[0]
            }
            return null
          }

          // Check Sent List
          let response = await requestApi.getSentListById(workflowId, payload)
          let item = response?.data ? findItemInResponse(response.data) : null

          // Fallback to Inbox List
          if (!item) {
            response = await requestApi.getInboxListById(workflowId, payload)
            item = response?.data ? findItemInResponse(response.data) : null
          }

          if (item) {
            const stage = item.stage || item.activityName || 'Start'
            updateProcessingProcess(processId, {
              lastUpdated: new Date(),
              stage,
            })

            // If finished, remove from background tracker and refresh list
            if (['Verifier', 'Approved', 'Completed'].includes(stage)) {
              removeProcessingProcess(processId)
              queryClient.invalidateQueries({ queryKey: ['inbox'] })
            }
          }
        } catch (error) {
          console.error('Polling error for process', processId, error)
        }
      }

      // Initial poll
      poll()

      const intervalId = setInterval(poll, POLLING_INTERVAL)
      return { id: processId, intervalId }
    })

    return () => {
      pollers.forEach((p) => p && clearInterval(p.intervalId))
    }
  }, [processingProcesses.length, rawWorkflowData?.id])

  if (processingProcesses.length === 0) return null

  return (
    <div className='pointer-events-none fixed right-6 bottom-6 z-[999999] flex flex-col gap-3'>
      <AnimatePresence>
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className='pointer-events-auto w-80 rounded-2xl border border-[var(--gray-3)] bg-surface p-4 shadow-2xl'
          exit={{ opacity: 0, scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className='mb-4 flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-[var(--primary-2)] p-1.5 text-[var(--primary-9)]'>
                <Icon className='size-5 animate-spin' name='tabler:loader-2' />
              </div>
              <h3 className='text-sm font-bold text-[var(--gray-13)]'>
                Processing {processingProcesses.length}{' '}
                {processingProcesses.length === 1 ? 'invoice' : 'invoices'}
              </h3>
            </div>
            <button
              className='text-[var(--gray-9)] transition-colors hover:text-[var(--gray-12)]'
              onClick={() =>
                processingProcesses.forEach((p) =>
                  removeProcessingProcess(p.processId || p.id),
                )
              }
            >
              <Icon className='size-4' name='tabler:x' />
            </button>
          </div>

          <div className='flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-2'>
            {processingProcesses.map((p) => (
              <div
                className='flex flex-col gap-1.5 rounded-xl border border-[var(--gray-2)] bg-[var(--gray-1)] p-2'
                key={p.processId || p.id}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <Icon
                      className='size-4 shrink-0 text-[var(--gray-10)]'
                      name='tabler:file-text'
                    />
                    <span className='truncate text-xs font-semibold text-[var(--gray-12)]'>
                      {p.name || p.requestNo || 'New Request'}
                    </span>
                  </div>
                  <span className='animate-pulse rounded-md bg-[var(--primary-1)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary-9)]'>
                    {p.stage || 'Uploading...'}
                  </span>
                </div>

                {/* Mini Progress Bar */}
                <div className='h-1 w-full overflow-hidden rounded-full bg-[var(--gray-3)]'>
                  <motion.div
                    className='h-full bg-[var(--primary-9)]'
                    transition={{ duration: 1 }}
                    animate={{
                      width:
                        p.stage === 'Start'
                          ? '25%'
                          : p.stage === 'AI Agent'
                            ? '60%'
                            : '90%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className='mt-4 text-center text-[10px] font-medium text-[var(--gray-9)]'>
            AI is extracting data. We'll notify you when it's ready.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
