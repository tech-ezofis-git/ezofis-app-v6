import { useEffect } from 'react'
import requestStore from '../stores/useRequestStore'
import requestApi from '@/api/requests/requests'
import { useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/base/icon/Icon'
import { motion, AnimatePresence } from 'framer-motion'

const POLLING_INTERVAL = 10000 // 10 seconds

export const ProcessingBackgroundManager = () => {
  const { processingProcesses, updateProcessingProcess, removeProcessingProcess, rawWorkflowData } = requestStore()
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
            itemsPerPage: 5,
            currentPage: 1,
            sortBy: { criteria: '', order: 'DESC' },
            filterBy: []
          }

          const findItemInResponse = (data: any) => {
            if (Array.isArray(data)) {
              for (const group of data) {
                if (group.items && Array.isArray(group.items)) {
                  const found = group.items.find((i: any) => String(i.processId) === String(processId))
                  if (found) return found
                }
                if (group.value && Array.isArray(group.value)) {
                  const found = group.value.find((i: any) => String(i.processId) === String(processId))
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
            updateProcessingProcess(processId, { stage, lastUpdated: new Date() })

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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl border border-[var(--gray-3)] shadow-2xl p-4 w-80 pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--primary-2)] text-[var(--primary-9)]">
                <Icon name="tabler:loader-2" className="size-5 animate-spin" />
              </div>
              <h3 className="font-bold text-sm text-[var(--gray-13)]">
                Processing {processingProcesses.length} {processingProcesses.length === 1 ? 'invoice' : 'invoices'}
              </h3>
            </div>
            <button 
              onClick={() => processingProcesses.forEach(p => removeProcessingProcess(p.processId || p.id))}
              className="text-[var(--gray-9)] hover:text-[var(--gray-12)] transition-colors"
            >
              <Icon name="tabler:x" className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
            {processingProcesses.map((p) => (
              <div key={p.processId || p.id} className="flex flex-col gap-1.5 p-2 rounded-xl bg-[var(--gray-1)] border border-[var(--gray-2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon name="tabler:file-text" className="size-4 text-[var(--gray-10)] shrink-0" />
                    <span className="text-xs font-semibold text-[var(--gray-12)] truncate">
                      {p.name || p.requestNo || 'New Request'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--primary-9)] bg-[var(--primary-1)] px-1.5 py-0.5 rounded-md animate-pulse">
                    {p.stage || 'Uploading...'}
                  </span>
                </div>
                
                {/* Mini Progress Bar */}
                <div className="h-1 w-full bg-[var(--gray-3)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--primary-9)]"
                    animate={{ 
                      width: p.stage === 'Start' ? '25%' : p.stage === 'AI Agent' ? '60%' : '90%' 
                    }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <p className="mt-4 text-[10px] text-[var(--gray-9)] text-center font-medium">
            AI is extracting data. We'll notify you when it's ready.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
