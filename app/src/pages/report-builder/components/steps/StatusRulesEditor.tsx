import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import type { ReportStatusRule } from '../../types'

const STATUS_COLOR_OPTIONS = [
  { id: 'gray', name: 'Gray' },
  { id: 'green', name: 'Green' },
  { id: 'blue', name: 'Blue' },
  { id: 'orange', name: 'Orange' },
  { id: 'red', name: 'Red' },
]

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
            <div className='flex items-center gap-2' key={rule.id}>
              <InputText
                placeholder={t`Value equals...`}
                value={rule.match}
                onChange={(value) => updateRule(rule.id, { match: value })}
              />
              <InputText
                placeholder={t`Label`}
                value={rule.label}
                onChange={(value) => updateRule(rule.id, { label: value })}
              />
              <div className='w-32 shrink-0'>
                <InputSelect
                  options={STATUS_COLOR_OPTIONS}
                  value={
                    STATUS_COLOR_OPTIONS.find((c) => c.id === rule.color) ||
                    null
                  }
                  onChange={(option) =>
                    updateRule(rule.id, {
                      color: String(option?.id || 'gray'),
                    })
                  }
                />
              </div>
              <IconButton
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
              (c) => c.id === (statusDefault || 'gray'),
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
