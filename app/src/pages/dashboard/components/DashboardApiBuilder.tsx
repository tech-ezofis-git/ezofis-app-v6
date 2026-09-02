import { useLingui } from '@lingui/react/macro'
import { Check, RefreshCw, Send } from 'lucide-react'
import { motion } from 'motion/react'
import React, { useEffect, useState } from 'react'
import {
  type DashboardChart,
  type DashboardKpi,
  type DashboardSchemaResult,
  getDashboardHtml,
  getDashboardSchema,
} from '@/api/v6/dashboard'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

interface Props {
  repositoryId: string
  repositoryName: string
}

const STORAGE_PREFIX = 'dashboard_api_schema_'

export default function DashboardApiBuilder({
  repositoryId,
  repositoryName,
}: Props) {
  const { t } = useLingui()
  const storageKey = `${STORAGE_PREFIX}${repositoryId || repositoryName}`

  const [sessionId, setSessionId] = useState('')
  const [schema, setSchema] = useState<DashboardSchemaResult | null>(null)
  const [message, setMessage] = useState('')
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false)
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [html, setHtml] = useState('')

  const tenantId = authUserStore.getState().session?.tenantId || ''

  const runSchema = async (promptText?: string) => {
    const newSessionId = crypto.randomUUID()
    setSessionId(newSessionId)
    setIsGeneratingSchema(true)
    setHtml('')
    try {
      const res = await getDashboardSchema({
        message: promptText,
        repositoryId: repositoryId,
        sessionId: newSessionId,
        tenantId: tenantId,
      })
      if (res.error || !res.data) {
        showToast({
          message: res.error || t`Failed to generate dashboard schema`,
          variant: 'error',
        })
        return
      }
      setSchema(res.data.dashboard_result)
      localStorage.setItem(
        storageKey,
        JSON.stringify(res.data.dashboard_result),
      )
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
        message: 'apply',
        repositoryId: repositoryId,
        sessionId: session,
        tenantId: tenantId,
      })
      if (res.error) {
        showToast({ message: res.error, variant: 'error' })
        return
      }
      setHtml(res.html)
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  useEffect(() => {
    let active = true

    const initialize = async () => {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as DashboardSchemaResult
          if (parsed && Array.isArray(parsed.kpis)) {
            const newSessionId = crypto.randomUUID()
            if (!active) return
            setSchema(parsed)
            setSessionId(newSessionId)
            await runData(parsed, newSessionId)
            return
          }
        } catch (e) {
          console.warn('Failed to parse saved dashboard schema:', e)
        }
      }
      if (active) await runSchema()
    }

    void initialize()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId, storageKey])

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

  const handleApply = async () => {
    if (!schema || !sessionId) return
    localStorage.setItem(storageKey, JSON.stringify(schema))
    await runData(schema, sessionId)
    showToast({ message: t`Dashboard preview updated!`, variant: 'success' })
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
        <p className='text-13 font-bold text-text-primary'>{chart.title}</p>
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

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className='mx-auto max-w-6xl space-y-6 p-6'
      initial={{ opacity: 0, scale: 0.99, y: 15 }}
      key={`api-builder-${storageKey}`}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className='space-y-4 rounded-[16px] border border-primary-9/20 bg-primary-3/10 p-5 shadow-xs'>
        <div className='flex items-center gap-2 text-13 font-semibold text-primary-9'>
          <AiBrandIcon className='size-4 shrink-0' />
          <span>{t`Describe how you'd like the ${repositoryName} dashboard organized, then apply to preview.`}</span>
        </div>
        <div className='relative flex items-center'>
          <input
            className='w-full rounded-[12px] border border-border-default bg-surface py-2 pr-11 pl-4 text-13 text-text-primary shadow-2xs transition-all outline-none placeholder:text-gray-9 focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20'
            placeholder={t`Put overdue first in red. Donut on the left in blue...`}
            type='text'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSchema(message)
            }}
          />
          <button
            className='absolute right-2 flex size-4 items-center justify-center rounded-[3px] bg-primary-9 text-white shadow-2xs transition-all hover:bg-primary-10 active:scale-95 disabled:opacity-50'
            disabled={isGeneratingSchema}
            type='button'
            onClick={() => runSchema(message)}
          >
            {isGeneratingSchema ? (
              <RefreshCw className='size-2.5 animate-spin' />
            ) : (
              <Send className='size-2.5' />
            )}
          </button>
        </div>
      </div>

      {isGeneratingSchema ? (
        <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-primary-9/30 bg-primary-3/10 p-10 text-center shadow-xs'>
          <RefreshCw className='mb-3 size-8 animate-spin text-primary-9' />
          <h4 className='text-14 font-semibold text-text-primary'>
            {t`Generating dashboard schema...`}
          </h4>
        </div>
      ) : schema ? (
        <>
          <div className='space-y-3'>
            <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>{t`KPIs`}</span>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {schema.kpis.map(renderKpi)}
            </div>
          </div>

          <div className='space-y-3'>
            <span className='text-12 font-bold tracking-wider text-text-primary uppercase'>{t`Charts`}</span>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              {schema.charts.map(renderChart)}
            </div>
          </div>

          <div className='flex items-center justify-end gap-2.5 border-t border-border-default pt-2'>
            <Button
              disabled={isGeneratingHtml}
              icon='lucide:play'
              label={t`Apply & Preview`}
              size='md'
              onClick={handleApply}
            />
          </div>

          {isGeneratingHtml ? (
            <div className='my-2 flex flex-col items-center justify-center rounded-[16px] border border-primary-9/30 bg-primary-3/10 p-10 text-center shadow-xs'>
              <RefreshCw className='mb-3 size-8 animate-spin text-primary-9' />
              <h4 className='text-14 font-semibold text-text-primary'>{t`Rendering dashboard preview...`}</h4>
            </div>
          ) : html ? (
            <div
              className='rounded-[16px] border border-border-default bg-surface p-2 shadow-xs'
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
        </>
      ) : null}
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
