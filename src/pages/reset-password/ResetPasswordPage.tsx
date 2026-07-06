import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { apiRouter } from '@/api/apiRouter'
import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
// import HeroText from '@/components/common/HeroText'
import PasswordRequirements, {
  requirementsConfig,
} from '@/layouts/auth/components/PasswordRequirements'
import useSetupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import authUserStore from '@/stores/authUserStore'

const ResetPasswordPage = () => {
  const navigate = useNavigate()
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // keep store in sync as the user types (operational excellence: single source of truth)
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
    if (!signUpUserData.email) {
      return 'Email missing. Please restart signup.'
    }
    if (!firstName.trim()) return 'First name is required'
    if (!lastName.trim()) return 'Last name is required'
    if (!organisation.trim()) return 'Organisation is required'

    if (!isSocial) {
      if (!password) return 'Password is required'

      const unmetRequirement = requirementsConfig.find(
        (req) => !req.regex.test(password),
      )
      if (unmetRequirement) {
        return `Password must meet all requirements: ${unmetRequirement.label}`
      }

      if (password !== confirmPassword) {
        return 'Passwords do not match'
      }
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

      // final canonical payload (exactly like your example)
      const payload = {
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        licenseType: 3,
        loginType, // "GOOGLE" | "MICROSOFT" | "NORMAL"
        organisation: organisation.trim(),
        password: isSocial ? '' : password,
      }

      console.log(payload)

      // We use the new apiRouter here. It will automatically decide if it's v5 or v6!
      const { data, status } = await apiRouter.signUp(payload)

      if (status === 200 || status === 201 || data === 'Success') {
        if (isSocial) {
          // social login with email to get the token
          const socialPayload = {
            email,
            loggedFrom: 'WEB',
            loginType,
          }
          const loginRes = await apiRouter.socialLogin(socialPayload)
          if (loginRes.error) {
            setError(loginRes.error)
            setLoading(false)
            return
          }
        } else {
          // password login
          const loginRes = await apiRouter.login({
            email,
            password,
          })
          if (loginRes.error) {
            setError(loginRes.error)
            setLoading(false)
            return
          }
        }

        // fetch the user session details in both cases to populate user picture/name
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
          message: 'Account Setup Completed Successfully',
          variant: 'success',
        })
        setLoading(false)
        navigate({ params: { token }, to: '/on-boarding/$token' })
      } else {
        setError(
          'Failed to complete account setup. Please contact the EZOFIS team.',
        )
        setLoading(false)
      }

      console.log(data)
    } catch (err: unknown) {
      console.error(err)
      setError(
        'Failed to complete account setup. Please contact the EZOFIS team.',
      )
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSignUp()
  }

  return (
    <form className='flex flex-col gap-6' onSubmit={handleSubmit}>
      <IconIllustrated icon='lucide:lock' />
      <Title
        className='text-center'
        description='Complete your profile to activate your workspace.'
        level={1}
        title='Complete Setup'
      />

      <div className='space-y-4'>
        <InputText
          label='First name'
          value={firstName}
          required
          onChange={(v) => {
            setFirstName(v)
            setError(null)
          }}
        />

        <InputText
          label='Last name'
          value={lastName}
          required
          onChange={(v) => {
            setLastName(v)
            setError(null)
          }}
        />

        <InputText
          label='Organisation'
          value={organisation}
          required
          onChange={(v) => {
            setOrganisation(v)
            setError(null)
          }}
        />

        {!isSocial && (
          <>
            <InputPassword
              label='Password'
              value={password}
              required
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
            />
            <PasswordRequirements password={password} />
            <InputPassword
              label='Confirm password'
              value={confirmPassword}
              required
              onChange={(v) => {
                setConfirmPassword(v)
                setError(null)
              }}
            />
          </>
        )}
      </div>

      {error && <div className='text-red-500 text-center text-sm'>{error}</div>}

      <Button
        className='w-full justify-center'
        label='Create Account'
        loading={loading}
        type='submit'
      />
    </form>
  )
}

ResetPasswordPage.displayName = 'Reset' + 'PasswordPage'
export default ResetPasswordPage
