import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import apiRouter from '@/api/apiRouter'
import authApiV6 from '@/api/v6/auth'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import authUserStore from '@/stores/authUserStore'

interface Props {
  email: string
  shareToken: string
}

const ShareSignInForm = ({ email, shareToken }: Props) => {
  const navigate = useNavigate()
  const { instance: msalInstance } = useMsal()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [allowedAuthMethods, setAllowedAuthMethods] = useState<string[]>([])
  const [requiredSocialProvider, setRequiredSocialProvider] = useState<
    string | null
  >(null)

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true)
      const res = await authApiV6.getSharePreview(shareToken)
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        const preview = res.data
        setAllowedAuthMethods(preview.allowedAuthMethods || [])
        setRequiredSocialProvider(preview.requiredSocialProvider || null)

        // Save share context to global store
        authUserStore.getState().setShareContext({
          shareToken: preview.shareToken,
          sourceItemId: preview.sourceItemId,
          sourceRepositoryId: preview.sourceRepositoryId,
          sourceTenantId: preview.sourceTenantId,
          workflowInstanceId: preview.workflowInstanceId,
        })
      }
      setLoading(false)
    }

    fetchPreview()
  }, [shareToken])

  const handleLoggedNavigation = async () => {
    try {
      await apiRouter.userSession()
    } catch (err) {
      console.error('Failed to load session details:', err)
    }

    // Switch tenant context using the share context
    const shareCtx = authUserStore.getState().shareContext
    if (shareCtx) {
      const currentSession = authUserStore.getState().session
      if (currentSession) {
        authUserStore.getState().setSession({
          ...currentSession,
          tenantId: shareCtx.sourceTenantId,
        })
      }
      navigate({ replace: true, to: '/requests' })
    } else {
      navigate({ replace: true, to: '/' })
    }
    setSubmitting(false)
  }

  const handlePasswordSetup = async () => {
    if (!password) {
      setError('Password is required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    setError(null)
    const shareCtx = authUserStore.getState().shareContext

    const { error: apiError } = await authApiV6.setSharePassword({
      email,
      password,
      shareToken,
      tenantId: shareCtx?.sourceTenantId,
    })

    if (apiError) {
      setError(apiError)
      setSubmitting(false)
    } else {
      handleLoggedNavigation()
    }
  }

  const handlePasswordLogin = async () => {
    if (!password) {
      setError('Password is required')
      return
    }

    setSubmitting(true)
    setError(null)
    // For password login, use normal login but tenant is resolved from share preview
    const shareCtx = authUserStore.getState().shareContext
    if (!shareCtx) {
      setError('Missing share context')
      setSubmitting(false)
      return
    }

    const { error: apiError } = await authApiV6.login({
      email,
      password,
      tenantId: shareCtx.sourceTenantId,
    })

    if (apiError) {
      setError(apiError)
      setSubmitting(false)
    } else {
      handleLoggedNavigation()
    }
  }

  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onError: () => setError('Google sign-in was cancelled or failed'),
    onSuccess: async (tokenResponse) => {
      try {
        setSubmitting(true)
        setError(null)
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        )
        const profile = await res.json()
        const gEmail: string = profile.email

        if (!gEmail || gEmail.toLowerCase() !== email.toLowerCase()) {
          throw new Error(
            'Please login with the email address that the link was shared to.',
          )
        }

        const shareCtx = authUserStore.getState().shareContext

        const { error: apiError } = await authApiV6.shareSocialLogin({
          email: gEmail,
          provider: 'google',
          shareToken,
          tenantId: shareCtx?.sourceTenantId,
        })

        if (apiError) {
          setError(apiError)
          setSubmitting(false)
        } else {
          handleLoggedNavigation()
        }
      } catch (e: any) {
        setError(e?.message ?? 'Google sign-in failed')
        setSubmitting(false)
      }
    },
  })

  const handleGoogleLogin = () => googleLogin()

  const handleMicrosoftLogin = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const loginResponse = await msalInstance.loginPopup({
        loginHint: email || undefined,
        scopes: ['user.read'],
      })
      const msEmail = loginResponse.account?.username || ''

      if (!msEmail || msEmail.toLowerCase() !== email.toLowerCase()) {
        throw new Error(
          'Please login with the email address that the link was shared to.',
        )
      }

      const shareCtx = authUserStore.getState().shareContext

      const { error: apiError } = await authApiV6.shareSocialLogin({
        email: msEmail,
        provider: 'microsoft',
        shareToken,
        tenantId: shareCtx?.sourceTenantId,
      })

      if (apiError) {
        setError(apiError)
        setSubmitting(false)
      } else {
        handleLoggedNavigation()
      }
    } catch (e: any) {
      const errorMsg = e?.message || ''
      if (errorMsg.includes('user_cancelled')) {
        setError('Microsoft sign-in was cancelled.')
      } else {
        setError(errorMsg || 'Microsoft sign-in failed')
      }
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center space-y-4 py-10'>
        <Icon
          className='text-primary size-8 animate-spin'
          name='tabler:loader-2'
        />
        <p className='text-gray-11'>Loading share details...</p>
      </div>
    )
  }

  const showPasswordSetup = allowedAuthMethods.includes('password_setup')
  const showPasswordLogin = allowedAuthMethods.includes('password_login')
  const showGoogle =
    requiredSocialProvider === 'google' || allowedAuthMethods.includes('google')
  const showMicrosoft =
    requiredSocialProvider === 'microsoft' ||
    allowedAuthMethods.includes('microsoft')

  return (
    <>
      <IconIllustrated icon='tabler:share' />
      <Title
        className='text-center'
        description={`Secure access to shared file for ${email}`}
        level={1}
        title='Access Shared File'
      />

      <div className='space-y-4'>
        <InputText
          label='Email'
          leftSection={<Icon className='text-gray-8' name='tabler:mail' />}
          value={email}
          disabled
          onChange={() => {}}
        />

        {showPasswordSetup && (
          <>
            <InputPassword
              label='Create Password'
              leftSection={<Icon className='text-gray-8' name='tabler:lock' />}
              value={password}
              showPlaceholder
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
            />
            <InputPassword
              label='Confirm Password'
              value={confirmPassword}
              showPlaceholder
              leftSection={
                <Icon className='text-gray-8' name='tabler:lock-check' />
              }
              onChange={(v) => {
                setConfirmPassword(v)
                setError(null)
              }}
            />
            <Button
              className='w-full justify-center'
              label='Set Password & Continue'
              loading={submitting}
              size='lg'
              onClick={handlePasswordSetup}
            />
          </>
        )}

        {showPasswordLogin && (
          <>
            <InputPassword
              label='Password'
              leftSection={<Icon className='text-gray-8' name='tabler:lock' />}
              value={password}
              showPlaceholder
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePasswordLogin()
              }}
            />
            <Button
              className='w-full justify-center'
              label='Sign in'
              loading={submitting}
              size='lg'
              onClick={handlePasswordLogin}
            />
          </>
        )}

        {error && <Alert className='mt-2' text={error} variant='primary' />}

        {(showGoogle || showMicrosoft) &&
          (showPasswordSetup || showPasswordLogin) && <Divider label='Or' />}

        <div className='space-y-3'>
          {showGoogle && <GoogleButton onClick={handleGoogleLogin} />}
          {showMicrosoft && <MicrosoftButton onClick={handleMicrosoftLogin} />}
        </div>
      </div>
    </>
  )
}

ShareSignInForm.displayName = 'ShareSignInForm'
export default ShareSignInForm
