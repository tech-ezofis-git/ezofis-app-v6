import type { Node } from '@xyflow/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { nanoid } from 'nanoid'
import { useEffect, useMemo, useState } from 'react'
import { getConnectionQueryOptions } from '@/api/connectorQueries'
import { getMasterFormsQueryOptions } from '@/api/form/queries'
import { requestApi } from '@/api/requests/requests'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import showToast from '@/components/base/toast/showToast'
import {
  openWorkflowOAuthAuthorize,
  parseOAuthConnectionSuccess,
} from '@/pages/workflows/utils/oauthAuthorize'
import cn from '@/utils/cn'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const toWeightRows = (raw: any[] | undefined) =>
  Array.isArray(raw)
    ? raw.map((w) => ({
        fieldId: w.fieldId ?? w.id ?? null,
        label: w.label ?? w.name ?? '',
        rowId: w.rowId || w.id || nanoid(),
        value: Number(w.value) || 0,
      }))
    : []

const extractFormFieldOptions = (formJson: any) => {
  const allOptions: { id: string; name: string }[] = []
  const panels = [
    ...(formJson?.panels || []),
    ...(formJson?.secondaryPanels || []),
  ]

  panels.forEach((panel: any) => {
    if (!panel.fields?.length) return
    panel.fields.forEach((field: any) => {
      if (field.type === 'DIVIDER') return
      const fieldIdentifier = String(field.name || field.id)
      if (field.type === 'TABLE') {
        allOptions.push({
          id: fieldIdentifier,
          name: field.label || field.type,
        })
        field.settings?.specific?.tableColumns?.forEach((column: any) => {
          allOptions.push({
            id: String(column.name || column.id),
            name: column.label || column.type,
          })
        })
      } else {
        allOptions.push({
          id: fieldIdentifier,
          name: field.label || field.type,
        })
      }
    })
  })

  return allOptions
}

const invoiceTypeOptions = [
  {
    description: 'Automated matching',
    icon: 'lucide:receipt-text',
    id: 1,
    name: 'PO Invoices',
  },
  {
    description: 'Direct GL coding',
    icon: 'lucide:file-text',
    id: 2,
    name: 'Non-PO',
  },
]

const poMatchingOptions = [
  {
    description: 'PO + Invoice',
    icons: ['lucide:file-text', 'lucide:shopping-cart'],
    id: 1,
    name: '2-Way Match',
  },
  {
    description: 'PO + Invoice + Receipt',
    icons: ['lucide:file-text', 'lucide:shopping-cart', 'lucide:truck'],
    id: 2,
    name: '3-Way Match',
  },
]

const QuickBooksIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg
    className={cn('inline-block shrink-0', className)}
    fill='none'
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <rect fill='#2CA01C' height='24' rx='12' width='24' />
    <path
      d='M11.5 6.5C8.73858 6.5 6.5 8.73858 6.5 11.5C6.5 14.2614 8.73858 16.5 11.5 16.5H12.5V14.5H11.5C9.84315 14.5 8.5 13.1569 8.5 11.5C8.5 9.84315 9.84315 8.5 11.5 8.5H12.5V6.5H11.5ZM12.5 17.5C15.2614 17.5 17.5 15.2614 17.5 12.5C17.5 9.73858 15.2614 7.5 12.5 7.5H11.5V9.5H12.5C14.1569 9.5 15.5 10.8431 15.5 12.5C15.5 14.1569 14.1569 15.5 12.5 15.5H11.5V17.5H12.5Z'
      fill='white'
    />
  </svg>
)

const SapIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg
    className={cn('inline-block shrink-0', className)}
    fill='none'
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z'
      fill='#008FD3'
    />
    <path
      d='M6.5 15L8.2 9H9.8L11.5 15H10.1L9.7 13.5H8.3L7.9 15H6.5ZM8.6 12.3H9.4L9 10.7L8.6 12.3ZM12.2 15V9H14.5C15.5 9 16.2 9.6 16.2 10.5C16.2 11.2 15.7 11.7 14.9 11.9C15.8 12.1 16.4 12.7 16.4 13.6C16.4 14.5 15.6 15 14.5 15H12.2ZM13.5 11.4H14.3C14.8 11.4 15.1 11.1 15.1 10.6C15.1 10.1 14.8 9.9 14.3 9.9H13.5V11.4ZM13.5 14.1H14.4C15 14.1 15.3 13.8 15.3 13.3C15.3 12.8 15 12.5 14.4 12.5H13.5V14.1Z'
      fill='white'
    />
  </svg>
)

const poMasterSourceTypeOptions = [
  {
    iconKey: 'lucide:database',
    id: 'internal',
    name: 'Master Form',
  },
  {
    iconKey: 'brand:quickbooks',
    id: 'quickbooks',
    name: 'QuickBooks',
  },
  {
    iconKey: 'brand:sap',
    id: 'sap',
    name: 'SAP System',
  },
]

interface Props {
  node?: Node
}

