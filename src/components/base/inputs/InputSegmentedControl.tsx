import { motion } from 'motion/react'
import cn from '@/utils/cn'

interface Option {
    id: number | string
    name: string
}

interface Props {
    label?: string
    options: Option[]
    value: Option
    onChange: (value: Option) => void
    className?: string
}

export default function InputSegmentedControl({
    label,
    options,
    value,
    onChange,
    className,
}: Props) {
    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <div className="text-[10px] font-bold text-gray-9 tracking-wider uppercase">
                    {label}
                </div>
            )}
            <div className="relative flex p-1 bg-gray-100/80 rounded-xl h-10 items-center border border-gray-200/50">
                {/* Animated Background Pill */}
                <motion.div
                    className="absolute h-8 bg-white rounded-lg shadow-sm z-0"
                    layoutId="activePill"
                    initial={false}
                    animate={{
                        width: `${100 / options.length}%`,
                        left: `${options.findIndex((opt) => opt.id === value.id) * (100 / options.length)}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{
                        width: `calc(${100 / options.length}% - 8px)`,
                        margin: '0 4px',
                    }}
                />

                {options.map((option) => {
                    const isActive = option.id === value.id
                    return (
                        <button
                            key={option.id}
                            onClick={() => onChange(option)}
                            className={cn(
                                'relative z-10 flex-1 text-[13px] font-semibold transition-colors duration-300 outline-none',
                                isActive ? 'text-purple-9' : 'text-gray-500 hover:text-gray-800'
                            )}
                        >
                            {option.name}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
