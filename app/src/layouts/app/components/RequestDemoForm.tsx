import { useEffect, useRef, useState } from 'react'
import {
  createSupportTicket,
  type CreateSupportTicketPayload,
  type SupportTicketResponse,
} from '@/api/v6/supportTickets'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import useAuthUserStore from '@/stores/authUserStore'
// import { axiosV6 } from '@/api/axios'

const CATEGORIES = [
  {
    icon: 'lucide:settings',
    key: 'account',
    label: 'Account configuration',
    team: 'Support team',
  },
  {
    icon: 'lucide:receipt',
    key: 'ap',
    label: 'Accounts payable setup',
    team: 'Implementation consultant',
  },
  {
    icon: 'lucide:file-input',
    key: 'po',
    label: 'PO Master Import',
    team: 'Implementation consultant',
  },
  {
    icon: 'lucide:plug',
    key: 'integration',
    label: 'Integration support',
    team: 'Engineering team',
  },
  {
    icon: 'lucide:compass',
    key: 'explore',
    label: 'Explore the app features',
    team: 'Product team',
  },
  {
    icon: 'lucide:presentation',
    key: 'demo',
    label: 'Request a demo session',
    team: 'Sales team',
  },
  {
    icon: 'lucide:user',
    key: 'consultant',
    label: 'Talk to an expert',
    team: 'Consultant desk',
  },
  {
    icon: 'lucide:headphones',
    key: 'support',
    label: 'Connect for support',
    team: 'Support team',
  },
  {
    icon: 'lucide:bug',
    key: 'bug',
    label: 'Issue or bug to report',
    team: 'Engineering team',
  },
]

type FormErrors = Partial<Record<keyof FormState, string>>

type FormState = {
  category: string
  consent: boolean
  contactMethod: 'email' | 'phone'
  description: string
  phone: string
  priority: string
}

const INITIAL_STATE: FormState = {
  category: 'demo',
  consent: false,
  contactMethod: 'email',
  description: '',
  phone: '',
  priority: 'normal',
}

