import { t } from '@lingui/macro'
import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  // rem
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { useForm } from '@mantine/form'
import { useEffect } from 'react'
import Icon from '@/components/base/icon/Icon'
import { type Field, useFormStore } from '../store'

const FieldSidebar = () => {
  const { activeFieldId, deleteField, pages, updateField } = useFormStore()

  const activeField = pages
    .flatMap((p) => p.fields)
    .find((f) => f.id === activeFieldId)

  const form = useForm<Partial<Field>>({
    initialValues: {
      description: '',
      hidden: false,
      placeholder: '',
      readOnly: false,
      required: false,
      title: '',
    },
  })

  // Sync form with active field
  useEffect(() => {
    if (activeField) {
      form.setValues({
        description: activeField.description || '',
        hidden: activeField.hidden,
        placeholder: activeField.placeholder || '',
        readOnly: activeField.readOnly,
        required: activeField.required,
        title: activeField.title,
      })
    }
  }, [activeFieldId])

  // Handle updates
  const handleUpdate = (values: Partial<Field>) => {
    if (activeFieldId) {
      updateField(activeFieldId, values)
    }
  }

  if (!activeField) return null

  return (
    <Box className='border-slate-200 animate-in slide-in-from-right-4 flex h-full flex-col border-l bg-white shadow-xl duration-300'>
      {/* Sidebar Header */}
      <Box className='border-slate-100 bg-slate-50/30 flex items-center justify-between border-b px-6 py-4'>
        <Group gap='xs'>
          <Icon className='size-[18px]' name='tabler:adjustments-horizontal' />
          <Text
            className='text-slate-700 tracking-widest uppercase'
            fw={800}
            size='sm'
          >
            {t`Field Settings`}
          </Text>
        </Group>
        <Badge color='indigo' radius='sm' size='xs' variant='outline'>
          {activeField.type.replace('_', ' ')}
        </Badge>
      </Box>

      {/* Sidebar Scrollable Body */}
      <Box className='flex-1 overflow-y-auto p-6'>
        <Stack gap='xl'>
          {/* Content Section */}
          <Stack gap='md'>
            <Text
              className='text-slate-400 tracking-widest uppercase'
              fw={800}
              size='xs'
            >{t`Content`}</Text>

            <TextInput
              label={t`Label`}
              placeholder={t`e.g. What is your name?`}
              {...form.getInputProps('title')}
              classNames={{ label: 'text-slate-800 mb-1 text-xs font-bold' }}
              onBlur={() => handleUpdate({ title: form.values.title })}
            />

            <Textarea
              label={t`Description`}
              placeholder={t`Add extra instructions for the user...`}
              {...form.getInputProps('description')}
              classNames={{ label: 'text-slate-800 mb-1 text-xs font-bold' }}
              minRows={2}
              autosize
              onBlur={() =>
                handleUpdate({ description: form.values.description })
              }
            />

            <TextInput
              label={t`Placeholder`}
              placeholder={t`e.g. Type here...`}
              {...form.getInputProps('placeholder')}
              classNames={{ label: 'text-slate-800 mb-1 text-xs font-bold' }}
              onBlur={() =>
                handleUpdate({ placeholder: form.values.placeholder })
              }
            />
          </Stack>

          <Divider color='slate.1' />

          {/* Logic & Validation */}
          <Stack gap='md'>
            <Text
              className='text-slate-400 tracking-widest uppercase'
              fw={800}
              size='xs'
            >{t`Settings & Logic`}</Text>

            <Box className='bg-slate-50 border-slate-100 space-y-4 rounded-xl border p-4'>
              <Group justify='space-between'>
                <Box>
                  <Text
                    className='text-slate-700'
                    fw={700}
                    size='sm'
                  >{t`Required`}</Text>
                  <Text
                    className='text-slate-500'
                    size='10px'
                  >{t`Form cannot be submitted without this.`}</Text>
                </Box>
                <Switch
                  checked={form.values.required}
                  color='indigo'
                  onChange={(e) => {
                    const val = e.currentTarget.checked
                    form.setFieldValue('required', val)
                    handleUpdate({ required: val })
                  }}
                />
              </Group>

              <Group justify='space-between'>
                <Box>
                  <Text
                    className='text-slate-700'
                    fw={700}
                    size='sm'
                  >{t`Hidden`}</Text>
                  <Text
                    className='text-slate-500'
                    size='10px'
                  >{t`Hide this field from the end user.`}</Text>
                </Box>
                <Switch
                  checked={form.values.hidden}
                  color='indigo'
                  onChange={(e) => {
                    const val = e.currentTarget.checked
                    form.setFieldValue('hidden', val)
                    handleUpdate({ hidden: val })
                  }}
                />
              </Group>

              <Group justify='space-between'>
                <Box>
                  <Text
                    className='text-slate-700'
                    fw={700}
                    size='sm'
                  >{t`Read Only`}</Text>
                  <Text
                    className='text-slate-500'
                    size='10px'
                  >{t`User can see but not edit data.`}</Text>
                </Box>
                <Switch
                  checked={form.values.readOnly}
                  color='indigo'
                  onChange={(e) => {
                    const val = e.currentTarget.checked
                    form.setFieldValue('readOnly', val)
                    handleUpdate({ readOnly: val })
                  }}
                />
              </Group>
            </Box>
          </Stack>

          {/* Specialized Type Logic: Upload Po */}
          {activeField.type === 'upload_po' && (
            <>
              <Divider color='slate.1' />
              <Stack gap='md'>
                <Text
                  className='text-slate-400 tracking-widest uppercase'
                  fw={800}
                  size='xs'
                >{t`Upload Configuration`}</Text>
                <Dropzone
                  className='border-slate-200 hover:border-indigo-400 hover:bg-slate-50 rounded-xl border-2 border-dashed py-8 transition-all'
                  maxSize={5 * 1024 ** 2}
                  onDrop={() => {}}
                  onReject={() => {}}
                >
                  <Group
                    gap='sm'
                    justify='center'
                    mih={80}
                    style={{ pointerEvents: 'none' }}
                  >
                    <Dropzone.Accept>
                      <Icon
                        className='text-blue-600 size-[52px]'
                        name='tabler:upload'
                      />
                    </Dropzone.Accept>
                    <Dropzone.Reject>
                      <Icon
                        className='text-red-600 size-[52px]'
                        name='tabler:x'
                      />
                    </Dropzone.Reject>
                    <Dropzone.Idle>
                      <Icon
                        className='text-slate-400 size-[52px]'
                        name='tabler:upload'
                      />
                    </Dropzone.Idle>

                    <div className='text-center'>
                      <Text fw={700} size='sm' inline>
                        {t`Drop images here or click to select files`}
                      </Text>
                      <Text color='dimmed' mt={7} size='xs' inline>
                        {t`Attach professional documents, each should not exceed 5mb`}
                      </Text>
                    </div>
                  </Group>
                </Dropzone>
              </Stack>
            </>
          )}
        </Stack>
      </Box>

      {/* Sidebar Footer */}
      <Box className='border-slate-100 border-t bg-white p-6'>
        <Button
          className='border-red-100 hover:bg-red-50 rounded-xl border'
          color='red'
          leftSection={<Icon className='size-4' name='tabler:trash' />}
          variant='light'
          fullWidth
          onClick={() => deleteField(activeField.id)}
        >
          {t`Delete This Field`}
        </Button>
      </Box>
    </Box>
  )
}

export default FieldSidebar
