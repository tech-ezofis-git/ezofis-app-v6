import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react/macro'
import { CheckCircle2, Loader2 } from 'lucide-react'
import {
  collectSignRequestFields,
  getSignRequest,
  getSignRequestInvitePreview,
  type SignRequestFieldDto,
  type SignRequestInvitePreview,
} from '@/api/v6/folder/signRequest'
import { DocumentDetailsView } from '@/pages/folders/components/DocumentDetailsView'
import {
  loadSignRequestFields,
  saveSignRequestFields,
} from '@/pages/folders/utils/signRequestFieldsStorage'
import authUserStore from '@/stores/authUserStore'

type SignRequestInvitePageProps = {
  /** Full path after `/sign-request/` (may be one token or tenant/id/token). */
  invitePath: string
  email: string
  isNew: boolean
}

type Gate = 'loading' | 'auth' | 'signing' | 'done' | 'error'

function candidateInviteTokens(invitePath: string) {
  const raw = String(invitePath || '')
    .replace(/^\/+|\/+$/g, '')
    .trim()
  if (!raw) return []
  const parts = raw.split('/').filter(Boolean)
  const tokens = [parts[parts.length - 1], raw]
  return [...new Set(tokens.filter(Boolean))]
}

function toUiError(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    const record = value as { error?: string; message?: string; title?: string }
    return (
      record.error || record.message || record.title || fallback
    ).toString()
  }
  return fallback
}

