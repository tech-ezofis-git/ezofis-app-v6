
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import InputSelect from '@/components/base/inputs/InputSelect'
import useWorkflowStore from '../stores/useWorkflowStore'

const WorkflowSettings = () => {
    const {
        isSettingsOpen,
        closeSettings,
        workflowName,
        setWorkflowName,
        workflowDescription,
        setWorkflowDescription,

        initiateUsing,
        setInitiateUsing,
        folder,
        setFolder,
        form,
        setForm
    } = useWorkflowStore((state) => state)



    // Mock Options
    const folderOptions = [
        { id: 1, name: 'Finance' },
        { id: 2, name: 'HR' },
        { id: 3, name: 'Operations' }
    ]

    const formOptions = [
        { id: 1, name: 'Invoice Request' },
        { id: 2, name: 'Leave Application' }
    ]

    const initiateOptions = [
        { id: 'document', name: 'Document', description: 'Process document workflows' },
        { id: 'form', name: 'Form', description: 'Use an input form to start' },
        { id: 'document-form', name: 'Document & Form', description: 'Use document and form to start' }
    ]

    if (!isSettingsOpen) return null

    return (
        <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all animate-slide-in-right'>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-2 px-4 py-3">
                <h2 className="text-15/5 font-semibold text-gray-13">Settings</h2>
                <IconButton
                    icon="lucide:x"
                    variant="ghost"
                    color="gray"
                    onClick={closeSettings}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Name */}
                <Input
                    label="Name"
                    required
                    value={workflowName}
                    onChange={setWorkflowName}
                    clearable
                />

                {/* Description */}
                <div>
                    <label className="mb-2 block text-13 font-medium text-gray-11">Description</label>
                    <div className="relative">
                        <textarea
                            className="w-full min-h-[80px] rounded-md border border-gray-6 bg-transparent px-3 py-2 text-13 font-medium text-gray-12 placeholder:font-normal placeholder:text-gray-8 focus:border-primary-8 focus:ring-2 focus:ring-primary-6 outline-none resize-none"
                            value={workflowDescription}
                            onChange={(e) => setWorkflowDescription(e.target.value)}
                        />
                        <div className="absolute bottom-2 right-2 flex items-center justify-center h-5 w-5 rounded-full bg-green-9 text-white cursor-pointer" title="Save description">
                            <Icon name="lucide:save" className="h-3 w-3" />
                        </div>
                    </div>
                </div>



                {/* Initiate Using */}
                <InputSelect
                    label="Initiate Using"
                    value={initiateUsing ? { id: initiateUsing as any, name: initiateOptions.find(o => o.id === initiateUsing)?.name || '' } : null}
                    onChange={(val: any) => setInitiateUsing(val?.id || 'document-form')}
                    options={initiateOptions as any}
                    placeholder="Select"
                />

                {/* Folder */}
                <InputSelect
                    label="Folder"
                    required
                    value={folder ? { id: folder, name: folderOptions.find(f => f.id === folder)?.name || '' } : null}
                    onChange={(val: any) => setFolder(val?.id || null)}
                    options={folderOptions}
                    placeholder="Select"
                />

                {/* Form */}
                <InputSelect
                    label="Form"
                    required
                    value={form ? { id: form, name: formOptions.find(f => f.id === form)?.name || '' } : null}
                    onChange={(val: any) => setForm(val?.id || null)}
                    options={formOptions}
                    placeholder="Select"
                />




            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-2 bg-gray-1">
                <Button variant="outline" color="gray" onClick={closeSettings}>Cancel</Button>
                <Button onClick={closeSettings}>Save</Button>
            </div>
        </div>
    )
}

export { WorkflowSettings }
