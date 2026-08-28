import type { Node } from '@xyflow/react'
import { useQuery } from '@tanstack/react-query'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useMemo, useState } from 'react'
import { requestApi } from '@/api/requests/requests'
import {
  getGroupListQueryOptions,
  getUserListQueryOptions,
} from '@/api/userQueries'
import type { Option } from '@/types/option'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputCheckbox from '@/components/base/inputs/InputCheckbox'
import InputSelectMultiple from '@/components/base/inputs/InputSelectMultiple'
import InputSwitch from '@/components/base/inputs/InputSwitch'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import {
  getNodeToolType,
  NODE_TOOL_TYPE,
} from '@/pages/workflows/utils/nodeToolTypes'
import useWorkflowStore from '../../stores/useWorkflowStore'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'
import ChecklistTab from './manual-user/ChecklistTab'
import GeneralTab from './manual-user/GeneralTab'
import SecurityTab from './manual-user/SecurityTab'

const PDF_TEMPLATE_PLACEHOLDER = `{
  "name": "",
  "fields": []
}`

const toTemplateJsonString = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return value
    }
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return ''
}

export default function ManualUserSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()
  const formId = useWorkflowStore((state) => state.form)

  const { data: userData } = useQuery(getUserListQueryOptions())
  const { data: groupData } = useQuery(getGroupListQueryOptions())

  const userOptions: Option[] = useMemo(() => {
    const users = userData as any[]
    if (!users || !Array.isArray(users)) return []
    return users.map((u: any) => {
      const name =
        u.value ||
        u.name ||
        (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null) ||
        u.loginName ||
        u.displayName ||
        u.email ||
        'Unknown User'
      return {
        id: String(u.id || u.value),
        name: String(name),
      }
    })
  }, [userData])

  const groupOptions: Option[] = useMemo(() => {
    const groups = groupData as any[]
    if (!groups || !Array.isArray(groups)) return []
    return groups.map((g: any) => {
      const id = g.groupId ?? g.id ?? g.value
      return {
        id: String(id),
        name: String(g.groupName || g.name || g.value || `Group ${id}`),
      }
    })
  }, [groupData])

  // Options for form fields, used by document generation, mandatory fields,
  // dynamic-user routing, and per-user access rules.
  const [fieldOptions, setFieldOptions] = useState<Option[]>([])
  useEffect(() => {
    if (!formId) {
      setFieldOptions([])
      return
    }
    let cancelled = false
    const loadFields = async () => {
      try {
        const response = await requestApi.getForm(formId)
        if (!response?.formJson) return
        const form =
          typeof response.formJson === 'string'
            ? JSON.parse(response.formJson)
            : response.formJson
        const panels = [
          ...(form.panels || []),
          ...(form.secondaryPanels || []),
        ]
        const options: Option[] = []
        panels.forEach((panel: any) => {
          ;(panel?.fields || []).forEach((field: any) => {
            if (field.type === 'DIVIDER') return
            // Keyed by field.id to match how the Requests overview reads
            // form data (WorkflowFormRenderer/FieldRenderer key formModel
            // and onFieldChange by field.id, not field.name).
            options.push({
              id: String(field.id),
              name: field.label || field.type,
            })
          })
        })
        if (!cancelled) setFieldOptions(options)
      } catch {
        // ignore - field pickers just stay empty
      }
    }
    loadFields()
    return () => {
      cancelled = true
    }
  }, [formId])

  // Find matching node in the live nodes array to ensure reactivity
  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as Record<string, any>

  // Other Manual User nodes on the canvas, for "Acted Activity" routing
  const actorNodeOptions: Option[] = useMemo(
    () =>
      liveNodes
        .filter((n) => {
          if (n.id === currentNode?.id) return false
          const toolType = String((n.data as any)?.toolType || '').toLowerCase()
          return (
            toolType === 'manual user' ||
            toolType === 'verifier' ||
            toolType === 'actor'
          )
        })
        .map((n) => ({
          id: n.id,
          name: String((n.data as any)?.label || 'Manual User'),
        })),
    [liveNodes, currentNode?.id],
  )

  const initialSelectedUsers: Option[] = Array.isArray(nodeData.selectedUsers)
    ? nodeData.selectedUsers
    : []
  const initialSelectedGroups: Option[] = Array.isArray(nodeData.selectedGroups)
    ? nodeData.selectedGroups
    : []

  const [selectedUsers, setSelectedUsers] =
    useState<Option[]>(initialSelectedUsers)
  const [selectedGroups, setSelectedGroups] =
    useState<Option[]>(initialSelectedGroups)

  const [openBasic, setOpenBasic] = useState(true)
  const [openGeneratePdf, setOpenGeneratePdf] = useState(true)
  const [pdfTemplateJson, setPdfTemplateJson] = useState(() =>
    toTemplateJsonString(nodeData.pdfTemplateJson ?? nodeData.pdfTemplate),
  )
  const [pdfTemplateError, setPdfTemplateError] = useState('')
  const [jsonCopied, setJsonCopied] = useState(false)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    assignees: true,
  })
  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

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

  useEffect(() => {
    setPdfTemplateJson(
      toTemplateJsonString(nodeData.pdfTemplateJson ?? nodeData.pdfTemplate),
    )
    setPdfTemplateError('')
  }, [currentNode?.id])

  const persistPdfTemplate = (value: string) => {
    setPdfTemplateJson(value)
    updateNodeData('pdfTemplateJson', value)
    if (!value.trim()) {
      setPdfTemplateError('')
      return
    }
    try {
      JSON.parse(value)
      setPdfTemplateError('')
    } catch {
      setPdfTemplateError('Enter valid JSON')
    }
  }

  const copyPdfTemplate = async () => {
    if (!pdfTemplateJson.trim()) return
    await navigator.clipboard?.writeText(pdfTemplateJson)
    setJsonCopied(true)
    window.setTimeout(() => setJsonCopied(false), 1500)
  }

  // Resolve placeholders (e.g., "User 7") to actual names/emails once options are loaded
  useEffect(() => {
    if (
      userOptions.length > 0 &&
      Array.isArray(selectedUsers) &&
      selectedUsers.length > 0
    ) {
      let needsUpdate = false
      const updated = selectedUsers.map((u) => {
        const found = userOptions.find((opt) => String(opt.id) === String(u.id))
        if (found && found.name !== u.name) {
          needsUpdate = true
          return found
        }
        return u
      })
      if (needsUpdate) {
        setSelectedUsers(updated)
        updateNodeData('selectedUsers', updated)
      }
    }
  }, [userOptions, selectedUsers])

  useEffect(() => {
    if (
      groupOptions.length > 0 &&
      Array.isArray(selectedGroups) &&
      selectedGroups.length > 0
    ) {
      let needsUpdate = false
      const updated = selectedGroups.map((g) => {
        const found = groupOptions.find(
          (opt) => String(opt.id) === String(g.id),
        )
        if (found && found.name !== g.name) {
          needsUpdate = true
          return found
        }
        return g
      })
      if (needsUpdate) {
        setSelectedGroups(updated)
        updateNodeData('selectedGroups', updated)
      }
    }
  }, [groupOptions, selectedGroups])

  // Keep local mirrors in sync with external changes (undo/redo, import)
  useEffect(() => {
    if (
      nodeData.selectedUsers &&
      Array.isArray(nodeData.selectedUsers) &&
      JSON.stringify(nodeData.selectedUsers) !== JSON.stringify(selectedUsers)
    ) {
      setSelectedUsers(nodeData.selectedUsers)
    }
    if (
      nodeData.selectedGroups &&
      Array.isArray(nodeData.selectedGroups) &&
      JSON.stringify(nodeData.selectedGroups) !== JSON.stringify(selectedGroups)
    ) {
      setSelectedGroups(nodeData.selectedGroups)
    }
  }, [nodeData.selectedUsers, nodeData.selectedGroups])

  // GeneralTab reads selectedUsers/selectedGroups straight from nodeData for
  // rendering, but writes go through the local mirrors above so placeholder
  // resolution keeps working; merge the mirrors back in for display.
  const mergedNodeData = {
    ...nodeData,
    selectedUsers,
    selectedGroups,
  }

  return (
    <div className='flex h-full flex-col overflow-hidden bg-white font-inter text-gray-12'>
      <div className='flex-1 space-y-1 overflow-y-auto px-4 pt-2 pb-4'>
        <GeneralTab
          actorNodeOptions={actorNodeOptions}
          fieldOptions={fieldOptions}
          groupOptions={groupOptions}
          nodeData={mergedNodeData}
          openSections={openSections}
          userOptions={userOptions}
          updateNodeData={(key, value) => {
            if (key === 'selectedUsers') setSelectedUsers(value)
            if (key === 'selectedGroups') setSelectedGroups(value)
            updateNodeData(key, value)
          }}
          onToggleSection={toggleSection}
        />

        <SettingsSection
          icon='lucide:shield-check'
          isOpen={openSections.security ?? false}
          title='Security & Form Access'
          variant='premium'
          onToggle={() => toggleSection('security')}
        >
          <SecurityTab
            fieldOptions={fieldOptions}
            nodeData={nodeData}
            userOptions={userOptions}
            updateNodeData={updateNodeData}
          />
        </SettingsSection>

        <SettingsSection
          icon='lucide:list-checks'
          isOpen={openSections.checklist ?? false}
          title='Checklist'
          variant='premium'
          onToggle={() => toggleSection('checklist')}
        >
          <ChecklistTab nodeData={nodeData} updateNodeData={updateNodeData} />
        </SettingsSection>

        {getNodeToolType(nodeData) === NODE_TOOL_TYPE.MANUAL_USER && (
          <SettingsSection
            icon='lucide:file-text'
            isOpen={openGeneratePdf}
            title='Generate PDF'
            variant='premium'
            onToggle={() => setOpenGeneratePdf(!openGeneratePdf)}
          >
            <div className='space-y-3 rounded-xl bg-white p-4 shadow-sm'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2.5'>
                  <Icon
                    className='h-4 w-4 stroke-[2] text-gray-11'
                    name='lucide:file-text'
                  />
                  <div className='flex flex-col space-y-1'>
                    <span className='text-13 font-medium text-gray-12'>
                      Generate PDF
                    </span>
                    <span className='text-11 leading-tight text-gray-9'>
                      Generate a PDF when this step starts
                    </span>
                  </div>
                </div>
                <InputCheckbox
                  checked={Boolean(nodeData.generatePDF)}
                  onChange={(checked) =>
                    updateNodeData('generatePDF', checked)
                  }
                />
              </div>

              {Boolean(nodeData.generatePDF) && (
                <div className='animate-in fade-in slide-in-from-top-1 space-y-2 duration-200'>
                  <div className='flex items-center justify-between'>
                    <span className='text-13 font-medium text-gray-12'>
                      Form template JSON{' '}
                      <span className='text-red-11'>*</span>
                    </span>
                    <IconButton
                      ariaLabel={jsonCopied ? 'Copied' : 'Copy JSON'}
                      color={jsonCopied ? 'green' : 'gray'}
                      disabled={!pdfTemplateJson.trim()}
                      icon={jsonCopied ? 'lucide:check' : 'lucide:copy'}
                      size='xs'
                      tooltip={jsonCopied ? 'Copied' : 'Copy JSON'}
                      type='button'
                      variant='ghost'
                      onClick={copyPdfTemplate}
                    />
                  </div>
                  <div className='[&_textarea]:!h-[220px] [&_textarea]:max-h-[220px] [&_textarea]:overflow-y-auto [&_textarea]:font-mono [&_textarea]:text-12 [&_textarea]:resize-none'>
                    <InputTextarea
                      error={pdfTemplateError || undefined}
                      placeholder={PDF_TEMPLATE_PLACEHOLDER}
                      rows={10}
                      value={pdfTemplateJson}
                      onChange={persistPdfTemplate}
                    />
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

        <ConnectionsRouting node={currentNode as any} />
      </div>
    </div>
  )
}
