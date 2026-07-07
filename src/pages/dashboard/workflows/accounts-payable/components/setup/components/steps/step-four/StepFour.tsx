import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createRepository } from '@/api/createFolder'
import formApi from '@/api/form/form'
import workflowApi from '@/api/workflow/workflow'
import poMasterUrl from '@/assets/PO Master.xlsx?url'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import showToast from '@/components/base/toast/showToast'
import { AnimateFadeIn } from '@/components/common/animations'
import apSetupPayloads from '@/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json'
import setupStore from '@/pages/dashboard/workflows/accounts-payable/stores/useSetupStore'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import WorkflowPreview from './components/WorkflowPreview'

const ProtocolCard = ({
  icon,
  iconBg,
  iconColor,
  label,
  subtitle,
  title,
}: {
  icon: string
  iconBg: string
  iconColor: string
  label: string
  subtitle: string
  title: string
}) => (
  <div className='flex flex-col gap-2 rounded-xl border border-gray-3 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md'>
    <span className='text-[10px] font-bold tracking-wider text-gray-10 uppercase'>
      {label}
    </span>
    <div className='mt-1 flex items-center gap-3.5'>
      <div
        className={`flex size-10 items-center justify-center rounded-lg shadow-sm ${iconBg}`}
      >
        <Icon className={`size-5 ${iconColor}`} name={icon} />
      </div>
      <div className='min-w-0 flex-1'>
        <h4 className='truncate text-14/5 font-semibold text-gray-13'>
          {title}
        </h4>
        <p className='mt-0.5 truncate text-12/4.5 text-gray-10'>{subtitle}</p>
      </div>
    </div>
  </div>
)

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

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const updateFileHeaders = async (
  file: File,
  mapping: Record<string, string>,
): Promise<File> => {
  const fileName = file.name
  const fileExtension = fileName.split('.').pop()?.toLowerCase()

  return new Promise<File>((resolve, reject) => {
    // Invert mapping: sourceField -> masterField
    const invertedMapping: Record<string, string> = {}
    Object.entries(mapping).forEach(([masterKey, sourceVal]) => {
      if (sourceVal && sourceVal !== 'Skip to Import') {
        invertedMapping[sourceVal.trim()] = masterKey
      }
    })

    const translateHeader = (header: string) => {
      const trimmed = header.trim()
      return invertedMapping[trimmed] || trimmed
    }

    if (fileExtension === 'csv') {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string
          const lines = csvData.split('\n')
          if (lines.length > 0) {
            const headers = lines[0].split(',')
            const updatedHeaders = headers.map(translateHeader)
            lines[0] = updatedHeaders.join(',')
          }
          const updatedCsv = new Blob([lines.join('\n')], {
            type: 'text/csv',
          })
          const updatedFile = new File([updatedCsv], fileName, {
            type: 'text/csv',
          })
          downloadFile(updatedFile)
          resolve(updatedFile)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const data = event.target.result as ArrayBuffer
          const wb = XLSX.read(data, { type: 'array' })
          const sheetName = wb.SheetNames[0]
          const sheet = wb.Sheets[sheetName]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows: any = XLSX.utils.sheet_to_json(sheet, { header: 1 })

          if (rows.length > 0) {
            const updatedHeaders = rows[0].map((h: string) =>
              translateHeader(h),
            )
            rows[0] = updatedHeaders
          }

          const updatedSheet = XLSX.utils.aoa_to_sheet(rows)
          // Update the first sheet in place to preserve other sheets in the workbook
          wb.Sheets[sheetName] = updatedSheet

          const updatedBlob = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
          })
          const updatedFile = new File([updatedBlob], fileName, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
          downloadFile(updatedFile)
          resolve(updatedFile)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsArrayBuffer(file)
    } else {
      reject(new Error('Unsupported file extension'))
    }
  })
}

const StepFour = () => {
  const erpSettings = setupStore((state) => state.erpSettings)
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
      const masterFormRes = await formApi.createForm(
        JSON.stringify(masterFormPayload),
      )
      if (masterFormRes.error) {
        showToast({
          message: `Failed to create Master Form: ${masterFormRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      const masterFormId =
        masterFormRes.data?.id ??
        masterFormRes.data?.formId ??
        masterFormRes.data
      if (!masterFormId) {
        showToast({
          message: 'Master Form created but did not return a valid form ID.',
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 3.5. Upload Master File (PO Master.xlsx or custom file)
      try {
        let file: File

        if (
          erpSettings.system === 'FILE_BASED_IMPORT' &&
          erpSettings.uploadedTemplate &&
          erpSettings.mapping
        ) {
          file = await updateFileHeaders(
            erpSettings.uploadedTemplate,
            erpSettings.mapping,
          )
        } else {
          const fileResponse = await fetch(poMasterUrl)
          if (!fileResponse.ok) {
            throw new Error(
              `Failed to fetch PO Master asset: ${fileResponse.statusText}`,
            )
          }
          const fileBlob = await fileResponse.blob()
          if (!fileBlob) {
            throw new Error('Failed to parse PO Master blob')
          }
          file = new File([fileBlob], 'PO Master.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        }

        const uploadPayload = {
          file,
          formId: masterFormId,
          instanceId: '',
          workflowId: '',
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

  const getErpName = () => {
    if (erpSettings.system === 'PREDEFINED') {
      return 'Demo Data'
    }
    if (erpSettings.system === 'FILE_BASED_IMPORT') {
      return 'PO Master File'
    }
    return erpSettings.system ? `${erpSettings.system} ERP` : 'NetSuite ERP'
  }

  return (
    <StepLayout
      description='Double-check your settings and activate your AI invoice automation. Your workflow is ready to begin processing.'
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
            suffixIcon='tabler:bolt'
            label={
              isApSetUpCompleted ? 'Save Configuration' : 'Activate Automation'
            }
            onClick={handleClose}
          />
        </StepFooter>
      }
    >
      <div className='space-y-6'>
        <AnimateFadeIn delay={0.3}>
          <WorkflowPreview />
        </AnimateFadeIn>

        <AnimateFadeIn delay={0.4}>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <ProtocolCard
              icon='tabler:database'
              iconBg='bg-blue-1 dark:bg-blue-9/20'
              iconColor='text-blue-9 dark:text-blue-4'
              label='Data Destination'
              subtitle='Connected & Verified'
              title={getErpName()}
            />
            <ProtocolCard
              icon='tabler:brain'
              iconBg='bg-purple-1 dark:bg-purple-9/20'
              iconColor='text-purple-9 dark:text-purple-4'
              label='Intelligence Profile'
              subtitle='99.8% Extraction Goal'
              title='High Precision'
            />
            <ProtocolCard
              icon='tabler:shield-check'
              iconBg='bg-green-1 dark:bg-green-9/20'
              iconColor='text-green-9 dark:text-green-4'
              label='Security Protocol'
              subtitle='AES-256 Encrypted'
              title='SOC2 Compliant'
            />
          </div>
        </AnimateFadeIn>
      </div>
    </StepLayout>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
