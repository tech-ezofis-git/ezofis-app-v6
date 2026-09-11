import { useLingui } from '@lingui/react/macro'
import { Check, RefreshCw } from 'lucide-react'
import { motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'
import {
  type DashboardChart,
  type DashboardKpi,
  type DashboardPromptResult,
  type DashboardSchemaResult,
  getDashboardHtml,
  getDashboardSchema,
  getSavedDashboardSchema,
  loadSavedRepositoryDashboard,
  saveDashboardSchema,
  suggestDashboardPrompt,
} from '@/api/v6/dashboard'
import Button from '@/components/base/button/Button'
import Skeleton from '@/components/base/Skeleton'
import SkeletonCard from '@/components/common/skeletons/SkeletonCard'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import DashboardHtmlPreview from '@/pages/dashboard/components/DashboardHtmlPreview'
import {
  BuilderTimelineStep,
  type TimelineConnectorState,
  type TimelineStepStatus,
} from '@/pages/settings/components/Folders/AiFolderBuilderTimeline'
import { generateRepositoryDescription } from '@/services/ai/dashboardAi'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

interface Props {
  onSavedHtmlHeaderChange?: (actions: SavedHtmlHeaderActions | null) => void
  repositoryId: string
  repositoryName: string
  workflowId?: string
}

export type SavedHtmlHeaderActions = {
  isRefreshing: boolean
  onEdit: () => void
  onRefresh: () => void
}

export default function DashboardApiBuilder({
  onSavedHtmlHeaderChange,
  repositoryId,
  repositoryName,
  workflowId = '',
}: Props) {
  const { t } = useLingui()

  const [activeStep, setActiveStep] = useState(1)
  const [sessionId, setSessionId] = useState('')
  const [resolvedWorkflowId, setResolvedWorkflowId] = useState(workflowId)
  const [schema, setSchema] = useState<DashboardSchemaResult | null>(null)
  const [editableDesc, setEditableDesc] = useState('')
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [isLoadingSaved, setIsLoadingSaved] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFullDashboardView, setIsFullDashboardView] = useState(false)
  const [html, setHtml] = useState('')

  const tenantId = authUserStore.getState().session?.tenantId || ''
  const activeWorkflowId = resolvedWorkflowId || workflowId || ''

  const applyPromptResult = (result: DashboardPromptResult) => {
    if (result.session_id) setSessionId(result.session_id)
    if (result.workflow_id) setResolvedWorkflowId(result.workflow_id)
    setEditableDesc(result.prompt)
  }

  const generatePrompt = async () => {
    setIsGeneratingDesc(true)
    try {
      const currentTenantId =
        authUserStore.getState().session?.tenantId || tenantId
      const promptRes = await suggestDashboardPrompt({
        repositoryId,
        sessionId,
        tenantId: currentTenantId,
        workflowId: activeWorkflowId,
      })
      if (promptRes.data?.prompt) {
        applyPromptResult(promptRes.data)
        return
      }
      if (promptRes.error) {
        console.warn('Dashboard prompt API failed:', promptRes.error)
      }
      const desc = await generateRepositoryDescription(repositoryName)
      setEditableDesc(desc)
    } catch (err) {
      console.error('Error auto-generating dashboard prompt:', err)
      setEditableDesc(`I need to create a dashboard for ${repositoryName}`)
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  const runSchema = async (promptText: string) => {
    const message = promptText.trim()
    if (!tenantId) {
      showToast({
        message: t`Tenant is missing. Sign in again and retry.`,
        variant: 'error',
      })
      return
    }
    if (!repositoryId && !activeWorkflowId) {
      showToast({
        message: t`Select a repository first.`,
        variant: 'error',
      })
      return
    }
    if (!message) {
      showToast({
        message: t`Enter a dashboard prompt before continuing.`,
        variant: 'error',
      })
      return
    }

    const nextSessionId = sessionId || crypto.randomUUID()
    setSessionId(nextSessionId)
    setIsGeneratingSchema(true)
    setHtml('')
    try {
      const res = await getDashboardSchema({
        message,
        repositoryId,
        sessionId: nextSessionId,
        tenantId,
        workflowId: activeWorkflowId || undefined,
      })
      if (res.error || !res.data?.dashboard_result) {
        showToast({
          message: res.error || t`Failed to generate dashboard schema`,
          variant: 'error',
        })
        return
      }
      const result = res.data.dashboard_result
      setSchema(result)
    } finally {
      setIsGeneratingSchema(false)
    }
  }

  const runData = async (
    targetSchema: DashboardSchemaResult,
    session: string,
  ) => {
    setIsGeneratingHtml(true)
    try {
      const res = await getDashboardHtml({
        dashboard_json: targetSchema,
        repositoryId,
        sessionId: session,
        tenantId,
        workflowId:
          targetSchema.workflow_id || activeWorkflowId || undefined,
      })
      if (res.html.trim()) {
        setHtml(res.html)
        return true
      }

      if (res.error) {
        showToast({ message: res.error, variant: 'error' })
        return false
      }
      showToast({
        message: t`Live dashboard HTML was empty.`,
        variant: 'error',
      })
      return false
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  const startSuggestedPrompt = async (active: () => boolean) => {
    setActiveStep(1)
    setSchema(null)
    setHtml('')
    setIsGeneratingDesc(true)
    try {
      const currentTenantId =
        authUserStore.getState().session?.tenantId || tenantId
      const promptRes = await suggestDashboardPrompt({
        repositoryId,
        sessionId: '',
        tenantId: currentTenantId,
        workflowId: workflowId || '',
      })
      if (!active()) return
      if (promptRes.data?.prompt) {
        applyPromptResult(promptRes.data)
        return
      }
      if (promptRes.error) {
        console.warn('Dashboard prompt API failed:', promptRes.error)
      }
      const desc = await generateRepositoryDescription(repositoryName)
      if (!active()) return
      setEditableDesc(desc)
    } catch (err) {
      console.error('Error auto-generating dashboard prompt:', err)
      if (active()) {
        setEditableDesc(`I need to create a dashboard for ${repositoryName}`)
      }
    } finally {
      if (active()) setIsGeneratingDesc(false)
    }
  }

  useEffect(() => {
    let active = true
    const isActive = () => active

    const initialize = async () => {
      setIsLoadingSaved(true)
      setIsFullDashboardView(false)
      setActiveStep(1)
      setSchema(null)
      setHtml('')
      setEditableDesc('')
      setSessionId('')
      setResolvedWorkflowId(workflowId || '')

      const currentTenantId = authUserStore.getState().session?.tenantId || ''
      if (!currentTenantId || (!repositoryId && !workflowId)) {
        await startSuggestedPrompt(isActive)
        if (active) setIsLoadingSaved(false)
        return
      }

      const lookup = {
        repositoryId,
        tenantId: currentTenantId,
        workflowId: workflowId || undefined,
      }

      const saved = await loadSavedRepositoryDashboard(lookup)
      if (!active) return
      const schemaResult = saved.schema
      if (saved.html.trim()) {
        if (schemaResult) {
          setSchema(schemaResult)
          setEditableDesc(schemaResult.message || '')
          if (schemaResult.workflow_id) {
            setResolvedWorkflowId(schemaResult.workflow_id)
          }
        }
        setHtml(saved.html)
        setActiveStep(3)
        setIsFullDashboardView(true)
        setIsLoadingSaved(false)
        return
      }
      if (schemaResult) {
        setSchema(schemaResult)
        setEditableDesc(schemaResult.message || '')
        if (schemaResult.workflow_id) {
          setResolvedWorkflowId(schemaResult.workflow_id)
        }
        setActiveStep(2)
        setIsLoadingSaved(false)
        return
      }

      await startSuggestedPrompt(isActive)
      if (active) setIsLoadingSaved(false)
    }

    void initialize()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId, repositoryName, workflowId])

  const toggleKpi = (id: string) => {
    if (!schema) return
    setSchema({
      ...schema,
      kpis: schema.kpis.map((kpi) =>
        kpi.id === id ? { ...kpi, enabled: !kpi.enabled } : kpi,
      ),
    })
  }

  const toggleChart = (id: string) => {
    if (!schema) return
    setSchema({
      ...schema,
      charts: schema.charts.map((chart) =>
        chart.id === id ? { ...chart, enabled: !chart.enabled } : chart,
      ),
    })
  }

  const persistDashboard = async () => {
    if (!schema) return false
    const currentTenantId =
      authUserStore.getState().session?.tenantId || tenantId
    const schemaWorkflowId =
      schema.workflow_id || activeWorkflowId || undefined
    setIsSaving(true)
    try {
      const saveRes = await saveDashboardSchema({
        dashboard_json: schema,
        dashboard_result: schema,
        repositoryId,
        tenantId: currentTenantId,
        workflowId: schemaWorkflowId,
      })
      if (saveRes.error) {
        showToast({ message: saveRes.error, variant: 'error' })
        return false
      }
      return true
    } finally {
      setIsSaving(false)
    }
  }

  const handleApply = async () => {
    if (!schema) return
    setActiveStep(3)
    const ok = await runData(schema, sessionId || crypto.randomUUID())
    if (!ok) return
    showToast({ message: t`Dashboard preview updated!`, variant: 'success' })
  }

  const handleSaveDashboard = async () => {
    const ok = await persistDashboard()
    if (!ok) return

    if (schema) {
      await runData(schema, sessionId || crypto.randomUUID())
    }

    setActiveStep(3)
    setIsFullDashboardView(true)
    showToast({
      message: t`Dashboard saved for ${repositoryName}!`,
      variant: 'success',
    })
  }

  const reloadSavedHtml = async () => {
    if (schema) {
      await runData(schema, sessionId || '')
      return
    }

    setIsGeneratingHtml(true)
    try {
      const currentTenantId =
        authUserStore.getState().session?.tenantId || tenantId
      const saved = await loadSavedRepositoryDashboard({
        repositoryId,
        tenantId: currentTenantId,
        workflowId: activeWorkflowId || undefined,
      })
      if (saved.schema) {
        setSchema(saved.schema)
        setEditableDesc(saved.schema.message || '')
      }
      if (saved.html.trim()) {
        setHtml(saved.html)
        return
      }
      if (saved.error) {
        showToast({ message: saved.error, variant: 'error' })
      }
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  const openBuilder = async () => {
    if (!schema) {
      const currentTenantId =
        authUserStore.getState().session?.tenantId || tenantId
      const savedSchema = await getSavedDashboardSchema({
        repositoryId,
        tenantId: currentTenantId,
      })
      if (savedSchema.data?.schema) {
        setSchema(savedSchema.data.schema)
        setEditableDesc(savedSchema.data.schema.message || '')
      }
    }
    setIsFullDashboardView(false)
    setActiveStep(html ? 3 : 2)
  }

  const reloadSavedHtmlRef = useRef(reloadSavedHtml)
  reloadSavedHtmlRef.current = reloadSavedHtml
  const openBuilderRef = useRef(openBuilder)
  openBuilderRef.current = openBuilder

  useEffect(() => {
    if (!onSavedHtmlHeaderChange) return
    if (!(isFullDashboardView && html)) {
      onSavedHtmlHeaderChange(null)
      return
    }

    onSavedHtmlHeaderChange({
      isRefreshing: isGeneratingHtml,
      onEdit: () => {
        void openBuilderRef.current()
      },
      onRefresh: () => {
        void reloadSavedHtmlRef.current()
      },
    })
  }, [
    html,
    isFullDashboardView,
    isGeneratingHtml,
    onSavedHtmlHeaderChange,
  ])

  useEffect(() => {
    return () => onSavedHtmlHeaderChange?.(null)
  }, [onSavedHtmlHeaderChange])

  const getStepStatus = (stepId: number): TimelineStepStatus => {
    if (activeStep > stepId) return 'completed'
    if (activeStep === stepId) return 'active'
    return 'upcoming'
  }

  const getConnectorState = (
    fromStep: number,
    _toStep: number,
  ): TimelineConnectorState => {
    if (activeStep > fromStep) return 'completed'
    if (activeStep === fromStep) return 'loading'
    return 'idle'
  }

  const renderKpi = (kpi: DashboardKpi) => (
    <div
      key={kpi.id}
      className={cn(
        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-all select-none',
        kpi.enabled
          ? 'border-primary-9/40 bg-surface hover:border-primary-9'
          : 'border-dashed border-border-default bg-gray-2/60 opacity-60',
      )}
      onClick={() => toggleKpi(kpi.id)}
    >
      <div className='min-w-0 space-y-1'>
        <p className='text-13 font-bold text-text-primary'>{kpi.label}</p>
        <p className='text-11 leading-relaxed text-text-secondary'>
          {kpi.description}
        </p>
      </div>
      <CheckCircle
        selected={kpi.enabled}
        onClick={(e) => {
          e.stopPropagation()
          toggleKpi(kpi.id)
        }}
      />
    </div>
  )

  const renderChart = (chart: DashboardChart) => (
    <div
      key={chart.id}
      className={cn(
        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-all select-none',
        chart.enabled
          ? 'border-primary-9/40 bg-surface hover:border-primary-9'
          : 'border-dashed border-border-default bg-gray-2/60 opacity-60',
      )}
      onClick={() => toggleChart(chart.id)}
    >
      <div className='min-w-0 space-y-1'>
        <p className='text-13 font-bold text-text-primary'>
          {chart.title || chart.label}
        </p>
        <p className='text-11 leading-relaxed text-text-secondary'>
          {chart.description}
        </p>
      </div>
      <CheckCircle
        selected={chart.enabled}
        onClick={(e) => {
          e.stopPropagation()
          toggleChart(chart.id)
        }}
      />
    </div>
  )

  const step1Summary = (
    <div className='flex items-start justify-between gap-4 rounded-xl border border-border-default bg-surface p-4 shadow-2xs'>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <span className='text-13 font-bold text-text-primary'>
          {repositoryName}
        </span>
        <p className='line-clamp-2 text-12 leading-relaxed text-text-secondary'>
          {editableDesc ||
            t`Centralized repository for all incoming documentation and related analytics.`}
        </p>
      </div>
      <Button
        icon='lucide:pencil'
        label={t`Edit`}
        size='sm'
        variant='outline'
        onClick={() => setActiveStep(1)}
      />
    </div>
  )

  const enabledKpiCount = schema?.kpis?.filter((kpi) => kpi.enabled).length || 0
  const enabledChartCount =
    schema?.charts?.filter((chart) => chart.enabled).length || 0

  const step2Summary = (
    <div className='flex items-start justify-between gap-4 rounded-xl border border-border-default bg-surface p-4 shadow-2xs'>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <span className='text-13 font-bold text-text-primary'>
          {t`Selected ${enabledKpiCount} KPIs and ${enabledChartCount} charts`}
        </span>
      </div>
      <Button
        icon='lucide:pencil'
        label={t`Edit`}
        size='sm'
        variant='outline'
        onClick={() => setActiveStep(2)}
      />
    </div>
  )

  if (isLoadingSaved) {
    return (
      <div className='mx-auto flex max-w-6xl flex-col gap-6 p-6'>
        <div className='space-y-2'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-4 w-72' />
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <SkeletonCard height='h-28' />
          <SkeletonCard height='h-28' />
          <SkeletonCard height='h-28' />
        </div>
        <SkeletonCard height='h-80' />
      </div>
    )
  }

  if (isFullDashboardView && html) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        className='flex h-full min-h-0 flex-1 flex-col'
        initial={{ opacity: 0 }}
        key={`api-dashboard-${repositoryId}`}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <DashboardHtmlPreview
          className='h-full min-h-0 w-full flex-1 overflow-auto'
          html={html}
          title={t`Dashboard`}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='mx-auto max-w-6xl p-6'
      initial={{ opacity: 0, scale: 0.99, y: 15 }}
      key={`api-builder-${repositoryId}`}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <BuilderTimelineStep
        bottomConnectorState={getConnectorState(1, 2)}
        description={t`Describe the dashboard you want to create.`}
        showTopConnector={false}
        status={getStepStatus(1)}
        stepId={1}
        summary={step1Summary}
        title={t`Enter Prompt`}
        topConnectorState='hidden'
      >
        <div className='space-y-4'>
          <div className='rounded-[14px] border border-primary-9/20 bg-primary-3/10 p-4 transition-all'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-2'>
                <AiBrandIcon className='size-4 shrink-0' />
                <h2 className='text-15 truncate font-semibold text-text-primary'>
                  {repositoryName}
                </h2>
              </div>
              <Button
                disabled={isGeneratingDesc}
                icon='lucide:refresh-cw'
                label={t`Regenerate`}
                size='xs'
                variant='outline'
                onClick={() => void generatePrompt()}
              />
            </div>
            {isGeneratingDesc ? (
              <div className='space-y-2.5'>
                <div className='flex items-center gap-2 text-12 font-medium text-primary-9'>
                  <span className='h-2 w-2 animate-ping rounded-full bg-primary-9' />
                  <span>{t`Generating description…`}</span>
                </div>
                <Skeleton className='h-3.5 w-full' />
                <Skeleton className='h-3.5 w-5/6' />
                <Skeleton className='h-3.5 w-2/3' />
              </div>
            ) : (
              <textarea
                className='min-h-24 w-full rounded-[12px] border border-border-default bg-surface px-3.5 py-2.5 text-13 leading-relaxed text-text-primary shadow-2xs outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20'
                placeholder={t`Describe the dashboard you want to create...`}
                value={editableDesc}
                onChange={(e) => setEditableDesc(e.target.value)}
              />
            )}
          </div>

          <div className='flex justify-end pt-2'>
            <Button
              disabled={isGeneratingDesc || !editableDesc.trim()}
              label={t`Continue to Dashboard Designer`}
              size='md'
              suffixIcon='lucide:arrow-right'
              onClick={() => {
                setActiveStep(2)
                void runSchema(editableDesc)
              }}
            />
          </div>
        </div>
      </BuilderTimelineStep>

      <BuilderTimelineStep
        bottomConnectorState={getConnectorState(2, 3)}
        description={t`Select suggested KPIs and charts from your data.`}
        status={getStepStatus(2)}
        stepId={2}
        summary={step2Summary}
        title={t`AI Dashboard Designer`}
        topConnectorState={getConnectorState(1, 2)}
        showTopConnector
      >
        <div className='space-y-5'>
          {isGeneratingSchema ? (
            <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-primary-9/30 bg-primary-3/10 p-10 text-center shadow-xs'>
              <RefreshCw className='mb-3 size-8 animate-spin text-primary-9' />
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`Generating dashboard schema...`}
              </h4>
              <p className='mt-1 text-12 text-text-secondary'>
                {t`Suggesting KPIs and charts for ${repositoryName}...`}
              </p>
            </div>
          ) : schema ? (
            <>
              <div className='space-y-3'>
                <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>
                  {t`KPIs`}
                </span>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {(schema.kpis || []).map(renderKpi)}
                </div>
              </div>

              <div className='space-y-3'>
                <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>
                  {t`Charts`}
                </span>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {(schema.charts || []).map(renderChart)}
                </div>
              </div>

              <div className='flex items-center justify-between gap-2.5 border-t border-border-default pt-4'>
                <Button
                  icon='lucide:arrow-left'
                  label={t`Back to Prompt`}
                  size='md'
                  variant='outline'
                  onClick={() => setActiveStep(1)}
                />
                <Button
                  disabled={isGeneratingHtml}
                  icon='lucide:play'
                  label={t`Apply & Preview`}
                  size='md'
                  onClick={() => void handleApply()}
                />
              </div>
            </>
          ) : (
            <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border-default bg-gray-2/40 p-8 text-center'>
              <div className='mb-3 flex size-11 items-center justify-center rounded-2xl border border-primary-9/20 bg-primary-3/30 text-primary-9 shadow-2xs'>
                <AiBrandIcon className='size-5 shrink-0' />
              </div>
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`Waiting to generate dashboard schema`}
              </h4>
              <p className='mt-1 max-w-md text-12 leading-relaxed text-text-secondary'>
                {t`Continue from configuration to generate KPIs and charts from your prompt.`}
              </p>
            </div>
          )}
        </div>
      </BuilderTimelineStep>

      <BuilderTimelineStep
        bottomConnectorState='hidden'
        description={t`Live dashboard generated from your selected widgets.`}
        status={getStepStatus(3)}
        stepId={3}
        title={t`Dashboard Preview`}
        topConnectorState={getConnectorState(2, 3)}
        showTopConnector
      >
        <div className='space-y-5'>
          <div className='flex items-center justify-between gap-2.5'>
            <Button
              icon='lucide:arrow-left'
              label={t`Back to Designer`}
              size='md'
              variant='outline'
              onClick={() => setActiveStep(2)}
            />
            <div className='flex items-center gap-2.5'>
              <Button
                disabled={!schema || isGeneratingHtml}
                icon='lucide:refresh-cw'
                label={t`Refresh`}
                size='md'
                variant='outline'
                onClick={() => {
                  if (!schema) return
                  void runData(schema, sessionId || crypto.randomUUID())
                }}
              />
              <Button
                disabled={!schema || isSaving}
                icon='lucide:save'
                label={t`Save Dashboard`}
                size='md'
                onClick={() => void handleSaveDashboard()}
              />
            </div>
          </div>

          {isGeneratingHtml ? (
            <div className='my-2 flex flex-col gap-4 rounded-[16px] border border-primary-9/20 bg-surface p-6 shadow-xs'>
              <div className='flex items-center gap-2 text-13 font-medium text-primary-9'>
                <span className='h-2 w-2 animate-ping rounded-full bg-primary-9' />
                <span>{t`Loading live dashboard data...`}</span>
              </div>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <SkeletonCard height='h-24' />
                <SkeletonCard height='h-24' />
                <SkeletonCard height='h-24' />
              </div>
              <SkeletonCard height='h-64' />
            </div>
          ) : html ? (
            <DashboardHtmlPreview html={html} title={t`Dashboard preview`} />
          ) : (
            <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border-default bg-gray-2/40 p-8 text-center'>
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`No preview yet`}
              </h4>
              <p className='mt-1 max-w-md text-12 leading-relaxed text-text-secondary'>
                {t`Select widgets in step 2, then click Apply & Preview to load live data.`}
              </p>
            </div>
          )}
        </div>
      </BuilderTimelineStep>
    </motion.div>
  )
}

function CheckCircle({
  className,
  selected,
  onClick,
}: {
  className?: string
  selected: boolean
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={cn(
        'flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all select-none',
        selected
          ? 'animate-in zoom-in-75 scale-100 bg-green-9 text-white shadow-2xs duration-200'
          : 'border border-border-default bg-gray-3 text-transparent hover:border-gray-8 hover:text-gray-5',
        className,
      )}
      onClick={onClick}
    >
      <Check className='size-3.5 stroke-[3]' />
    </div>
  )
}
