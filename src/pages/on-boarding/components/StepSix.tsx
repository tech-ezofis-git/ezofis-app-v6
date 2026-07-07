import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import InputCheckboxCard from '@/components/base/inputs/InputCheckboxCard'
import InputText from '@/components/base/inputs/InputText'
import showToast from '@/components/base/toast/showToast'
import { savePreQuestions } from '@/api/apiRouter'
import authUserStore from '@/stores/authUserStore'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = 'What Are Your Business Challenges?'

const businessChallenges = [
  { id: 1, name: 'Time-consuming manual processes' },
  { id: 2, name: 'Disconnected systems and data silos' },
  { id: 3, name: 'Scaling operations efficiently' },
  { id: 4, name: 'Compliance and audit challenges' },
  { id: 5, name: 'Poor team collaboration and communication' },
  { id: 6, name: 'High costs and frequent errors' },
  { id: 7, name: 'Other' },
]

const StepSix = () => {
  const navigate = useNavigate()
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)

  const savedValue = answers[question] || ''

  // Parse initial selected options from savedValue string
  const savedNames = Array.isArray(savedValue)
    ? savedValue
    : savedValue
      ? [savedValue]
      : []
  const initialOptionIds = businessChallenges
    .filter((c) =>
      savedNames.some(
        (sn) =>
          sn === c.name ||
          (c.name === 'Other' &&
            !businessChallenges.map((x) => x.name).includes(sn)),
      ),
    )
    .map((c) => c.id)

  const isOtherChecked = initialOptionIds.includes(7)
  const initialOtherText = isOtherChecked
    ? savedNames.find(
      (sn) =>
        !businessChallenges
          .map((x) => x.name)
          .filter((n) => n !== 'Other')
          .includes(sn),
    ) || ''
    : ''

  const [selectedIds, setSelectedIds] = useState<number[]>(initialOptionIds)
  const [otherText, setOtherText] = useState<string>(initialOtherText as string)
  const [loading, setLoading] = useState(false)

  // Update answer in store
  const updateStoreAnswer = (ids: number[], text: string) => {
    const selectedNames = ids
      .filter((id) => id !== 7)
      .map((id) => businessChallenges.find((c) => c.id === id)?.name || '')

    if (ids.includes(7) && text.trim()) {
      selectedNames.push(text.trim())
    } else if (ids.includes(7)) {
      selectedNames.push('Other')
    }

    setAnswer(question, selectedNames)
  }

  const handleClick = (id: number) => {
    let nextIds: number[]
    if (selectedIds.includes(id)) {
      nextIds = selectedIds.filter((item) => item !== id)
    } else {
      nextIds = [...selectedIds, id]
    }
    setSelectedIds(nextIds)
    updateStoreAnswer(nextIds, otherText)
  }

  const handleOtherChange = (val: string) => {
    setOtherText(val)
    updateStoreAnswer(selectedIds, val)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const answers = onBoardingStore.getState().answers
      const formattedPayload = {
        questions: Object.entries(answers).map(([qText, qAns]) => ({
          question: qText,
          answer: qAns,
        })),
      }

      const userId = authUserStore.getState().session?.id
      if (!userId) {
        throw new Error('User session not found')
      }

      console.log('Sending onboarding answers payload to API:', formattedPayload)

      const response = await savePreQuestions(userId, formattedPayload)
      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({
        message: 'Onboarding completed successfully!',
        variant: 'success',
      })

      navigate({ replace: true, to: '/' })
    } catch (e: any) {
      console.error(e)
      showToast({
        message: e?.message ?? 'Failed to save onboarding answers',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const isInvalid =
    selectedIds.length === 0 || (selectedIds.includes(7) && !otherText.trim())

  return (
    <>
      <StepHeader
        description='Understanding your pain points helps us prioritize which automations and features to show you first. We want to solve your most pressing problems quickly.'
        icon='lucide:briefcase-business'
        title='What Are Your Business Challenges?'
      />

      <div className='flex flex-col gap-4'>
        <div className='space-y-3'>
          {businessChallenges.map((option) => (
            <InputCheckboxCard
              checked={selectedIds.includes(option.id)}
              key={option.id}
              label={option.name}
              onClick={() => handleClick(option.id)}
            />
          ))}
        </div>

        {selectedIds.includes(7) && (
          <InputText
            className='animate-in fade-in slide-in-from-top-2 duration-300'
            label='Please specify your challenges'
            placeholder='e.g. Too many administrative tools'
            value={otherText}
            required
            onChange={handleOtherChange}
          />
        )}
      </div>

      <StepFooter
        disabled={isInvalid}
        loading={loading}
        onNext={handleSubmit}
      />
    </>
  )
}

StepSix.displayName = 'StepSix'
export default StepSix
