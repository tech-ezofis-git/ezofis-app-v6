import { Button } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import {
  generateId,
  type LogicRule,
  type Panel,
  useFormStore,
} from '@/pages/form-builder/store/formStore'
import { getFieldOptions } from '@/pages/requests/components/workflow-request/utils/fieldRendering'
import type { Option } from '@/types/option'
import cn from '@/utils/cn'

interface Props {
  panel: Panel
  onBack: () => void
}

const CONDITION_OPTIONS: Option[] = [
  { id: 'IS', name: 'is' },
  { id: 'IS_NOT', name: 'is not' },
  { id: 'CONTAINS', name: 'contains' },
  { id: 'NOT_CONTAINS', name: 'does not contain' },
  { id: 'GT', name: 'is greater than' },
  { id: 'LT', name: 'is less than' },
  { id: 'EMPTY', name: 'is empty' },
  { id: 'NOT_EMPTY', name: 'is not empty' },
]

const ACTION_OPTIONS: Option[] = [
  { id: 'SHOW', name: 'Show' },
  { id: 'HIDE', name: 'Hide' },
  { id: 'ENABLE', name: 'Enable' },
  { id: 'DISABLE', name: 'Disable' },
]

const CHOICE_TYPES = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'YES_NO_TOGGLE',
]

const NON_INPUT_TYPES = ['DIVIDER', 'LABEL', 'HEADING', 'TEXT_BUILDER']

const SectionLogic = ({ onBack, panel }: Props) => {
  const panels = useFormStore((s) => s.panels)
  const updatePanel = useFormStore((s) => s.updatePanel)

  const rules: LogicRule[] = panel.settings.logic || []

  // Rules can only look at fields from other sections (a section can't react
  // to its own fields, otherwise hiding it would remove the trigger).
  const sourceFields = panels
    .filter((p) => p.id !== panel.id)
    .flatMap((p) => p.fields || [])
    .filter((q) => q?.id && !NON_INPUT_TYPES.includes(q.type))
  const fieldOptions: Option[] = sourceFields.map((q) => ({
    id: q.id,
    name: q.label || 'Untitled Field',
  }))

  const setRules = (next: LogicRule[]) => updatePanel(panel.id, { logic: next })

  const addRule = () =>
    setRules([
      ...rules,
      {
        action: 'SHOW',
        condition: 'IS',
        fieldId: String(fieldOptions[0]?.id ?? ''),
        id: generateId(),
        value: '',
      },
    ])

  const updateRule = (id: string, updates: Partial<LogicRule>) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)))

  const removeRule = (id: string) => setRules(rules.filter((r) => r.id !== id))

  return (
    <div className='animate-in fade-in slide-in-from-top-1 mx-4 mb-2 space-y-2.5 rounded-xl border border-gray-2 bg-surface-muted/50 p-3 duration-200'>
      <div className='flex items-start gap-2'>
        <button
          className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-gray-10 transition-all hover:bg-gray-2 hover:text-gray-13 active:scale-95'
          title='Back to fields'
          onClick={onBack}
        >
          <Icon height={16} name='lucide:arrow-left' width={16} />
        </button>
        <div>
          <div className='text-xs font-bold text-gray-12'>Section Logic</div>
          <div className='text-[11px] text-gray-6'>
            Show, hide, enable or disable this whole section based on other
            answers. Multiple rules are combined: any matching Show/Enable rule
            wins over Hide/Disable.
          </div>
        </div>
      </div>

      {fieldOptions.length === 0 && (
        <div className='text-[11px] text-gray-5 italic'>
          Add a field to another section to create a rule.
        </div>
      )}

      {rules.map((rule, idx) => {
        const needsValue = !['EMPTY', 'NOT_EMPTY'].includes(rule.condition)
        const sourceField = sourceFields.find((q) => q.id === rule.fieldId)
        const valueOptions: Option[] =
          sourceField && CHOICE_TYPES.includes(sourceField.type)
            ? getFieldOptions(sourceField).map((o) => ({
                id: String(o.id ?? o.name),
                name: String(o.name ?? o.id),
              }))
            : []

        return (
          <div
            className='space-y-2 rounded-xl border border-gray-1 bg-surface p-3 shadow-sm'
            key={rule.id}
          >
            <div className='flex items-center justify-between'>
              <span className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                {idx === 0 ? 'If' : 'Or if'}
              </span>
              <button
                className='text-gray-4 transition-colors hover:text-red-9 active:scale-95'
                title='Remove rule'
                onClick={() => removeRule(rule.id)}
              >
                <Icon height={13} name='lucide:x' width={13} />
              </button>
            </div>

            <InputSelect
              options={fieldOptions}
              placeholder='Select a field'
              searchable
              value={fieldOptions.find((o) => o.id === rule.fieldId) || null}
              onChange={(val) =>
                val &&
                updateRule(rule.id, { fieldId: String(val.id), value: '' })
              }
            />

            <div
              className={cn(
                'grid gap-2',
                needsValue ? 'grid-cols-2' : 'grid-cols-1',
              )}
            >
              <InputSelect
                options={CONDITION_OPTIONS}
                value={
                  CONDITION_OPTIONS.find((o) => o.id === rule.condition) ||
                  CONDITION_OPTIONS[0]
                }
                onChange={(val) =>
                  val &&
                  updateRule(rule.id, {
                    condition: val.id as LogicRule['condition'],
                  })
                }
              />
              {needsValue &&
                (valueOptions.length > 0 ? (
                  <InputSelect
                    options={valueOptions}
                    placeholder='Select option'
                    value={
                      valueOptions.find((o) => o.name === rule.value) || null
                    }
                    onChange={(val) =>
                      val && updateRule(rule.id, { value: String(val.name) })
                    }
                  />
                ) : (
                  <InputText
                    placeholder='Value'
                    value={rule.value ?? ''}
                    onChange={(val: string) =>
                      updateRule(rule.id, { value: val })
                    }
                  />
                ))}
            </div>

            <div className='flex items-center gap-2 border-t border-dashed border-gray-1 pt-2'>
              <span className='text-[10px] font-bold tracking-wider text-gray-5 uppercase'>
                Then
              </span>
              <div className='flex-1'>
                <InputSelect
                  options={ACTION_OPTIONS}
                  value={
                    ACTION_OPTIONS.find((o) => o.id === rule.action) ||
                    ACTION_OPTIONS[0]
                  }
                  onChange={(val) =>
                    val &&
                    updateRule(rule.id, {
                      action: val.id as LogicRule['action'],
                    })
                  }
                />
              </div>
              <span className='shrink-0 text-[11px] text-gray-6'>
                this section
              </span>
            </div>
          </div>
        )
      })}

      <Button
        className='w-full border border-dashed border-gray-2 bg-surface transition-all active:scale-[0.99]'
        color='gray'
        disabled={fieldOptions.length === 0}
        size='xs'
        variant='subtle'
        fullWidth
        leftSection={<Icon height={12} name='lucide:plus' width={12} />}
        onClick={addRule}
      >
        {rules.length === 0 ? 'Add Rule' : 'Add Another Rule'}
      </Button>
    </div>
  )
}

export default SectionLogic
