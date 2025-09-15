import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import AnimateEntrance from '@/components/common/AnimateEntrance'
import ForgotPasswordForm from './components/ForgotPasswordForm'
import SendEmailForm from './components/SendEmailForm'

type View = 'send-email-form' | 'send-link-form'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [view, setView] = useState<View>('send-link-form')

  return (
    <AnimatePresence initial={false} mode='wait'>
      <AnimateEntrance key={view}>
        {view === 'send-email-form' && <SendEmailForm email={email} />}
        {view === 'send-link-form' && (
          <ForgotPasswordForm
            email={email}
            setEmail={setEmail}
            onChangeView={() => setView('send-email-form')}
          />
        )}
      </AnimateEntrance>
    </AnimatePresence>
  )
}

ForgotPasswordPage.displayName = 'ForgotPasswordPage'
export default ForgotPasswordPage
