import { Accordion } from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  User,
  Volume2,
  X,
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import formApi from '@/api/form/form'
import { uploadForOcr } from '@/api/v6/folder/folder'
import workflowsApiV6, {
  createPublishedWorkflowBrowsePayload,
  mapPublishedBrowseResponseToOptions,
  type WorkflowOptionItem,
} from '@/api/v6/workflows'
import workflowApi from '@/api/workflow/workflow'
import IconButton from '@/components/base/button/IconButton'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import AiBrandIcon from '@/components/common/AiBrandIcon'
import {
  Button,
  Card,
  PrimaryButton,
  StatusPill,
} from '@/pages/folders/components/Ui'
import LineItemTable from '@/pages/requests/components/request/components/sections/overview/LineItemTable'
import {
  matchWorkflowWithGemini,
  type ParsedDoc,
  type ParsedField,
  processWorkflowChatStepWithGemini,
  type WorkflowSummary,
} from '@/services/ai/workflowChatAi'
import authUserStore from '@/stores/authUserStore'
import cn from '@/utils/cn'

export type WorkflowChatMode = 'idle' | 'collecting' | 'review' | 'submitted'

export interface WorkflowChatPageProps {
  embedded?: boolean
  initialState?: WorkflowHistoryData
  initialAction?: string
  isExpanded?: boolean
  onSaveHistory?: (state: WorkflowHistoryData) => void
}

export interface WorkflowHistoryData {
  activeWorkflow: WorkflowSummary | null
  answers: Record<string, any>
  awaitingDoc: ParsedDoc | null
  awaitingField: ParsedField | null
  docsMap: Record<string, string>
  documents: ParsedDoc[]
  fields: ParsedField[]
  messages: Message[]
  mode: WorkflowChatMode
  ticketId: string | null
  panels?: any[]
}

// Types for chat messages
interface Message {
  id: string
  sender: 'assistant' | 'user'
  htmlContent?: string
  pills?: string[]
  selectedPill?: string
  showDatePicker?: boolean
  tableField?: ParsedField
  textContent?: string
  tipText?: string
  uploadCardDoc?: ParsedDoc
}

