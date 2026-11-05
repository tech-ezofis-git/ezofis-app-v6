/** A form panel (section) and the ids of the fields it holds. */
export interface PanelOption {
  fieldIds: string[]
  id: string
  name: string
}

/** Panels whose fields are all in `formFields`. */
export const selectedPanelIds = (
  panels: PanelOption[],
  formFields: string[],
): string[] =>
  panels
    .filter(
      (panel) =>
        panel.fieldIds.length > 0 &&
        panel.fieldIds.every((id) => formFields.includes(id)),
    )
    .map((panel) => panel.id)

/**
 * Applies a change in the picked panels to a rule's field ids: a newly picked
 * panel adds all of its fields, a removed one drops all of them. Fields picked
 * on their own are left as they are. Rules still store plain field ids, so the
 * request page and older workflows need no change.
 */
export const applyPanelSelection = (
  panels: PanelOption[],
  formFields: string[],
  nextPanelIds: string[],
): string[] => {
  const before = new Set(selectedPanelIds(panels, formFields))
  const next = new Set(nextPanelIds)
  const result = new Set(formFields)
  for (const panel of panels) {
    if (next.has(panel.id) && !before.has(panel.id)) {
      panel.fieldIds.forEach((id) => result.add(id))
    }
    if (!next.has(panel.id) && before.has(panel.id)) {
      panel.fieldIds.forEach((id) => result.delete(id))
    }
  }
  return [...result]
}
