import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { BadgeColor } from '@/components/base/Badge'
import {
  connectWatchFoxMailbox,
  deleteWatch,
  getWatchFoxTypes,
  getWorkflowWatches,
  isWatchFoxOutlook,
  pauseWatch,
  reconnectWatch,
  resumeWatch,
  updateWatchTypes,
  type WatchFoxLink,
  type WatchFoxProvider,
  type WatchFoxStatus,
  type WatchFoxType,
  type WatchFoxWatch,
} from '@/api/v6/watchFox'
import Badge from '@/components/base/Badge'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import useDefaultSectionOpen from '@/pages/workflows/utils/useDefaultSectionOpen'
import cn from '@/utils/cn'
import SettingsSection from './common/SettingsSection'
import WebhookOnlyPanel from './WebhookOnlyPanel'

interface Props {
  /** The mail node's own provider, used as the default choice. */
  defaultProvider: WatchFoxProvider
  workflowId: null | string
}

const STATUS_COLOR: Record<WatchFoxStatus, BadgeColor> = {
  active: 'green',
  error: 'red',
  needs_attention: 'orange',
  paused: 'gray',
  pending: 'blue',
}

/**
 * Email watch for one workflow. WatchFox: connect an Outlook or Gmail mailbox, choose which
 * email types start it, and edit, pause or remove saved watches. Webhook only: give a client's
 * own tool the workflow's URL and key.
 */
