import type { Node } from '@xyflow/react'
import { useLingui } from '@lingui/react/macro'
import { useMemo } from 'react'
import type { Option } from '@/types/option'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import Input from '@/components/base/inputs/InputText'
import type { RequestTabConfig } from '../../stores/useWorkflowStore'
import { generateId } from '../../utils/generateId'
import {
  NODE_TOOL_TYPE,
  normalizeNodeToolType,
} from '../../utils/nodeToolTypes'

const SKIP_STAGE_TYPES = new Set([
  NODE_TOOL_TYPE.CONDITION,
  'annotation',
  'comment',
  'group',
  'note',
])

const stageLabel = (node: Node) => {
  const data = (node.data || {}) as Record<string, unknown>
  return String(data.label || data.title || data.toolType || node.id)
}

type Props = {
  isAccountsPayable: boolean
  nodes?: Node[]
  tabs: RequestTabConfig[]
  onChange: (tabs: RequestTabConfig[]) => void
}

export default function RequestTabsSettingsSection({
  isAccountsPayable,
  nodes = [],
  tabs,
  onChange,
}: Props) {
  const { t } = useLingui()
  const defaultLabels = isAccountsPayable
    ? [t`Invoices`, t`Exceptions`, t`Processed`]
    : [t`Inbox`, t`Sent`, t`Completed`]

  const stageOptions: Option[] = useMemo(() => {
    return nodes
      .filter((node) => {
        const data = (node.data || {}) as Record<string, unknown>
        const type = normalizeNodeToolType(data.toolType || data.type)
        return type && !SKIP_STAGE_TYPES.has(type)
      })
      .map((node) => ({
        id: node.id,
        name: stageLabel(node),
      }))
  }, [nodes])

  // An empty saved list means "unconfigured" - show the defaults as the
  // starting point to edit, but don't persist anything until the admin
  // actually changes something.
  const displayTabs: RequestTabConfig[] = tabs.length
    ? tabs
    : defaultLabels.map((label, index) => ({
        id: `default-${index}`,
        label,
        nodeIds: [],
      }))

  const usedNodeIdsByOtherTabs = useMemo(() => {
    const map = new Map<string, Set<string>>()
    displayTabs.forEach((tab) => {
      const set = new Set<string>()
      displayTabs.forEach((otherTab) => {
        if (otherTab.id !== tab.id) {
          ;(otherTab.nodeIds || []).forEach((id) => set.add(id))
        }
      })
      map.set(tab.id, set)
    })
    return map
  }, [displayTabs])

  const updateLabel = (id: string, label: string) => {
    onChange(
      displayTabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)),
    )
  }

  const updateNodeIds = (id: string, nodeIds: string[]) => {
    onChange(
      displayTabs.map((tab) => (tab.id === id ? { ...tab, nodeIds } : tab)),
    )
  }

  const removeTab = (id: string) => {
    if (displayTabs.length <= 1) return
    onChange(displayTabs.filter((tab) => tab.id !== id))
  }

  const moveTab = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= displayTabs.length) return
    const next = [...displayTabs]
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
    onChange(next)
  }

  const addTab = () => {
    onChange([
      ...displayTabs,
      { id: generateId(), label: t`New Tab`, nodeIds: [] },
    ])
  }

  const resetToDefault = () => onChange([])

  return (
    <div className='space-y-3'>
      <p className='text-12 leading-5 text-gray-10'>
        {t`Name the tabs shown on the Requests page for this workflow and select the stages that belong to each tab.`}
      </p>

      <div className='space-y-3'>
        {displayTabs.map((tab, index) => {
          const currentStageIds = tab.nodeIds || []
          const usedInOtherTabs =
            usedNodeIdsByOtherTabs.get(tab.id) || new Set<string>()
          const availableStageOptions = stageOptions.map((option) => ({
            ...option,
            disabled: usedInOtherTabs.has(String(option.id)),
          }))

          return (
            <div
              className='space-y-2 rounded-xl border border-gray-3 bg-surface p-3 shadow-xs'
              key={tab.id}
            >
              <div className='flex items-center gap-2'>
                <div className='flex shrink-0 flex-col'>
                  <IconButton
                    ariaLabel={t`Move up`}
                    color='gray'
                    disabled={index === 0}
                    icon='lucide:chevron-up'
                    size='xs'
                    variant='ghost'
                    onClick={() => moveTab(index, -1)}
                  />
                  <IconButton
                    ariaLabel={t`Move down`}
                    color='gray'
                    disabled={index === displayTabs.length - 1}
                    icon='lucide:chevron-down'
                    size='xs'
                    variant='ghost'
                    onClick={() => moveTab(index, 1)}
                  />
                </div>

                <div className='min-w-0 flex-1'>
                  <Input
                    label={t`Tab name`}
                    value={tab.label}
                    onChange={(value) => updateLabel(tab.id, value)}
                  />
                </div>

                <IconButton
                  ariaLabel={t`Remove tab`}
                  color='red'
                  disabled={displayTabs.length <= 1}
                  icon='lucide:trash-2'
                  size='xs'
                  variant='ghost'
                  onClick={() => removeTab(tab.id)}
                />
              </div>

              {stageOptions.length > 0 ? (
                <div className='pl-8'>
                  <InputSelectMultiple
                    label={t`Workflow stages`}
                    options={availableStageOptions}
                    placeholder={t`Select one or more stages`}
                    searchable
                    value={availableStageOptions.filter((option) =>
                      currentStageIds.includes(String(option.id)),
                    )}
                    onChange={(options) =>
                      updateNodeIds(
                        tab.id,
                        options.map((option) => String(option.id)),
                      )
                    }
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className='flex items-center justify-between pt-1'>
        <button
          className='flex items-center gap-1 text-13 font-medium text-gray-11 transition-colors hover:text-primary-9'
          type='button'
          onClick={addTab}
        >
          <Icon className='size-4' name='lucide:plus' />
          {t`Add tab`}
        </button>

        {tabs.length ? (
          <Button
            color='gray'
            size='xs'
            variant='outline'
            onClick={resetToDefault}
          >
            {t`Reset to default`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
