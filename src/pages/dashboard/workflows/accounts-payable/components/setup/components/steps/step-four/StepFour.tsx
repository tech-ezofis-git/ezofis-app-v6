import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { createRepository } from '@/api/createFolder'
import formApi from '@/api/form/form'
import workflowApi from '@/api/workflow/workflow'
import Button from '@/components/base/button/Button'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import apSetupPayloads from '@/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json'
import poMasterUrl from '@/assets/PO Master.xlsx?url'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import WorkflowPreview from './components/WorkflowPreview'

const replacePlaceholders = (
  obj: any,
  placeholders: Record<string, any>,
): any => {
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
    return obj.map((item) => replacePlaceholders(item, placeholders))
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
      // 1. Create Folder
      const folderPayload = {
        ...apSetupPayloads.folderPayload,
      }
      const folderRes = await createRepository(folderPayload)
      if (folderRes.error) {
        showToast({
          message: `Failed to create Folder: ${folderRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      const folderId =
        folderRes.data?.repositoryId ??
        folderRes.data?.id ??
        folderRes.data?.folderId ??
        folderRes.data
      if (!folderId) {
        showToast({
          message: 'Folder created but did not return a valid folder ID.',
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 2. Prepare Form payload with dynamic folderId placeholder replacement
      const formPayload = replacePlaceholders(apSetupPayloads.formPayload, {
        folderId,
      })
      const formRes = await formApi.createForm(JSON.stringify(formPayload))
      if (formRes.error) {
        showToast({
          message: `Failed to create Form: ${formRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      const formId = formRes.data?.id ?? formRes.data?.formId ?? formRes.data
      if (!formId) {
        showToast({
          message: 'Form created but did not return a valid form ID.',
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 3. Create Master Form
      const masterFormPayload = apSetupPayloads.masterFormPayload
      const masterFormRes = await formApi.createForm(JSON.stringify(masterFormPayload))
      if (masterFormRes.error) {
        showToast({
          message: `Failed to create Master Form: ${masterFormRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      const masterFormId = masterFormRes.data?.id ?? masterFormRes.data?.formId ?? masterFormRes.data
      if (!masterFormId) {
        showToast({
          message: 'Master Form created but did not return a valid form ID.',
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 3.5. Upload Master File (PO Master.xlsx)
      try {
        const fileResponse = await fetch(poMasterUrl)
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch PO Master asset: ${fileResponse.statusText}`)
        }
        const fileBlob = await fileResponse.blob()
        if (!fileBlob) {
          throw new Error('Failed to parse PO Master blob')
        }
        const file = new File([fileBlob], 'PO Master.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const uploadPayload = {
          file,
          formId: masterFormId,
          workflowId: '',
          instanceId: '',
        }

        const uploadRes = await formApi.uploadMasterFile(uploadPayload)
        if (uploadRes.error) {
          showToast({
            message: `Failed to upload PO Master file: ${uploadRes.error}`,
            variant: 'error',
          })
          setIsSaving(false)
          return
        }
      } catch (uploadError: any) {
        console.error('Error uploading master file:', uploadError)
        showToast({
          message: `Error uploading PO Master file: ${uploadError.message || uploadError}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 4. Prepare Workflow payload with dynamic folderId, formId, masterFormId, and userId placeholders replacement
      const session = authUserStore.getState().session
      const userId = session?.id || ''

      const workflowPayload = replacePlaceholders(
        apSetupPayloads.workflowPayload,
        {
          folderId,
          formId,
          masterFormId,
          userId,
        },
      )
      const workflowRes = await workflowApi.createWorkflow(workflowPayload)
      if (workflowRes.error) {
        showToast({
          message: `Failed to create Workflow: ${workflowRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // Proceed with setup completion after all V6 APIs run successfully
      setPendingOpenNewRequest(true)
      apComplete(true)

      // Allow 1.5 seconds for the progress bar to animate to 100%
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setIsActivatingAutomation(true)
      clearNavigationLock(false)
      navigate({ replace: true, to: '/requests' })
      closeSetup()
    } catch (e: any) {
      console.error(e)
      showToast({
        message: `An unexpected error occurred during activation: ${e.message || e}`,
        variant: 'error',
      })
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
            suffixIcon='tabler:arrow-right'
            label={
              isApSetUpCompleted ? 'Save Configuration' : 'Activate Automation'
            }
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
