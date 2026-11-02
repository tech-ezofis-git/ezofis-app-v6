import { useLingui } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import Modal from '@/components/base/Modal'

export interface RestoreOptions {
  /** Switch to Browse afterwards, where the restored entries are. */
  openBrowse: boolean
  scope: RestoreScope
}

export type RestoreScope = 'all' | 'selected'

interface Props {
  isRestoring: boolean
  opened: boolean
  /** Entries the user picked (one from the row menu, or the selection). */
  selectedCount: number
  /** Everything currently in Trash. */
  trashCount: number
  onCancel: () => void
  onConfirm: (options: RestoreOptions) => void
}

const RestoreEntriesDialog = ({
  isRestoring,
  opened,
  selectedCount,
  trashCount,
  onCancel,
  onConfirm,
}: Props) => {
  const { t } = useLingui()
  const [scope, setScope] = useState<RestoreScope>('selected')
  const [openBrowse, setOpenBrowse] = useState(true)

  // Start from "the ones I picked" each time the dialog opens.
  useEffect(() => {
    if (opened) setScope('selected')
  }, [opened])

  const canRestoreAll = trashCount > selectedCount
  const count = scope === 'all' ? trashCount : selectedCount

  return (
    <Modal
      opened={opened}
      width={460}
      onClose={() => {
        if (!isRestoring) onCancel()
      }}
    >
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-green-2 text-green-11'>
            <Icon className='size-5' name='lucide:rotate-ccw' />
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='text-15 font-semibold text-gray-13'>
              {t`Restore entries`}
            </h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {t`Restored entries go back to Browse with all their data.`}
            </p>
          </div>
        </div>

        {canRestoreAll ? (
          <div className='mt-4 space-y-2'>
            <InputRadioCard
              checked={scope === 'selected'}
              description={t`Only the entries you picked.`}
              disabled={isRestoring}
              size='sm'
              label={
                selectedCount === 1
                  ? t`Restore this entry`
                  : t`Restore ${selectedCount} selected entries`
              }
              onClick={() => setScope('selected')}
            />
            <InputRadioCard
              checked={scope === 'all'}
              description={t`Empty the Trash by restoring every entry in it.`}
              disabled={isRestoring}
              label={t`Restore all ${trashCount} entries in Trash`}
              size='sm'
              onClick={() => setScope('all')}
            />
          </div>
        ) : null}

        <InputCheckbox
          checked={openBrowse}
          className='mt-4'
          disabled={isRestoring}
          label={t`Show them in Browse afterwards`}
          onChange={setOpenBrowse}
        />

        <div className='mt-5 flex justify-end gap-2'>
          <Button
            color='gray'
            disabled={isRestoring}
            label={t`Cancel`}
            variant='outline'
            onClick={onCancel}
          />
          <Button
            color='primary'
            disabled={isRestoring || count === 0}
            icon='lucide:rotate-ccw'
            label={count === 1 ? t`Restore entry` : t`Restore ${count} entries`}
            loading={isRestoring}
            onClick={() => onConfirm({ openBrowse, scope })}
          />
        </div>
      </div>
    </Modal>
  )
}

RestoreEntriesDialog.displayName = 'RestoreEntriesDialog'
export default RestoreEntriesDialog
