import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import cn from '@/utils/cn'

interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

interface Props {
  attachmentCount: number
  checklistChecked: Record<string, boolean>
  checklistItems: ChecklistItem[]
  documentRequired: boolean
  signatureConfirmed: boolean
  userSignatureRequired: boolean
  onChecklistToggle?: (id: string, checked: boolean) => void
  onSignatureToggle?: (confirmed: boolean) => void
}

// Surfaces the current stage's Manual User (INTERNAL_ACTOR) task
// requirements - checklist, document, signature - authored in the
// workflow builder's General/Checklist tabs, so the acting user can see
// and satisfy them before Request.tsx's handleMoveNext lets an action through.
export default function TaskRequirements({
  attachmentCount,
  checklistChecked,
  checklistItems,
  documentRequired,
  signatureConfirmed,
  userSignatureRequired,
  onChecklistToggle,
  onSignatureToggle,
}: Props) {
  const { t } = useLingui()
  const [isOpen, setIsOpen] = useState(true)

  const hasAnyRequirement =
    checklistItems.length > 0 || documentRequired || userSignatureRequired
  if (!hasAnyRequirement) return null

  return (
    <div className='mx-4 mt-3 rounded-xl border border-gray-3 bg-gray-1'>
      <button
        className='flex w-full items-center justify-between px-3 py-2.5'
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className='flex items-center gap-2 text-xs font-semibold text-gray-12'>
          <Icon className='size-3.5 text-primary-9' name='lucide:list-checks' />
          {t`Task Requirements`}
        </span>
        <Icon
          name='lucide:chevron-down'
          className={cn(
            'size-3.5 text-gray-9 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className='space-y-2.5 border-t border-gray-3 px-3 py-3'>
          {checklistItems.map((item) => (
            <label
              className='flex cursor-pointer items-start gap-2'
              key={item.id}
            >
              <InputCheckbox
                checked={!!checklistChecked[item.id]}
                onChange={(checked) => onChecklistToggle?.(item.id, checked)}
              />
              <span className='text-xs text-gray-12'>
                {item.label}
                {item.required && <span className='ml-1 text-red-9'>*</span>}
              </span>
            </label>
          ))}

          {documentRequired && (
            <div
              className={cn(
                'flex items-center gap-2 text-xs',
                attachmentCount > 0 ? 'text-emerald-9' : 'text-red-9',
              )}
            >
              <Icon
                className='size-3.5'
                name={
                  attachmentCount > 0
                    ? 'lucide:check-circle-2'
                    : 'lucide:paperclip'
                }
              />
              {attachmentCount > 0
                ? t`Document attached`
                : t`At least one attachment is required`}
            </div>
          )}

          {userSignatureRequired && (
            <label className='flex cursor-pointer items-start gap-2'>
              <InputCheckbox
                checked={signatureConfirmed}
                onChange={(checked) => onSignatureToggle?.(checked)}
              />
              <span className='text-xs text-gray-12'>
                {t`I confirm this action with my signature`}
                <span className='ml-1 text-red-9'>*</span>
              </span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
