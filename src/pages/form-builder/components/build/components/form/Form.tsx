import { ActionIcon, Button, Group } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import QuestionCard from './QuestionCard'
import AddFieldInline from './AddFieldInline'
import { useFormStore, type QuestionType, type Question } from '@/pages/form-builder/store/formStore'
import { Fragment, useState } from 'react'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

const Form = () => {
  const {
    questions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    activeQuestionId,
    setActiveQuestionId
  } = useFormStore()

  const [showAddFieldAt, setShowAddFieldAt] = useState<number | null>(null)

  const handleAddField = (type: QuestionType, index: number) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      type,
    }
    addQuestion(newQuestion, index)
    setShowAddFieldAt(null)
  }

  return (
    <div className='w-full max-w-[800px] mx-auto pb-40 px-4'>
      {/* Question List */}
      <div className='space-y-4'>
        {questions.map((q: Question, i: number) => (
          <Fragment key={q.id}>
            {/* Inline Add Button Component */}
            <div className="relative group/add flex justify-center h-4 items-center -my-2 z-10">
              <div className="absolute inset-x-0 h-px bg-gray-2 group-hover/add:bg-accent-primary transition-colors" />
              <ActionIcon
                size="sm"
                radius="xl"
                variant="filled"
                bg="accent-primary"
                className="opacity-0 group-hover/add:opacity-100 transition-all scale-50 group-hover/add:scale-100 z-20 shadow-lg"
                onClick={() => setShowAddFieldAt(i)}
              >
                <Icon name="tabler:plus" width={14} height={14} />
              </ActionIcon>
            </div>

            {showAddFieldAt === i && (
              <AddFieldInline
                onSelect={(type) => handleAddField(type, i)}
              />
            )}

            <QuestionCard
              question={q}
              index={i + 1}
              isActive={activeQuestionId === q.id}
              onSelect={() => setActiveQuestionId(q.id)}
              onUpdate={(updates) => updateQuestion(q.id, updates)}
              onDelete={() => deleteQuestion(q.id)}
            />
          </Fragment>
        ))}

        {/* Bottom Add Area */}
        <div className="relative group/add flex justify-center h-4 items-center mt-4">
          <div className="absolute inset-x-0 h-px bg-gray-2 group-hover/add:bg-accent-primary transition-colors" />
          <ActionIcon
            size="sm"
            radius="xl"
            variant="filled"
            bg="accent-primary"
            className="opacity-0 group-hover/add:opacity-100 transition-all scale-50 group-hover/add:scale-100 z-20"
            onClick={() => setShowAddFieldAt(questions.length)}
          >
            <Icon name="tabler:plus" width={14} height={14} />
          </ActionIcon>
        </div>

        {showAddFieldAt === questions.length && (
          <AddFieldInline
            onSelect={(type) => handleAddField(type, questions.length)}
          />
        )}

        {/* Compact Footer Actions */}
        <Group justify="center" gap="xs" mt="xl" className="pt-8 border-t border-gray-1">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<Icon name="tabler:plus" width={14} height={14} />}
            className="hover:bg-gray-1 transition-all"
            onClick={() => setShowAddFieldAt(questions.length)}
          >
            Add Field
          </Button>

          <Button
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet' }}
            size="xs"
            radius="md"
            leftSection={<Icon name="tabler:sparkles" width={14} height={14} />}
            className="shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
            onClick={() => useAskAIStore.getState().open()}
          >
            Ask with AI
          </Button>
        </Group>
      </div>
    </div>
  )
}

export default Form
