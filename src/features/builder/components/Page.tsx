import { Box, Stack, Text } from '@mantine/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useFormStore, type Page as PageType } from '../store'
import QuestionCard from './QuestionCard'
import { t } from '@lingui/macro'

interface PageProps {
    page: PageType
    index: number
}

const Page = ({ page, index }: PageProps) => {
    const { activeFieldId, setActiveFieldId } = useFormStore()

    return (
        <Box className="bg-white rounded-[2.5rem] border-2 border-slate-400 shadow-xl overflow-hidden mb-12">
            <Box className="px-12 py-10 border-b-2 border-slate-200 bg-slate-50">
                <Text size="xs" fw={900} className="text-indigo-800 uppercase tracking-[0.3em] mb-4">
                    {t`Section ${index + 1} .0`}
                </Text>
                <Text size="3rem" fw={900} className="text-slate-950 tracking-tighter leading-none">
                    {page.title}
                </Text>
            </Box>

            <Box className="p-4 bg-slate-50/30">
                <SortableContext items={page.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    <Stack gap="md">
                        {page.fields.map((field, fieldIndex) => (
                            <QuestionCard
                                key={field.id}
                                field={field}
                                index={fieldIndex}
                                isActive={activeFieldId === field.id}
                                onSelect={() => setActiveFieldId(field.id)}
                            />
                        ))}
                    </Stack>
                </SortableContext>
            </Box>

            <Box className="px-8 py-3 border-t border-slate-100 flex items-center justify-center">
                <Text size="10px" fw={700} className="text-slate-400 uppercase tracking-widest">
                    {t`End of Section ${index + 1} .0`}
                </Text>
            </Box>
        </Box>
    )
}

export default Page
