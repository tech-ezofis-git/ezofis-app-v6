import type { Panel } from '../store/formStore'

export interface MissingSetting {
  fieldId: string
  fieldLabel: string
  /** The setting that still needs filling, in the words the settings panel uses. */
  setting: string
}

const isEmptyList = (value: unknown) =>
  !Array.isArray(value) || value.filter(Boolean).length === 0

/**
 * The settings a field needs before it can work, that have not been filled in.
 * Only settings that make a field unusable when they are empty are listed, so
 * a form can be published with everything else left at its defaults.
 */
export const getMissingRequiredSettings = (
  panels: Panel[] | undefined,
): MissingSetting[] => {
  const missing: MissingSetting[] = []

  for (const field of (panels ?? []).flatMap((p) => p.fields ?? [])) {
    const fieldLabel = String(field.label ?? '').trim() || 'Untitled field'
    const specific = field.settings?.specific
    const add = (setting: string) =>
      missing.push({ fieldId: field.id, fieldLabel, setting })

    // A name shown on the form counts as a name too (older forms may only have that).
    const hasName = [field.label, field.displayLabel].some((name) =>
      String(name ?? '').trim(),
    )
    if (field.type !== 'DIVIDER' && !hasName) {
      add('Field name')
    }

    if (specific?.isSearchField === 'YES') {
      const matchesThisForm =
        specific.hasSameForm !== 'NO' && specific.hasSameForm !== false
      if (!matchesThisForm) {
        if (!String(specific.searchFormId ?? '').trim()) add('Master form')
        if (!String(specific.masterSyncField ?? '').trim()) {
          add('Master field to match')
        }
        const rows = specific.masterFormSyncSettings ?? []
        if (
          rows.length === 0 ||
          rows.some((row) => !row?.formField || !row?.masterField)
        ) {
          add('Fields to fill from the match')
        }
      } else if (isEmptyList(specific.formSyncField)) {
        add('Fields to fill from earlier entries')
      }
    }

    if (
      (field.type === 'TABLE' || field.type === 'DYNAMIC_TABLE') &&
      isEmptyList(specific?.tableColumns)
    ) {
      add('At least one column')
    }
  }

  return missing
}

/** One short sentence for a message, e.g. `"Customer": Master form`. */
export const describeMissingSettings = (
  missing: MissingSetting[],
  limit = 3,
): string => {
  const shown = missing
    .slice(0, limit)
    .map((m) => `"${m.fieldLabel}": ${m.setting}`)
  const more = missing.length - shown.length
  return more > 0 ? `${shown.join('; ')}; and ${more} more` : shown.join('; ')
}
