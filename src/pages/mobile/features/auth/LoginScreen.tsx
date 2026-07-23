import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import apiRouter from '@/api/apiRouter'
import authApiV6 from '@/api/v6/auth'
import showToast from '@/components/base/toast/showToast'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import cn from '@/utils/cn'
import { AppButton } from '../../components/primitives/AppButton'
import { AppInput } from '../../components/primitives/AppInput'
import { Icon } from '../../components/primitives/Icon'
import {
  AuthHeroShell,
  AuthUserAvatar,
  GoogleMark,
  MicrosoftMark,
} from './AuthHeroShell'

type TenantOption = {
  email: string
  id: number | string
  label: string
  value: number | string
}

type LoginScreenProps = {
  onSignIn?: (payload: { username: string; password: string }) => void
}

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const navigate = useNavigate()
  const { instance: msalInstance } = useMsal()
  const search: any = useSearch({ strict: false })
  const shareToken = search?.shareToken
  const mailid = search?.email || search?.mailid || search?.mailId || ''

  const [email, setEmail] = useState(String(mailid || ''))
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shareTenantId, setShareTenantId] = useState<string | null>(null)
  const [tenantList, setTenantList] = useState<TenantOption[]>([])
  const [showTenantList, setShowTenantList] = useState(false)
  const [socialLogged, setSocialLogged] = useState(false)
  const [socialEmail, setSocialEmail] = useState('')
  const [loginType, setLoginType] = useState<'Google' | 'Microsoft' | ''>('')
  const [selectedTenantId, setSelectedTenantId] = useState<
    number | string | null
  >(null)

  useEffect(() => {
    if (!shareToken) return
    void authApiV6.getSharePreview(shareToken).then((res) => {
      if (res.data?.sourceTenantId) {
        setShareTenantId(res.data.sourceTenantId)
      }
    })
  }, [shareToken])

  const handleLoggedNavigation = async () => {
    try {
      await apiRouter.userSession()
    } catch (err) {
      console.error('Failed to load session details:', err)
    }

    if (shareTenantId) {
      void navigate({ replace: true, to: '/folders' })
      setLoading(false)
      return
    }

    const { isApSetUpCompleted } = useSetupStore.getState()
    if (!isApSetUpCompleted) {
      void navigate({ replace: true, to: '/' })
    } else {
      void navigate({ replace: true, to: '/requests' })
    }
    setLoading(false)
  }

  const signInSocial = async (
    tenantId?: number | string,
    sEmail = socialEmail,
    sType = loginType,
  ) => {
    const payload = {
      email: sEmail,
      loggedFrom: 'WEB',
      loginType: sType,
    }

    const targetTenantId = tenantId || shareTenantId || undefined
    const { data, error: apiError, status } = await apiRouter.socialLogin(
      payload,
      targetTenantId,
    )

    if (apiError) {
      setError(apiError)
      setLoading(false)
      setShowTenantList(false)
      return
    }

    if (status === 300 && Array.isArray(data)) {
      setTenantList(
        data.map((tenant: any) => ({
          email: tenant.email,
          id: tenant.id,
          label: tenant.name,
          value: tenant.id,
        })),
      )
      setShowTenantList(true)
    } else {
      setShowTenantList(false)
      setTenantList([])
      setTimeout(() => {
        void handleLoggedNavigation()
      }, 100)
    }
  }

  const signIn = async (
    tenantId?: number | string,
    isSocialFlow = socialLogged,
    sEmail = socialEmail,
    sType = loginType,
  ) => {
    try {
      setError(null)
      setLoading(true)

      if (isSocialFlow) {
        await signInSocial(tenantId, sEmail, sType)
        return
      }

      const payload = {
        email,
        loggedFrom: 'WEB',
        password,
      }

      const targetTenantId = tenantId || shareTenantId || undefined
      const { data, error: apiError, status } = await apiRouter.login(
        payload,
        targetTenantId,
      )

      if (apiError) {
        setLoading(false)
        setShowTenantList(false)

        if (apiError === 'You should login with Microsoft') {
          await handleMicrosoftLogin()
        } else if (apiError === 'You should login with Google') {
          await handleGoogleLogin()
        } else {
          setError(apiError)
        }
        return
      }

      if (status === 300 && Array.isArray(data)) {
        showToast({
          message: 'User found with multiple tenant',
          variant: 'warning',
        })
        setTenantList(
          data.map((tenant: any) => ({
            email: tenant.email,
            id: tenant.id,
            label: tenant.name,
            value: tenant.id,
          })),
        )
        setShowTenantList(true)
      } else {
        showToast({ message: 'Successfully logged in', variant: 'success' })
        setShowTenantList(false)
        setTenantList([])
        onSignIn?.({ password, username: email })
        void handleLoggedNavigation()
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? 'Unable to sign in')
    } finally {
      setLoading(false)
    }
  }

  const validate = async () => {
    setSocialLogged(false)
    setSocialEmail('')
    setLoginType('')

    if (!email) {
      setError('Email is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    await signIn()
  }

  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onError: () => {
      setError('Google sign-in was cancelled or failed')
    },
    onSuccess: async (tokenResponse) => {
      try {
        setError(null)
        setLoading(true)

        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          },
        )
        const profile = await res.json()
        const gEmail: string = profile.email
        if (!gEmail) throw new Error('No email returned from Google')

        setSocialEmail(gEmail)
        setSocialLogged(true)
        setLoginType('Google')
        await signIn(undefined, true, gEmail, 'Google')
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    },
  })

  const handleGoogleLogin = async () => {
    googleLogin()
  }

  const handleMicrosoftLogin = async () => {
    try {
      setError(null)
      setLoading(true)

      const loginResponse = await msalInstance.loginPopup({
        loginHint: email || undefined,
        scopes: ['user.read'],
      })

      const msEmail = loginResponse.account?.username || ''
      if (!msEmail) throw new Error('No email returned from Microsoft')

      setSocialEmail(msEmail)
      setSocialLogged(true)
      setLoginType('Microsoft')
      await signIn(undefined, true, msEmail, 'Microsoft')
    } catch (e: any) {
      console.error(e)
      const errorMsg = e?.message || ''
      if (
        errorMsg.includes('user_cancelled') ||
        errorMsg.includes('User cancelled the flow')
      ) {
        setError('Microsoft sign-in was cancelled.')
      } else {
        setError(errorMsg || 'Microsoft sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTenantClick = async (tenantId: number | string) => {
    setSelectedTenantId(tenantId)
    setLoading(true)
    await signIn(tenantId)
  }

  const handleBackToSignIn = () => {
    setShowTenantList(false)
    setTenantList([])
    setSocialLogged(false)
    setSocialEmail('')
    setLoginType('')
    setSelectedTenantId(null)
    setError(null)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void validate()
  }

  if (showTenantList && tenantList.length > 0) {
    return (
      <AuthHeroShell>
        <button
          className='mb-4 inline-flex items-center gap-1.5 text-12 font-medium text-text-secondary'
          type='button'
          onClick={handleBackToSignIn}
        >
          <Icon className='size-3.5' name='ChevronLeft' />
          Back to Sign In
        </button>

        <AuthUserAvatar />
        <h2 className='text-center text-16 font-semibold text-text-primary'>
          Select account
        </h2>
        <p className='mt-1.5 text-center text-12 text-text-muted'>
          <strong className='text-text-secondary'>
            {socialLogged ? socialEmail : email}
          </strong>{' '}
          is used with more than one account. Which one do you want to use?
        </p>

        <div className='mt-5 flex flex-col gap-2'>
          {tenantList.map((tenant) => {
            const isSelected = selectedTenantId === tenant.id
            const isBusy = loading && isSelected
            return (
              <button
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-all',
                  isBusy
                    ? 'border-accent-primary bg-accent-soft'
                    : 'border-border-default bg-surface-primary hover:bg-surface-hover',
                )}
                disabled={loading}
                key={String(tenant.id)}
                type='button'
                onClick={() => void handleTenantClick(tenant.id)}
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-primary'>
                    <Icon className='size-3.5' name='User' />
                  </span>
                  <span className='truncate text-13 font-medium text-text-primary'>
                    {tenant.label}
                  </span>
                </div>
                {isBusy ? (
                  <Icon
                    className='size-4 animate-spin text-accent-primary'
                    name='LoaderCircle'
                  />
                ) : (
                  <Icon className='size-4 text-text-muted' name='ChevronRight' />
                )}
              </button>
            )
          })}
        </div>

        <button
          className='mt-5 w-full text-center text-11 font-medium text-text-muted underline'
          type='button'
          onClick={handleBackToSignIn}
        >
          Sign in with a different email
        </button>
      </AuthHeroShell>
    )
  }

  return (
    <AuthHeroShell>
      <form className='flex flex-col' onSubmit={handleSubmit}>
        <AuthUserAvatar />
        <h2 className='text-center text-16 font-semibold text-text-primary'>
          Sign in to your account
        </h2>
        <p className='mt-1.5 text-center text-12 text-text-muted'>
          Hi, welcome back to EZOFIS
        </p>

        <div className='mt-5 flex flex-col gap-3'>
          <AppInput
            autoComplete='username'
            label='Email / Username'
            leadingIcon={<Icon className='size-4' name='Mail' />}
            name='username'
            placeholder='hello@ezofis.com'
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError(null)
            }}
          />
          <AppInput
            autoComplete='current-password'
            label='Password'
            leadingIcon={<Icon className='size-4' name='Lock' />}
            name='password'
            placeholder='••••••••'
            type={showPassword ? 'text' : 'password'}
            value={password}
            trailing={
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className='inline-flex size-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-surface-hover active:scale-95'
                type='button'
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <Icon
                  className='size-4'
                  name={showPassword ? 'EyeOff' : 'Eye'}
                />
              </button>
            }
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
          />
        </div>

        {error ? (
          <p className='mt-3 rounded-xl bg-red-2 px-3 py-2 text-12 text-error-main'>
            {error}
          </p>
        ) : null}

        <AppButton
          className='mt-4 min-h-12 text-14'
          fullWidth
          loading={loading}
          type='submit'
        >
          Sign In
        </AppButton>

        <div className='my-4 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border-default' />
          <span className='text-12 font-medium text-text-muted'>Or</span>
          <div className='h-px flex-1 bg-border-default' />
        </div>

        <div className='grid grid-cols-2 gap-2.5'>
          <AppButton
            className='min-h-11 gap-2 text-12'
            disabled={loading}
            leadingIcon={<GoogleMark />}
            type='button'
            variant='outline'
            onClick={() => void handleGoogleLogin()}
          >
            Google
          </AppButton>
          <AppButton
            className='min-h-11 gap-2 text-12'
            disabled={loading}
            leadingIcon={<MicrosoftMark />}
            type='button'
            variant='outline'
            onClick={() => void handleMicrosoftLogin()}
          >
            Microsoft
          </AppButton>
        </div>

        <p className='mt-5 text-center text-12 text-text-muted'>
          Don&apos;t have an account?{' '}
          <Link
            className='font-semibold text-accent-primary transition-opacity hover:opacity-90'
            to='/sign-up'
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthHeroShell>
  )
}
