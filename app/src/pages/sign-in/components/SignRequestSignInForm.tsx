import { useMsal } from '@azure/msal-react'
import { useLingui } from '@lingui/react/macro'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { login as ezofisLogin, getSession } from '@/api/v6/auth'
import {
  getSignRequestInvitePreview,
  setSignRequestPassword,
  signRequestSocialLogin,
} from '@/api/v6/folder/signRequest'
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
import { setToLocalStorage } from '@/utils/local-storage'
import { useIsWhiteLabel } from '@/utils/whiteLabel'
import { redirectAfterLogin } from '../utils/redirectAfterLogin'

interface Props {
  email: string
  inviteToken: string
  needsPasswordSetup?: boolean
}

function applyInviteAuth(payload: {
  accessToken?: string
  email?: string
  expiresIn?: number
  tenantId?: string
  tokenType?: string
  userId?: string
}) {
  if (!payload.accessToken) return false
  const identity = {
    accessToken: payload.accessToken,
    expiresIn: payload.expiresIn,
    tenantId: payload.tenantId,
    tokenType: payload.tokenType || 'Bearer',
    userId: payload.userId,
  }
  setToLocalStorage(identity, 'identity')
  if (payload.tenantId) {
    setToLocalStorage(String(payload.tenantId), 'tenantId', 'STRING')
  }
  authUserStore.getState().setIdentity(identity)
  authUserStore.getState().setSession({
    email: payload.email || '',
    firstName: '',
    id: String(payload.userId || ''),
    tenantId: String(payload.tenantId || ''),
  })
  return true
}

const SignRequestSignInForm = ({
  email,
  inviteToken,
  needsPasswordSetup = false,
}: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
  const { instance: msalInstance } = useMsal()
  const search: any = useSearch({ strict: false })
  const redirectTo =
    typeof search?.redirect === 'string'
      ? search.redirect
      : typeof search?.redirectTo === 'string'
        ? search.redirectTo
        : null

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tenantId, setTenantId] = useState<string | undefined>()
  const [setupRequired, setSetupRequired] = useState(needsPasswordSetup)
  const [requiredSocial, setRequiredSocial] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const res = await getSignRequestInvitePreview(inviteToken)
      if (!mounted) return
      if (res.error || !res.data) {
        setError(res.error || t`Unable to load sign request`)
        setLoading(false)
        return
      }
      setTenantId(res.data.tenantId)
      setSetupRequired(
        Boolean(res.data.requiresPasswordSetup) || needsPasswordSetup,
      )
      setRequiredSocial(
        String(res.data.requiredSocialProvider || '')
          .trim()
          .toLowerCase(),
      )
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [inviteToken, needsPasswordSetup])

  const handleLoggedNavigation = async (authEmail: string) => {
    await getSession()
    const session = authUserStore.getState().session
    if (session && !session.email) {
      authUserStore.getState().setSession({
        ...session,
        email: authEmail,
      })
    }
    await redirectAfterLogin({
      navigate,
      redirectTo:
        redirectTo ||
        `/sign-request/${inviteToken}?email=${encodeURIComponent(authEmail)}`,
    })
    setSubmitting(false)
  }

  const handlePasswordSetup = async () => {
    if (!password) {
      setError(t`Password is required`)
      return
    }
    if (password.length < 6) {
      setError(t`Password must be at least 6 characters`)
      return
    }
    if (password !== confirmPassword) {
      setError(t`Passwords do not match`)
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await setSignRequestPassword({
      email,
      inviteToken,
      password,
      tenantId,
    })
    if (result.error || !result.data?.accessToken) {
      setError(result.error || t`Unable to set password`)
      setSubmitting(false)
      return
    }
    applyInviteAuth({
      ...result.data,
      email,
      tenantId,
    })
    await handleLoggedNavigation(email)
  }

  const handlePasswordLogin = async () => {
    if (!password) {
      setError(t`Password is required`)
      return
    }
    setSubmitting(true)
    setError(null)
    const loginResult = await ezofisLogin({
      email,
      password,
      tenantId: String(tenantId || ''),
    })
    if (loginResult.error) {
      setError(String(loginResult.error))
      setSubmitting(false)
      return
    }
    await handleLoggedNavigation(email)
  }

  const handleSocialSuccess = async (
    provider: 'google' | 'microsoft',
    socialEmail: string,
  ) => {
    const normalized = socialEmail.trim().toLowerCase()
    if (normalized !== email.trim().toLowerCase()) {
      setError(
        `Please sign in with ${email} — the email this request was sent to.`,
      )
      setSubmitting(false)
      return
    }

    const result = await signRequestSocialLogin({
      email: normalized,
      inviteToken,
      provider,
      tenantId,
    })
    if (result.error || !result.data?.accessToken) {
      setError(result.error || t`Unable to complete social login`)
      setSubmitting(false)
      return
    }
    applyInviteAuth({
      ...result.data,
      email: normalized,
      tenantId,
    })
    await handleLoggedNavigation(normalized)
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
        await handleSocialSuccess('google', String(profile.email || ''))
      } catch (e: any) {
        setError(e?.message ?? 'Google sign-in failed')
        setSubmitting(false)
      }
    },
  })

  const handleMicrosoftLogin = async () => {
    try {
      setSubmitting(true)
      setError(null)
      const loginResponse = await msalInstance.loginPopup({
        loginHint: email || undefined,
        scopes: ['user.read'],
      })
      await handleSocialSuccess(
        'microsoft',
        String(loginResponse.account?.username || ''),
      )
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
        <p className='text-gray-11'>{t`Loading sign request...`}</p>
      </div>
    )
  }

  const showGoogle = !requiredSocial || requiredSocial === 'google'
  const showMicrosoft = !requiredSocial || requiredSocial === 'microsoft'
  const showPassword = !requiredSocial

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
          setupRequired ? t`Create access to sign` : t`Sign in to your account`
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

        {showPassword && setupRequired ? (
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handlePasswordSetup()
              }}
            />
            <Button
              className='w-full justify-center'
              label={t`Continue`}
              loading={submitting}
              size='lg'
              onClick={() => void handlePasswordSetup()}
            />
          </>
        ) : null}

        {showPassword && !setupRequired ? (
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
                if (e.key === 'Enter') void handlePasswordLogin()
              }}
            />
            <Button
              className='w-full justify-center'
              label={t`Sign In`}
              loading={submitting}
              size='lg'
              onClick={() => void handlePasswordLogin()}
            />
          </>
        ) : null}

        {error ? (
          <Alert className='mt-2' text={error} variant='primary' />
        ) : null}

        {showPassword && (showGoogle || showMicrosoft) ? (
          <Divider label={t`Or`} />
        ) : null}

        <div className='space-y-3'>
          {showGoogle ? <GoogleButton onClick={() => googleLogin()} /> : null}
          {showMicrosoft ? (
            <MicrosoftButton onClick={() => void handleMicrosoftLogin()} />
          ) : null}
        </div>
      </div>
    </>
  )
}

SignRequestSignInForm.displayName = 'SignRequestSignInForm'
export default SignRequestSignInForm
