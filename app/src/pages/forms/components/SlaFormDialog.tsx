import { useLingui } from '@lingui/react/macro'
import { useEffect, useState } from 'react'
import formApi from '@/api/form/form'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import Modal from '@/components/base/Modal'
import { buildSlaFormPayload } from '../utils/slaForm'

interface Props {
  opened: boolean
  onClose: () => void
  onCreated: (name: string) => void
}

const SlaFormDialog = ({ opened, onClose, onCreated }: Props) => {
  const { t } = useLingui()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!opened) return
    setName('')
    setDescription('')
    setError('')
  }, [opened])

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    const result = await formApi.createForm(
      buildSlaFormPayload(name, description),
    )
    setIsSaving(false)
    if (result.error) {
      setError(t`Couldn't create the form. The name may already be in use.`)
      return
    }
    onCreated(name.trim())
  }

  return (
    <Modal
      opened={opened}
      width={460}
      onClose={() => {
        if (!isSaving) onClose()
      }}
    >
      <div className='flex flex-col gap-4 p-5'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-2 text-primary-9'>
            <Icon className='size-5' name='lucide:timer' />
          </div>
          <div className='min-w-0 flex-1'>
            <h3 className='text-15 font-semibold text-gray-13'>
              {t`New SLA Form`}
            </h3>
            <p className='mt-1 text-13 leading-relaxed text-gray-11'>
              {t`The SLA fields are added for you. You can add entries after saving.`}
            </p>
          </div>
        </div>

        <InputText
          label={t`Form name`}
          placeholder={t`e.g. Support SLA`}
          value={name}
          required
          onChange={setName}
        />
        <InputTextarea
          label={t`Description`}
          placeholder={t`What this SLA form is used for`}
          value={description}
          onChange={setDescription}
        />

        {error ? <p className='text-12 text-red-11'>{error}</p> : null}

        <div className='flex justify-end gap-2'>
          <Button
            color='gray'
            disabled={isSaving}
            label={t`Cancel`}
            variant='outline'
            onClick={onClose}
          />
          <Button
            disabled={!name.trim()}
            label={t`Save`}
            loading={isSaving}
            onClick={handleSave}
          />
        </div>
      </div>
    </Modal>
  )
}

SlaFormDialog.displayName = 'SlaFormDialog'
export default SlaFormDialog
