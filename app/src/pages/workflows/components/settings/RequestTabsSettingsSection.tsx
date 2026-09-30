import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import type { RequestTabConfig } from '../../stores/useWorkflowStore'
import { generateId } from '../../utils/generateId'

type Props = {
  isAccountsPayable: boolean
  tabs: RequestTabConfig[]
  onChange: (tabs: RequestTabConfig[]) => void
}

export default function RequestTabsSettingsSection({
  isAccountsPayable,
  tabs,
  onChange,
}: Props) {
  const { t } = useLingui()
  const defaultLabels = isAccountsPayable
    ? [t`Invoices`, t`Exceptions`, t`Processed`]
    : [t`Inbox`, t`Sent`, t`Completed`]

  // An empty saved list means "unconfigured" - show the defaults as the
  // starting point to edit, but don't persist anything until the admin
  // actually changes something.
  const displayTabs: RequestTabConfig[] = tabs.length
    ? tabs
    : defaultLabels.map((label, index) => ({
        id: `default-${index}`,
        label,
      }))

  const updateLabel = (id: string, label: string) => {
    onChange(
      displayTabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)),
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
    onChange([...displayTabs, { id: generateId(), label: t`New Tab` }])
  }

  const resetToDefault = () => onChange([])

  return (
    <div className='space-y-3'>
      <p className='text-12 leading-5 text-gray-10'>
        {t`Name and order the tabs shown on the Requests page for this workflow. Only the first 3 (in order) are backed by real data - any tab beyond that will always show empty.`}
      </p>

      <div className='space-y-2'>
        {displayTabs.map((tab, index) => (
          <div
            className='flex items-center gap-2 rounded-xl border border-gray-3 bg-white p-2'
            key={tab.id}
          >
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
        ))}
      </div>

      <div className='flex items-center justify-between'>
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
