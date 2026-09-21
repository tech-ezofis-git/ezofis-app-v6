import { useMsal } from '@azure/msal-react'
import { useLingui } from '@lingui/react/macro'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
import { useIsWhiteLabel } from '@/utils/whiteLabel'
import { redirectAfterLogin } from '../utils/redirectAfterLogin'

interface Props {
  email: string
  shareToken: string
}

const ShareSignInForm = ({ email, shareToken }: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
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
          action: preview.action,
          permission: preview.permission,
          resourceType: preview.resourceType,
          shareToken: preview.shareToken,
          sourceItemId: preview.sourceItemId,
          sourceReportId: preview.sourceReportId,
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
    const searchParams =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null
    const redirectTo =
      searchParams?.get('redirect') || searchParams?.get('redirectTo') || null
    await redirectAfterLogin({ navigate, redirectTo })
    setSubmitting(false)
  }

  const handlePasswordSetup = async () => {
    if (!password) {
      setError(t`Please enter a password.`)
      return
    }
    if (password !== confirmPassword) {
      setError(
        t`The passwords don't match. Please enter the same password in both fields.`,
      )
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
      setError(t`Please enter a password.`)
      return
    }

    setSubmitting(true)
    setError(null)
    // For password login, use normal login but tenant is resolved from share preview
    const shareCtx = authUserStore.getState().shareContext
    if (!shareCtx) {
      setError(
        t`This link is incomplete or no longer valid. Please ask for a new link.`,
      )
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
    onError: () =>
      setError(t`We couldn't sign you in with Google. Please try again.`),
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
            t`Please login with the email address that the link was shared to.`,
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
        setError(e?.message ?? t`Google sign-in failed`)
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
          t`Please login with the email address that the link was shared to.`,
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
        setError(t`Microsoft sign-in was cancelled.`)
      } else {
        setError(errorMsg || t`Microsoft sign-in failed`)
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
        <p className='text-gray-11'>{t`Loading share details...`}</p>
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
      <IconIllustrated icon='tabler:user' />
      <Title
        className='text-center'
        level={1}
        description={
          isWhiteLabel ? t`Hi, Welcome back` : t`Hi, Welcome back to EZOFIS`
        }
        title={
          showPasswordSetup
            ? t`Create access to continue`
            : t`Sign in to your account`
        }
      />

      <div className='space-y-4'>
        <InputText
          label={t`Email / Username`}
          leftSection={<Icon className='text-gray-8' name='tabler:mail' />}
          value={email}
          disabled
          onChange={() => {}}
        />

        {showPasswordSetup && (
          <>
            <InputPassword
              label={t`Password`}
              leftSection={<Icon className='text-gray-8' name='tabler:lock' />}
              value={password}
              showPlaceholder
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
            />
            <InputPassword
              label={t`Confirm Password`}
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
              label={t`Sign In`}
              loading={submitting}
              size='lg'
              onClick={handlePasswordSetup}
            />
          </>
        )}

        {showPasswordLogin && (
          <>
            <InputPassword
              label={t`Password`}
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
              label={t`Sign In`}
              loading={submitting}
              size='lg'
              onClick={handlePasswordLogin}
            />
          </>
        )}

        {error && <Alert className='mt-2' text={error} variant='primary' />}

        {(showGoogle || showMicrosoft) &&
          (showPasswordSetup || showPasswordLogin) && <Divider label={t`Or`} />}

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
