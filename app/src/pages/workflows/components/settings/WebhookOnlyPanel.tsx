import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createWorkflowEmailWebhookKey,
  disableWorkflowEmailWebhookKey,
  getWorkflowEmailWebhook,
} from '@/api/v6/watchFox'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import { CopyButton, CopyField, SettingRow } from './EmailWatchParts'

interface Props {
  workflowId: string
  onError: (error: unknown) => void
}

const formatDate = (value: null | string) =>
  value ? new Date(value).toLocaleString() : null

/**
 * Webhook only: for a client that uses its own email tool. Shows the workflow's URL, makes the
 * key (shown once) and explains what to send. Rows match the mailbox view of the Email watch card.
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

  const url = webhook?.webhookUrl ?? ''
  const example = `curl -X POST "${url}" \\\n  -H "X-Webhook-Key: ${newKey ?? '<your key>'}" \\\n  -F "file=@message.eml"`

  if (isLoading) {
    return <p className='px-5 py-6 text-12 text-gray-9'>{t`Loading…`}</p>
  }

  return (
    <div className='divide-y divide-gray-3/60'>
      <p className='px-5 pt-4 pb-5 text-12 text-gray-10'>
        {t`For clients with their own email tool. The tool sends each email to this URL with the key, and the workflow starts with the email attached.`}
      </p>

      <SettingRow
        hint={t`Give this to the client's tool.`}
        label={t`Webhook URL`}
      >
        <CopyField
          ariaLabel={t`Webhook URL for this workflow`}
          value={url}
          onCopyError={onError}
        />
      </SettingRow>

      <SettingRow
        hint={t`Sent in the X-Webhook-Key header.`}
        label={t`Webhook key`}
      >
        <div className='space-y-3'>
          {newKey && (
            <div className='space-y-2 rounded-xl border border-orange-6 bg-orange-2 p-3'>
              <div className='flex items-center gap-1.5 text-12 font-medium text-orange-11'>
                <Icon className='size-4' name='lucide:key-round' />
                {t`Copy this key now. It won't be shown again.`}
              </div>
              <CopyField
                ariaLabel={t`New webhook key`}
                icon='lucide:key-round'
                value={newKey}
                onCopyError={onError}
              />
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

          {webhook?.enabled ? (
            <div className='flex items-center gap-3 rounded-xl border border-gray-3 px-3 py-2.5'>
              <Icon
                className='size-4 shrink-0 text-green-10'
                name='lucide:key-round'
              />
              <div className='min-w-0 flex-1'>
                <code className='block truncate font-mono text-12 text-gray-12'>
                  {webhook.keyPrefix}…
                </code>
                <div className='truncate text-12 text-gray-10'>
                  {t`Created`} {formatDate(webhook.createdAtUtc)}
                  {' · '}
                  {webhook.lastUsedAtUtc
                    ? `${t`Last used`} ${formatDate(webhook.lastUsedAtUtc)}`
                    : t`Not used yet`}
                </div>
              </div>
            </div>
          ) : (
            <p className='text-12 text-gray-10'>
              {t`No key yet. Create one to turn this webhook on.`}
            </p>
          )}

          {confirm ? (
            <div className='flex flex-wrap items-center justify-end gap-2'>
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
            <div className='flex justify-end'>
              <Button
                className='w-full rounded-xl text-[12.5px] font-medium shadow-[0_6px_16px_-8px_var(--color-primary-9)] @min-[640px]:w-auto'
                icon='lucide:key-round'
                label={t`Create key`}
                loading={createKey.isPending}
                size='md'
                onClick={() => createKey.mutate()}
              />
            </div>
          )}
        </div>
      </SettingRow>

      <SettingRow hint={t`One email per call.`} label={t`What the tool sends`}>
        <div className='space-y-2'>
          <ul className='list-disc space-y-1 pl-4 text-12 text-gray-10'>
            <li>{t`POST to the URL with the header X-Webhook-Key.`}</li>
            <li>{t`Body: the email as a .eml form file named "file", or a message/rfc822 body, or JSON with eml_base64.`}</li>
            <li>{t`The same email sent twice starts one ticket.`}</li>
          </ul>
          <div className='rounded-xl border border-gray-3 bg-gray-2'>
            <div className='flex justify-end p-1'>
              <CopyButton
                label={t`Copy example`}
                value={example}
                onCopyError={onError}
              />
            </div>
            <pre className='overflow-x-auto px-3 pb-3 font-mono text-12 text-gray-11'>
              {example}
            </pre>
          </div>
        </div>
      </SettingRow>
    </div>
  )
}
