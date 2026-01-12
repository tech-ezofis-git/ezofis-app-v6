import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'

import Button from '@/components/base/button/Button'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
// import HeroText from '@/components/common/HeroText'
import PasswordRequirements from '@/layouts/auth/components/PasswordRequirements'
import authApi from '@/api/auth'

import authUserStore from '@/stores/authUserStore'
import showToast from '@/components/base/toast/showToast'
import Title from '@/components/base/Title'

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
  const [organisation, setOrganisation] = useState(signUpUserData.organisation || '')
  const [password, setPassword] = useState(signUpUserData.password || '')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // keep store in sync as the user types (operational excellence: single source of truth)
  useEffect(() => {
    setSignUpUserData({
      firstName,
      lastName,
      organisation,
      password: isSocial ? '' : password,
      licenseType: '3',
      loginType,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, organisation, password, isSocial, loginType])

  const handleSignUp = async () => {
    try {
      setError(null)

      const email = signUpUserData.email
      if (!email) {
        setError('Email missing. Please restart signup.')
        return
      }

      if (!firstName.trim()) return setError('First name is required')
      if (!lastName.trim()) return setError('Last name is required')
      if (!organisation.trim()) return setError('Organisation is required')

      if (!isSocial) {
        if (!password) return setError('Password is required')
        if (password !== confirmPassword) return setError('Passwords do not match')
      }

      setLoading(true)

      // final canonical payload (exactly like your example)
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: isSocial ? '' : password,
        organisation: organisation.trim(),
        licenseType: 3,
        email,
        loginType, // "GOOGLE" | "MICROSOFT" | "NORMAL"
      }

      console.log(payload)

      const { status, data } = await authApi.signUp(payload)

      if (status === 200 || status === 201 || data === "Success") {
        showToast({ message: "Account Setup Completed Successfully", variant: "success" })
        setLoading(false)
        navigate({ to: '/sign-in' })
      }

      console.log(data)
    } catch (error) {

    }


  }

  return (
    <div className='flex flex-col gap-6'>
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
          onChange={(v) => { setFirstName(v); setError(null) }}
        />

        <InputText
          label='Last name'
          value={lastName}
          onChange={(v) => { setLastName(v); setError(null) }}
        />

        <InputText
          label='Organisation'
          value={organisation}
          onChange={(v) => { setOrganisation(v); setError(null) }}
        />

        {!isSocial && (
          <>
            <InputPassword
              label='Password'
              value={password}
              onChange={(v) => { setPassword(v); setError(null) }}
            />
            <PasswordRequirements password={password} />
            <InputPassword
              label='Confirm password'
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); setError(null) }}
            />
          </>
        )}
      </div>

      {error && (
        <div className='text-center text-sm text-red-500'>{error}</div>
      )}

      <Button
        className='w-full justify-center'
        label='Finish'
        loading={loading}
        onClick={handleSignUp}
      />
    </div>

  )
}

ResetPasswordPage.displayName = 'ResetPasswordPage'
export default ResetPasswordPage
