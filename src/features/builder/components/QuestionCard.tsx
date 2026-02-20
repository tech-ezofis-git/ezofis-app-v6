import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon, Badge, Box, Group, Paper, Text } from '@mantine/core'
import { tv } from 'tailwind-variants'
import { useFormStore, type Field } from '../store'
import cn from '@/utils/cn'
import Icon from '@/components/base/icon/Icon'

const cardVariants = tv({
    base: 'group relative border-2 transition-all duration-300 cursor-pointer overflow-visible bg-white shadow-md',
    variants: {
        state: {
            default: 'border-slate-300 hover:border-slate-500 hover:shadow-xl',
            active: 'border-2 border-indigo-700 shadow-2xl ring-8 ring-indigo-500/10 z-10',
            dragging: 'opacity-50 grayscale scale-[0.98]'
        }
    },
    defaultVariants: {
        state: 'default'
    }
})

interface QuestionCardProps {
    field: Field
    index?: number
    isActive?: boolean
    onSelect?: () => void
    isDraggingOverlay?: boolean
}

const QuestionCard = memo(({ field, index, isActive, onSelect, isDraggingOverlay }: QuestionCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: field.id, disabled: isDraggingOverlay })

    const updateField = useFormStore(state => state.updateField)
    const duplicateField = useFormStore(state => state.duplicateField)
    const deleteField = useFormStore(state => state.deleteField)

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    const cardState = isDragging ? 'dragging' : isActive ? 'active' : 'default'

    return (
        <Box
            ref={setNodeRef}
            style={style}
            className={cn(
                "px-2 transition-all duration-300",
                field.width === '1/3' ? 'w-1/3' : field.width === '1/2' ? 'w-1/2' : 'w-full'
            )}
        >
            <Paper
                onClick={onSelect}
                className={cardVariants({ state: cardState })}
                radius="xl"
                p="xl"
            >
                {/* Grip Handle */}
                <div
                    className={cn(
                        "absolute left-[-24px] top-1/2 -translate-y-1/2 transition-all p-1 cursor-grab active:cursor-grabbing",
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                    )}
                    {...attributes}
                    {...listeners}
                >
                    <Icon name="tabler:grip-vertical" className="size-5 text-slate-500" />
                </div>

                {/* Card Header */}
                <Group justify="space-between" mb="md">
                    <Group gap="xs">
                        <Badge
                            variant="filled"
                            color={isActive ? 'indigo' : 'slate'}
                            size="sm"
                            radius="sm"
                            className="font-black tracking-tight h-6 uppercase px-2 shadow-sm"
                        >
                            {`${(index ?? 0) + 1} · ${field.type.replace(/_/g, ' ')}`}
                        </Badge>

                        {field.required && (
                            <Badge color="red" variant="filled" size="xs" className="font-bold uppercase tracking-wider shadow-sm">Required</Badge>
                        )}

                        <ActionIcon variant="transparent" color="indigo" size="xs">
                            <Icon name="tabler:sparkles" className="size-4 animate-pulse" />
                        </ActionIcon>
                    </Group>

                    <Group gap="xs" className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        <ActionIcon variant="light" color="gray" size="sm" className="hover:bg-slate-100 border border-slate-200" onClick={(e) => { e.stopPropagation(); duplicateField(field.id) }}>
                            <Icon name="tabler:copy" className="size-4 text-slate-700" />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red" size="sm" className="hover:bg-red-50 border border-red-100" onClick={(e) => { e.stopPropagation(); deleteField(field.id) }}>
                            <Icon name="tabler:trash" className="size-4 text-red-600" />
                        </ActionIcon>
                    </Group>
                </Group>

                {/* Card Body */}
                <Box>
                    <Text fw={900} size="lg" className="text-slate-950 mb-1 tracking-tight">
                        {field.title || 'Untitled Question'}
                    </Text>
                    {field.description && (
                        <Text size="sm" className="text-slate-800 mb-4 font-semibold">
                            {field.description}
                        </Text>
                    )}

                    {/* Specialized Previews */}
                    {field.type === 'upload_po' ? (
                        <Box className="p-8 border-2 border-dashed border-slate-400 rounded-2xl bg-slate-100/50 flex flex-col items-center gap-3 transition-colors group-hover:bg-white group-hover:border-indigo-400">
                            <div className="size-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 mb-1 border-2 border-indigo-200">
                                <Icon name="tabler:cloud-upload" className="size-7" />
                            </div>
                            <Text size="md" className="text-slate-900 font-bold">
                                Drop files here or{' '}
                                <span className="text-indigo-700 underline underline-offset-4 cursor-pointer">
                                    browse filesystem
                                </span>
                            </Text>
                            <Text size="xs" className="text-slate-800 uppercase tracking-[0.2em] font-black">
                                Max 50MB · PDF, JPG, PNG
                            </Text>
                        </Box>
                    ) : (
                        <Box className="h-14 border-2 border-slate-200 bg-slate-100/50 rounded-xl flex items-center px-4 transition-colors group-hover:bg-white group-hover:border-slate-300">
                            <Text size="sm" className="text-slate-600 font-bold italic">
                                {field.placeholder || `Enter your answer here...`}
                            </Text>
                        </Box>
                    )}
                </Box>

                {/* Floating Width Controls (Pill Style) */}
                {isActive && (
                    <Box className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20">
                        <ActionIcon.Group className="bg-white border-2 border-slate-100 shadow-2xl rounded-full p-1 gap-1 overflow-visible ring-4 ring-indigo-500/5">
                            <ActionIcon
                                variant={field.width === '1/3' ? 'filled' : 'subtle'}
                                color="indigo"
                                size="md"
                                radius="xl"
                                onClick={(e) => { e.stopPropagation(); updateField(field.id, { width: '1/3' }) }}
                            >
                                <Icon name="tabler:layout-grid-3x3" className="size-4" />
                            </ActionIcon>
                            <ActionIcon
                                variant={field.width === '1/2' ? 'filled' : 'subtle'}
                                color="indigo"
                                size="md"
                                radius="xl"
                                onClick={(e) => { e.stopPropagation(); updateField(field.id, { width: '1/2' }) }}
                            >
                                <Icon name="tabler:layout-columns" className="size-4" />
                            </ActionIcon>
                            <ActionIcon
                                variant={field.width === 'full' ? 'filled' : 'subtle'}
                                color="indigo"
                                size="md"
                                radius="xl"
                                onClick={(e) => { e.stopPropagation(); updateField(field.id, { width: 'full' }) }}
                            >
                                <Icon name="tabler:layout-rows" className="size-4" />
                            </ActionIcon>
                        </ActionIcon.Group>
                    </Box>
                )}
            </Paper>

            {/* Inline Insert Button */}
            <Box className="relative h-6 flex items-center justify-center group/insert my-4">
                <Box className="absolute h-px w-full bg-slate-200 group-hover/insert:bg-indigo-200 transition-colors" />
                <button
                    className="relative z-10 px-4 py-1.5 bg-white border-2 border-slate-100 rounded-full shadow-md text-[10px] font-extrabold text-slate-500 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 hover:scale-105 transition-all opacity-0 group-hover/insert:opacity-100"
                    onClick={(e) => { e.stopPropagation(); useFormStore.getState().addField('page-1', (index ?? 0) + 1) }}
                >
                    ⊕ Insert New Field Here
                </button>
            </Box>
        </Box>
    )
})

QuestionCard.displayName = 'QuestionCard'
export default QuestionCard
