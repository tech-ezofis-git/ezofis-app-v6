import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import useWorkflowStore from '../../stores/useWorkflowStore'

const BuilderHeader = () => {
    const navigate = useNavigate()
    const { workflowStatus, setWorkflowStatus, workflowName, workflowDescription } = useWorkflowStore((state) => state)

    const handlePublish = () => {
        // Toggle for demo purposes, normally would be one-way or explicit actions
        setWorkflowStatus(workflowStatus === 'draft' ? 'published' : 'draft')
    }

    return (
        <header className='flex h-16 items-center justify-between border-b border-gray-3 bg-white px-4'>
            <div className='flex items-center gap-4'>
                <IconButton
                    color='gray'
                    icon='lucide:chevron-left'
                    variant='ghost'
                    onClick={() => navigate({ to: '/workflows' })}
                />
                <div className='flex flex-col'>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-15/5 font-semibold text-gray-13'>
                            {workflowName}
                        </h1>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${workflowStatus === 'draft'
                            ? 'bg-gray-3 text-gray-11'
                            : 'bg-success-subtle text-success-main'
                            }`}>
                            {workflowStatus}
                        </span>
                    </div>
                    <span className='text-xs text-gray-10'>
                        {workflowDescription || 'No description'}
                    </span>
                </div>
            </div>

            <div className='flex items-center gap-2'>
                <IconButton
                    icon='lucide:settings'
                    variant='ghost'
                    color="gray"
                    onClick={useWorkflowStore((state) => state.openSettings)}
                />
                <Button
                    color='gray'
                    icon='lucide:play'
                    label='Test Run'
                    variant='outline'
                    onClick={useWorkflowStore((state) => state.startTestRun)}
                    disabled={workflowStatus === 'published'}
                />
                <Button
                    icon={workflowStatus === 'draft' ? 'lucide:save' : 'lucide:pencil'}
                    label={workflowStatus === 'draft' ? 'Publish' : 'Edit'}
                    onClick={handlePublish}
                />
            </div>
        </header>
    )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader
