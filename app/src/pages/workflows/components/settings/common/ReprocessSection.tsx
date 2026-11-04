import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useMemo, useState } from 'react'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import {
  getReprocessStageOptions,
  type ReprocessSettings,
} from '../../../utils/reprocess'
import SettingsSection from './SettingsSection'

/**
 * End block: lets a finished request be sent back through the workflow, from a
 * chosen stage or the start block. Saved on `node.data.reprocess`.
 */
export default function ReprocessSection({ node }: { node: Node }) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const currentNode = liveNodes.find((n) => n.id === node.id) || node
  const [isOpen, setIsOpen] = useState(false)
  const settings: ReprocessSettings = (currentNode.data as any)?.reprocess || {
    enabled: false,
    targetBlockId: null,
  }

  const stageOptions = useMemo(
    () => getReprocessStageOptions(liveNodes as any),
    [liveNodes],
  )
  const selectedStage = stageOptions.find(
    (option) => option.id === settings.targetBlockId,
  )
  const isStageMissing = Boolean(settings.targetBlockId) && !selectedStage

  const update = (patch: Partial<ReprocessSettings>) =>
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === node.id
          ? { ...n, data: { ...n.data, reprocess: { ...settings, ...patch } } }
          : n,
      ),
    )

  return (
    <SettingsSection
      icon='lucide:rotate-ccw'
      isOpen={isOpen}
      title='Reprocess Request'
      variant='premium'
      onToggle={() => setIsOpen((open) => !open)}
    >
      <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-col space-y-1'>
            <span className='text-13 font-medium text-gray-12'>
              Allow Re-initiate
            </span>
            <span className='text-11 leading-tight text-gray-9'>
              Show a Re-initiate button on finished requests
            </span>
          </div>
          <InputSwitch
            checked={settings.enabled}
            onChange={(checked) =>
              update(
                checked
                  ? { enabled: true }
                  : { enabled: false, targetBlockId: null },
              )
            }
          />
        </div>

        {settings.enabled && (
          <InputSelect
            description='Leave empty to restart from the start block'
            label='Restart From'
            options={stageOptions}
            placeholder='Start block'
            value={selectedStage ?? null}
            clearable
            searchable
            error={
              isStageMissing
                ? 'This stage is no longer in the workflow. Choose another one.'
                : undefined
            }
            onChange={(option) =>
              update({ targetBlockId: option ? String(option.id) : null })
            }
          />
        )}
      </div>
    </SettingsSection>
  )
}
