import { useMsal } from '@azure/msal-react'
import { useLingui } from '@lingui/react/macro'
import { useGoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { loginClassic, socialLoginClassic } from '@/api/v5/classicAuth'
import {
  classicPortalMasterLogin,
  classicPortalOtpLogin,
} from '@/api/v5/classicPortal'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import GoogleButton from '@/components/base/button/GoogleButton'
import MicrosoftButton from '@/components/base/button/MicrosoftButton'
import Divider from '@/components/base/Divider'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import ThemeSwitcher from '@/layouts/auth/components/ThemeSwitcher'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import {
  isClassicIdentity,
  persistClassicIdentity,
} from '@/lib/classic-gateway'
import cn from '@/utils/cn'
import type { ClassicPortalAuthSettings } from '../helpers/classicPortalConfig'
import type { PortalAuthUser } from '../stores/usePortalSessionStore'
import PortalBrandMark from './PortalBrandMark'

type ClassicPortalLoginProps = {
  auth: ClassicPortalAuthSettings
  logoUrl: string
  portalId: string
  portalName: string
  tenantId: string
  onAuthenticated: (user: PortalAuthUser, identity: unknown) => void
}

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const displayNameFromIdentity = (payload: unknown, fallback: string) => {
  const record = asRecord(payload)
  if (!record) return fallback
  const nested = asRecord(record.identity) || asRecord(record.session)
  const firstName = String(record.firstName || nested?.firstName || '').trim()
  const lastName = String(record.lastName || nested?.lastName || '').trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  return (
    String(
      record.name ||
        record.userName ||
        record.username ||
        nested?.name ||
        fullName ||
        record.email ||
        nested?.email ||
        '',
    ).trim() || fallback
  )
}

export default function ClassicPortalLogin({
  auth,
  logoUrl,
  portalId,
  portalName,
  tenantId,
  onAuthenticated,
}: ClassicPortalLoginProps) {
  const { t } = useLingui()
  const { instance: msalInstance } = useMsal()
  const isMaster = auth.loginType === 'MASTER_LOGIN'
  const isApp = auth.loginType === 'APP_LOGIN'
  const isMobile = auth.loginType === 'MOBILE_LOGIN'
  const usesPassword = isMaster && auth.passwordTypes === 'PASSWORD'
  const usesOtp =
    auth.loginType === 'EMAIL_LOGIN' ||
    isMobile ||
    (isMaster && auth.passwordTypes === 'OTP')
  const usesSocial =
    (isApp && auth.socialLogin.length > 0) ||
    (isMaster &&
      (auth.passwordTypes === 'SOCIAL_LOGIN' || auth.socialLogin.length > 0))
  const showGoogle = auth.socialLogin.includes('Google')
  const showMicrosoft = auth.socialLogin.includes('Microsoft')

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMasterSocial, setShowMasterSocial] = useState(
    isMaster && auth.passwordTypes === 'SOCIAL_LOGIN',
  )
  const { elapsed, resendLabel, resetTimer } = useResendTimer(t`Resend OTP`)

  const brandName = portalName.trim() || 'EZOFIS'
  const branding = { brandName, logo: logoUrl }
  const identifierLabel = isMobile
    ? t`Mobile`
    : isApp || (isMaster && usesPassword)
      ? t`Email / Username`
      : t`Email`
  const identifierPlaceholder = isMobile
    ? t`Enter your mobile number`
    : t`hello@ezofis.com`

  const finishWithIdentity = (identity: unknown, fallback: string) => {
    if (!persistClassicIdentity(identity, { portalId, tenantId })) {
      setError(t`Sign in succeeded but the session could not be saved.`)
      return
    }
    onAuthenticated(
      {
        displayName: displayNameFromIdentity(identity, fallback),
        tenantId,
        username: fallback,
      },
      identity,
    )
  }

  const masterPayload = (extra: {
    otp?: string
    password?: string
    socialLogin?: boolean
  }) => ({
    email: identifier.trim(),
    emailColumn: auth.usernameField,
    formId: auth.formId,
    hasNewUser: auth.signInType,
    nameColumn: auth.firstnameField,
    otp: extra.otp || '',
    password: extra.password || '',
    passwordColumn: extra.socialLogin ? '' : auth.passwordField,
    portalId,
    socialLogin: Boolean(extra.socialLogin),
    tenantId,
  })

  const sendOtp = async () => {
    const payload = isMaster
      ? masterPayload({ otp: '' })
      : { email: identifier.trim(), otp: '', portalId, tenantId }
    const result = isMaster
      ? await classicPortalMasterLogin(payload)
      : await classicPortalOtpLogin(payload)
    if (result.error) throw new Error(result.error)
    resetTimer()
  }

  const handleCredentials = async () => {
    if (loading) return
    setError('')
    const nextIdentifier = identifier.trim()
    if (!nextIdentifier) {
      setError(t`Please fill the required field: ${identifierLabel}`)
      return
    }

    try {
      setLoading(true)

      if (isApp) {
        if (!password) {
          setError(t`Please fill the required field: Password`)
          return
        }
        const { data, error: loginError } = await loginClassic(
          {
            email: nextIdentifier,
            loggedFrom: 'WEB',
            password,
            portalId,
          },
          tenantId,
        )
        if (loginError || !data) {
          throw new Error(loginError || t`Unable to sign in`)
        }
        finishWithIdentity(data, nextIdentifier)
        return
      }

      if (usesPassword) {
        if (!password) {
          setError(t`Please fill the required field: Password`)
          return
        }
        const { data, error: loginError } = await classicPortalMasterLogin(
          masterPayload({ password }),
        )
        if (loginError || !data) {
          throw new Error(loginError || t`Unable to sign in`)
        }
        finishWithIdentity(data, nextIdentifier)
        return
      }

      if (isMaster && auth.passwordTypes === 'SOCIAL_LOGIN') {
        const { error: loginError } = await classicPortalMasterLogin(
          masterPayload({}),
        )
        if (loginError) throw new Error(loginError)
        setShowMasterSocial(true)
        return
      }

      if (usesOtp) {
        await sendOtp()
        setStep('otp')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Unable to sign in`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (loading) return
    setError('')
    if (String(otp).trim().length !== 6) {
      setError(t`Enter the 6-digit OTP.`)
      return
    }
    try {
      setLoading(true)
      const payload = isMaster
        ? masterPayload({ otp: String(otp).trim() })
        : {
            email: identifier.trim(),
            otp: String(otp).trim(),
            portalId,
            tenantId,
          }
      const result = isMaster
        ? await classicPortalMasterLogin(payload)
        : await classicPortalOtpLogin(payload)
      if (result.error || !result.data) {
        throw new Error(result.error || t`Invalid OTP. Please try again.`)
      }
      finishWithIdentity(result.data, identifier.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Unable to verify OTP`)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (elapsed > 0) return
    try {
      setError('')
      await sendOtp()
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Unable to resend OTP`)
    }
  }

  const completeSocial = async (
    email: string,
    loginType: 'Google' | 'Microsoft',
  ) => {
    setError('')
    setLoading(true)
    try {
      if (isMaster) {
        const { data, error: loginError } = await classicPortalMasterLogin({
          ...masterPayload({ socialLogin: true }),
          email,
        })
        if (loginError) throw new Error(loginError)
        if (isClassicIdentity(data)) {
          finishWithIdentity(data, email)
          return
        }
      }

      const { data, error: loginError } = await socialLoginClassic(
        { email, loggedFrom: 'PORTAL', loginType },
        tenantId,
      )
      if (loginError || !data) {
        throw new Error(loginError || t`Unable to sign in`)
      }
      finishWithIdentity(data, email)
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Unable to sign in`)
    } finally {
      setLoading(false)
    }
  }

  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onError: () => setError(t`Google sign-in was cancelled or failed`),
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          },
        )
        const profile = (await res.json()) as { email?: string }
        const gEmail = String(profile.email || '')
        if (!gEmail) throw new Error(t`No email returned from Google`)
        await completeSocial(gEmail, 'Google')
      } catch (err) {
        setError(err instanceof Error ? err.message : t`Google sign-in failed`)
      }
    },
  })

  const handleMicrosoftLogin = async () => {
    try {
      setError('')
      setLoading(true)
      const loginResponse = await msalInstance.loginPopup({
        loginHint: identifier || undefined,
        scopes: ['user.read'],
      })
      const msEmail = loginResponse.account?.username || ''
      if (!msEmail) throw new Error(t`No email returned from Microsoft`)
      await completeSocial(msEmail, 'Microsoft')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (
        message.includes('user_cancelled') ||
        message.includes('User cancelled the flow')
      ) {
        setError(t`Microsoft sign-in was cancelled.`)
      } else {
        setError(message || t`Microsoft sign-in failed`)
      }
      setLoading(false)
    }
  }

  const showSocialButtons =
    usesSocial &&
    (showGoogle || showMicrosoft) &&
    (isApp || showMasterSocial || (isMaster && auth.socialLogin.length > 0))

  return (
    <div className='relative min-h-svh bg-surface p-6'>
      <header className='flex items-center justify-between'>
        <PortalBrandMark branding={branding} fallbackName={brandName} />
        <ThemeSwitcher />
      </header>

      <div
        className='flex items-center justify-center py-10'
        style={{ minHeight: 'calc(100dvh - 120px)' }}
      >
        <div className='mx-auto w-105'>
          {step === 'otp' ? (
            <span className='mx-auto flex size-14 items-center justify-center rounded-full bg-primary-3 text-primary-11'>
              <Icon className='size-7' name='lucide:shield-check' />
            </span>
          ) : (
            <IconIllustrated icon='tabler:user' />
          )}

          <Title
            className='text-center'
            descriptionClassName='text-center'
            level={1}
            title={step === 'otp' ? t`Verify OTP` : t`Sign in to your account`}
            titleClassName='text-center'
            description={
              step === 'otp'
                ? t`Code sent to ${identifier}`
                : t`Hi, Welcome back to ${brandName}`
            }
          />

          {error ? (
            <Alert className='mt-4' text={error} variant='primary' />
          ) : null}

          {step === 'credentials' ? (
            <>
              {auth.passwordTypes === 'SOCIAL_LOGIN' &&
              isMaster &&
              showMasterSocial ? null : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleCredentials()
                  }}
                >
                  <div className='mt-4 space-y-4'>
                    <InputText
                      autoComplete='username'
                      label={identifierLabel}
                      placeholder={identifierPlaceholder}
                      type={isMobile ? 'tel' : 'text'}
                      value={identifier}
                      autoFocus
                      leftSection={
                        <Icon
                          className='text-gray-8'
                          name={
                            isMobile ? 'tabler:device-mobile' : 'tabler:mail'
                          }
                        />
                      }
                      onChange={setIdentifier}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleCredentials()
                        }
                      }}
                    />
                    {usesPassword || isApp ? (
                      <InputPassword
                        autoComplete='current-password'
                        label={t`Password`}
                        value={password}
                        showPlaceholder
                        leftSection={
                          <Icon className='text-gray-8' name='tabler:lock' />
                        }
                        onChange={setPassword}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void handleCredentials()
                          }
                        }}
                      />
                    ) : null}
                  </div>
                  <Button
                    className='mt-4 w-full justify-center'
                    label={usesPassword || isApp ? t`Sign In` : t`Authenticate`}
                    loading={loading}
                    size='lg'
                    type='submit'
                  />
                </form>
              )}

              {showSocialButtons ? (
                <>
                  <Divider className='mt-4' label={t`Or`} />
                  <div className='mt-3 space-y-3'>
                    {showGoogle ? (
                      <GoogleButton onClick={() => googleLogin()} />
                    ) : null}
                    {showMicrosoft ? (
                      <MicrosoftButton
                        onClick={() => void handleMicrosoftLogin()}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <form
              className='mt-4 space-y-4'
              onSubmit={(event) => {
                event.preventDefault()
                void handleVerifyOtp()
              }}
            >
              <InputPin
                length={6}
                value={otp}
                onChange={(value) => setOtp(String(value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleVerifyOtp()
                  }
                }}
              />
              <Button
                className='w-full justify-center'
                label={t`Verify & Sign in`}
                loading={loading}
                size='lg'
                type='submit'
              />
              <button
                className='mx-auto flex items-center gap-1 text-13 text-gray-11 underline hover:text-gray-12'
                type='button'
                onClick={() => {
                  setStep('credentials')
                  setOtp('')
                  setError('')
                }}
              >
                {t`Use a different ${identifierLabel.toLowerCase()}`}
              </button>
              <button
                disabled={elapsed > 0}
                type='button'
                className={cn(
                  'mx-auto block text-13',
                  elapsed > 0
                    ? 'cursor-not-allowed text-gray-8'
                    : 'text-primary-11 underline hover:text-primary-12',
                )}
                onClick={() => void handleResend()}
              >
                {resendLabel}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className='text-center text-12 text-gray-9'>
        {t`Powered by`}{' '}
        <span className='font-semibold text-primary-11'>EZOFIS</span>
      </footer>
    </div>
  )
}
