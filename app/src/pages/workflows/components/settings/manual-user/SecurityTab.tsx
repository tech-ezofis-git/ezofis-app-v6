import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import { generateId } from '../../../utils/generateId'
import SettingsSection from '../common/SettingsSection'

interface AccessRule {
  id: string
  userId: string
  formFields: string[]
}

const accessModeOptions: Option[] = [
  { id: 'ALL', name: 'All fields' },
  { id: 'NONE', name: 'No fields' },
  { id: 'CUSTOM', name: 'Custom, per user' },
]

function AccessRuleEditor({
  fieldOptions,
  rules,
  userOptions,
  onChange,
}: {
  fieldOptions: Option[]
  rules: AccessRule[]
  userOptions: Option[]
  onChange: (rules: AccessRule[]) => void
}) {
  const addRule = () =>
    onChange([...rules, { id: generateId(), userId: '', formFields: [] }])
  const removeRule = (id: string) =>
    onChange(rules.filter((r) => r.id !== id))
  const updateRule = (id: string, patch: Partial<AccessRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <div className='space-y-2'>
      {rules.map((rule) => (
        <div
          className='flex items-start gap-2 rounded-xl bg-white p-3 shadow-sm'
          key={rule.id}
        >
          <div className='grid flex-1 grid-cols-2 gap-2'>
            <InputSelect
              options={userOptions}
              placeholder='User'
              searchable
              value={
                userOptions.find((o) => String(o.id) === rule.userId) || null
              }
              onChange={(val) =>
                updateRule(rule.id, { userId: val ? String(val.id) : '' })
              }
            />
            <InputSelectMultiple
              options={fieldOptions}
              placeholder='Form fields'
              searchable
              value={fieldOptions.filter((f) =>
                rule.formFields.includes(String(f.id)),
              )}
              onChange={(val) =>
                updateRule(rule.id, {
                  formFields: val.map((v) => String(v.id)),
                })
              }
            />
          </div>
          <button
            className='text-gray-400 hover:text-red-500 mt-1.5 shrink-0 p-1 transition-colors'
            title='Remove rule'
            onClick={() => removeRule(rule.id)}
          >
            <Icon className='h-4 w-4' name='lucide:x' />
          </button>
        </div>
      ))}
      <button
        className='border-gray-300 text-slate-500 hover:bg-blue-50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2 text-12 font-medium transition-all hover:border-[#1677ff] hover:text-[#1677ff] active:scale-[0.99]'
        onClick={addRule}
      >
        <Icon className='h-3.5 w-3.5' name='lucide:plus' />
        <span>Add Rule</span>
      </button>
    </div>
  )
}

interface SecurityTabProps {
  fieldOptions: Option[]
  nodeData: Record<string, any>
  userOptions: Option[]
  updateNodeData: (key: string, value: any) => void
}

export default function SecurityTab({
  fieldOptions,
  nodeData,
  userOptions,
  updateNodeData,
}: SecurityTabProps) {
  const formEditAccess = nodeData.formEditAccess || 'ALL'
  const formVisibilityAccess = nodeData.formVisibilityAccess || 'ALL'
  const formEditControls: AccessRule[] = Array.isArray(
    nodeData.formEditControls,
  )
    ? nodeData.formEditControls
    : []
  const formSecureControls: AccessRule[] = Array.isArray(
    nodeData.formSecureControls,
  )
    ? nodeData.formSecureControls
    : []
  const mandatoryFields: Option[] = Array.isArray(nodeData.mandatoryFields)
    ? fieldOptions.filter((f) =>
        nodeData.mandatoryFields.includes(String(f.id)),
      )
    : []

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='space-y-3 rounded-xl bg-[#F8FAFC] p-3'>
        <div className='flex items-center gap-2.5 px-1'>
          <Icon className='text-purple-600 h-4 w-4' name='lucide:edit-3' />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              Editable Fields
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              Which fields this user can edit at this step
            </span>
          </div>
        </div>
        <InputSelect
          className='bg-white'
          options={accessModeOptions}
          value={
            accessModeOptions.find((o) => o.id === formEditAccess) || null
          }
          onChange={(val) => updateNodeData('formEditAccess', val?.id ?? 'ALL')}
        />
        {formEditAccess === 'CUSTOM' && (
          <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
            <AccessRuleEditor
              fieldOptions={fieldOptions}
              rules={formEditControls}
              userOptions={userOptions}
              onChange={(rules) => updateNodeData('formEditControls', rules)}
            />
          </div>
        )}
      </div>

      <div className='space-y-3 rounded-xl bg-[#F8FAFC] p-3'>
        <div className='flex items-center gap-2.5 px-1'>
          <Icon className='text-blue-600 h-4 w-4' name='lucide:eye' />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              Visible Fields
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              Which fields are shown or hidden for this user
            </span>
          </div>
        </div>
        <InputSelect
          className='bg-white'
          options={accessModeOptions}
          value={
            accessModeOptions.find((o) => o.id === formVisibilityAccess) ||
            null
          }
          onChange={(val) =>
            updateNodeData('formVisibilityAccess', val?.id ?? 'ALL')
          }
        />
        {formVisibilityAccess === 'CUSTOM' && (
          <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
            <AccessRuleEditor
              fieldOptions={fieldOptions}
              rules={formSecureControls}
              userOptions={userOptions}
              onChange={(rules) =>
                updateNodeData('formSecureControls', rules)
              }
            />
          </div>
        )}
      </div>

      <div className='space-y-2 rounded-xl bg-[#F8FAFC] p-3'>
        <InputLabel label='Mandatory Fields' />
        <span className='block text-11 leading-tight text-gray-9'>
          These fields must be filled before the step can be completed
        </span>
        <InputSelectMultiple
          className='bg-white'
          options={fieldOptions}
          placeholder='Select fields...'
          value={mandatoryFields}
          clearable
          searchable
          onChange={(val) =>
            updateNodeData(
              'mandatoryFields',
              val.map((v) => String(v.id)),
            )
          }
        />
      </div>
    </div>
  )
}
