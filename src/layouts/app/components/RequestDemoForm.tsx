import { useState } from 'react'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'


const EMPLOYEE_OPTIONS = [
  '1–10',
  '11–50',
  '51–200',
  '201–500',
  '501–1000',
  '1000+',
]



type FormState = {
  firstName: string
  lastName: string
  workEmail: string
  jobTitle: string
  country: string
  phone: string
  company: string
  employees: string
  message: string
  subscribeNewsletter: boolean
}

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  workEmail: '',
  jobTitle: '',
  country: '',
  phone: '',
  company: '',
  employees: '',
  message: '',
  subscribeNewsletter: false,
}

const RequestDemoForm = () => {
  const closeDemoForm = useRequestDemoStore((s) => s.closeDemoForm)
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setIsSubmitting(false)
    showToast({
      message: 'Demo request sent successfully! Our team will be in touch.',
      variant: 'success',
    })
    closeDemoForm()
  }

  return (
    <div className='animate-in fade-in zoom-in-95 flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto bg-gray-1 duration-300'>
      {/* Back button */}
      <div className='flex w-full max-w-2xl items-center px-6 pt-6 pb-2'>
        <button
          className='group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-10 transition-all hover:bg-gray-3 hover:text-gray-13 active:scale-95'
          type='button'
          onClick={closeDemoForm}
        >
          <Icon
            className='size-3.5 transition-transform group-hover:-translate-x-0.5'
            name='lucide:arrow-left'
          />
          Back
        </button>
      </div>

      {/* Form card */}
      <div className='w-full max-w-2xl rounded-2xl border border-gray-3 bg-surface p-8 shadow-sm mx-6 mb-8'>
        {/* Title */}
        <div className='mb-6'>
          <h2 className='text-lg font-bold text-gray-13'>
            Request a demo by filling the form
          </h2>
        </div>

        <form
          className='space-y-5'
          noValidate
          onSubmit={handleSubmit}
        >
          {/* Row 1: First Name + Last Name */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='firstName'
              >
                First Name
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='firstName'
                name='firstName'
                placeholder='First name'
                type='text'
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='lastName'
              >
                Last Name
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='lastName'
                name='lastName'
                placeholder='Last name'
                type='text'
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 2: Work Email + Job Title */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='workEmail'
              >
                Work email
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='workEmail'
                name='workEmail'
                placeholder='mail@company.com'
                type='email'
                value={form.workEmail}
                onChange={handleChange}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='jobTitle'
              >
                Job title
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='jobTitle'
                name='jobTitle'
                placeholder='Ex: sales manager'
                type='text'
                value={form.jobTitle}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 3: Country + Phone */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='country'
              >
                Country
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='country'
                name='country'
                placeholder='Enter your country'
                type='text'
                value={form.country}
                onChange={handleChange}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='phone'
              >
                Phone number
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='phone'
                name='phone'
                placeholder='ex: +966 56 1234567'
                type='tel'
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 4: Company + Employees */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='company'
              >
                Company name
              </label>
              <input
                className='rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                id='company'
                name='company'
                placeholder='Example: Lucidya'
                type='text'
                value={form.company}
                onChange={handleChange}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label
                className='text-xs font-semibold text-gray-12'
                htmlFor='employees'
              >
                Number of employees
              </label>
              <div className='relative'>
                <select
                  className='w-full appearance-none rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
                  id='employees'
                  name='employees'
                  value={form.employees}
                  onChange={handleChange}
                >
                  <option value=''>Choose from the list</option>
                  {EMPLOYEE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <Icon
                  className='pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gray-9'
                  name='lucide:chevron-down'
                />
              </div>
            </div>
          </div>

          {/* Row 5: Message */}
          <div className='flex flex-col gap-1.5'>
            <label
              className='text-xs font-semibold text-gray-12'
              htmlFor='message'
            >
              Message
            </label>
            <textarea
              className='min-h-[100px] resize-none rounded-lg border border-gray-4 bg-surface px-3 py-2.5 text-sm text-gray-13 outline-none placeholder:text-gray-8 transition-all hover:border-gray-6 focus:border-primary-7 focus:ring-2 focus:ring-primary-4'
              id='message'
              name='message'
              placeholder='Write your message here!'
              rows={4}
              value={form.message}
              onChange={handleChange}
            />
          </div>

          {/* Newsletter checkbox */}
          <label className='flex cursor-pointer items-center gap-2.5'>
            <input
              checked={form.subscribeNewsletter}
              className='size-4 cursor-pointer accent-primary-9'
              name='subscribeNewsletter'
              type='checkbox'
              onChange={handleChange}
            />
            <span className='text-xs text-gray-11'>
              Please subscribe me to the newsletter
            </span>
          </label>

          {/* Submit button */}
          <button
            className='flex w-full items-center justify-center gap-2 rounded-xl bg-primary-9 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'
            disabled={isSubmitting}
            type='submit'
          >
            {isSubmitting ? (
              <>
                <Icon className='size-4 animate-spin' name='lucide:loader-2' />
                Sending...
              </>
            ) : (
              <>
                <Icon className='size-4' name='lucide:send' />
                Send to sales
              </>
            )}
          </button>

          {/* Footer note */}
          <p className='text-center text-[11px] text-gray-9'>
            By clicking submit you agree to{' '}
            <button
              className='underline transition-colors hover:text-primary-9'
              type='button'
            >
              Privacy Policy
            </button>
            {' · '}
            <button
              className='underline transition-colors hover:text-primary-9'
              type='button'
            >
              Service Agreement
            </button>
            {' · '}
            <button
              className='underline transition-colors hover:text-primary-9'
              type='button'
            >
              Author Privacy
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

RequestDemoForm.displayName = 'RequestDemoForm'
export default RequestDemoForm
