import {
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  Activity,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  LayoutDashboard,
  PieChart as PieIcon,
  RefreshCw,
  Send,
  Sliders,
  TrendingUp,
  ClipboardList,
  DollarSign,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import Button from '@/components/base/button/Button'
import CustomFilter from '@/components/common/CustomFilter'
import showToast from '@/components/base/toast/showToast'
import useDashboardStore from '@/pages/dashboard/stores/useDashboardStore'
import cn from '@/utils/cn'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  BuilderTimelineStep,
  type TimelineConnectorState,
  type TimelineStepStatus,
} from '@/pages/settings/components/Folders/AiFolderBuilderTimeline'
import {
  buildFallbackDashboardConfig,
  generateDashboardConfigViaGemini,
  generateRepositoryDescription,
  normalizeDashboardConfig,
  type DashboardAiConfig,
  type DashboardSectionGroup,
  type DashboardWidgetComponent,
} from '@/services/ai/dashboardAi'

interface Props {
  repositoryId: string
  repositoryName: string
}

const STORAGE_PREFIX = 'dashboard_ai_schema_'
const COLORS = ['var(--primary-9, #4f46e5)', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

/** Standalone CheckCircle component for consistent design across all layout elements */
function CheckCircle({
  selected,
  onClick,
  className,
}: {
  selected: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex size-5.5 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer select-none',
        selected
          ? 'bg-green-9 text-white shadow-2xs scale-100 animate-in zoom-in-75 duration-200'
          : 'border border-border-default bg-gray-3 text-transparent hover:border-gray-8 hover:text-gray-5',
        className,
      )}
    >
      <Check className='size-3.5 stroke-[3]' />
    </div>
  )
}

