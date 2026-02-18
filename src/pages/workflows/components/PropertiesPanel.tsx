import type { Node } from '@xyflow/react'
import cn from '@/utils/cn'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import Input from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'

interface PropertiesPanelProps {
    node: Node | null
    onClose: () => void
}

const PropertiesPanel = ({ node, onClose }: PropertiesPanelProps) => {
    if (!node) return null

    // Mock options for the connection dropdown
    const connectionOptions = [
        { label: 'My Gmail Account', value: 'gmail-1' },
        { label: 'Company Email', value: 'gmail-2' },
    ]

    return (
        <div className='flex h-full w-[400px] flex-col border-l border-gray-3 bg-white shadow-xl transition-all'>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-gray-2'>
                <div className='flex items-center gap-2'>
                    {/* Node Icon in Header - Adjusted for Logos */}
                    <div
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            (node.data.icon as string)?.startsWith('logos:')
                                ? 'bg-transparent'
                                : 'bg-gray-1 border border-gray-2'
                        )}
                    >
                        <Icon
                            name={(node.data.icon as string) || 'lucide:settings-2'}
                            className={(node.data.icon as string)?.startsWith('logos:') ? 'h-6 w-6' : 'h-5 w-5'}
                            style={{
                                color: (node.data.icon as string)?.startsWith('logos:')
                                    ? undefined
                                    : (node.data.iconColor as string) || 'var(--color-primary-9)'
                            }}
                        />
                    </div>
                    <h2 className='text-base font-semibold text-gray-13'>{node.data.label as string}</h2>
                    <Icon name='lucide:pencil' className='h-3.5 w-3.5 text-gray-8 cursor-pointer hover:text-gray-11' />
                </div>
                <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-1 mr-1'>
                        <button className='p-1 hover:bg-gray-2 rounded text-gray-8 hover:text-gray-11 transition-colors'>
                            <Icon name='lucide:chevron-left' className='h-4 w-4' />
                        </button>
                        <button className='p-1 hover:bg-gray-2 rounded text-gray-8 hover:text-gray-11 transition-colors'>
                            <Icon name='lucide:chevron-right' className='h-4 w-4' />
                        </button>
                    </div>
                    <button
                        className='rounded-[4px] p-1 hover:bg-gray-2 text-gray-8 transition-colors'
                        onClick={onClose}
                    >
                        <Icon name='lucide:x' className='h-5 w-5' />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className='flex-1 overflow-y-auto p-4 space-y-5'>
                {/* Connection Field */}
                <div className='space-y-1'>
                    <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                        Connection <span className='text-red-11'>*</span>
                    </label>
                    <div className='relative'>
                        {/* Placeholder for InputSelect since we might need to adjust imports/types */}
                        <select className='w-full h-10 px-3 rounded-md border border-gray-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-4 focus:border-primary-9 appearance-none'>
                            <option value="" disabled selected>Select a connection</option>
                            <option value="1">My Gmail Connection</option>
                        </select>
                        <Icon name='lucide:chevrons-up-down' className='absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-7 pointer-events-none' />
                    </div>
                </div>

                {/* Email Subject */}
                <div className='space-y-1'>
                    <Input
                        label='Email subject'
                        value=''
                        onChange={() => { }}
                        className='text-sm'
                        description='The email subject'
                    />
                </div>

                {/* Email Sender */}
                <div className='space-y-1'>
                    <Input
                        label='Email sender'
                        value=''
                        onChange={() => { }}
                        className='text-sm'
                        description='Optional filtration, leave empty to filter based on the email sender'
                    />
                </div>

                {/* Email Recipient */}
                <div className='space-y-1'>
                    <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>Email recipient</label>
                    <div className='h-24 rounded-md border border-gray-3 bg-gray-1/20' />
                </div>

            </div>

            {/* Resize Handle (Visual) */}
            <div className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-1.5 bg-gray-3 rounded-full cursor-col-resize hover:bg-gray-4 transition-colors' />

        </div>
    )
}

export default PropertiesPanel
