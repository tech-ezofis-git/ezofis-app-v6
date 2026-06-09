import { motion } from 'framer-motion'
import React, { useEffect, useMemo } from 'react'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '../stores/useRequestStore'
import { SkeletonGrid } from './SkeletonGrid' // Moved your skeleton code here
import { SummaryCard, type SummaryTheme } from './SummaryCard'

interface RequestSummaryProps {
  processId: number
  requestNo: string
  transactionId: number
  workflowId: number | string
}

const gridVariants = {
  hidden: {},
  show: { transition: { delayChildren: 0.05, staggerChildren: 0.08 } },
}

const RequestSummary: React.FC<RequestSummaryProps> = ({
  processId,
  requestNo,
  transactionId,
  workflowId,
}) => {
  const cacheSummaryData = requestStore((state) => state.cacheSummaryData)
  const { data: request, isLoading } = useRequestDetail(
    workflowId,
    processId,
    transactionId,
  )

  // 1. Data Normalization
  const agentData = useMemo(() => {
    if (!request) return null
    return Array.isArray(request?._agentData)
      ? request?._agentData[0]
      : request?._agentData
  }, [request])

  // 2. Cache Effect
  useEffect(() => {
    if (agentData) cacheSummaryData(requestNo, agentData)
  }, [agentData, requestNo, cacheSummaryData])

  // 3. Business Logic / View Model (Memoized to prevent recalc on every render)
  const summaryMetrics = useMemo(() => {
    if (!agentData) return null

    const score = Number(agentData?.score ?? 0)
    const decisionRaw = (agentData?.decision || 'PENDING') as string
    const lineItems = agentData?.['Extracted Invoice JSON']?.line_items || []
    const errorCount = agentData?.invoice_errors?.errors?.length || 0
    const isDuplicate = Boolean(agentData?.is_duplicate_invoice)

    // Score Logic
    const scorePct = Math.max(0, Math.min(100, Math.round(score)))
    const scoreTheme: SummaryTheme =
      scorePct > 80 ? 'green' : scorePct > 50 ? 'orange' : 'red'

    // Decision Logic
    const decisionMap: Record<
      string,
      { label: string; progress: number; theme: SummaryTheme }
    > = {
      'APPROVED': { label: 'APPROVED', progress: 100, theme: 'green' },
      'DEFAULT': { label: 'IN REVIEW', progress: 72, theme: 'blue' },
      'PARTIALLY_APPROVED': {
        label: 'PARTIALLY APPROVED',
        progress: 72,
        theme: 'blue',
      },
      'PARTIALLY APPROVED': {
        label: 'PARTIALLY APPROVED',
        progress: 72,
        theme: 'blue',
      },
      'REJECTED': { label: 'REJECTED', progress: 100, theme: 'red' },
    }
    const decision = decisionMap[decisionRaw] || decisionMap['DEFAULT']

    // Validation Logic
    const validationTheme: SummaryTheme =
      isDuplicate || errorCount > 0 ? 'orange' : 'green'
    const validationValue = isDuplicate
      ? 'Duplicate'
      : errorCount > 0
        ? `${errorCount} ${errorCount === 1 ? 'Error' : 'Errors'}`
        : 'Passed'

    return {
      decision: {
        pct: decision.progress,
        status:
          decision.label === 'APPROVED'
            ? 'Verified'
            : decision.label === 'REJECTED'
              ? 'Not Approved'
              : 'In review',
        theme: decision.theme,
        value: decision.label,
      },
      extraction: {
        pct: lineItems.length > 0 ? 100 : 48,
        status: lineItems.length > 0 ? 'Done' : 'Partial',
        theme: (lineItems.length > 0 ? 'green' : 'orange') as SummaryTheme,
        value: `${lineItems.length} Line Items`,
      },
      score: {
        pct: scorePct,
        status:
          scoreTheme === 'green'
            ? 'Strong'
            : scoreTheme === 'orange'
              ? 'Moderate'
              : 'Low',
        theme: scoreTheme,
        value: `${scorePct}%`,
      },
      validation: {
        helperIcon:
          isDuplicate || errorCount > 0
            ? 'tabler:info-circle'
            : 'tabler:circle-check',
        icon:
          isDuplicate || errorCount > 0
            ? 'tabler:alert-triangle'
            : 'tabler:file-check',
        pct: isDuplicate ? 58 : errorCount > 0 ? 68 : 100,
        status: isDuplicate
          ? 'Needs review'
          : errorCount > 0
            ? 'Fix required'
            : 'Healthy',
        subLabel: isDuplicate
          ? 'Manual check required'
          : errorCount > 0
            ? 'Action needed'
            : 'Record is valid',
        theme: validationTheme,
        value: validationValue,
      },
    }
  }, [agentData])

  if (isLoading) return <SkeletonGrid />
  if (!agentData || !summaryMetrics) return null

  return (
    <div className='flex flex-col gap-4'>
      <motion.div
        animate='show'
        className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
        initial='hidden'
        variants={gridVariants}
      >
        <SummaryCard
          icon='tabler:percentage'
          label='Confidence Score'
          progress={summaryMetrics.score.pct}
          status={summaryMetrics.score.status}
          subLabel='Extraction quality signal'
          theme={summaryMetrics.score.theme}
          value={summaryMetrics.score.value}
        />

        <SummaryCard
          icon='tabler:gavel'
          label='AI Decision'
          progress={summaryMetrics.decision.pct}
          status={summaryMetrics.decision.status}
          subLabel='Based on PO Matching + Rules'
          theme={summaryMetrics.decision.theme}
          value={summaryMetrics.decision.value}
        />

        <SummaryCard
          icon='tabler:table'
          label='Extracted Data'
          progress={summaryMetrics.extraction.pct}
          status={summaryMetrics.extraction.status}
          subLabel='Invoice line items detected'
          theme={summaryMetrics.extraction.theme}
          value={summaryMetrics.extraction.value}
        />

        <SummaryCard
          helperIcon={summaryMetrics.validation.helperIcon}
          icon={summaryMetrics.validation.icon}
          label='Validation'
          progress={summaryMetrics.validation.pct}
          status={summaryMetrics.validation.status}
          subLabel={summaryMetrics.validation.subLabel}
          theme={summaryMetrics.validation.theme}
          value={summaryMetrics.validation.value}
        />
      </motion.div>
    </div>
  )
}

export default RequestSummary
