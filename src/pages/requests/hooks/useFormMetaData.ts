import { useMemo } from 'react'

export const useFormMetadata = (formJsonString: string | null) => {
  return useMemo(() => {
    if (!formJsonString) return { fields: new Map(), panels: [] }

    try {
      const form = JSON.parse(formJsonString)
      const allPanels = [
        ...(form.panels || []),
        ...(form.secondaryPanels || []),
      ]

      // Create a Map for O(1) lookup: FieldID -> FieldDefinition
      const fieldMap = new Map<
        string,
        { label: string; settings: any; type: string }
      >()

      allPanels.forEach((panel: any) => {
        panel.fields.forEach((field: any) => {
          fieldMap.set(field.id, {
            label: field.label || field.type,
            type: field.type,
            settings: field.settings,
          })
        })
      })

      return { fields: fieldMap, panels: allPanels }
    } catch (e) {
      console.error('Error parsing form JSON', e)
      return { fields: new Map(), panels: [] }
    }
  }, [formJsonString])
}
