import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Modal from '@/components/base/Modal'

interface Props {
  opened: boolean
  currentName?: string
  nextName?: string
  onCancel: () => void
  onConfirm: () => void
}

const SwitchIntegrationConfirm = ({
  opened,
  currentName,
  nextName,
  onCancel,
  onConfirm,
}: Props) => {
  return (
    <Modal opened={opened} width={420} onClose={onCancel}>
      <div className='p-5'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-2 text-orange-11'>
            <Icon className='size-5' name='tabler:switch-horizontal' />
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='text-15 font-semibold text-gray-13'>
              Change connected integration?
            </h3>
            <p className='mt-1.5 text-13 leading-relaxed text-gray-11'>
              {currentName && nextName
                ? `You’re connected to ${currentName}. Changing to ${nextName} will disconnect the current integration and you’ll need to connect again.`
                : 'Changing will disconnect your current integration and you’ll need to connect again.'}
            </p>
          </div>
        </div>

        <div className='mt-5 flex justify-end gap-2'>
          <Button
            color='gray'
            label='Cancel'
            variant='outline'
            onClick={onCancel}
          />
          <Button label='Change' onClick={onConfirm} />
        </div>
      </div>
    </Modal>
  )
}

SwitchIntegrationConfirm.displayName = 'SwitchIntegrationConfirm'
export default SwitchIntegrationConfirm
