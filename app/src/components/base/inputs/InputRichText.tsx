import { RichTextEditor } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import cn from '@/utils/cn'
import type { InputProps } from './shared/types'
import InputLabel from './InputLabel'
import { emptyToBlank, richTextExtensions } from './richTextExtensions'

interface Props extends InputProps {
  /** HTML string. An empty editor gives ''. */
  value: string
  /** Hide the toolbar except bold, italic, underline and lists. */
  compact?: boolean
  minHeight?: number
  onChange: (value: string) => void
}

const COLORS = [
  '#000000',
  '#868e96',
  '#fa5252',
  '#e64980',
  '#be4bdb',
  '#7950f2',
  '#4c6ef5',
  '#228be6',
  '#15aabf',
  '#12b886',
  '#40c057',
  '#fab005',
  '#fd7e14',
]

const InputRichText = ({
  compact,
  description,
  disabled,
  error,
  label,
  minHeight = 160,
  optional,
  required,
  tooltip,
  tooltipWidth,
  value,
  onChange,
}: Props) => {
  // What we last sent up, so an echo of our own change doesn't reset the
  // editor (that would move the cursor while typing).
  const lastEmitted = useRef(value || '')

  const editor = useEditor({
    content: value || '',
    editable: !disabled,
    extensions: richTextExtensions,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      const html = emptyToBlank(e.getHTML(), e.isEmpty)
      lastEmitted.current = html
      onChange(html)
    },
  })

  // Pick up values set from outside: default content, saved entry, reset.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const next = value || ''
    if (next === lastEmitted.current) return
    lastEmitted.current = next
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(!disabled)
  }, [editor, disabled])

  return (
    <div className='w-full'>
      {label && (
        <InputLabel
          className='mb-2'
          label={label}
          optional={optional}
          required={required}
          tooltip={tooltip}
          tooltipWidth={tooltipWidth}
        />
      )}
      <RichTextEditor
        classNames={{
          content: 'text-13 text-gray-12',
          root: cn(
            'border-gray-4 bg-transparent',
            'focus-within:border-primary-8 focus-within:ring-2 focus-within:ring-primary-6',
            disabled && 'opacity-70',
            error && 'border-red-8 ring-2 ring-red-5',
          ),
          toolbar: 'bg-gray-2',
        }}
        editor={editor}
      >
        {!disabled && (
          <RichTextEditor.Toolbar sticky>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              {!compact && <RichTextEditor.Strikethrough />}
            </RichTextEditor.ControlsGroup>

            {!compact && (
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
              </RichTextEditor.ControlsGroup>
            )}

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>

            {!compact && (
              <>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.AlignLeft />
                  <RichTextEditor.AlignCenter />
                  <RichTextEditor.AlignRight />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.ColorPicker colors={COLORS} />
                  <RichTextEditor.Highlight />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Link />
                  <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Undo />
                  <RichTextEditor.Redo />
                </RichTextEditor.ControlsGroup>
              </>
            )}
          </RichTextEditor.Toolbar>
        )}
        <RichTextEditor.Content style={{ minHeight }} />
      </RichTextEditor>
      {error ? (
        <div className='mt-2 text-13 text-red-11'>{error}</div>
      ) : (
        description && (
          <div className='mt-2 text-13 text-gray-10'>{description}</div>
        )
      )}
    </div>
  )
}

export default InputRichText