export default function EmailWatchSection({
  defaultProvider,
  workflowId,
}: Props) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const defaultOpen = useDefaultSectionOpen()
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [provider, setProvider] = useState<WatchFoxProvider>(defaultProvider)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['enquiry'])
  const [awaitingSignIn, setAwaitingSignIn] = useState(false)
  const [mode, setMode] = useState<'watchfox' | 'webhook'>('watchfox')

  const watchesKey = ['watchfox', 'workflow-watches', workflowId]

  const { data: types = [] } = useQuery({
    enabled: isOpen && mode === 'watchfox',
    queryFn: getWatchFoxTypes,
    queryKey: ['watchfox', 'types'],
    staleTime: 5 * 60 * 1000,
  })

  const { data: watchData, isLoading } = useQuery({
    enabled: isOpen && mode === 'watchfox' && Boolean(workflowId),
    queryKey: watchesKey,
    // While the sign-in tab is open, look for the new mailbox every few seconds.
    refetchInterval: awaitingSignIn ? 5000 : false,
    refetchOnWindowFocus: true,
    queryFn: () => getWorkflowWatches(String(workflowId)),
  })

  const watches = watchData?.watches ?? []
  const refresh = () => queryClient.invalidateQueries({ queryKey: watchesKey })

  const onError = (error: unknown) =>
    showToast({
      message:
        error instanceof Error ? error.message : t`Something went wrong.`,
      variant: 'error',
    })

  /** Opens the tab on the click itself so the browser does not block it. */
  const openSignIn = async (getLink: () => Promise<WatchFoxLink>) => {
    const tab = window.open('about:blank', '_blank')
    try {
      const link = await getLink()
      if (tab) tab.location.href = link.url
      else window.open(link.url, '_blank')
      setAwaitingSignIn(true)
    } catch (error) {
      tab?.close()
      onError(error)
    }
  }

  const connect = useMutation({
    mutationFn: () =>
      openSignIn(() =>
        connectWatchFoxMailbox({
          provider,
          types: selectedTypes,
          workflowId: String(workflowId),
        }),
      ),
  })

  const copyUrl = async () => {
    if (!watchData?.webhookUrl) return
    try {
      await navigator.clipboard.writeText(watchData.webhookUrl)
      showToast({ message: t`Webhook URL copied`, variant: 'success' })
    } catch (error) {
      onError(error)
    }
  }

  const toggleType = (id: string) =>
    setSelectedTypes((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )

  return (
    <SettingsSection
      icon='lucide:mail-search'
      isOpen={isOpen}
      title={t`Email watch`}
      variant='premium'
      onToggle={() => setIsOpen(!isOpen)}
    >
      {!workflowId ? (
        <p className='rounded-xl bg-surface p-4 text-12 text-gray-10 shadow-sm'>
          {t`Save the workflow first. Each workflow gets its own email watch URL.`}
        </p>
      ) : (
        <div className='space-y-4 pt-1'>
          <div className='space-y-1.5'>
            <div className='text-12 font-medium text-gray-11'>{t`How emails reach this workflow`}</div>
            <div className='grid grid-cols-2 gap-2'>
              <ProviderButton
                active={mode === 'watchfox'}
                icon='lucide:mail-search'
                label={t`WatchFox mailbox`}
                onClick={() => setMode('watchfox')}
              />
              <ProviderButton
                active={mode === 'webhook'}
                icon='lucide:webhook'
                label={t`Webhook only`}
                onClick={() => setMode('webhook')}
              />
            </div>
          </div>

          {mode === 'webhook' ? (
            <WebhookOnlyPanel workflowId={workflowId} onError={onError} />
          ) : (
            <>
              <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-11'>{t`Mail provider`}</div>
                  <div className='grid grid-cols-2 gap-2'>
                    <ProviderButton
                      active={provider === 'outlook'}
                      icon='vscode-icons:file-type-outlook'
                      label={t`Outlook`}
                      onClick={() => setProvider('outlook')}
                    />
                    <ProviderButton
                      active={provider === 'gmail'}
                      icon='logos:google-gmail'
                      label={t`Gmail`}
                      onClick={() => setProvider('gmail')}
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-11'>{t`What to catch`}</div>
                  <TypeChips
                    selected={selectedTypes}
                    types={types}
                    onToggle={toggleType}
                  />
                </div>

                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-11'>{t`Webhook URL for this workflow`}</div>
                  <div className='flex items-center gap-2'>
                    <code className='min-w-0 flex-1 truncate rounded-md border border-gray-3 bg-gray-1 px-2 py-1.5 text-11 text-gray-11'>
                      {watchData?.webhookUrl ?? '…'}
                    </code>
                    <IconButton
                      ariaLabel={t`Copy webhook URL`}
                      icon='lucide:copy'
                      size='md'
                      title={t`Copy`}
                      variant='outline'
                      onClick={copyUrl}
                    />
                  </div>
                </div>

                <Button
                  className='w-full'
                  color='primary'
                  disabled={selectedTypes.length === 0}
                  icon='lucide:external-link'
                  loading={connect.isPending}
                  size='md'
                  label={
                    provider === 'gmail' ? t`Connect Gmail` : t`Connect Outlook`
                  }
                  onClick={() => connect.mutate()}
                />
                {selectedTypes.length === 0 && (
                  <p className='text-11 text-red-11'>{t`Choose at least one type.`}</p>
                )}
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-12 font-medium text-gray-11'>
                    {t`Mailboxes watching this workflow`}
                  </span>
                  <IconButton
                    ariaLabel={t`Refresh`}
                    icon='lucide:refresh-cw'
                    size='sm'
                    title={t`Refresh`}
                    variant='ghost'
                    onClick={() => {
                      setAwaitingSignIn(false)
                      void refresh()
                    }}
                  />
                </div>
                {isLoading ? (
                  <p className='text-12 text-gray-9'>{t`Loading…`}</p>
                ) : watches.length === 0 ? (
                  <p className='rounded-lg border border-dashed border-gray-4 p-3 text-12 text-gray-9'>
                    {t`No mailbox yet. Connect one above.`}
                  </p>
                ) : (
                  watches.map((watch) => (
                    <WatchRow
                      key={watch.id}
                      openSignIn={openSignIn}
                      types={types}
                      watch={watch}
                      onChanged={refresh}
                      onError={onError}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </SettingsSection>
  )
}

function ProviderButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      type='button'
      className={cn(
        'flex h-10 items-center justify-center gap-2 rounded-md border text-13 transition-all duration-200 active:scale-[0.98]',
        active
          ? 'border-primary-9 bg-primary-1 text-primary-9'
          : 'border-gray-3 text-gray-12 hover:border-primary-5',
      )}
      onClick={onClick}
    >
      <Icon className='size-4' name={icon} />
      {label}
    </button>
  )
}

function TypeChips({
  selected,
  types,
  onToggle,
}: {
  selected: string[]
  types: WatchFoxType[]
  onToggle: (id: string) => void
}) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      {types.map((type) => {
        const active = selected.includes(type.id)
        return (
          <button
            aria-pressed={active}
            key={type.id}
            type='button'
            className={cn(
              'flex items-center gap-1 rounded-md border px-2.5 py-1 text-12 transition-all duration-200 active:scale-[0.98]',
              active
                ? 'border-primary-9 bg-primary-1 text-primary-9'
                : 'border-gray-3 text-gray-11 hover:border-primary-5',
            )}
            onClick={() => onToggle(type.id)}
          >
            {active && <Icon className='size-3' name='lucide:check' />}
            {type.label}
            {type.custom && (
              <Icon className='size-3 text-gray-8' name='lucide:sparkles' />
            )}
          </button>
        )
      })}
    </div>
  )
}

function WatchRow({
  openSignIn,
  types,
  watch,
  onChanged,
  onError,
}: {
  types: WatchFoxType[]
  watch: WatchFoxWatch
  onChanged: () => Promise<void>
  onError: (error: unknown) => void
  openSignIn: (getLink: () => Promise<WatchFoxLink>) => Promise<void>
}) {
  const { t } = useLingui()
  const [editing, setEditing] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [draftTypes, setDraftTypes] = useState<string[]>(watch.types)

  const statusLabel: Record<WatchFoxStatus, string> = {
    active: t`Active`,
    error: t`Error`,
    needs_attention: t`Reconnect needed`,
    paused: t`Paused`,
    pending: t`Connecting`,
  }

  const action = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onError,
    onSuccess: () => onChanged(),
  })

  const typeLabel = (id: string) =>
    types.find((type) => type.id === id)?.label ?? id
  const outlook = isWatchFoxOutlook(watch.provider)

  return (
    <div className='animate-in fade-in space-y-2 rounded-lg border border-gray-3 bg-surface p-3 duration-200'>
      <div className='flex items-start gap-2'>
        <Icon
          className={cn(
            'mt-0.5 size-4 shrink-0',
            outlook ? 'text-blue-10' : 'text-green-10',
          )}
          name={
            outlook ? 'vscode-icons:file-type-outlook' : 'logos:google-gmail'
          }
        />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 text-gray-12'>
            {watch.mailboxEmail ||
              (outlook ? t`Outlook mailbox` : t`Gmail mailbox`)}
          </div>
          <div className='truncate text-11 text-gray-9'>
            {watch.types.map(typeLabel).join(', ')}
          </div>
        </div>
        <Badge
          color={STATUS_COLOR[watch.status] ?? 'gray'}
          label={statusLabel[watch.status] ?? watch.status}
        />
      </div>

      {watch.lastError && watch.status !== 'active' && (
        <p className='text-11 text-orange-11'>{watch.lastError}</p>
      )}

      {editing ? (
        <div className='space-y-2'>
          <TypeChips
            selected={draftTypes}
            types={types}
            onToggle={(id) =>
              setDraftTypes((current) =>
                current.includes(id)
                  ? current.filter((item) => item !== id)
                  : [...current, id],
              )
            }
          />
          <div className='flex justify-end gap-2'>
            <Button
              label={t`Cancel`}
              size='sm'
              variant='ghost'
              onClick={() => {
                setDraftTypes(watch.types)
                setEditing(false)
              }}
            />
            <Button
              disabled={draftTypes.length === 0}
              label={t`Save`}
              loading={action.isPending}
              size='sm'
              onClick={() =>
                action.mutate(() => updateWatchTypes(watch.id, draftTypes), {
                  onSuccess: () => setEditing(false),
                })
              }
            />
          </div>
        </div>
      ) : confirmRemove ? (
        <div className='flex items-center justify-end gap-2'>
          <span className='mr-auto text-12 text-gray-11'>{t`Stop watching this mailbox?`}</span>
          <Button
            label={t`Keep`}
            size='sm'
            variant='ghost'
            onClick={() => setConfirmRemove(false)}
          />
          <Button
            color='red'
            label={t`Remove`}
            loading={action.isPending}
            size='sm'
            onClick={() => action.mutate(() => deleteWatch(watch.id))}
          />
        </div>
      ) : (
        <div className='flex justify-end gap-1'>
          {watch.status === 'needs_attention' && (
            <Button
              color='orange'
              icon='lucide:plug'
              label={t`Reconnect`}
              size='sm'
              variant='outline'
              onClick={() => void openSignIn(() => reconnectWatch(watch.id))}
            />
          )}
          <IconButton
            ariaLabel={t`Edit types`}
            icon='lucide:pencil'
            size='sm'
            title={t`Edit types`}
            variant='ghost'
            onClick={() => {
              setDraftTypes(watch.types)
              setEditing(true)
            }}
          />
          {watch.status === 'paused' ? (
            <IconButton
              ariaLabel={t`Resume`}
              icon='lucide:play'
              loading={action.isPending}
              size='sm'
              title={t`Resume and check missed mail`}
              variant='ghost'
              onClick={() => action.mutate(() => resumeWatch(watch.id))}
            />
          ) : (
            <IconButton
              ariaLabel={t`Pause`}
              icon='lucide:pause'
              loading={action.isPending}
              size='sm'
              title={t`Pause`}
              variant='ghost'
              onClick={() => action.mutate(() => pauseWatch(watch.id))}
            />
          )}
          <IconButton
            ariaLabel={t`Remove`}
            icon='lucide:trash-2'
            size='sm'
            title={t`Remove`}
            variant='ghost'
            onClick={() => setConfirmRemove(true)}
          />
        </div>
      )}
    </div>
  )
}
