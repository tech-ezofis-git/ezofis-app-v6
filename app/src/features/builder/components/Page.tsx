import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { t } from '@lingui/macro'
import { Box, Stack, Text } from '@mantine/core'
import { type Page as PageType, useFormStore } from '../store'
import QuestionCard from './QuestionCard'

interface PageProps {
  index: number
  page: PageType
}

const Page = ({ index, page }: PageProps) => {
  const { activeFieldId, setActiveFieldId } = useFormStore()

  return (
    <Box className='border-slate-400 mb-12 overflow-hidden rounded-[2.5rem] border-2 bg-white shadow-xl'>
      <Box className='border-slate-200 bg-slate-50 border-b-2 px-12 py-10'>
        <Text
          className='text-indigo-800 mb-4 tracking-[0.3em] uppercase'
          fw={900}
          size='xs'
        >
          {t`Section ${index + 1} .0`}
        </Text>
        <Text
          className='text-slate-950 leading-none tracking-tighter'
          fw={900}
          size='3rem'
        >
          {page.title}
        </Text>
      </Box>

      <Box className='bg-slate-50/30 p-4'>
        <SortableContext
          items={page.fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap='md'>
            {page.fields.map((field, fieldIndex) => (
              <QuestionCard
                field={field}
                index={fieldIndex}
                isActive={activeFieldId === field.id}
                key={field.id}
                onSelect={() => setActiveFieldId(field.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </Box>

      <Box className='border-slate-100 flex items-center justify-center border-t px-8 py-3'>
        <Text
          className='text-slate-400 tracking-widest uppercase'
          fw={700}
          size='10px'
        >
          {t`End of Section ${index + 1} .0`}
        </Text>
      </Box>
    </Box>
  )
}

export default Page
