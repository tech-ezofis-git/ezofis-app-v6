import { type Node, useNodes, useReactFlow } from '@xyflow/react'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import useDefaultSectionOpen from '@/pages/workflows/utils/useDefaultSectionOpen'
import SettingsSection from './SettingsSection'

/**
 * Whether an agent block shows a status card at the top of the request page.
 * Stored as node data `showInRequestPage` (exported to block.settings).
 * Unset means shown, so existing workflows keep their cards.
 */
export default function RequestPageVisibilitySetting({ node }: { node: Node }) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const defaultOpen = useDefaultSectionOpen()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const currentNode = liveNodes.find((n) => n.id === node.id) || node
  const data = (currentNode.data || {}) as Record<string, unknown>
  const showInRequestPage = data.showInRequestPage !== false

  const setShowInRequestPage = (checked: boolean) => {
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? { ...n, data: { ...n.data, showInRequestPage: checked } }
          : n,
      ),
    )
  }

  return (
    <SettingsSection
      icon='lucide:layout-dashboard'
      isOpen={isOpen}
      title='Request Page'
      onToggle={() => setIsOpen(!isOpen)}
    >
      <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5'>
            <Icon
              className='h-4 w-4 stroke-[2] text-primary-10'
              name='lucide:panel-top'
            />
            <div className='flex flex-col space-y-1'>
              <span className='text-13 font-medium text-gray-12'>
                Show agent on request page
              </span>
              <span className='text-11 leading-tight text-gray-9'>
                Display this agent&apos;s status card at the top of the request
                page
              </span>
            </div>
          </div>
          <InputSwitch
            checked={showInRequestPage}
            onChange={setShowInRequestPage}
          />
        </div>
      </div>
    </SettingsSection>
  )
}
