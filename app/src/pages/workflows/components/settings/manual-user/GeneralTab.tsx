import type { Option } from '@/types/option'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputText from '@/components/base/inputs/InputText'
import SettingsSection from '../common/SettingsSection'

interface RowProps {
  children?: React.ReactNode
  checked: boolean
  description: string
  icon: string
  iconClassName: string
  title: string
  onChange: (checked: boolean) => void
}

function AssigneeRow({
  checked,
  children,
  description,
  icon,
  iconClassName,
  title,
  onChange,
}: RowProps) {
  return (
    <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2.5'>
          <Icon className={iconClassName} name={icon} />
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>{title}</span>
            <span className='text-11 leading-tight text-gray-9'>
              {description}
            </span>
          </div>
        </div>
        <InputSwitch checked={checked} onChange={onChange} />
      </div>
      {checked && children && (
        <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
          {children}
        </div>
      )}
    </div>
  )
}

interface GeneralTabProps {
  actorNodeOptions: Option[]
  fieldOptions: Option[]
  groupOptions: Option[]
  nodeData: Record<string, any>
  openSections: Record<string, boolean>
  userOptions: Option[]
  updateNodeData: (key: string, value: any) => void
  onToggleSection: (key: string) => void
}

export default function GeneralTab({
  actorNodeOptions,
  fieldOptions,
  groupOptions,
  nodeData,
  openSections,
  userOptions,
  updateNodeData,
  onToggleSection,
}: GeneralTabProps) {
  const selectedUsers: Option[] = Array.isArray(nodeData.selectedUsers)
    ? nodeData.selectedUsers
    : []
  const selectedGroups: Option[] = Array.isArray(nodeData.selectedGroups)
    ? nodeData.selectedGroups
    : []
  const internalForwardUser: Option[] = Array.isArray(
    nodeData.internalForwardUser,
  )
    ? userOptions.filter((o) =>
        nodeData.internalForwardUser.includes(String(o.id)),
      )
    : []
  const internalForwardGroup: Option[] = Array.isArray(
    nodeData.internalForwardGroup,
  )
    ? groupOptions.filter((o) =>
        nodeData.internalForwardGroup.includes(String(o.id)),
      )
    : []
  const generatePDFFields: Option[] = Array.isArray(nodeData.generatePDFFields)
    ? fieldOptions.filter((o) => nodeData.generatePDFFields.includes(String(o.id)))
    : []
  const generateCSVFields: Option[] = Array.isArray(nodeData.generateCSVFields)
    ? fieldOptions.filter((o) => nodeData.generateCSVFields.includes(String(o.id)))
    : []
  const dynamicUserField: Option | null = nodeData.dynamicUserField
    ? fieldOptions.find((o) => String(o.id) === String(nodeData.dynamicUserField)) ||
      null
    : null

  const forwardActionOptions: Option[] = [
    { id: 'APPROVE_REJECT', name: 'Approve / Reject' },
    { id: 'VIEW_ONLY', name: 'View Only' },
  ]
  const partialApproveOptions: Option[] = [
    { id: 'ALL', name: 'All actors must approve' },
    { id: 'ANY', name: 'Any single actor can act' },
  ]
  const fullApprovalActionOptions: Option[] = [
    { id: 'APPROVE', name: 'Approve' },
    { id: 'REJECT', name: 'Reject' },
  ]

  return (
    <div className='flex flex-col gap-2.5'>
      <SettingsSection
        icon='lucide:settings-2'
        isOpen={openSections.assignees ?? true}
        title='Basic Setup'
        variant='premium'
        onToggle={() => onToggleSection('assignees')}
      >
        <div className='flex flex-col gap-2.5 py-1'>
          <AssigneeRow
            checked={!!nodeData.isUserEnabled}
            description='Assign specific users manually'
            icon='lucide:user'
            iconClassName='text-purple-600 h-4 w-4 stroke-[2]'
            title='Users'
            onChange={(checked) => updateNodeData('isUserEnabled', checked)}
          >
            <InputSelectMultiple
              className='bg-white'
              options={userOptions}
              placeholder='Select users...'
              value={selectedUsers}
              clearable
              searchable
              onChange={(val) => updateNodeData('selectedUsers', val)}
            />
          </AssigneeRow>

          <AssigneeRow
            checked={!!nodeData.isGroupEnabled}
            description='Assign specific user groups'
            icon='lucide:users-2'
            iconClassName='text-blue-600 h-4 w-4 stroke-[2]'
            title='Groups'
            onChange={(checked) => updateNodeData('isGroupEnabled', checked)}
          >
            <InputSelectMultiple
              className='bg-white'
              options={groupOptions}
              placeholder='Select groups...'
              value={selectedGroups}
              clearable
              searchable
              onChange={(val) => updateNodeData('selectedGroups', val)}
            />
          </AssigneeRow>

          <AssigneeRow
            checked={!!nodeData.isManagerEnabled}
            description="Route to the requester's direct manager"
            icon='lucide:user-check'
            iconClassName='text-emerald-600 h-4 w-4 stroke-[2]'
            title='Manager'
            onChange={(checked) => updateNodeData('isManagerEnabled', checked)}
          />

          <AssigneeRow
            checked={!!nodeData.isToRequesterEnabled}
            description='Route back to the workflow initiator'
            icon='lucide:corner-up-left'
            iconClassName='text-orange-600 h-4 w-4 stroke-[2]'
            title='To Requester'
            onChange={(checked) =>
              updateNodeData('isToRequesterEnabled', checked)
            }
          />

          <AssigneeRow
            checked={!!nodeData.isDynamicUserEnabled}
            description='Assignee is read from a form field at runtime'
            icon='lucide:zap'
            iconClassName='text-amber-600 h-4 w-4 stroke-[2]'
            title='Dynamic User (Form Input)'
            onChange={(checked) =>
              updateNodeData('isDynamicUserEnabled', checked)
            }
          >
            <InputSelect
              className='bg-white'
              options={fieldOptions}
              placeholder='Select form field...'
              searchable
              value={dynamicUserField}
              onChange={(val) =>
                updateNodeData('dynamicUserField', val ? String(val.id) : null)
              }
            />
          </AssigneeRow>

          <AssigneeRow
            checked={!!nodeData.isMasterUserEnabled}
            description='Look up the assignee from a master table column'
            icon='lucide:table'
            iconClassName='text-cyan-600 h-4 w-4 stroke-[2]'
            title='User from Master Table'
            onChange={(checked) =>
              updateNodeData('isMasterUserEnabled', checked)
            }
          >
            <div className='space-y-2'>
              <InputText
                placeholder='Master table column name'
                value={nodeData.masterUserColumn || ''}
                onChange={(val) => updateNodeData('masterUserColumn', val)}
              />
            </div>
          </AssigneeRow>

          <AssigneeRow
            checked={!!nodeData.isActedActivityEnabled}
            description='Route to whoever acted on a prior step'
            icon='lucide:history'
            iconClassName='text-pink-600 h-4 w-4 stroke-[2]'
            title='Acted Activity'
            onChange={(checked) =>
              updateNodeData('isActedActivityEnabled', checked)
            }
          >
            <InputSelect
              className='bg-white'
              options={actorNodeOptions}
              placeholder='Select a prior step...'
              searchable
              value={
                actorNodeOptions.find(
                  (o) => String(o.id) === String(nodeData.actedActivityBlockId),
                ) || null
              }
              onChange={(val) =>
                updateNodeData('actedActivityBlockId', val?.id ?? null)
              }
            />
          </AssigneeRow>

          <AssigneeRow
            checked={!!nodeData.isCoordinatorEnabled}
            description='Assign to designated workflow coordinators'
            icon='lucide:shield'
            iconClassName='text-indigo-600 h-4 w-4 stroke-[2]'
            title='Coordinator'
            onChange={(checked) =>
              updateNodeData('isCoordinatorEnabled', checked)
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection
        icon='lucide:forward'
        isOpen={openSections.forwarding ?? false}
        title='Forwarding & Delegation'
        variant='premium'
        onToggle={() => onToggleSection('forwarding')}
      >
        <div className='flex flex-col gap-2.5 py-1'>
          <AssigneeRow
            checked={!!nodeData.internalForward}
            description='Let the assigned user forward this task to others'
            icon='lucide:share-2'
            iconClassName='text-violet-600 h-4 w-4 stroke-[2]'
            title='Internal Forward'
            onChange={(checked) => updateNodeData('internalForward', checked)}
          >
            <div className='space-y-3'>
              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Forwarded user action
                </div>
                <InputSelect
                  className='bg-white'
                  options={forwardActionOptions}
                  value={
                    forwardActionOptions.find(
                      (o) => o.id === nodeData.forwardedUserAction,
                    ) || null
                  }
                  onChange={(val) =>
                    updateNodeData('forwardedUserAction', val?.id ?? '')
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Forwardable to users
                </div>
                <InputSelectMultiple
                  className='bg-white'
                  options={userOptions}
                  placeholder='Select users...'
                  value={internalForwardUser}
                  clearable
                  searchable
                  onChange={(val) =>
                    updateNodeData(
                      'internalForwardUser',
                      val.map((v) => String(v.id)),
                    )
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Forwardable to groups
                </div>
                <InputSelectMultiple
                  className='bg-white'
                  options={groupOptions}
                  placeholder='Select groups...'
                  value={internalForwardGroup}
                  clearable
                  searchable
                  onChange={(val) =>
                    updateNodeData(
                      'internalForwardGroup',
                      val.map((v) => String(v.id)),
                    )
                  }
                />
              </div>
            </div>
          </AssigneeRow>
        </div>
      </SettingsSection>

      <SettingsSection
        icon='lucide:git-merge'
        isOpen={openSections.multiApprover ?? false}
        title='Multi-Approver Logic'
        variant='premium'
        onToggle={() => onToggleSection('multiApprover')}
      >
        <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
          <div className='space-y-1.5'>
            <div className='text-12 font-medium text-gray-12'>
              Multiple actors' approval
            </div>
            <InputSelect
              className='bg-white'
              options={partialApproveOptions}
              value={
                partialApproveOptions.find(
                  (o) => o.id === (nodeData.partialApprove || 'ALL'),
                ) || null
              }
              onChange={(val) =>
                updateNodeData('partialApprove', val?.id ?? 'ALL')
              }
            />
          </div>
          <div className='space-y-1.5'>
            <div className='text-12 font-medium text-gray-12'>
              Full approval fallback action
            </div>
            <InputSelect
              className='bg-white'
              options={fullApprovalActionOptions}
              value={
                fullApprovalActionOptions.find(
                  (o) => o.id === nodeData.fullApprovalAction,
                ) || null
              }
              onChange={(val) =>
                updateNodeData('fullApprovalAction', val?.id ?? '')
              }
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon='lucide:file-check-2'
        isOpen={openSections.taskRequirements ?? false}
        title='Task Requirements & Output'
        variant='premium'
        onToggle={() => onToggleSection('taskRequirements')}
      >
        <div className='flex flex-col gap-2.5 py-1'>
          <AssigneeRow
            checked={!!nodeData.documentRequired}
            description='At least one attachment is required to act'
            icon='lucide:paperclip'
            iconClassName='text-rose-600 h-4 w-4 stroke-[2]'
            title='Document Required'
            onChange={(checked) => updateNodeData('documentRequired', checked)}
          />
          <AssigneeRow
            checked={!!nodeData.userSignature}
            description='Requires a drawn or uploaded e-signature'
            icon='lucide:signature'
            iconClassName='text-teal-600 h-4 w-4 stroke-[2]'
            title='User Signature Required'
            onChange={(checked) => updateNodeData('userSignature', checked)}
          />
          <AssigneeRow
            checked={!!nodeData.generatePDF}
            description='Generate a PDF of selected form fields on completion'
            icon='lucide:file-text'
            iconClassName='text-red-600 h-4 w-4 stroke-[2]'
            title='Save Form as PDF'
            onChange={(checked) => updateNodeData('generatePDF', checked)}
          >
            <div className='space-y-3'>
              <InputSelectMultiple
                className='bg-white'
                options={fieldOptions}
                placeholder='Select fields to include...'
                value={generatePDFFields}
                clearable
                searchable
                onChange={(val) =>
                  updateNodeData(
                    'generatePDFFields',
                    val.map((v) => String(v.id)),
                  )
                }
              />
              <div className='flex items-center justify-between'>
                <span className='text-12 text-gray-11'>Add footer</span>
                <InputSwitch
                  checked={!!nodeData.hasFooter}
                  onChange={(checked) => updateNodeData('hasFooter', checked)}
                />
              </div>
              {nodeData.hasFooter && (
                <InputText
                  placeholder='Footer text'
                  value={nodeData.footerText || ''}
                  onChange={(val) => updateNodeData('footerText', val)}
                />
              )}
            </div>
          </AssigneeRow>
          <AssigneeRow
            checked={!!nodeData.generateCSV}
            description='Export selected fields to Excel/CSV on completion'
            icon='lucide:sheet'
            iconClassName='text-green-600 h-4 w-4 stroke-[2]'
            title='Save Form as Excel'
            onChange={(checked) => updateNodeData('generateCSV', checked)}
          >
            <InputSelectMultiple
              className='bg-white'
              options={fieldOptions}
              placeholder='Select fields to include...'
              value={generateCSVFields}
              clearable
              searchable
              onChange={(val) =>
                updateNodeData(
                  'generateCSVFields',
                  val.map((v) => String(v.id)),
                )
              }
            />
          </AssigneeRow>
        </div>
      </SettingsSection>
    </div>
  )
}
