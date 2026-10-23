import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import useLeaveGuardStore from '@/stores/useLeaveGuardStore'

/** "Save changes before leaving?" — shown when a guarded builder is dirty. */
export default function LeaveGuardDialog() {
  const { t } = useLingui()
  const pending = useLeaveGuardStore((state) => state.pending)
  const changeCount = useLeaveGuardStore((state) => state.changeCount)
  const cancel = useLeaveGuardStore((state) => state.cancel)
  const [isSaving, setIsSaving] = useState(false)

  const leave = () => {
    const proceed = useLeaveGuardStore.getState().pending
    useLeaveGuardStore.setState({ pending: null })
    proceed?.()
  }

  const saveAndLeave = async () => {
    const { guard } = useLeaveGuardStore.getState()
    if (!guard) return leave()
    setIsSaving(true)
    try {
      const saved = await guard.save()
      if (saved) leave()
    } finally {
      setIsSaving(false)
    }
  }

  const discardAndLeave = () => {
    useLeaveGuardStore.getState().guard?.discard?.()
    leave()
  }

  return (
    <Modal
      opened={Boolean(pending)}
      width={440}
      onClose={() => {
        if (!isSaving) cancel()
      }}
    >
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-2 text-primary-11'>
            <Icon className='size-5' name='lucide:save' />
          </span>
          <div className='min-w-0 flex-1 pt-0.5'>
            <h3 className='text-15 font-semibold text-gray-13'>
              {t`Save changes before leaving?`}
            </h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {changeCount === 1
                ? t`You have 1 unsaved change on this screen.`
                : t`You have ${changeCount} unsaved changes on this screen.`}
              <br />
              {t`If you don't save, they'll be lost.`}
            </p>
          </div>
          <IconButton
            ariaLabel={t`Close`}
            color='gray'
            disabled={isSaving}
            icon='lucide:x'
            size='xs'
            variant='ghost'
            onClick={cancel}
          />
        </div>

        <div className='mt-5 flex items-center justify-between gap-2'>
          <button
            className='cursor-pointer rounded-lg px-2 py-1.5 text-13 font-semibold text-red-10 transition-colors hover:bg-red-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
            disabled={isSaving}
            type='button'
            onClick={discardAndLeave}
          >
            {t`Discard changes`}
          </button>
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              disabled={isSaving}
              label={t`Cancel`}
              variant='outline'
              onClick={cancel}
            />
            <Button
              color='primary'
              disabled={isSaving}
              label={t`Save & leave`}
              loading={isSaving}
              onClick={() => void saveAndLeave()}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
