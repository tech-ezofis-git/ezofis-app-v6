export type TextBox = {
  /** 0-based page index (0 for images / single-page). */
  pageIndex: number
  text: string
  /** Percentage of page width (0–100), same space as react-pdf-viewer highlights. */
  left: number
  top: number
  width: number
  height: number
}

export type RedactionArea = TextBox & {
  maskedLabel: string
  sourceValue: string
  backgroundColor?: string
  /**
   * Box comes from exact PDF text positions (not OCR estimates): drawn with only a hairline of
   * padding so the cover does not spill onto blank paper.
   */
  precise?: boolean
}

export type PiiDetectOptions = {
  /** Known values to always redact (form/field values). */
  knownValues?: string[]
  /** Keep this many trailing characters visible (default 3). */
  visibleChars?: number
  /** Run optional NER via @xenova/transformers when true. */
  enableNer?: boolean
}
