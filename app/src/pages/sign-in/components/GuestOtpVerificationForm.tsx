import { useLingui } from '@lingui/react/macro'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import authApiV6, { sendShareOtp, verifyShareOtp } from '@/api/v6/auth'
import {
  getSignRequestInvitePreview,
  sendSignRequestOtp,
  verifySignRequestOtp,
} from '@/api/v6/folder/signRequest'
import Alert from '@/components/base/Alert'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import InputPin from '@/components/base/inputs/InputPin'
import InputText from '@/components/base/inputs/InputText'
import Title from '@/components/base/Title'
import showToast from '@/components/base/toast/showToast'
import useResendTimer from '@/layouts/auth/hooks/useResendTimer'
import authUserStore from '@/stores/authUserStore'
import { setToLocalStorage } from '@/utils/local-storage'
import { useIsWhiteLabel } from '@/utils/whiteLabel'
import { redirectAfterLogin } from '../utils/redirectAfterLogin'

interface Props {
  email?: string
  inviteToken?: string
  shareToken?: string
}

const GuestOtpVerificationForm = ({
  email: initialEmail = '',
  inviteToken = '',
  shareToken = '',
}: Props) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const isWhiteLabel = useIsWhiteLabel()
  const search: any = useSearch({ strict: false })
  const redirectTo =
    typeof search?.redirect === 'string'
      ? search.redirect
      : typeof search?.redirectTo === 'string'
        ? search.redirectTo
        : null

  const mode = inviteToken ? 'sign-request' : 'share'
  const activeToken = inviteToken || shareToken

  const [loading, setLoading] = useState(true)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpCode, setOtpCode] = useState('')

  const [resolvedEmail, setResolvedEmail] = useState(initialEmail.trim())
  const [tenantId, setTenantId] = useState<string | undefined>()
  const [fileName, setFileName] = useState<string | undefined>()
  const [sharePreviewData, setSharePreviewData] = useState<any>(null)

  const { elapsed, resendLabel, resetTimer } = useResendTimer(
    t`Didn't receive the code? Resend`,
  )

  const targetEmail = useMemo(
    () => (initialEmail.trim() || resolvedEmail.trim()).toLowerCase(),
    [initialEmail, resolvedEmail],
  )

  useEffect(() => {
    let mounted = true

    const fetchPreview = async () => {
      setLoading(true)
      setError(null)

      if (!activeToken) {
        setError(t`Missing invitation or share token.`)
        setLoading(false)
        return
      }

      if (mode === 'share') {
        const res = await authApiV6.getSharePreview(shareToken)
        if (!mounted) return
        if (res.error || !res.data) {
          setError(res.error || t`Share link not found or expired.`)
          setLoading(false)
          return
        }

        const preview = res.data
        setSharePreviewData(preview)
        setTenantId(preview.sourceTenantId)
        if (preview.recipientEmail && !resolvedEmail) {
          setResolvedEmail(preview.recipientEmail)
        }
      } else {
        const res = await getSignRequestInvitePreview(inviteToken)
        if (!mounted) return
        if (res.error || !res.data) {
          setError(res.error || t`Sign invite not found or expired.`)
          setLoading(false)
          return
        }

        const preview = res.data
        setTenantId(preview.tenantId)
        setFileName(preview.fileName)
        if (preview.recipientEmail && !resolvedEmail) {
          setResolvedEmail(preview.recipientEmail)
        }
      }

      setLoading(false)
    }

    void fetchPreview()

    return () => {
      mounted = false
    }
  }, [activeToken, inviteToken, mode, shareToken, t])

  const handleSendOtp = async () => {
    if (!targetEmail) {
      setError(t`Recipient email is required to request a verification code.`)
      return
    }

    setSendingCode(true)
    setError(null)

    try {
      if (mode === 'share') {
        const res = await sendShareOtp({
          email: targetEmail,
          shareToken,
          tenantId,
        })
        if (res.error) {
          setError(res.error)
          return
        }
      } else {
        const res = await sendSignRequestOtp({
          email: targetEmail,
          inviteToken,
          tenantId,
        })
        if (res.error) {
          setError(res.error)
          return
        }
      }

      setCodeSent(true)
      resetTimer()
      showToast({
        message: t`A 6-digit verification code has been sent to ${targetEmail}.`,
        variant: 'success',
      })
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyOtp = async () => {
    const trimmedOtp = otpCode.trim()
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setError(t`Please enter the complete 6-digit verification code.`)
      return
    }

    setVerifying(true)
    setError(null)

    try {
      let authResponse: { data: any; error: string }

      if (mode === 'share') {
        authResponse = await verifyShareOtp({
          email: targetEmail,
          otp: trimmedOtp,
          shareToken,
          tenantId,
        })
      } else {
        authResponse = await verifySignRequestOtp({
          email: targetEmail,
          inviteToken,
          otp: trimmedOtp,
          tenantId,
        })
      }

      if (authResponse.error || !authResponse.data) {
        setError(
          authResponse.error || t`Invalid or expired verification code.`,
        )
        return
      }

      const authData = authResponse.data
      const resolvedTenant =
        tenantId || authData.tenantId || authData.sourceTenantId || ''

      const identity = {
        accessToken: authData.accessToken,
        expiresIn: authData.expiresIn,
        tenantId: resolvedTenant,
        tokenType: authData.tokenType || 'Bearer',
        userId: authData.userId,
      }

      setToLocalStorage(identity, 'identity')
      if (resolvedTenant) {
        setToLocalStorage(String(resolvedTenant), 'tenantId', 'STRING')
      }

      authUserStore.getState().setIdentity(identity)
      authUserStore.getState().setSession({
        email: targetEmail,
        firstName: '',
        id: String(authData.userId || ''),
        tenantId: String(resolvedTenant || ''),
      })

      if (mode === 'share' && sharePreviewData) {
        authUserStore.getState().setShareContext({
          action: sharePreviewData.action,
          permission: sharePreviewData.permission,
          resourceType: sharePreviewData.resourceType,
          shareToken: sharePreviewData.shareToken || shareToken,
          sourceItemId: sharePreviewData.sourceItemId,
          sourceReportId: sharePreviewData.sourceReportId,
          sourceRepositoryId: sharePreviewData.sourceRepositoryId,
          sourceTenantId: sharePreviewData.sourceTenantId || resolvedTenant,
          workflowInstanceId: sharePreviewData.workflowInstanceId,
        })

        await redirectAfterLogin({ navigate, redirectTo })
      } else if (mode === 'sign-request') {
        const target = redirectTo || `/sign-request/${inviteToken}`
        await navigate({ replace: true, to: target })
      }
    } finally {
      setVerifying(false)
    }
  }

  const titleDescription = useMemo(() => {
    if (fileName) {
      return t`Verify your email to review and sign ${fileName}.`
    }
    if (mode === 'sign-request') {
      return t`Verify your email to review and sign this document.`
    }
    return isWhiteLabel
      ? t`Verify your email to access the shared file.`
      : t`Verify your email to access the shared file on EZOFIS.`
  }, [fileName, isWhiteLabel, mode, t])

  return (
    <div className='flex flex-col items-stretch'>
      <div className='mb-6 flex flex-col items-center text-center'>
        <IconIllustrated icon='lucide:shield-check' />
        <Title
          className='mt-3 text-center'
          description={titleDescription}
          level={2}
          title={t`Verification Code`}
        />
      </div>

      <div className='space-y-5'>
        <InputText
          disabled
          label={t`Invited Email`}
          leftSection={<Icon className='text-gray-8' name='tabler:mail' />}
          value={targetEmail || t`Loading recipient email...`}
          onChange={() => {}}
        />

        {error && <Alert text={error} variant='red' />}

        {!codeSent ? (
          <Button
            className='w-full justify-center'
            disabled={loading || !targetEmail}
            label={t`Send Verification Code`}
            loading={sendingCode}
            size='lg'
            onClick={handleSendOtp}
          />
        ) : (
          <div className='animate-in fade-in slide-in-from-bottom-2 space-y-5 duration-300'>
            <div className='flex flex-col items-center gap-2.5 text-center'>
              <label className='text-center text-[13px] font-medium text-gray-12'>
                {t`Enter 6-digit Code`}
              </label>
              <InputPin
                autoFocus
                disabled={verifying}
                length={6}
                placeholder='0'
                type='number'
                value={otpCode}
                onChange={(val) => {
                  const numericVal = val.replace(/\D/g, '')
                  setOtpCode(numericVal)
                  if (error) setError(null)
                }}
              />
            </div>

            <div className='space-y-3 pt-1'>
              <Button
                className='w-full justify-center'
                disabled={otpCode.trim().length !== 6 || verifying}
                label={t`Verify & Continue`}
                loading={verifying}
                size='lg'
                onClick={handleVerifyOtp}
              />

              <Button
                className='w-full justify-center underline'
                color='gray'
                disabled={elapsed !== 0 || sendingCode || verifying}
                label={resendLabel}
                loading={sendingCode}
                size='sm'
                variant='ghost'
                onClick={handleSendOtp}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

GuestOtpVerificationForm.displayName = 'GuestOtpVerificationForm'
export default GuestOtpVerificationForm
