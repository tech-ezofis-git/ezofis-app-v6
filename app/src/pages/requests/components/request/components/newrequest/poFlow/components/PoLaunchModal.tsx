import { useLingui } from '@lingui/react/macro'
import { Modal } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'

type Props = {
  opened: boolean
  onClose: () => void
  onProceed: () => void
}

export default function PoLaunchModal({ opened, onClose, onProceed }: Props) {
  const { t } = useLingui()

  return (
    <Modal
      opened={opened}
      overlayProps={{ blur: 4, opacity: 0.55 }}
      radius='lg'
      size='lg'
      withCloseButton={false}
      centered
      onClose={onClose}
    >
      <div className='relative overflow-hidden rounded-xl'>
        {/* Colorful header */}
        <div className='relative rounded-2xl bg-gradient-to-r from-[var(--primary-9)] via-[var(--violet-9)] to-[var(--pink-9)] p-5 text-white'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='flex items-center gap-4 text-18 font-semibold'>
                <Icon className='size-5' name='tabler:cloud-upload' />
                {t`PO Import`}
              </div>
            </div>

            <button
              className='cursor-pointerrounded-lg bg-surface/10 px-2 py-1 text-12 font-semibold text-[var(--text-on-accent)] hover:bg-surface/15'
              onClick={onClose}
            >
              <Icon className='size-5' name='tabler:x' />
            </button>
          </div>
        </div>

        <div className='p-5'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            <div className='rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4'>
              <div className='flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]'>
                <Icon
                  className='size-4 text-[var(--primary-9)]'
                  name='tabler:download'
                />
                {t`Template`}
              </div>
              <div className='mt-1 text-12 text-[var(--gray-10)]'>
                {t`Don't have a PO file ready? Use our template to ensure your data matches our system.`}
              </div>
            </div>

            <div className='rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4'>
              <div className='flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]'>
                <Icon
                  className='size-4 text-[var(--primary-9)]'
                  name='tabler:upload'
                />
                {t`Upload`}
              </div>
              <div className='mt-1 text-12 text-[var(--gray-10)]'>
                {t`Upload a PO file; we'll extract headers for mapping.`}
              </div>
            </div>

            <div className='rounded-xl border border-[var(--gray-3)] bg-[var(--gray-1)] p-4'>
              <div className='flex items-center gap-2 text-13 font-semibold text-[var(--gray-12)]'>
                <Icon
                  className='size-4 text-[var(--primary-9)]'
                  name='tabler:circle-check'
                />
                {t`Confirm`}
              </div>
              <div className='mt-1 text-12 text-[var(--gray-10)]'>
                {t`Validate mappings and confirm to finalize import payload.`}
              </div>
            </div>
          </div>

          <div className='mt-5 flex items-center justify-end gap-2'>
            <button
              className='cursor-pointer rounded-xl border border-[var(--gray-4)] bg-[var(--gray-0)] px-4 py-2 text-13 font-semibold text-[var(--gray-12)] hover:bg-[var(--gray-1)]'
              onClick={onClose}
            >
              {t`Not now`}
            </button>
            <button
              className='cursor-pointer rounded-xl bg-[var(--primary-9)] px-4 py-2 text-13 font-semibold text-white shadow-sm hover:bg-[var(--primary-10)]'
              onClick={onProceed}
            >
              {t`Continue`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
