/* eslint-disable @typescript-eslint/no-explicit-any */
import { isFieldReadOnly, resolveRuntimeFieldType } from './runtimeFieldAdapter'

const UPLOAD_TYPES = ['FILE_UPLOAD', 'IMAGE_UPLOAD']

const isBlank = (v: unknown) =>
  v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)

// A file value that is still being read (OCR in flight) counts as not
// uploaded yet, so the user can't type into a field the document is about to
// fill.
const hasUploadedFile = (v: unknown) =>
  !isBlank(v) && (v as { ocrChecked?: boolean })?.ocrChecked !== false

/**
 * The upload field a field is waiting on: one whose "fill other fields"
 * (`validation.assignOtherControls`) targets it and that has no file yet.
 * Returns null when the field can be edited — no upload field fills it, a file
 * is already attached, or it already holds a value (e.g. a saved entry).
 * Only adds a lock; callers keep applying their own read-only/disabled rules.
 */
export function getPendingUploadSource(
  field: any,
  panels: any[],
  model: Record<string, any>,
): any | null {
  if (!field?.id || UPLOAD_TYPES.includes(resolveRuntimeFieldType(field))) {
    return null
  }
  if (!isBlank(model[field.id])) return null

  const sources = (panels || [])
    .flatMap((p) => p.fields || [])
    .filter(
      (f: any) =>
        f?.id !== field.id &&
        UPLOAD_TYPES.includes(resolveRuntimeFieldType(f)) &&
        !isFieldReadOnly(f) &&
        Array.isArray(f.settings?.validation?.assignOtherControls) &&
        f.settings.validation.assignOtherControls
          .map(String)
          .includes(String(field.id)),
    )
  if (sources.length === 0) return null
  if (sources.some((s: any) => hasUploadedFile(model[s.id]))) return null
  return sources[0]
}
