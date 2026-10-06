import { maskPiiValue, normalizePiiToken } from './maskPii'
import { detectPiiValues } from './detectPii'

/**
 * Convert a .docx ArrayBuffer to HTML via mammoth, then redact PII in text nodes.
 */
export const extractDocxHtml = async (buffer: ArrayBuffer): Promise<string> => {
  const mammoth = await import('mammoth')
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  return String(result?.value || '')
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const applyMasksToPlainChunk = (
  chunk: string,
  values: string[],
  visibleChars: number,
) => {
  let next = chunk
  for (const value of values) {
    const masked = maskPiiValue(value, visibleChars)
    if (!value || !masked) continue
    const digits = value.replace(/\D+/g, '')
    const mostlyDigits =
      digits.length >= 6 &&
      digits.length >= Math.floor(value.replace(/\s/g, '').length * 0.6)
    try {
      // Whole-token replace for alpha values — never INV inside INVOICE.
      const pattern = mostlyDigits
        ? escapeRegExp(value)
        : `(?<![A-Za-z0-9])${escapeRegExp(value)}(?![A-Za-z0-9])`
      next = next.replace(new RegExp(pattern, 'gi'), masked)
    } catch {
      // ignore invalid regex from odd values
    }
    if (digits.length >= 7) {
      next = next.replace(
        new RegExp(`(?<!\\d)${digits}(?!\\d)`, 'g'),
        masked,
      )
    }
  }
  return next
}

/** Mask PII in a plain-text string (txt / csv cells / etc.). */
export const redactPlainText = async (
  text: string,
  options: {
    enableNer?: boolean
    knownValues?: string[]
    visibleChars?: number
  } = {},
): Promise<string> => {
  if (!text) return text
  const values = await detectPiiValues(text, {
    enableNer: options.enableNer,
    knownValues: options.knownValues,
  })
  if (!values.length) return text
  void normalizePiiToken
  return applyMasksToPlainChunk(text, values, options.visibleChars ?? 3)
}

/**
 * Replace known / detected PII strings inside HTML text with masked labels.
 * Operates on text between tags only.
 */
export const redactHtmlText = async (
  html: string,
  options: {
    enableNer?: boolean
    knownValues?: string[]
    visibleChars?: number
  } = {},
): Promise<string> => {
  if (!html) return html
  const textOnly = html.replace(/<[^>]+>/g, ' ')
  const values = await detectPiiValues(textOnly, {
    enableNer: options.enableNer,
    knownValues: options.knownValues,
  })
  if (!values.length) return html

  const visibleChars = options.visibleChars ?? 3
  void normalizePiiToken
  return html
    .split(/(<[^>]+>)/g)
    .map((chunk) => {
      if (!chunk || chunk.startsWith('<')) return chunk
      return applyMasksToPlainChunk(chunk, values, visibleChars)
    })
    .join('')
}
