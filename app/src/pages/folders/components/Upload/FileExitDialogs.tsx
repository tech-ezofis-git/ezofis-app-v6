import { useLingui } from '@lingui/react/macro'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'
import { getFileIcon } from '@/pages/requests/components/request/components/sections/attachment/Attachments'

/** "Delete this file?" — permanent removal from Draft Files. */
export function DeleteFileDialog({
  fileMeta,
  fileName,
  isDeleting = false,
  opened,
  onCancel,
  onConfirm,
}: {
  fileMeta?: string
  fileName?: string
  isDeleting?: boolean
  opened: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useLingui()

  return (
    <Modal
      opened={opened}
      width={440}
      onClose={() => {
        if (!isDeleting) onCancel()
      }}
    >
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-red-2 text-red-10'>
            <Icon className='size-5' name='lucide:trash-2' />
          </span>
          <div className='min-w-0 flex-1 pt-0.5'>
            <h3 className='text-15 font-semibold text-gray-13'>
              {t`Delete this file?`}
            </h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {t`It will be removed from Draft Files. This can't be undone.`}
            </p>

            {fileName ? (
              <div className='mt-3 flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-3 bg-gray-1 px-3 py-2'>
                <Icon
                  className='size-5 shrink-0'
                  name={getFileIcon(fileName)}
                />
                <div className='min-w-0'>
                  <p
                    className='truncate text-13 font-semibold text-gray-12'
                    title={fileName}
                  >
                    {fileName}
                  </p>
                  {fileMeta ? (
                    <p className='truncate text-11 text-gray-9'>{fileMeta}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='mt-5 flex justify-end gap-2'>
          <Button
            color='gray'
            disabled={isDeleting}
            label={t`Cancel`}
            variant='outline'
            onClick={onCancel}
          />
          <Button
            color='red'
            disabled={isDeleting}
            label={t`Delete file`}
            loading={isDeleting}
            variant='solid'
            onClick={onConfirm}
          />
        </div>
      </div>
    </Modal>
  )
}

/**
 * "Leave this file?" — the draft is already saved, so leaving keeps it in
 * Draft Files. Delete is offered as a secondary path (opens the delete step).
 */
export function LeaveFileDialog({
  opened,
  onClose,
  onDelete,
  onLeave,
}: {
  opened: boolean
  onClose: () => void
  onDelete: () => void
  onLeave: () => void
}) {
  const { t } = useLingui()

  return (
    <Modal opened={opened} width={440} onClose={onClose}>
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-2 text-orange-11'>
            <Icon className='size-5' name='lucide:triangle-alert' />
          </span>
          <div className='min-w-0 flex-1 pt-0.5'>
            <h3 className='text-15 font-semibold text-gray-13'>
              {t`Leave this file?`}
            </h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {t`Your work is saved in`}{' '}
              <b className='font-semibold text-gray-12'>{t`Draft Files`}</b>
              {t`, so you can pick up where you left off.`}
            </p>
          </div>
          <IconButton
            ariaLabel={t`Close`}
            color='gray'
            icon='lucide:x'
            size='xs'
            variant='ghost'
            onClick={onClose}
          />
        </div>

        <div className='mt-5 flex items-center justify-between gap-2'>
          <button
            className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-13 font-semibold text-red-10 transition-colors hover:bg-red-2 active:scale-95'
            type='button'
            onClick={onDelete}
          >
            <Icon className='size-4' name='lucide:trash-2' />
            {t`Delete file`}
          </button>
          <div className='flex items-center gap-2'>
            <Button
              color='gray'
              label={t`Stay`}
              variant='outline'
              onClick={onClose}
            />
            <Button
              color='primary'
              label={t`Keep draft & leave`}
              onClick={onLeave}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
