import type { TextBox } from './types'

/**
 * Measure react-pdf-viewer text-layer spans into page-% boxes.
 * Uses the same getBoundingClientRect approach as @react-pdf-viewer/search,
 * so overlays align with the visible glyphs at any zoom.
 */
export const measureTextLayerBoxes = (
  textLayerEle: HTMLElement,
  pageIndex: number,
): { boxes: TextBox[]; pageText: string } => {
  const layerRect = textLayerEle.getBoundingClientRect()
  const pageWidth = layerRect.width
  const pageHeight = layerRect.height
  if (pageWidth <= 0 || pageHeight <= 0) {
    return { boxes: [], pageText: '' }
  }

  const spans = textLayerEle.querySelectorAll(
    '.rpv-core__text-layer-text, span[role="presentation"]',
  )
  const boxes: TextBox[] = []
  const chunks: string[] = []

  spans.forEach((node) => {
    const text = String(node.textContent || '').trim()
    if (!text) return
    const rect = (node as HTMLElement).getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    boxes.push({
      height: (100 * rect.height) / pageHeight,
      left: (100 * (rect.left - layerRect.left)) / pageWidth,
      pageIndex,
      text,
      top: (100 * (rect.top - layerRect.top)) / pageHeight,
      width: (100 * rect.width) / pageWidth,
    })
    chunks.push(text)
  })

  return { boxes, pageText: chunks.join(' ') }
}
