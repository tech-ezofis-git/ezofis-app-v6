import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'

type ConfirmDialogProps = {
  cancelLabel?: string
  confirmLabel?: string
  description: string
  opened: boolean
  title: string
  isConfirming?: boolean
  variant?: 'danger' | 'default'
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  description,
  opened,
  title,
  isConfirming = false,
  variant = 'default',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger'

  return (
    <Modal opened={opened} width={420} onClose={onCancel}>
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <div
            className={
              isDanger
                ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-red-2 text-red-11'
                : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-2 text-orange-11'
            }
          >
            <Icon
              className='size-5'
              name={isDanger ? 'lucide:triangle-alert' : 'tabler:help'}
            />
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='text-15 font-semibold text-gray-13'>{title}</h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {description}
            </p>
          </div>
        </div>

        <div className='mt-5 flex justify-end gap-2'>
          <Button
            color='gray'
            disabled={isConfirming}
            label={cancelLabel}
            variant='outline'
            onClick={onCancel}
          />
          <Button
            color={isDanger ? 'red' : 'primary'}
            disabled={isConfirming}
            label={confirmLabel}
            loading={isConfirming}
            onClick={onConfirm}
          />
        </div>
      </div>
    </Modal>
  )
}
