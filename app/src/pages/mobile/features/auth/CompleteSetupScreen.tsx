import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLingui } from '@lingui/react/macro'
import { apiRouter } from '@/api/apiRouter'
import showToast from '@/components/base/toast/showToast'
import {
  requirementsConfig,
} from '@/layouts/auth/components/PasswordRequirements'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { AppButton } from '../../components/primitives/AppButton'
import { AppInput } from '../../components/primitives/AppInput'
import { Icon } from '../../components/primitives/Icon'
import { AuthHeroShell } from './AuthHeroShell'

export function CompleteSetupScreen() {
  const navigate = useNavigate()
  const { i18n } = useLingui()
  const { signUpUserData, setSignUpUserData } = authUserStore()

  const loginType = String(signUpUserData.loginType || 'EZOFIS').toUpperCase()
  const isSocial = useMemo(
    () => loginType === 'GOOGLE' || loginType === 'MICROSOFT',
    [loginType],
  )

  const [firstName, setFirstName] = useState(signUpUserData.firstName || '')
  const [lastName, setLastName] = useState(signUpUserData.lastName || '')
  const [organisation, setOrganisation] = useState(
    signUpUserData.organisation || '',
  )
  const [password, setPassword] = useState(signUpUserData.password || '')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSignUpUserData({
      firstName,
      lastName,
      licenseType: '3',
      loginType,
      organisation,
      password: isSocial ? '' : password,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, organisation, password, isSocial, loginType])

  const validateForm = (): string | null => {
    if (!signUpUserData.email)
      return "We couldn't find your email address. Please start the sign-up process again."
    if (!firstName.trim() || !lastName.trim() || !organisation.trim()) {
      return 'Please complete all required fields before continuing.'
    }

    if (!isSocial) {
      if (!password) return 'Please enter a password.'
      const unmet = requirementsConfig.find((req) => !req.regex.test(password))
      if (unmet) {
        return "Your password doesn't meet the requirements. Please check the password requirements and try again."
      }
      if (password !== confirmPassword) return "The passwords don't match. Please try again."
    }
    return null
  }

  const handleSignUp = async () => {
    try {
      setError(null)
      const validationError = validateForm()
      if (validationError) {
        setError(validationError)
        return
      }

      const email = signUpUserData.email
      setLoading(true)

      const payload = {
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        licenseType: 3,
        loginType,
        organisation: organisation.trim(),
        password: isSocial ? '' : password,
      }

      const { data, status } = await apiRouter.signUp(payload)

      if (status === 200 || status === 201 || data === 'Success') {
        if (isSocial) {
          const loginRes = await apiRouter.socialLogin({
            email,
            loggedFrom: 'WEB',
            loginType,
          })
          if (loginRes.error) {
            setError(loginRes.error)
            setLoading(false)
            return
          }
        } else {
          const loginRes = await apiRouter.login({ email, password })
          if (loginRes.error) {
            setError(loginRes.error)
            setLoading(false)
            return
          }
        }

        await apiRouter.userSession()

        const {
          setisApSetUpCompleted,
          setIsSetupStarted,
          setRestrictNavigationUntilApSetup,
        } = useSetupStore.getState()
        setRestrictNavigationUntilApSetup(true)
        setisApSetUpCompleted(false)
        setIsSetupStarted(true)

        const identity = authUserStore.getState().identity
        const token = identity?.token || identity?.accessToken || 'token'

        showToast({
          message: 'Account setup completed successfully',
          variant: 'success',
        })
        setLoading(false)
        void navigate({ params: { token }, to: '/on-boarding/$token' })
      } else {
        setError(
          'Failed to complete account setup. Please contact the EZOFIS team.',
        )
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setError(
        'Failed to complete account setup. Please contact the EZOFIS team.',
      )
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void handleSignUp()
  }

  return (
    <AuthHeroShell>
      <form className='flex flex-col' onSubmit={handleSubmit}>
        <div className='mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent-primary'>
          <Icon className='size-7' name='Lock' />
        </div>
        <h2 className='text-center text-16 font-semibold text-text-primary'>
          Complete setup
        </h2>
        <p className='mt-1.5 text-center text-12 text-text-muted'>
          Complete your profile to activate your workspace
        </p>

        <div className='mt-5 flex flex-col gap-3'>
          <AppInput
            autoComplete='given-name'
            label='First name'
            name='firstName'
            placeholder='Jane'
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setError(null)
            }}
          />
          <AppInput
            autoComplete='family-name'
            label='Last name'
            name='lastName'
            placeholder='Doe'
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              setError(null)
            }}
          />
          <AppInput
            autoComplete='organization'
            label='Organisation'
            name='organisation'
            placeholder='Acme Inc.'
            value={organisation}
            onChange={(e) => {
              setOrganisation(e.target.value)
              setError(null)
            }}
          />

          {!isSocial ? (
            <>
              <AppInput
                autoComplete='new-password'
                label='Password'
                name='password'
                placeholder='••••••••'
                type={showPassword ? 'text' : 'password'}
                value={password}
                trailing={
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className='inline-flex size-8 items-center justify-center rounded-lg text-text-muted'
                    type='button'
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <Icon
                      className='size-4'
                      name={showPassword ? 'EyeOff' : 'Eye'}
                    />
                  </button>
                }
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
              />

              <ul className='space-y-1.5 rounded-xl bg-surface-muted px-3 py-2.5'>
                {requirementsConfig.map((req) => {
                  const ok = req.regex.test(password)
                  return (
                    <li
                      className={cn(
                        'flex items-center gap-1.5 text-11',
                        ok ? 'font-medium text-success-main' : 'text-text-muted',
                      )}
                      key={req.id}
                    >
                      <Icon
                        className='size-3.5'
                        name={ok ? 'CircleCheck' : 'Circle'}
                      />
                      {i18n._(req.label)}
                    </li>
                  )
                })}
              </ul>

              <AppInput
                autoComplete='new-password'
                label='Confirm password'
                name='confirmPassword'
                placeholder='••••••••'
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError(null)
                }}
              />
            </>
          ) : null}
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
          Create Account
        </AppButton>
      </form>
    </AuthHeroShell>
  )
}
