import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createWorkflowEmailWebhookKey,
  disableWorkflowEmailWebhookKey,
  getWorkflowEmailWebhook,
} from '@/api/v6/watchFox'
import Button from '@/components/base/button/Button'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'

interface Props {
  workflowId: string
  onError: (error: unknown) => void
}

const formatDate = (value: null | string) =>
  value ? new Date(value).toLocaleString() : null

/**
 * Webhook only: for a client that uses its own tool instead of WatchFox. Shows the workflow's
 * URL, makes the key (shown once) and explains what to send.
 */
export default function WebhookOnlyPanel({ workflowId, onError }: Props) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const [newKey, setNewKey] = useState<null | string>(null)
  const [confirm, setConfirm] = useState<'off' | 'replace' | null>(null)

  const queryKey = ['email-webhook', workflowId]
  const { data: webhook, isLoading } = useQuery({
    queryKey,
    queryFn: () => getWorkflowEmailWebhook(workflowId),
  })

  const createKey = useMutation({
    mutationFn: () => createWorkflowEmailWebhookKey(workflowId),
    onError,
    onSuccess: (result) => {
      setNewKey(result.key)
      setConfirm(null)
      queryClient.setQueryData(queryKey, result.webhook)
    },
  })

  const turnOff = useMutation({
    mutationFn: () => disableWorkflowEmailWebhookKey(workflowId),
    onError,
    onSuccess: (result) => {
      setNewKey(null)
      setConfirm(null)
      queryClient.setQueryData(queryKey, result)
    },
  })

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast({ message, variant: 'success' })
    } catch (error) {
      onError(error)
    }
  }

  const url = webhook?.webhookUrl ?? ''
  const example = `curl -X POST "${url}" \\\n  -H "X-Webhook-Key: ${newKey ?? '<your key>'}" \\\n  -F "file=@message.eml"`

  if (isLoading) {
    return <p className='text-12 text-gray-9'>{t`Loading…`}</p>
  }

  return (
    <div className='animate-in fade-in space-y-3 rounded-xl bg-surface p-4 shadow-sm duration-200'>
      <p className='text-12 text-gray-10'>
        {t`For clients with their own email tool. The tool sends each email to this URL with the key, and the workflow starts with the email attached.`}
      </p>

      <div className='space-y-1.5'>
        <div className='text-12 font-medium text-gray-11'>{t`Webhook URL for this workflow`}</div>
        <div className='flex items-center gap-2'>
          <code className='min-w-0 flex-1 truncate rounded-md border border-gray-3 bg-gray-1 px-2 py-1.5 text-11 text-gray-11'>
            {url || '…'}
          </code>
          <IconButton
            ariaLabel={t`Copy webhook URL`}
            disabled={!url}
            icon='lucide:copy'
            size='md'
            title={t`Copy`}
            variant='outline'
            onClick={() => void copy(url, t`Webhook URL copied`)}
          />
        </div>
      </div>

      {newKey && (
        <div className='animate-in fade-in slide-in-from-top-1 space-y-1.5 rounded-lg border border-orange-6 bg-orange-2 p-3 duration-200'>
          <div className='flex items-center gap-1.5 text-12 font-medium text-orange-11'>
            <Icon className='size-4' name='lucide:key-round' />
            {t`Copy this key now. It won't be shown again.`}
          </div>
          <div className='flex items-center gap-2'>
            <code className='min-w-0 flex-1 rounded-md border border-orange-6 bg-surface px-2 py-1.5 text-11 break-all text-gray-12'>
              {newKey}
            </code>
            <IconButton
              ariaLabel={t`Copy key`}
              icon='lucide:copy'
              size='md'
              title={t`Copy`}
              variant='outline'
              onClick={() => void copy(newKey, t`Key copied`)}
            />
          </div>
          <div className='flex justify-end'>
            <Button
              label={t`Done`}
              size='sm'
              variant='ghost'
              onClick={() => setNewKey(null)}
            />
          </div>
        </div>
      )}

      <div className='space-y-1.5'>
        <div className='text-12 font-medium text-gray-11'>{t`Webhook key`}</div>
        {webhook?.enabled ? (
          <div className='space-y-0.5 rounded-lg border border-gray-3 p-3 text-12'>
            <div className='flex items-center gap-2 text-gray-12'>
              <Icon className='size-4 text-green-10' name='lucide:key-round' />
              <code className='text-11'>{webhook.keyPrefix}…</code>
            </div>
            <div className='text-11 text-gray-9'>
              {t`Created`} {formatDate(webhook.createdAtUtc)}
              {' · '}
              {webhook.lastUsedAtUtc
                ? `${t`Last used`} ${formatDate(webhook.lastUsedAtUtc)}`
                : t`Not used yet`}
            </div>
          </div>
        ) : (
          <p className='rounded-lg border border-dashed border-gray-4 p-3 text-12 text-gray-9'>
            {t`No key yet. Create one to turn this webhook on.`}
          </p>
        )}

        {confirm ? (
          <div className='flex items-center justify-end gap-2'>
            <span className='mr-auto text-12 text-gray-11'>
              {confirm === 'replace'
                ? t`The old key stops working at once.`
                : t`Calls with this key will be refused.`}
            </span>
            <Button
              label={t`Cancel`}
              size='sm'
              variant='ghost'
              onClick={() => setConfirm(null)}
            />
            <Button
              color={confirm === 'off' ? 'red' : 'primary'}
              label={confirm === 'off' ? t`Turn off` : t`Make new key`}
              loading={createKey.isPending || turnOff.isPending}
              size='sm'
              onClick={() =>
                confirm === 'off' ? turnOff.mutate() : createKey.mutate()
              }
            />
          </div>
        ) : webhook?.enabled ? (
          <div className='flex justify-end gap-2'>
            <Button
              color='red'
              label={t`Turn off`}
              size='sm'
              variant='ghost'
              onClick={() => setConfirm('off')}
            />
            <Button
              icon='lucide:refresh-cw'
              label={t`New key`}
              size='sm'
              variant='outline'
              onClick={() => setConfirm('replace')}
            />
          </div>
        ) : (
          <Button
            className='w-full'
            icon='lucide:key-round'
            label={t`Create key`}
            loading={createKey.isPending}
            size='md'
            onClick={() => createKey.mutate()}
          />
        )}
      </div>

      <div className='space-y-1.5'>
        <div className='flex items-center justify-between'>
          <span className='text-12 font-medium text-gray-11'>{t`What the tool sends`}</span>
          <IconButton
            ariaLabel={t`Copy example`}
            icon='lucide:copy'
            size='sm'
            title={t`Copy example`}
            variant='ghost'
            onClick={() => void copy(example, t`Example copied`)}
          />
        </div>
        <ul className='list-disc space-y-0.5 pl-4 text-11 text-gray-10'>
          <li>{t`POST to the URL with the header X-Webhook-Key.`}</li>
          <li>{t`Body: the email as a .eml form file named "file", or a message/rfc822 body, or JSON with eml_base64.`}</li>
          <li>{t`The same email sent twice starts one ticket.`}</li>
        </ul>
        <pre className='overflow-x-auto rounded-md border border-gray-3 bg-gray-1 p-2 text-11 text-gray-11'>
          {example}
        </pre>
      </div>
    </div>
  )
}
