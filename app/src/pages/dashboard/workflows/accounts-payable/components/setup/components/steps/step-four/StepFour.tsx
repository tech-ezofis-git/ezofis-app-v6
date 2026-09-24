import { useLingui } from '@lingui/react/macro'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import apiRouter from '@/api/apiRouter'
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
import { createDocumentApprovalFormAndWorkflow } from '@/pages/dashboard/workflows/document-approval/createDocumentApproval'
import { resolvePredefinedFieldKey } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/headerSimilarity'
import { LINE_ITEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/lineItemSchema'
import { SYSTEM_TEMPLATE_COLUMNS } from '@/pages/requests/components/request/components/newrequest/poFlow/utils/templateSchema'
import requestStore from '@/pages/requests/stores/useRequestStore'
import authUserStore from '@/stores/authUserStore'
import { StepFooter, StepLayout } from '../components/StepLayout'
import SuccessCelebration from './components/SuccessCelebration'
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
    <span className='truncate text-[9px] font-bold tracking-wider text-gray-10 uppercase'>
      {label}
    </span>
    <div className='mt-1 flex items-center gap-3.5'>
      <div
        className={`flex size-10 items-center justify-center rounded-lg shadow-sm ${iconBg}`}
      >
        <Icon className={`size-5 ${iconColor}`} name={icon} />
      </div>
      <div className='min-w-0 flex-1'>
        <h4 className='truncate text-13/4.5 font-semibold text-gray-13'>
          {title}
        </h4>
        <p className='mt-0.5 truncate text-11/4 text-gray-10'>{subtitle}</p>
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

const getMailInitiateConnectorType = (provider: string) => {
  if (provider === 'gmail') return 'GMAIL'
  if (provider === 'outlook') return 'OUTLOOK'
  return ''
}

const applyMailInitiateConnector = (
  workflowPayload: any,
  emailSettings: {
    connectorId?: string
    provider?: string
  },
) => {
  const connectorType = getMailInitiateConnectorType(
    emailSettings.provider || '',
  )
  const connectorId =
    connectorType && emailSettings.connectorId ? emailSettings.connectorId : ''

  const blocks = Array.isArray(workflowPayload?.blocks)
    ? workflowPayload.blocks
    : []

  for (const block of blocks) {
    if (block?.type !== 'START') continue
    if (!block.settings) block.settings = {}

    block.settings.mailInitiate = {
      connectorId: '',
      connectorType: '',
      ...block.settings.mailInitiate,
      ...(connectorType ? { connectorId, connectorType } : {}),
    }
  }

  return workflowPayload
}

const applyApAgentSettings = (
  workflowPayload: any,
  erpSettings: {
    connectorId?: string
    system?: string
    wantsFileBasedImport?: boolean
  },
  masterFormId: string | number,
) => {
  const isQuickBooks = erpSettings.system === 'QuickBooks'
  const isFormResource =
    erpSettings.system === 'PREDEFINED' ||
    erpSettings.system === 'FILE_BASED_IMPORT' ||
    !!erpSettings.wantsFileBasedImport

  const blocks = Array.isArray(workflowPayload?.blocks)
    ? workflowPayload.blocks
    : []

  for (const block of blocks) {
    if (block?.type !== 'AP_AGENT' || !block.settings?.apAgent) continue

    if (isQuickBooks) {
      block.settings.apAgent = {
        ...block.settings.apAgent,
        connectorId: erpSettings.connectorId || '',
        formId: '',
        resource: 'QUICKBOOKS',
      }
      continue
    }

    if (isFormResource) {
      block.settings.apAgent = {
        ...block.settings.apAgent,
        connectorId: '',
        formId: masterFormId,
        resource: 'FORM',
      }
    }
  }

  return workflowPayload
}

const getStorageProviderCode = (system?: string) => {
  switch (system) {
    case 'Google Drive':
      return 'GOOGLE_DRIVE'
    case 'GCP':
      return 'GCP'
    case 'OneDrive':
    case 'One Drive':
      return 'ONE_DRIVE'
    case 'Included storage':
    case 'Default Storage':
    case 'Available Storage':
    default:
      return 'EZOFIS'
  }
}

const applyFolderStorageSettings = (
  folderPayload: any,
  storageSettings: {
    connectorId?: string
    system?: string
  },
) => {
  const storageProviderCode = getStorageProviderCode(storageSettings.system)
  const isEzofis = storageProviderCode === 'EZOFIS'

  return {
    ...folderPayload,
    storageDrive: isEzofis ? null : storageSettings.connectorId || null,
    storageProviderCode,
  }
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
  lineItemMapping?: Record<string, string>,
): Promise<File> => {
  const fileName = file.name
  const fileExtension = fileName.split('.').pop()?.toLowerCase()

  return new Promise<File>((resolve, reject) => {
    // Helper to invert mapping: sourceField -> masterField
    const getInvertedMapping = (m: Record<string, string>) => {
      const inverted: Record<string, string> = {}
      Object.entries(m).forEach(([masterKey, sourceVal]) => {
        if (sourceVal && sourceVal !== 'Skip to Import') {
          inverted[sourceVal.trim()] = masterKey
        }
      })
      return inverted
    }

    const invertedHeaderMapping = getInvertedMapping(mapping)
    const invertedLineItemMapping = lineItemMapping
      ? getInvertedMapping(lineItemMapping)
      : {}

    const translateHeader = (header: string, isLineItem: boolean) => {
      if (!header) return ''
      const trimmed = header.trim()
      if (isLineItem) {
        return invertedLineItemMapping[trimmed] || trimmed
      }
      return invertedHeaderMapping[trimmed] || trimmed
    }

    if (fileExtension === 'csv') {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string
          const lines = csvData.split('\n')
          if (lines.length > 0) {
            const headers = lines[0].split(',')
            const updatedHeaders = headers.map((h) => translateHeader(h, false))
            lines[0] = updatedHeaders.join(',')
          }
          const updatedCsv = new Blob([lines.join('\n')], {
            type: 'text/csv',
          })
          const updatedFile = new File([updatedCsv], fileName, {
            type: 'text/csv',
          })
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

          // Translate Sheet 1 (Header Fields)
          if (wb.SheetNames.length > 0) {
            const sheetName1 = wb.SheetNames[0]
            const sheet1 = wb.Sheets[sheetName1]
            const rows1: any = XLSX.utils.sheet_to_json(sheet1, { header: 1 })
            if (rows1.length > 0) {
              const updatedHeaders1 = rows1[0].map((h: string) =>
                translateHeader(h, false),
              )
              rows1[0] = updatedHeaders1
              wb.Sheets[sheetName1] = XLSX.utils.aoa_to_sheet(rows1)
            }
          }

          // Translate Sheet 2 (Line Items)
          if (wb.SheetNames.length > 1 && lineItemMapping) {
            const sheetName2 = wb.SheetNames[1]
            const sheet2 = wb.Sheets[sheetName2]
            const rows2: any = XLSX.utils.sheet_to_json(sheet2, { header: 1 })
            if (rows2.length > 0) {
              const updatedHeaders2 = rows2[0].map((h: string) =>
                translateHeader(h, true),
              )
              rows2[0] = updatedHeaders2
              wb.Sheets[sheetName2] = XLSX.utils.aoa_to_sheet(rows2)
            }
          }

          const updatedBlob = XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array',
          })
          const updatedFile = new File([updatedBlob], fileName, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
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

const addCustomFieldsToPayloads = (
  folderPayload: any,
  masterFormPayload: any,
  formPayload: any,
  mapping: Record<string, string>,
  lineItemMapping: Record<string, string>,
  fieldDataTypes: Record<string, string>,
  lineItemFieldDataTypes: Record<string, string>,
) => {
  // Deep clone to avoid mutating the source JSON
  const clonedFolder = JSON.parse(JSON.stringify(folderPayload))
  const clonedMaster = JSON.parse(JSON.stringify(masterFormPayload))
  const clonedForm = JSON.parse(JSON.stringify(formPayload))

  const generateUid = () => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
    let result = ''
    for (let i = 0; i < 21; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const isExistingPredefinedField = (
    key: string,
    knownLabels: string[],
    templateColumns: readonly { key: string }[],
  ) => {
    const normalizedKey = key.trim().toLowerCase()
    if (
      knownLabels.some((label) => label.trim().toLowerCase() === normalizedKey)
    ) {
      return true
    }
    return resolvePredefinedFieldKey(key, templateColumns) !== null
  }

  // --- 0. FOLDER CUSTOM FIELDS ---
  const folderFields = clonedFolder.fields || []
  const predefinedFolderNames = folderFields.map((f: any) => f.name)

  const customHeaderFieldsForFolder = Object.keys(mapping).filter(
    (key) =>
      !isExistingPredefinedField(
        key,
        predefinedFolderNames,
        SYSTEM_TEMPLATE_COLUMNS,
      ),
  )

  if (customHeaderFieldsForFolder.length > 0) {
    let maxOrderId = folderFields.reduce(
      (max: number, f: any) => Math.max(max, f.orderId || 0),
      0,
    )
    customHeaderFieldsForFolder.forEach((customLabel) => {
      maxOrderId += 1
      const customFieldType = fieldDataTypes[customLabel] || 'SHORT_TEXT'
      folderFields.push({
        dataType: customFieldType,
        includeInFolderStructure: false,
        isMandatory: false,
        level: 0,
        name: customLabel,
        orderId: maxOrderId,
      })
    })
  }

  // --- 1. HEADER CUSTOM FIELDS ---
  const masterPanel = clonedMaster.panels?.[0]
  const masterFields = masterPanel?.fields || []
  const predefinedMasterLabels = masterFields.map((f: any) => f.label)

  const customHeaderFields = Object.keys(mapping).filter(
    (key) =>
      !isExistingPredefinedField(
        key,
        predefinedMasterLabels,
        SYSTEM_TEMPLATE_COLUMNS,
      ),
  )

  if (customHeaderFields.length > 0) {
    const templateField = masterFields[0]
    const tableFieldIndex = masterFields.findIndex(
      (f: any) => f.type === 'TABLE' || f.type === 'DYNAMIC_TABLE',
    )
    const insertIndex =
      tableFieldIndex !== -1 ? tableFieldIndex : masterFields.length

    customHeaderFields.forEach((customLabel) => {
      const customFieldType = fieldDataTypes[customLabel] || 'SHORT_TEXT'
      const newField = JSON.parse(JSON.stringify(templateField))
      newField.id = generateUid()
      newField.label = customLabel
      newField.type = customFieldType
      if (newField.settings?.general) {
        newField.settings.general.size = 'col-4'
      }
      masterFields.splice(insertIndex, 0, newField)
    })

    const formPanel1 = clonedForm.panels?.[1]
    if (formPanel1) {
      const formFields = formPanel1.fields || []
      const formTableIndex = formFields.findIndex(
        (f: any) => f.type === 'TABLE' || f.type === 'DYNAMIC_TABLE',
      )
      const formInsertIndex =
        formTableIndex !== -1 ? formTableIndex : formFields.length

      customHeaderFields.forEach((customLabel) => {
        const customFieldType = fieldDataTypes[customLabel] || 'SHORT_TEXT'
        const newField = JSON.parse(JSON.stringify(templateField))
        newField.id = generateUid()
        newField.label = customLabel
        newField.type = customFieldType
        if (newField.settings?.general) {
          newField.settings.general.size = 'col-4'
        }
        formFields.splice(formInsertIndex, 0, newField)
      })
    }
  }

  // --- 2. LINE ITEM CUSTOM FIELDS ---
  const masterTableField = masterFields.find(
    (f: any) => f.type === 'TABLE' || f.type === 'DYNAMIC_TABLE',
  )
  if (masterTableField) {
    const tableColumns = masterTableField.settings?.specific?.tableColumns || []
    const predefinedColLabels = tableColumns.map((c: any) => c.label)

    const customLineItemFields = Object.keys(lineItemMapping).filter(
      (key) =>
        !isExistingPredefinedField(
          key,
          predefinedColLabels,
          LINE_ITEM_TEMPLATE_COLUMNS,
        ),
    )

    if (customLineItemFields.length > 0 && tableColumns.length > 0) {
      const templateCol = tableColumns[0]
      customLineItemFields.forEach((customLabel) => {
        const colType = lineItemFieldDataTypes[customLabel] || 'SHORT_TEXT'
        const newCol = JSON.parse(JSON.stringify(templateCol))
        newCol.id = generateUid()
        newCol.label = customLabel
        newCol.type = colType
        tableColumns.push(newCol)
      })
    }
  }

  const formPanel1 = clonedForm.panels?.[1]
  if (formPanel1) {
    const formTableField = (formPanel1.fields || []).find(
      (f: any) => f.type === 'TABLE' || f.type === 'DYNAMIC_TABLE',
    )
    if (formTableField) {
      const tableColumns = formTableField.settings?.specific?.tableColumns || []
      const predefinedColLabels = tableColumns.map((c: any) => c.label)

      const customLineItemFields = Object.keys(lineItemMapping).filter(
        (key) =>
          !isExistingPredefinedField(
            key,
            predefinedColLabels,
            LINE_ITEM_TEMPLATE_COLUMNS,
          ),
      )

      if (customLineItemFields.length > 0 && tableColumns.length > 0) {
        const templateCol = tableColumns[0]
        customLineItemFields.forEach((customLabel) => {
          const colType = lineItemFieldDataTypes[customLabel] || 'SHORT_TEXT'
          const newCol = JSON.parse(JSON.stringify(templateCol))
          newCol.id = generateUid()
          newCol.label = customLabel
          newCol.type = colType
          tableColumns.push(newCol)
        })
      }
    }
  }

  return {
    folderPayload: clonedFolder,
    formPayload: clonedForm,
    masterFormPayload: clonedMaster,
  }
}

const StepFour = () => {
  const { t } = useLingui()
  const emailSettings = setupStore((state) => state.emailSettings)
  const erpSettings = setupStore((state) => state.erpSettings)
  const storageSettings = setupStore((state) => state.storageSettings)
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
  const [showCelebration, setShowCelebration] = useState(false)

  const handleClose = async () => {
    setIsSaving(true)

    try {
      // 1.5 Inject any new custom fields mapped by the user
      const {
        folderPayload: folderPayloadWithCustomFields,
        formPayload,
        masterFormPayload,
      } = addCustomFieldsToPayloads(
        apSetupPayloads.folderPayload,
        apSetupPayloads.masterFormPayload,
        apSetupPayloads.formPayload,
        erpSettings.mapping || {},
        erpSettings.lineItemMapping || {},
        erpSettings.fieldDataTypes || {},
        erpSettings.lineItemFieldDataTypes || {},
      )

      const processedFolderPayload = applyFolderStorageSettings(
        folderPayloadWithCustomFields,
        storageSettings,
      )

      // 1. Create Folder
      const folderRes = await createRepository(processedFolderPayload)
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
      const processedFormPayload = replacePlaceholders(formPayload, {
        folderId,
      })
      const formRes = await formApi.createForm(
        JSON.stringify(processedFormPayload),
      )
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
            erpSettings.lineItemMapping,
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

      const workflowPayload = applyApAgentSettings(
        applyMailInitiateConnector(
          replacePlaceholders(apSetupPayloads.workflowPayload, {
            folderId,
            formId,
            masterFormId,
            userId,
          }),
          emailSettings,
        ),
        erpSettings,
        masterFormId,
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

      const documentApprovalRes = await createDocumentApprovalFormAndWorkflow()
      if (documentApprovalRes.error) {
        showToast({
          message: documentApprovalRes.error,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // 5. Call user session configuration completed endpoint
      const configRes = await apiRouter.saveUserConfiguration(userId, {
        message: 'configuration:completed',
      })
      if (configRes.error) {
        showToast({
          message: `Failed to save configuration status: ${configRes.error}`,
          variant: 'error',
        })
        setIsSaving(false)
        return
      }

      // Proceed with setup completion after all V6 APIs run successfully
      setPendingOpenNewRequest(true)

      // Show celebratory success screen with flowers and sparkles
      setShowCelebration(true)
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

  if (showCelebration) {
    return <SuccessCelebration />
  }

  return (
    <StepLayout
      description='Double-check your settings and activate your AI invoice automation. Your workflow is ready to begin processing.'
      title={t`Review & Complete Setup`}
      footer={
        <StepFooter>
          <Button
            color='gray'
            disabled={isSaving}
            icon='lucide:arrow-left'
            label={t`Back`}
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
          <div className='mx-auto grid w-full max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-3'>
            <ProtocolCard
              icon='tabler:database'
              iconBg='bg-blue-1 dark:bg-blue-9/20'
              iconColor='text-blue-9 dark:text-blue-4'
              label={t`Data Destination`}
              subtitle='Connected & Verified'
              title={getErpName()}
            />
            <ProtocolCard
              icon='tabler:brain'
              iconBg='bg-purple-1 dark:bg-purple-9/20'
              iconColor='text-purple-9 dark:text-purple-4'
              label={t`Intelligence Profile`}
              subtitle='99.8% Extraction Goal'
              title={t`High Precision`}
            />
            <ProtocolCard
              icon='tabler:shield-check'
              iconBg='bg-green-1 dark:bg-green-9/20'
              iconColor='text-green-9 dark:text-green-4'
              label={t`Security Protocol`}
              subtitle='AES-256 Encrypted'
              title={t`SOC2 Compliant`}
            />
          </div>
        </AnimateFadeIn>
      </div>
    </StepLayout>
  )
}

StepFour.displayName = 'StepFour'
export default StepFour
