import type { NavigateOptions } from '@tanstack/react-router'
import { useMsal } from '@azure/msal-react'
import { useLingui } from '@lingui/react/macro'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from '@tanstack/react-router'
import { useSearch } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import apiRouter from '@/api/apiRouter'
import { loginClassic, socialLoginClassic } from '@/api/v5/classicAuth'
import {
  lookupLoginDirectories,
  lookupSocialDirectories,
} from '@/api/v5/loginDirectories'
import authApiV6 from '@/api/v6/auth'
import Alert from '@/components/base/Alert'
import Badge from '@/components/base/Badge'
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
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  enterClassic,
  isClassicGatewayEnabled,
  persistClassicIdentity,
} from '@/lib/classic-gateway'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'
import { setToLocalStorage } from '@/utils/local-storage'
import { resolveAuthPath, useIsWhiteLabel } from '@/utils/whiteLabel'
import { redirectAfterLogin } from '../utils/redirectAfterLogin'

export type SignedInIdentity = {
  accessToken: string
  email: string
  identity: Record<string, unknown>
  tenantId?: string
}

export type SignInBranding = {
  favicon?: string
  name: string
}

interface Props {
  branding?: SignInBranding
  persistIdentity?: boolean
  showForgotPassword?: boolean
  showSocial?: boolean
  socialProviders?: Array<'Google' | 'Microsoft'>
  tenantId?: string
  onChangeView: () => void
  onSignedIn?: (result: SignedInIdentity) => void | Promise<void>
}

const asIdentityRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const extractAccessToken = (payload: unknown): string => {
  const record = asIdentityRecord(payload)
  if (!record) return ''
  const nested =
    asIdentityRecord(record.identity) ||
    asIdentityRecord(record.data) ||
    asIdentityRecord(record.result)
  const candidates = [
    record.accessToken,
    record.token,
    record.access_token,
    nested?.accessToken,
    nested?.token,
    nested?.access_token,
  ]
  return candidates.map((item) => String(item || '').trim()).find(Boolean) || ''
}

type TenantOption = {
  email: string
  id: number | string
  label: string
  product?: 'v5' | 'v6'
  readyIdentity?: unknown
  value: number | string
}

