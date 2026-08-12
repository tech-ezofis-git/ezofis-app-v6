import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { savePreQuestions } from '@/api/apiRouter'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import showToast from '@/components/base/toast/showToast'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import useDmsSetupStore from '@/pages/dashboard/workflows/document-repository/stores/useDmsSetupStore'
import authUserStore from '@/stores/authUserStore'
import onBoardingStore from '../stores/onBoardingStore'
import StepFooter from './StepFooter'
import StepHeader from './StepHeader'

const question = 'What would you like to set up?'

const setupOptions = [
  {
    description: 'Automate invoice processing, approvals, and payments.',
    icon: 'lucide:receipt',
    id: 1,
    name: 'Accounts Payable Setup',
  },
  {
    description: 'Configure document repositories, fields, and storage.',
    icon: 'lucide:folder-cog',
    id: 2,
    name: 'DMS Folder Setup',
  },
] as const

const StepSeven = () => {
  const navigate = useNavigate()
  const answers = onBoardingStore((state) => state.answers)
  const setAnswer = onBoardingStore((state) => state.setAnswer)

  const savedValue = answers[question] || ''
  const initialOption = savedValue
    ? setupOptions.find((o) => o.name === savedValue)?.id || null
    : null

  const [selectedId, setSelectedId] = useState<number | null>(initialOption)
  const [loading, setLoading] = useState(false)

  const handleSelect = (option: (typeof setupOptions)[number]) => {
    setSelectedId(option.id)
    setAnswer(question, option.name)
  }

  const launchSelectedSetup = (selectionId: number | null) => {
    const apStore = useSetupStore.getState()
    const dmsStore = useDmsSetupStore.getState()

    if (selectionId === 2) {
      apStore.setIsSetupStarted(false)
      apStore.setRestrictNavigationUntilApSetup(false)
      useSetupStore.setState({ isSetupOpen: false })
      if (typeof window !== 'undefined') {
        localStorage.removeItem('restrictNavigationUntilApSetup')
      }
      dmsStore.startSetup()
      navigate({ replace: true, to: '/' })
      return
    }

    dmsStore.resetSetup()
    apStore.setisApSetUpCompleted(false)
    apStore.setStep(0)
    apStore.setIsSetupStarted(true)
    apStore.setRestrictNavigationUntilApSetup(true)
    useSetupStore.setState({ isSetupOpen: false })
    navigate({ replace: true, to: '/' })
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const currentAnswers = onBoardingStore.getState().answers
      const formattedPayload = {
        questions: Object.entries(currentAnswers).map(([qText, qAns]) => ({
          answer: qAns,
          question: qText,
        })),
      }

      const userId = authUserStore.getState().session?.id
      if (!userId) {
        throw new Error('User session not found')
      }

      const response = await savePreQuestions(userId, formattedPayload)
      if (response.error) {
        showToast({ message: response.error, variant: 'error' })
        return
      }

      showToast({
        message: 'Onboarding completed successfully!',
        variant: 'success',
      })

      launchSelectedSetup(selectedId)
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

  return (
    <>
      <StepHeader
        description='Choose where you want to start. You can always set up the other later from settings.'
        icon='lucide:rocket'
        title='What would you like to set up?'
      />

      <div className='space-y-3'>
        {setupOptions.map((option) => (
          <InputRadioCard
            checked={selectedId === option.id}
            description={option.description}
            icon={option.icon}
            key={option.id}
            label={option.name}
            onClick={() => handleSelect(option)}
          />
        ))}
      </div>

      <StepFooter
        disabled={selectedId === null}
        loading={loading}
        onNext={handleSubmit}
      />
    </>
  )
}

StepSeven.displayName = 'StepSeven'
export default StepSeven
