import { useQuery } from '@tanstack/react-query'
import { getRepositoriesQueryOptions } from '@/api/folders/queries'
import { getWorkflowFormsQueryOptions } from '@/api/form/queries'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import Input from '@/components/base/inputs/InputText'
import useWorkflowStore from '../stores/useWorkflowStore'

const WorkflowSettings = () => {
  const {
    closeSettings,
    folder,
    form,
    initiateUsing,
    isSettingsOpen,
    workflowDescription,
    workflowName,
    workflowStatus,
    setFolder,
    setForm,
    setInitiateUsing,
    setWorkflowDescription,
    setWorkflowName,
    setWorkflowStatus,
  } = useWorkflowStore((state) => state)

  // Options
  const initiateOptions = [
    {
      description: 'Process document workflows',
      id: 'DOCUMENT',
      name: 'Document',
    },
    { description: 'Use an input form to start', id: 'FORM', name: 'Form' },
    {
      description: 'Use document and form to start',
      id: 'DOCUMENT_FORM',
      name: 'Document & Form',
    },
  ]

  const { data: workflowForms = [] } = useQuery(getWorkflowFormsQueryOptions())
  const { data: folderOptions = [] } = useQuery(getRepositoriesQueryOptions())

  if (!isSettingsOpen) return null

  return (
    <div className='animate-slide-in-right flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-gray-2 px-4 py-3'>
        <h2 className='text-15/5 font-semibold text-gray-13'>Settings</h2>
        <IconButton
          color='gray'
          icon='lucide:x'
          variant='ghost'
          onClick={closeSettings}
        />
      </div>

      {/* Content */}
      <div className='flex-1 space-y-3 overflow-y-auto p-4'>
        {/* Name */}
        <Input
          label='Name'
          value={workflowName}
          clearable
          required
          onChange={setWorkflowName}
        />

        {/* Description */}
        <div>
          <label className='mb-2 block text-13 font-medium text-gray-11'>
            Description
          </label>
          <div className='relative'>
            <textarea
              className='min-h-[80px] w-full resize-none rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 outline-none placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6'
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
            />
            <div
              className='absolute right-2 bottom-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-green-9 text-white'
              title='Save description'
            >
              <Icon className='h-3 w-3' name='lucide:save' />
            </div>
          </div>
        </div>

        {/* Initiate Using */}
        <InputSelect
          label='Initiate Using'
          options={initiateOptions as any}
          placeholder='Select'
          value={
            initiateUsing
              ? {
                  id: initiateUsing as any,
                  name:
                    initiateOptions.find((o: any) => o.id === initiateUsing)
                      ?.name || '',
                }
              : null
          }
          onChange={(val: any) => setInitiateUsing(val?.id || 'document-form')}
        />

        {/* Folder */}
        <InputSelect
          label='Folder'
          options={folderOptions}
          placeholder='Select'
          required
          value={
            folder
              ? {
                  id: folder,
                  name:
                    folderOptions.find((f: any) => f.id == folder)?.name || '',
                }
              : null
          }
          onChange={(val: any) => setFolder(val?.id || null)}
        />

        {/* Form */}
        <InputSelect
          label='Form'
          options={workflowForms}
          placeholder='Select'
          required
          value={
            form
              ? {
                  id: form,
                  name:
                    workflowForms.find((f: any) => f.id == form)?.name || '',
                }
              : null
          }
          onChange={(val: any) => setForm(val?.id || null)}
        />

        {/* Status */}
        <div className='flex flex-col gap-1.5 pt-2'>
          <label className='text-13 font-medium text-gray-11'>Status</label>
          <div className='bg-gray-50 flex rounded-lg border border-gray-3 p-1'>
            {[
              { id: 'draft', label: 'Draft' },
              { id: 'published', label: 'Published' },
            ].map((opt) => {
              const active = String(workflowStatus).toLowerCase() === opt.id
              return (
                <button
                  key={opt.id}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-primary-9 text-white shadow-sm'
                      : 'text-gray-9 hover:bg-white/50 hover:text-gray-12'
                  }`}
                  type='button'
                  onClick={() => setWorkflowStatus(opt.id as any)}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex items-center justify-end gap-3 border-t border-gray-2 bg-gray-1 px-6 py-4'>
        <Button color='gray' variant='outline' onClick={closeSettings}>
          Cancel
        </Button>
        <Button onClick={closeSettings}>Save</Button>
      </div>
    </div>
  )
}

export { WorkflowSettings }
