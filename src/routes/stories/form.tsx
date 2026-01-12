import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import Button from '@/components/base/button/Button'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/form')({
  component: RouteComponent,
})

const formSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter (A-Z)')
    .regex(/[a-z]/, 'Must contain at least 1 lowercase letter (a-z)')
    .regex(/[0-9]/, 'Must contain at least 1 number (0-9)')
    .regex(
      /[!@#$%^&*]/,
      'Must contain at least 1 special character (!@#$%^&*)',
    ),
})

function RouteComponent() {
  const defaultValues: z.infer<typeof formSchema> = {
    email: '',
    password: '',
  }

  const form = useForm({
    defaultValues,
    validators: {
      onChange: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      console.log(value)
    },
  })

  return (
    <div>
      <StoryTitle>40. Form</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>

        <form
          className='w-96 space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field
            name='email'
            children={(field) => (
              <InputText
                error={field.state.meta.errors[0]?.message}
                label='Email'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          />

          <form.Field
            name='password'
            children={(field) => (
              <InputPassword
                error={field.state.meta.errors[0]?.message}
                label='Password'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            )}
          />

          <div className='flex items-center justify-end gap-2 pt-2'>
            <Button
              color='gray'
              label='Reset'
              type='reset'
              variant='outline'
              onClick={(e) => {
                e.preventDefault()
                form.reset()
              }}
            />
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  disabled={!canSubmit}
                  label={isSubmitting ? '...' : 'Submit'}
                  type='submit'
                />
              )}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
