import { useLingui } from '@lingui/react/macro'
import { Accordion } from '@mantine/core'
import Icon from '@/components/base/icon/Icon'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import AnimateFadeIn from '@/components/common/animations/AnimateFadeIn'
import FieldRenderer from './components/FieldRenderer'
import {
  getColumnSizeClass,
  isFieldFilled,
  isFieldHidden,
  isFieldRequired,
} from './utils/fieldRendering'

interface Props {
  formModel: Record<string, any>
  panels: any[]
  hasAttemptedSubmit?: boolean
  missingMandatoryFieldIds?: Set<string>
  repoFieldHints?: string[]
  repositoryId?: string
  viewOnly?: boolean
  onFieldChange: (fieldId: string, value: any) => void
  onOcrFieldList?: (
    list: { name?: string; value?: string }[] | undefined,
  ) => void
}

// Renders a workflow's formJson.panels using the app's existing form-control
// components. MVP scope: a single accordion/panel layout regardless of the
// form's configured "layout" (typeform/grid/full) — panel titles,
// descriptions, field sizing, tooltips, required state, and static
// visibility are respected; per-field conditional logic rules are not
// evaluated yet.
const WorkflowFormRenderer = ({
  formModel,
  hasAttemptedSubmit,
  missingMandatoryFieldIds,
  panels,
  repoFieldHints,
  repositoryId,
  viewOnly,
  onFieldChange,
  onOcrFieldList,
}: Props) => {
  const { t } = useLingui()
  return (
    <ScrollArea height='100%'>
      <div className='w-full px-6 py-6'>
        <AnimateFadeIn delay={0.1}>
          <Accordion
            defaultValue={panels.map((_, idx) => `panel-${idx}`)}
            radius='md'
            variant='separated'
            multiple
            classNames={{
              chevron: 'text-gray-10',
              content: 'p-0',
              control:
                'rounded-xl px-4 py-2.5 transition-colors hover:bg-gray-1',
              item: 'mb-3 rounded-xl border border-gray-3 bg-gray-0 shadow-2xs transition-shadow hover:shadow-sm',
              label: 'text-14 font-bold tracking-tight text-gray-13',
              panel: 'px-6 pt-2 pb-6',
            }}
          >
            {panels.map((panel: any, panelIndex: number) => {
              const visibleFields = (panel.fields || []).filter(
                (field: any) => !isFieldHidden(field),
              )
              if (visibleFields.length === 0) return null

              const requiredFields = visibleFields.filter(isFieldRequired)
              const completedCount = requiredFields.filter((field: any) =>
                isFieldFilled(field, formModel[field.id]),
              ).length

              return (
                <Accordion.Item
                  key={panel.id || panelIndex}
                  value={`panel-${panelIndex}`}
                >
                  <Accordion.Control>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-1)]'>
                          <Icon
                            className='size-4 text-[var(--primary-9)]'
                            name='tabler:forms'
                          />
                        </div>
                        <div className='flex flex-col gap-0.5'>
                          <span>
                            {panel.settings?.title ||
                              `Section ${panelIndex + 1}`}
                          </span>
                          {panel.settings?.description && (
                            <span className='text-12 font-normal text-gray-9'>
                              {panel.settings.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {!viewOnly && requiredFields.length > 0 && (
                        <span className='shrink-0 text-11 font-medium whitespace-nowrap text-gray-9'>
                          <span
                            className={
                              completedCount === requiredFields.length
                                ? 'font-bold text-green-9'
                                : 'font-bold text-primary-9'
                            }
                          >
                            {completedCount}
                          </span>{' '}
                          of {requiredFields.length} mandatory fields completed
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
                            repoFieldHints={repoFieldHints}
                            repositoryId={repositoryId}
                            value={formModel[field.id]}
                            viewOnly={viewOnly}
                            error={
                              hasAttemptedSubmit &&
                              missingMandatoryFieldIds?.has(field.id)
                                ? t`This field is required.`
                                : undefined
                            }
                            onChange={(value) => onFieldChange(field.id, value)}
                            onOcrFieldList={onOcrFieldList}
                          />
                        </div>
                      ))}
                    </div>
                  </Accordion.Panel>
                </Accordion.Item>
              )
            })}
          </Accordion>
        </AnimateFadeIn>
      </div>
    </ScrollArea>
  )
}

WorkflowFormRenderer.displayName = 'WorkflowFormRenderer'
export default WorkflowFormRenderer
