import React, { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRequestDetail } from '@/pages/requests/hooks/useRequestDetails'
import requestStore from '../stores/useRequestStore'
import { SummaryCard, type SummaryTheme } from './SummaryCard'
import { SkeletonGrid } from './SkeletonGrid' // Moved your skeleton code here

interface RequestSummaryProps {
    workflowId: number
    processId: number
    transactionId: number
    requestNo: string
}

const gridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
}

const RequestSummary: React.FC<RequestSummaryProps> = ({
    workflowId,
    processId,
    transactionId,
    requestNo
}) => {
    const cacheSummaryData = requestStore((state) => state.cacheSummaryData)
    const { data: request, isLoading } = useRequestDetail(workflowId, processId, transactionId)

    // 1. Data Normalization
    const agentData = useMemo(() => {
        if (!request) return null
        return Array.isArray(request?._agentData) ? request?._agentData[0] : request?._agentData
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
        const scoreTheme: SummaryTheme = scorePct > 80 ? 'green' : scorePct > 50 ? 'orange' : 'red'

        // Decision Logic
        const decisionMap: Record<string, { label: string, theme: SummaryTheme, progress: number }> = {
            'APPROVED': { label: 'APPROVED', theme: 'green', progress: 100 },
            'REJECTED': { label: 'REJECTED', theme: 'red', progress: 100 },
            'PARTIALLY_APPROVED': { label: 'PARTIALLY APPROVED', theme: 'blue', progress: 72 },
            'PARTIALLY APPROVED': { label: 'PARTIALLY APPROVED', theme: 'blue', progress: 72 },
            'DEFAULT': { label: 'IN REVIEW', theme: 'blue', progress: 72 }
        }
        const decision = decisionMap[decisionRaw] || decisionMap['DEFAULT']

        // Validation Logic
        const validationTheme: SummaryTheme = isDuplicate || errorCount > 0 ? 'orange' : 'green'
        const validationValue = isDuplicate
            ? 'Duplicate'
            : errorCount > 0
                ? `${errorCount} ${errorCount === 1 ? 'Error' : 'Errors'}`
                : 'Passed'

        return {
            score: {
                value: `${scorePct}%`,
                theme: scoreTheme,
                pct: scorePct,
                status: scoreTheme === 'green' ? 'Strong' : scoreTheme === 'orange' ? 'Moderate' : 'Low'
            },
            decision: {
                value: decision.label,
                theme: decision.theme,
                pct: decision.progress,
                status: decision.label === 'APPROVED' ? 'Verified' : decision.label === 'REJECTED' ? 'Not Approved' : 'In review'
            },
            extraction: {
                value: lineItems.length,
                theme: (lineItems.length > 0 ? 'green' : 'orange') as SummaryTheme,
                pct: lineItems.length > 0 ? 100 : 48,
                status: lineItems.length > 0 ? 'Done' : 'Partial'
            },
            validation: {
                value: validationValue,
                theme: validationTheme,
                pct: isDuplicate ? 58 : errorCount > 0 ? 68 : 100,
                status: isDuplicate ? 'Needs review' : errorCount > 0 ? 'Fix required' : 'Healthy',
                subLabel: isDuplicate ? 'Manual check required' : errorCount > 0 ? 'Action needed' : 'Record is valid',
                icon: isDuplicate || errorCount > 0 ? 'tabler:alert-triangle' : 'tabler:file-check',
                helperIcon: isDuplicate || errorCount > 0 ? 'tabler:info-circle' : 'tabler:circle-check'
            }
        }
    }, [agentData])

    if (isLoading) return <SkeletonGrid />
    if (!agentData || !summaryMetrics) return null

    return (
        <div className="flex flex-col gap-4">
            <motion.div
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <SummaryCard
                    label="Confidence Score"
                    subLabel="Extraction quality signal"
                    icon="tabler:percentage"
                    value={summaryMetrics.score.value}
                    theme={summaryMetrics.score.theme}
                    progress={summaryMetrics.score.pct}
                    status={summaryMetrics.score.status}
                />

                <SummaryCard
                    label="AI Decision"
                    subLabel="Policy + anomaly checks"
                    icon="tabler:gavel"
                    value={summaryMetrics.decision.value}
                    theme={summaryMetrics.decision.theme}
                    progress={summaryMetrics.decision.pct}
                    status={summaryMetrics.decision.status}
                />

                <SummaryCard
                    label="Extracted Data"
                    subLabel="Invoice line items detected"
                    icon="tabler:table"
                    value={summaryMetrics.extraction.value}
                    theme={summaryMetrics.extraction.theme}
                    progress={summaryMetrics.extraction.pct}
                    status={summaryMetrics.extraction.status}
                />

                <SummaryCard
                    label="Validation"
                    value={summaryMetrics.validation.value}
                    subLabel={summaryMetrics.validation.subLabel}
                    icon={summaryMetrics.validation.icon}
                    theme={summaryMetrics.validation.theme}
                    progress={summaryMetrics.validation.pct}
                    status={summaryMetrics.validation.status}
                    helperIcon={summaryMetrics.validation.helperIcon}
                />
            </motion.div>
        </div>
    )
}

export default RequestSummary