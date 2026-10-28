import { mapV5LayoutToV6 } from '@/pages/form-builder/helpers/v5SchemaAdapter'

export type FormRuntimeLayout = 'ACCORDION' | 'CLASSIC' | 'SINGLE'

// Reads Form Settings → Form Layout from a saved form JSON (object or JSON
// string, V5 'CLASSIC' | 'CARD' | 'TAB' or V6 names). Forms without one are
// CLASSIC, the builder's default.
export function resolveFormLayout(formJson: any): FormRuntimeLayout {
  let root = formJson
  if (typeof root === 'string') {
    try {
      root = JSON.parse(root)
    } catch {
      return 'CLASSIC'
    }
  }
  const source = root?._json ?? root?.formJson ?? root
  const parsed =
    typeof source === 'string'
      ? (() => {
          try {
            return JSON.parse(source)
          } catch {
            return null
          }
        })()
      : source
  return mapV5LayoutToV6(parsed?.settings?.general?.layout)
}
