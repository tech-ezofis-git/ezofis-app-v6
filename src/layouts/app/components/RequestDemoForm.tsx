import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import {
  createSupportTicket,
  type CreateSupportTicketPayload,
  type SupportTicketResponse,
} from '@/api/v6/supportTickets'
import useAuthUserStore from '@/stores/authUserStore'
// import { axiosV6 } from '@/api/axios'

const CATEGORIES = [
  { key: 'account', label: 'Account configuration', icon: 'lucide:settings', team: 'Support team' },
  { key: 'ap', label: 'Accounts payable setup', icon: 'lucide:receipt', team: 'Implementation consultant' },
  { key: 'po', label: 'PO Master Import', icon: 'lucide:file-input', team: 'Implementation consultant' },
  { key: 'integration', label: 'Integration support', icon: 'lucide:plug', team: 'Engineering team' },
  { key: 'explore', label: 'Explore the app features', icon: 'lucide:compass', team: 'Product team' },
  { key: 'demo', label: 'Request a demo session', icon: 'lucide:presentation', team: 'Sales team' },
  { key: 'consultant', label: 'Talk to an expert', icon: 'lucide:user', team: 'Consultant desk' },
  { key: 'support', label: 'Connect for support', icon: 'lucide:headphones', team: 'Support team' },
  { key: 'bug', label: 'Issue or bug to report', icon: 'lucide:bug', team: 'Engineering team' },
]

