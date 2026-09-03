import { useLingui } from '@lingui/react/macro'
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  DollarSign,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type DashboardChart,
  type DashboardKpi,
  type DashboardSchemaResult,
  getDashboardHtml,
  getDashboardSchema,
  getSavedDashboardHtml,
  getSavedDashboardSchema,
  saveDashboardSchema,
} from '@/api/v6/dashboard'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import CustomFilter from '@/components/common/CustomFilter'
import DashboardHtmlPreview from '@/pages/dashboard/components/DashboardHtmlPreview'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import {
  BuilderTimelineStep,
  type TimelineConnectorState,
  type TimelineStepStatus,
} from '@/pages/settings/components/Folders/AiFolderBuilderTimeline'
import {
  type DashboardAiConfig,
  type DashboardSectionGroup,
  type DashboardWidgetComponent,
  generateRepositoryDescription,
  normalizeDashboardConfig,
} from '@/services/ai/dashboardAi'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

interface Props {
  repositoryId: string
  repositoryName: string
}

const COLORS = [
  'var(--primary-9, #4f46e5)',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
]

export default function DashboardAiBuilder({
  repositoryId,
  repositoryName,
}: Props) {
  const { t } = useLingui()

  const {
    currency,
    invoiceStatus,
    resetFilters,
    searchQuery,
    supplierCategory,
    timeframe,
    setCurrency,
    setInvoiceStatus,
    setSearchQuery,
    setSupplierCategory,
    setTimeframe,
  } = useDashboardStore()

  const [department, setDepartment] = useState('')
  const [requestStatus, setRequestStatus] = useState('')
  const [poAmountTier, setPoAmountTier] = useState('')

  const [activeStep, setActiveStep] = useState<number>(1)
  const [config, setConfig] = useState<DashboardAiConfig | null>(null)
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [isFullDashboardView, setIsFullDashboardView] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editableDesc, setEditableDesc] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [schemaResult, setSchemaResult] =
    useState<DashboardSchemaResult | null>(null)
  const [dashboardHtml, setDashboardHtml] = useState('')
  const schemaRequestRef = useRef(0)

  const filtersProp = React.useMemo(
    () => [
      {
        dataType: 'date',
        id: 'timeframe',
        label: t`Timeframe`,
        options: [
          { label: t`Today`, value: 'today' },
          { label: t`This week`, value: 'week' },
          { label: t`This month`, value: 'month' },
          { label: t`Last month`, value: 'lastmonth' },
          { label: t`Quarter`, value: 'quarter' },
          { label: t`Financial Year`, value: 'fy' },
        ],
      },
      {
        id: 'department',
        label: t`Department`,
        options: [
          { label: 'Finance', value: 'Finance' },
          { label: 'Procurement', value: 'Procurement' },
          { label: 'IT', value: 'IT' },
          { label: 'Operations', value: 'Operations' },
        ],
        searchable: true,
        searchPlaceholder: t`Search department...`,
      },
      {
        id: 'supplierCategory',
        label: t`Suppliers`,
        options: [
          { label: 'Acme Corp', value: 'Acme Corp' },
          { label: 'Global Tech', value: 'Global Tech' },
          { label: 'Logistics Pro', value: 'Logistics Pro' },
        ],
        searchable: true,
        searchPlaceholder: t`Search supplier...`,
      },
      {
        id: 'invoiceStatus',
        label: t`Statuses`,
        options: [
          { label: 'Approved', value: 'Approved' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Processing', value: 'Processing' },
          { label: 'Overdue', value: 'Overdue' },
        ],
        searchable: true,
        searchPlaceholder: t`Search status...`,
      },
      {
        id: 'currency',
        label: t`Currencies`,
        options: [
          { label: 'USD ($)', value: 'USD' },
          { label: 'EUR (€)', value: 'EUR' },
          { label: 'GBP (£)', value: 'GBP' },
          { label: 'CAD ($)', value: 'CAD' },
        ],
        searchable: true,
        searchPlaceholder: t`Search currency...`,
      },
    ],
    [t],
  )

  const moreFiltersProp = React.useMemo(
    () => [
      {
        icon: ClipboardList,
        id: 'status',
        label: t`Request Status`,
        options: [
          { label: 'Pending Approval', value: 'pending' },
          { label: 'Completed', value: 'completed' },
        ],
      },
      {
        icon: DollarSign,
        id: 'amount',
        label: t`PO Amount`,
        options: [
          { label: 'Under $10k', value: '<10k' },
          { label: '$10k - $50k', value: '10k-50k' },
          { label: 'Over $50k', value: '>50k' },
        ],
      },
    ],
    [t],
  )

  const handleFilterChange = (id: string, value: any) => {
    if (id === 'timeframe') setTimeframe(String(value || 'month'))
    if (id === 'department') setDepartment(String(value || ''))
    if (id === 'supplierCategory') setSupplierCategory(String(value || ''))
    if (id === 'invoiceStatus') setInvoiceStatus(String(value || ''))
    if (id === 'currency') setCurrency(String(value || ''))
    if (id === 'status') setRequestStatus(String(value || ''))
    if (id === 'amount') setPoAmountTier(String(value || ''))
  }

  const handleResetFilters = () => {
    resetFilters()
    setDepartment('')
    setRequestStatus('')
    setPoAmountTier('')
  }

  // Load saved dashboard from the catalog API for the selected repository
  useEffect(() => {
    let active = true

    const initialize = async () => {
      setIsFullDashboardView(false)
      setActiveStep(1)
      setSchemaResult(null)
      setDashboardHtml('')
      setEditableDesc('')

      const tenantId = authUserStore.getState().session?.tenantId || ''
      if (tenantId && repositoryId) {
        const lookup = { repositoryId, tenantId }
        const savedHtml = await getSavedDashboardHtml(lookup)
        if (!active) return
        if (savedHtml.html) {
          setDashboardHtml(savedHtml.html)
          setActiveStep(3)
          setIsFullDashboardView(true)
          return
        }

        const savedSchema = await getSavedDashboardSchema(lookup)
        if (!active) return
        const schemaResult = savedSchema.data?.schema
        const schemaHtml = savedSchema.data?.dashboardHtml || ''
        if (schemaHtml) {
          setDashboardHtml(schemaHtml)
          if (schemaResult) {
            setSchemaResult(schemaResult)
            setEditableDesc(schemaResult.message || '')
          }
          setActiveStep(3)
          setIsFullDashboardView(true)
          return
        }
        if (schemaResult) {
          setSchemaResult(schemaResult)
          setEditableDesc(schemaResult.message || '')
          setActiveStep(2)
          setIsFullDashboardView(false)
          return
        }
      }

      if (active) {
        setIsGeneratingDesc(true)
        setIsFullDashboardView(false)
        setActiveStep(1)
      }

      try {
        const desc = await generateRepositoryDescription(repositoryName)
        if (!active) return
        setEditableDesc(desc)
      } catch (err) {
        console.error('Error auto-generating dashboard prompt:', err)
        if (active) {
          setEditableDesc(`I need to create a dashboard for ${repositoryName}`)
        }
      } finally {
        if (active) setIsGeneratingDesc(false)
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [repositoryId, repositoryName])

  const runSchemaAndLoadData = async (promptText: string) => {
    const tenantId = authUserStore.getState().session?.tenantId || ''
    const message = promptText.trim()

    if (!tenantId) {
      showToast({
        message: t`Tenant is missing. Sign in again and retry.`,
        variant: 'error',
      })
      return
    }
    if (!repositoryId) {
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

    const requestId = ++schemaRequestRef.current
    const newSessionId = crypto.randomUUID()
    setSessionId(newSessionId)
    setIsGeneratingSchema(true)
    setIsGeneratingHtml(false)
    setDashboardHtml('')
    setSchemaResult(null)

    try {
      const schemaRes = await getDashboardSchema({
        message,
        repositoryId,
        sessionId: newSessionId,
        tenantId,
      })
      if (requestId !== schemaRequestRef.current) return
      if (schemaRes.error || !schemaRes.data?.dashboard_result) {
        showToast({
          message: schemaRes.error || t`Failed to generate dashboard schema`,
          variant: 'error',
        })
        return
      }

      const result = schemaRes.data.dashboard_result
      setSchemaResult(result)
      setIsGeneratingSchema(false)

      const saveRes = await saveDashboardSchema({
        dashboard_result: result,
        repositoryId,
        tenantId,
      })
      if (requestId !== schemaRequestRef.current) return
      if (saveRes.error) {
        console.warn('Dashboard schema save failed:', saveRes.error)
      }
    } finally {
      if (requestId === schemaRequestRef.current) {
        setIsGeneratingSchema(false)
        setIsGeneratingHtml(false)
      }
    }
  }

  const refreshDashboardData = async () => {
    const tenantId = authUserStore.getState().session?.tenantId || ''
    setIsGeneratingHtml(true)
    try {
      if (schemaResult) {
        const dataRes = await getDashboardHtml({
          dashboard_json: schemaResult,
          repositoryId,
          sessionId: sessionId || crypto.randomUUID(),
          tenantId,
        })
        if (dataRes.html.trim()) {
          setDashboardHtml(dataRes.html)
          return
        }
        if (dataRes.error) {
          showToast({ message: dataRes.error, variant: 'error' })
        }
      }

      const cached = await getSavedDashboardHtml({
        repositoryId,
        tenantId,
        workflowId: schemaResult?.workflow_id || undefined,
      })
      if (cached.html.trim()) {
        setDashboardHtml(cached.html)
      }
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  const toggleSchemaKpi = (id: string) => {
    if (!schemaResult) return
    setSchemaResult({
      ...schemaResult,
      kpis: schemaResult.kpis.map((kpi) =>
        kpi.id === id ? { ...kpi, enabled: !kpi.enabled } : kpi,
      ),
    })
  }

  const toggleSchemaChart = (id: string) => {
    if (!schemaResult) return
    setSchemaResult({
      ...schemaResult,
      charts: schemaResult.charts.map((chart) =>
        chart.id === id ? { ...chart, enabled: !chart.enabled } : chart,
      ),
    })
  }

  const handleApplySchemaPreview = async () => {
    if (!schemaResult) return
    setActiveStep(3)
    const tenantId = authUserStore.getState().session?.tenantId || ''
    const saveRes = await saveDashboardSchema({
      dashboard_json: schemaResult,
      dashboard_result: schemaResult,
      repositoryId,
      tenantId,
      workflowId: schemaResult.workflow_id || undefined,
    })
    if (saveRes.error) {
      showToast({ message: saveRes.error, variant: 'error' })
    }
    await refreshDashboardData()
    showToast({ message: t`Dashboard preview updated!`, variant: 'success' })
  }

  // Toggle Section Enabled Status
  const handleToggleSectionEnabled = (sectionId: string) => {
    if (!config) return
    const updated = {
      ...config,
      sections: config.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, enabled: sec.enabled === false } : sec,
      ),
    }
    setConfig(updated)
  }

  // Toggle KPI Enabled Status
  const handleToggleKpiEnabled = (sectionId: string, kpiId: string) => {
    if (!config) return
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          components: (sec.components || []).map((comp) => {
            if (comp.type !== 'kpi_grid' || !comp.kpis) return comp
            return {
              ...comp,
              kpis: comp.kpis.map((kpi) =>
                kpi.id === kpiId
                  ? { ...kpi, enabled: kpi.enabled === false }
                  : kpi,
              ),
            }
          }),
        }
      }),
    }
    setConfig(updated)
  }

  // Toggle Insight Enabled Status
  const handleToggleInsightEnabled = (sectionId: string, insightId: string) => {
    if (!config) return
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          components: (sec.components || []).map((comp) => {
            if (comp.type !== 'insights' || !comp.insights) return comp
            return {
              ...comp,
              insights: comp.insights.map((item) =>
                item.id === insightId
                  ? { ...item, enabled: item.enabled === false }
                  : item,
              ),
            }
          }),
        }
      }),
    }
    setConfig(updated)
  }

  // Toggle Widget / Card Enabled Status
  const handleToggleWidgetEnabled = (sectionId: string, widgetId: string) => {
    if (!config) return
    const updated = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec
        return {
          ...sec,
          components: (sec.components || []).map((comp) =>
            comp.id === widgetId
              ? { ...comp, enabled: comp.enabled === false }
              : comp,
          ),
        }
      }),
    }
    setConfig(updated)
  }

  // Toggle Section Expand/Collapse State
  const handleToggleSectionExpand = (sectionId: string) => {
    if (!config) return
    const updated = {
      ...config,
      sections: config.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, isExpanded: sec.isExpanded === false }
          : sec,
      ),
    }
    setConfig(updated)
  }

  // Save Dashboard Config
  const handleSave = async () => {
    if (schemaResult) {
      const tenantId = authUserStore.getState().session?.tenantId || ''
      const saveRes = await saveDashboardSchema({
        dashboard_json: schemaResult,
        dashboard_result: schemaResult,
        repositoryId,
        tenantId,
        workflowId: schemaResult.workflow_id || undefined,
      })
      if (saveRes.error) {
        showToast({ message: saveRes.error, variant: 'error' })
        return
      }
      if (!dashboardHtml) {
        await refreshDashboardData()
      }
      const cached = await getSavedDashboardHtml({
        repositoryId,
        tenantId,
        workflowId: schemaResult.workflow_id || undefined,
      })
      if (cached.html?.trim()) {
        setDashboardHtml(cached.html)
      }
      setIsEditMode(false)
      setIsFullDashboardView(true)
      setActiveStep(3)
      showToast({
        message: t`Dashboard saved and activated for ${repositoryName}!`,
        variant: 'success',
      })
      return
    }

    if (!config) return
    const payload: DashboardAiConfig = normalizeDashboardConfig({
      ...config,
      description: editableDesc,
    })
    setConfig(payload)
    setIsEditMode(false)
    setIsFullDashboardView(true)
    showToast({
      message: t`Dashboard saved and activated for ${repositoryName}!`,
      variant: 'success',
    })
  }

  // Helper step status functions for Timeline
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

  const renderDashboardSections = () => {
    if (!config) return null

    const displayedSections = config.sections.filter(
      (sec) => isEditMode || sec.enabled !== false,
    )

    return (
      <div className='space-y-6'>
        {displayedSections.map((section) => {
          const isSectionEnabled = section.enabled !== false
          const isOpen = section.isExpanded !== false

          return (
            <div
              key={section.id}
              className={cn(
                'space-y-4 transition-all duration-300',
                isEditMode && !isSectionEnabled && 'opacity-55 grayscale-[30%]',
              )}
            >
              {/* Collapsible Header Card */}
              <div
                className={cn(
                  'flex cursor-pointer flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 shadow-xs transition-colors select-none',
                  isEditMode
                    ? isSectionEnabled
                      ? 'border-primary-9/40 bg-surface hover:bg-gray-2/50'
                      : 'border-dashed border-border-default bg-gray-2/70 hover:bg-gray-2'
                    : 'border-border-default bg-surface hover:bg-gray-2/50',
                )}
                onClick={() => {
                  if (isEditMode) {
                    handleToggleSectionEnabled(section.id)
                  } else {
                    handleToggleSectionExpand(section.id)
                  }
                }}
              >
                <div className='flex min-w-0 items-center gap-3.5'>
                  {/* Check circle in Edit mode */}
                  {isEditMode && (
                    <CheckCircle
                      selected={isSectionEnabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleSectionEnabled(section.id)
                      }}
                    />
                  )}
                  <div className='min-w-0'>
                    <h3 className='flex items-center gap-2 text-15 font-bold text-text-primary'>
                      {section.title}
                      {isEditMode && !isSectionEnabled && (
                        <span className='text-10 rounded-md bg-gray-3 px-2 py-0.5 font-semibold tracking-wider text-text-secondary uppercase'>
                          {t`Hidden in View`}
                        </span>
                      )}
                    </h3>
                    <p className='mt-0.5 text-12 font-medium text-primary-9/70'>
                      {section.subtitle}
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-4'>
                  {/* Summary Metrics Badges */}
                  <div className='flex flex-wrap items-center gap-4 text-11'>
                    {section.summaryBadges?.map((badge, bIdx) => (
                      <div className='flex flex-col text-right' key={bIdx}>
                        <span className='text-10 font-medium tracking-wider text-text-secondary uppercase'>
                          {badge.label}
                        </span>
                        <span
                          className={cn(
                            'text-13 font-bold',
                            badge.color || 'text-primary-9',
                          )}
                        >
                          {badge.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Chevron Toggle Button */}
                  <button
                    className='rounded-lg p-1 transition-colors hover:bg-gray-3/50'
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleSectionExpand(section.id)
                    }}
                  >
                    {isOpen ? (
                      <ChevronUp className='size-5 shrink-0 text-primary-9' />
                    ) : (
                      <ChevronDown className='size-5 shrink-0 text-text-secondary' />
                    )}
                  </button>
                </div>
              </div>

              {/* Section Body */}
              {isOpen && (
                <div className='animate-in fade-in duration-300'>
                  {renderSectionBody(
                    section,
                    isEditMode,
                    handleToggleKpiEnabled,
                    handleToggleInsightEnabled,
                    handleToggleWidgetEnabled,
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Render Full Page Live Dashboard View
  if (isFullDashboardView && dashboardHtml) {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className='mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8'
        exit={{ opacity: 0, scale: 0.99, y: -15 }}
        initial={{ opacity: 0, scale: 0.99, y: 15 }}
        key={`full-html-${repositoryId}`}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className='flex items-center justify-end gap-2.5'>
          <Button
            icon='lucide:refresh-cw'
            label={t`Refresh`}
            size='sm'
            variant='outline'
            onClick={() => void refreshDashboardData()}
          />
          <Button
            icon='lucide:pencil'
            label={t`Edit`}
            size='sm'
            variant='outline'
            onClick={() => {
              setIsFullDashboardView(false)
              setActiveStep(3)
            }}
          />
        </div>
        <DashboardHtmlPreview
          className='min-h-[720px] w-full overflow-auto rounded-[16px] border border-border-default bg-white p-3'
          html={dashboardHtml}
          title={t`Dashboard preview`}
        />
      </motion.div>
    )
  }

  // Render Full Page Live Dashboard View
  if (isFullDashboardView && config) {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className='mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8'
        exit={{ opacity: 0, scale: 0.99, y: -15 }}
        initial={{ opacity: 0, scale: 0.99, y: 15 }}
        key={`full-${repositoryId}`}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Quick Filter Bar */}
        <div>
          <CustomFilter
            filters={filtersProp}
            moreFilters={moreFiltersProp}
            searchPlaceholder={t`Search invoice, supplier, PO...`}
            searchQuery={searchQuery}
            activeFilters={{
              amount: poAmountTier,
              currency: currency,
              department: department,
              invoiceStatus: invoiceStatus,
              status: requestStatus,
              supplierCategory: supplierCategory,
              timeframe: timeframe || 'month',
            }}
            showReset={Boolean(
              timeframe !== 'month' ||
              currency ||
              invoiceStatus ||
              supplierCategory ||
              department ||
              requestStatus ||
              poAmountTier ||
              searchQuery,
            )}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            onSearchChange={(query) => setSearchQuery(query)}
          />
        </div>

        {/* Render Sections */}
        {renderDashboardSections()}
      </motion.div>
    )
  }

  const step1Summary = (
    <div className='flex items-start justify-between gap-4 rounded-xl border border-border-default bg-surface p-4 shadow-2xs'>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <div className='flex items-center gap-2'>
          <span className='text-13 font-bold text-text-primary'>
            {repositoryName}
          </span>
        </div>
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

  const schemaKpiCount = schemaResult?.kpis?.length || 0
  const schemaChartCount = schemaResult?.charts?.length || 0

  const step2Summary = (
    <div className='flex items-start justify-between gap-4 rounded-xl border border-border-default bg-surface p-4 shadow-2xs'>
      <div className='min-w-0 flex-1 space-y-1.5'>
        <span className='text-13 font-bold text-text-primary'>
          {schemaResult
            ? t`Suggested ${schemaKpiCount} KPIs and ${schemaChartCount} charts`
            : t`Dashboard schema not generated yet`}
        </span>
        <p className='pt-0.5 text-11 text-text-secondary italic'>
          {editableDesc ? `Prompt: "${editableDesc}"` : ''}
        </p>
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

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='mx-auto max-w-6xl p-6'
      exit={{ opacity: 0, scale: 0.99, y: -15 }}
      initial={{ opacity: 0, scale: 0.99, y: 15 }}
      key={`builder-${repositoryId}`}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* PROCEDURE STEP 1: DASHBOARD CONFIGURATION */}
      <BuilderTimelineStep
        bottomConnectorState={getConnectorState(1, 2)}
        description={t`Repository context and business scope.`}
        showTopConnector={false}
        status={getStepStatus(1)}
        stepId={1}
        summary={step1Summary}
        title={t`Dashboard Configuration`}
        topConnectorState='hidden'
      >
        <div className='space-y-4 p-5'>
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
                onClick={() => {
                  setIsGeneratingDesc(true)
                  void generateRepositoryDescription(repositoryName)
                    .then((desc) => setEditableDesc(desc))
                    .catch(() => {
                      setEditableDesc(
                        `I need to create a dashboard for ${repositoryName}`,
                      )
                    })
                    .finally(() => setIsGeneratingDesc(false))
                }}
              />
            </div>
            {isGeneratingDesc ? (
              <div className='space-y-2.5'>
                <div className='flex items-center gap-2 text-12 font-medium text-primary-9'>
                  <RefreshCw className='size-3.5 animate-spin' />
                  <span>{t`Generating description…`}</span>
                </div>
                <div className='h-3 w-full animate-pulse rounded bg-primary-9/10' />
                <div className='h-3 w-5/6 animate-pulse rounded bg-primary-9/10' />
                <div className='h-3 w-2/3 animate-pulse rounded bg-primary-9/10' />
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
                void runSchemaAndLoadData(editableDesc)
              }}
            />
          </div>
        </div>
      </BuilderTimelineStep>

      {/* PROCEDURE STEP 2: AI DASHBOARD DESIGNER */}
      <BuilderTimelineStep
        bottomConnectorState={getConnectorState(2, 3)}
        description={t`Generate KPIs and charts from your prompt, then load live data.`}
        status={getStepStatus(2)}
        stepId={2}
        summary={step2Summary}
        title={t`AI Dashboard Designer`}
        topConnectorState={getConnectorState(1, 2)}
        showTopConnector
      >
        <div className='space-y-5 p-5'>
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
          ) : schemaResult ? (
            <>
              <div className='space-y-3'>
                <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>
                  {t`KPIs`}
                </span>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {schemaResult.kpis.map((kpi: DashboardKpi) => (
                    <div
                      key={kpi.id}
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-all select-none',
                        kpi.enabled
                          ? 'border-primary-9/40 bg-surface hover:border-primary-9'
                          : 'border-dashed border-border-default bg-gray-2/60 opacity-60',
                      )}
                      onClick={() => toggleSchemaKpi(kpi.id)}
                    >
                      <div className='min-w-0 space-y-1'>
                        <p className='text-13 font-bold text-text-primary'>
                          {kpi.label}
                        </p>
                        <p className='text-11 leading-relaxed text-text-secondary'>
                          {kpi.description}
                        </p>
                      </div>
                      <CheckCircle selected={kpi.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className='space-y-3'>
                <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>
                  {t`Charts`}
                </span>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {schemaResult.charts.map((chart: DashboardChart) => (
                    <div
                      key={chart.id}
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-4 shadow-2xs transition-all select-none',
                        chart.enabled
                          ? 'border-primary-9/40 bg-surface hover:border-primary-9'
                          : 'border-dashed border-border-default bg-gray-2/60 opacity-60',
                      )}
                      onClick={() => toggleSchemaChart(chart.id)}
                    >
                      <div className='min-w-0 space-y-1'>
                        <p className='text-13 font-bold text-text-primary'>
                          {chart.title || chart.label}
                        </p>
                        <p className='text-11 leading-relaxed text-text-secondary'>
                          {chart.description}
                        </p>
                      </div>
                      <CheckCircle selected={chart.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className='flex items-center justify-end'>
                <Button
                  disabled={isGeneratingHtml}
                  icon='lucide:play'
                  label={t`Apply & Preview`}
                  size='md'
                  onClick={() => void handleApplySchemaPreview()}
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

          <div className='flex items-center justify-between border-t border-border-default pt-4'>
            <Button
              icon='lucide:arrow-left'
              label={t`Back to Configuration`}
              size='md'
              variant='outline'
              onClick={() => setActiveStep(1)}
            />
            <Button
              label={t`Generate Dashboard Design`}
              size='md'
              suffixIcon='lucide:arrow-right'
              disabled={!schemaResult || isGeneratingSchema || isGeneratingHtml}
              onClick={() => setActiveStep(3)}
            />
          </div>
        </div>
      </BuilderTimelineStep>

      {/* PROCEDURE STEP 3: LIVE DASHBOARD PREVIEW & ACTIVATION */}
      <BuilderTimelineStep
        bottomConnectorState='hidden'
        description={t`Interactive preview of your customized dashboard design for ${repositoryName}.`}
        status={getStepStatus(3)}
        stepId={3}
        title={t`Dashboard Preview & Activation`}
        topConnectorState={getConnectorState(2, 3)}
        showTopConnector
      >
        <div className='space-y-6 p-5'>
          {/* Header Action Bar */}
          <div className='flex items-center justify-between rounded-[14px] border border-border-default bg-gray-2 px-4 py-3'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2 text-13 font-semibold text-text-primary'>
                <Eye className='size-4 text-primary-9' />
                <span>{t`Interactive Dashboard Preview`}</span>
              </div>
            </div>
            <div className='flex items-center gap-2.5'>
              {dashboardHtml ? (
                <Button
                  icon='lucide:refresh-cw'
                  label={t`Refresh`}
                  size='sm'
                  variant='outline'
                  onClick={() => void refreshDashboardData()}
                />
              ) : (
                <Button
                  icon={isEditMode ? 'lucide:eye' : 'lucide:edit-3'}
                  label={isEditMode ? t`View Mode` : t`Customize Design`}
                  size='sm'
                  variant={isEditMode ? 'solid' : 'outline'}
                  onClick={() => setIsEditMode((prev) => !prev)}
                />
              )}
              <Button
                icon='lucide:save'
                label={t`Save Dashboard`}
                size='sm'
                onClick={handleSave}
              />
            </div>
          </div>

          {isGeneratingHtml ? (
            <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-primary-9/30 bg-primary-3/10 p-10 text-center shadow-xs'>
              <RefreshCw className='mb-3 size-8 animate-spin text-primary-9' />
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`Loading live dashboard data...`}
              </h4>
            </div>
          ) : dashboardHtml ? (
            <DashboardHtmlPreview html={dashboardHtml} title={t`Dashboard preview`} />
          ) : (
            <>
              {/* Edit Mode Contextual Banner */}
              {isEditMode && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-9/30 bg-primary-3/15 px-4.5 py-3 text-12 shadow-xs'
                  exit={{ opacity: 0, y: -8 }}
                  initial={{ opacity: 0, y: -8 }}
                >
                  <div className='flex items-center gap-2.5 font-medium text-primary-9'>
                    <AiBrandIcon className='size-4 shrink-0' />
                    <span>
                      {t`Edit Mode Active — Click the check circle on any section, KPI tile, AI insight line, or chart card to unselect unwanted items. Switch to View Mode to preview your custom layout.`}
                    </span>
                  </div>
                  <Button
                    icon='lucide:check'
                    label={t`Done Customizing`}
                    size='xs'
                    onClick={() => setIsEditMode(false)}
                  />
                </motion.div>
              )}

              {/* Quick Filter Bar */}
              <div>
                <CustomFilter
                  filters={filtersProp}
                  moreFilters={moreFiltersProp}
                  searchPlaceholder={t`Search invoice, supplier, PO...`}
                  searchQuery={searchQuery}
                  activeFilters={{
                    amount: poAmountTier,
                    currency: currency,
                    department: department,
                    invoiceStatus: invoiceStatus,
                    status: requestStatus,
                    supplierCategory: supplierCategory,
                    timeframe: timeframe || 'month',
                  }}
                  showReset={Boolean(
                    timeframe !== 'month' ||
                    currency ||
                    invoiceStatus ||
                    supplierCategory ||
                    department ||
                    requestStatus ||
                    poAmountTier ||
                    searchQuery,
                  )}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                  onSearchChange={(query) => setSearchQuery(query)}
                />
              </div>

              {/* Render Sections */}
              {renderDashboardSections()}
            </>
          )}
        </div>
      </BuilderTimelineStep>
    </motion.div>
  )
}

/** Standalone CheckCircle component for consistent design across all layout elements */
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

const kpiBorderColors = [
  'border-t-primary-9',
  'border-t-purple-400',
  'border-t-indigo-500',
  'border-t-cyan-500',
  'border-t-red-500',
  'border-t-primary-9',
]

/** Render content inside each section dynamically based on component array */
function renderSectionBody(
  section: DashboardSectionGroup,
  isEditMode: boolean,
  onToggleKpi: (sectionId: string, kpiId: string) => void,
  onToggleInsight: (sectionId: string, insightId: string) => void,
  onToggleWidget: (sectionId: string, widgetId: string) => void,
) {
  const comps = section.components || []

  const kpiComp = comps.find((c) => c.type === 'kpi_grid')
  const layoutComps = comps.filter(
    (c) => c.type !== 'header' && c.type !== 'kpi_grid',
  )

  return (
    <div className='space-y-6'>
      {/* 1. KPI Cards Grid */}
      {kpiComp &&
        Array.isArray(kpiComp.kpis) &&
        (() => {
          const isKpiCompSelected = kpiComp.enabled !== false
          if (!isEditMode && !isKpiCompSelected) return null

          const visibleKpis = kpiComp.kpis.filter(
            (kpi) => isEditMode || kpi.enabled !== false,
          )
          if (visibleKpis.length === 0) return null

          return (
            <div
              className={cn(
                'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
                isEditMode && !isKpiCompSelected && 'opacity-50 grayscale',
              )}
            >
              {visibleKpis.map((kpi, kIdx) => {
                const isKpiSelected = kpi.enabled !== false
                return (
                  <div
                    key={kpi.id || `kpi-${kIdx}`}
                    className={cn(
                      'relative flex flex-col justify-between gap-2.5 rounded-xl border border-t-2 p-4 shadow-2xs transition-all select-none',
                      kpiBorderColors[kIdx % kpiBorderColors.length],
                      isEditMode
                        ? isKpiSelected
                          ? 'cursor-pointer border-border-default bg-surface hover:border-primary-9/40'
                          : 'cursor-pointer border-dashed border-border-default bg-gray-2/60 opacity-60 grayscale-[30%]'
                        : 'border-border-default bg-surface hover:border-primary-9/40',
                    )}
                    onClick={() => {
                      if (isEditMode) onToggleKpi(section.id, kpi.id)
                    }}
                  >
                    <div className='flex items-start justify-between gap-1'>
                      <span className='pr-4 text-[11px] leading-tight font-bold tracking-wider text-text-secondary uppercase'>
                        {kpi.title}
                      </span>
                      {isEditMode && (
                        <CheckCircle
                          className='size-4.5'
                          selected={isKpiSelected}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleKpi(section.id, kpi.id)
                          }}
                        />
                      )}
                    </div>
                    <span className='text-22 font-extrabold text-text-primary'>
                      {kpi.value}
                    </span>
                    <div className='flex items-center gap-1.5 text-11'>
                      <span
                        className={cn(
                          'font-bold',
                          kpi.isPositive ? 'text-green-9' : 'text-red-9',
                        )}
                      >
                        {kpi.trend}
                      </span>
                      <span className='font-medium text-text-secondary'>
                        {kpi.subtext}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

      {/* 2. Responsive Component Grid */}
      {layoutComps.length > 0 && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
          {layoutComps.map((comp) => {
            const isSelected = comp.enabled !== false
            if (!isEditMode && !isSelected) return null

            let colSpanClass = 'lg:col-span-4'
            if (comp.type === 'insights') colSpanClass = 'lg:col-span-8'
            else if (comp.type === 'table') colSpanClass = 'lg:col-span-12'
            else if (comp.type === 'bar_chart' || comp.type === 'area_chart')
              colSpanClass = 'lg:col-span-6'

            return (
              <div className={cn(colSpanClass, 'flex flex-col')} key={comp.id}>
                {renderWidgetComponent(
                  section.id,
                  comp,
                  isEditMode,
                  onToggleWidget,
                  onToggleInsight,
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Render individual widget components dynamically based on their type */
function renderWidgetComponent(
  sectionId: string,
  comp: DashboardWidgetComponent,
  isEditMode: boolean,
  onToggleWidget: (sectionId: string, widgetId: string) => void,
  onToggleInsight: (sectionId: string, insightId: string) => void,
) {
  const isSelected = comp.enabled !== false
  const wrapperClass = cn(
    'relative flex h-full flex-col justify-between rounded-xl border p-5 shadow-xs transition-all select-none',
    isEditMode
      ? isSelected
        ? 'cursor-pointer border-border-default bg-surface hover:border-primary-9/40'
        : 'cursor-pointer border-dashed border-border-default bg-gray-2/60 opacity-60 grayscale-[30%]'
      : 'border-border-default bg-surface',
  )

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (isEditMode) onToggleWidget(sectionId, comp.id)
  }

  const Header = () => (
    <div className='mb-4 flex items-start justify-between gap-3'>
      <div>
        <h4 className='flex items-center gap-2 text-14 font-semibold text-text-primary'>
          {comp.type === 'insights' && (
            <AiBrandIcon className='size-4 shrink-0' />
          )}
          {comp.title}
        </h4>
        <p className='text-11 text-text-secondary'>{comp.subtitle}</p>
      </div>
      <div className='flex items-center gap-2'>
        {comp.type === 'insights' && (
          <span className='border-orange-200 bg-orange-50/50 text-10 text-orange-600 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-bold tracking-wider uppercase'>
            <span className='bg-orange-500 size-1.5 animate-pulse rounded-full' />
            LIVE
          </span>
        )}
        {isEditMode && (
          <CheckCircle selected={isSelected} onClick={handleToggle} />
        )}
      </div>
    </div>
  )

  if (comp.type === 'insights' && Array.isArray(comp.insights)) {
    const visibleInsights = comp.insights.filter(
      (ins) => isEditMode || ins.enabled !== false,
    )
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <div className='mb-4 border-b border-border-default/40 pb-3'>
          <Header />
        </div>
        <div className='space-y-3.5 divide-y divide-border-default/40'>
          {visibleInsights.map((item, idx) => {
            const isItemEnabled = item.enabled !== false
            return (
              <div
                key={item.id || `ins-${idx}`}
                className={cn(
                  'flex items-start gap-3 pt-2 text-12 text-text-primary transition-all select-none first:pt-0',
                  isEditMode &&
                    'cursor-pointer rounded-lg p-1.5 hover:bg-gray-2/50',
                  isEditMode && !isItemEnabled && 'opacity-50 grayscale',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isEditMode) onToggleInsight(sectionId, item.id)
                }}
              >
                {isEditMode ? (
                  <CheckCircle
                    className='mt-0.5'
                    selected={isItemEnabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleInsight(sectionId, item.id)
                    }}
                  />
                ) : (
                  <span className='mt-0.5 flex size-4 shrink-0 items-center justify-center'>
                    <AiBrandIcon className='size-3.5 shrink-0' />
                  </span>
                )}
                <span className='flex-1 leading-relaxed'>{item.text}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (comp.type === 'pie_chart' && Array.isArray(comp.data)) {
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <Header />
        <div className='h-48 min-h-48 w-full flex-1'>
          <ResponsiveContainer height='100%' width='100%'>
            <PieChart>
              <Pie
                cx='50%'
                cy='50%'
                data={comp.data}
                dataKey='value'
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
              >
                {comp.data.map((_: any, index: number) => (
                  <Cell
                    fill={COLORS[index % COLORS.length]}
                    key={`cell-${index}`}
                  />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className='mt-2 space-y-1.5 text-11'>
          {comp.data.slice(0, 4).map((s: any, idx: number) => (
            <div
              className='flex items-center justify-between'
              key={s.name || idx}
            >
              <div className='flex items-center gap-2'>
                <div
                  className='size-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className='truncate font-medium text-text-primary'>
                  {s.name}
                </span>
              </div>
              <span className='shrink-0 pl-2 font-semibold text-text-secondary'>
                {s.amount || s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (comp.type === 'bar_chart' && Array.isArray(comp.data)) {
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <Header />
        <div className='h-60 min-h-60 w-full flex-1'>
          <ResponsiveContainer height='100%' width='100%'>
            <BarChart data={comp.data}>
              <CartesianGrid
                stroke='var(--border-default, #e5e7eb)'
                strokeDasharray='3 3'
              />
              <XAxis
                dataKey='name'
                fontSize={11}
                stroke='var(--text-secondary, #6b7280)'
              />
              <YAxis fontSize={11} stroke='var(--text-secondary, #6b7280)' />
              <RechartsTooltip />
              <Bar
                dataKey='value'
                fill='var(--primary-9, #4f46e5)'
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (comp.type === 'area_chart' && Array.isArray(comp.data)) {
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <Header />
        <div className='h-60 min-h-60 w-full flex-1'>
          <ResponsiveContainer height='100%' width='100%'>
            <AreaChart data={comp.data}>
              <CartesianGrid
                stroke='var(--border-default, #e5e7eb)'
                strokeDasharray='3 3'
              />
              <XAxis
                dataKey='name'
                fontSize={11}
                stroke='var(--text-secondary, #6b7280)'
              />
              <YAxis fontSize={11} stroke='var(--text-secondary, #6b7280)' />
              <RechartsTooltip />
              <Area
                dataKey='value'
                fill='var(--primary-3, #c7d2fe)'
                fillOpacity={0.4}
                stroke='var(--primary-9, #4f46e5)'
                type='monotone'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (comp.type === 'spend_tiles' && Array.isArray(comp.data)) {
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <Header />
        <div className='my-2 grid grid-cols-2 gap-2.5'>
          {comp.data.map((dept: any) => (
            <div
              className='flex flex-col justify-between rounded-xl border border-primary-9/20 bg-primary-3/15 p-3.5 transition-all hover:border-primary-9/40'
              key={dept.name}
            >
              <span className='truncate text-12 font-semibold text-primary-9'>
                {dept.name}
              </span>
              <div className='mt-3 flex items-baseline justify-between'>
                <span className='text-13 font-bold text-text-primary'>
                  {dept.amount || dept.value}
                </span>
                {dept.value !== undefined && (
                  <span className='text-10 pl-1 font-medium text-text-secondary'>
                    {dept.value}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (comp.type === 'table' && Array.isArray(comp.data)) {
    return (
      <div
        className={cn(wrapperClass, 'overflow-hidden p-0')}
        onClick={handleToggle}
      >
        <div className='border-b border-border-default bg-gray-2/50 p-4'>
          <Header />
        </div>
        <div className='flex-1 overflow-x-auto'>
          <table className='w-full text-left text-12 text-text-primary'>
            <thead className='border-b border-border-default bg-gray-2 text-11 font-medium text-text-secondary uppercase'>
              <tr>
                <th className='px-4 py-3'>ID</th>
                <th className='px-4 py-3'>Record Name</th>
                <th className='px-4 py-3'>Category</th>
                <th className='px-4 py-3'>Amount</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>Date</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border-default'>
              {comp.data.map((row: any) => (
                <tr
                  className='transition-colors hover:bg-gray-2/50'
                  key={row.id}
                >
                  <td className='px-4 py-3 font-mono font-medium text-primary-9'>
                    {row.id}
                  </td>
                  <td className='px-4 py-3 font-medium'>{row.title}</td>
                  <td className='px-4 py-3 text-text-secondary'>
                    {row.category}
                  </td>
                  <td className='px-4 py-3 font-semibold'>{row.amount}</td>
                  <td className='px-4 py-3'>
                    <span
                      className={cn(
                        'text-10 inline-flex items-center rounded-full px-2 py-0.5 font-semibold',
                        row.status === 'Approved' || row.status === 'Completed'
                          ? 'bg-green-3/30 text-green-9'
                          : row.status === 'Pending'
                            ? 'bg-amber-3/30 text-amber-9'
                            : 'bg-primary-3/30 text-primary-9',
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-text-secondary'>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return null
}
