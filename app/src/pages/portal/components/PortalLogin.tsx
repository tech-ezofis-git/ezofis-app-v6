import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { PortalConfig } from '@/pages/settings/helpers/portalConfigStorage'
import apiRouter from '@/api/apiRouter'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import ThemeSwitcher from '@/layouts/auth/components/ThemeSwitcher'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import SignInForm from '@/pages/sign-in/components/SignInForm'
import cn from '@/utils/cn'
import type { PortalAuthUser } from '../stores/usePortalSessionStore'
import { entryFieldValue, searchPortalEntries } from '../helpers/portalEntries'
import { userIdFromIdentity } from '../helpers/portalWorkflowAccess'
import PortalBrandMark from './PortalBrandMark'

type PortalLoginProps = {
  portal: PortalConfig
  onAuthenticated: (user: PortalAuthUser) => void
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const asRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const displayNameFromIdentity = (
  payload: unknown,
  fallback: string,
): string => {
  const record = asRecord(payload)
  if (!record) return fallback
  const nested = asRecord(record.user) || asRecord(record.session)
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

export default function PortalLogin({
  portal,
  onAuthenticated,
}: PortalLoginProps) {
  const { t } = useLingui()
  const auth = portal.authentication
  const isMaster = portal.loginType === 'masterLogin'
  const isApplication = portal.loginType === 'applicationLogin'
  const usesPassword = isMaster && auth.passwordTypes === 'PASSWORD'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingUser, setPendingUser] = useState<PortalAuthUser | null>(null)
  const { elapsed, resendLabel, resetTimer } = useResendTimer(t`Resend OTP`)

  const brandName = portal.branding?.brandName?.trim() || 'EZOFIS'
  const welcome =
    portal.displayValues?.trim() ||
    t`Welcome to ${portal.name || 'EZOFIS Portal'}`

  const identifierLabel = isMaster ? t`Username` : t`Email`
  const identifierPlaceholder = isMaster
    ? t`Enter your username`
    : t`you@company.com`

  const finishLogin = (user: PortalAuthUser) => {
    onAuthenticated(user)
  }

  if (isApplication) {
    const socialProviders = auth.socialLogin.filter(
      (provider): provider is 'Google' | 'Microsoft' =>
        provider === 'Google' || provider === 'Microsoft',
    )

    return (
      <div className='relative min-h-svh bg-surface p-6'>
        <header className='flex items-center justify-between'>
          <PortalBrandMark
            branding={portal.branding}
            fallbackName={brandName}
          />
          <ThemeSwitcher />
        </header>

        <div
          className='flex items-center justify-center py-10'
          style={{ minHeight: 'calc(100dvh - 120px)' }}
        >
          <div className='mx-auto w-105'>
            <SignInForm
              persistIdentity={false}
              showForgotPassword={false}
              showSocial={auth.signInType}
              tenantId={portal.tenantId || undefined}
              branding={{
                name: brandName,
              }}
              socialProviders={
                socialProviders.length > 0 ? socialProviders : undefined
              }
              onChangeView={() => undefined}
              onSignedIn={async (result) => {
                finishLogin({
                  accessToken: result.accessToken,
                  displayName: displayNameFromIdentity(
                    result.identity,
                    result.email.split('@')[0],
                  ),
                  tenantId: result.tenantId,
                  userId: userIdFromIdentity(result.identity),
                  username: result.email,
                })
              }}
            />
          </div>
        </div>

        <footer className='text-center text-12 text-gray-9'>
          {t`Powered by`}{' '}
          <span className='font-semibold text-primary-11'>EZOFIS</span>
        </footer>
      </div>
    )
  }

  const lookupMasterUser = async (username: string) => {
    const formId = String(auth.formId || '')
    const usernameField = auth.usernameField[0]
    if (!formId || formId === '0' || !usernameField) {
      throw new Error(
        t`This portal is missing a master form or username field.`,
      )
    }

    const result = await searchPortalEntries({
      fieldId: String(usernameField),
      formId,
      tenantId: portal.tenantId,
      value: username,
    })

    if (result.error) throw new Error(result.error)
    if (!result.entries.length) {
      throw new Error(t`No account found for this username.`)
    }

    const entry = result.entries[0]
    const displayName =
      entryFieldValue(entry, auth.firstnameField) ||
      entryFieldValue(entry, usernameField) ||
      username

    return {
      displayName,
      entry,
      itemId: Number(entry.itemId || 0) || undefined,
      username,
    } satisfies PortalAuthUser
  }

  const sendOtp = async (email: string) => {
    const { error: otpError } = await apiRouter.sendMailOTP({
      email,
      requiredOTP: true,
    })
    if (otpError) throw new Error(t`Failed to send OTP. Please try again.`)
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

      if (isMaster && usesPassword) {
        if (!password) {
          setError(t`Please fill the required field: Password`)
          return
        }
        const user = await lookupMasterUser(nextIdentifier)
        const expected = entryFieldValue(user.entry, auth.passwordField)
        if (!expected || expected !== password) {
          throw new Error(t`Invalid username or password.`)
        }
        finishLogin(user)
        return
      }

      if (!isEmail(nextIdentifier)) {
        setError(t`Enter a valid email address.`)
        return
      }

      if (isMaster) {
        const user = await lookupMasterUser(nextIdentifier)
        setPendingUser(user)
      } else {
        setPendingUser({
          displayName: nextIdentifier.split('@')[0],
          username: nextIdentifier,
        })
      }

      await sendOtp(nextIdentifier)
      setStep('otp')
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
      const { data, error: otpError } = await apiRouter.verifyMailOTP({
        email: identifier.trim(),
        otp: String(otp).trim(),
      })
      if (otpError || (data && data !== 'Success')) {
        throw new Error(t`Invalid OTP. Please try again.`)
      }
      finishLogin(
        pendingUser || {
          displayName: identifier.split('@')[0],
          username: identifier.trim(),
        },
      )
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
      await sendOtp(identifier.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Unable to resend OTP`)
    }
  }

  return (
    <div className='relative min-h-svh bg-surface p-6'>
      <header className='flex items-center justify-between'>
        <PortalBrandMark branding={portal.branding} fallbackName={brandName} />
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
            title={step === 'otp' ? t`Verify OTP` : welcome}
            titleClassName='text-center'
            description={
              step === 'otp'
                ? t`Code sent to ${identifier}`
                : t`Log in to submit and track your requests`
            }
          />

          {error ? (
            <Alert className='mt-4' text={error} variant='primary' />
          ) : null}

          {step === 'credentials' ? (
            <>
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
                    type='text'
                    value={identifier}
                    autoFocus
                    leftSection={
                      <Icon className='text-gray-8' name='tabler:mail' />
                    }
                    onChange={setIdentifier}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleCredentials()
                      }
                    }}
                  />
                  {usesPassword ? (
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
                  label={usesPassword ? t`Sign In` : t`Send OTP`}
                  loading={loading}
                  size='lg'
                  type='submit'
                />
              </form>
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
                  setPendingUser(null)
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