const TableInputWidget = ({
  field,
  onSubmit,
}: {
  field: ParsedField
  onSubmit: (data: any[]) => void
}) => {
  const rawColumns = field.rawControl?.settings?.specific?.tableColumns || []

  const [rows, setRows] = useState<any[]>([{}])

  const dynamicColumns =
    rawColumns.length > 0
      ? rawColumns.map((column: any, index: number) => ({
        id:
          column.id ||
          column.jsonId ||
          column.name ||
          column.label ||
          `column_${index}`,

        label:
          column.label || column.name || column.id || `Column ${index + 1}`,
      }))
      : [
        {
          id: 'Description',
          label: 'Description',
        },
        {
          id: 'Quantity',
          label: 'Quantity',
        },
        {
          id: 'Unit Price',
          label: 'Unit Price',
        },
        {
          id: 'Line Amount',
          label: 'Line Amount',
        },
      ]

  const handleCellChange = (
    rowIndex: number,
    columnId: string,
    value: string,
  ) => {
    setRows((prev) => {
      const updated = [...prev]

      updated[rowIndex] = {
        ...(updated[rowIndex] || {}),
        [columnId]: value,
      }

      return updated
    })
  }

  const addRow = () => {
    setRows((prev) => [...prev, {}])
  }

  const removeRow = (rowIndex: number) => {
    setRows((prev) => {
      if (prev.length === 1) {
        return [{}]
      }

      return prev.filter((_, index) => index !== rowIndex)
    })
  }

  const handleSubmit = () => {
    const nonEmptyRows = rows.filter((row) =>
      Object.values(row || {}).some(
        (value) =>
          value !== undefined && value !== null && String(value).trim() !== '',
      ),
    )

    onSubmit(nonEmptyRows.length > 0 ? nonEmptyRows : rows)
  }

  return (
    <div className='mt-2 ml-[40px] block w-[calc(100%_-_40px)] max-w-[calc(100%_-_40px)] rounded-xl border border-gray-4 bg-surface shadow-sm'>
      {/* TABLE SCROLL AREA */}
      <div className='ez-scrollbar relative block max-h-[420px] w-full overflow-x-auto overflow-y-auto'>
        <table className='w-full border-collapse text-left text-xs'>
          <thead>
            <tr className='bg-gray-1'>
              {dynamicColumns.map((column: any) => (
                <th
                  className='sticky top-0 z-20 h-[46px] min-w-[120px] border-r border-b border-gray-4 bg-gray-1 px-4 text-left text-[11px] font-semibold whitespace-nowrap text-gray-11'
                  key={column.id}
                >
                  {column.label}
                </th>
              ))}

              <th className='sticky top-0 right-0 z-30 h-[46px] w-[70px] min-w-[70px] border-b border-gray-4 bg-gray-1 px-2 text-center text-[11px] font-semibold text-gray-11'>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr className='bg-surface hover:bg-gray-1' key={rowIndex}>
                {dynamicColumns.map((column: any) => (
                  <td
                    className='h-[48px] min-w-[120px] border-r border-b border-gray-4 bg-surface p-0'
                    key={column.id}
                  >
                    <input
                      className='block h-[48px] w-full min-w-[120px] border-0 bg-transparent px-4 text-[13px] text-gray-12 outline-none placeholder:text-gray-7 focus:bg-primary-1/30 focus:ring-1 focus:ring-primary-7 focus:ring-inset'
                      placeholder={`Enter ${column.label}`}
                      type='text'
                      value={row[column.id] ?? ''}
                      onChange={(e) =>
                        handleCellChange(rowIndex, column.id, e.target.value)
                      }
                    />
                  </td>
                ))}

                <td className='sticky right-0 z-10 h-[48px] w-[70px] min-w-[70px] border-b border-gray-4 bg-surface p-0'>
                  <button
                    className='flex h-[48px] w-full items-center justify-center text-gray-9 transition hover:bg-red-1 hover:text-red-9'
                    title='Delete row'
                    type='button'
                    onClick={() => removeRow(rowIndex)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className='flex items-center justify-between border-t border-gray-4 bg-gray-1 px-3 py-2.5'>
        <button
          className='flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary-9 transition hover:bg-primary-2'
          type='button'
          onClick={addRow}
        >
          <Plus size={15} />
          Add Row
        </button>

        <div className='flex items-center gap-4'>
          <span className='text-xs text-gray-9'>
            {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          </span>

          <PrimaryButton onClick={handleSubmit}>
            Submit Table
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

export const WorkflowChatPage: React.FC<WorkflowChatPageProps> = ({
  embedded = false,
  initialState,
  initialAction,
  isExpanded = false,
  onSaveHistory,
}) => {
  const session = authUserStore((state) => state.session)
  const userName = session?.firstName || session?.name || 'there'

  // State for available workflows from API
  const [workflowsList, setWorkflowsList] = useState<WorkflowSummary[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState<boolean>(true)

  // Chat & Active Workflow state
  const [messages, setMessages] = useState<Message[]>(
    initialState?.messages || [],
  )
  const [mode, setMode] = useState<WorkflowChatMode>(
    initialState?.mode || 'idle',
  )
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowSummary | null>(
    initialState?.activeWorkflow || null,
  )
  const [fields, setFields] = useState<ParsedField[]>(
    initialState?.fields || [],
  )
  const [documents, setDocuments] = useState<ParsedDoc[]>(
    initialState?.documents || [],
  )
  const [answers, setAnswers] = useState<Record<string, any>>(
    initialState?.answers || {},
  )
  const [docsMap, setDocsMap] = useState<Record<string, string>>(
    initialState?.docsMap || {},
  )
  const [awaitingField, setAwaitingField] = useState<ParsedField | null>(
    initialState?.awaitingField || null,
  )
  const [awaitingDoc, setAwaitingDoc] = useState<ParsedDoc | null>(
    initialState?.awaitingDoc || null,
  )
  const [panels, setPanels] = useState<any[]>(initialState?.panels || [])

  // Layout & UI state
  const [contextVisible, setContextVisible] = useState<boolean>(true)
  const [inputText, setInputText] = useState<string>('')
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [typingText, setTypingText] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [ticketId, setTicketId] = useState<string | null>(
    initialState?.ticketId || null,
  )

  const chatScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dynamicPlaceholder = useMemo(() => {
    if (activeWorkflow) {
      if (awaitingField) {
        return `Enter ${awaitingField.label || (awaitingField as any).name || 'details'}...`
      }
      if (awaitingDoc) {
        return `Upload or ask about ${awaitingDoc.label}...`
      }
      return `Ask anything about ${activeWorkflow.name}...`
    }
    if (initialAction === 'Initiate workflow') {
      return 'Ask me to start a workflow or pick an option above...'
    }
    if (initialAction === 'Show my pending requests') {
      return 'Enter request ID or keyword to search...'
    }
    return 'Ask me to start a workflow or check a request...'
  }, [activeWorkflow, awaitingField, awaitingDoc, initialAction])

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // Load real workflows from API on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoadingWorkflows(true)
      try {
        const payload = createPublishedWorkflowBrowsePayload()
        const res = await workflowsApiV6.getAllWorkflows(payload)

        let list: WorkflowSummary[] = []
        if (res.data?.data && res.data.data.length > 0) {
          const items = res.data.data.flatMap((cluster) => cluster.value ?? [])
          list = items.map((item) => ({
            description: item.description || '',
            id: item.id,
            name: item.name || 'Untitled Workflow',
          }))
        }

        // Fallback to GET /workflows if browse is empty
        if (list.length === 0) {
          const listRes = await workflowsApiV6.getWorkflows()
          if (listRes.data?.items) {
            list = listRes.data.items
              .filter((w) => w.status === 1)
              .map((w) => ({
                description: w.description || '',
                id: w.id,
                name: w.name,
              }))
          }
        }

        // Default fallback workflows if API returns empty array or during dev setup
        if (list.length === 0) {
          list = [
            {
              description: 'Vendor onboarding and registration process',
              id: 'vendor_reg',
              name: 'Vendor Registration',
            },
            {
              description: 'Invoice processing & AP verification',
              id: 'accounts_payable',
              name: 'Accounts Payable',
            },
            {
              description: 'Order fulfillment & billing',
              id: 'order_to_cash',
              name: 'Order-to-Cash',
            },
            {
              description: 'Internal procurement & purchase requests',
              id: 'purchase_request',
              name: 'Purchase Request',
            },
          ]
        }

        setWorkflowsList(list)
      } catch (err) {
        console.error('Failed to load workflows list from API:', err)
        setWorkflowsList([
          {
            description: 'Vendor onboarding and registration process',
            id: 'vendor_reg',
            name: 'Vendor Registration',
          },
          {
            description: 'Invoice processing & AP verification',
            id: 'accounts_payable',
            name: 'Accounts Payable',
          },
          {
            description: 'Order fulfillment & billing',
            id: 'order_to_cash',
            name: 'Order-to-Cash',
          },
          {
            description: 'Internal procurement & purchase requests',
            id: 'purchase_request',
            name: 'Purchase Request',
          },
        ])
      } finally {
        setLoadingWorkflows(false)
      }
    }

    fetchWorkflows()

    // Add initial greeting message
    if (!initialState?.messages || initialState.messages.length === 0) {
      if (initialAction === 'Initiate workflow') {
        const initialPills =
          workflowsList.length > 0
            ? workflowsList.map((w) => w.name)
            : [
              'Accounts Payable',
              'Vendor Registration',
              'Order-to-Cash',
              'Purchase Request',
            ]
        setMessages([
          {
            htmlContent: `Hi <span class="text-primary-9 font-semibold">${userName}</span> 👋 I'm your Workflow Assistant. Which workflow would you like to start?`,
            id: 'msg-init-choices',
            pills: initialPills,
            sender: 'assistant',
          },
        ])
      } else if (initialAction === 'Show my pending requests') {
        const initialPills =
          workflowsList.length > 0
            ? workflowsList.map((w) => w.name)
            : [
              'Accounts Payable',
              'Vendor Registration',
              'Order-to-Cash',
              'Purchase Request',
            ]
        setMessages([
          {
            htmlContent: `You have 2 active requests:<br><br>
            <strong>WF-2026-001245</strong> - Vendor Registration - <span style="color:#8300E6; font-weight:600;">Pending Approval</span><br>
            <strong>WF-2026-001231</strong> - Accounts Payable - <span style="color:#8300E6; font-weight:600;">Action Required</span><br><br>
            Select a workflow below to filter, or type a request ID or keyword to search:`,
            id: 'msg-pending-choices',
            pills: initialPills,
            sender: 'assistant',
          },
        ])
      } else {
        setMessages([
          {
            htmlContent: `Hi <span class="text-primary-9 font-semibold">${userName}</span> 👋 I'm your Workflow Assistant. Tell me what you'd like to do and I'll guide you through it — <span class="text-primary-9 font-semibold">I'll figure out the right workflow and ask only what's needed</span>.`,
            id: 'msg-init',
            pills: [
              'Start workflow',
              'Show my pending requests',
              'Browse workflows',
            ],
            sender: 'assistant',
          },
        ])
      }
    }
  }, [])

  useEffect(() => {
    if (workflowsList.length > 0) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === 'msg-init-choices' || msg.id === 'msg-pending-choices'
            ? { ...msg, pills: workflowsList.map((w) => w.name) }
            : msg,
        ),
      )
    }
  }, [workflowsList])

  const onSaveHistoryRef = useRef(onSaveHistory)
  useEffect(() => {
    onSaveHistoryRef.current = onSaveHistory
  }, [onSaveHistory])

  useEffect(() => {
    if (onSaveHistoryRef.current && messages.length > 0) {
      onSaveHistoryRef.current({
        activeWorkflow,
        answers,
        awaitingDoc,
        awaitingField,
        docsMap,
        documents,
        fields,
        messages,
        mode,
        panels,
        ticketId,
      })
    }
  }, [
    messages,
    mode,
    activeWorkflow,
    fields,
    documents,
    answers,
    docsMap,
    awaitingField,
    awaitingDoc,
    ticketId,
    panels,
  ])

  // Parse Form JSON into ParsedField[] and ParsedDoc[]
  const parseFormJson = (
    formJsonObj: any,
  ): { docs: ParsedDoc[]; fields: ParsedField[]; panels?: any[] } => {
    const parsedFields: ParsedField[] = []
    const parsedDocs: ParsedDoc[] = []

    if (!formJsonObj) return { docs: parsedDocs, fields: parsedFields, panels: [] }

    let target = formJsonObj
    if (typeof target === 'string') {
      try {
        target = JSON.parse(target)
      } catch {
        target = {}
      }
    }
    if (target?.formJson) {
      if (typeof target.formJson === 'string') {
        try {
          target = JSON.parse(target.formJson)
        } catch {
          // ignore
        }
      } else {
        target = target.formJson
      }
    }

    const rawControls: any[] = []
    if (Array.isArray(target?.controllist))
      rawControls.push(...target.controllist)
    if (Array.isArray(target?.controlList))
      rawControls.push(...target.controlList)

    const panels = [
      ...(Array.isArray(target?.panels) ? target.panels : []),
      ...(Array.isArray(target?.secondaryPanels) ? target.secondaryPanels : []),
    ]

    panels.forEach((p) => {
      if (Array.isArray(p?.controlList)) rawControls.push(...p.controlList)
      if (Array.isArray(p?.controllist)) rawControls.push(...p.controllist)
      if (Array.isArray(p?.fields)) rawControls.push(...p.fields)
    })

    rawControls.forEach((ctrl, idx) => {
      if (!ctrl) return
      const id = String(
        ctrl.jsonId ||
        ctrl.id ||
        ctrl.name ||
        ctrl.columnName ||
        `field_${idx}`,
      )
      const label = String(
        ctrl.label ||
        ctrl.name ||
        ctrl.title ||
        ctrl.jsonId ||
        `Field ${idx + 1}`,
      )
      const type = String(
        ctrl.type ||
        ctrl.control ||
        ctrl.controlType ||
        ctrl.dataType ||
        'text',
      ).toLowerCase()
      const required = Boolean(
        ctrl.isRequired || ctrl.required || ctrl.isMandatory,
      )

      if (
        type.includes('divider') ||
        type.includes('label') ||
        type.includes('paragraph') ||
        label.toLowerCase().includes('divider') ||
        label.toLowerCase().includes('paragraph')
      ) {
        return
      }

      if (
        type.includes('file') ||
        type.includes('upload') ||
        type.includes('document')
      ) {
        parsedDocs.push({
          accept: ctrl.accept || '.pdf,.doc,.docx,.png,.jpg',
          id,
          label,
          required,
        })
      } else {
        let options: string[] | undefined = undefined
        const rawOptions =
          ctrl.options ||
          ctrl.items ||
          ctrl.choiceOptions ||
          ctrl.values ||
          ctrl.dropDownList ||
          ctrl.radioList ||
          ctrl.checklist ||
          []
        if (Array.isArray(rawOptions)) {
          options = rawOptions
            .map((o: any) => {
              if (typeof o === 'string') return o
              if (o && typeof o === 'object')
                return o.value || o.label || o.text || o.name || String(o)
              return String(o)
            })
            .filter(Boolean)
        } else if (typeof rawOptions === 'string') {
          options = rawOptions
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        } else if (typeof rawOptions === 'object' && rawOptions !== null) {
          // Handle object like {"USD": "US Dollar"}
          options = Object.entries(rawOptions)
            .map(([key, val]: [string, any]) => {
              if (typeof val === 'string') return key // Or val? Usually key is the value we want to submit. Let's provide the label or key. Actually, we should probably submit the key, but show the label. The pills only show a string. Let's just use the key. Wait, if it's `{ label: 'USD', value: 'USD' }`, we already handle array of objects. If it's a map:
              return String(
                val.label || val.value || val.text || val.name || key,
              )
            })
            .filter(Boolean)
        }
        if (options && options.length === 0) options = undefined
        if (!options && label.toLowerCase().includes('currency')) {
          options = ['USD', 'CAD', 'INR', 'EUR', 'GBP']
        }
        if (!options && label.toLowerCase().includes('matched status')) {
          options = ['Matched', 'Not Matched']
        }
        parsedFields.push({
          id,
          label,
          options,
          placeholder: ctrl.placeholder || '',
          question: `What is the ${label}?`,
          rawControl: ctrl,
          required,
          tipExample: ctrl.example || ctrl.placeholder || undefined,
          type: options ? 'select' : type.includes('date') ? 'date' : 'text',
        })
      }
    })
    console.log('fields for the json', parsedFields, parsedDocs, target, panels)
    return { docs: parsedDocs, fields: parsedFields, panels }
  }

  const handleFieldChange = (jsonId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [jsonId]: value }))
  }

  const getColumnSize = (size: string) => {
    switch (size) {
      case 'col-12':
        return 'w-full'
      case 'col-6':
        return 'w-1/2'
      case 'col-3':
        return 'w-1/3'
      default:
        return 'w-full'
    }
  }

  const getOptions = (control: any) => {
    const optionType = control.settings?.specific?.optionsType
    if (optionType === 'CUSTOM') {
      const splitType = control.settings.specific.separateOptionsUsing
      if (splitType === 'COMMA') {
        return control.settings.specific.customOptions
          .split(',')
          .map((option: any) => ({ id: option, name: option }))
      } else if (splitType === 'NEWLINE') {
        return control.settings.specific.customOptions
          .split('\n')
          .map((option: any) => ({ id: option, name: option }))
      }
      return []
    } else if (optionType === 'DYNAMIC') {
      return control.settings.specific.options || []
    }
    return []
  }

  const renderField = (control: any) => {
    if (!control) return null
    const id = String(
      control.jsonId || control.id || control.name || control.columnName,
    )
    const isMatchedStatus = control.label
      ?.toLowerCase()
      .includes('matched status')

    if (control.type === 'SHORT_TEXT' && isMatchedStatus) {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <div className='flex h-[38px] w-full items-center gap-2 rounded-lg border border-[var(--green-4)] bg-[var(--green-1)] px-3'>
            <div className='h-2 w-2 rounded-full bg-[var(--green-9)]'></div>
            <span className='text-[13px] font-medium text-[var(--green-11)]'>
              {answers[id] || 'Fully Matched'}
            </span>
          </div>
        </div>
      )
    }

    if (
      control.type === 'SHORT_TEXT' ||
      control.type === 'CURRENCY' ||
      control.type === 'NUMBER' ||
      control.type === 'EMAIL' ||
      !control.type
    ) {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputText
            className='w-full'
            value={answers[id] || ''}
            styles={{
              input: {
                backgroundColor: 'white',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            onChange={(value) => handleFieldChange(id, value)}
          />
        </div>
      )
    }

    if (control.type === 'SINGLE_SELECT') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputSelect
            className='w-full'
            options={getOptions(control)}
            styles={{
              input: {
                backgroundColor: 'white',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            value={
              getOptions(control)?.find((opt: any) => opt.id === answers[id]) ||
              null
            }
            onChange={(opt) => handleFieldChange(id, opt ? opt.id : null)}
          />
        </div>
      )
    }

    if (control.type === 'DATE') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputDate
            className='w-full'
            value={answers[id] ? answers[id] : null}
            styles={{
              input: {
                backgroundColor: 'white',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            onChange={(value: string | null) => handleFieldChange(id, value)}
          />
        </div>
      )
    }

    if (control.type === 'LONG_TEXT') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputTextarea
            className='w-full'
            rows={3}
            value={answers[id] || ''}
            styles={{
              input: {
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-default)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
              },
            }}
            onChange={(value) => handleFieldChange(id, value)}
          />
        </div>
      )
    }

    if (control.type === 'TABLE') {
      return (
        <div className='mt-2 w-full pr-4 pb-4'>
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>
            {control.label}
          </div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-surface'>
            <table className='w-full text-left text-xs'>
              <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-0)]'>
                <tr>
                  {control.settings?.specific?.tableColumns?.map(
                    (column: any, index: number) => (
                      <th
                        className='px-5 py-4 text-[10px] font-bold tracking-widest whitespace-nowrap text-[var(--gray-10)] uppercase'
                        key={index}
                      >
                        {column.label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--gray-3)]'>
                {(answers[id] || []).map((row: any, rowIndex: number) => (
                  <tr
                    className='transition-colors hover:bg-[var(--gray-1)]'
                    key={rowIndex}
                  >
                    {control.settings?.specific?.tableColumns?.map(
                      (column: any, colIndex: number) => (
                        <td
                          className='px-5 py-4 text-[12px] font-semibold whitespace-nowrap text-[var(--gray-13)]'
                          key={colIndex}
                        >
                          {row[column.id] ||
                            row[column.label] ||
                            row[column.name]}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (control.type === 'DYNAMIC_TABLE') {
      const data = answers[id] ? answers[id] : []
      let columns: any[] = []
      if (data.length > 0) {
        columns = Object.keys(data[0])
      }
      if (columns.length === 0) return null
      return (
        <div className='mt-2 w-full pr-4 pb-4'>
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>
            {control.label}
          </div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-surface'>
            <table className='w-full text-left text-xs'>
              <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-0)]'>
                <tr>
                  {columns?.map((column: any, index: number) => (
                    <th
                      className='px-5 py-4 text-[10px] font-bold tracking-widest whitespace-nowrap text-[var(--gray-10)] uppercase'
                      key={index}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--gray-3)]'>
                {(data || []).map((row: any, rowIndex: number) => (
                  <tr
                    className='transition-colors hover:bg-[var(--gray-1)]'
                    key={rowIndex}
                  >
                    {columns?.map((column: any, colIndex: number) => (
                      <td className='px-2 py-2' key={colIndex}>
                        <InputText
                          className='w-full'
                          value={row[column] || ''}
                          styles={{
                            input: {
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border-default)',
                              borderRadius: '0.5rem',
                              color: 'var(--text-primary)',
                              height: '38px',
                            },
                          }}
                          onChange={(value: string) => {
                            const newAnswers = { ...answers }
                            if (!newAnswers[id]) newAnswers[id] = []
                            if (!newAnswers[id][rowIndex])
                              newAnswers[id][rowIndex] = {}
                            newAnswers[id][rowIndex][column] = value
                            setAnswers(newAnswers)
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (control.type === 'PARAGRAPH') {
      return (
        <div
          className='w-full pr-4 pb-4 text-[13px] text-[var(--gray-13)]'
          dangerouslySetInnerHTML={{
            __html: control.settings?.specific?.textContent,
          }}
        />
      )
    }

    if (control.type === 'LABEL') {
      return (
        <div className='w-full pr-4 pb-4 text-[13px] font-bold text-[var(--gray-13)]'>
          {control.label}
        </div>
      )
    }

    if (control.type === 'DIVIDER') {
      return <div className='my-2 mr-4 h-px w-full bg-[var(--gray-3)]'></div>
    }

    return null
  }

  // Start a specific workflow
  const initiateWorkflow = async (workflow: WorkflowSummary) => {
    setActiveWorkflow(workflow)
    setMode('collecting')
    setAnswers({})
    setDocsMap({})
    setTicketId(null)

    // Add assistant intro message
    setMessages((prev) => [
      ...prev,
      {
        htmlContent: `Great — I can help you start the <strong>${workflow.name}</strong> workflow. Let's gather the required details.`,
        id: `msg-${Date.now()}-intro`,
        sender: 'assistant',
      },
    ])

    setIsTyping(true)

    try {
      // Fetch detailed workflow & formJson from API
      const detailRes = await workflowsApiV6.getWorkflowById(workflow.id)
      let formJsonData = detailRes.data?.formJson

      const wFormId =
        detailRes.data?.formId ||
        detailRes.data?.wFormId ||
        detailRes.data?.settings?.general?.initiateUsing?.formId

      if (wFormId && !formJsonData) {
        const formRes = await formApi.getFormDataById(String(wFormId))
        if (formRes?.data) {
          formJsonData = formRes.data.formJson ?? formRes.data
        }
      }

      let {
        docs: parsedD,
        fields: parsedF,
        panels: parsedP,
      } = parseFormJson(formJsonData)

      // Fallback default form fields for standard workflows if formJson is empty
      if (parsedF.length === 0) {
        if (workflow.name.toLowerCase().includes('vendor')) {
          parsedF = [
            {
              id: 'vendor_name',
              label: 'Vendor Name',
              question: 'What is the vendor / company name?',
              required: true,
              tipExample: 'Acme Technologies',
              type: 'text',
            },
            {
              id: 'vendor_type',
              label: 'Vendor Type',
              options: ['IT Services', 'Consulting', 'Hardware', 'Other'],
              question: 'What type of vendor is this?',
              required: true,
              type: 'select',
            },
            {
              id: 'contact_person',
              label: 'Contact Person',
              question: 'Who is the primary contact person?',
              required: true,
              tipExample: 'John Smith',
              type: 'text',
            },
            {
              id: 'contact_email',
              label: 'Contact Email',
              question: 'What is the contact email?',
              required: true,
              tipExample: 'john@acme.com',
              type: 'text',
            },
            {
              id: 'currency',
              label: 'Currency',
              options: ['USD', 'INR', 'EUR', 'GBP'],
              question: 'Which currency will be used?',
              required: true,
              type: 'select',
            },
            {
              id: 'payment_terms',
              label: 'Payment Terms',
              options: ['Net 15', 'Net 30', 'Net 45', 'Net 60'],
              question: 'What are the payment terms?',
              required: false,
              type: 'select',
            },
          ]
          parsedD = [
            {
              accept: '.pdf,.doc,.docx,.png,.jpg',
              id: 'registration_cert',
              label: 'Registration Certificate',
              required: true,
            },
            {
              accept: '.pdf,.doc,.docx',
              id: 'tax_cert',
              label: 'Tax Certificate',
              required: true,
            },
          ]
        } else if (
          workflow.name.toLowerCase().includes('payable') ||
          workflow.name.toLowerCase().includes('invoice')
        ) {
          parsedF = [
            {
              id: 'po_number',
              label: 'PO Number',
              question: "What's the PO number this invoice matches against?",
              required: true,
              tipExample: 'PO-44210',
              type: 'text',
            },
            {
              id: 'invoice_amount',
              label: 'Invoice Amount',
              question: "What's the invoice amount?",
              required: true,
              tipExample: '48000',
              type: 'text',
            },
            {
              id: 'currency',
              label: 'Currency',
              options: ['USD', 'INR', 'EUR', 'GBP'],
              question: 'Which currency is this invoice in?',
              required: false,
              type: 'select',
            },
          ]
          parsedD = [
            {
              accept: '.pdf,.png,.jpg',
              id: 'invoice_file',
              label: 'Invoice Upload',
              required: true,
            },
          ]
        } else {
          parsedF = [
            {
              id: 'request_title',
              label: 'Request Title',
              question: 'What is the title for this request?',
              required: true,
              tipExample: 'New Equipment Procurement',
              type: 'text',
            },
            {
              id: 'department',
              label: 'Department',
              options: ['IT', 'Finance', 'Operations', 'Sales', 'HR'],
              question: 'Which department is this for?',
              required: true,
              type: 'select',
            },
            {
              id: 'priority',
              label: 'Priority',
              options: ['Low', 'Medium', 'High', 'Urgent'],
              question: 'What is the priority level?',
              required: false,
              type: 'select',
            },
            {
              id: 'description',
              label: 'Description',
              question: 'Please provide details or description:',
              required: true,
              tipExample: 'Purchase of 10 laptops for new engineering team',
              type: 'text',
            },
          ]
          parsedD = [
            {
              accept: '.pdf,.doc,.docx,.png,.jpg',
              id: 'support_doc',
              label: 'Supporting Document',
              required: false,
            },
          ]
        }
      }

      if ((!parsedP || parsedP.length === 0) && parsedF.length > 0) {
        parsedP = [
          {
            fields: parsedF.map((f) => ({
              id: f.id,
              label: f.label,
              type: f.type === 'select' ? 'SINGLE_SELECT' : f.type,
              settings: f.options
                ? {
                  specific: {
                    customOptions: f.options.join(','),
                    optionsType: 'CUSTOM',
                    separateOptionsUsing: 'COMMA',
                  },
                }
                : {},
            })),
            settings: { title: 'Workflow Details' },
          },
        ]
      }

      setFields(parsedF)
      setPanels(parsedP || [])
      setDocuments(parsedD)

      // Ask first field or doc
      const firstF = parsedF[0]
      const firstD = parsedD[0]
      const isPayable =
        workflow.name.toLowerCase().includes('payable') ||
        workflow.name.toLowerCase().includes('invoice')

      if (isPayable && firstD) {
        setAwaitingDoc(firstD)
        setAwaitingField(null)
        setMessages((prev) => [
          ...prev,
          {
            htmlContent: `Please attach the <strong>${firstD.label}</strong>. You can upload a file or select from existing files.`,
            id: `msg-${Date.now()}-doc`,
            sender: 'assistant',
            uploadCardDoc: firstD,
          },
        ])
      } else if (firstF) {
        setAwaitingField(firstF)
        setAwaitingDoc(null)
        setMessages((prev) => [
          ...prev,
          {
            htmlContent: firstF.question || `What is the ${firstF.label}?`,
            id: `msg-${Date.now()}-q`,
            pills: firstF.options,
            sender: 'assistant',
            showDatePicker: firstF.type === 'date' || firstF.type === 'DATE',
            tableField:
              String(firstF.type)
                .toLowerCase()
                .match(/table|grid|subform|lineitem/) ||
                String(firstF.rawControl?.type)
                  .toLowerCase()
                  .match(/table|grid|subform|lineitem/) ||
                String(firstF.label)
                  .toLowerCase()
                  .match(/table|line item|lineitem/) ||
                String(firstF.rawControl?.name)
                  .toLowerCase()
                  .match(/table|line item|lineitem/)
                ? firstF
                : undefined,
            tipText: firstF.tipExample
              ? `Type your answer in the box below — e.g. ${firstF.tipExample}.`
              : 'Type your answer in the box below.',
          },
        ])
      } else if (firstD) {
        setAwaitingDoc(firstD)
        setMessages((prev) => [
          ...prev,
          {
            htmlContent: `Please attach the ${firstD.label}. You can upload a file or select from existing files.`,
            id: `msg-${Date.now()}-doc`,
            sender: 'assistant',
            uploadCardDoc: firstD,
          },
        ])
      }
    } catch (err) {
      console.error('Error initiating workflow schema:', err)
    } finally {
      setIsTyping(false)
    }
  }

  // Step through workflow answers
  const handleAnswerSubmit = async (
    value: string,
    explicitField?: ParsedField,
  ) => {
    const fieldToAnswer = explicitField || awaitingField
    if (!activeWorkflow || !fieldToAnswer) return

    const updatedAnswers = { ...answers, [fieldToAnswer.id]: value }
    setAnswers(updatedAnswers)
    setAwaitingField(null)

    // User message
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-user`,
        sender: 'user',
        textContent: value,
      },
    ])

    // Acknowledge answer
    setMessages((prev) => [
      ...prev,
      {
        htmlContent: `Thanks — <strong>${fieldToAnswer.label}</strong>: ${value}.`,
        id: `msg-${Date.now()}-ack`,
        sender: 'assistant',
      },
    ])

    setIsTyping(true)

    // Use Gemini or Fallback to determine next step
    const stepResult = await processWorkflowChatStepWithGemini({
      currentAnswers: updatedAnswers,
      currentDocs: docsMap,
      documents,
      fields,
      userMessage: value,
      workflowName: activeWorkflow.name,
    })

    setIsTyping(false)

    // Check next field or doc
    const remainingF = fields.filter((f) => updatedAnswers[f.id] === undefined)
    const remainingD = documents.filter((d) => !docsMap[d.id])
    const isPayable =
      activeWorkflow?.name?.toLowerCase().includes('payable') ||
      activeWorkflow?.name?.toLowerCase().includes('invoice')

    if (isPayable && remainingD.length > 0) {
      const nextD = remainingD[0]
      setAwaitingDoc(nextD)
      setAwaitingField(null)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Please attach the <strong>${nextD.label}</strong>. You can upload a file or choose from your document library.`,
          id: `msg-${Date.now()}-nextD`,
          sender: 'assistant',
          uploadCardDoc: nextD,
        },
      ])
    } else if (remainingF.length > 0) {
      let nextF = fields.find((f) => f.id === stepResult.nextFieldId)
      if (!nextF || updatedAnswers[nextF.id] !== undefined) {
        // Fallback: Try to infer the field from the AI's reply text
        let inferredF = remainingF.find(
          (f) =>
            stepResult.reply &&
            stepResult.reply
              .toLowerCase()
              .includes(String(f.label).toLowerCase()),
        )

        // If the AI explicitly mentions 'line item' or 'table', find the next available table field
        if (
          !inferredF &&
          stepResult.reply &&
          stepResult.reply.toLowerCase().match(/table|line item|lineitem/)
        ) {
          inferredF = remainingF.find(
            (f) =>
              String(f.type)
                .toLowerCase()
                .match(/table|grid|subform|lineitem/) ||
              String(f.rawControl?.type)
                .toLowerCase()
                .match(/table|grid|subform|lineitem/) ||
              String(f.label)
                .toLowerCase()
                .match(/table|line item|lineitem/) ||
              String(f.rawControl?.name)
                .toLowerCase()
                .match(/table|line item|lineitem/),
          )
        }

        nextF = inferredF || remainingF[0]
      }

      setAwaitingField(nextF)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent:
            nextF.question || stepResult.reply || `What is the ${nextF.label}?`,
          id: `msg-${Date.now()}-nextF`,
          pills: nextF.options,
          sender: 'assistant',
          showDatePicker: nextF.type === 'date' || nextF.type === 'DATE',
          tableField:
            String(nextF.type)
              .toLowerCase()
              .match(/table|grid|subform|lineitem/) ||
              String(nextF.rawControl?.type)
                .toLowerCase()
                .match(/table|grid|subform|lineitem/) ||
              String(nextF.label)
                .toLowerCase()
                .match(/table|line item|lineitem/) ||
              String(nextF.rawControl?.name)
                .toLowerCase()
                .match(/table|line item|lineitem/)
              ? nextF
              : undefined,
          tipText: nextF.tipExample
            ? `Type your answer in the box below — e.g. ${nextF.tipExample}.`
            : stepResult.tipText,
        },
      ])
    } else if (remainingD.length > 0) {
      const nextD = remainingD[0]
      setAwaitingDoc(nextD)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Please attach the <strong>${nextD.label}</strong>. You can upload a file or choose from your document library.`,
          id: `msg-${Date.now()}-nextD`,
          sender: 'assistant',
          uploadCardDoc: nextD,
        },
      ])
    } else {
      setMode('review')
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `All set! I've collected everything needed for your <strong>${activeWorkflow.name}</strong> request. Ready to submit?`,
          id: `msg-${Date.now()}-review`,
          pills: ['Review & Submit', 'Make changes'],
          sender: 'assistant',
        },
      ])
    }
  }

  // Handle document upload
  const handleDocumentAttached = async (
    doc: ParsedDoc,
    fileName: string,
    fileObj?: File,
  ) => {
    const updatedDocs = { ...docsMap, [doc.id]: fileName }
    setDocsMap(updatedDocs)
    setAwaitingDoc(null)

    setMessages((prev) => [
      ...prev,
      {
        htmlContent: `I've received <strong>${fileName}</strong>. ${doc.label} attached.`,
        id: `msg-${Date.now()}-doc-ack`,
        sender: 'assistant',
      },
    ])

    setIsTyping(true)

    const updatedAnswers = { ...answers }

    const isPayable =
      activeWorkflow?.name?.toLowerCase().includes('payable') ||
      activeWorkflow?.name?.toLowerCase().includes('invoice')
    if (fileObj && isPayable) {
      try {
        setMessages((prev) => [
          ...prev,
          {
            htmlContent: `Processing the document. This might take a moment...`,
            id: `msg-${Date.now()}-processing`,
            sender: 'assistant',
          },
        ])

        setTypingText('Setting up...')

        const formData = new FormData()
        formData.append('file', fileObj)
        formData.append('context', '')
        formData.append('envType', 'trial')

        const startRes = await workflowsApiV6.startWorkflow(
          activeWorkflow?.id || 'accounts_payable',
          formData,
        )

        if (startRes.data && startRes.data.instanceId) {
          const instanceId = startRes.data.instanceId

          let foundData = false
          let attempts = 0
          while (!foundData && attempts < 12) {
            setTypingText('Setting up...')
            await new Promise((resolve) => setTimeout(resolve, 10000))
            attempts++

            const inboxRes = await workflowsApiV6.getInboxList(
              activeWorkflow?.id || 'accounts_payable',
              1,
              5,
              instanceId,
            )
            if (
              inboxRes.data &&
              inboxRes.data.items &&
              inboxRes.data.items.length > 0
            ) {
              const item = inboxRes.data.items[0]
              const currentStage = item.stage || item.activityName || item.status || 'Finalizing Results...'
              setTypingText(currentStage)

              if (item.formData) {
                let formDataObj: any = {}
                try {
                  formDataObj = JSON.parse(item.formData)
                } catch (e) { }

                let nonEmptyCount = 0
                Object.values(formDataObj).forEach((v) => {
                  if (v !== undefined && v !== null && String(v).trim() !== '') {
                    nonEmptyCount++
                  }
                })

                if (nonEmptyCount >= 2) {
                  foundData = true
                  Object.entries(formDataObj).forEach(([k, v]) => {
                    const field = fields.find(
                      (f) =>
                        f.id === k ||
                        f.rawControl?.jsonId === k ||
                        f.rawControl?.id === k,
                    )
                    if (field && v !== undefined && v !== null && v !== '') {
                      let val = v
                      if (
                        typeof v === 'string' &&
                        (v.startsWith('[') || v.startsWith('{'))
                      ) {
                        try {
                          val = JSON.parse(v)
                        } catch (e) { }
                      }
                      updatedAnswers[field.id] = val
                    }
                  })
                  setAnswers(updatedAnswers)
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('OCR Extraction failed:', err)
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600))
    }

    setIsTyping(false)
    setTypingText(null)
    const remainingF = fields.filter((f) => updatedAnswers[f.id] === undefined)
    const remainingD = documents.filter((d) => !updatedDocs[d.id])

    if (isPayable && remainingD.length > 0) {
      const nextD = remainingD[0]
      setAwaitingDoc(nextD)
      setAwaitingField(null)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Please attach the <strong>${nextD.label}</strong>.`,
          id: `msg-${Date.now()}-nextD`,
          sender: 'assistant',
          uploadCardDoc: nextD,
        },
      ])
    } else if (remainingF.length > 0) {
      const nextF = remainingF[0]
      setAwaitingField(nextF)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: nextF.question || `What is the ${nextF.label}?`,
          id: `msg-${Date.now()}-nextF`,
          pills: nextF.options,
          sender: 'assistant',
        },
      ])
    } else if (remainingD.length > 0) {
      const nextD = remainingD[0]
      setAwaitingDoc(nextD)
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Please attach the <strong>${nextD.label}</strong>.`,
          id: `msg-${Date.now()}-nextD`,
          sender: 'assistant',
          uploadCardDoc: nextD,
        },
      ])
    } else {
      setMode('review')
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `All set! I've collected everything needed for your <strong>${activeWorkflow?.name}</strong> request. Ready to submit?`,
          id: `msg-${Date.now()}-review`,
          pills: ['Review & Submit', 'Make changes'],
          sender: 'assistant',
        },
      ])
    }
  }

  // Submit Workflow to Backend API
  const handleWorkflowSubmit = async () => {
    if (!activeWorkflow) return
    setSubmitting(true)

    const generatedId =
      'WF-' +
      new Date().getFullYear() +
      '-' +
      Math.floor(100000 + Math.random() * 899999)

    try {
      // Build FormData payload for startWorkflow API call
      const formData = new FormData()
      formData.append('workflowId', activeWorkflow.id)
      formData.append('ticketId', generatedId)

      Object.entries(answers).forEach(([k, v]) => {
        formData.append(k, String(v))
      })

      // Real API initiation call
      await workflowsApiV6.startWorkflow(activeWorkflow.id, formData)
    } catch (err) {
      console.warn('Real API workflow submit fallback:', err)
    } finally {
      setTicketId(generatedId)
      setMode('submitted')
      setSubmitting(false)

      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `<strong>Submitted!</strong> Your ${activeWorkflow.name} request is now <strong>${generatedId}</strong> — status: <span style="color:#16a34a; font-weight:700;">Submitted</span>. You can track it anytime by asking me.`,
          id: `msg-${Date.now()}-submitted`,
          pills: ['Start another workflow', 'Show my pending requests'],
          sender: 'assistant',
        },
      ])
    }
  }

  // Process User message from input box
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim()
    if (!text) return

    setInputText('')

    // If currently awaiting text field answer
    if (awaitingField && mode === 'collecting') {
      handleAnswerSubmit(text)
      return
    }

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-user`,
        sender: 'user',
        textContent: text,
      },
    ])

    setIsTyping(true)

    // If review state
    if (mode === 'review') {
      setIsTyping(false)
      if (/submit|yes|proceed|review/i.test(text)) {
        handleWorkflowSubmit()
      } else {
        setMessages((prev) => [
          ...prev,
          {
            htmlContent: `No problem — tell me what you'd like to change, e.g. "change the currency to EUR".`,
            id: `msg-${Date.now()}-change`,
            sender: 'assistant',
          },
        ])
      }
      return
    }

    // Use Gemini AI to match intent or reply
    const matchRes = await matchWorkflowWithGemini(text, workflowsList)
    setIsTyping(false)

    if (matchRes.matchedWorkflowId) {
      const targetWf = workflowsList.find(
        (w) => w.id === matchRes.matchedWorkflowId,
      )
      if (targetWf) {
        initiateWorkflow(targetWf)
        return
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        htmlContent: matchRes.reply,
        id: `msg-${Date.now()}-res`,
        pills: matchRes.suggestedPills,
        sender: 'assistant',
      },
    ])
  }

  // Handle Pill selection
  const handlePillClick = (msgId: string, label: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, selectedPill: label } : m)),
    )
    if (label === 'Review & Submit') {
      handleWorkflowSubmit()
      return
    }
    if (label === 'Make changes') {
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Tell me what field you'd like to edit (e.g., "change Vendor Name to Acme Corp").`,
          id: `msg-${Date.now()}-edit`,
          sender: 'assistant',
        },
      ])
      return
    }
    if (
      label === 'Initiate workflow' ||
      label === 'Start another workflow' ||
      label === 'Browse workflows'
    ) {
      setActiveWorkflow(null)
      setMode('idle')
      setAnswers({})
      setDocsMap({})
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Which workflow would you like to start?`,
          id: `msg-${Date.now()}-choices`,
          pills: workflowsList.map((w) => w.name),
          sender: 'assistant',
        },
      ])
      return
    }
    if (label === 'Show my pending requests') {
      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `Which workflow would you like to see the pending requests for?`,
          id: `msg-${Date.now()}-pending-choices`,
          pills: workflowsList.map((w) => w.name),
          sender: 'assistant',
        },
      ])
      return
    }

    if (msgId === 'msg-init-pending-choices' || msgId.includes('-pending-choices')) {
      const matchedWf = workflowsList.find(
        (w) => w.name === label || label.includes(w.name),
      )

      setMessages((prev) => [
        ...prev,
        {
          htmlContent: `You have 2 active requests for <strong>${matchedWf ? matchedWf.name : label}</strong>:<br><br>
            <strong>WF-2026-001245</strong> — Vendor Registration — <span style="color:#8300E6; font-weight:600;">Pending Approval</span><br>
            <strong>WF-2026-001231</strong> — Accounts Payable — <span style="color:#8300E6; font-weight:600;">Action Required</span>`,
          id: `msg-${Date.now()}-pending`,
          sender: 'assistant',
        },
      ])
      return
    }

    // Check if pill matches a workflow name
    const matchedWf = workflowsList.find(
      (w) => w.name === label || label.includes(w.name),
    )
    if (matchedWf) {
      initiateWorkflow(matchedWf)
      return
    }

    // Otherwise submit as field answer
    if (awaitingField) {
      handleAnswerSubmit(label)
    } else {
      handleSendMessage(label)
    }
  }

  // Progress computation
  const totalItems = fields.length + documents.length
  const completedItems =
    fields.filter((f) => answers[f.id] !== undefined).length +
    documents.filter((d) => !!docsMap[d.id]).length
  const progressPct =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  if (loadingWorkflows) {
    return (
      <div className='flex h-[calc(100vh-64px)] w-full items-center justify-center bg-surface'>
        <div className='flex gap-1 rounded-2xl border border-gray-5 bg-surface px-4 py-3'>
          <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9' />
          <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9 [animation-delay:0.15s]' />
          <span className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9 [animation-delay:0.3s]' />
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-surface font-sans text-gray-12'>
      {/* ---------------- Assistant panel header ---------------- */}
      {!embedded && (
        <div
          className='flex flex-shrink-0 items-center justify-between border-b border-gray-5 bg-surface px-5 py-3'
          id='assistant-header'
        >
          <div className='flex items-center gap-3'>
            <IconButton
              ariaLabel={'Back'}
              color='gray'
              icon='lucide:arrow-left'
              size='md'
              variant='ghost'
              onClick={() => window.history.back()}
            />
            <div>
              <div className='text-sm leading-tight font-bold text-gray-12'>
                Workflow Assistant
              </div>
              <div
                className={`text-xs font-medium ${activeWorkflow ? 'font-semibold text-primary-9' : 'text-gray-11'}`}
              >
                {activeWorkflow ? activeWorkflow.name : 'Ready to help'}
              </div>
            </div>
          </div>
          <button
            className='inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-5 bg-surface px-3 py-1.5 text-xs font-semibold text-gray-11 transition hover:bg-gray-2'
            onClick={() => setContextVisible(!contextVisible)}
          >
            <svg
              fill='none'
              height='14'
              stroke='currentColor'
              strokeWidth='1.8'
              viewBox='0 0 24 24'
              width='14'
            >
              <rect height='16' rx='2' width='18' x='3' y='4' />
              <path d='M14 4v16' />
            </svg>
            <span>
              {(embedded ? isExpanded : contextVisible)
                ? 'Hide context'
                : 'Show context'}
            </span>
          </button>
        </div>
      )}

      {/* ---------------- Body: chat + context ---------------- */}
      <div className='flex flex-1 overflow-hidden' id='body'>
        {/* Chat Column */}
        <div
          className='flex min-w-0 flex-1 flex-col overflow-hidden'
          id='chat-col'
        >
          <div
            className='flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5'
            ref={chatScrollRef}
          >
            {messages.map((msg) => {
              if (msg.sender === 'user') {
                return (
                  <div className='flex justify-end' key={msg.id}>
                    <div className='max-w-[420px] rounded-2xl rounded-tr-sm bg-primary-9 px-5 py-3 text-[13.5px] leading-relaxed font-medium text-white shadow-md shadow-primary-9/20'>
                      {msg.textContent}
                    </div>
                  </div>
                )
              }

              return (
                <React.Fragment key={msg.id}>
                  <div className='flex max-w-[640px] items-start gap-3'>
                    <div className='mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-primary-1 text-primary-9 border border-primary-3/60 shadow-xs'>
                      <Bot className='h-4.5 w-4.5' />
                    </div>
                    <div
                      className='rounded-2xl rounded-tl-sm border border-gray-4/50 bg-gray-2 px-5 py-3.5 text-[13.5px] leading-relaxed text-gray-12 shadow-sm'
                      dangerouslySetInnerHTML={{
                        __html: msg.htmlContent || '',
                      }}
                    />
                  </div>

                  {/* Optional Tip pill */}
                  {msg.tipText && (
                    <div className='-mt-1.5 ml-[40px]'>
                      <span className='inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#fed7aa] bg-[#fff7ed] px-3 py-1 text-xs font-medium text-[#c2410c]'>
                        💡 {msg.tipText}
                      </span>
                    </div>
                  )}

                  {/* Document Upload Card */}
                  {msg.uploadCardDoc && (
                    <div className='-mt-0.5 ml-[40px] max-w-[420px] rounded-2xl border border-gray-5 bg-surface p-4 shadow-xs'>
                      <div className='mb-3 flex items-center justify-between'>
                        <span className='text-sm font-bold text-gray-12'>
                          {msg.uploadCardDoc.label}
                          {msg.uploadCardDoc.required && (
                            <span className='text-red-500 ml-0.5'>*</span>
                          )}
                        </span>
                        <span className='rounded bg-gray-3 px-2 py-0.5 text-[10px] font-bold tracking-wider text-gray-9 uppercase'>
                          {msg.uploadCardDoc.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <div
                        className='border-1.5 cursor-pointer rounded-xl border-dashed border-gray-7 p-6 text-center transition hover:border-primary-9 hover:bg-primary-2'
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className='mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary-1 text-primary-9'>
                          <Upload className='h-4 w-4' />
                        </div>
                        <div className='mb-0.5 text-xs font-bold text-gray-12'>
                          Drag & drop your document here
                        </div>
                        <div className='text-[11px] text-gray-9'>
                          or click to browse ·{' '}
                          {msg.uploadCardDoc.accept || '.pdf,.jpg,.png'}
                        </div>
                        <input
                          accept={msg.uploadCardDoc.accept}
                          className='hidden'
                          ref={fileInputRef}
                          type='file'
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleDocumentAttached(
                                msg.uploadCardDoc!,
                                e.target.files[0].name,
                                e.target.files[0],
                              )
                            }
                          }}
                        />
                      </div>
                      <button
                        className='mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-5 bg-surface p-2 text-xs font-semibold text-gray-12 transition hover:bg-gray-2'
                        onClick={() =>
                          handleDocumentAttached(
                            msg.uploadCardDoc!,
                            'EZOFIS_Specification_Document.pdf',
                          )
                        }
                      >
                        <FileText className='h-3.5 w-3.5 text-gray-11' />
                        Choose from existing documents
                      </button>
                    </div>
                  )}

                  {/* Options List */}
                  {msg.pills && msg.pills.length > 0 && (
                    <div className='-mt-1 ml-[40px] flex flex-wrap gap-2'>
                      {msg.pills.map((pill, idx) => {
                        const isSelected = msg.selectedPill === pill
                        return (
                          <button
                            key={idx}
                            className={cn(
                              'flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition',
                              isSelected
                                ? 'cursor-default border-primary-9 bg-primary-9 text-white'
                                : 'border-primary-4 bg-surface text-primary-9 hover:bg-primary-2',
                              msg.selectedPill &&
                              !isSelected &&
                              'pointer-events-none opacity-50 grayscale',
                            )}
                            onClick={() =>
                              !msg.selectedPill && handlePillClick(msg.id, pill)
                            }
                          >

                            {pill}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Inline Date Picker */}
                  {msg.showDatePicker && !msg.selectedPill && (
                    <div className='mt-2 ml-[40px] inline-block rounded-xl border border-gray-4 bg-surface p-3 shadow-sm'>
                      <DatePicker
                        allowDeselect
                        classNames={{
                          calendarHeaderControl:
                            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50',
                          calendarHeaderLevel:
                            'text-[13px] font-semibold text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12',
                          day: 'cursor-pointer text-[13px] text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[outside]:text-gray-8 data-[outside]:opacity-100 data-[outside]:hover:text-gray-12 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white data-[today]:bg-primary-4 data-[today]:font-medium data-[today]:text-primary-11',
                          monthsListControl:
                            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white',
                          weekday: 'p-2 text-[13px] text-gray-10',
                          yearsListControl:
                            'text-gray-11 transition-colors hover:bg-gray-4 hover:text-gray-12 data-[disabled]:opacity-50 data-[selected]:!bg-primary-9 data-[selected]:!font-medium data-[selected]:!text-white',
                        }}
                        value={
                          msg.selectedPill ? new Date(msg.selectedPill) : null
                        }
                        onChange={(val: any) => {
                          if (!val || msg.selectedPill) return
                          try {
                            const d = new Date(val)
                            if (isNaN(d.getTime())) return
                            const y = d.getFullYear()
                            const m = String(d.getMonth() + 1).padStart(2, '0')
                            const day = String(d.getDate()).padStart(2, '0')
                            handlePillClick(msg.id, `${y}-${m}-${day}`)
                          } catch (e) {
                            console.error(e)
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Inline Table Widget */}
                  {msg.tableField && !msg.selectedPill && (
                    <TableInputWidget
                      field={msg.tableField}
                      onSubmit={(data) => {
                        handlePillClick(msg.id, JSON.stringify(data))
                      }}
                    />
                  )}
                </React.Fragment>
              )
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className='flex items-center gap-3'>
                <div className='mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center'>
                  <AiBrandIcon className='h-4 w-4' variant='default' />
                </div>
                <div className={cn(
                  'rounded-2xl rounded-tl-sm border border-gray-4/50 bg-gray-2 shadow-sm',
                  typingText ? 'px-5 py-3.5 text-[13.5px] leading-relaxed text-gray-12' : 'flex items-center gap-1 px-4 py-4'
                )}>
                  {typingText ? (
                    <div className='flex items-center gap-2'>
                      <div className='size-1.5 animate-ping rounded-full bg-primary-9' />
                      <span className='font-medium'>{typingText}</span>
                    </div>
                  ) : (
                    <>
                      <div
                        className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9'
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9'
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className='h-1.5 w-1.5 animate-bounce rounded-full bg-gray-9'
                        style={{ animationDelay: '300ms' }}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div
            className='flex-shrink-0 border-t border-gray-5 px-6 py-3'
            id='composer-wrap'
          >
            <div className='flex items-center gap-3'>
              <input
                className='flex-1 rounded-full border border-gray-5 px-4 py-2.5 text-[13px] outline-hidden transition placeholder:text-[12.5px] placeholder:text-gray-8 focus:border-primary-9 focus:ring-2 focus:ring-primary-9/20'
                placeholder={dynamicPlaceholder}
                type='text'
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputText.trim()) handleSendMessage()
                }}
              />
              <button
                disabled={!inputText.trim()}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${inputText.trim()
                  ? 'cursor-pointer bg-primary-9 text-white'
                  : 'cursor-not-allowed bg-gray-4 text-white'
                  }`}
                onClick={() => handleSendMessage()}
              >
                <Send className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>

        {/* Context Sidebar */}
        <div
          id='context-col'
          className={`flex w-[300px] flex-shrink-0 flex-col overflow-y-auto border-l border-gray-5 bg-surface transition-all duration-200 ${(embedded ? isExpanded : contextVisible) ? 'block' : 'hidden'
            }`}
        >
          <div className='flex items-center justify-between border-b border-gray-4 px-[18px] pt-4 pb-3'>
            <h3 className='m-0 text-sm font-bold text-gray-12'>
              Workflow Context
            </h3>
            {/* <button
              className='cursor-pointer p-1 text-gray-9 hover:text-gray-12'
              onClick={() => setContextVisible(false)}
            >
              <X className='h-4 w-4' />
            </button> */}
          </div>

          {!activeWorkflow ? (
            <div className='flex flex-1 flex-col items-center justify-center p-5 text-center'>
              <div className='mb-3 flex h-13 w-13 items-center justify-center rounded-full bg-gray-3 text-gray-9'>
                <FileText className='h-6 w-6' />
              </div>
              <div className='mb-1 text-sm font-bold text-gray-12'>
                No active workflow.
              </div>
              <div className='max-w-[200px] text-xs leading-relaxed text-gray-9'>
                Ask me to start one and I'll track progress here.
              </div>
            </div>
          ) : (
            <div className='flex flex-col gap-4 p-4'>
              <div>
                <div className='mb-1 flex items-center justify-between'>
                  <span className='text-sm font-bold text-gray-12'>
                    {activeWorkflow.name}
                  </span>
                  <span className='text-xs font-bold text-primary-9'>
                    {progressPct}%
                  </span>
                </div>
                <div className='h-1.5 overflow-hidden rounded-full bg-gray-3'>
                  <div
                    className='h-full rounded-full bg-primary-9 transition-all duration-400'
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Form Fields Section */}
              {panels && panels.length > 0 && (
                <div className='mt-2 flex flex-col gap-6'>
                  {panels.map((panel: any, panelIndex: number) => {
                    // Only show fields that are actually tracked as fillable inputs by the AI
                    const panelFields =
                      panel.fields?.filter((c: any) => {
                        const id = String(
                          c.jsonId || c.id || c.name || c.columnName,
                        )
                        return fields.some((f) => f.id === id)
                      }) || []

                    if (panelFields.length === 0) return null

                    return (
                      <div key={panelIndex}>
                        <div className='mb-3 text-[10.5px] font-bold tracking-wider text-gray-9 uppercase'>
                          {panel.settings?.title || `Section ${panelIndex + 1}`}
                        </div>
                        <div className='flex flex-col gap-2.5'>
                          {panelFields.map((ctrl: any, ctrlIndex: number) => {
                            const id = String(
                              ctrl.jsonId ||
                              ctrl.id ||
                              ctrl.name ||
                              ctrl.columnName,
                            )
                            const isDone =
                              answers[id] !== undefined && answers[id] !== ''
                            let answerText = String(answers[id] || '')
                            if (
                              typeof answers[id] === 'object' &&
                              answers[id] !== null
                            ) {
                              answerText = Array.isArray(answers[id])
                                ? `${answers[id].length} items`
                                : 'Object'
                            }

                            return (
                              <div
                                className='flex items-center justify-between gap-2 text-xs'
                                key={ctrlIndex}
                              >
                                <div className='flex min-w-0 items-center gap-2'>
                                  {isDone ? (
                                    <CheckCircle2 className='h-4 w-4 flex-shrink-0 text-green-8' />
                                  ) : (
                                    <Circle className='h-4 w-4 flex-shrink-0 text-gray-8' />
                                  )}
                                  <span
                                    className={`truncate ${isDone ? 'font-medium text-gray-12' : 'text-gray-9'}`}
                                  >
                                    {ctrl.label || ctrl.name || 'Field'}
                                  </span>
                                </div>
                                {isDone && (
                                  <span className='max-w-[110px] truncate text-right text-[11px] text-gray-9'>
                                    {answerText}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Documents Section */}
              {documents.length > 0 && (
                <div>
                  <div className='mb-2 text-[10.5px] font-bold tracking-wider text-gray-9 uppercase'>
                    Documents
                  </div>
                  <div className='flex flex-col gap-2.5'>
                    {documents.map((d) => {
                      const isDone = !!docsMap[d.id]
                      return (
                        <div
                          className='flex items-center justify-between gap-2 text-xs'
                          key={d.id}
                        >
                          <div className='flex min-w-0 items-center gap-2'>
                            {isDone ? (
                              <CheckCircle2 className='text-green-500 h-4 w-4 flex-shrink-0' />
                            ) : (
                              <Circle className='h-4 w-4 flex-shrink-0 text-gray-8' />
                            )}
                            <span
                              className={`truncate ${isDone ? 'font-medium text-gray-12' : 'text-gray-9'}`}
                            >
                              {d.label}
                            </span>
                          </div>
                          {isDone && (
                            <span className='max-w-[110px] truncate text-right text-[11px] text-gray-9'>
                              {docsMap[d.id]}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Status Row */}
              <div className='flex items-center justify-between border-t border-gray-4 pt-3 text-xs'>
                <span className='text-gray-9'>Status</span>
                <span
                  className={`font-bold ${mode === 'submitted' ? 'text-green-8' : 'text-primary-9'
                    }`}
                >
                  {mode === 'submitted'
                    ? 'Submitted'
                    : mode === 'review'
                      ? 'Ready to submit'
                      : 'Collecting information'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowChatPage
