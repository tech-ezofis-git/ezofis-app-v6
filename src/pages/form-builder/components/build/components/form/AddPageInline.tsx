import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import { Portal } from '@mantine/core'
import cn from '@/utils/cn'
import { useFormStore } from '@/pages/form-builder/store/formStore'

interface Props {
    onSelect: (type: 'blank' | 'welcome' | 'thank_you') => void
    onClose: () => void
    anchorRect?: DOMRect | null
}

const AddPageInline = ({ onSelect, onClose, anchorRect }: Props) => {
    const { welcomePage, thankYouPage } = useFormStore()

    const PAGE_TYPES = [
        {
            id: 'blank',
            label: 'Blank Section',
            icon: 'lucide:layout',
            description: 'Start with a fresh empty section',
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
            <div className="fixed inset-0 pointer-events-none z-[9999]">
                {/* Click outside overlay - capture events */}
                <div className="absolute inset-0 z-0 pointer-events-auto" onClick={onClose} />

                <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    className='absolute w-full max-w-[420px] pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-white border border-gray-2 shadow-2xl font-inter z-10'
                    initial={{
                        opacity: 0,
                        scale: 0.9,
                        x: anchorRect ? anchorRect.left - 210 + (anchorRect.width / 2) : 0,
                        y: anchorRect ? anchorRect.top + 40 : 100
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        x: anchorRect ? anchorRect.left - 210 + (anchorRect.width / 2) : 0,
                        y: anchorRect ? anchorRect.top + 40 : 100
                    }}
                    style={{
                        left: 0,
                        top: 0
                    }}
                >


                    {/* Options Grid */}
                    <div className="p-3 grid grid-cols-2 gap-1.5 custom-scrollbar overflow-y-auto max-h-[300px]">
                        {PAGE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                disabled={type.disabled}
                                className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left border border-transparent',
                                    type.disabled
                                        ? 'opacity-50 grayscale cursor-not-allowed'
                                        : 'hover:bg-gray-50 hover:border-gray-200 group'
                                )}
                                onClick={() => !type.disabled && onSelect(type.id as any)}
                            >
                                <div className={cn(
                                    'flex shrink-0 items-center justify-center rounded-lg h-9 w-9 shadow-sm transition-transform group-hover:scale-110',
                                    type.bg
                                )}>
                                    <Icon
                                        name={type.icon}
                                        className={cn('h-5 w-5', type.color)}
                                    />
                                </div>
                                <div className='flex flex-col min-w-0'>
                                    <span className={cn(
                                        'text-xs font-bold text-gray-13 group-hover:text-accent-primary truncate leading-tight transition-colors',
                                    )}>
                                        {type.label}
                                    </span>
                                    <span className='text-[10px] text-gray-5 truncate mt-0.5 leading-none'>
                                        {type.disabled ? 'Already added' : type.description}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
                    `}} />
                </motion.div>
            </div>
        </Portal>
    )
}

export default AddPageInline
