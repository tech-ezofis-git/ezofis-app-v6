import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'

// Shared by the Text Builder editor and its read-only view. TipTap parses
// stored HTML through this schema, so tags and attributes outside it (script,
// iframe, on* handlers, ...) are dropped and never reach the DOM.
// StarterKit v3 already includes Underline and Link.
export const richTextExtensions = [
  StarterKit.configure({
    // Keep h1-h3 only, matching what the toolbar offers.
    heading: { levels: [1, 2, 3] },
    link: { openOnClick: false, autolink: true },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
]

/** HTML stored by the editor, or '' when it holds no content. */
export const emptyToBlank = (html: string, isEmpty: boolean) =>
  isEmpty ? '' : html
