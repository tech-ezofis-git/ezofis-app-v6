import { useParams } from '@tanstack/react-router'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import EmptyState from '@/components/base/EmptyState'
import IconSpinner from '@/components/base/icon/IconSpinner'
import AnimateEntrancePop from '@/components/common/animations/AnimateEntrancePop'
import AuthFooter from '@/layouts/auth/components/AuthFooter'
import PageHeader from './components/PageHeader'
import StepFive from './components/StepFive'
import StepFour from './components/StepFour'
import StepIndicator from './components/StepIndicator'
import StepOne from './components/StepOne'
import StepSeven from './components/StepSeven'
import StepSix from './components/StepSix'
import StepThree from './components/StepThree'
import StepTwo from './components/StepTwo'
import StepZero from './components/StepZero'
import onBoardingStore from './store/onBoardingStore'

const OnBoardingPage = () => {
  const { token } = useParams({ strict: false })
  console.log(token)

  const [isLoading, setIsLoading] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)

  const step = onBoardingStore((state) => state.step)

  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsLoading(false)
      setIsTokenValid(true)
    }, 1500)

    return () => clearTimeout(timerId)
  }, [])

  return (
    <div className='relative bg-surface p-6'>
      <StepIndicator />
      <PageHeader isTokenValid={isTokenValid} />

      <div
        className='flex items-center justify-center py-10 xl:py-20'
        style={{ minHeight: 'calc(100svh - 120px)' }}
      >
        {isLoading && <IconSpinner />}

        {!isLoading && (
          <>
            {!isTokenValid && (
              <EmptyState
                description='The link you followed may be broken or the page may have been removed. Please double-check the URL for errors and try again.'
                icon='tabler:plug-connected-x'
                primaryActionLabel='Go Home'
                title='The link is not valid'
              />
            )}

            {isTokenValid && (
              <div className='flex w-120 flex-col gap-6'>
                <AnimatePresence initial={false} mode='wait'>
                  <AnimateEntrancePop
                    className='flex flex-col gap-6'
                    key={step}
                  >
                    {step === 0 && <StepZero />}
                    {step === 1 && <StepOne />}
                    {step === 2 && <StepTwo />}
                    {step === 3 && <StepThree />}
                    {step === 4 && <StepFour />}
                    {step === 5 && <StepFive />}
                    {step === 6 && <StepSix />}
                    {step === 7 && <StepSeven />}
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