export default function SignRequestInvitePage({
  invitePath,
  email,
  isNew,
}: SignRequestInvitePageProps) {
  const { t } = useLingui()
  const navigate = useNavigate()
  const [gate, setGate] = useState<Gate>('loading')
  const [preview, setPreview] = useState<SignRequestInvitePreview | null>(null)
  const [inviteToken, setInviteToken] = useState('')
  const [signatureFields, setSignatureFields] = useState<SignRequestFieldDto[]>(
    [],
  )
  const [error, setError] = useState('')

  const recipientEmail = useMemo(
    () =>
      String(email || preview?.recipientEmail || '')
        .trim()
        .toLowerCase(),
    [email, preview?.recipientEmail],
  )

  const hydrateFields = async (previewData: SignRequestInvitePreview) => {
    let fields = collectSignRequestFields(previewData)

    const fromStorage = loadSignRequestFields({
      itemId: previewData.itemId,
      repositoryId: previewData.repositoryId,
      signRequestId: previewData.signRequestId,
    })

    if (previewData.signRequestId) {
      const hasToken = Boolean(authUserStore.getState().identity?.accessToken)
      if (hasToken) {
        const detail = await getSignRequest({
          signRequestId: previewData.signRequestId,
          tenantId: previewData.tenantId,
        })
        const detailFields = collectSignRequestFields(detail.data)
        if (detailFields.length) fields = detailFields
      }
    }

    if (!fields.length && fromStorage.length) fields = fromStorage

    const recipient = String(email || previewData.recipientEmail || '')
      .trim()
      .toLowerCase()

    fields = fields.map((field) => ({
      ...field,
      signerEmail: field.signerEmail || recipient || undefined,
      signerOrder: field.signerOrder || previewData.signerOrder,
      status: field.status || 'REQUESTED',
    }))

    if (fields.length && previewData.signRequestId) {
      saveSignRequestFields({
        fields,
        itemId: previewData.itemId,
        repositoryId: previewData.repositoryId,
        signRequestId: previewData.signRequestId,
      })
    }

    setSignatureFields(fields)
    return fields
  }

  useEffect(() => {
    let mounted = true

    const boot = async () => {
      setGate('loading')
      setError('')

      const tokens = candidateInviteTokens(invitePath)
      let previewResult: Awaited<
        ReturnType<typeof getSignRequestInvitePreview>
      > | null = null
      let resolvedToken = ''

      for (const token of tokens) {
        const result = await getSignRequestInvitePreview(token)
        if (!mounted) return
        if (result.data && !result.error) {
          previewResult = result
          resolvedToken = token
          break
        }
        previewResult = result
      }

      if (!previewResult?.data || previewResult.error) {
        setError(
          toUiError(
            previewResult?.error,
            'This sign request link is invalid.',
          ),
        )
        setGate('error')
        return
      }

      const token = resolvedToken || previewResult.data.inviteToken || ''
      setInviteToken(token)
      setPreview(previewResult.data)
      await hydrateFields(previewResult.data)
      if (!mounted) return

      const sessionEmail = String(authUserStore.getState().session?.email || '')
        .trim()
        .toLowerCase()
      const hasToken = Boolean(authUserStore.getState().identity?.accessToken)
      const recipient = String(
        email || previewResult.data.recipientEmail || '',
      )
        .trim()
        .toLowerCase()

      const alreadyAuthed =
        hasToken && (!recipient || !sessionEmail || sessionEmail === recipient)

      if (alreadyAuthed) {
        await hydrateFields(previewResult.data)
        if (!mounted) return
        setGate('signing')
        return
      }

      if (
        previewResult.data.requiresPasswordSetup ||
        previewResult.data.requiresLogin ||
        isNew
      ) {
        setGate('auth')
        return
      }

      setGate('signing')
    }

    void boot()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitePath, email, isNew])

  // Use the centered Sign-in page (same layout as share login).
  useEffect(() => {
    if (gate !== 'auth' || !inviteToken) return

    const redirect =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : `/sign-request/${invitePath}${email ? `?email=${encodeURIComponent(email)}` : ''}`

    const needsSetup =
      Boolean(preview?.requiresPasswordSetup) || isNew

    void navigate({
      replace: true,
      to: '/sign-in',
      search: {
        email: recipientEmail || email || undefined,
        inviteToken,
        isnew: needsSetup ? 'true' : 'false',
        redirect,
      },
    })
  }, [
    gate,
    inviteToken,
    invitePath,
    email,
    recipientEmail,
    isNew,
    preview?.requiresPasswordSetup,
    navigate,
  ])

  if (gate === 'loading' || gate === 'auth') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-surface text-[13px] text-gray-11'>
        <div className='flex items-center gap-2 rounded-xl border border-gray-3 bg-surface-primary px-4 py-3 shadow-sm'>
          <Loader2 className='h-4 w-4 animate-spin text-primary-10' />
          <span className='font-semibold text-gray-13'>
            {gate === 'auth'
              ? t`Opening sign in...`
              : t`Opening sign request...`}
          </span>
        </div>
      </div>
    )
  }

  if (gate === 'error') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-surface p-5 text-[13px]'>
        <div className='w-full max-w-md rounded-2xl border border-red-4 bg-surface-primary p-6 shadow-sm'>
          <h1 className='text-[18px] font-semibold text-gray-13'>
            {t`Unable to open sign request`}
          </h1>
          <p className='mt-2 text-[13px] text-red-10'>{error}</p>
        </div>
      </div>
    )
  }

  if (gate === 'done') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-surface p-5 text-[13px]'>
        <div className='w-full max-w-md rounded-2xl border border-gray-3 bg-surface-primary p-6 shadow-sm'>
          <div className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5 text-green-9' />
            <h1 className='text-[18px] font-semibold text-gray-13'>
              {t`Document signed`}
            </h1>
          </div>
          <p className='mt-2 text-[13px] text-gray-10'>
            {t`Your signature was submitted successfully. You can close this page.`}
          </p>
        </div>
      </div>
    )
  }

  if (!preview?.itemId || !preview?.repositoryId) return null

  return (
    <div className='flex h-screen min-h-0 flex-col overflow-hidden bg-surface-secondary'>
      <DocumentDetailsView
        compactActions
        forceSigning
        id={preview.itemId}
        invitePreview={preview}
        inviteToken={inviteToken}
        repositoryId={preview.repositoryId}
        signRequestId={preview.signRequestId}
        signatureFields={signatureFields}
        onBack={() => setGate('done')}
      />
    </div>
  )
}
