import { useEffect, useMemo, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import { Loader2, Plus, Send, Trash2, UserPlus, UserRound, X } from 'lucide-react'
import type { Option } from '@/types/option'
import { getUsers } from '@/api/v6/user'
import type {
  CreateSignRequestPayload,
  SignRequestDto,
  SignRequestSigningMode,
} from '@/api/v6/folder/signRequest'
import {
  createSignRequest,
  listItemSignRequests,
} from '@/api/v6/folder/signRequest'
import Modal from '@/components/base/Modal'
import InputNumber from '@/components/base/inputs/InputNumber'
import InputSegmentedControl from '@/components/base/inputs/InputSegmentedControl'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import SortableContainer from '@/components/base/sortable/SortableContainer'
import SortableItem from '@/components/base/sortable/SortableItem'

type SignRequestAssignFormProps = {
  repositoryId: string
  itemId: string
  className?: string
  /** Compact customer-facing layout (hide existing-requests list). */
  compact?: boolean
  /** When true, primary action prepares the request and lets the parent place areas before API create. */
  deferCreate?: boolean
  onCreated?: (request: SignRequestDto) => void
  onContinue?: (payload: CreateSignRequestPayload) => void
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const signerKey = (signer: Option) =>
  String(signer.id || signer.value || signer.description || '').trim()

export function SignRequestAssignForm({
  repositoryId,
  itemId,
  className = '',
  compact = false,
  deferCreate = false,
  onCreated,
  onContinue,
}: SignRequestAssignFormProps) {
  const { t } = useLingui()
  const [userOptions, setUserOptions] = useState<Option[]>([])
  const [selectedSigners, setSelectedSigners] = useState<Option[]>([])
  const [pendingUser, setPendingUser] = useState<Option | null>(null)
  const signingModeOptions = [
    { id: 'non-sequential', name: t`Non-sequential` },
    { id: 'sequential', name: t`Sequential` },
  ]
  const [signingMode, setSigningMode] = useState(signingModeOptions[0])
  const [message, setMessage] = useState(() => t`Please sign this document`)
  const [expiresInDays, setExpiresInDays] = useState<string | number>(14)
  const [submitting, setSubmitting] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [error, setError] = useState('')
  const [existingRequests, setExistingRequests] = useState<SignRequestDto[]>([])
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [addUserError, setAddUserError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoadingUsers(true)
    void getUsers()
      .then((response) => {
        if (!mounted || response.error || !Array.isArray(response.data)) return
        setUserOptions(
          response.data
            .filter((user) =>
              Boolean(user.displayName?.trim() || user.email?.trim()),
            )
            .map((user) => ({
              description: user.email || undefined,
              id: user.id || user.email,
              name: user.displayName || user.email,
              value: user.email,
            })),
        )
      })
      .finally(() => {
        if (mounted) setLoadingUsers(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const refreshRequests = async () => {
    if (!repositoryId || !itemId || compact) return
    setLoadingRequests(true)
    const result = await listItemSignRequests({ itemId, repositoryId })
    setLoadingRequests(false)
    if (result.error) {
      setError(
        typeof result.error === 'string'
          ? result.error
          : t`Unable to load sign requests`,
      )
      return
    }
    setExistingRequests(result.data || [])
  }

  useEffect(() => {
    void refreshRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repositoryId, itemId, compact])

  const availableOptions = useMemo(() => {
    const selectedEmails = new Set(
      selectedSigners.map((signer) =>
        String(signer.value || signer.description || '')
          .trim()
          .toLowerCase(),
      ),
    )
    return userOptions.filter((option) => {
      const email = String(option.value || option.description || '')
        .trim()
        .toLowerCase()
      return email && !selectedEmails.has(email)
    })
  }, [userOptions, selectedSigners])

  const orderedSigners = useMemo(
    () =>
      selectedSigners.map((signer, index) => ({
        email: String(signer.value || signer.description || '').trim(),
        name: String(signer.name || '').trim(),
        order: index + 1,
      })),
    [selectedSigners],
  )

  const sortableIds = useMemo(
    () => selectedSigners.map((signer) => signerKey(signer)),
    [selectedSigners],
  )

  const resolveSigningMode = (): SignRequestSigningMode => {
    if (String(signingMode.id) === 'sequential') return 'sequential'
    return orderedSigners.length <= 1 ? 'single' : 'multiple'
  }

  const addSigner = (option: Option | null) => {
    if (!option) return
    const email = String(option.value || option.description || '')
      .trim()
      .toLowerCase()
    if (!email) {
      setError(t`Selected user needs an email address.`)
      return
    }
    const already = selectedSigners.some(
      (signer) =>
        String(signer.value || signer.description || '')
          .trim()
          .toLowerCase() === email,
    )
    if (already) {
      setError(t`That user is already in the signing list.`)
      return
    }
    setSelectedSigners((previous) => [...previous, option])
    setPendingUser(null)
    setError('')
  }

  const handleAddSelectedUser = () => {
    addSigner(pendingUser)
  }

  const handleAddNewUser = () => {
    setAddUserError('')
    const name = newUserName.trim()
    const email = newUserEmail.trim().toLowerCase()
    if (!name) {
      setAddUserError(t`Enter the user’s name.`)
      return
    }
    if (!emailPattern.test(email)) {
      setAddUserError(t`Enter a valid email address.`)
      return
    }
    const already = selectedSigners.some(
      (signer) =>
        String(signer.value || signer.description || '')
          .trim()
          .toLowerCase() === email,
    )
    if (already) {
      setAddUserError(t`That email is already in the signing list.`)
      return
    }

    const option: Option = {
      description: email,
      id: `guest-${email}`,
      name,
      value: email,
    }

    setUserOptions((previous) => {
      const exists = previous.some(
        (item) =>
          String(item.value || item.description || '')
            .trim()
            .toLowerCase() === email,
      )
      return exists ? previous : [...previous, option]
    })
    setSelectedSigners((previous) => [...previous, option])
    setNewUserName('')
    setNewUserEmail('')
    setAddUserOpen(false)
    setError('')
  }

  const handleSubmit = async () => {
    setError('')
    if (!repositoryId || !itemId) {
      setError(t`Repository and document are required.`)
      return
    }
    if (!orderedSigners.length) {
      setError(t`Add at least one user to assign.`)
      return
    }
    if (orderedSigners.some((signer) => !signer.email || !signer.name)) {
      setError(t`Each signer needs a name and email.`)
      return
    }

    const days = Number(expiresInDays)
    if (!Number.isFinite(days) || days < 1) {
      setError(t`Expires in days must be at least 1.`)
      return
    }

    const payload: CreateSignRequestPayload = {
      expiresInDays: days,
      itemId,
      message: message.trim() || undefined,
      repositoryId,
      signers: orderedSigners,
      signingMode: resolveSigningMode(),
    }

    if (deferCreate) {
      onContinue?.(payload)
      return
    }

    setSubmitting(true)
    const result = await createSignRequest(payload)
    setSubmitting(false)

    if (result.error || !result.data) {
      setError(
        typeof result.error === 'string'
          ? result.error
          : t`Unable to create sign request`,
      )
      return
    }

    setSelectedSigners([])
    await refreshRequests()
    onCreated?.(result.data)
  }

  const removeSigner = (signerId: string) => {
    setSelectedSigners((previous) =>
      previous.filter((signer) => signerKey(signer) !== signerId),
    )
  }

  const handleReorder = (ids: string[]) => {
    setSelectedSigners((previous) => {
      const byId = new Map(previous.map((signer) => [signerKey(signer), signer]))
      return ids
        .map((id) => byId.get(id))
        .filter((signer): signer is Option => Boolean(signer))
    })
  }

  const isSequential = String(signingMode.id) === 'sequential'

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}
    >
      <div className='ez-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5'>
        {error ? (
          <p
            className='rounded-lg border border-red-4 bg-red-1 px-3 py-2 text-[12px] font-medium text-red-10'
            role='alert'
          >
            {error}
          </p>
        ) : null}

        <div className='space-y-2'>
          <div className='flex items-end gap-2'>
            <div className='min-w-0 flex-1'>
              <InputSelect
                label={t`Assign user`}
                options={availableOptions}
                placeholder={
                  loadingUsers ? t`Loading users...` : t`Select one user`
                }
                required={selectedSigners.length === 0}
                searchable
                value={pendingUser}
                onChange={(option) => {
                  setPendingUser(option)
                  setError('')
                }}
              />
            </div>
            <button
              type='button'
              className='mb-0.5 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-3 bg-surface-primary px-3 text-[12px] font-semibold text-gray-12 transition-colors hover:bg-gray-2 disabled:cursor-not-allowed disabled:opacity-50'
              disabled={!pendingUser}
              onClick={handleAddSelectedUser}
            >
              <Plus className='h-3.5 w-3.5' />
              Add
            </button>
          </div>

          <button
            type='button'
            className='inline-flex h-8 items-center gap-1.5 text-[12px] font-semibold text-blue-10 hover:underline'
            onClick={() => {
              setAddUserError('')
              setAddUserOpen(true)
            }}
          >
            <UserPlus className='h-3.5 w-3.5' />
            Add new user
          </button>
        </div>

        {selectedSigners.length > 0 ? (
          <div className='space-y-2'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-[12px] font-semibold text-gray-10'>
                {isSequential ? t`Signing order` : t`Signers`}
              </p>
              <p className='text-[11px] text-gray-9'>{t`Drag to reorder`}</p>
            </div>

            <SortableContainer
              items={sortableIds}
              onItemsChange={handleReorder}
            >
              <div className='space-y-2'>
                {selectedSigners.map((option, index) => {
                  const id = signerKey(option)
                  const email = String(
                    option.value || option.description || '',
                  ).trim()
                  return (
                    <SortableItem
                      key={id}
                      className='rounded-lg border border-gray-3 bg-surface-primary px-2 py-1.5'
                      handlerPosition='before'
                      id={id}
                      trailing={
                        <button
                          type='button'
                          aria-label={`Remove ${option.name}`}
                          className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-9 transition-colors hover:bg-red-2'
                          onClick={() => removeSigner(id)}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      }
                    >
                      <div className='flex min-w-0 flex-1 items-center gap-2'>
                        <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[11px] font-bold text-blue-11'>
                          {index + 1}
                        </span>
                        <UserRound className='h-4 w-4 shrink-0 text-blue-9' />
                        <span className='min-w-0'>
                          <span className='block truncate text-[13px] font-semibold text-gray-13'>
                            {option.name}
                          </span>
                          <span className='block truncate text-[11px] text-gray-10'>
                            {email}
                          </span>
                        </span>
                      </div>
                    </SortableItem>
                  )
                })}
              </div>
            </SortableContainer>
          </div>
        ) : null}

        <InputSegmentedControl
          label={t`Signing mode`}
          options={signingModeOptions}
          value={signingMode}
          onChange={(option) =>
            setSigningMode({
              id: String(option.id),
              name: option.name,
            })
          }
        />

        <p className='-mt-1 text-[11px] text-gray-9'>
          {isSequential
            ? t`Users sign one after another in the list order. Add everyone first, then mark places for each.`
            : t`Users can sign in any order. Add everyone first, then mark one or more places per user.`}
        </p>

        <InputTextarea
          label={t`Message`}
          minRows={2}
          optional
          placeholder={t`Please sign this document`}
          value={message}
          onChange={setMessage}
        />

        <InputNumber
          label={t`Expires in days`}
          min={1}
          required
          value={expiresInDays}
          withControls
          onChange={setExpiresInDays}
        />

        {!compact ? (
          <div className='space-y-2 border-t border-gray-3 pt-3'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-[12px] font-semibold text-gray-10'>
                {t`Existing requests`}
              </p>
              <button
                type='button'
                className='text-[12px] font-semibold text-blue-10 hover:underline disabled:opacity-50'
                disabled={loadingRequests}
                onClick={() => void refreshRequests()}
              >
                {loadingRequests ? t`Refreshing...` : t`Refresh`}
              </button>
            </div>
            {existingRequests.length === 0 ? (
              <p className='text-[12px] text-gray-9'>
                {t`No sign requests for this document yet.`}
              </p>
            ) : (
              existingRequests.map((request) => (
                <div
                  key={request.signRequestId}
                  className='rounded-lg border border-gray-3 bg-gray-1 px-3 py-2'
                >
                  <p className='text-[12px] font-semibold text-gray-13'>
                    {request.status || 'InProgress'} ·{' '}
                    {request.signingMode || '-'}
                  </p>
                  <p className='mt-0.5 text-[11px] text-gray-10'>
                    {(request.signers || [])
                      .map(
                        (signer) =>
                          `${signer.name} (${signer.status || 'Pending'})`,
                      )
                      .join(', ') || t`No signers`}
                  </p>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className='shrink-0 border-t border-gray-3 bg-surface-primary pt-3'>
        <button
          type='button'
          className='inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary-10 px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-blue-11 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={submitting || !selectedSigners.length}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Send className='h-4 w-4' />
          )}
          {submitting
            ? t`Sending...`
            : deferCreate
              ? t`Continue to mark places`
              : t`Send request`}
        </button>
      </div>

      <Modal
        opened={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        width={400}
        closeOnInteractOutside={false}
      >
        <div className='bg-surface-primary text-[13px] text-gray-11'>
          <div className='flex items-center justify-between border-b border-gray-3 px-4 py-3'>
            <h3 className='text-[15px] font-semibold text-gray-13'>
              Add new user
            </h3>
            <button
              type='button'
              className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-10 hover:bg-gray-2'
              aria-label={t`Close`}
              onClick={() => setAddUserOpen(false)}
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          <div className='space-y-3 px-4 py-3'>
            <p className='text-[12px] text-gray-10'>
              {t`Add a signer by name and email. They will receive the sign request invite.`}
            </p>
            <InputText
              label={t`Full name`}
              placeholder='Jane Doe'
              required
              value={newUserName}
              onChange={setNewUserName}
            />
            <InputText
              label={t`Email`}
              placeholder='jane@company.com'
              required
              type='email'
              value={newUserEmail}
              onChange={setNewUserEmail}
            />
            {addUserError ? (
              <p
                className='rounded-lg border border-red-4 bg-red-1 px-3 py-2 text-[12px] font-medium text-red-10'
                role='alert'
              >
                {addUserError}
              </p>
            ) : null}
            <div className='flex justify-end gap-2 pt-1'>
              <button
                type='button'
                className='inline-flex h-9 items-center justify-center rounded-lg border border-gray-3 px-3 text-[13px] font-semibold text-gray-12 hover:bg-gray-2'
                onClick={() => setAddUserOpen(false)}
              >
                Cancel
              </button>
              <button
                type='button'
                className='inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary-10 px-3 text-[13px] font-semibold text-white hover:bg-blue-11'
                onClick={handleAddNewUser}
              >
                <UserPlus className='h-3.5 w-3.5' />
                Add to list
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SignRequestAssignForm
