import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import StatusPill from '@/pages/reports/components/StatusPill'
import type { ReportHighlightOperator, ReportStatusRule } from '../../types'
import {
  HIGHLIGHT_COLOR_OPTIONS as STATUS_COLOR_OPTIONS,
  normalizeHighlightColor,
} from '../../highlightColors'

const uid = () => Math.random().toString(36).slice(2, 9)

interface Props {
  statusDefault: string | undefined
  statusRules: ReportStatusRule[]
  onChange: (patch: {
    statusDefault?: string
    statusRules?: ReportStatusRule[]
  }) => void
}

/**
 * Shared "status column" rule builder used by both the legacy
 * FieldSettingsPanel (DomainField) and the form-driven FormFieldSettingsPanel
 * (Question) — the rule shape is generic and identical for both.
 */
const StatusRulesEditor = ({ statusDefault, statusRules, onChange }: Props) => {
  const { t } = useLingui()

  const operatorOptions: { id: ReportHighlightOperator; name: string }[] = [
    { id: 'eq', name: t`Equals` },
    { id: 'neq', name: t`Not equals` },
    { id: 'contains', name: t`Contains` },
    { id: 'notContains', name: t`Not contains` },
    { id: 'gt', name: t`Greater than` },
    { id: 'gte', name: t`At least` },
    { id: 'lt', name: t`Less than` },
    { id: 'lte', name: t`At most` },
    { id: 'between', name: t`Between` },
    { id: 'empty', name: t`Is empty` },
    { id: 'notEmpty', name: t`Is not empty` },
  ]

  const updateRule = (id: string, patch: Partial<ReportStatusRule>) => {
    onChange({
      statusRules: statusRules.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule,
      ),
    })
  }

  return (
    <div className='col-span-1 flex flex-col gap-3 sm:col-span-2'>
      <div className='flex items-center justify-between'>
        <p className='text-13 font-medium text-gray-12'>{t`Status rules`}</p>
        <Button
          color='gray'
          icon='lucide:plus'
          label={t`Add rule`}
          size='xs'
          variant='outline'
          onClick={() =>
            onChange({
              statusRules: [
                ...statusRules,
                { color: 'gray', id: uid(), label: '', match: '' },
              ],
            })
          }
        />
      </div>

      {statusRules.length === 0 ? (
        <p className='text-12 text-gray-9'>{t`No rules yet. Values without a matching rule use the default color below.`}</p>
      ) : (
        <div className='flex flex-col gap-2'>
          {statusRules.map((rule) => (
            <div
              className='flex flex-wrap items-center gap-2 rounded-lg border border-gray-3 bg-gray-1/40 p-2 transition-colors hover:border-gray-4'
              key={rule.id}
            >
              <div className='w-36 shrink-0'>
                <InputSelect
                  options={operatorOptions}
                  value={
                    operatorOptions.find(
                      (o) => o.id === (rule.operator ?? 'eq'),
                    ) || null
                  }
                  onChange={(option) =>
                    updateRule(rule.id, {
                      operator: (option?.id ?? 'eq') as ReportHighlightOperator,
                    })
                  }
                />
              </div>
              {rule.operator !== 'empty' && rule.operator !== 'notEmpty' && (
                <div className='min-w-32 flex-1'>
                  <InputText
                    placeholder={
                      rule.compareField
                        ? t`Column: ${rule.compareField}`
                        : rule.operator === 'between'
                          ? t`Min`
                          : t`Value`
                    }
                    value={rule.match}
                    onChange={(value) => updateRule(rule.id, { match: value })}
                  />
                </div>
              )}
              {rule.operator === 'between' && (
                <div className='min-w-24 flex-1'>
                  <InputText
                    placeholder={t`Max`}
                    value={rule.value2 ?? ''}
                    onChange={(value) => updateRule(rule.id, { value2: value })}
                  />
                </div>
              )}
              <div className='min-w-32 flex-1'>
                <InputText
                  placeholder={t`Label (optional)`}
                  value={rule.label}
                  onChange={(value) => updateRule(rule.id, { label: value })}
                />
              </div>
              <div className='w-32 shrink-0'>
                <InputSelect
                  options={STATUS_COLOR_OPTIONS}
                  value={
                    STATUS_COLOR_OPTIONS.find(
                      (c) => c.id === normalizeHighlightColor(rule.color),
                    ) || null
                  }
                  onChange={(option) =>
                    updateRule(rule.id, {
                      color: String(option?.id || 'gray'),
                    })
                  }
                />
              </div>
              <StatusPill
                color={rule.color}
                label={rule.label || rule.match || t`Preview`}
              />
              <IconButton
                ariaLabel={t`Remove rule`}
                color='red'
                icon='lucide:trash-2'
                variant='ghost'
                onClick={() =>
                  onChange({
                    statusRules: statusRules.filter((r) => r.id !== rule.id),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className='w-40'>
        <InputSelect
          label={t`Default color`}
          options={STATUS_COLOR_OPTIONS}
          value={
            STATUS_COLOR_OPTIONS.find(
              (c) => c.id === normalizeHighlightColor(statusDefault),
            ) || null
          }
          onChange={(option) =>
            onChange({ statusDefault: String(option?.id || 'gray') })
          }
        />
      </div>
    </div>
  )
}

StatusRulesEditor.displayName = 'StatusRulesEditor'
export default StatusRulesEditor
