import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import type { Option } from '@/types/option'
import IconButton from '@/components/base/button/IconButton'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import ConnectionsRouting from './common/ConnectionsRouting'
import SettingsSection from './common/SettingsSection'

const outputFormatOptions: Option[] = [
  { id: 1, name: 'PDF Document (.pdf)' },
  { id: 2, name: 'Microsoft Word Document (.docx)' },
  { id: 3, name: 'HTML Web Report (.html)' },
  { id: 4, name: 'Rich Text Format (.rtf)' },
]

const PDF_TEMPLATE_PLACEHOLDER = `{
  "name": "",
  "fields": []
}`

const readTemplateValue = (nodeData: Record<string, any>): unknown => {
  const candidates = [
    nodeData.templateJson,
    nodeData.settings?.templateJson,
    nodeData.documentGenerateAgent?.templateJson,
    nodeData.documentGenerate?.templateJson,
    nodeData.pdfTemplateJson,
    nodeData.settings?.pdfTemplateJson,
    nodeData.pdfTemplate,
    nodeData.settings?.pdfTemplate,
  ]
  return candidates.find((value) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value != null && typeof value === 'object'
  })
}

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

export default function DocumentGenerateAgentSettingsPanel({
  node: initialNode,
}: {
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = (currentNode?.data || {}) as Record<string, any>

  const [outputFormat, setOutputFormat] = useState<Option>(
    nodeData.outputFormat || outputFormatOptions[0],
  )

  // Template JSON Input State
  const [templateJson, setTemplateJson] = useState(() =>
    toTemplateJsonString(readTemplateValue(nodeData)),
  )
  const [jsonError, setJsonError] = useState('')
  const [jsonCopied, setJsonCopied] = useState(false)

  const [openBasic, setOpenBasic] = useState(true)

  const updateNodeData = (key: string, value: any) => {
    if (!currentNode) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                [key]: value,
              },
            }
          : n,
      ),
    )
  }

  // Sync state if node changes externally
  useEffect(() => {
    setTemplateJson(toTemplateJsonString(readTemplateValue(nodeData)))
    setJsonError('')
    // Reload when a different node is selected. Typing updates node data and
    // must not overwrite the field on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.id])

  const handleTemplateJsonChange = (val: string) => {
    setTemplateJson(val)
    updateNodeData('templateJson', val)
    updateNodeData('pdfTemplateJson', val)
    if (!val.trim()) {
      setJsonError('')
      return
    }
    try {
      JSON.parse(val)
      setJsonError('')
    } catch {
      setJsonError('Enter valid JSON')
    }
  }

  const handleCopyJson = async () => {
    if (!templateJson.trim()) return
    await navigator.clipboard?.writeText(templateJson)
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 1500)
  }

  return (
    <div className='flex h-full flex-col space-y-3.5 overflow-y-auto p-4 font-sans'>
      {/* Basic Configuration */}
      <SettingsSection
        icon='lucide:file-code'
        isOpen={openBasic}
        title='Document Template & Format'
        onToggle={() => setOpenBasic(!openBasic)}
      >
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <span className='block text-13 font-normal text-gray-12'>
              Output File Format
            </span>
            <InputSelect
              options={outputFormatOptions}
              value={outputFormat}
              onChange={(val) => {
                if (val) {
                  setOutputFormat(val)
                  updateNodeData('outputFormat', val)
                }
              }}
            />
          </div>

          {/* Template JSON */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-13 font-normal text-gray-12'>
                Template JSON <span className='text-red-11'>*</span>
              </span>
              <IconButton
                ariaLabel={jsonCopied ? 'Copied' : 'Copy JSON'}
                color={jsonCopied ? 'green' : 'gray'}
                disabled={!templateJson.trim()}
                icon={jsonCopied ? 'lucide:check' : 'lucide:copy'}
                size='xs'
                tooltip={jsonCopied ? 'Copied' : 'Copy JSON'}
                type='button'
                variant='ghost'
                onClick={handleCopyJson}
              />
            </div>

            <div className='[&_textarea]:!h-[220px] [&_textarea]:max-h-[220px] [&_textarea]:resize-none [&_textarea]:overflow-y-auto [&_textarea]:font-mono [&_textarea]:text-12'>
              <InputTextarea
                error={jsonError || undefined}
                placeholder={PDF_TEMPLATE_PLACEHOLDER}
                value={templateJson}
                onChange={handleTemplateJsonChange}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Connections & Routing */}
      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}
