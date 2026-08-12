import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import Button from '@/components/base/button/Button'
import InputText from '@/components/base/inputs/InputText'
import InputPassword from '@/components/base/inputs/password/InputPassword'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/form')({
  component: RouteComponent,
})

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
    .regex(/[0-9]/, 'Must contain at least 1 number'),
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
      console.log('Form Submitted:', value)
    },
  })

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Form Integration</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        The design system is optimized for **TanStack Form** and **Zod**
        validation. This combination provides a type-safe, performant solution
        for handling complex inputs, nested fields, and real-time validation
        feedback.
      </p>

      <p className='mb-4 text-14 text-gray-11'>
        Standard form assembly with TanStack Form:
      </p>
      <StoryCode>
        {`import { useForm } from '@tanstack/react-form'
import * as z from 'zod'

const form = useForm({
  onSubmit: async ({ value }) => { /* ... */ },
  validators: { onChange: schema }
})`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Interactive Section */}
        <section>
          <StorySubTitle>Login Example (Validation Demo)</StorySubTitle>
          <p className='mb-8 text-14 text-gray-11'>
            Try submitting the form with invalid data to see real-time feedback
            and state handling:
          </p>
          <div className='ml-1 max-w-md rounded-2xl border border-gray-3 bg-gray-1 p-8 shadow-sm'>
            <form
              className='space-y-5'
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
                    label='Email Address'
                    placeholder='your@email.com'
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
                    showPlaceholder
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  />
                )}
              />

              <div className='flex items-center justify-end gap-3 pt-3'>
                <Button
                  color='gray'
                  label='Reset'
                  type='reset'
                  variant='subtle'
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
                      label={isSubmitting ? 'Processing...' : 'Login'}
                      loading={isSubmitting}
                      type='submit'
                    />
                  )}
                />
              </div>
            </form>
          </div>
        </section>

        {/* Code Snippet Section */}
        <section>
          <StorySubTitle>Field Subscription</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            Use <code>form.Subscribe</code> to conditionally disable controls or
            show loading states based on form metadata.
          </p>
          <StoryCode>
            {`<form.Subscribe 
  selector={(state) => [state.canSubmit, state.isSubmitting]}
  children={([canSubmit, isSubmitting]) => (
    <Button disabled={!canSubmit} loading={isSubmitting} />
  )}
/>`}
          </StoryCode>
        </section>
      </div>
    </div>
  )
}
