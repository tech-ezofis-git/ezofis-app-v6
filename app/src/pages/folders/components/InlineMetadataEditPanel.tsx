import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import type { DynamicRepositoryColumn } from '../api/folderApi'
import { renderMetadataFieldControl } from '../hooks/useEditMetadataForm'
import { DynamicIcon } from './icons'
import { Card } from './Ui'

type InlineMetadataEditPanelProps = {
  error?: string
  fields: DynamicRepositoryColumn[]
  formValues: Record<string, unknown>
  invalidKeys?: string[]
  loading?: boolean
  saving?: boolean
  onChange: (key: string, value: unknown) => void
}

/** Right-side metadata form for the document details edit mode. */
export function InlineMetadataEditPanel({
  error = '',
  fields,
  formValues,
  invalidKeys = [],
  loading = false,
  saving = false,
  onChange,
}: InlineMetadataEditPanelProps) {
  const { t } = useLingui()
  const fieldCount = fields.length

  return (
    <Card className='animate-in fade-in overflow-hidden p-0 duration-200'>
      <h3 className='flex items-center justify-between gap-2 border-b border-gray-3 px-4 py-3 text-[15px] font-semibold text-gray-13'>
        <span className='flex items-center gap-2'>
          <Icon className='size-4 text-blue-11' name='lucide:pencil' />
          {t`Edit Metadata`}
        </span>
        <span className='rounded-full bg-gray-2 px-2.5 py-0.5 text-[12px] font-semibold text-gray-10'>
          {t`${fieldCount} fields`}
        </span>
      </h3>

      {error ? (
        <div
          className='mx-4 mt-4 rounded-lg border border-red-4 bg-red-1 px-3 py-2 text-[13px] font-semibold text-red-10'
          role='alert'
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='flex min-h-[200px] items-center justify-center gap-2 text-sm text-gray-10'>
          <DynamicIcon className='h-4 w-4 animate-spin' name='spinner' />
          {t`Loading fields...`}
        </div>
      ) : fields.length ? (
        <fieldset
          className='space-y-4 p-4 disabled:opacity-70'
          disabled={saving}
        >
          {fields.map((field) => (
            <div
              key={field.key}
              className={
                invalidKeys.includes(field.key)
                  ? 'rounded-lg ring-1 ring-red-6 ring-offset-2'
                  : undefined
              }
            >
              {renderMetadataFieldControl(field, formValues, onChange)}
            </div>
          ))}
        </fieldset>
      ) : (
        <div className='flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-10 text-center'>
          <DynamicIcon className='h-8 w-8 text-gray-8' name='fileText' />
          <b className='text-gray-13'>{t`No metadata fields available`}</b>
          <p className='text-sm text-gray-10'>
            {t`The repository did not return editable metadata fields.`}
          </p>
        </div>
      )}
    </Card>
  )
}