const SignInForm = ({
  branding,
  persistIdentity = true,
  showForgotPassword,
  showSocial = true,
  socialProviders,
  tenantId: brandingTenantId,
  onChangeView,
  onSignedIn,
}: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
  const { instance: msalInstance } = useMsal()
  console.log(onChangeView)
  const search: any = useSearch({ strict: false })
  const shareToken = search?.shareToken
  const mailid = search?.email || search?.mailid || search?.mailId || ''
  const redirectTo =
    typeof search?.redirect === 'string'
      ? search.redirect
      : typeof search?.redirectTo === 'string'
        ? search.redirectTo
        : null

  // === form / ui state ===
  const [email, setEmail] = useState(mailid)
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [shareTenantId, setShareTenantId] = useState<string | null>(null)

  useEffect(() => {
    if (shareToken) {
      authApiV6.getSharePreview(shareToken).then((res) => {
        if (res.data) {
          if (res.data.sourceTenantId) {
            setShareTenantId(res.data.sourceTenantId)
          }
          authUserStore.getState().setShareContext({
            action: res.data.action,
            permission: res.data.permission,
            shareToken: res.data.shareToken || shareToken,
            sourceItemId: res.data.sourceItemId,
            sourceRepositoryId: res.data.sourceRepositoryId,
            sourceTenantId: res.data.sourceTenantId,
            workflowInstanceId: res.data.workflowInstanceId,
          })
        }
      })
    }
  }, [shareToken])

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
  const [chooserStep, setChooserStep] = useState<'account' | 'version'>(
    'version',
  )
  const [versionFilter, setVersionFilter] = useState<'v5' | 'v6' | null>(null)

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

  const formatAuthErrorMessage = (errorMsg?: string | null): string => {
    if (!errorMsg || typeof errorMsg !== 'string') return ''
    const match = errorMsg.match(
      /you should (?:log\s*in|sign\s*in) with\s+(.+?)\.?$/i,
    )
    if (match) {
      const rawType = match[1].trim()
      const loginType = /^[a-z]+$/.test(rawType)
        ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
        : rawType
      return t`Please sign in with ${loginType} to continue.`
    }
    return errorMsg
  }

  // === navigation after successful login ===
  const handleLoggedNavigation = async () => {
    await redirectAfterLogin({ navigate, redirectTo, shareTenantId })
  }

  const persistV6IdentityData = (
    data: unknown,
    usedTenantId?: string | number,
  ) => {
    if (!data) return
    const identityRecord = asIdentityRecord(data) || {}
    setToLocalStorage(identityRecord, 'identity')
    const finalTenantId = String(
      identityRecord.tenantId || usedTenantId || brandingTenantId || '',
    )
    if (finalTenantId) {
      setToLocalStorage(finalTenantId, 'tenantId', 'STRING')
    }
    authUserStore.getState().setIdentity(identityRecord as any)
  }

  const completeSignIn = async (
    data: unknown,
    signedEmail: string,
    usedTenantId?: string | number,
  ) => {
    if (onSignedIn) {
      const identity = asIdentityRecord(data) || {}
      const accessToken = extractAccessToken(data)
      if (!accessToken) {
        setError(t`Sign in succeeded but no access token was returned.`)
        return
      }
      showToast({ message: t`Successfully logged in`, variant: 'success' })
      await onSignedIn({
        accessToken,
        email: String(identity.email || signedEmail),
        identity,
        tenantId: String(
          identity.tenantId || usedTenantId || brandingTenantId || '',
        ),
      })
      return
    }

    showToast({ message: t`Successfully logged in`, variant: 'success' })
    await handleLoggedNavigation()
  }

  const enterClassicFromIdentity = (identity: unknown) => {
    if (!persistClassicIdentity(identity)) {
      setError(t`Classic sign-in succeeded but the session could not be saved.`)
      return false
    }
    showToast({ message: t`Successfully logged in`, variant: 'success' })
    enterClassic()
    return true
  }

  const completeClassicSignIn = async (
    account: TenantOption,
    social?: { email: string; loginType: string },
  ) => {
    if (account.readyIdentity) {
      enterClassicFromIdentity(account.readyIdentity)
      return
    }

    const tenantId = account.value === 'current' ? undefined : account.value
    const isSocial = Boolean(social?.loginType || socialLogged)
    const classicEmail = String(
      account.email || social?.email || socialEmail || email,
    )

    const { data, error, mfa } = isSocial
      ? await socialLoginClassic(
          {
            email: classicEmail,
            loginType: social?.loginType || loginType || 'Google',
          },
          tenantId,
        )
      : await loginClassic({ email: classicEmail, password }, tenantId)

    if (mfa) {
      setError(
        t`This Classic account needs extra verification. Open Classic to finish signing in.`,
      )
      return
    }

    if (error || !data) {
      setError(error || t`Unable to sign in`)
      return
    }

    enterClassicFromIdentity(data)
  }

  // === EMAIL + PASSWORD LOGIN (with tenant + social support) ===
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

    let resolvedTenantId = tenantId

    if (
      isClassicGatewayEnabled() &&
      persistIdentity &&
      !onSignedIn &&
      resolvedTenantId == null &&
      !shareTenantId &&
      !brandingTenantId
    ) {
      const directory = await lookupSocialDirectories({
        email: sEmail,
        loginType: sType || 'Google',
      })

      if (directory.accounts.length === 1) {
        const account = directory.accounts[0]
        if (account.product === 'v5') {
          await completeClassicSignIn(account, {
            email: sEmail,
            loginType: sType || 'Google',
          })
          return
        }
        resolvedTenantId = account.value
      } else if (directory.accounts.length > 1) {
        setTenantList(directory.accounts)
        setShowTenantListModal(true)
        return
      }
    }

    const targetTenantId =
      resolvedTenantId || shareTenantId || brandingTenantId || undefined
    const { data, error, status } = await apiRouter.socialLogin(
      payload,
      targetTenantId,
      { persistIdentity },
    )

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
        product: 'v6' as const,
        value: tenant.id,
      }))
      setTenantList(mapped)
      setShowTenantListModal(true)
    } else {
      await completeSignIn(data, sEmail, targetTenantId)
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

      // SOCIAL BRANCH (Google / Microsoft)
      if (isSocialFlow) {
        await signInSocial(tenantId, sEmail, sType)
        return
      }

      // NORMAL LOGIN BRANCH
      const payload = {
        email,
        loggedFrom: 'WEB',
        password,
      }

      if (
        isClassicGatewayEnabled() &&
        persistIdentity &&
        !onSignedIn &&
        tenantId == null &&
        !shareTenantId &&
        !brandingTenantId
      ) {
        const directory = await lookupLoginDirectories(payload)
        if (directory.accounts.length === 1) {
          const account = directory.accounts[0]
          if (account.product === 'v5') {
            await completeClassicSignIn(account)
            return
          }

          const { data, error, status } = await apiRouter.login(
            payload,
            account.value,
            { persistIdentity },
          )
          if (error) {
            setError(error)
            return
          }
          if (status === 300 && Array.isArray(data)) {
            setTenantList(
              data.map((tenant) => {
                const row = tenant as {
                  email?: string
                  id?: number | string
                  name?: string
                }
                const id = row.id ?? ''
                return {
                  email: String(row.email || email),
                  id,
                  label: String(row.name || id),
                  product: 'v6' as const,
                  value: id,
                }
              }),
            )
            setShowTenantListModal(true)
            return
          }
          await completeSignIn(data, email, account.value)
          return
        }

        if (directory.accounts.length > 1) {
          setTenantList(directory.accounts)
          setShowTenantListModal(true)
          return
        }
        // No Classic/V6 mix found — keep the current V6 login path.
      }

      const targetTenantId =
        tenantId || shareTenantId || brandingTenantId || undefined
      const { data, error, status } = await apiRouter.login(
        payload,
        targetTenantId,
        { persistIdentity },
      )

      if (error) {
        setLoading(false)
        setShowTenantListModal(false)
        setError(formatAuthErrorMessage(error))
        return
      }

      if (status === 300 && Array.isArray(data)) {
        const mapped: TenantOption[] = data.map((tenant: any) => ({
          email: tenant.email,
          id: tenant.id,
          label: tenant.name,
          product: 'v6',
          value: tenant.id,
        }))
        setTenantList(mapped)
        setShowTenantListModal(true)
      } else {
        await completeSignIn(data, email, targetTenantId)
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? t`Unable to sign in`)
    } finally {
      setLoading(false)
    }
  }

  const validate = async () => {
    setSocialLogged(false)
    setSocialEmail('')
    setLoginType('')

    if (!email) {
      setError(t`Please enter your email address.`)
      return
    }
    if (!password) {
      setError(t`Please enter your password.`)
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
        setError(t`Please enter your email address.`)
        setLoading(false)
        return
      }

      const { data, error } = await authApiV6.emailValidate(1, { email })

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
      setError(e?.message ?? t`Error validating email`)
      setLoading(false)
    }
  }

  // === GOOGLE LOGIN (mirrors Vue googleSignIn flow) ===
  const googleLogin = useGoogleLogin({
    scope: 'openid profile email',
    onError: () => {
      setError(t`We couldn't sign you in with Google. Please try again.`)
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
          throw new Error(
            t`We couldn't get your email address from Google. Please try again.`,
          )
        }

        setSocialEmail(gEmail)
        setSocialLogged(true)
        setLoginType('Google')

        // same pattern as Vue: mark social & run signIn()
        await signIn(undefined, true, gEmail, 'Google')
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? t`Google sign-in failed`)
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
        throw new Error(t`No email returned from Microsoft`)
      }

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
        setError(t`We couldn't sign you in with Microsoft. Please try again.`)
      } else {
        setError(errorMsg || t`Microsoft sign-in failed`)
      }
    } finally {
      setLoading(false)
    }
  }

  // === TENANT SELECTION (status 300) ===
  const handleTenantClick = async (tenantId: number | string) => {
    const selected = tenantList.find(
      (tenant) => String(tenant.id) === String(tenantId),
    )
    setSelectedTenantId(tenantId)
    setLoading(true)
    try {
      if (selected?.product === 'v5') {
        await completeClassicSignIn(
          selected,
          loginType ? { email: socialEmail || email, loginType } : undefined,
        )
        return
      }
      await signIn(selected?.value ?? tenantId)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToSignIn = () => {
    setShowTenantListModal(false)
    setTenantList([])
    setSocialLogged(false)
    setSocialEmail('')
    setLoginType('')
    setSelectedTenantId(null)
    setChooserStep('version')
    setVersionFilter(null)
    setError(null)
  }

  const forgotPassword = () =>
    navigate({
      to: resolveAuthPath(
        '/forgot-password',
        isWhiteLabel,
      ) as NavigateOptions['to'],
    })

  const showGoogle = !socialProviders || socialProviders.includes('Google')
  const showMicrosoft =
    !socialProviders || socialProviders.includes('Microsoft')

  // === derived welcome texts (matches Vue copy) ===
  let welcomeDescription = t`Hi, Welcome!`
  if (!checkTenant) {
    const appName = branding?.name
      ? branding.name
      : isWhiteLabel
        ? 'your workspace'
        : isOnpremiseTenant
          ? 'APP'
          : 'EZOFIS'
    welcomeDescription = t`Hi, Welcome back to ${appName}`
  }

  // Account picker (multiple V6 tenants) vs version picker (Current vs Classic)
  if (showTenantListModal && tenantList.length > 0) {
    const accountEmail = socialLogged ? socialEmail : email
    const currentAccounts = tenantList.filter((item) => item.product !== 'v5')
    const classicAccounts = tenantList.filter((item) => item.product === 'v5')
    const needsVersionChoice =
      currentAccounts.length > 0 && classicAccounts.length > 0
    const showingVersion = needsVersionChoice && chooserStep === 'version'
    const accountOptions = showingVersion
      ? []
      : versionFilter === 'v5'
        ? classicAccounts
        : versionFilter === 'v6'
          ? currentAccounts
          : tenantList

    const handleChooserBack = () => {
      if (needsVersionChoice && chooserStep === 'account') {
        setChooserStep('version')
        setVersionFilter(null)
        setSelectedTenantId(null)
        return
      }
      handleBackToSignIn()
    }

    const handleVersionSelect = async (product: 'v5' | 'v6') => {
      setVersionFilter(product)
      const accounts = product === 'v5' ? classicAccounts : currentAccounts
      if (accounts.length === 1) {
        await handleTenantClick(accounts[0].id)
        return
      }
      setChooserStep('account')
    }

    const renderRowAction = (isLoadingThis: boolean) =>
      isLoadingThis ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
        >
          <Icon
            className='size-4 shrink-0 text-primary-11'
            name='tabler:loader-2'
          />
        </motion.div>
      ) : (
        <Icon
          className='size-4 shrink-0 text-gray-8 group-hover:text-primary-11'
          name='tabler:chevron-right'
        />
      )

    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className='space-y-3'
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2 }}
      >
        <button
          className='group flex cursor-pointer items-center gap-1.5 text-13 font-medium text-gray-11 transition-colors duration-200 hover:text-primary-11 active:text-primary-12'
          type='button'
          onClick={handleChooserBack}
        >
          <Icon
            className='text-gray-9 group-hover:text-primary-11'
            name='tabler:arrow-left'
          />
          <span>
            {needsVersionChoice && chooserStep === 'account'
              ? t`Back to versions`
              : t`Back to sign in`}
          </span>
        </button>

        {showingVersion ? (
          <>
            <Title
              description={t`Your account has access to both versions. Pick the one you want to continue with.`}
              level={2}
              title={t`Choose a version`}
            />

            <div className='space-y-3 pt-1'>
              <button
                disabled={loading}
                type='button'
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border-2 bg-surface-primary p-4 text-left transition-all duration-200',
                  'border-purple-9 shadow-xs hover:border-purple-10 hover:shadow-sm active:scale-[0.995]',
                  loading && versionFilter === 'v6'
                    ? 'border-purple-10 bg-purple-1'
                    : 'border-purple-9',
                )}
                onClick={() => handleVersionSelect('v6')}
              >
                <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-3'>
                  <AiBrandIcon className='size-5' variant='outline-purple' />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate text-15 font-bold text-gray-13'>
                      {t`EZOFIS`}
                    </span>
                    <Badge
                      className='rounded-full px-2.5 py-0.5 text-11 font-medium'
                      color='purple'
                      label={t`Current`}
                    />
                    <Badge
                      className='rounded-full px-2.5 py-0.5 text-11 font-medium'
                      color='blue'
                      label={t`Recommended`}
                    />
                  </div>
                  <p className='mt-1 text-13 text-gray-11'>
                    {t`AI-powered workspace with smart search and agents`}
                  </p>
                </div>
                {renderRowAction(loading && versionFilter === 'v6')}
              </button>

              <button
                disabled={loading}
                type='button'
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border bg-surface-primary p-4 text-left transition-all duration-200',
                  'border-gray-4 hover:border-gray-6 hover:shadow-xs active:scale-[0.995]',
                  loading && versionFilter === 'v5'
                    ? 'border-primary-8 bg-primary-1'
                    : 'border-gray-4',
                )}
                onClick={() => handleVersionSelect('v5')}
              >
                <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-3'>
                  <Icon
                    className='size-5 text-gray-11'
                    name='tabler:layers-intersect'
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate text-15 font-bold text-gray-13'>
                      {t`EZOFIS`}
                    </span>
                    <Badge
                      className='rounded-full px-2.5 py-0.5 text-11 font-medium'
                      color='gray'
                      label={t`Classic`}
                    />
                  </div>
                  <p className='mt-1 text-13 text-gray-11'>
                    {t`The familiar EZOFIS experience, unchanged`}
                  </p>
                </div>
                {renderRowAction(loading && versionFilter === 'v5')}
              </button>
            </div>
          </>
        ) : (
          <>
            <Title
              level={2}
              title={t`Select account`}
              description={
                versionFilter === 'v5'
                  ? t`It looks like ${accountEmail} has more than one Classic account. Which one do you want to use?`
                  : versionFilter === 'v6'
                    ? t`It looks like ${accountEmail} has more than one Current account. Which one do you want to use?`
                    : t`It looks like ${accountEmail} is used with more than one account. Which account do you want to use?`
              }
            />

            <div className='space-y-2'>
              {accountOptions.map((tenant) => {
                const isSelected =
                  selectedTenantId != null &&
                  String(selectedTenantId) === String(tenant.id)
                const isLoadingThis = loading && isSelected
                const optionName =
                  tenant.label.trim() || tenant.email || accountEmail

                return (
                  <button
                    disabled={loading}
                    key={tenant.id}
                    type='button'
                    className={cn(
                      'group flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-surface-primary px-3 py-2.5 text-left transition-colors duration-200',
                      'hover:border-primary-6 hover:bg-primary-1 active:bg-primary-2',
                      isLoadingThis
                        ? 'border-primary-8 bg-primary-1'
                        : 'border-gray-4',
                    )}
                    onClick={() => handleTenantClick(tenant.id)}
                  >
                    <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-3'>
                      <Icon
                        className='size-4 text-primary-11'
                        name='tabler:user'
                      />
                    </div>
                    <span className='min-w-0 flex-1 truncate text-14 font-medium text-gray-13'>
                      {optionName}
                    </span>
                    {renderRowAction(isLoadingThis)}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <button
          className='mt-2 cursor-pointer text-13 font-medium text-gray-11 underline hover:text-primary-11 active:text-primary-12'
          type='button'
          onClick={handleBackToSignIn}
        >
          {t`Sign in with a different email address`}
        </button>
      </motion.div>
    )
  }

  return (
    <>
      {branding?.favicon ? (
        <div className='mb-2 flex w-full justify-center'>
          <div className='flex size-20 items-center justify-center rounded-full bg-gray-3'>
            <div className='relative size-16 overflow-hidden rounded-full bg-surface shadow-xs'>
              <img
                alt=''
                className='absolute inset-0 m-auto size-[calc(100%-1.5rem)] object-contain'
                src={branding.favicon}
              />
            </div>
          </div>
        </div>
      ) : (
        <IconIllustrated icon='tabler:user' />
      )}
      <Title
        className='text-center'
        description={welcomeDescription}
        level={1}
        title={t`Sign in to your account`}
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
                  label={t`Email`}
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder={
                    isWhiteLabel ? 'hello@example.com' : 'hello@ezofis.com'
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
                  label={t`Password`}
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
                  label={t`Sign in`}
                  loading={loading}
                  size='lg'
                  onClick={validate}
                />
              </div>
              {error && (
                <Alert className='mt-2' text={error} variant='primary' />
              )}
            </>
          ) : (
            <>
              {/* Step 1: email only + continue */}
              <div className='space-y-4'>
                <InputText
                  label={t`Email`}
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder={
                    isWhiteLabel ? 'hello@example.com' : 'hello@ezofis.com'
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
                  label={t`Continue`}
                  loading={loading}
                  size='lg'
                  onClick={validateEmail}
                />
              </div>
              {error && (
                <Alert className='mt-2' text={error} variant='primary' />
              )}
            </>
          )}
        </>
      ) : (
        // === Generic / AD login flow ===
        <>
          <div className={cn(branding ? 'mt-2 space-y-5' : '-mt-2 space-y-4')}>
            {checkAdLogin ? (
              <>
                {/* AD Login: username + password */}
                <InputText
                  label={t`User name`}
                  placeholder={t`username`}
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
                  label={t`Password`}
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
                  label={t`Email / Username`}
                  // size='lg'
                  value={email}
                  leftSection={
                    <Icon className='text-gray-8' name='tabler:mail' />
                  }
                  placeholder={
                    isWhiteLabel ? 'hello@example.com' : 'hello@ezofis.com'
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
                  label={t`Password`}
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
          {!checkAdLogin && (showForgotPassword ?? checkForgot) && (
            <div
              className={cn(
                'flex items-center justify-between gap-4',
                branding ? 'mt-5' : 'mt-3',
              )}
            >
              <InputCheckbox
                checked={rememberMe}
                label={t`Keep me logged in`}
                labelClassName='text-gray'
                onChange={(v) => setRememberMe(Boolean(v))}
              />

              <button
                className='font-inherit cursor-pointer border-0 bg-transparent p-0 text-gray-11 underline outline-none hover:text-gray-12'
                type='button'
                onClick={forgotPassword}
              >
                {t`Forgot password?`}
              </button>
            </div>
          )}

          <Button
            className={cn('w-full justify-center', branding ? 'mt-6' : 'mt-4')}
            label={t`Sign In`}
            loading={loading}
            size='lg'
            onClick={validate}
          />

          {error && <Alert className='mt-2' text={error} variant='primary' />}

          {/* Social section – Vue used <SocialAuths>, here we expose Google + Microsoft directly */}
          {!checkAdLogin && showSocial && (showGoogle || showMicrosoft) ? (
            <>
              <Divider
                className={branding ? 'mt-6' : undefined}
                label={t`Or`}
              />
              <div className={cn(branding ? 'mt-5 space-y-4' : 'space-y-3')}>
                {showGoogle ? (
                  <GoogleButton onClick={handleGoogleLogin} />
                ) : null}
                {showMicrosoft ? (
                  <MicrosoftButton onClick={handleMicrosoftLogin} />
                ) : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  )
}

SignInForm.displayName = 'SignInForm'
export default SignInForm
