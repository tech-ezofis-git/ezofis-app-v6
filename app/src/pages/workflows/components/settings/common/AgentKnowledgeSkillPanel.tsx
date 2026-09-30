import type { Node } from '@xyflow/react'
import { useNodes, useReactFlow } from '@xyflow/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import Icon from '@/components/base/icon/Icon'
import InputLabel from '@/components/base/inputs/InputLabel'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import cn from '@/utils/cn'
import ConnectionsRouting from './ConnectionsRouting'
import SettingsSection from './SettingsSection'

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.png,.jpg,.jpeg'

const textAreaClassName =
  '[&_textarea]:!h-auto [&_textarea]:!min-h-[13.5rem] [&_textarea]:resize-y [&_textarea]:py-2'

export interface AgentKnowledgeSkillConfig {
  instructionPlaceholder: string
  knowledgeHint: string
  skillPlaceholder: string
}

export interface KnowledgeFile {
  name: string
  size: number
  type: string
}

interface AgentNodeData {
  instructions?: string
  knowledgeFiles?: KnowledgeFile[]
  skillFiles?: KnowledgeFile[]
  skillText?: string
}

const asAgentNodeData = (data: Node['data'] | undefined): AgentNodeData => {
  if (!data || typeof data !== 'object') return {}
  return data as AgentNodeData
}

const readFiles = (value: unknown): KnowledgeFile[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const file = item as Partial<KnowledgeFile>
    if (typeof file.name !== 'string' || !file.name) return []
    return [
      {
        name: file.name,
        size: typeof file.size === 'number' ? file.size : 0,
        type: typeof file.type === 'string' ? file.type : '',
      },
    ]
  })
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const mergeFiles = (current: KnowledgeFile[], list: FileList | null) => {
  if (!list?.length) return current
  const next = [...current]
  Array.from(list).forEach((file) => {
    const incoming = { name: file.name, size: file.size, type: file.type }
    const exists = next.some(
      (item) => item.name === incoming.name && item.size === incoming.size,
    )
    if (!exists) next.push(incoming)
  })
  return next
}

export default function AgentKnowledgeSkillPanel({
  config,
  extraSettings,
  node: initialNode,
}: {
  config: AgentKnowledgeSkillConfig
  extraSettings?: ReactNode
  node?: Node
}) {
  const { setNodes } = useReactFlow()
  const liveNodes = useNodes()

  const currentNode = initialNode
    ? liveNodes.find((n) => n.id === initialNode.id) || initialNode
    : null
  const nodeData = asAgentNodeData(currentNode?.data)

  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>(() =>
    readFiles(nodeData.knowledgeFiles),
  )
  const [skillFiles, setSkillFiles] = useState<KnowledgeFile[]>(() =>
    readFiles(nodeData.skillFiles),
  )
  const [skillText, setSkillText] = useState(nodeData.skillText || '')
  const [instructions, setInstructions] = useState(nodeData.instructions || '')

  const [openKnowledge, setOpenKnowledge] = useState(true)
  const [openSkill, setOpenSkill] = useState(false)
  const [openInstructions, setOpenInstructions] = useState(false)

  const updateNodeData = (patch: Record<string, unknown>) => {
    if (!currentNode) return
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === currentNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                ...patch,
              },
            }
          : n,
      ),
    )
  }

  useEffect(() => {
    setKnowledgeFiles(readFiles(nodeData.knowledgeFiles))
    setSkillFiles(readFiles(nodeData.skillFiles))
    setSkillText(nodeData.skillText || '')
    setInstructions(nodeData.instructions || '')
  }, [currentNode?.id, nodeData])

  return (
    <div className='flex h-full flex-col space-y-3.5 overflow-y-auto p-4 font-sans'>
      {extraSettings}
      <SettingsSection
        icon='lucide:library'
        isOpen={openKnowledge}
        title='Knowledge'
        onToggle={() => setOpenKnowledge(!openKnowledge)}
      >
        <div className='space-y-3'>
          <p className='text-12 leading-relaxed text-gray-10'>
            {config.knowledgeHint}
          </p>
          <DocumentUpload
            files={knowledgeFiles}
            onChange={(files) => {
              setKnowledgeFiles(files)
              updateNodeData({
                knowledgeFiles: files,
                knowledgeType: 'document',
              })
            }}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        icon='lucide:puzzle'
        isOpen={openSkill}
        title='Skill'
        onToggle={() => setOpenSkill(!openSkill)}
      >
        <div className='space-y-4'>
          <div className='space-y-2'>
            <InputLabel label='Attachments' />
            <DocumentUpload
              files={skillFiles}
              helperText='Add one or more files'
              onChange={(files) => {
                setSkillFiles(files)
                updateNodeData({ skillFiles: files })
              }}
            />
          </div>

          <div className={textAreaClassName}>
            <InputTextarea
              autosize={false}
              label='Skills'
              minRows={10}
              placeholder={config.skillPlaceholder}
              rows={10}
              value={skillText}
              required
              onChange={(val) => {
                setSkillText(val)
                updateNodeData({ skillText: val })
              }}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon='lucide:pencil-line'
        isOpen={openInstructions}
        title='Instruction'
        onToggle={() => setOpenInstructions(!openInstructions)}
      >
        <div className={textAreaClassName}>
          <InputTextarea
            autosize={false}
            label='Instruction'
            minRows={10}
            placeholder={config.instructionPlaceholder}
            rows={10}
            value={instructions}
            required
            onChange={(val) => {
              setInstructions(val)
              updateNodeData({ instructions: val })
            }}
          />
        </div>
      </SettingsSection>

      {currentNode && <ConnectionsRouting node={currentNode} />}
    </div>
  )
}