export default function DashboardAiBuilder({
  repositoryId,
  repositoryName,
}: Props) {
  const { t } = useLingui()
  const storageKey = `${STORAGE_PREFIX}${repositoryId || repositoryName}`

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
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false)
  const [hasGeneratedSections, setHasGeneratedSections] = useState(false)
  const [isFullDashboardView, setIsFullDashboardView] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [editableDesc, setEditableDesc] = useState('')

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

  // Load saved config or initialize default description & dashboard schema
  useEffect(() => {
    let active = true

    const initialize = async () => {
      const saved = localStorage.getItem(storageKey)

      if (saved) {
        try {
          const parsed = JSON.parse(saved) as DashboardAiConfig
          console.log('parsed', parsed)
          if (parsed && Array.isArray(parsed.sections)) {
            const normalized = normalizeDashboardConfig(parsed)
            if (active) {
              setConfig(normalized)
              setEditableDesc(normalized.description || '')
              setHasGeneratedSections(true)
              setIsFullDashboardView(true)
            }
            return
          }
        } catch (e) {
          console.warn('Failed to parse saved dashboard config:', e)
        }
      }

      if (active) {
        setIsGeneratingDesc(true)
        setIsGeneratingDashboard(true)
        setIsFullDashboardView(false)
        setActiveStep(1)
      }

      try {
        const desc = await generateRepositoryDescription(repositoryName)
        if (!active) return
        setEditableDesc(desc)
        setIsGeneratingDesc(false)

        const generated = await generateDashboardConfigViaGemini(
          repositoryName,
          desc,
        )
        if (!active) return
        setConfig(normalizeDashboardConfig(generated))
      } catch (err) {
        console.error('Error auto-generating dashboard:', err)
        const fallback = buildFallbackDashboardConfig(repositoryName, '')
        if (active) setConfig(normalizeDashboardConfig(fallback))
      } finally {
        if (active) {
          setIsGeneratingDesc(false)
          setIsGeneratingDashboard(false)
        }
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [repositoryId, repositoryName, storageKey])

  // Generate / Update Dashboard Schema with AI Prompt
  const handleGenerateDashboard = async (promptToUse?: string) => {
    const promptText = promptToUse || userPrompt
    setHasGeneratedSections(true)
    setIsGeneratingDashboard(true)
    try {
      const result = await generateDashboardConfigViaGemini(
        repositoryName,
        editableDesc,
        promptText,
      )
      setConfig(normalizeDashboardConfig(result))
      showToast({
        message: t`Dashboard layout updated!`,
        variant: 'success',
      })
    } catch (err) {
      console.error(err)
      setConfig(normalizeDashboardConfig(buildFallbackDashboardConfig(repositoryName, editableDesc)))
    } finally {
      setIsGeneratingDashboard(false)
    }
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
                kpi.id === kpiId ? { ...kpi, enabled: kpi.enabled === false } : kpi,
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
                item.id === insightId ? { ...item, enabled: item.enabled === false } : item,
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
            comp.id === widgetId ? { ...comp, enabled: comp.enabled === false } : comp,
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
        sec.id === sectionId ? { ...sec, isExpanded: sec.isExpanded === false } : sec,
      ),
    }
    setConfig(updated)
  }

  // Save Dashboard Config
  const handleSave = () => {
    if (!config) return
    const payload: DashboardAiConfig = normalizeDashboardConfig({
      ...config,
      description: editableDesc,
    })
    localStorage.setItem(storageKey, JSON.stringify(payload))
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
    toStep: number,
  ): TimelineConnectorState => {
    if (activeStep > fromStep) return 'completed'
    if (activeStep === fromStep) return 'loading'
    return 'idle'
  }

  const recommendationChips = [
    { label: t`✨ Recommend dashboard design`, prompt: 'Recommend 4 standard operational dashboard sections with real-time charts' },
    { label: t`By monthly trend analytics`, prompt: 'Focus on cash position, monthly payment trends, and liquidity forecasts' },
    { label: t`By risk & compliance`, prompt: 'Focus on vendor concentration, risk donut charts, and SLA delays' },
    { label: t`By department performance`, prompt: 'Focus on department spend tiles and approval efficiency table' },
  ]

  const sectionIconMap: Record<string, React.ReactNode> = {
    command_center: <LayoutDashboard className='size-4 text-primary-9' />,
    profitability_cash: <TrendingUp className='size-4 text-emerald-600' />,
    supplier_risk: <PieIcon className='size-4 text-amber-600' />,
    pipeline_oversight: <Activity className='size-4 text-cyan-600' />,
  }

  // Render Section Accordions with In-Place Edit Mode support
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
                <div className='flex items-center gap-3.5 min-w-0'>
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
                    <h3 className='text-15 font-bold text-text-primary flex items-center gap-2'>
                      {section.title}
                      {isEditMode && !isSectionEnabled && (
                        <span className='rounded-md bg-gray-3 px-2 py-0.5 text-10 font-semibold text-text-secondary uppercase tracking-wider'>
                          {t`Hidden in View`}
                        </span>
                      )}
                    </h3>
                    <p className='mt-0.5 text-12 text-primary-9/70 font-medium'>{section.subtitle}</p>
                  </div>
                </div>

                <div className='flex items-center gap-4'>
                  {/* Summary Metrics Badges */}
                  <div className='flex flex-wrap items-center gap-4 text-11'>
                    {section.summaryBadges?.map((badge, bIdx) => (
                      <div key={bIdx} className='flex flex-col text-right'>
                        <span className='font-medium text-text-secondary uppercase text-10 tracking-wider'>
                          {badge.label}
                        </span>
                        <span
                          className={cn(
                            'font-bold text-13',
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
                    type='button'
                    className='p-1 hover:bg-gray-3/50 rounded-lg transition-colors'
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleSectionExpand(section.id)
                    }}
                  >
                    {isOpen ? (
                      <ChevronUp className='size-5 text-primary-9 shrink-0' />
                    ) : (
                      <ChevronDown className='size-5 text-text-secondary shrink-0' />
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
  if (isFullDashboardView && config) {
    return (
      <motion.div
        key={`full-${storageKey}`}
        initial={{ opacity: 0, y: 15, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.99 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className='mx-auto max-w-[1600px] w-full space-y-6 p-6 md:p-8'
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
    <div className='flex items-start justify-between gap-4 p-4 rounded-xl border border-border-default bg-surface shadow-2xs'>
      <div className='space-y-1.5 min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span className='text-13 font-bold text-text-primary'>
            {repositoryName}
          </span>
        </div>
        <p className='text-12 text-text-secondary leading-relaxed line-clamp-2'>
          {editableDesc || t`Centralized repository for all incoming documentation and related analytics.`}
        </p>
      </div>
      <Button
        variant='outline'
        size='sm'
        label={t`Edit`}
        icon='lucide:pencil'
        onClick={() => setActiveStep(1)}
      />
    </div>
  )

  const step2Summary = (
    <div className='flex items-start justify-between gap-4 p-4 rounded-xl border border-border-default bg-surface shadow-2xs'>
      <div className='space-y-1.5 min-w-0 flex-1'>
        <span className='text-13 font-bold text-text-primary'>
          {t`Configured Dashboard Sections (${config?.sections.filter((s) => s.enabled !== false).length || 0} Components Selected)`}
        </span>
        <div className='flex flex-wrap gap-2 pt-1'>
          {config?.sections
            .filter((sec) => sec.enabled !== false)
            .map((sec) => (
              <span
                key={sec.id}
                className='inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-11 font-medium text-emerald-800'
              >
                <Check className='size-3 text-emerald-600 stroke-[3]' />
                {sec.title}
              </span>
            ))}
        </div>
        {userPrompt && (
          <p className='text-11 text-text-secondary italic pt-0.5'>
            Prompt: &quot;{userPrompt}&quot;
          </p>
        )}
      </div>
      <Button
        variant='outline'
        size='sm'
        label={t`Edit`}
        icon='lucide:pencil'
        onClick={() => setActiveStep(2)}
      />
    </div>
  )

  return (
    <motion.div
      key={`builder-${storageKey}`}
      initial={{ opacity: 0, y: 15, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.99 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className='mx-auto max-w-6xl space-y-6 p-6'
    >
      {/* PROCEDURE STEP 1: DASHBOARD CONFIGURATION */}
      <BuilderTimelineStep
        stepId={1}
        status={getStepStatus(1)}
        title={t`Dashboard Configuration`}
        description={t`Repository context and business scope.`}
        summary={step1Summary}
        showTopConnector={false}
        topConnectorState='hidden'
        bottomConnectorState={getConnectorState(1, 2)}
      >
        <div className='space-y-4 p-5'>
          <div className='flex items-center justify-between rounded-[14px] border border-primary-9/20 bg-primary-3/10 p-4 transition-all'>
            <div className='space-y-1 min-w-0 pr-4'>
              <div className='flex items-center gap-2'>
                <h2 className='text-15 font-semibold text-text-primary'>{repositoryName}</h2>
              </div>
              <p className='text-12 text-text-secondary line-clamp-2 leading-relaxed'>
                {editableDesc || t`Centralized repository for all incoming documentation and related analytics.`}
              </p>
            </div>
          </div>

          <div className='flex justify-end pt-2'>
            <Button
              label={t`Continue to Dashboard Designer`}
              suffixIcon='lucide:arrow-right'
              size='md'
              onClick={() => setActiveStep(2)}
            />
          </div>
        </div>
      </BuilderTimelineStep>

      {/* PROCEDURE STEP 2: AI DASHBOARD DESIGNER */}
      <BuilderTimelineStep
        stepId={2}
        status={getStepStatus(2)}
        title={t`AI Dashboard Designer`}
        description={t`Customize operational sections, analytics tiles, and visual components.`}
        summary={step2Summary}
        showTopConnector
        topConnectorState={getConnectorState(1, 2)}
        bottomConnectorState={getConnectorState(2, 3)}
      >
        <div className='space-y-5 p-5'>
          {/* AI Recommendation Box */}
          <div className='rounded-[16px] border border-primary-9/20 bg-primary-3/10 p-5 space-y-4 shadow-xs'>
            <div className='flex items-center gap-2 text-13 font-semibold text-primary-9'>
              <AiBrandIcon className='size-4 shrink-0' />
              <span>{t`How should your dashboard be organized? Choose a template or describe your custom design.`}</span>
            </div>

            {/* Recommendation Chips */}
            <div className='flex flex-wrap gap-2.5'>
              {recommendationChips.map((chip, idx) => (
                <button
                  key={idx}
                  type='button'
                  className='inline-flex items-center gap-1.5 rounded-full border border-primary-9/25 bg-surface px-3.5 py-1.5 text-12 font-medium text-primary-9 shadow-2xs transition-all hover:bg-primary-3/30 hover:border-primary-9 active:scale-95'
                  onClick={() => {
                    setUserPrompt(chip.prompt)
                    void handleGenerateDashboard(chip.prompt)
                  }}
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Interactive Prompt Input Box */}
            <div className='relative flex items-center'>
              <input
                type='text'
                className='w-full rounded-[12px] border border-border-default bg-surface py-2 pr-11 pl-4 text-13 text-text-primary outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20 shadow-2xs transition-all placeholder:text-gray-9'
                placeholder={t`Describe your custom dashboard design or metric requirements...`}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleGenerateDashboard()
                }}
              />
              <button
                type='button'
                className='absolute right-2 flex size-4 items-center justify-center rounded-[3px] bg-primary-9 text-white shadow-2xs transition-all hover:bg-primary-10 active:scale-95 disabled:opacity-50'
                disabled={isGeneratingDashboard}
                onClick={() => handleGenerateDashboard()}
              >
                {isGeneratingDashboard ? (
                  <RefreshCw className='size-2.5 animate-spin' />
                ) : (
                  <Send className='size-2.5' />
                )}
              </button>
            </div>
          </div>

          {/* Section Selection Cards Grid in Step 2 */}
          {!hasGeneratedSections ? (
            <div className='flex flex-col items-center justify-center rounded-[16px] border border-dashed border-border-default bg-gray-2/40 p-8 text-center transition-all my-2'>
              <div className='flex size-11 items-center justify-center rounded-2xl bg-primary-3/30 text-primary-9 border border-primary-9/20 mb-3 shadow-2xs'>
                <AiBrandIcon className='size-5 shrink-0' />
              </div>
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`Choose an AI design option or describe your dashboard needs`}
              </h4>
              <p className='mt-1 max-w-md text-12 text-text-secondary leading-relaxed'>
                {t`Select one of the recommendation chips above or enter a custom prompt in the input box. AI will generate layout options based on your selection.`}
              </p>
            </div>
          ) : isGeneratingDashboard ? (
            <div className='flex flex-col items-center justify-center rounded-[16px] border border-primary-9/30 bg-primary-3/10 p-10 text-center animate-in fade-in duration-300 my-2 shadow-xs'>
              <RefreshCw className='size-8 text-primary-9 animate-spin mb-3' />
              <h4 className='text-14 font-semibold text-text-primary'>
                {t`AI is generating customized layout sections...`}
              </h4>
              <p className='mt-1 text-12 text-text-secondary'>
                {t`Analyzing data structures for ${repositoryName}...`}
              </p>
            </div>
          ) : (
            <div className='space-y-3 pt-2 animate-in fade-in duration-300'>
              <div className='flex items-center justify-between'>
                <span className='text-12 font-bold text-text-primary uppercase tracking-wider'>
                  {t`Dashboard Components`}
                </span>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {config?.sections.map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      'relative flex cursor-pointer items-start gap-3.5 rounded-[14px] border p-4.5 pr-10 transition-all select-none',
                      section.enabled !== false
                        ? 'border-primary-9/40 bg-surface shadow-xs hover:border-primary-9 hover:shadow-md'
                        : 'border-border-default bg-gray-2 opacity-60 hover:opacity-100',
                    )}
                    onClick={() => handleToggleSectionEnabled(section.id)}
                  >
                    <CheckCircle
                      selected={section.enabled !== false}
                      className='absolute top-3.5 right-3.5'
                    />

                    <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-2 border border-border-default'>
                      {sectionIconMap[section.id] || <LayoutDashboard className='size-4 text-primary-9' />}
                    </div>

                    <div className='min-w-0 flex-1 space-y-1.5'>
                      <p className='text-13 font-bold text-text-primary truncate pr-2'>
                        {section.title}
                      </p>
                      <p className='text-11 text-text-secondary line-clamp-1 pr-2'>
                        {section.subtitle}
                      </p>

                      <div className='flex flex-wrap gap-1.5 pt-1'>
                        {section.summaryBadges?.map((badge, bIdx) => (
                          <span
                            key={bIdx}
                            className='rounded-md bg-gray-2 border border-border-default px-2 py-0.5 text-11 font-medium text-text-secondary'
                          >
                            {badge.label}: <strong className='text-12 font-bold text-text-primary ml-0.5'>{badge.value}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className='flex items-center justify-between pt-4 border-t border-border-default'>
            <Button
              label={t`Back to Configuration`}
              icon='lucide:arrow-left'
              variant='outline'
              size='md'
              onClick={() => setActiveStep(1)}
            />
            <Button
              label={t`Generate Dashboard Design`}
              suffixIcon='lucide:arrow-right'
              size='md'
              onClick={() => setActiveStep(3)}
            />
          </div>
        </div>
      </BuilderTimelineStep>

      {/* PROCEDURE STEP 3: LIVE DASHBOARD PREVIEW & ACTIVATION */}
      <BuilderTimelineStep
        stepId={3}
        status={getStepStatus(3)}
        title={t`Dashboard Preview & Activation`}
        description={t`Interactive preview of your customized dashboard design for ${repositoryName}.`}
        showTopConnector
        topConnectorState={getConnectorState(2, 3)}
        bottomConnectorState='hidden'
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
              <Button
                label={isEditMode ? t`View Mode` : t`Customize Design`}
                icon={isEditMode ? 'lucide:eye' : 'lucide:edit-3'}
                variant={isEditMode ? 'solid' : 'outline'}
                size='sm'
                onClick={() => setIsEditMode((prev) => !prev)}
              />
              <Button
                label={t`Save Dashboard`}
                icon='lucide:save'
                size='sm'
                onClick={handleSave}
              />
            </div>
          </div>

          {/* Edit Mode Contextual Banner */}
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-9/30 bg-primary-3/15 px-4.5 py-3 text-12 shadow-xs'
            >
              <div className='flex items-center gap-2.5 text-primary-9 font-medium'>
                <AiBrandIcon className='size-4 shrink-0' />
                <span>
                  {t`Edit Mode Active — Click the check circle on any section, KPI tile, AI insight line, or chart card to unselect unwanted items. Switch to View Mode to preview your custom layout.`}
                </span>
              </div>
              <Button
                label={t`Done Customizing`}
                icon='lucide:check'
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
        </div>
      </BuilderTimelineStep>
    </motion.div>
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
    'relative rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all select-none h-full',
    isEditMode
      ? isSelected
        ? 'border-border-default bg-surface hover:border-primary-9/40 cursor-pointer'
        : 'border-dashed border-border-default bg-gray-2/60 opacity-60 grayscale-[30%] cursor-pointer'
      : 'border-border-default bg-surface',
  )

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (isEditMode) onToggleWidget(sectionId, comp.id)
  }

  const Header = () => (
    <div className='flex items-start justify-between gap-3 mb-4'>
      <div>
        <h4 className='text-14 font-semibold text-text-primary flex items-center gap-2'>
          {comp.type === 'insights' && <AiBrandIcon className='size-4 shrink-0' />}
          {comp.title}
        </h4>
        <p className='text-11 text-text-secondary'>{comp.subtitle}</p>
      </div>
      <div className='flex items-center gap-2'>
        {comp.type === 'insights' && (
          <span className='rounded-full border border-orange-200 bg-orange-50/50 px-2.5 py-0.5 text-10 font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5'>
            <span className='size-1.5 rounded-full bg-orange-500 animate-pulse' />
            LIVE
          </span>
        )}
        {isEditMode && <CheckCircle selected={isSelected} onClick={handleToggle} />}
      </div>
    </div>
  )

  if (comp.type === 'insights' && Array.isArray(comp.insights)) {
    const visibleInsights = comp.insights.filter(ins => isEditMode || ins.enabled !== false)
    return (
      <div className={wrapperClass} onClick={handleToggle}>
        <div className='border-b border-border-default/40 pb-3 mb-4'>
          <Header />
        </div>
        <div className='space-y-3.5 divide-y divide-border-default/40'>
          {visibleInsights.map((item, idx) => {
            const isItemEnabled = item.enabled !== false
            return (
              <div
                key={item.id || `ins-${idx}`}
                className={cn(
                  'flex items-start gap-3 pt-2 text-12 text-text-primary first:pt-0 transition-all select-none',
                  isEditMode && 'cursor-pointer hover:bg-gray-2/50 p-1.5 rounded-lg',
                  isEditMode && !isItemEnabled && 'opacity-50 grayscale',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  if (isEditMode) onToggleInsight(sectionId, item.id)
                }}
              >
                {isEditMode ? (
                  <CheckCircle
                    selected={isItemEnabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleInsight(sectionId, item.id)
                    }}
                    className='mt-0.5'
                  />
                ) : (
                  <span className='mt-0.5 flex size-4 shrink-0 items-center justify-center'>
                    <AiBrandIcon className='size-3.5 shrink-0' />
                  </span>
                )}
                <span className='leading-relaxed flex-1'>{item.text}</span>
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
        <div className='h-48 w-full flex-1 min-h-48'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={comp.data}
                cx='50%'
                cy='50%'
                innerRadius={45}
                outerRadius={70}
                paddingAngle={4}
                dataKey='value'
              >
                {comp.data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className='mt-2 space-y-1.5 text-11'>
          {comp.data.slice(0, 4).map((s: any, idx: number) => (
            <div key={s.name || idx} className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <div
                  className='size-2.5 rounded-full shrink-0'
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className='text-text-primary font-medium truncate'>{s.name}</span>
              </div>
              <span className='font-semibold text-text-secondary shrink-0 pl-2'>{s.amount || s.value}</span>
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
        <div className='h-60 w-full flex-1 min-h-60'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={comp.data}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border-default, #e5e7eb)' />
              <XAxis dataKey='name' stroke='var(--text-secondary, #6b7280)' fontSize={11} />
              <YAxis stroke='var(--text-secondary, #6b7280)' fontSize={11} />
              <RechartsTooltip />
              <Bar dataKey='value' fill='var(--primary-9, #4f46e5)' radius={[4, 4, 0, 0]} />
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
        <div className='h-60 w-full flex-1 min-h-60'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={comp.data}>
              <CartesianGrid strokeDasharray='3 3' stroke='var(--border-default, #e5e7eb)' />
              <XAxis dataKey='name' stroke='var(--text-secondary, #6b7280)' fontSize={11} />
              <YAxis stroke='var(--text-secondary, #6b7280)' fontSize={11} />
              <RechartsTooltip />
              <Area
                type='monotone'
                dataKey='value'
                stroke='var(--primary-9, #4f46e5)'
                fill='var(--primary-3, #c7d2fe)'
                fillOpacity={0.4}
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
        <div className='grid grid-cols-2 gap-2.5 my-2'>
          {comp.data.map((dept: any) => (
            <div
              key={dept.name}
              className='flex flex-col justify-between rounded-xl border border-primary-9/20 bg-primary-3/15 p-3.5 transition-all hover:border-primary-9/40'
            >
              <span className='text-12 font-semibold text-primary-9 truncate'>{dept.name}</span>
              <div className='mt-3 flex items-baseline justify-between'>
                <span className='text-13 font-bold text-text-primary'>{dept.amount || dept.value}</span>
                {dept.value !== undefined && <span className='text-10 font-medium text-text-secondary pl-1'>{dept.value}%</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (comp.type === 'table' && Array.isArray(comp.data)) {
    return (
      <div className={cn(wrapperClass, 'p-0 overflow-hidden')} onClick={handleToggle}>
        <div className='p-4 bg-gray-2/50 border-b border-border-default'>
          <Header />
        </div>
        <div className='overflow-x-auto flex-1'>
          <table className='w-full text-left text-12 text-text-primary'>
            <thead className='bg-gray-2 text-11 font-medium text-text-secondary uppercase border-b border-border-default'>
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
                <tr key={row.id} className='hover:bg-gray-2/50 transition-colors'>
                  <td className='px-4 py-3 font-mono font-medium text-primary-9'>{row.id}</td>
                  <td className='px-4 py-3 font-medium'>{row.title}</td>
                  <td className='px-4 py-3 text-text-secondary'>{row.category}</td>
                  <td className='px-4 py-3 font-semibold'>{row.amount}</td>
                  <td className='px-4 py-3'>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-10 font-semibold',
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

/** Render content inside each section dynamically based on component array */
function renderSectionBody(
  section: DashboardSectionGroup,
  isEditMode: boolean,
  onToggleKpi: (sectionId: string, kpiId: string) => void,
  onToggleInsight: (sectionId: string, insightId: string) => void,
  onToggleWidget: (sectionId: string, widgetId: string) => void,
) {
  const comps = section.components || []

  const kpiComp = comps.find(c => c.type === 'kpi_grid')
  const layoutComps = comps.filter(c => c.type !== 'header' && c.type !== 'kpi_grid')

  return (
    <div className='space-y-6'>
      {/* 1. KPI Cards Grid */}
      {kpiComp && Array.isArray(kpiComp.kpis) && (() => {
        const isKpiCompSelected = kpiComp.enabled !== false
        if (!isEditMode && !isKpiCompSelected) return null

        const visibleKpis = kpiComp.kpis.filter((kpi) => isEditMode || kpi.enabled !== false)
        if (visibleKpis.length === 0) return null

        return (
          <div className={cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
            isEditMode && !isKpiCompSelected && 'opacity-50 grayscale'
          )}>
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
                        ? 'border-border-default bg-surface hover:border-primary-9/40 cursor-pointer'
                        : 'border-dashed border-border-default bg-gray-2/60 opacity-60 grayscale-[30%] cursor-pointer'
                      : 'border-border-default bg-surface hover:border-primary-9/40',
                  )}
                  onClick={() => {
                    if (isEditMode) onToggleKpi(section.id, kpi.id)
                  }}
                >
                  <div className='flex items-start justify-between gap-1'>
                    <span className='text-[11px] font-bold tracking-wider text-text-secondary uppercase leading-tight pr-4'>
                      {kpi.title}
                    </span>
                    {isEditMode && (
                      <CheckCircle
                        selected={isKpiSelected}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleKpi(section.id, kpi.id)
                        }}
                        className='size-4.5'
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
                    <span className='text-text-secondary font-medium'>{kpi.subtext}</span>
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
            else if (comp.type === 'bar_chart' || comp.type === 'area_chart') colSpanClass = 'lg:col-span-6'

            return (
              <div key={comp.id} className={cn(colSpanClass, 'flex flex-col')}>
                {renderWidgetComponent(section.id, comp, isEditMode, onToggleWidget, onToggleInsight)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
