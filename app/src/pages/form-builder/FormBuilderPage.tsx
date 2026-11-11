import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import formApi from '@/api/form/form'
import { isSlaForm } from '@/pages/forms/utils/slaForm'
import Build from './components/build/Build'
import LivePreview from './components/build/components/preview/LivePreview'
import FormBuilderSkeleton from './components/common/FormBuilderSkeleton'
import Header from './components/common/Header'
import { useFormStore } from './store/formStore'

const FormBuilderPage = () => {
  const { formId } = useParams({ strict: false }) as any
  const navigate = useNavigate()
  const { loadForm, resetForm } = useFormStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchForm = async () => {
      let leaving = false
      if (!formId) {
        // No formId: the caller (e.g. FormsPage's "New Form"/AI builder flow)
        // is responsible for resetting or pre-loading the store before
        // navigating here, so just render whatever is already in it.
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      resetForm()
      try {
        const { data, error } = await formApi.getFormDataById(formId)
        if (!cancelled && data && !error) {
          // SLA forms have fixed fields and are not editable: even a direct
          // link goes to their entries.
          if (isSlaForm(data)) {
            leaving = true
            void navigate({
              params: { formId },
              replace: true,
              to: '/forms/$formId/entries',
            })
            return
          }
          loadForm(data)
        }
      } catch (err) {
        console.error('Failed to fetch form:', err)
      } finally {
        if (!cancelled && !leaving) setIsLoading(false)
      }
    }

    fetchForm()

    return () => {
      cancelled = true
    }
  }, [formId, loadForm, navigate, resetForm])

  if (isLoading) {
    return <FormBuilderSkeleton />
  }

  return (
    <div className='relative flex h-dvh flex-col overflow-hidden'>
      <Header />
      <div className='flex flex-1 overflow-hidden'>
        <div className='flex-1 overflow-auto'>
          <Build />
        </div>
      </div>

      <LivePreview />
    </div>
  )
}

FormBuilderPage.displayName = 'FormBuilderPage'
export default FormBuilderPage
