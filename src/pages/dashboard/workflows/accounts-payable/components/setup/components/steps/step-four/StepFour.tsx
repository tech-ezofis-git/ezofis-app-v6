import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Button from '@/components/base/button/Button'
import { AnimateFadeIn } from '@/components/common/animations'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import WorkflowPreview from './components/WorkflowPreview'
// import { createFolder } from '@/api/createFolder'
// import formApi from '@/api/form/form'
// import workflowApi from '@/api/workflow/workflow'
// import apSetupPayloads from '@/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json'

/*
const replacePlaceholders = (obj: any, placeholders: Record<string, any>): any => {
  if (typeof obj === 'string') {
    let result = obj
    for (const [key, val] of Object.entries(placeholders)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val))
    }
    if (/^\d+$/.test(result)) {
      return Number(result)
    }
    return result
  }
  if (Array.isArray(obj)) {
    return obj.map(item => replacePlaceholders(item, placeholders))
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
      newObj[key] = replacePlaceholders(obj[key], placeholders)
    }
    return newObj
  }
  return obj
}
*/

const StepFour = () => {
  const setStep = setupStore((state) => state.setStep)
  const closeSetup = setupStore((state) => state.closeSetup)
  const isApSetUpCompleted = setupStore((state) => state.isApSetUpCompleted)
  const apComplete = setupStore((state) => state.setisApSetUpCompleted)
  const clearNavigationLock = setupStore(
    (state) => state.setRestrictNavigationUntilApSetup,
  )
  const setIsActivatingAutomation = setupStore(
    (state) => state.setIsActivatingAutomation,
  )
  const navigate = useNavigate()
  const setPendingOpenNewRequest = requestStore(
    (state) => state.setPendingOpenNewRequest,
  )

  const [isSaving, setIsSaving] = useState(false)

  const handleClose = async () => {
    setIsSaving(true)

    try {
      /*
      // 1. Create Folder
      const folderRes = await createFolder(apSetupPayloads.folderPayload)
      if (folderRes.error) {
        alert(`Failed to create Folder: ${folderRes.error}`)
        setIsSaving(false)
        return
      }

      const folderId = folderRes.data?.id ?? folderRes.data?.folderId ?? folderRes.data
      if (!folderId) {
        alert('Folder created but did not return a valid folder ID.')
        setIsSaving(false)
        return
      }

      // 2. Prepare Form payload with dynamic folderId placeholder replacement
      const formPayload = replacePlaceholders(apSetupPayloads.formPayload, { folderId })
      const formRes = await formApi.createForm(formPayload)
      if (formRes.error) {
        alert(`Failed to create Form: ${formRes.error}`)
        setIsSaving(false)
        return
      }

      const formId = formRes.data?.id ?? formRes.data?.formId ?? formRes.data
      if (!formId) {
        alert('Form created but did not return a valid form ID.')
        setIsSaving(false)
        return
      }

      // 3. Prepare Workflow payload with dynamic folderId and formId placeholders replacement
      const workflowPayload = replacePlaceholders(apSetupPayloads.workflowPayload, {
        folderId,
        formId,
      })
      const workflowRes = await workflowApi.createWorkflow(workflowPayload)
      if (workflowRes.error) {
        alert(`Failed to create Workflow: ${workflowRes.error}`)
        setIsSaving(false)
        return
      }
      */

      // Proceed with setup completion after all V6 APIs run successfully
      setPendingOpenNewRequest(true)
      setIsActivatingAutomation(true)
      apComplete(true)
      clearNavigationLock(false)
      navigate({ replace: true, to: '/requests' })
      closeSetup()
    } catch (e: any) {
      console.error(e)
      alert(`An unexpected error occurred during activation: ${e.message || e}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <StepLayout
      description='Check your connections and confirm setup to activate AI-powered invoice automation.'
      title='Review & Complete Setup'
      footer={
        <StepFooter>
          <Button
            color='gray'
            disabled={isSaving}
            icon='lucide:arrow-left'
            label='Back'
            variant='outline'
            onClick={() => setStep(2)}
          />
          <Button
            disabled={isSaving}
            loading={isSaving}
            label={
              isApSetUpCompleted ? 'Save Configuration' : 'Activate Automation'
            }
            suffixIcon='tabler:arrow-right'
            onClick={handleClose}
          />
        </StepFooter>
      }
    >
      <AnimateFadeIn delay={0.3}>
        <WorkflowPreview />
      </AnimateFadeIn>
    </StepLayout>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
