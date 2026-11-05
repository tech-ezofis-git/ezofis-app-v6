import { RichTextEditor } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import { useEffect } from 'react'
import cn from '@/utils/cn'
import { richTextExtensions } from './richTextExtensions'

interface Props {
  className?: string
  /** HTML saved by InputRichText. */
  html: string
}

/** True when a saved value looks like Text Builder HTML rather than plain text. */
export const looksLikeHtml = (value: unknown): value is string =>
  typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)

/**
 * Shows saved Text Builder content without dangerouslySetInnerHTML: the HTML
 * goes through TipTap's schema, which drops anything it doesn't know.
 */
const RichTextView = ({ className, html }: Props) => {
  const editor = useEditor({
    content: html || '',
    editable: false,
    extensions: richTextExtensions,
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(html || '', { emitUpdate: false })
    }
  }, [editor, html])

  return (
    <RichTextEditor
      classNames={{
        content: 'bg-transparent p-0 text-13 text-gray-12',
        root: cn('border-0 bg-transparent', className),
      }}
      editor={editor}
    >
      <RichTextEditor.Content />
    </RichTextEditor>
  )
}

export default RichTextView
