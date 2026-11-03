import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
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
import InputSegmentedControl from '@/components/base/inputs/InputSegmentedControl'
import showToast from '@/components/base/toast/showToast'
import useDefaultSectionOpen from '@/pages/workflows/utils/useDefaultSectionOpen'
import cn from '@/utils/cn'
import EmailTicketSettings from './EmailTicketSettings'
import { Caption, ChoicePill, CopyField, SettingRow } from './EmailWatchParts'
import WebhookOnlyPanel from './WebhookOnlyPanel'

type Mode = 'mailbox' | 'webhook'

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
 * Email watch for one workflow, as one card. Mailbox: connect an Outlook or Gmail mailbox,
 * choose which email types start it, and edit, pause or remove saved watches. Webhook only:
 * give a client's own tool the workflow's URL and key.
 */
export default function EmailWatchSection({
  defaultProvider,
  workflowId,
}: Props) {
  const { t } = useLingui()
  const bodyId = useId()
  const queryClient = useQueryClient()
  const defaultOpen = useDefaultSectionOpen()
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [provider, setProvider] = useState<WatchFoxProvider>(defaultProvider)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['enquiry'])
  const [awaitingSignIn, setAwaitingSignIn] = useState(false)
  const [mode, setMode] = useState<Mode>('mailbox')

  const watchesKey = ['watchfox', 'workflow-watches', workflowId]

  const { data: types = [] } = useQuery({
    enabled: isOpen && mode === 'mailbox',
    queryFn: getWatchFoxTypes,
    queryKey: ['watchfox', 'types'],
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: watchData,
    isFetching,
    isLoading,
  } = useQuery({
    enabled: isOpen && mode === 'mailbox' && Boolean(workflowId),
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

  const toggleType = (id: string) =>
    setSelectedTypes((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )

  const modeOptions = [
    { icon: 'lucide:mail', id: 'mailbox', name: t`Mailbox` },
    { icon: 'lucide:webhook', id: 'webhook', name: t`Webhook only` },
  ]

  const typeCount = selectedTypes.length
  const summary =
    typeCount === 1
      ? t`1 email type watched`
      : t`${typeCount} email types watched`

  return (
    <section className='@container overflow-hidden rounded-[22px] border border-gray-3 bg-surface shadow-[0_18px_40px_-24px_var(--color-gray-a6)]'>
      <button
        aria-controls={bodyId}
        aria-expanded={isOpen}
        className='flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-gray-1'
        type='button'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-3 text-primary-9'>
          <Icon className='size-4.5' name='lucide:mail' />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-semibold tracking-tight text-gray-12'>
            {t`Email watch`}
          </span>
          <span className='block truncate text-12 text-gray-10'>
            {t`Route inbound email into this workflow.`}
          </span>
        </span>
        <Icon
          name='lucide:chevron-down'
          className={cn(
            'size-4 shrink-0 text-gray-9 transition-transform duration-300',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className='overflow-hidden'
            exit={{ height: 0, opacity: 0 }}
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className='border-t border-gray-3/60'>
              {!workflowId ? (
                <p className='px-5 py-6 text-12 text-gray-10'>
                  {t`Save the workflow first. Each workflow gets its own email watch URL.`}
                </p>
              ) : (
                <>
                  <div className='space-y-2 px-5 pt-5'>
                    <Caption>{t`How emails reach this workflow`}</Caption>
                    <InputSegmentedControl
                      options={modeOptions}
                      value={
                        modeOptions.find((option) => option.id === mode) ??
                        modeOptions[0]
                      }
                      onChange={(option) => setMode(option.id as Mode)}
                    />
                  </div>

                  <EmailTicketSettings
                    workflowId={workflowId}
                    onError={onError}
                  />

                  {mode === 'webhook' ? (
                    <WebhookOnlyPanel
                      workflowId={workflowId}
                      onError={onError}
                    />
                  ) : (
                    <>
                      <div className='divide-y divide-gray-3/60'>
                        <SettingRow
                          hint={t`Where the emails arrive.`}
                          label={t`Mail provider`}
                        >
                          <div className='grid grid-cols-2 gap-2'>
                            <ChoicePill
                              active={provider === 'outlook'}
                              icon='vscode-icons:file-type-outlook'
                              label={t`Outlook`}
                              onClick={() => setProvider('outlook')}
                            />
                            <ChoicePill
                              active={provider === 'gmail'}
                              icon='logos:google-gmail'
                              label={t`Gmail`}
                              onClick={() => setProvider('gmail')}
                            />
                          </div>
                        </SettingRow>

                        <SettingRow
                          hint={t`Email types that start this workflow.`}
                          label={t`What to catch`}
                        >
                          <TypeChips
                            selected={selectedTypes}
                            types={types}
                            onToggle={toggleType}
                          />
                        </SettingRow>

                        <SettingRow
                          hint={t`Where matched emails are sent.`}
                          label={t`Webhook URL`}
                        >
                          <CopyField
                            ariaLabel={t`Webhook URL for this workflow`}
                            value={watchData?.webhookUrl ?? ''}
                            onCopyError={onError}
                          />
                        </SettingRow>
                      </div>

                      <div className='flex flex-col gap-3 border-t border-gray-3/60 px-5 py-4 @min-[640px]:flex-row @min-[640px]:items-center'>
                        <span
                          className={cn(
                            'text-12 @min-[640px]:mr-auto',
                            typeCount === 0 ? 'text-red-11' : 'text-gray-10',
                          )}
                        >
                          {typeCount === 0
                            ? t`Choose at least one type.`
                            : summary}
                        </span>
                        <Button
                          className='w-full rounded-xl text-[12.5px] font-medium shadow-[0_6px_16px_-8px_var(--color-primary-9)] @min-[640px]:w-auto'
                          color='primary'
                          disabled={typeCount === 0}
                          loading={connect.isPending}
                          size='md'
                          suffixIcon='lucide:arrow-up-right'
                          label={
                            provider === 'gmail'
                              ? t`Connect Gmail`
                              : t`Connect Outlook`
                          }
                          onClick={() => connect.mutate()}
                        />
                      </div>

                      <div className='space-y-3 border-t border-gray-3/60 bg-gray-2/60 px-5 py-4'>
                        <div className='flex items-center justify-between'>
                          <span className='text-[12.5px] font-medium text-gray-12'>
                            {t`Mailboxes watching this workflow`}
                          </span>
                          <IconButton
                            ariaLabel={t`Refresh`}
                            icon='lucide:refresh-cw'
                            iconClass={cn(isFetching && 'animate-spin')}
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
                          <div className='flex items-center gap-3 rounded-xl bg-surface px-3 py-3'>
                            <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-2 text-gray-9'>
                              <Icon className='size-4' name='lucide:inbox' />
                            </span>
                            <span className='text-12 text-gray-10'>
                              {t`No mailbox yet. Connect one above.`}
                            </span>
                          </div>
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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
    <div className='flex flex-wrap gap-2'>
      {types.map((type) => {
        const active = selected.includes(type.id)
        return (
          <button
            aria-pressed={active}
            key={type.id}
            type='button'
            className={cn(
              'flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] transition-colors duration-200 active:scale-[0.98]',
              active
                ? 'border-primary-9/45 bg-primary-3 text-primary-10'
                : 'border-gray-3 bg-surface text-gray-10 hover:border-gray-4 hover:text-gray-12',
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
    <div className='space-y-2 rounded-xl bg-surface p-3'>
      <div className='flex items-start gap-2'>
        <Icon
          className='mt-0.5 size-4 shrink-0'
          name={
            outlook ? 'vscode-icons:file-type-outlook' : 'logos:google-gmail'
          }
        />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-13 text-gray-12'>
            {watch.mailboxEmail ||
              (outlook ? t`Outlook mailbox` : t`Gmail mailbox`)}
          </div>
          <div className='truncate text-12 text-gray-10'>
            {watch.types.map(typeLabel).join(', ')}
          </div>
        </div>
        <Badge
          color={STATUS_COLOR[watch.status] ?? 'gray'}
          label={statusLabel[watch.status] ?? watch.status}
        />
      </div>

      {watch.lastError && watch.status !== 'active' && (
        <p className='text-12 text-orange-11'>{watch.lastError}</p>
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
