import { useMsal } from '@azure/msal-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import apiRouter from '@/api/apiRouter'
import authApi from '@/api/auth'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
import { AnimateSlideLeft } from '@/components/common/animations'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
interface Props {
  onChangeView: () => void
}

type TenantOption = {
  email: string
  id: number | string
  label: string
  value: number | string
}

const SignInForm = ({ onChangeView }: Props) => {
  const navigate = useNavigate()
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
  const [selectedTenantId, setSelectedTenantId] = useState<
    number | string | null
  >(null)

  // === environment-based flags (computed in Vue) ===
  const origin =
    globalThis.window === undefined ? '' : globalThis.location.origin

  const {
    checkAdLogin,
    checkForgot,
    checkTenant,
    checkTenantLogin,
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

    const tenantSocialLogin = !(
      o === 'https://ag-appsvc01.azurewebsites.net' ||
      o === 'https://ag-appsvc05.azurewebsites.net' ||
      o === 'https://ezappdev01.frankmortgage.com' ||
      o === 'https://agentprd01.azurewebsites.net'
    )

    const adLogin = o === 'http://172.16.1.118'
    const forgot = o === 'http://localhost:8080'
    const onPremise = o === 'https://dfms.m2p.app'

    return {
      checkAdLogin: adLogin,
      checkEnv: env,
      checkForgot: forgot,
      checkTenant: tenant,
      checkTenantLogin: tenantLogin,
      checkTenantSocialLogin: tenantSocialLogin,
      isOnpremiseTenant: onPremise,
    }
  }, [origin])

  // === navigation after successful login (simplified Vue logged()) ===
  const handleLoggedNavigation = async () => {
    const { setisApSetUpCompleted, setRestrictNavigationUntilApSetup } =
      useSetupStore.getState()
    setRestrictNavigationUntilApSetup(false)
    setisApSetUpCompleted(true)

    try {
      await authApi.getSession()
    } catch (err) {
      console.error('Failed to load session details:', err)
    }

    // In Vue this used profileMenus + workspace access logic.
    // For now, replicate the basic behavior: honor 2FA, then go home.
    navigate({ replace: true, to: '/requests' })
    setLoading(false)
  }

  // === EMAIL + PASSWORD LOGIN (with tenant + social support) ===
  const signInSocial = async (tenantId?: number | string) => {
    const payload = {
      email: socialEmail,
      loggedFrom: 'WEB',
      loginType,
    }

    const { data, error, status } = await authApi.socialLogin(payload, tenantId)

    if (error) {
      setError(error)
      setLoading(false)
      setShowTenantListModal(false)
      return
    }

    if (status === 300 && Array.isArray(data)) {
      const mapped: TenantOption[] = data.map((tenant: any) => ({
        email: tenant.email,
        id: tenant.id,
        label: tenant.name,
        value: tenant.id,
      }))
      setTenantList(mapped)
      setShowTenantListModal(true)
    } else {
      setShowTenantListModal(false)
      setTenantList([])

      setTimeout(() => {
        handleLoggedNavigation()
      }, 100)
    }
  }

  const signIn = async (tenantId?: number | string) => {
    try {
      setError(null)
      setLoading(true)

      // SOCIAL BRANCH (Google / Microsoft)
      if (socialLogged) {
        await signInSocial(tenantId)
        return
      }

      // NORMAL LOGIN BRANCH
      const payload = {
        email,
        loggedFrom: 'WEB',
        password,
      }

      const { data, error, status } = await apiRouter.login(payload, tenantId)

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
        showToast({
          message: 'User found with multiple tenant',
          variant: 'warning',
        })
        const mapped: TenantOption[] = data.map((tenant: any) => ({
          email: tenant.email,
          id: tenant.id,
          label: tenant.name,
          value: tenant.id,
        }))
        setTenantList(mapped)
        setShowTenantListModal(true)
      } else {
        showToast({ message: 'SuccessFully Logged in', variant: 'success' })
        setShowTenantListModal(false)
        setTenantList([])
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

      const { data, error } = await authApi.emailValidate(1, { email })

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
    onError: () => {
      setError('Google sign-in was cancelled or failed')
    },
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
        loginHint: email || undefined,
        scopes: ['user.read'],
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
    setSelectedTenantId(tenantId)
    setLoading(true)
    // Don't close modal here, just sign in
    await signIn(tenantId)
    // After successful sign in, redirect will happen in handleLoggedNavigation
  }

  const handleBackToSignIn = () => {
    setShowTenantListModal(false)
    setTenantList([])
    setSocialLogged(false)
    setSocialEmail('')
    setLoginType('')
    setSelectedTenantId(null)
    setError(null)
  }

  const forgotPassword = () => navigate({ to: '/forgot-password' })

  // === derived welcome texts (matches Vue copy) ===
  let welcomeDescription = 'Hi, Welcome!'
  if (!checkTenant) {
    const appName = isOnpremiseTenant ? 'APP' : 'EZOFIS'
    welcomeDescription = `Hi, Welcome back to ${appName}`
  }

  // Show tenant selection UI instead of sign-in form when tenant list is available
  if (showTenantListModal && tenantList.length > 0) {
    return (
      <>
        <AnimateSlideLeft delay={0.1} distance={30}>
          {/* <IconIllustrated icon='tabler:user' /> */}
        </AnimateSlideLeft>
        <AnimateSlideLeft delay={0.15} distance={30}>
          {/* <Title
            description={welcomeDescription}
            title='Select Account'
            level={1}
            className='text-center'
          /> */}
        </AnimateSlideLeft>

        {/* Back button */}
        <AnimateSlideLeft delay={0.2} distance={30}>
          <button
            className='group mb-6 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-11 transition-all duration-200 hover:text-primary-11'
            type='button'
            onClick={handleBackToSignIn}
          >
            <Icon
              className='text-gray-9 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-primary-11'
              name='tabler:arrow-left'
            />
            <span>Back to Sign In</span>
          </button>
        </AnimateSlideLeft>

        <AnimateSlideLeft delay={0.25} distance={30}>
          <div className='mb-6 text-sm leading-relaxed text-gray-12'>
            It looks like{' '}
            <strong className='text-gray-13'>
              {socialLogged ? socialEmail : email}
            </strong>{' '}
            is used with more than one account. Which account do you want to
            use?
          </div>
        </AnimateSlideLeft>

        {/* Animated tenant list - Compact Design */}
        <AnimatePresence mode='wait'>
          <div className='space-y-2'>
            {tenantList.map((tenant, index) => {
              const isSelected = selectedTenantId === tenant.id
              const isLoading = loading && isSelected

              return (
                <AnimateSlideLeft
                  delay={0.3 + index * 0.1}
                  distance={50}
                  key={tenant.id}
                >
                  <button
                    disabled={loading}
                    type='button'
                    className={`group relative flex w-full cursor-pointer items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-left transition-all duration-300 ${
                      isLoading
                        ? 'border-primary-9 bg-primary-1 shadow-sm'
                        : 'border-gray-4 hover:border-primary-6 hover:bg-gray-1'
                    }`}
                    onClick={() => handleTenantClick(tenant.id)}
                  >
                    <div className='flex items-center gap-2.5'>
                      {/* Compact user icon/avatar */}
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          isLoading
                            ? 'scale-105 bg-primary-9'
                            : 'bg-gradient-to-br from-primary-4 to-primary-6 group-hover:from-primary-5 group-hover:to-primary-7'
                        }`}
                      >
                        <Icon
                          name='tabler:user'
                          className={`size-3.5 transition-colors duration-300 ${
                            isLoading ? 'text-white' : 'text-primary-11'
                          }`}
                        />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div
                          className={`text-sm font-medium transition-colors duration-300 ${
                            isLoading
                              ? 'text-primary-11'
                              : 'text-gray-13 group-hover:text-primary-11'
                          }`}
                        >
                          {tenant.label}
                        </div>
                      </div>
                    </div>

                    {/* Right side icon */}
                    <div className='flex items-center'>
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            ease: 'linear',
                            repeat: Infinity,
                          }}
                        >
                          <Icon
                            className='size-4 text-primary-11'
                            name='tabler:loader-2'
                          />
                        </motion.div>
                      ) : (
                        <Icon
                          className='size-4 text-gray-8 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary-11'
                          name='tabler:chevron-right'
                        />
                      )}
                    </div>
                  </button>
                </AnimateSlideLeft>
              )
            })}
          </div>
        </AnimatePresence>

        <AnimateSlideLeft delay={0.4 + tenantList.length * 0.1} distance={30}>
          <button
            className='mt-6 cursor-pointer text-xs font-medium text-gray-11 underline transition-colors duration-200 hover:text-primary-11'
            type='button'
            onClick={handleBackToSignIn}
          >
            Sign in with a different email address
          </button>
        </AnimateSlideLeft>
      </>
    )
  }

  return (
    <>
      <IconIllustrated icon='tabler:user' />
      <Title
        className='text-center'
        description={welcomeDescription}
        level={1}
        title='Sign in to your account'
      />

      {/* This replaces Legend + checkEnv visual in Vue.
          If you have a Legend component in React, you can render it here based on checkEnv. */}

      {/* === MAIN CONTENT === */}
      {checkTenantLogin ? (
        // === Tenant login flow (Sobha domains) ===
        <>
          {normalLogin ? (
            <>
              {/* Step 2: normal email/password login */}
              <div className='space-y-4'>
                <InputText
                  label='Email'
                  placeholder='hello@ezofis.com'
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
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
                  // size='lg'
                  value={password}
                  showPlaceholder
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
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
                <div className='text-red-500 mt-2 text-center text-sm'>
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Step 1: email only + continue */}
              <div className='space-y-4'>
                <InputText
                  label='Email'
                  placeholder='hello@ezofis.com'
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
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
                <div className='text-red-500 mt-2 text-center text-sm'>
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
                  placeholder='username'
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:user' />
                  }
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
                  // size='lg'
                  value={password}
                  showPlaceholder
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
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
                  placeholder='hello@ezofis.com'
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
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
                  // size='lg'
                  value={password}
                  showPlaceholder
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:lock' />
                  }
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
                checked={rememberMe}
                label='Keep me logged in'
                labelClassName='text-gray'
                onChange={(v) => setRememberMe(Boolean(v))}
              />

              <button
                className='font-inherit cursor-pointer border-0 bg-transparent p-0 text-gray-11 underline outline-none hover:text-gray-12'
                type='button'
                onClick={forgotPassword}
              >
                Forgot password?
              </button>
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
            <div className='text-red-500 mt-2 text-center text-sm'>{error}</div>
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
    </>
  )
}

SignInForm.displayName = 'SignInForm'
export default SignInForm
