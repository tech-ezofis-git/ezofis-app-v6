import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ActionIcon, Badge, Box, Group, Paper, Text } from '@mantine/core'
import { memo } from 'react'
import { tv } from 'tailwind-variants'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'
import { type Field, useFormStore } from '../store'

const cardVariants = tv({
  base: 'group relative cursor-pointer overflow-visible border-2 bg-white shadow-md transition-all duration-300',
  defaultVariants: {
    state: 'default',
  },
  variants: {
    state: {
      active:
        'border-indigo-700 ring-indigo-500/10 z-10 border-2 shadow-2xl ring-8',
      default: 'border-slate-300 hover:border-slate-500 hover:shadow-xl',
      dragging: 'scale-[0.98] opacity-50 grayscale',
    },
  },
})

interface QuestionCardProps {
  field: Field
  index?: number
  isActive?: boolean
  isDraggingOverlay?: boolean
  onSelect?: () => void
}

const QuestionCard = memo(
  ({
    field,
    index,
    isActive,
    isDraggingOverlay,
    onSelect,
  }: QuestionCardProps) => {
    const {
      attributes,
      isDragging,
      listeners,
      transform,
      transition,
      setNodeRef,
    } = useSortable({ disabled: isDraggingOverlay, id: field.id })

    const updateField = useFormStore((state) => state.updateField)
    const duplicateField = useFormStore((state) => state.duplicateField)
    const deleteField = useFormStore((state) => state.deleteField)

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
          'px-2 transition-all duration-300',
          field.width === '1/3'
            ? 'w-1/3'
            : field.width === '1/2'
              ? 'w-1/2'
              : 'w-full',
        )}
      >
        <Paper
          className={cardVariants({ state: cardState })}
          p='xl'
          radius='xl'
          onClick={onSelect}
        >
          {/* Grip Handle */}
          <div
            className={cn(
              'absolute top-1/2 left-[-24px] -translate-y-1/2 cursor-grab p-1 transition-all active:cursor-grabbing',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
            )}
            {...attributes}
            {...listeners}
          >
            <Icon
              className='text-slate-500 size-5'
              name='tabler:grip-vertical'
            />
          </div>

          {/* Card Header */}
          <Group justify='space-between' mb='md'>
            <Group gap='xs'>
              <Badge
                className='h-6 px-2 font-black tracking-tight uppercase shadow-sm'
                color={isActive ? 'indigo' : 'slate'}
                radius='sm'
                size='sm'
                variant='filled'
              >
                {`${(index ?? 0) + 1} · ${field.type.replace(/_/g, ' ')}`}
              </Badge>

              {field.required && (
                <Badge
                  className='font-bold tracking-wider uppercase shadow-sm'
                  color='red'
                  size='xs'
                  variant='filled'
                >
                  Required
                </Badge>
              )}

              <ActionIcon color='indigo' size='xs' variant='transparent'>
                <Icon className='size-4 animate-pulse' name='tabler:sparkles' />
              </ActionIcon>
            </Group>

            <Group
              gap='xs'
              className={cn(
                'transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <ActionIcon
                className='hover:bg-slate-100 border-slate-200 border'
                color='gray'
                size='sm'
                variant='light'
                onClick={(e) => {
                  e.stopPropagation()
                  duplicateField(field.id)
                }}
              >
                <Icon className='text-slate-700 size-4' name='tabler:copy' />
              </ActionIcon>
              <ActionIcon
                className='hover:bg-red-50 border-red-100 border'
                color='red'
                size='sm'
                variant='light'
                onClick={(e) => {
                  e.stopPropagation()
                  deleteField(field.id)
                }}
              >
                <Icon className='text-red-600 size-4' name='tabler:trash' />
              </ActionIcon>
            </Group>
          </Group>

          {/* Card Body */}
          <Box>
            <Text
              className='text-slate-950 mb-1 tracking-tight'
              fw={900}
              size='lg'
            >
              {field.title || 'Untitled Question'}
            </Text>
            {field.description && (
              <Text className='text-slate-800 mb-4 font-semibold' size='sm'>
                {field.description}
              </Text>
            )}

            {/* Specialized Previews */}
            {field.type === 'upload_po' ? (
              <Box className='border-slate-400 bg-slate-100/50 group-hover:border-indigo-400 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-colors group-hover:bg-white'>
                <div className='bg-indigo-100 text-indigo-700 border-indigo-200 mb-1 flex size-14 items-center justify-center rounded-full border-2'>
                  <Icon className='size-7' name='tabler:cloud-upload' />
                </div>
                <Text className='text-slate-900 font-bold' size='md'>
                  Drop files here or{' '}
                  <span className='text-indigo-700 cursor-pointer underline underline-offset-4'>
                    browse filesystem
                  </span>
                </Text>
                <Text
                  className='text-slate-800 font-black tracking-[0.2em] uppercase'
                  size='xs'
                >
                  Max 50MB · PDF, JPG, PNG
                </Text>
              </Box>
            ) : (
              <Box className='border-slate-200 bg-slate-100/50 group-hover:border-slate-300 flex h-14 items-center rounded-xl border-2 px-4 transition-colors group-hover:bg-white'>
                <Text className='text-slate-600 font-bold italic' size='sm'>
                  {field.placeholder || `Enter your answer here...`}
                </Text>
              </Box>
            )}
          </Box>

          {/* Floating Width Controls (Pill Style) */}
          {isActive && (
            <Box className='absolute -bottom-5 left-1/2 z-20 -translate-x-1/2'>
              <ActionIcon.Group className='border-slate-100 ring-indigo-500/5 gap-1 overflow-visible rounded-full border-2 bg-white p-1 shadow-2xl ring-4'>
                <ActionIcon
                  color='indigo'
                  radius='xl'
                  size='md'
                  variant={field.width === '1/3' ? 'filled' : 'subtle'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateField(field.id, { width: '1/3' })
                  }}
                >
                  <Icon className='size-4' name='tabler:layout-grid-3x3' />
                </ActionIcon>
                <ActionIcon
                  color='indigo'
                  radius='xl'
                  size='md'
                  variant={field.width === '1/2' ? 'filled' : 'subtle'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateField(field.id, { width: '1/2' })
                  }}
                >
                  <Icon className='size-4' name='tabler:layout-columns' />
                </ActionIcon>
                <ActionIcon
                  color='indigo'
                  radius='xl'
                  size='md'
                  variant={field.width === 'full' ? 'filled' : 'subtle'}
                  onClick={(e) => {
                    e.stopPropagation()
                    updateField(field.id, { width: 'full' })
                  }}
                >
                  <Icon className='size-4' name='tabler:layout-rows' />
                </ActionIcon>
              </ActionIcon.Group>
            </Box>
          )}
        </Paper>

        {/* Inline Insert Button */}
        <Box className='group/insert relative my-4 flex h-6 items-center justify-center'>
          <Box className='bg-slate-200 group-hover/insert:bg-indigo-200 absolute h-px w-full transition-colors' />
          <button
            className='border-slate-100 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 relative z-10 rounded-full border-2 bg-white px-4 py-1.5 text-[10px] font-extrabold tracking-widest uppercase opacity-0 shadow-md transition-all group-hover/insert:opacity-100 hover:scale-105'
            onClick={(e) => {
              e.stopPropagation()
              useFormStore.getState().addField('page-1', (index ?? 0) + 1)
            }}
          >
            ⊕ Insert New Field Here
          </button>
        </Box>
      </Box>
    )
  },
)

QuestionCard.displayName = 'QuestionCard'
export default QuestionCard
