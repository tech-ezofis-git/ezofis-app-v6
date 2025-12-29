import { useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useMsal } from '@azure/msal-react'

import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import HeroText from '@/components/common/HeroText'
import authUserStore from '@/stores/authUserStore'
import authApi from '@/api/auth'

interface Props {
  onChangeView: () => void
}

type TenantOption = {
  id: number | string
  label: string
  value: number | string
  email: string
}

const SignInForm = ({ onChangeView }: Props) => {
  const navigate = useNavigate()
  const { user } = authUserStore()
  const { instance: msalInstance } = useMsal()
  console.log(onChangeView)
  // === form / ui state ===
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // === flow control (mirrors Vue logic) ===
  const [normalLogin, setNormalLogin] = useState(false)
  const [tenantList, setTenantList] = useState<TenantOption[]>([])
  const [showTenantListModal, setShowTenantListModal] = useState(false)
  const [socialLogged, setSocialLogged] = useState(false)
  const [socialEmail, setSocialEmail] = useState('')
  const [loginType, setLoginType] = useState<'Google' | 'Microsoft' | ''>('')

  // === environment-based flags (computed in Vue) ===
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const {
    checkTenant,
    checkTenantLogin,
    checkAdLogin,
    checkForgot,
    isOnpremiseTenant,
    // checkTenantSocialLogin // not strictly needed in this React version
  } = useMemo(() => {
    const o = origin

    const env = o === 'https://trial.ezofis.com'

    const tenant =
      o === 'https://edmsuat.sobhaapps.com' ||
      o === 'https://edms.sobhaapps.com' ||
      o === 'https://ag-appsvc01.azurewebsites.net' ||
      o === 'https://ag-appsvc05.azurewebsites.net' ||
      o === 'https://ezappdev01.frankmortgage.com' ||
      o === 'https://agentprd01.azurewebsites.net'

    const tenantLogin =
      o === 'https://edmsuat.sobhaapps.com' ||
      o === 'https://edms.sobhaapps.com'

    const tenantSocialLogin =
      !(
        o === 'https://ag-appsvc01.azurewebsites.net' ||
        o === 'https://ag-appsvc05.azurewebsites.net' ||
        o === 'https://ezappdev01.frankmortgage.com' ||
        o === 'https://agentprd01.azurewebsites.net'
      )

    const adLogin = o === 'http://172.16.1.118'
    const forgot = o === 'http://localhost:8080'
    const onPremise = o === 'https://dfms.m2p.app'

    return {
      checkEnv: env,
      checkTenant: tenant,
      checkTenantLogin: tenantLogin,
      checkTenantSocialLogin: tenantSocialLogin,
      checkAdLogin: adLogin,
      checkForgot: forgot,
      isOnpremiseTenant: onPremise,
    }
  }, [origin])

  // === navigation after successful login (simplified Vue logged()) ===
  const handleLoggedNavigation = () => {
    // In Vue this used profileMenus + workspace access logic.
    // For now, replicate the basic behavior: honor 2FA, then go home.
    if (user.profile.twoStepVerification.enabled) {
      // onChangeView()
      navigate({ replace: true, to: '/' })
    } else {
      navigate({ replace: true, to: '/' })
    }
    setLoading(false)
  }

  // === EMAIL + PASSWORD LOGIN (with tenant + social support) ===
  const signIn = async (tenantId?: number | string) => {
    try {
      setError(null)
      setLoading(true)

      // SOCIAL BRANCH (Google / Microsoft)
      if (socialLogged) {
        const payload = {
          email: socialEmail,
          loggedFrom: 'WEB',
          loginType,
        }

        const { error, status, data } = await authApi.socialLogin(
          payload,
          tenantId,
        )

        if (error) {
          setError(error)
          setLoading(false)
          setShowTenantListModal(false)
          return
        }

        if (status === 300 && Array.isArray(data)) {
          const mapped: TenantOption[] = data.map((tenant: any) => ({
            id: tenant.id,
            label: tenant.name,
            value: tenant.id,
            email: tenant.email,
          }))
          setTenantList(mapped)
          setShowTenantListModal(true)
        } else {
          setShowTenantListModal(false)
          handleLoggedNavigation()
        }


        return
      }

      // NORMAL LOGIN BRANCH
      const payload = {
        email,
        password,
        loggedFrom: 'WEB',
      }

      const { error, data, status } = await authApi.login(payload, tenantId)

      if (error) {
        setLoading(false)
        setShowTenantListModal(false)

        if (error === 'You should login with Microsoft') {
          await handleMicrosoftLogin()
        } else if (error === 'You should login with Google') {
          await handleGoogleLogin()
        } else {
          setError(error)
        }
        return
      }

      if (status === 300 && Array.isArray(data)) {
        const mapped: TenantOption[] = data.map((tenant: any) => ({
          id: tenant.id,
          label: tenant.name,
          value: tenant.id,
          email: tenant.email,
        }))
        setTenantList(mapped)
        setShowTenantListModal(true)
      } else {
        setShowTenantListModal(false)
        handleLoggedNavigation()
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

  // === TENANT EMAIL VALIDATION (for checkTenantLogin origins) ===
  const validateEmail = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!email) {
        setError('Email is required')
        setLoading(false)
        return
      }

      const { error, data } = await authApi.emailValidate(1, { email })

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      setLoading(false)

      if (data === 'User') {
        setNormalLogin(true)
      } else if (data === 'ADUser') {
        await handleMicrosoftLogin()
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? 'Error validating email')
      setLoading(false)
    }
  }

  // === GOOGLE LOGIN (mirrors Vue googleSignIn flow) ===
  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onSuccess: async (tokenResponse) => {
      try {
        setError(null)
        setLoading(true)

        // fetch userinfo to get email (GIS only gives token)
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
        if (!gEmail) {
          throw new Error('No email returned from Google')
        }

        setSocialEmail(gEmail)
        setSocialLogged(true)
        setLoginType('Google')

        // same pattern as Vue: mark social & run signIn()
        await signIn()
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed')
    },
  })

  const handleGoogleLogin = async () => {
    googleLogin()
  }

  // === MICROSOFT LOGIN (mirrors Vue microsoftSignIn flow) ===
  const handleMicrosoftLogin = async () => {
    try {
      setError(null)
      setLoading(true)

      const loginResponse = await msalInstance.loginPopup({
        scopes: ['user.read'],
        loginHint: email || undefined,
      })

      const account = loginResponse.account
      const msEmail = account?.username || ''

      if (!msEmail) {
        throw new Error('No email returned from Microsoft')
      }

      setSocialEmail(msEmail)
      setSocialLogged(true)
      setLoginType('Microsoft')

      await signIn()
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? 'Microsoft sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  // === TENANT SELECTION (status 300) ===
  const handleTenantClick = async (tenantId: number | string) => {
    setShowTenantListModal(false)
    await signIn(tenantId)
  }

  const forgotPassword = () => navigate({ to: '/forgot-password' })

  // === derived welcome texts (matches Vue copy) ===
  const welcomeDescription = checkTenant
    ? 'Hi, Welcome!'
    : `Hi, Welcome back to ${isOnpremiseTenant ? 'APP' : 'EZOFIS'}`

  return (
    <>
      <IconIllustrated icon='tabler:user' />
      <HeroText
        description={welcomeDescription}
        title='Sign in to your account'
      />

      {/* This replaces Legend + checkEnv visual in Vue.
          If you have a Legend component in React, you can render it here based on checkEnv. */}

      {/* === MAIN CONTENT === */}
      {checkTenantLogin ? (
        // === Tenant login flow (Sobha domains) ===
        <>
          {!normalLogin ? (
            <>
              {/* Step 1: email only + continue */}
              <div className='space-y-4'>
                <InputText
                  label='Email'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder='hello@ezofis.com'
                  size='lg'
                  value={email}
                  onChange={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') validateEmail()
                  }}
                />
                <Button
                  className='w-full justify-center'
                  label='Continue'
                  loading={loading}
                  size='lg'
                  onClick={validateEmail}
                />
              </div>
              {error && (
                <div className='mt-2 text-center text-sm text-red-500'>
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Step 2: normal email/password login */}
              <div className='space-y-4'>
                <InputText
                  label='Email'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder='hello@ezofis.com'
                  size='lg'
                  value={email}
                  onChange={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
                <InputPassword
                  label='Password'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
                  size='lg'
                  value={password}
                  showPlaceholder
                  onChange={(v) => {
                    setPassword(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
                <Button
                  className='w-full justify-center'
                  label='Sign in'
                  loading={loading}
                  size='lg'
                  onClick={validate}
                />
              </div>
              {error && (
                <div className='mt-2 text-center text-sm text-red-500'>
                  {error}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // === Generic / AD login flow ===
        <>
          <div className='-mt-2 space-y-4'>
            {checkAdLogin ? (
              <>
                {/* AD Login: username + password */}
                <InputText
                  label='User name'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:user' />
                  }
                  placeholder='username'
                  size='lg'
                  value={email}
                  onChange={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
                <InputPassword
                  label='Password'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
                  size='lg'
                  value={password}
                  showPlaceholder
                  onChange={(v) => {
                    setPassword(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
              </>
            ) : (
              <>
                {/* Regular login: Email / Username + password */}
                <InputText
                  label='Email / Username'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder='hello@ezofis.com'
                  size='lg'
                  value={email}
                  onChange={(v) => {
                    setEmail(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
                <InputPassword
                  label='Password'
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
                  size='lg'
                  value={password}
                  showPlaceholder
                  onChange={(v) => {
                    setPassword(v)
                    setError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') validate()
                  }}
                />
              </>
            )}
          </div>

          {/* Remember / Forgot (mirrors Vue's conditional forgot; here always on except AD) */}
          {!checkAdLogin && checkForgot && (
            <div className='mt-3 flex items-center justify-between gap-4'>
              <InputCheckbox
                label='Keep me logged in'
                checked={rememberMe}
                labelClassName='text-gray'
                onChange={(v) => setRememberMe(Boolean(v))}
              />

              <div
                className='cursor-pointer text-gray-11 underline hover:text-gray-12'
                onClick={forgotPassword}
              >
                Forgot password?
              </div>
            </div>
          )}

          <Button
            className='mt-4 w-full justify-center'
            label='Sign In'
            loading={loading}
            size='lg'
            onClick={validate}
          />

          {error && (
            <div className='mt-2 text-center text-sm text-red-500'>
              {error}
            </div>
          )}

          {/* Social section – Vue used <SocialAuths>, here we expose Google + Microsoft directly */}
          {!checkAdLogin && (
            <>
              <Divider label='Or' />
              <div className='space-y-3'>
                <GoogleButton onClick={handleGoogleLogin} />
                <MicrosoftButton onClick={handleMicrosoftLogin} />
              </div>
            </>
          )}
        </>
      )}

      {/* === Tenant list modal (status 300) === */}
      {showTenantListModal && (
        <div className='mt-6 rounded-md border border-gray-4 bg-gray-1 p-4'>
          <div className='mb-3 text-sm text-gray-12'>
            It looks like <strong>{socialLogged ? socialEmail : email}</strong>{' '}
            is used with more than one account. Which account do you want to
            use?
          </div>
          <div className='space-y-2'>
            {tenantList.map((tenant) => (
              <button
                key={tenant.id}
                type='button'
                className='flex w-full items-center justify-between rounded-md border border-gray-4 bg-white px-3 py-2 text-left text-sm hover:bg-gray-2'
                onClick={() => handleTenantClick(tenant.id)}
              >
                <div className='flex items-center gap-2'>
                  <Icon name='tabler:user' className='text-gray-9' />
                  <span>{tenant.label}</span>
                </div>
                <Icon name='tabler:chevron-right' className='text-gray-8' />
              </button>
            ))}
          </div>
          <button
            type='button'
            className='mt-3 text-xs text-gray-11 underline hover:text-gray-12'
            onClick={() => {
              setShowTenantListModal(false)
              setSocialLogged(false)
              setSocialEmail('')
              setLoginType('')
            }}
          >
            Sign in with a different email address
          </button>
        </div>
      )}
    </>
  )
}

SignInForm.displayName = 'SignInForm'
export default SignInForm