const RequestDemoForm = () => {
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const focusDescription = useRequestDemoStore((s) => s.focusDescription)
  const initialCategory = useRequestDemoStore((s) => s.initialCategory)
  const initialPriority = useRequestDemoStore((s) => s.initialPriority)
  const session = useAuthUserStore((s) => s.session)
  const user = useAuthUserStore((s) => s.user)
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_STATE,
    category: initialCategory ?? INITIAL_STATE.category,
    priority: initialPriority ?? INITIAL_STATE.priority,
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successTicket, setSuccessTicket] =
    useState<SupportTicketResponse | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (successTicket) {
      containerRef.current?.scrollTo({ behavior: 'smooth', top: 0 })
      successRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [successTicket])

  useEffect(() => {
    // Intentionally runs once on mount, not on every focusDescription change.
    if (focusDescription) {
      descriptionRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, type, value } = e.target
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
    if (!form.category) newErrors.category = 'Please complete this field.'
    if (!form.priority) newErrors.priority = 'Please complete this field.'
    if (!form.contactMethod)
      newErrors.contactMethod = 'Please complete this field.'
    if (!form.description.trim())
      newErrors.description = 'Please complete this field.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showToast({
        message: 'Please complete all required fields before submitting.',
        variant: 'error',
      })
      return
    }

    setErrors({})

    const finalPayload = {
      email: session?.email || user?.email || '',
      // helpWithLabel: selectedCategory?.label || '',
      fullName: session?.name || session?.firstName || user?.name || '',
      isEmailSend: form.consent,
      orgName: (session as any)?.displayName || session?.tenantId || '',
      phoneNO: form.phone,
      preferredContact: form.contactMethod,
      priorty: form.priority,
      requestDescription: form.description,
      supportCategory: form.category,
      tenantId: session?.tenantId || (session as any)?.id || '',
    }

    // Console log the final payload
    console.log('Final Payload:', finalPayload)

    setIsSubmitting(true)

    const selectedCategory = CATEGORIES.find((c) => c.key === form.category)
    const payload: CreateSupportTicketPayload = {
      email: session?.email || user?.email || '',
      fullName: session?.name || session?.firstName || user?.name || '',
      isEmailSend: Boolean(form.consent),
      orgName: (session as any)?.displayName || session?.tenantId || '',
      PhoneNO: form.phone.trim(),
      PreferredContact: form.contactMethod === 'phone' ? 'Phone' : 'Email',
      Priorty: form.priority.charAt(0).toUpperCase() + form.priority.slice(1),
      RequestDescription: form.description.trim(),
      supportCategory: selectedCategory?.label || form.category,
      tenantId: session?.tenantId || (session as any)?.id || '',
    }

    const response = await createSupportTicket(payload)
    setIsSubmitting(false)

    if (
      response.error ||
      !response.data ||
      response.data.jiraSuccess === false
    ) {
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
    <div
      className='animate-in fade-in slide-in-from-bottom-8 flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto bg-gray-1 py-8 duration-500'
      ref={containerRef}
    >
      {/* Form card */}
      <div className='mx-6 w-full max-w-3xl rounded-2xl border border-gray-3 bg-surface p-8 shadow-sm'>
        {/* Title */}
        <div className='mb-8 flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight text-gray-13'>
              Connect with the EZOFIS Team
            </h2>
            <p className='mt-2 text-sm leading-relaxed text-gray-11'>
              Whether you need help with AP workflows, PO matching, or custom
              integrations, we'll route your request to the right experts.
            </p>
          </div>
          <button
            className='group flex shrink-0 items-center justify-center rounded-lg p-1.5 text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95'
            type='button'
            onClick={closeDemoForm}
          >
            <Icon className='size-5 transition-transform' name='lucide:x' />
          </button>
        </div>

        {successTicket ? (
          <div
            className='animate-in fade-in mb-6 flex flex-col items-center rounded-xl border border-green-3 bg-green-2/50 p-6 text-center'
            ref={successRef}
          >
            <div className='mb-3 flex size-12 items-center justify-center rounded-full bg-green-3 text-green-11'>
              <Icon className='size-6' name='lucide:check-circle-2' />
            </div>
            <h3 className='text-lg font-bold text-gray-13'>
              Support Request Submitted
            </h3>
            <p className='mt-1 max-w-md text-sm text-gray-11'>
              Your support request has been successfully submitted to the Ezofis
              Support Team.
            </p>
            {successTicket.jiraIssueKey && (
              <div className='mt-4 flex items-center gap-2 rounded-lg border border-gray-4 bg-surface px-4 py-2 text-sm font-semibold text-gray-13 shadow-xs'>
                <span>Ticket Number:</span>
                <span className='font-bold text-primary-9'>
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
              What do you need help with?{' '}
              <span className='font-bold text-red-9'>*</span>
            </label>
            <p className='mb-3 text-xs text-gray-11'>
              Pick the option that's closest to your situation.
            </p>
            <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-3'>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type='button'
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    form.category === c.key
                      ? 'border-primary-9 bg-primary-3/30'
                      : errors.category
                        ? 'border-red-9 bg-red-1'
                        : 'border-gray-4 bg-surface hover:border-primary-7'
                  }`}
                  onClick={() => {
                    setForm({ ...form, category: c.key })
                    setErrors((prev) => ({ ...prev, category: undefined }))
                  }}
                >
                  <Icon
                    className={`size-5 shrink-0 ${form.category === c.key ? 'text-primary-9' : errors.category ? 'text-red-9' : 'text-gray-11'}`}
                    name={c.icon}
                  />
                  <span
                    className={`text-sm leading-none font-medium ${
                      form.category === c.key
                        ? 'text-primary-11'
                        : errors.category
                          ? 'text-red-11'
                          : 'text-gray-12'
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
            <label className='text-sm font-semibold text-gray-13'>
              Priority
            </label>
            <p className='mb-2 text-xs text-gray-11'>
              How urgently does this need attention?
            </p>
            <div className='flex flex-wrap gap-2'>
              {['Low', 'Normal', 'High', 'Urgent'].map((p) => (
                <button
                  key={p}
                  type='button'
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                    form.priority === p.toLowerCase()
                      ? p === 'Urgent'
                        ? 'border-red-9 bg-red-9 text-white'
                        : 'border-primary-9 bg-primary-9 text-white'
                      : errors.priority
                        ? 'border-red-9 bg-red-1 text-red-11'
                        : 'border-gray-4 bg-surface text-gray-11 hover:border-primary-7'
                  }`}
                  onClick={() => {
                    setForm({ ...form, priority: p.toLowerCase() })
                    setErrors((prev) => ({ ...prev, priority: undefined }))
                  }}
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
                { icon: 'lucide:mail', id: 'email', label: 'Email' },
                { icon: 'lucide:phone', id: 'phone', label: 'Phone call' },
              ].map((m) => (
                <button
                  key={m.id}
                  type='button'
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                    form.contactMethod === m.id
                      ? 'border-primary-9 bg-primary-3/30 text-primary-11'
                      : errors.contactMethod
                        ? 'border-red-9 bg-red-1 text-red-11'
                        : 'border-gray-4 bg-surface text-gray-11 hover:border-primary-7'
                  }`}
                  onClick={() => {
                    setForm({
                      ...form,
                      contactMethod: m.id as 'email' | 'phone',
                    })
                    setErrors((prev) => ({ ...prev, contactMethod: undefined }))
                  }}
                >
                  <Icon className='size-4' name={m.icon} />
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
                  className='w-full rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 transition-all outline-none placeholder:text-gray-8 hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                  id='phone'
                  name='phone'
                  placeholder='+1 (555) 000-0000'
                  type='tel'
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
              Describe your request{' '}
              <span className='font-bold text-red-9'>*</span>
            </label>
            <p className='mb-2 text-xs text-gray-11'>
              Tell us about your requirements or what you'd like to cover.
            </p>
            <div className='relative'>
              <textarea
                className={`min-h-[110px] w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-sm text-gray-13 transition-all outline-none placeholder:text-gray-8 hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4 ${errors.description ? 'border-red-9' : 'border-gray-4'}`}
                id='description'
                maxLength={1000}
                name='description'
                placeholder="Describe how we can help you or what you'd like to accomplish"
                ref={descriptionRef}
                rows={4}
                value={form.description}
                onChange={handleChange}
              />
              <div className='absolute right-3 bottom-3 text-xs text-gray-9'>
                {form.description.length}/1000
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className='mt-5 flex flex-col gap-3'>
            <label className='flex cursor-pointer items-start gap-3'>
              <input
                checked={form.consent}
                className='mt-0.5 size-4 cursor-pointer accent-primary-9'
                name='consent'
                type='checkbox'
                onChange={handleChange}
              />
              <span className='text-sm text-gray-13'>
                We may email you for more information or updates
              </span>
            </label>
            <p className='max-w-2xl text-xs leading-relaxed text-gray-10'>
              Some{' '}
              <button className='text-primary-9 hover:underline' type='button'>
                account and system information
              </button>{' '}
              may be sent to your request's assigned team. We'll use it to fix
              problems and improve our services, subject to our{' '}
              <button className='text-primary-9 hover:underline' type='button'>
                Privacy Policy
              </button>{' '}
              and{' '}
              <button className='text-primary-9 hover:underline' type='button'>
                Terms of Service
              </button>
              . We may email you for more information or updates. Go to{' '}
              <button className='text-primary-9 hover:underline' type='button'>
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
              className='flex items-center gap-2 rounded-xl bg-primary-9 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'
              disabled={isSubmitting}
              type='submit'
            >
              {isSubmitting ? (
                <>
                  <Icon
                    className='size-4 animate-spin'
                    name='lucide:loader-2'
                  />
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
