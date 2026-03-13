import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import {
  getGroupListQueryOptions,
  getUserListQueryOptions,
} from '@/api/userQueries'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import { generateId } from '@/pages/form-builder/store/formStore'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

export default function ManualUserSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  // Fetch data from API
  const { data: userData } = useQuery(getUserListQueryOptions())
  const { data: groupData } = useQuery(getGroupListQueryOptions())

  const userOptions: Option[] = useMemo(() => {
    const users = userData as any[]
    if (!users || !Array.isArray(users)) return []
    return users.map((u: any) => ({
      id: generateId(),
      name: String(u.value || u.loginName || 'Unknown User'),
    }))
  }, [userData])

  const groupOptions: Option[] = useMemo(() => {
    const groups = groupData as any[]
    if (!groups || !Array.isArray(groups)) return []
    return groups.map((g: any) => ({
      id: generateId(),
      name: String(g.value || 'Unknown Group'),
    }))
  }, [groupData])

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any

  const [isUserEnabled, setIsUserEnabled] = useState(
    nodeData.isUserEnabled ?? true,
  )
  const [selectedUsers, setSelectedUsers] = useState<Option[]>(
    nodeData.selectedUsers || (userOptions.length > 0 ? [userOptions[0]] : []),
  )
  const [isGroupEnabled, setIsGroupEnabled] = useState(
    nodeData.isGroupEnabled ?? true,
  )
  const [selectedGroups, setSelectedGroups] = useState<Option[]>(
    nodeData.selectedGroups || [],
  )

  const [openBasic, setOpenBasic] = useState(false)

  const updateNodeData = (key: string, value: any) => {
    if (currentNode) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === currentNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      )
    }
  }

  // Keep state in sync with external changes
  useEffect(() => {
    if (
      nodeData.isUserEnabled !== undefined &&
      nodeData.isUserEnabled !== isUserEnabled
    ) {
      setIsUserEnabled(nodeData.isUserEnabled)
    }
    if (
      nodeData.selectedUsers &&
      JSON.stringify(nodeData.selectedUsers) !== JSON.stringify(selectedUsers)
    ) {
      setSelectedUsers(nodeData.selectedUsers)
    }
    if (
      nodeData.isGroupEnabled !== undefined &&
      nodeData.isGroupEnabled !== isGroupEnabled
    ) {
      setIsGroupEnabled(nodeData.isGroupEnabled)
    }
    if (
      nodeData.selectedGroups &&
      JSON.stringify(nodeData.selectedGroups) !== JSON.stringify(selectedGroups)
    ) {
      setSelectedGroups(nodeData.selectedGroups)
    }
  }, [nodeData])

  return (
    <div className='flex h-full flex-col overflow-hidden bg-white font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        {/* BASIC SETUP */}
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openBasic}
          title='Basic Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          <div className='flex flex-col gap-2.5 py-1'>
            <div className='flex items-center gap-2.5 px-1 pb-1'>
              <Icon className='text-indigo-600 h-4 w-4' name='lucide:users' />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Assignees
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Assign participants for this step
                </span>
              </div>
            </div>

            {/* Users Option */}
            <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <Icon
                    className='text-purple-600 h-4 w-4 stroke-[2]'
                    name='lucide:user'
                  />
                  <div className='flex flex-col space-y-1'>
                    <span className='text-13 font-medium text-gray-12'>
                      Users
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      Assign specific users manually
                    </span>
                  </div>
                </div>
                <InputSwitch
                  checked={isUserEnabled}
                  onChange={(checked) => {
                    setIsUserEnabled(checked)
                    updateNodeData('isUserEnabled', checked)
                  }}
                />
              </div>

              {isUserEnabled && (
                <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                  <div className='space-y-1.5'>
                    <div className='text-12 font-medium text-gray-12'>
                      Users
                    </div>

                    <InputSelectMultiple
                      className='bg-white'
                      options={userOptions}
                      placeholder='Select users...'
                      value={selectedUsers}
                      clearable
                      required
                      searchable
                      onChange={(val) => {
                        setSelectedUsers(val)
                        updateNodeData('selectedUsers', val)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Groups Option */}
            <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <Icon
                    className='text-blue-600 h-4 w-4 stroke-[2]'
                    name='lucide:users-2'
                  />
                  <div className='flex flex-col space-y-1'>
                    <span className='text-13 font-medium text-gray-12'>
                      Groups
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      Assign specific user groups
                    </span>
                  </div>
                </div>
                <InputSwitch
                  checked={isGroupEnabled}
                  onChange={(checked) => {
                    setIsGroupEnabled(checked)
                    updateNodeData('isGroupEnabled', checked)
                  }}
                />
              </div>

              {isGroupEnabled && (
                <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                  <div className='space-y-1.5'>
                    <div className='text-12 font-medium text-gray-12'>
                      Groups
                    </div>

                    <InputSelectMultiple
                      className='bg-white'
                      options={groupOptions}
                      placeholder='Select groups...'
                      value={selectedGroups}
                      clearable
                      required
                      searchable
                      onChange={(val) => {
                        setSelectedGroups(val)
                        updateNodeData('selectedGroups', val)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </SettingsSection>

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
