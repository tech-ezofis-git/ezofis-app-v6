import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { Portal } from '@mantine/core'
import cn from '@/utils/cn'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
    onSelect: (type: 'blank' | 'welcome' | 'thank_you') => void
    onClose: () => void
}

const AddPageInline = ({ onSelect, onClose }: Props) => {
    const { welcomePage, thankYouPage } = useFormStore()

    const PAGE_TYPES = [
        {
            id: 'blank',
            label: 'Blank Page',
            icon: 'lucide:layout',
            description: 'Start with a fresh empty page',
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            id: 'welcome',
            label: 'Welcome Screen',
            icon: 'lucide:megaphone',
            description: 'The first screen your users see',
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            disabled: welcomePage.enabled
        },
        {
            id: 'thank_you',
            label: 'Completion Screen',
            icon: 'lucide:party-popper',
            description: 'Final screen shown after submission',
            color: 'text-pink-500',
            bg: 'bg-pink-50',
            disabled: thankYouPage.enabled
        },
    ]

    return (
        <Portal>
            <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
                {/* Click outside overlay - capture events */}
                <div className="absolute inset-0 z-0 pointer-events-auto" onClick={onClose} />

                <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    className='w-full max-w-[420px] pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-white border border-gray-2 shadow-2xl font-inter z-10'
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >


                    {/* Options */}
                    <div className="p-3 space-y-2">
                        {PAGE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                disabled={type.disabled}
                                className={cn(
                                    'w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 text-left border border-transparent',
                                    type.disabled
                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                        : 'hover:bg-gray-50 hover:border-gray-200 group'
                                )}
                                onClick={() => !type.disabled && onSelect(type.id as any)}
                            >
                                <div className={cn(
                                    'flex shrink-0 items-center justify-center rounded-xl h-12 w-12 shadow-sm transition-transform group-hover:scale-110',
                                    type.bg
                                )}>
                                    <Icon
                                        name={type.icon}
                                        className={cn('h-6 w-6', type.color)}
                                    />
                                </div>
                                <div className='flex flex-col min-w-0'>
                                    <span className={cn(
                                        'text-sm font-extrabold text-gray-13 leading-tight transition-colors',
                                        !type.disabled && 'group-hover:text-accent-primary'
                                    )}>
                                        {type.label}
                                    </span>
                                    <span className='text-[11px] text-gray-5 mt-0.5 leading-tight'>
                                        {type.disabled ? 'Already added to form' : type.description}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>
        </Portal>
    )
}

export default AddPageInline
