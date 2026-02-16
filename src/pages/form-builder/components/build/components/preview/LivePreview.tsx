import { ActionIcon, Box, Button, Group, Progress, Text, Title, TextInput, Stack } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import { useFormStore, type Question } from '@/pages/form-builder/store/formStore'
import { useState, useEffect } from 'react'

const LivePreview = () => {
    const {
        questions,
        activeQuestionId,
        setActiveQuestionId,
        previewMode
    } = useFormStore()

    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const idx = questions.findIndex(q => q.id === activeQuestionId)
        if (idx !== -1) setCurrentIndex(idx)
    }, [activeQuestionId, questions])

    const total = questions.length
    const currentQuestion = questions[currentIndex] || questions[0]
    const percent = Math.round(((currentIndex + 1) / total) * 100)

    const handleNext = () => {
        if (currentIndex < total - 1) {
            const nextId = questions[currentIndex + 1].id
            setActiveQuestionId(nextId)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            const prevId = questions[currentIndex - 1].id
            setActiveQuestionId(prevId)
        }
    }

    if (!currentQuestion) return null

    return (
        <Box
            className="w-full h-[calc(100vh-140px)] bg-surface-primary border border-gray-2 rounded-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 shadow-sm"
        >
            <Box className="flex-1 flex flex-col p-6 overflow-hidden">
                <Group justify="space-between" mb="xs">
                    <Text size="10px" fw={700} className="text-gray-9 uppercase tracking-wider">
                        {currentIndex + 1} of {total}
                    </Text>
                    <Text size="10px" fw={700} className="text-accent-primary uppercase tracking-wider">
                        {percent}% complete
                    </Text>
                </Group>

                <Progress value={percent} size="3px" color="accent-primary" mb="xl" className="rounded-full overflow-hidden bg-gray-1" />

                <Box className="mt-8 overflow-y-auto pr-2 custom-scrollbar flex-1 relative flex flex-col">
                    {previewMode === 'typeform' ? (
                        <Box className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentQuestion.id}>
                            <Title order={2} className="text-28 font-bold text-gray-13 leading-tight">
                                {currentQuestion.title || "Untitled question"}
                            </Title>

                            <Box className="mt-8">
                                {renderPreviewInput(currentQuestion)}
                            </Box>

                            <Text size="sm" c="dimmed" className="italic mt-4 opacity-50">
                                Press Enter ↵
                            </Text>
                        </Box>
                    ) : (
                        <Stack gap="xl" className="pb-20">
                            {questions.map((q, i) => (
                                <Box key={q.id} className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                                    <Title order={4} className="text-20 font-bold text-gray-13">
                                        <Text span inherit className="text-gray-4 mr-2">{i + 1}.</Text>
                                        {q.title || "Untitled question"}
                                    </Title>
                                    {renderPreviewInput(q)}
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Box>
            </Box>

            {/* Bottom Nav - Only show navigation controls in Typeform mode */}
            {previewMode === 'typeform' && (
                <Group justify="flex-end" px="xl" pb="xl" pt="sm" className="border-t border-gray-1">
                    <Group gap="xs">
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            className="hover:bg-gray-1"
                            onClick={handlePrev}
                            disabled={currentIndex === 0}
                        >
                            <Icon name="tabler:chevron-left" width={20} height={20} />
                        </ActionIcon>
                        <ActionIcon
                            variant="filled"
                            bg="accent-primary"
                            size="lg"
                            className="hover:opacity-90 active:scale-95 transition-all"
                            onClick={handleNext}
                            disabled={currentIndex === total - 1}
                        >
                            <Icon name="tabler:chevron-right" width={20} height={20} />
                        </ActionIcon>
                    </Group>
                </Group>
            )}
        </Box>
    )
}

const renderPreviewInput = (question: Question) => {
    switch (question.type) {
        case 'short_text':
        case 'email':
        case 'phone':
            return (
                <TextInput
                    placeholder={question.placeholder || "Type your answer here..."}
                    variant="unstyled"
                    size="lg"
                    classNames={{
                        input: 'border-b border-gray-3 focus:border-accent-primary transition-all px-0 rounded-none text-18 font-medium'
                    }}
                />
            )
        case 'date':
            return (
                <Box className="p-4 border border-gray-2 rounded-lg bg-surface-secondary text-gray-9 text-sm">
                    {question.placeholder || "Select a date..."}
                </Box>
            )
        case 'rating':
            return (
                <Group gap="xs">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Box key={s} className="size-10 rounded-full border border-gray-2 flex items-center justify-center text-gray-9">
                            {s}
                        </Box>
                    ))}
                </Group>
            )
        default:
            return (
                <Box className="p-4 bg-gray-50 rounded italic text-gray-4 text-sm">
                    {question.type} preview not implemented
                </Box>
            )
    }
}

export default LivePreview