type FormState = {
  category: string
  priority: string
  contactMethod: 'email' | 'phone'
  phone: string
  description: string
  consent: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

const INITIAL_STATE: FormState = {
  category: 'demo',
  priority: 'normal',
  contactMethod: 'email',
  phone: '',
  description: '',
  consent: false,
}

const RequestDemoForm = () => {
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const session = useAuthUserStore((s) => s.session)
  const user = useAuthUserStore((s) => s.user)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successTicket, setSuccessTicket] = useState<SupportTicketResponse | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (successTicket) {
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [successTicket])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: FormErrors = {}
    if (!form.category) newErrors.category = 'Required'
    if (!form.priority) newErrors.priority = 'Required'
    if (!form.contactMethod) newErrors.contactMethod = 'Required'
    if (!form.description.trim()) newErrors.description = 'Required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showToast({
        message: 'Please fill in all required fields.',
        variant: 'error',
      })
      return
    }

    setErrors({})

    const finalPayload = {
      supportCategory: form.category,
      priorty: form.priority,
      preferredContact: form.contactMethod,
      phoneNO: form.phone,
      requestDescription: form.description,
      isEmailSend: form.consent,
      // helpWithLabel: selectedCategory?.label || '',
      fullName: session?.name || session?.firstName || user?.name || '',
      orgName: (session as any)?.displayName || session?.tenantId || '',
      email: session?.email || user?.email || '',
      tenantId: session?.tenantId || (session as any)?.id || '',
    }

    // Console log the final payload
    console.log('Final Payload:', finalPayload)

    setIsSubmitting(true)

    const selectedCategory = CATEGORIES.find((c) => c.key === form.category)
    const payload: CreateSupportTicketPayload = {
      supportCategory: selectedCategory?.label || form.category,
      Priorty: form.priority.charAt(0).toUpperCase() + form.priority.slice(1),
      PreferredContact: form.contactMethod === 'phone' ? 'Phone' : 'Email',
      PhoneNO: form.phone.trim(),
      RequestDescription: form.description.trim(),
      isEmailSend: Boolean(form.consent),
      fullName: session?.name || session?.firstName || user?.name || '',
      orgName: (session as any)?.displayName || session?.tenantId || '',
      email: session?.email || user?.email || '',
      tenantId: session?.tenantId || (session as any)?.id || '',
    }

    const response = await createSupportTicket(payload)
    setIsSubmitting(false)

    if (response.error || !response.data || response.data.jiraSuccess === false) {
      showToast({
        message: response.error || 'Failed to submit support ticket',
        variant: 'error',
      })
      return
    }

    const ticketData = response.data || {}
    const issueKey = ticketData.jiraIssueKey || ticketData.id || ''

    const toastMsg = issueKey
      ? `Your support request has been successfully submitted to the Ezofis Support Team.\nTicket Number: ${issueKey}`
      : 'Your support request has been successfully submitted to the Ezofis Support Team.'

    showToast({
      message: toastMsg,
      variant: 'success',
    })

    setSuccessTicket(ticketData)
    setForm(INITIAL_STATE)
  }

  const selectedCategory = CATEGORIES.find((c) => c.key === form.category)

  return (
    <div ref={containerRef} className='animate-in fade-in slide-in-from-bottom-8 duration-500 flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto bg-gray-1 py-8'>
      {/* Form card */}
      <div className='mx-6 w-full max-w-3xl rounded-2xl border border-gray-3 bg-surface p-8 shadow-sm'>
        {/* Title */}
        <div className='mb-8 flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight text-gray-13'>
              Connect with the EZOFIS Team
            </h2>
            <p className='mt-2 text-sm leading-relaxed text-gray-11'>
              Whether you need help with AP workflows, PO matching, or custom integrations, we'll route your request to the right experts.
            </p>
          </div>
          <button
            className='group flex shrink-0 items-center justify-center rounded-lg p-1.5 text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95'
            type='button'
            onClick={closeDemoForm}
          >
            <Icon
              className='size-5 transition-transform'
              name='lucide:x'
            />
          </button>
        </div>

        {successTicket ? (
          <div ref={successRef} className='mb-6 flex flex-col items-center rounded-xl border border-green-3 bg-green-2/50 p-6 text-center animate-in fade-in'>
            <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-green-3 text-green-11'>
              <Icon className='size-6' name='lucide:check-circle-2' />
            </div>
            <h3 className='text-lg font-bold text-gray-13'>
              Support Request Submitted
            </h3>
            <p className='mt-1 max-w-md text-sm text-gray-11'>
              Your support request has been successfully submitted to the Ezofis Support Team.
            </p>
            {successTicket.jiraIssueKey && (
              <div className='mt-4 flex items-center gap-2 rounded-lg border border-gray-4 bg-surface px-4 py-2 text-sm font-semibold text-gray-13 shadow-xs'>
                <span>Ticket Number:</span>
                <span className='text-primary-9 font-bold'>
                  {successTicket.jiraIssueKey}
                </span>
                {successTicket.jiraIssueUrl && (
                  <a
                    className='ml-2 inline-flex items-center gap-1 text-xs text-primary-9 underline hover:text-primary-10'
                    href={successTicket.jiraIssueUrl}
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    View Ticket
                    <Icon className='size-3.5' name='lucide:external-link' />
                  </a>
                )}
              </div>
            )}
            <div className='mt-6 flex gap-3'>
              <button
                className='rounded-xl border border-gray-4 bg-surface px-5 py-2.5 text-sm font-semibold text-gray-13 transition-all hover:bg-gray-3'
                type='button'
                onClick={() => setSuccessTicket(null)}
              >
                Submit another request
              </button>
              <button
                className='rounded-xl bg-primary-9 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-10'
                type='button'
                onClick={closeDemoForm}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        <form className='space-y-5' noValidate onSubmit={handleSubmit}>
          {/* Category */}
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-semibold text-gray-13'>
              What do you need help with? <span className='text-red-9 font-bold'>*</span>
            </label>
            <p className='mb-3 text-xs text-gray-11'>Pick the option that's closest to your situation.</p>
            <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type='button'
                  onClick={() => {
                    setForm({ ...form, category: c.key })
                    setErrors((prev) => ({ ...prev, category: undefined }))
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${form.category === c.key
                    ? 'border-primary-9 bg-primary-3/30'
                    : errors.category
                    ? 'border-red-9 bg-red-1'
                    : 'border-gray-4 bg-surface hover:border-primary-7'
                    }`}
                >
                  <Icon
                    name={c.icon}
                    className={`size-5 shrink-0 ${form.category === c.key ? 'text-primary-9' : errors.category ? 'text-red-9' : 'text-gray-11'}`}
                  />
                  <span
                    className={`text-sm font-medium leading-none ${form.category === c.key ? 'text-primary-11' : errors.category ? 'text-red-11' : 'text-gray-12'
                      }`}
                  >
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-semibold text-gray-13'>Priority</label>
            <p className='mb-2 text-xs text-gray-11'>How urgently does this need attention?</p>
            <div className='flex flex-wrap gap-2'>
              {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                <button
                  key={p}
                  type='button'
                  onClick={() => {
                    setForm({ ...form, priority: p.toLowerCase() })
                    setErrors((prev) => ({ ...prev, priority: undefined }))
                  }}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${form.priority === p.toLowerCase()
                    ? p === 'Urgent'
                      ? 'border-red-9 bg-red-9 text-white'
                      : 'border-primary-9 bg-primary-9 text-white'
                    : errors.priority
                    ? 'border-red-9 bg-red-1 text-red-11'
                    : 'border-gray-4 bg-surface text-gray-11 hover:border-primary-7'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Method */}
          <div className='flex flex-col gap-1.5'>
            <label className='text-sm font-semibold text-gray-13'>
              Preferred contact method
            </label>
            <div className='mb-2 flex flex-wrap gap-2'>
              {[
                { id: 'email', label: 'Email', icon: 'lucide:mail' },
                { id: 'phone', label: 'Phone call', icon: 'lucide:phone' },
              ].map((m) => (
                <button
                  key={m.id}
                  type='button'
                  onClick={() => {
                    setForm({ ...form, contactMethod: m.id as 'email' | 'phone' })
                    setErrors((prev) => ({ ...prev, contactMethod: undefined }))
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${form.contactMethod === m.id
                    ? 'border-primary-9 bg-primary-3/30 text-primary-11'
                    : errors.contactMethod
                    ? 'border-red-9 bg-red-1 text-red-11'
                    : 'border-gray-4 bg-surface text-gray-11 hover:border-primary-7'
                    }`}
                >
                  <Icon name={m.icon} className='size-4' />
                  {m.label}
                </button>
              ))}
            </div>
            {form.contactMethod === 'phone' && (
              <div className='mt-2'>
                <label className='sr-only' htmlFor='phone'>
                  Phone number
                </label>
                <input
                  id='phone'
                  name='phone'
                  type='tel'
                  placeholder='+1 (555) 000-0000'
                  className='w-full rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className='flex flex-col gap-1.5'>
            <label
              className='text-sm font-semibold text-gray-13'
              htmlFor='description'
            >
              Describe your request <span className='text-red-9 font-bold'>*</span>
            </label>
            <p className='mb-2 text-xs text-gray-11'>
              Tell us about your requirements or what you'd like to cover.
            </p>
            <div className='relative'>
              <textarea
                id='description'
                name='description'
                placeholder="Describe how we can help you or what you'd like to accomplish"
                rows={4}
                maxLength={1000}
                className={`min-h-[110px] w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4 ${errors.description ? 'border-red-9' : 'border-gray-4'}`}
                value={form.description}
                onChange={handleChange}
              />
              <div className='absolute bottom-3 right-3 text-xs text-gray-9'>
                {form.description.length}/1000
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className='mt-5 flex flex-col gap-3'>
            <label className='flex cursor-pointer items-start gap-3'>
              <input
                type='checkbox'
                name='consent'
                checked={form.consent}
                onChange={handleChange}
                className='mt-0.5 size-4 cursor-pointer accent-primary-9'
              />
              <span className='text-sm text-gray-13'>
                We may email you for more information or updates
              </span>
            </label>
            <p className='max-w-2xl text-xs leading-relaxed text-gray-10'>
              Some{' '}
              <button type='button' className='text-primary-9 hover:underline'>
                account and system information
              </button>{' '}
              may be sent to your request's assigned team. We'll use it to fix problems
              and improve our services, subject to our{' '}
              <button type='button' className='text-primary-9 hover:underline'>
                Privacy Policy
              </button>{' '}
              and{' '}
              <button type='button' className='text-primary-9 hover:underline'>
                Terms of Service
              </button>
              . We may email you for more information or updates. Go to{' '}
              <button type='button' className='text-primary-9 hover:underline'>
                Legal help
              </button>{' '}
              to ask for content changes for legal reasons.
            </p>
          </div>

          {/* Submit Row */}
          <div className='mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-gray-4 pt-4'>
            <div className='text-xs text-gray-11'>
              Routes to{' '}
              <span className='font-semibold text-gray-13'>
                {selectedCategory?.team || 'Support team'}
              </span>{' '}
              once submitted
            </div>
            <button
              type='submit'
              disabled={isSubmitting}
              className='flex items-center gap-2 rounded-xl bg-primary-9 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'
            >
              {isSubmitting ? (
                <>
                  <Icon name='lucide:loader-2' className='size-4 animate-spin' />
                  Sending...
                </>
              ) : (
                <>
                  {/* <Icon name='lucide:send' className='size-4' /> */}
                  Send request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

RequestDemoForm.displayName = 'RequestDemoForm'
export default RequestDemoForm
