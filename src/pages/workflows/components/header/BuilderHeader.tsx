import { useNavigate } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'

const BuilderHeader = () => {
    const navigate = useNavigate()

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
                        <h1 className='text-base font-semibold text-gray-13'>
                            Workflow Name
                        </h1>
                        <span className='rounded-full bg-gray-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-11'>
                            Draft
                        </span>
                    </div>
                    <span className='text-xs text-gray-10'>
                        Automate your business processes with this workflow
                    </span>
                </div>
            </div>

            <div className='flex items-center gap-2'>
                <Button
                    color='gray'
                    icon='lucide:play'
                    label='Test Run'
                    variant='outline'
                />
                <Button icon='lucide:save' label='Publish' />
            </div>
        </header>
    )
}

BuilderHeader.displayName = 'BuilderHeader'
export default BuilderHeader