export default function APAgentSettingsPanel({ node: initialNode }: Props) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as any

  // Fetch Master Forms from API
  const { data: masterForms = [] } = useQuery(getMasterFormsQueryOptions())

  // --- States initialized from nodeData ---
  const [openBasic, setOpenBasic] = useState(false)
  const [openValidation, setOpenValidation] = useState(false)
  const [openScoring, setOpenScoring] = useState(false)

  const isUuid = (str: any) =>
    typeof str === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      str.trim(),
    )

  // Resolve saved master ids/objects against loaded master form options (by name)
  const getMasterOption = (val: any) => {
    if (val === null || val === undefined || val === '' || val === 0)
      return null

    const rawId =
      typeof val === 'object' ? (val.id ?? val.formId ?? val.uid) : val
    if (rawId === null || rawId === undefined || rawId === '') return null

    const strRawId = String(rawId).trim()

    const matched = masterForms.find(
      (m: any) =>
        String(m.id ?? '').trim() === strRawId ||
        String(m.uid ?? '').trim() === strRawId ||
        String(m.formId ?? '').trim() === strRawId ||
        (m.name &&
          String(m.name).trim().toLowerCase() === strRawId.toLowerCase()),
    )
    if (matched) return matched

    // Keep a real display name if we already have one; otherwise fall back temporarily
    if (typeof val === 'object') {
      const nameStr = String(val.name || '').trim()
      const hasRealName =
        nameStr !== '' && nameStr !== strRawId && !isUuid(nameStr)
      return hasRealName ? val : { id: rawId, name: strRawId }
    }

    return { id: rawId, name: strRawId }
  }

  const [invoiceType, setInvoiceType] = useState(
    invoiceTypeOptions.find((opt) => opt.name === nodeData.invoiceType) ||
      invoiceTypeOptions[0],
  )
  const [poMatching, setPoMatching] = useState(
    poMatchingOptions.find((opt) => opt.name === nodeData.poMatching) ||
      poMatchingOptions[0],
  )

  const [poMasterSourceType, setPoMasterSourceType] = useState<
    'internal' | 'quickbooks' | 'sap'
  >(() => {
    if (nodeData.poMasterSourceType) return nodeData.poMasterSourceType
    if (nodeData.poMasterType) return nodeData.poMasterType
    if (nodeData.poMaster?.sourceType) return nodeData.poMaster.sourceType
    return 'internal'
  })

  const currentSourceOption = useMemo(
    () =>
      poMasterSourceTypeOptions.find((o) => o.id === poMasterSourceType) ||
      poMasterSourceTypeOptions[0],
    [poMasterSourceType],
  )

  // QuickBooks Queries & States
  const { data: apiQbConnections = [] } = useQuery(
    getConnectionQueryOptions('QUICKBOOKS'),
  )
  const qbAccountOptions = useMemo(() => {
    if (!Array.isArray(apiQbConnections)) return []
    return apiQbConnections.map((item: any) => ({
      id: String(item.id),
      name:
        item.name ||
        item.externalAccountEmail ||
        item.email ||
        `QuickBooks (${item.id})`,
    }))
  }, [apiQbConnections])

  const [qbAccount, setQbAccount] = useState<any>(
    nodeData.poMasterQbAccount || null,
  )
  const [isQbConnectionOpen, setIsQbConnectionOpen] = useState(false)
  const [isCreatingQbConnection, setIsCreatingQbConnection] = useState(false)
  const [isConnectingQb, setIsConnectingQb] = useState(false)
  const [newQbAccountName, setNewQbAccountName] = useState('')

  // SAP Queries & States
  const { data: apiSapConnections = [] } = useQuery(
    getConnectionQueryOptions('SAP'),
  )
  const sapAccountOptions = useMemo(() => {
    if (!Array.isArray(apiSapConnections)) return []
    return apiSapConnections.map((item: any) => ({
      id: String(item.id),
      name:
        item.name ||
        item.externalAccountEmail ||
        item.email ||
        `SAP (${item.id})`,
    }))
  }, [apiSapConnections])

  const [sapAccount, setSapAccount] = useState<any>(
    nodeData.poMasterSapAccount || null,
  )
  const [isSapConnectionOpen, setIsSapConnectionOpen] = useState(false)
  const [isCreatingSapConnection, setIsCreatingSapConnection] = useState(false)
  const [isConnectingSap, setIsConnectingSap] = useState(false)
  const [newSapHost, setNewSapHost] = useState('')

  const queryClient = useQueryClient()

  // Handle OAuth postMessage callback from auth redirect
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (
        data.type === 'CONNECTOR_OAUTH_SUCCESS' ||
        data.type === 'CONNECTION_SUCCESS' ||
        data.connectorOAuth === 'success' ||
        data.connectorId ||
        data.connector
      ) {
        const { connector, connectorId, label } =
          parseOAuthConnectionSuccess(data)
        const accountName =
          label ||
          connector ||
          newQbAccountName.trim() ||
          newSapHost.trim() ||
          'Connected Account'

        if (isConnectingQb) {
          const newAcc = {
            id: connectorId || 'qb_' + Date.now(),
            name: accountName,
          }
          setQbAccount(newAcc)
          updateNodeData('poMasterQbAccount', newAcc)
          updateNodeData('connectorId', newAcc.id)
          updateNodeData('formId', '')
          updateNodeData('resource', 'QUICKBOOKS')
          updateNodeData('poMaster', {
            id: newAcc.id,
            name: `QuickBooks PO Master (${newAcc.name})`,
            sourceType: 'quickbooks',
          })
          setIsConnectingQb(false)
          setIsCreatingQbConnection(false)
          setIsQbConnectionOpen(false)
          setNewQbAccountName('')
          showToast({ message: `Connected QuickBooks account: ${accountName}` })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'QUICKBOOKS'],
          })
        } else if (isConnectingSap) {
          const newAcc = {
            id: connectorId || 'sap_' + Date.now(),
            name: accountName,
          }
          setSapAccount(newAcc)
          updateNodeData('poMasterSapAccount', newAcc)
          updateNodeData('connectorId', newAcc.id)
          updateNodeData('formId', '')
          updateNodeData('resource', 'SAP')
          updateNodeData('poMaster', {
            id: newAcc.id,
            name: `SAP PO Master (${newAcc.name})`,
            sourceType: 'sap',
          })
          setIsConnectingSap(false)
          setIsCreatingSapConnection(false)
          setIsSapConnectionOpen(false)
          setNewSapHost('')
          showToast({ message: `Connected SAP account: ${accountName}` })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'SAP'],
          })
          queryClient.invalidateQueries({
            queryKey: ['connections', 'SAP_XSUAA'],
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [
    isConnectingQb,
    isConnectingSap,
    newQbAccountName,
    newSapHost,
    queryClient,
  ])

  const handleConnectQb = async () => {
    const name = newQbAccountName.trim() || 'QuickBooks Online'
    setIsConnectingQb(true)
    const { error } = await openWorkflowOAuthAuthorize('QUICKBOOKS', name)
    if (error) {
      // Fallback / local connect mode if OAuth authorize API fails
      const newAcc = {
        id: 'qb_' + Date.now(),
        name,
      }
      setQbAccount(newAcc)
      updateNodeData('poMasterQbAccount', newAcc)
      updateNodeData('connectorId', newAcc.id)
      updateNodeData('formId', '')
      updateNodeData('resource', 'QUICKBOOKS')
      updateNodeData('poMaster', {
        id: newAcc.id,
        name: `QuickBooks PO Master (${newAcc.name})`,
        sourceType: 'quickbooks',
      })
      setIsConnectingQb(false)
      setIsCreatingQbConnection(false)
      setIsQbConnectionOpen(false)
      setNewQbAccountName('')
      showToast({ message: `Connected QuickBooks account: ${name}` })
    }
  }

  const handleConnectSap = async () => {
    const name = newSapHost.trim() || 'SAP Connection'
    setIsConnectingSap(true)
    const { error } = await openWorkflowOAuthAuthorize('SAP_XSUAA', name)
    if (error) {
      // Fallback / local connect mode if OAuth authorize API fails
      const newAcc = { id: 'sap_' + Date.now(), name }
      setSapAccount(newAcc)
      updateNodeData('poMasterSapAccount', newAcc)
      updateNodeData('connectorId', newAcc.id)
      updateNodeData('formId', '')
      updateNodeData('resource', 'SAP')
      updateNodeData('poMaster', {
        id: newAcc.id,
        name: newAcc.name,
        sourceType: 'sap',
      })
      setIsConnectingSap(false)
      setIsCreatingSapConnection(false)
      setIsSapConnectionOpen(false)
      setNewSapHost('')
      showToast({ message: `Connected SAP account: ${name}` })
    }
  }

  const [poMaster, setPoMaster] = useState<any>(() => {
    const raw = nodeData.poMaster
    if (!raw) return null
    const isExternal =
      typeof raw === 'object' &&
      (raw.sourceType === 'quickbooks' ||
        raw.sourceType === 'sap' ||
        String(raw.id).startsWith('qb_') ||
        String(raw.id).startsWith('sap_') ||
        String(raw.name || '').includes('QuickBooks') ||
        String(raw.name || '').includes('SAP'))
    if (isExternal) return null
    return getMasterOption(raw)
  })
  const [invoiceMaster, setInvoiceMaster] = useState<any>(
    getMasterOption(nodeData.invoiceMaster),
  )
  const [vendorSource, setVendorSource] = useState<any>(
    getMasterOption(nodeData.vendorSource),
  )
  const [glSource, setGlSource] = useState<any>(
    getMasterOption(nodeData.glSource),
  )
  const [matterSource, setMatterSource] = useState<any>(
    getMasterOption(nodeData.matterSource),
  )

  // Validation States
  const [vendorMustExist, setVendorMustExist] = useState(
    nodeData.vendorMustExist ?? !!nodeData.vendorSource,
  )
  const [syncGL, setSyncGL] = useState(nodeData.syncGL ?? false)
  const [syncMatter, setSyncMatter] = useState(nodeData.syncMatter ?? false)
  const [duplicateDetection, setDuplicateDetection] = useState(
    nodeData.duplicateDetection ?? true,
  )
  const [backOrderDetection, setBackOrderDetection] = useState(
    nodeData.backOrderDetection ?? false,
  )

  // Scoring States — loaded from workflow JSON fieldScore via import
  const [weights, setWeights] = useState(() => toWeightRows(nodeData.weights))
  const [formFieldOptions, setFormFieldOptions] = useState<
    { id: string; name: string }[]
  >([])

  const [thresholds, setThresholds] = useState(
    nodeData.thresholds || {
      approved: 90,
      partial: 60,
    },
  )

  // --- Derived Values ---
  const isPO = invoiceType.name === 'PO Invoices'
  const isNonPO = invoiceType.name === 'Non-PO'
  const totalWeight = weights.reduce((acc: number, w: any) => acc + w.value, 0)
  const isThresholdInvalid = thresholds.partial >= thresholds.approved

  // Values for display in select (handle loading from masterForms)
  const poMasterValue = useMemo(() => {
    if (poMasterSourceType !== 'internal') {
      return null
    }

    const candidate = poMaster || nodeData.poMaster
    if (!candidate) return null

    const isExternal =
      typeof candidate === 'object' &&
      (candidate.sourceType === 'quickbooks' ||
        candidate.sourceType === 'sap' ||
        String(candidate.id).startsWith('qb_') ||
        String(candidate.id).startsWith('sap_') ||
        String(candidate.name || '').includes('QuickBooks') ||
        String(candidate.name || '').includes('SAP'))

    if (isExternal) {
      return null
    }

    return getMasterOption(candidate)
  }, [poMaster, nodeData.poMaster, poMasterSourceType, masterForms])

  const invoiceMasterValue = useMemo(
    () => getMasterOption(invoiceMaster || nodeData.invoiceMaster),
    [invoiceMaster, nodeData.invoiceMaster, masterForms],
  )
  const vendorSourceValue = useMemo(
    () => getMasterOption(vendorSource || nodeData.vendorSource),
    [vendorSource, nodeData.vendorSource, masterForms],
  )
  const glSourceValue = useMemo(
    () => getMasterOption(glSource || nodeData.glSource),
    [glSource, nodeData.glSource, masterForms],
  )
  const matterSourceValue = useMemo(
    () => getMasterOption(matterSource || nodeData.matterSource),
    [matterSource, nodeData.matterSource, masterForms],
  )

  const scoreSourceFormId =
    (isPO ? poMasterValue?.id : invoiceMasterValue?.id) ??
    poMasterValue?.id ??
    invoiceMasterValue?.id ??
    null

  // Options: form fields from selected master + entries already saved in workflow JSON
  const scoreFieldOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    formFieldOptions.forEach((opt) => byId.set(String(opt.id), opt))
    weights.forEach((w: any) => {
      if (!w.label) return
      const id = String(w.fieldId ?? w.rowId)
      if (!byId.has(id)) {
        byId.set(id, { id, name: w.label })
      }
    })
    return Array.from(byId.values())
  }, [formFieldOptions, weights])

  // --- Update Logic ---
  const updateNodeData = (key: string, value: any) => {
    if (currentNode) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === currentNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      )
    }
  }

  const handleInvoiceTypeChange = (opt: any) => {
    setInvoiceType(opt)
    updateNodeData('invoiceType', opt.name)
  }

  const handlePoMatchingChange = (opt: any) => {
    setPoMatching(opt)
    updateNodeData('poMatching', opt.name)
  }

  const handlePoMasterSourceTypeChange = (
    type: 'internal' | 'quickbooks' | 'sap',
  ) => {
    setPoMasterSourceType(type)
    updateNodeData('poMasterSourceType', type)

    if (type === 'internal') {
      const isExternal =
        poMaster &&
        (poMaster.sourceType === 'quickbooks' ||
          poMaster.sourceType === 'sap' ||
          String(poMaster.id).startsWith('qb_') ||
          String(poMaster.id).startsWith('sap_') ||
          String(poMaster.name || '').includes('QuickBooks') ||
          String(poMaster.name || '').includes('SAP'))

      const targetForm = isExternal ? null : poMaster
      setPoMaster(targetForm)
      updateNodeData('poMaster', targetForm)
      updateNodeData('resource', 'FORM')
      updateNodeData('formId', targetForm?.id ?? targetForm ?? '')
      updateNodeData('connectorId', '')
    } else if (type === 'quickbooks') {
      setPoMaster(null)
      updateNodeData('resource', 'QUICKBOOKS')
      updateNodeData('formId', '')
      if (qbAccount) {
        const qbData = {
          id: qbAccount.id,
          name: `QuickBooks PO Master (${qbAccount.name})`,
          sourceType: 'quickbooks',
        }
        updateNodeData('poMaster', qbData)
        updateNodeData('connectorId', qbAccount.id)
      } else {
        updateNodeData('poMaster', null)
        updateNodeData('connectorId', '')
      }
    } else if (type === 'sap') {
      setPoMaster(null)
      updateNodeData('resource', 'SAP')
      updateNodeData('formId', '')
      if (sapAccount) {
        const sapData = {
          id: sapAccount.id,
          name: `SAP PO Master (${sapAccount.name})`,
          sourceType: 'sap',
        }
        updateNodeData('poMaster', sapData)
        updateNodeData('connectorId', sapAccount.id)
      } else {
        updateNodeData('poMaster', null)
        updateNodeData('connectorId', '')
      }
    }
  }

  const updateWeight = (rowId: string, value: number) => {
    const newWeights = weights.map((w: any) =>
      w.rowId === rowId ? { ...w, value } : w,
    )
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const updateWeightField = (
    rowId: string,
    option: { id: string | number; name: string },
  ) => {
    const newWeights = weights.map((w: any) =>
      w.rowId === rowId
        ? {
            ...w,
            fieldId: option.id,
            label: option.name,
          }
        : w,
    )
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const addWeight = () => {
    const nextAvailable = scoreFieldOptions.find(
      (f) =>
        !weights.find(
          (w: any) => String(w.fieldId) === String(f.id) || w.label === f.name,
        ),
    )
    const newWeights = [
      ...weights,
      {
        fieldId: nextAvailable?.id ?? null,
        label: nextAvailable?.name ?? '',
        rowId: nanoid(),
        value: 0,
      },
    ]
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const removeWeight = (rowId: string) => {
    const newWeights = weights.filter((w: any) => w.rowId !== rowId)
    setWeights(newWeights)
    updateNodeData('weights', newWeights)
  }

  const getWeightSelectValue = (w: any) => {
    if (!w.label && (w.fieldId == null || w.fieldId === '')) return null
    const id = String(w.fieldId ?? w.rowId)
    return (
      scoreFieldOptions.find((f) => String(f.id) === id) ||
      scoreFieldOptions.find((f) => f.name === w.label) ||
      (w.label ? { id, name: w.label } : null)
    )
  }

  // --- Sync local state with nodeData changes ---
  useEffect(() => {
    if (nodeData.invoiceType && nodeData.invoiceType !== invoiceType.name) {
      setInvoiceType(
        invoiceTypeOptions.find((opt) => opt.name === nodeData.invoiceType) ||
          invoiceTypeOptions[0],
      )
    }
    if (nodeData.poMatching && nodeData.poMatching !== poMatching.name) {
      setPoMatching(
        poMatchingOptions.find((opt) => opt.name === nodeData.poMatching) ||
          poMatchingOptions[0],
      )
    }
    if (
      nodeData.vendorMustExist !== undefined &&
      nodeData.vendorMustExist !== vendorMustExist
    ) {
      setVendorMustExist(nodeData.vendorMustExist)
    }
  }, [nodeData])

  // Hydrate scoring from workflow JSON when the selected node changes
  useEffect(() => {
    setWeights(toWeightRows(nodeData.weights))
    setThresholds(
      nodeData.thresholds || {
        approved: 90,
        partial: 60,
      },
    )
  }, [currentNode?.id])

  // Load selectable fields from the selected master form (not hardcoded)
  useEffect(() => {
    if (!scoreSourceFormId) {
      setFormFieldOptions([])
      return
    }

    let cancelled = false
    const loadFields = async () => {
      try {
        const response = await requestApi.getForm(scoreSourceFormId)
        if (!response?.formJson || cancelled) return
        const form =
          typeof response.formJson === 'string'
            ? JSON.parse(response.formJson)
            : response.formJson
        if (!cancelled) setFormFieldOptions(extractFormFieldOptions(form))
      } catch (e) {
        console.error('Error loading AP Agent score fields:', e)
        if (!cancelled) setFormFieldOptions([])
      }
    }

    loadFields()
    return () => {
      cancelled = true
    }
  }, [scoreSourceFormId])

  // Special sync for masterForms once they load — resolve IDs to named options
  useEffect(() => {
    if (masterForms.length === 0) return

    const poSource = nodeData.poMaster || poMaster
    if (poSource) {
      const resolved = getMasterOption(poSource)
      if (resolved && resolved.name !== poMaster?.name) setPoMaster(resolved)
    }

    const invSource = nodeData.invoiceMaster || invoiceMaster
    if (invSource) {
      const resolved = getMasterOption(invSource)
      if (resolved && resolved.name !== invoiceMaster?.name)
        setInvoiceMaster(resolved)
    }

    const vSource = nodeData.vendorSource || vendorSource
    if (vSource) {
      const resolved = getMasterOption(vSource)
      if (resolved && resolved.name !== vendorSource?.name)
        setVendorSource(resolved)
    }

    const glSrc = nodeData.glSource || glSource
    if (glSrc) {
      const resolved = getMasterOption(glSrc)
      if (resolved && resolved.name !== glSource?.name) setGlSource(resolved)
    }

    const matSrc = nodeData.matterSource || matterSource
    if (matSrc) {
      const resolved = getMasterOption(matSrc)
      if (resolved && resolved.name !== matterSource?.name)
        setMatterSource(resolved)
    }
  }, [
    masterForms,
    nodeData.poMaster,
    nodeData.invoiceMaster,
    nodeData.vendorSource,
    nodeData.glSource,
    nodeData.matterSource,
  ])

  return (
    <div className='flex h-full flex-col overflow-hidden bg-surface font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        {/* BASIC SETUP */}
        <SettingsSection
          icon='lucide:settings-2'
          isOpen={openBasic}
          title='Basic Setup'
          variant='premium'
          onToggle={() => setOpenBasic(!openBasic)}
        >
          {/* Processing Mode */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center gap-2.5 px-0.5'>
              <Icon
                className='text-indigo-10 h-4 w-4 stroke-[2]'
                name='lucide:settings'
              />
              <div className='flex flex-col space-y-1'>
                <span className='text-13 font-medium text-gray-12'>
                  Processing Mode
                </span>
                <span className='text-11 leading-tight text-gray-9'>
                  Select the invoice processing workflow type
                </span>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              {invoiceTypeOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={cn(
                    'group/btn flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 text-center transition-all duration-300 active:scale-95',
                    invoiceType.id === opt.id
                      ? 'bg-purple-2/20 border-purple-3 shadow-sm'
                      : 'bg-surface-muted/20 border-gray-5/40 shadow-sm',
                  )}
                  onClick={() => handleInvoiceTypeChange(opt)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300',
                      invoiceType.id === opt.id
                        ? 'scale-110 text-purple-9'
                        : 'group-hover/btn:text-gray-8 text-gray-9/40',
                    )}
                  >
                    <Icon className='h-6 w-6' name={opt.icon} />
                  </div>
                  <div className='flex flex-col space-y-0.5'>
                    <div
                      className={cn(
                        'text-13 font-medium transition-colors duration-300',
                        invoiceType.id === opt.id
                          ? 'text-gray-13'
                          : 'text-gray-12',
                      )}
                    >
                      {opt.name}
                    </div>
                    <div className='text-11 leading-tight text-gray-9 opacity-70'>
                      {opt.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Matching Strategy */}
          {isPO && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-3 rounded-xl bg-surface p-4 shadow-sm duration-300'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-red-10 h-4 w-4 stroke-[2]'
                  name='lucide:git-pull-request'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Matching Strategy
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Define how invoices are matched with Purchase Orders
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                {poMatchingOptions.map((opt) => (
                  <button
                    key={opt.id}
                    className={cn(
                      'group/strategy flex w-full items-center justify-between rounded-xl border p-2.5 transition-all duration-300 active:scale-[0.99]',
                      poMatching.id === opt.id
                        ? 'bg-purple-2/20 border-purple-3 shadow-sm'
                        : 'bg-surface-muted/20 border-gray-5/40 shadow-sm',
                    )}
                    onClick={() => handlePoMatchingChange(opt)}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='flex -space-x-1.5'>
                        {opt.icons.map((icon, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-full border ring-2 ring-white transition-all duration-300',
                              poMatching.id === opt.id
                                ? 'bg-purple-2 border-purple-4 scale-105 text-purple-9'
                                : 'bg-surface-muted border-gray-3 group-hover/strategy:text-gray-8 text-gray-9/40',
                            )}
                          >
                            <Icon className='h-3.5 w-3.5' name={icon} />
                          </div>
                        ))}
                      </div>
                      <div className='flex flex-col items-start space-y-0.5'>
                        <span
                          className={cn(
                            'text-13 font-medium transition-colors duration-300',
                            poMatching.id === opt.id
                              ? 'text-purple-11'
                              : 'text-gray-12',
                          )}
                        >
                          {opt.name}
                        </span>
                        <span className='text-11 leading-tight text-gray-9 opacity-80'>
                          {opt.description}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'flex h-4.5 w-4.5 items-center justify-center rounded-full border transition-all duration-300',
                        poMatching.id === opt.id
                          ? 'shadow-purple-200 scale-110 border-purple-9 bg-purple-9 shadow-sm'
                          : 'border-gray-3 bg-surface group-hover/strategy:border-gray-4',
                      )}
                    >
                      {poMatching.id === opt.id && (
                        <Icon
                          className='animate-in zoom-in-50 h-2.5 w-2.5 stroke-[3] text-white duration-300'
                          name='lucide:check'
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className='space-y-3 px-0.5 pt-2'>
                <div className='text-12 font-medium text-gray-12'>
                  PO Master Resource
                </div>

                {/* Searchable Dropdown Selector for PO Source using InputSelect primitive */}
                <div className='space-y-1.5'>
                  <div className='text-11 font-medium text-gray-10'>
                    PO Source
                  </div>
                  <InputSelect
                    options={poMasterSourceTypeOptions}
                    placeholder='Select PO Source'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={currentSourceOption}
                    onChange={(val) => {
                      if (val) {
                        handlePoMasterSourceTypeChange(val.id as any)
                      }
                    }}
                  />
                </div>

                {/* Option 1: Internal Master Form */}
                {poMasterSourceType === 'internal' && (
                  <div className='animate-in fade-in slide-in-from-top-1 space-y-1.5 duration-200'>
                    <div className='text-11 font-medium text-gray-10'>
                      Master Form
                    </div>
                    <InputSelect
                      options={masterForms}
                      placeholder='Select Master Form'
                      rightSectionIcon='lucide:chevrons-up-down'
                      searchable={true}
                      value={poMasterValue}
                      onChange={(val) => {
                        setPoMaster(val)
                        updateNodeData('poMaster', val)
                      }}
                    />
                  </div>
                )}

                {/* Option 2: QuickBooks Online */}
                {poMasterSourceType === 'quickbooks' && (
                  <div className='animate-in fade-in slide-in-from-top-1 space-y-2.5 duration-200'>
                    <div className='space-y-1.5'>
                      <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                        Connection <span className='text-red-11'>*</span>
                      </label>
                      <div className='relative'>
                        <button
                          type='button'
                          className={cn(
                            'flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
                            isQbConnectionOpen
                              ? 'border-primary-9 ring-2 ring-primary-4'
                              : 'border-gray-3 hover:border-primary-5',
                          )}
                          onClick={() =>
                            setIsQbConnectionOpen(!isQbConnectionOpen)
                          }
                        >
                          <span
                            className={
                              !qbAccount
                                ? 'text-gray-9'
                                : 'flex items-center gap-2 font-normal text-gray-13'
                            }
                          >
                            {qbAccount ? (
                              <>
                                <Icon
                                  className='size-4 shrink-0'
                                  name='brand:quickbooks'
                                />
                                <span>
                                  {qbAccount.name ||
                                    qbAccount.label ||
                                    'QuickBooks Connection'}
                                </span>
                              </>
                            ) : (
                              'Select a connection'
                            )}
                          </span>
                          <Icon
                            className='pointer-events-none h-4 w-4 text-gray-7'
                            name='lucide:chevrons-up-down'
                          />
                        </button>

                        {isQbConnectionOpen && (
                          <>
                            <div
                              className='fixed inset-0 z-40'
                              onClick={() => {
                                setIsQbConnectionOpen(false)
                                setIsCreatingQbConnection(false)
                                setNewQbAccountName('')
                              }}
                            />
                            <div className='animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-3 bg-surface p-1 shadow-xl duration-100'>
                              {!isCreatingQbConnection ? (
                                <>
                                  {qbAccountOptions.map((option) => (
                                    <button
                                      key={option.id}
                                      type='button'
                                      className={cn(
                                        'flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal transition-colors',
                                        String(qbAccount?.id) ===
                                          String(option.id)
                                          ? 'bg-primary-1 font-normal text-primary-9'
                                          : 'text-gray-12 hover:bg-gray-2',
                                      )}
                                      onClick={() => {
                                        setQbAccount(option)
                                        updateNodeData(
                                          'poMasterQbAccount',
                                          option,
                                        )
                                        updateNodeData('poMaster', {
                                          id: option.id,
                                          name: option.name,
                                          sourceType: 'quickbooks',
                                        })
                                        setIsQbConnectionOpen(false)
                                      }}
                                    >
                                      <Icon
                                        className='size-4 shrink-0'
                                        name='brand:quickbooks'
                                      />
                                      <span className='truncate text-13 font-normal'>
                                        {option.name}
                                      </span>
                                    </button>
                                  ))}

                                  {qbAccountOptions.length > 0 && (
                                    <div className='my-1 h-px bg-gray-2' />
                                  )}

                                  <button
                                    className='flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal text-primary-9 transition-colors hover:bg-primary-1'
                                    type='button'
                                    onClick={() =>
                                      setIsCreatingQbConnection(true)
                                    }
                                  >
                                    <Icon
                                      className='size-4 shrink-0'
                                      name='lucide:plus'
                                    />
                                    <span>Create Connection</span>
                                  </button>
                                </>
                              ) : (
                                <div className='space-y-3 p-3'>
                                  <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-medium text-gray-11'>
                                      Connection Name
                                    </label>
                                    <input
                                      className='w-full rounded-md border border-gray-3 px-2 py-1.5 text-sm focus:border-primary-9 focus:ring-2 focus:ring-primary-4 focus:outline-none'
                                      placeholder='e.g. My QuickBooks Connection'
                                      type='text'
                                      value={newQbAccountName}
                                      autoFocus
                                      onChange={(e) =>
                                        setNewQbAccountName(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleConnectQb()
                                      }}
                                    />
                                  </div>
                                  <div className='flex items-center justify-end gap-2'>
                                    <Button
                                      className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
                                      size='md'
                                      variant='ghost'
                                      onClick={() =>
                                        setIsCreatingQbConnection(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className='flex items-center justify-center gap-2'
                                      color='primary'
                                      size='md'
                                      disabled={
                                        !newQbAccountName.trim() ||
                                        isConnectingQb
                                      }
                                      onClick={handleConnectQb}
                                    >
                                      {isConnectingQb && (
                                        <Icon
                                          className='h-3 w-3 animate-spin'
                                          name='lucide:loader-2'
                                        />
                                      )}
                                      {isConnectingQb
                                        ? 'Connecting...'
                                        : 'Connect'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Option 3: SAP ERP / S/4HANA */}
                {poMasterSourceType === 'sap' && (
                  <div className='animate-in fade-in slide-in-from-top-1 space-y-2.5 duration-200'>
                    <div className='space-y-1.5'>
                      <label className='flex items-center gap-1 text-[13px] font-medium text-gray-11'>
                        Connection <span className='text-red-11'>*</span>
                      </label>
                      <div className='relative'>
                        <button
                          type='button'
                          className={cn(
                            'flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm transition-all duration-200 outline-none focus:border-primary-9 focus:ring-2 focus:ring-primary-4',
                            isSapConnectionOpen
                              ? 'border-primary-9 ring-2 ring-primary-4'
                              : 'border-gray-3 hover:border-primary-5',
                          )}
                          onClick={() =>
                            setIsSapConnectionOpen(!isSapConnectionOpen)
                          }
                        >
                          <span
                            className={
                              !sapAccount
                                ? 'text-gray-9'
                                : 'flex items-center gap-2 font-normal text-gray-13'
                            }
                          >
                            {sapAccount ? (
                              <>
                                <Icon
                                  className='size-4 shrink-0'
                                  name='brand:sap'
                                />
                                <span>
                                  {sapAccount.name ||
                                    sapAccount.label ||
                                    'SAP Connection'}
                                </span>
                              </>
                            ) : (
                              'Select a connection'
                            )}
                          </span>
                          <Icon
                            className='pointer-events-none h-4 w-4 text-gray-7'
                            name='lucide:chevrons-up-down'
                          />
                        </button>

                        {isSapConnectionOpen && (
                          <>
                            <div
                              className='fixed inset-0 z-40'
                              onClick={() => {
                                setIsSapConnectionOpen(false)
                                setIsCreatingSapConnection(false)
                                setNewSapHost('')
                              }}
                            />
                            <div className='animate-in fade-in zoom-in-95 absolute top-full left-0 z-50 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-gray-3 bg-surface p-1 shadow-xl duration-100'>
                              {!isCreatingSapConnection ? (
                                <>
                                  {sapAccountOptions.map((option) => (
                                    <button
                                      key={option.id}
                                      type='button'
                                      className={cn(
                                        'flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal transition-colors',
                                        String(sapAccount?.id) ===
                                          String(option.id)
                                          ? 'bg-primary-1 font-normal text-primary-9'
                                          : 'text-gray-12 hover:bg-gray-2',
                                      )}
                                      onClick={() => {
                                        setSapAccount(option)
                                        updateNodeData(
                                          'poMasterSapAccount',
                                          option,
                                        )
                                        updateNodeData('poMaster', {
                                          id: option.id,
                                          name: option.name,
                                          sourceType: 'sap',
                                        })
                                        setIsSapConnectionOpen(false)
                                      }}
                                    >
                                      <Icon
                                        className='size-4 shrink-0'
                                        name='brand:sap'
                                      />
                                      <span className='truncate text-13 font-normal'>
                                        {option.name}
                                      </span>
                                    </button>
                                  ))}

                                  {sapAccountOptions.length > 0 && (
                                    <div className='my-1 h-px bg-gray-2' />
                                  )}

                                  <button
                                    className='flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-13 font-normal text-primary-9 transition-colors hover:bg-primary-1'
                                    type='button'
                                    onClick={() =>
                                      setIsCreatingSapConnection(true)
                                    }
                                  >
                                    <Icon
                                      className='size-4 shrink-0'
                                      name='lucide:plus'
                                    />
                                    <span>Create Connection</span>
                                  </button>
                                </>
                              ) : (
                                <div className='space-y-3 p-3'>
                                  <div className='flex flex-col gap-1.5'>
                                    <label className='text-xs font-medium text-gray-11'>
                                      Connection Name
                                    </label>
                                    <input
                                      className='w-full rounded-md border border-gray-3 px-2 py-1.5 text-sm focus:border-primary-9 focus:ring-2 focus:ring-primary-4 focus:outline-none'
                                      placeholder='e.g. My SAP Connection'
                                      type='text'
                                      value={newSapHost}
                                      autoFocus
                                      onChange={(e) =>
                                        setNewSapHost(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleConnectSap()
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className='flex items-center justify-end gap-2'>
                                    <Button
                                      className='text-gray-10 hover:bg-gray-2 hover:text-gray-13'
                                      size='md'
                                      variant='ghost'
                                      onClick={() =>
                                        setIsCreatingSapConnection(false)
                                      }
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className='flex items-center justify-center gap-2'
                                      color='primary'
                                      size='md'
                                      disabled={
                                        !newSapHost.trim() || isConnectingSap
                                      }
                                      onClick={handleConnectSap}
                                    >
                                      {isConnectingSap && (
                                        <Icon
                                          className='h-3 w-3 animate-spin'
                                          name='lucide:loader-2'
                                        />
                                      )}
                                      {isConnectingSap
                                        ? 'Connecting...'
                                        : 'Connect'}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Master Resources */}
          {isNonPO && (
            <div className='animate-in fade-in slide-in-from-top-1 space-y-3 rounded-xl bg-surface p-4 shadow-sm duration-300'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-blue-10 h-4 w-4 stroke-[2]'
                  name='lucide:database'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Master Resources
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Select the data sources for verification
                  </span>
                </div>
              </div>
              <div className='space-y-1.5'>
                <div className='text-12 font-medium text-gray-12'>
                  Invoice Master Resource
                </div>
                <InputSelect
                  options={masterForms}
                  placeholder='Select Invoice Master'
                  rightSectionIcon='lucide:chevrons-up-down'
                  searchable={true}
                  value={invoiceMasterValue}
                  onChange={(val) => {
                    setInvoiceMaster(val)
                    updateNodeData('invoiceMaster', val)
                  }}
                />
              </div>
            </div>
          )}
        </SettingsSection>

        {/* VALIDATION RULES */}
        <SettingsSection
          icon='lucide:shield-check'
          isOpen={openValidation}
          title='Validation & Sync'
          variant='premium'
          onToggle={() => setOpenValidation(!openValidation)}
        >
          {/* Vendor Verification */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-blue-10 h-4 w-4 stroke-[2]'
                  name='lucide:building-2'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Vendor Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Validate vendor details against master database
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={vendorMustExist}
                onChange={(checked) => {
                  setVendorMustExist(checked)
                  updateNodeData('vendorMustExist', checked)
                  if (!checked) {
                    setVendorSource(null)
                    updateNodeData('vendorSource', null)
                  }
                }}
              />
            </div>
            {vendorMustExist && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5 pt-1'>
                  <div className='text-12 font-medium text-gray-12'>
                    Vendor Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select Vendor Source'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={vendorSourceValue}
                    onChange={(val) => {
                      setVendorSource(val)
                      updateNodeData('vendorSource', val)
                      // Enable verification whenever a master form is selected
                      const enabled = !!val
                      setVendorMustExist(enabled)
                      updateNodeData('vendorMustExist', enabled)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Detection */}
          <div className='rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-yellow-10 h-4 w-4 stroke-[2]'
                  name='lucide:copy-check'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Duplicate Detection
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Identify and flag potential duplicate invoices
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={duplicateDetection}
                onChange={(val) => {
                  setDuplicateDetection(val)
                  updateNodeData('duplicateDetection', val)
                }}
              />
            </div>
          </div>

          {/* Back Order Detection */}
          <div className='rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-orange-10 h-4 w-4 stroke-[2]'
                  name='lucide:package-x'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Back Order Detection
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Check if items are on back order or unavailable
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={backOrderDetection}
                onChange={(val) => {
                  setBackOrderDetection(val)
                  updateNodeData('backOrderDetection', val)
                }}
              />
            </div>
          </div>

          {/* GL Section */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-green-10 h-4 w-4 stroke-[2]'
                  name='lucide:book-open-check'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    GL Account Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Ensure GL codes are valid and mapped correctly
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={syncGL}
                onChange={(val) => {
                  setSyncGL(val)
                  updateNodeData('syncGL', val)
                }}
              />
            </div>
            {syncGL && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    GL Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select GL Master'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={glSourceValue}
                    onChange={(val) => {
                      setGlSource(val)
                      updateNodeData('glSource', val)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Matter Section */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <Icon
                  className='text-gray-10 h-4 w-4 stroke-[2]'
                  name='lucide:briefcase'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Matter Verification
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Verify details against linked case or matter
                  </span>
                </div>
              </div>
              <InputSwitch
                checked={syncMatter}
                onChange={(val) => {
                  setSyncMatter(val)
                  updateNodeData('syncMatter', val)
                }}
              />
            </div>
            {syncMatter && (
              <div className='animate-in fade-in slide-in-from-top-1 duration-300'>
                <div className='space-y-1.5'>
                  <div className='text-12 font-medium text-gray-12'>
                    Matter Source
                  </div>
                  <InputSelect
                    options={masterForms}
                    placeholder='Select Matter Master'
                    rightSectionIcon='lucide:chevrons-up-down'
                    searchable={true}
                    value={matterSourceValue}
                    onChange={(val) => {
                      setMatterSource(val)
                      updateNodeData('matterSource', val)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* SCORING & THRESHOLDS */}
        <SettingsSection
          icon='lucide:gauge'
          isOpen={openScoring}
          title='Scoring & Thresholds'
          variant='premium'
          onToggle={() => setOpenScoring(!openScoring)}
        >
          {/* Scoring Weights */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between pb-0.5'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  className='text-purple-10 h-4 w-4 stroke-[2]'
                  name='lucide:bar-chart-big'
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Scoring Weights
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Assign importance to different match criteria
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-11 font-medium whitespace-nowrap transition-all duration-300',
                  totalWeight !== 100
                    ? 'animate-pulse border-red-3 bg-red-1 text-red-11'
                    : 'border-green-3 bg-green-1 text-green-11',
                )}
              >
                Total: {totalWeight}%
              </div>
            </div>

            <div className='space-y-1.5'>
              {weights.map((w: any) => (
                <div
                  className='group/weight animate-in fade-in slide-in-from-left-2 flex items-center gap-2 duration-300'
                  key={w.rowId}
                >
                  <div className='w-[140px] shrink-0'>
                    <InputSelect
                      options={scoreFieldOptions}
                      placeholder='Select Field'
                      searchable={true}
                      value={getWeightSelectValue(w)}
                      onChange={(val) =>
                        val &&
                        updateWeightField(w.rowId, {
                          id: val.id,
                          name: val.name,
                        })
                      }
                    />
                  </div>

                  {/* Premium Purple Slider */}
                  <div className='group/slider relative mx-2 flex h-8 min-w-[60px] flex-1 items-center'>
                    <div
                      className='pointer-events-none absolute -top-5 z-40 rounded-md bg-gray-13 px-1.5 py-0.5 text-11 font-medium whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:-top-6 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {w.value}%
                      <div className='absolute bottom-[-2px] left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-gray-13' />
                    </div>

                    <div className='pointer-events-none absolute right-0 left-0 h-[6px] rounded-full bg-gray-3' />

                    <div
                      className='pointer-events-none absolute z-20 h-4.5 w-4.5 rounded-full border-[2.5px] border-white bg-purple-9 shadow-md ring-0 transition-all duration-300 group-hover/slider:ring-4 group-hover/slider:ring-purple-9/20'
                      style={{
                        left: `${w.value}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />

                    <input
                      className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                      max='100'
                      min='0'
                      step='5'
                      type='range'
                      value={w.value}
                      onChange={(e) =>
                        updateWeight(w.rowId, parseInt(e.target.value))
                      }
                    />
                  </div>

                  <button
                    className='text-gray-8 hover:text-red-9 hover:bg-red-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors'
                    title='Remove weight'
                    onClick={() => removeWeight(w.rowId)}
                  >
                    <Icon className='h-[15px] w-[15px]' name='lucide:trash-2' />
                  </button>
                </div>
              ))}
            </div>

            <div className='pt-1'>
              <button
                className='border-gray-6 text-gray-9 hover:bg-blue-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-13 font-medium transition-all duration-300 hover:border-primary-9 hover:text-primary-11 active:scale-[0.99]'
                onClick={addWeight}
              >
                <Icon className='h-4 w-4' name='lucide:plus' />
                <span>Add Property Weight</span>
              </button>
            </div>
          </div>

          {/* Decision Thresholds */}
          <div className='space-y-3 rounded-xl bg-surface p-4 shadow-sm'>
            <div className='flex items-center justify-between pb-0.5'>
              <div className='flex items-center gap-2.5 px-0.5'>
                <Icon
                  name='lucide:shield-check'
                  className={cn(
                    'h-4 w-4 stroke-[2]',
                    isThresholdInvalid ? 'text-red-11' : 'text-blue-10',
                  )}
                />
                <div className='flex flex-col space-y-1'>
                  <span className='text-13 font-medium text-gray-12'>
                    Decision Thresholds
                  </span>
                  <span className='text-11 leading-tight text-gray-9'>
                    Set confidence levels for auto-approval
                  </span>
                </div>
              </div>
              {isThresholdInvalid && (
                <div className='animate-bounce text-[10px] font-medium text-red-11'>
                  Partial must be lower than Approved
                </div>
              )}
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div className='space-y-1.5 rounded-lg border border-green-6 bg-green-2 p-2 shadow-sm transition-colors hover:border-green-8'>
                <div className='flex items-center justify-between px-0.5'>
                  <span className='text-13 font-bold tracking-tight text-green-11'>
                    Approved
                  </span>
                  <span className='text-12 font-semibold text-green-11'>
                    {thresholds.approved}%
                  </span>
                </div>

                <div className='group/slider relative flex h-6 items-center'>
                  <div
                    className='pointer-events-none absolute -top-7 z-40 rounded-md bg-gray-13 px-2 py-1 text-13 font-bold whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {thresholds.approved}%
                    <div className='absolute bottom-[-3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-13' />
                  </div>

                  {/* Unfilled track — solid gray for clear contrast */}
                  <div
                    className={cn(
                      'pointer-events-none absolute right-0 left-0 h-2 rounded-full',
                      isThresholdInvalid ? 'bg-red-5' : 'bg-gray-5',
                    )}
                  />
                  {/* Filled score line */}
                  <div
                    style={{ width: `${thresholds.approved}%` }}
                    className={cn(
                      'pointer-events-none absolute left-0 z-10 h-2 rounded-full',
                      isThresholdInvalid ? 'bg-red-9' : 'bg-green-9',
                    )}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute z-20 h-4 w-4 rounded-full border-[2.5px] border-white shadow-md ring-0 transition-all duration-300',
                      isThresholdInvalid
                        ? 'bg-red-11 group-hover/slider:ring-4 group-hover/slider:ring-red-11/20'
                        : 'bg-green-9 group-hover/slider:ring-4 group-hover/slider:ring-green-9/20',
                    )}
                    style={{
                      left: `${thresholds.approved}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <input
                    className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                    max='100'
                    min='0'
                    step='5'
                    type='range'
                    value={thresholds.approved}
                    onChange={(e) => {
                      const newThresholds = {
                        ...thresholds,
                        approved: Number.parseInt(e.target.value, 10),
                      }
                      setThresholds(newThresholds)
                      updateNodeData('thresholds', newThresholds)
                    }}
                  />
                </div>
              </div>

              <div className='space-y-1.5 rounded-lg border border-yellow-5 bg-yellow-2 p-2 shadow-sm transition-colors hover:border-yellow-8'>
                <div className='flex items-center justify-between px-0.5'>
                  <span className='text-13 font-bold tracking-tight text-orange-11'>
                    Partial Match
                  </span>
                  <span className='text-12 font-semibold text-orange-11'>
                    {thresholds.partial}%
                  </span>
                </div>

                <div className='group/slider relative flex h-6 items-center'>
                  <div
                    className='pointer-events-none absolute -top-7 z-40 rounded-md bg-gray-13 px-2 py-1 text-13 font-bold whitespace-nowrap text-white opacity-0 shadow-sm transition-all duration-200 group-hover/slider:opacity-100 group-active/slider:opacity-100'
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {thresholds.partial}%
                    <div className='absolute bottom-[-3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-13' />
                  </div>

                  {/* Unfilled track — solid gray for clear contrast */}
                  <div
                    className={cn(
                      'pointer-events-none absolute right-0 left-0 h-2 rounded-full',
                      isThresholdInvalid ? 'bg-red-5' : 'bg-gray-5',
                    )}
                  />
                  {/* Filled score line */}
                  <div
                    style={{ width: `${thresholds.partial}%` }}
                    className={cn(
                      'pointer-events-none absolute left-0 z-10 h-2 rounded-full',
                      isThresholdInvalid ? 'bg-red-9' : 'bg-orange-9',
                    )}
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute z-20 h-4 w-4 rounded-full border-[2.5px] border-white shadow-md ring-0 transition-all duration-300',
                      isThresholdInvalid
                        ? 'bg-red-11 group-hover/slider:ring-4 group-hover/slider:ring-red-11/20'
                        : 'bg-orange-9 group-hover/slider:ring-4 group-hover/slider:ring-orange-9/20',
                    )}
                    style={{
                      left: `${thresholds.partial}%`,
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <input
                    className='absolute inset-0 z-30 h-full w-full cursor-pointer opacity-0'
                    max='100'
                    min='0'
                    step='5'
                    type='range'
                    value={thresholds.partial}
                    onChange={(e) => {
                      const newThresholds = {
                        ...thresholds,
                        partial: Number.parseInt(e.target.value, 10),
                      }
                      setThresholds(newThresholds)
                      updateNodeData('thresholds', newThresholds)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* CONNECTIONS & ROUTING */}
        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
