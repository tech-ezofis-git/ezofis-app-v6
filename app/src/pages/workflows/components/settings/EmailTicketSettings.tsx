import { useLingui } from '@lingui/react/macro'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getWorkflowEmailSettings,
  saveWorkflowEmailSettings,
  type WorkflowEmailSettings,
  type WorkflowEmailSettingsInput,
} from '@/api/v6/watchFox'
import Icon from '@/components/base/icon/Icon'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import cn from '@/utils/cn'
import { Caption, ChoicePill, SettingRow } from './EmailWatchParts'

interface Props {
  workflowId: string
  onError: (error: unknown) => void
}

/** File type choices; each saves the extensions listed. */
const TYPE_GROUPS = [
  { extensions: ['.pdf'], label: 'PDF' },
  { extensions: ['.tif', '.tiff'], label: 'TIFF' },
  { extensions: ['.png'], label: 'PNG' },
  { extensions: ['.jpg', '.jpeg'], label: 'JPG' },
  { extensions: ['.doc', '.docx'], label: 'Word' },
  { extensions: ['.xls', '.xlsx'], label: 'Excel' },
  { extensions: ['.csv'], label: 'CSV' },
  { extensions: ['.txt'], label: 'Text' },
]

/**
 * "Tickets" rows of the Email watch card: one ticket per email or per attachment, which files
 * count, what happens when there are none, and whether each ticket also gets the .eml.
 * Applies to both the mailbox and webhook-only paths. Each change saves at once.
 */
export default function EmailTicketSettings({ workflowId, onError }: Props) {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const queryKey = ['email-ticket-settings', workflowId]

  const { data: settings } = useQuery({
    queryKey,
    queryFn: () => getWorkflowEmailSettings(workflowId),
  })

  const save = useMutation({
    mutationFn: (input: WorkflowEmailSettingsInput) =>
      saveWorkflowEmailSettings(workflowId, input),
    onError: (error) => {
      onError(error)
      void queryClient.invalidateQueries({ queryKey })
    },
    onMutate: (input) => {
      queryClient.setQueryData<WorkflowEmailSettings>(queryKey, (current) =>
        current ? { ...current, ...input } : current,
      )
    },
    onSuccess: (saved) => queryClient.setQueryData(queryKey, saved),
  })

  if (!settings) {
    return <p className='px-5 py-4 text-12 text-gray-9'>{t`Loading…`}</p>
  }

  const perAttachment = settings.ticketMode === 'attachment'
  const hasGroup = (extensions: string[]) =>
    extensions.every((ext) => settings.attachmentTypes.includes(ext))

  const toggleGroup = (extensions: string[]) => {
    const next = hasGroup(extensions)
      ? settings.attachmentTypes.filter((ext) => !extensions.includes(ext))
      : [...settings.attachmentTypes, ...extensions]
    if (next.length === 0) return
    save.mutate({ attachmentTypes: next })
  }

  return (
    <div className='border-t border-gray-3/60'>
      <div className='flex items-center justify-between gap-3 px-5 pt-5'>
        <Caption>{t`Tickets`}</Caption>
        <span className='flex items-center gap-1 text-12 text-gray-9'>
          {save.isPending ? (
            <>
              <Icon className='size-3.5 animate-spin' name='lucide:loader-2' />
              {t`Saving…`}
            </>
          ) : settings.isDefault ? (
            t`Default for this workflow`
          ) : (
            t`Saved`
          )}
        </span>
      </div>

      <div className='divide-y divide-gray-3/60'>
        <SettingRow
          hint={t`Applies to the mailbox and webhook alike.`}
          label={t`Create a ticket for`}
        >
          <div className='grid grid-cols-2 gap-2'>
            <ChoicePill
              active={!perAttachment}
              icon='lucide:mail'
              label={t`Each email`}
              onClick={() => save.mutate({ ticketMode: 'email' })}
            />
            <ChoicePill
              active={perAttachment}
              icon='lucide:paperclip'
              label={t`Each attachment`}
              onClick={() => save.mutate({ ticketMode: 'attachment' })}
            />
          </div>
        </SettingRow>

        {perAttachment && (
          <>
            <SettingRow
              hint={t`Which files become tickets. Logos and signature images are ignored.`}
              label={t`Attachment types`}
            >
              <div className='flex flex-wrap gap-2'>
                {TYPE_GROUPS.map((group) => {
                  const active = hasGroup(group.extensions)
                  return (
                    <button
                      aria-pressed={active}
                      key={group.label}
                      type='button'
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] transition-colors duration-200 active:scale-[0.98]',
                        active
                          ? 'border-primary-9/45 bg-primary-3 text-primary-10'
                          : 'border-gray-3 bg-surface text-gray-10 hover:border-gray-4 hover:text-gray-12',
                      )}
                      onClick={() => toggleGroup(group.extensions)}
                    >
                      {active && (
                        <Icon className='size-3' name='lucide:check' />
                      )}
                      {group.label}
                    </button>
                  )
                })}
              </div>
            </SettingRow>

            <SettingRow
              hint={t`When an email has none of these files.`}
              label={t`No attachment`}
            >
              <div className='grid grid-cols-2 gap-2'>
                <ChoicePill
                  active={settings.noAttachmentAction === 'email'}
                  icon='lucide:mail'
                  label={t`One email ticket`}
                  onClick={() => save.mutate({ noAttachmentAction: 'email' })}
                />
                <ChoicePill
                  active={settings.noAttachmentAction === 'skip'}
                  icon='lucide:ban'
                  label={t`Skip`}
                  onClick={() => save.mutate({ noAttachmentAction: 'skip' })}
                />
              </div>
            </SettingRow>

            <SettingRow
              hint={t`Add the .eml to each attachment ticket too.`}
              label={t`Attach the original email`}
            >
              <InputSwitch
                aria-label={t`Attach the original email`}
                checked={settings.attachEmail}
                onChange={(checked) => save.mutate({ attachEmail: checked })}
              />
            </SettingRow>
          </>
        )}
      </div>
    </div>
  )
}
