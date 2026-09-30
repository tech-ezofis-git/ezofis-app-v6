import { useMemo } from 'react'
import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import { generateId } from '../../../utils/generateId'

interface AccessRule {
  formFields: string[]
  id: string
  userId: string
}

const accessModeOptions: Option[] = [
  { id: 'ALL', name: 'All fields' },
  { id: 'NONE', name: 'No fields' },
  { id: 'CUSTOM', name: 'Custom' },
]

interface SecurityTabProps {
  fieldOptions: Option[]
  nodeData: Record<string, any>
  userOptions: Option[]
  assignedUsers?: Option[]
  updateNodeData: (key: string, value: any) => void
}

export default function SecurityTab({
  assignedUsers = [],
  fieldOptions,
  nodeData,
  updateNodeData,
  userOptions,
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

  const effectiveAssignedUsers = useMemo(() => {
    if (Array.isArray(assignedUsers) && assignedUsers.length > 0) {
      return assignedUsers
    }
    if (
      Array.isArray(nodeData.selectedUsers) &&
      nodeData.selectedUsers.length > 0
    ) {
      return nodeData.selectedUsers
    }
    if (Array.isArray(nodeData.users) && nodeData.users.length > 0) {
      return userOptions.filter((u) => nodeData.users.includes(String(u.id)))
    }
    return []
  }, [assignedUsers, nodeData.selectedUsers, nodeData.users, userOptions])

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
          value={accessModeOptions.find((o) => o.id === formEditAccess) || null}
          onChange={(val) => updateNodeData('formEditAccess', val?.id ?? 'ALL')}
        />
        {formEditAccess === 'CUSTOM' && (
          <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
            <AccessRuleEditor
              assignedUsers={effectiveAssignedUsers}
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
            accessModeOptions.find((o) => o.id === formVisibilityAccess) || null
          }
          onChange={(val) =>
            updateNodeData('formVisibilityAccess', val?.id ?? 'ALL')
          }
        />
        {formVisibilityAccess === 'CUSTOM' && (
          <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
            <AccessRuleEditor
              assignedUsers={effectiveAssignedUsers}
              fieldOptions={fieldOptions}
              rules={formSecureControls}
              userOptions={userOptions}
              onChange={(rules) => updateNodeData('formSecureControls', rules)}
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
          maxDisplayCount={3}
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

function AccessRuleEditor({
  assignedUsers = [],
  fieldOptions,
  rules,
  userOptions,
  onChange,
}: {
  assignedUsers?: Option[]
  fieldOptions: Option[]
  rules: AccessRule[]
  userOptions: Option[]
  onChange: (rules: AccessRule[]) => void
}) {
  const isSingleUser = assignedUsers.length === 1
  const singleUser = isSingleUser ? assignedUsers[0] : null
  const availableUsers = assignedUsers.length > 0 ? assignedUsers : userOptions

  const addRule = () =>
    onChange([
      ...rules,
      {
        formFields: [],
        id: generateId(),
        userId: singleUser ? String(singleUser.id) : '',
      },
    ])

  const removeRule = (id: string) => onChange(rules.filter((r) => r.id !== id))

  const updateRule = (id: string, patch: Partial<AccessRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <div className='space-y-2'>
      {rules.map((rule) => (
        <div
          className='flex items-start gap-2 rounded-xl bg-white p-3 shadow-sm'
          key={rule.id}
        >
          {isSingleUser ? (
            <div className='min-w-0 flex-1'>
              <InputSelectMultiple
                className='bg-white'
                maxDisplayCount={3}
                options={fieldOptions}
                placeholder='Select form fields...'
                clearable
                searchable
                value={fieldOptions.filter((f) =>
                  rule.formFields.includes(String(f.id)),
                )}
                onChange={(val) =>
                  updateRule(rule.id, {
                    formFields: val.map((v) => String(v.id)),
                    userId: String(singleUser?.id || ''),
                  })
                }
              />
            </div>
          ) : (
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <div className='space-y-1'>
                <span className='text-[11px] font-medium text-gray-10'>
                  User
                </span>
                <InputSelect
                  className='bg-white'
                  options={availableUsers}
                  placeholder='Select user...'
                  searchable
                  value={
                    availableUsers.find((o) => String(o.id) === rule.userId) ||
                    userOptions.find((o) => String(o.id) === rule.userId) ||
                    null
                  }
                  onChange={(val) =>
                    updateRule(rule.id, { userId: val ? String(val.id) : '' })
                  }
                />
              </div>
              <div className='space-y-1'>
                <span className='text-[11px] font-medium text-gray-10'>
                  Form Fields
                </span>
                <InputSelectMultiple
                  className='bg-white'
                  maxDisplayCount={3}
                  options={fieldOptions}
                  placeholder='Select form fields...'
                  clearable
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
            </div>
          )}
          <button
            className='text-gray-400 hover:text-red-500 mt-1 shrink-0 p-1.5 transition-colors'
            title='Remove rule'
            type='button'
            onClick={() => removeRule(rule.id)}
          >
            <Icon className='h-4 w-4' name='lucide:x' />
          </button>
        </div>
      ))}
      <button
        className='border-gray-300 text-slate-500 hover:bg-blue-50 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2 text-12 font-medium transition-all hover:border-[#1677ff] hover:text-[#1677ff] active:scale-[0.99]'
        type='button'
        onClick={addRule}
      >
        <Icon className='h-3.5 w-3.5' name='lucide:plus' />
        <span>Add Rule</span>
      </button>
    </div>
  )
}
