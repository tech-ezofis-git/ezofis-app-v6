import { useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import formApi from '@/api/form/form'
import Build from './components/build/Build'
import LivePreview from './components/build/components/preview/LivePreview'
import FormBuilderSkeleton from './components/common/FormBuilderSkeleton'
import Header from './components/common/Header'
import { useFormStore } from './store/formStore'

const FormBuilderPage = () => {
  const { formId } = useParams({ strict: false }) as any
  const { loadForm, resetForm } = useFormStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchForm = async () => {
      if (formId) {
        setIsLoading(true)
        try {
          const { data, error } = await formApi.getFormDataById(formId)
          if (data && !error) {
            loadForm(data)
          }
        } catch (err) {
          console.error('Failed to fetch form:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchForm()
  }, [formId, loadForm])

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