function DocumentUpload({
  files,
  helperText = 'PDF, Word, Excel, CSV, or image',
  onChange,
}: {
  files: KnowledgeFile[]
  helperText?: string
  onChange: (files: KnowledgeFile[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div className='space-y-3'>
      <button
        type='button'
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-4 transition-all duration-300',
          'hover:border-primary-7 hover:bg-primary-1 active:scale-[0.99]',
          isDragOver
            ? 'border-primary-9 bg-primary-2'
            : 'border-gray-4 bg-gray-1',
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragOver(false)
          onChange(mergeFiles(files, event.dataTransfer.files))
        }}
      >
        <span className='flex size-9 items-center justify-center rounded-lg bg-primary-3 text-primary-11'>
          <Icon className='size-4' name='lucide:upload' />
        </span>
        <span className='text-13 font-medium text-gray-12'>
          Drop a document here, or{' '}
          <span className='text-primary-11'>browse</span>
        </span>
        <span className='text-11 text-gray-9'>{helperText}</span>
      </button>
      <input
        accept={ACCEPTED_TYPES}
        className='hidden'
        ref={fileInputRef}
        type='file'
        multiple
        onChange={(event) => {
          onChange(mergeFiles(files, event.target.files))
          event.target.value = ''
        }}
      />

      {files.length > 0 && (
        <ul className='animate-in fade-in slide-in-from-top-1 flex flex-col gap-1.5 duration-300'>
          {files.map((file) => (
            <li
              className='flex items-center gap-2 rounded-lg border border-gray-3 bg-gray-1 px-2.5 py-2'
              key={`${file.name}-${file.size}`}
            >
              <Icon
                className='size-4 shrink-0 text-primary-11'
                name='lucide:file-text'
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-13 text-gray-12'>{file.name}</p>
                <p className='text-11 text-gray-9'>
                  {formatFileSize(file.size)}
                </p>
              </div>
              <IconButton
                ariaLabel={`Remove ${file.name}`}
                color='gray'
                icon='lucide:x'
                size='xs'
                tooltip='Remove'
                type='button'
                variant='ghost'
                onClick={() =>
                  onChange(
                    files.filter(
                      (item) =>
                        !(item.name === file.name && item.size === file.size),
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
