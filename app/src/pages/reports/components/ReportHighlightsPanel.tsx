import { useLingui } from '@lingui/react/macro'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { ReportSpec, ReportSpecHighlight } from '@/api/v6/reportAgent'
import type {
  Report,
  ReportFieldSetting,
  ReportStatusRule,
} from '@/pages/report-builder/types'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import InputSelect from '@/components/base/inputs/InputSelect'
import showToast from '@/components/base/toast/showToast'
import StatusRulesEditor from '@/pages/report-builder/components/steps/StatusRulesEditor'
import { useSaveReportHighlightsMutation } from '@/pages/report-builder/hooks/useReportBuilderApi'
import { fieldSettingToHighlight } from '@/pages/report-builder/utils/agentReport'

interface ColumnRules {
  statusRules: ReportStatusRule[]
  statusDefault?: string
}

interface Props {
  report: Report
  onClose: () => void
}

/** The status rules a saved column already carries (its highlight). */
const rulesOf = (key: string, setting?: ReportFieldSetting): ColumnRules =>
  setting?.colType === 'status' && setting.statusBase === key
    ? {
        statusDefault: setting.statusDefault,
        statusRules: setting.statusRules ?? [],
      }
    : { statusRules: [] }

/**
 * Inline editor for the column highlights of a saved AI report, default
 * reports included: pick a column, edit its rules (the wizard's editor), save.
 */
const ReportHighlightsPanel = ({ report, onClose }: Props) => {
  const { t } = useLingui()
  const saveMutation = useSaveReportHighlightsMutation()

  const columns: Option[] = useMemo(() => {
    const spec = report.agentConfig?.reportSpec as unknown as
      | ReportSpec
      | undefined
    return (spec?.columns ?? []).map((column) => ({
      id: column.key,
      name: column.label || column.key,
    }))
  }, [report.agentConfig])

  const [rules, setRules] = useState<Record<string, ColumnRules>>(() =>
    Object.fromEntries(
      columns.map((column) => [
        String(column.id),
        rulesOf(String(column.id), report.fieldSettings[String(column.id)]),
      ]),
    ),
  )
  const [selected, setSelected] = useState<Option | null>(columns[0] ?? null)
  const selectedKey = selected ? String(selected.id) : ''
  const highlightedNames = columns
    .filter((column) => rules[String(column.id)]?.statusRules.length)
    .map((column) => column.name)
    .join(', ')

  const save = async () => {
    const payload: Record<string, ReportSpecHighlight | null> = {}
    columns.forEach((column) => {
      const key = String(column.id)
      const current = rules[key] ?? { statusRules: [] }
      payload[key] = fieldSettingToHighlight(key, {
        calc: 'None',
        colType: 'status',
        label: String(column.name),
        statusBase: key,
        statusDefault: current.statusDefault,
        statusRules: current.statusRules,
        width: 160,
      })
    })
    try {
      await saveMutation.mutateAsync({ columns: payload, id: report.id })
      showToast({ message: t`Highlights saved`, variant: 'success' })
      onClose()
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : t`Failed to save the highlights`,
        variant: 'error',
      })
    }
  }

  return (
    <motion.div
      animate={{ height: 'auto', opacity: 1 }}
      className='bg-surface-1 mb-3 overflow-hidden rounded-lg border border-gray-4 p-4'
      initial={{ height: 0, opacity: 0 }}
    >
      <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-14 font-semibold text-gray-13'>{t`Column highlights`}</h3>
          <p className='text-12 text-gray-10'>
            {t`Color a column's cells by a condition, e.g. Days Pending greater than 30 in red.`}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            color='gray'
            label={t`Cancel`}
            size='sm'
            variant='outline'
            onClick={onClose}
          />
          <Button
            label={t`Save highlights`}
            loading={saveMutation.isPending}
            size='sm'
            onClick={() => void save()}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-[16rem_1fr]'>
        <div className='flex flex-col gap-2'>
          <InputSelect
            label={t`Column`}
            options={columns}
            value={selected}
            onChange={setSelected}
          />
          {highlightedNames && (
            <p className='text-12 text-gray-10'>
              {t`Highlighted: ${highlightedNames}`}
            </p>
          )}
        </div>
        {selectedKey && (
          <StatusRulesEditor
            key={selectedKey}
            statusDefault={rules[selectedKey]?.statusDefault}
            statusRules={rules[selectedKey]?.statusRules ?? []}
            onChange={(patch) =>
              setRules((previous) => ({
                ...previous,
                [selectedKey]: {
                  ...(previous[selectedKey] ?? { statusRules: [] }),
                  ...patch,
                },
              }))
            }
          />
        )}
      </div>
    </motion.div>
  )
}

ReportHighlightsPanel.displayName = 'ReportHighlightsPanel'
export default ReportHighlightsPanel
