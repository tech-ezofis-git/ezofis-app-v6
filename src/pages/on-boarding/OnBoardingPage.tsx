import { useNavigate, useParams } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import IconSpinner from '@/components/base/icon/IconSpinner'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import PageEmptyState from '@/components/common/PageEmptyState'
import AuthFooter from '@/layouts/auth/components/AuthFooter'
import PageHeader from './components/PageHeader'
import StepFive from './components/StepFive'
import StepFour from './components/StepFour'
import StepIndicator from './components/StepIndicator'
import StepOne from './components/StepOne'
import StepSix from './components/StepSix'
import StepThree from './components/StepThree'
import StepTwo from './components/StepTwo'
import onBoardingStore from './stores/onBoardingStore'

const OnBoardingPage = () => {
  const navigate = useNavigate()
  const { token } = useParams({ strict: false })
  console.log(token)

  const [isLoading, setIsLoading] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)

  const step = onBoardingStore((state) => state.step)
  const reset = onBoardingStore((state) => state.reset)

  useEffect(() => {
    reset()
    const timerId = setTimeout(() => {
      setIsLoading(false)
      setIsTokenValid(true)
    }, 1500)

    return () => clearTimeout(timerId)
  }, [reset])

  return (
    <div className='relative bg-surface p-6'>
      <StepIndicator />
      <PageHeader isTokenValid={isTokenValid} />

      <div
        className='flex items-center justify-center py-10 xl:py-20'
        style={{ minHeight: 'calc(100dvh - 120px)' }}
      >
        {isLoading && <IconSpinner />}

        {!isLoading && (
          <>
            {!isTokenValid && (
              <PageEmptyState
                description='This link is invalid or has expired. Please request a new invitation.'
                fill={false}
                icon='lucide:link-2-off'
                primaryActionLabel='Go Home'
                title='Invalid link'
                onPrimaryAction={() => navigate({ to: '/' })}
              />
            )}

            {isTokenValid && (
              <div className='w-120'>
                <AnimatePresence initial={false} mode='wait'>
                  <AnimateEntrancePop
                    className='flex flex-col gap-6'
                    key={step}
                  >
                    {step === 1 && <StepOne />}
                    {step === 2 && <StepTwo />}
                    {step === 3 && <StepThree />}
                    {step === 4 && <StepFour />}
                    {step === 5 && <StepFive />}
                    {step === 6 && <StepSix />}
                  </AnimateEntrancePop>
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <AuthFooter />
    </div>
  )
}

OnBoardingPage.displayName = 'OnBoardingPage'
export default OnBoardingPage
