import { Text } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
    size?: 'sm' | 'md'
    className?: string
}

const AddFieldButton = ({ onClick, size = 'md', className }: Props) => {
    const isSmall = size === 'sm'

    return (
        <button
            onClick={(e) => onClick(e)}
            className={cn(
                "w-full flex items-center justify-center border border-dashed border-accent-primary rounded-xl bg-accent-soft/10 transition-all text-accent-primary group/add",
                isSmall ? "h-9 py-1 px-3" : "h-12 py-3 px-4",
                "hover:bg-accent-soft/30 hover:shadow-sm active:scale-[0.98]",
                className
            )}
        >
            <div className="flex items-center gap-2.5 transition-transform group-hover/add:scale-105">
                <div className={cn(
                    "flex items-center justify-center rounded-full bg-accent-primary text-white shadow-sm",
                    isSmall ? "size-5" : "size-6"
                )}>
                    <Icon name="lucide:plus" width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} />
                </div>
                <Text size={isSmall ? "xs" : "sm"} fw={700} className="tracking-tight uppercase">
                    Add Field
                </Text>
            </div>
        </button>
    )
}

export default AddFieldButton
