import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import {
  parseFieldOptionValues,
  type RepositoryFieldSchema,
} from '@/pages/requests/utils/repoFolderMetadata'

interface Props {
  field: RepositoryFieldSchema
  fileName: string
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
}

// Inline (no modal, per this app's UI convention) prompt for the one
// repository field that actually varies per document — see
// repoFolderMetadata.ts for why only the deepest folder-structure field
// needs asking about.
const FolderFieldPrompt = ({
  field,
  fileName,
  isSubmitting,
  onCancel,
  onConfirm,
}: Props) => {
  const { t } = useLingui()
  const [value, setValue] = useState('')
  const options = parseFieldOptionValues(field)

  return (
    <div className='mt-2 flex flex-col gap-2.5 rounded-xl border border-primary-3 bg-primary-1/40 p-3'>
      <p className='text-12 font-medium text-gray-12'>
        {t`One more detail before uploading`}{' '}
        <span className='font-bold'>{fileName}</span>
      </p>
      {options.length > 0 ? (
        <InputSelect
          label={field.name}
          options={options.map((o) => ({ id: o, name: o }))}
          value={value ? { id: value, name: value } : null}
          required
          onChange={(opt) => setValue(opt ? String(opt.id) : '')}
        />
      ) : (
        <InputText
          label={field.name}
          value={value}
          required
          onChange={setValue}
        />
      )}
      <div className='flex items-center justify-end gap-2'>
        <Button
          disabled={isSubmitting}
          label={t`Cancel`}
          size='sm'
          variant='outline'
          onClick={onCancel}
        />
        <Button
          disabled={isSubmitting || !value.trim()}
          label={t`Upload`}
          loading={isSubmitting}
          size='sm'
          variant='solid'
          onClick={() => onConfirm(value.trim())}
        />
      </div>
    </div>
  )
}

FolderFieldPrompt.displayName = 'FolderFieldPrompt'
export default FolderFieldPrompt
