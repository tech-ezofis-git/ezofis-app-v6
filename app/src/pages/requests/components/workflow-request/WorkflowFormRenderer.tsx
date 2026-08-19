import { Accordion } from '@mantine/core'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import FieldRenderer from './components/FieldRenderer'
import { getColumnSizeClass, isFieldHidden } from './utils/fieldRendering'

interface Props {
  formModel: Record<string, any>
  panels: any[]
  repositoryId?: string
  onFieldChange: (fieldId: string, value: any) => void
}

// Renders a workflow's formJson.panels using the app's existing form-control
// components. MVP scope: a single accordion/panel layout regardless of the
// form's configured "layout" (typeform/grid/full) — panel titles,
// descriptions, field sizing, tooltips, required state, and static
// visibility are respected; per-field conditional logic rules are not
// evaluated yet.
const WorkflowFormRenderer = ({
  formModel,
  panels,
  repositoryId,
  onFieldChange,
}: Props) => {
  return (
    <ScrollArea height='100%'>
      <div className='mx-auto max-w-2xl px-6 py-6'>
        <Accordion
          defaultValue={panels.map((_, idx) => `panel-${idx}`)}
          radius='md'
          variant='separated'
          multiple
          classNames={{
            chevron: 'text-gray-10',
            content: 'p-0',
            control: 'rounded-xl px-4 py-2.5 transition-colors hover:bg-gray-1',
            item: 'mb-3 rounded-xl border border-gray-3 bg-gray-0 shadow-2xs',
            label: 'text-14 font-bold tracking-tight text-gray-13',
            panel: 'px-6 pt-2 pb-6',
          }}
        >
          {panels.map((panel: any, panelIndex: number) => {
            const visibleFields = (panel.fields || []).filter(
              (field: any) => !isFieldHidden(field),
            )
            if (visibleFields.length === 0) return null

            return (
              <Accordion.Item
                key={panel.id || panelIndex}
                value={`panel-${panelIndex}`}
              >
                <Accordion.Control>
                  <div className='flex flex-col gap-0.5'>
                    <span>
                      {panel.settings?.title || `Section ${panelIndex + 1}`}
                    </span>
                    {panel.settings?.description && (
                      <span className='text-12 font-normal text-gray-9'>
                        {panel.settings.description}
                      </span>
                    )}
                  </div>
                </Accordion.Control>
                <Accordion.Panel>
                  <div className='-mx-2 flex flex-wrap'>
                    {visibleFields.map((field: any) => (
                      <div
                        className={`${getColumnSizeClass(field.settings?.general?.size)} px-2 pb-4`}
                        key={field.id}
                      >
                        <FieldRenderer
                          field={field}
                          repositoryId={repositoryId}
                          value={formModel[field.id]}
                          onChange={(value) => onFieldChange(field.id, value)}
                        />
                      </div>
                    ))}
                  </div>
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
        </Accordion>
      </div>
    </ScrollArea>
  )
}

WorkflowFormRenderer.displayName = 'WorkflowFormRenderer'
export default WorkflowFormRenderer
