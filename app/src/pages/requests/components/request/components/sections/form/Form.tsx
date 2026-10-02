import { Accordion } from '@mantine/core'
import { useEffect } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import requestStore from '@/pages/requests/stores/useRequestStore'

const Form = (props: any) => {
  const { formModel, setFormModel } = props

  const selectedWorkflow = requestStore((state) => state.selectedWorkflow)
  const selectedRequest = requestStore((state) => state.selectedItem)
  console.log(selectedWorkflow)
  //const formJsonList = JSON.parse(selectedWorkflow?.formJson?.formJson || '{}')
  const formJsonList = selectedWorkflow?.formJson?.formJson || {}
  const panels = formJsonList?.panels || []
  const fields = selectedWorkflow?.formJson?.controllist || []

  // const [formModel, setFormModel] = useState<any>({})

  useEffect(() => {
    if (fields && selectedRequest) {
      const initialForm = fields.reduce((acc: any, field: any) => {
        if (
          field.type !== 'PARAGRAPH' &&
          field.type !== 'DIVIDER' &&
          field.type !== 'LABEL'
        ) {
          if (
            field.type === 'TABLE' ||
            field.type === 'MULTI_SELECT' ||
            field.type === 'FILE_UPLOAD' ||
            field.type === 'DYNAMIC_TABLE'
          ) {
            try {
              acc[field.jsonId] = JSON.parse(selectedRequest[field.jsonId])
            } catch (e) {
              acc[field.jsonId] = selectedRequest[field.jsonId]
            }
          } else {
            acc[field.jsonId] = selectedRequest[field.jsonId]
          }
        }
        return acc
      }, {})
      setFormModel(initialForm)
    }
  }, [fields, selectedRequest])

  const handleFieldChange = (jsonId: string, value: any) => {
    setFormModel((prev: any) => ({ ...prev, [jsonId]: value }))
  }

  const getColumnSize = (size: string) => {
    switch (size) {
      case 'col-12':
        return 'w-full'
      case 'col-6':
        return 'w-1/2'
      case 'col-3':
        return 'w-1/3'
      default:
        return 'w-1/2'
    }
  }

  const getOptions = (control: any) => {
    const optionType = control.settings?.specific?.optionsType
    if (optionType === 'CUSTOM') {
      const splitType = control.settings.specific.separateOptionsUsing
      if (splitType === 'COMMA') {
        return control.settings.specific.customOptions
          .split(',')
          .map((option: any) => ({ id: option, name: option }))
      } else if (splitType === 'NEWLINE') {
        return control.settings.specific.customOptions
          .split('\n')
          .map((option: any) => ({ id: option, name: option }))
      }
      return []
    } else if (optionType === 'DYNAMIC') {
      return control.settings.specific.options || []
    }
    return []
  }

  console.log(formModel, 'formModel')

  const renderField = (control: any) => {
    const isMatchedStatus = control.label
      ?.toLowerCase()
      .includes('matched status')

    if (control.type === 'SHORT_TEXT' && isMatchedStatus) {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <div className='flex h-[38px] w-full items-center gap-2 rounded-lg border border-[var(--green-4)] bg-[var(--green-1)] px-3'>
            <div className='h-2 w-2 rounded-full bg-[var(--green-9)]'></div>
            <span className='text-[13px] font-medium text-[var(--green-11)]'>
              {formModel[control.id] || 'Fully Matched'}
            </span>
          </div>
        </div>
      )
    }

    if (control.type === 'SHORT_TEXT') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputText
            className='w-full'
            value={formModel[control.id] || ''}
            styles={{
              input: {
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            onChange={(value) => handleFieldChange(control.id, value)}
          />
        </div>
      )
    }

    if (control.type === 'SINGLE_SELECT') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputSelect
            className='w-full'
            options={getOptions(control)}
            styles={{
              input: {
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            value={
              getOptions(control)?.find(
                (opt: any) => opt.id === formModel[control.id],
              ) || null
            }
            onChange={(opt) =>
              handleFieldChange(control.id, opt ? opt.id : null)
            }
          />
        </div>
      )
    }

    if (control.type === 'DATE') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputDate
            className='w-full'
            value={formModel[control.id] ? formModel[control.id] : null}
            styles={{
              input: {
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--gray-4)',
                borderRadius: '0.5rem',
                color: 'var(--gray-13)',
                height: '38px',
              },
            }}
            onChange={(value: string | null) =>
              handleFieldChange(control.id, value)
            }
          />
        </div>
      )
    }

    if (control.type === 'LONG_TEXT') {
      return (
        <div className='flex w-full flex-col space-y-1.5 pr-4 pb-4'>
          <label className='text-[10px] font-bold text-[var(--gray-9)]'>
            {control.label}
          </label>
          <InputTextarea
            className='w-full'
            rows={3}
            value={formModel[control.id] || ''}
            styles={{
              input: {
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-default)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
              },
            }}
            onChange={(value) => handleFieldChange(control.id, value)}
          />
        </div>
      )
    }

    if (control.type === 'TABLE') {
      return (
        <div className='mt-2 w-full pr-4 pb-4'>
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>
            {control.label}
          </div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-surface'>
            <table className='w-full text-left text-xs'>
              <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-0)]'>
                <tr>
                  {control.settings?.specific?.tableColumns?.map(
                    (column: any, index: number) => (
                      <th
                        className='px-5 py-4 text-[10px] font-bold tracking-widest whitespace-nowrap text-[var(--gray-10)] uppercase'
                        key={index}
                      >
                        {column.label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--gray-3)]'>
                {(formModel[control.id] || []).map(
                  (row: any, rowIndex: number) => (
                    <tr
                      className='transition-colors hover:bg-[var(--gray-1)]'
                      key={rowIndex}
                    >
                      {control.settings?.specific?.tableColumns?.map(
                        (column: any, colIndex: number) => (
                          <td
                            className='px-5 py-4 text-[12px] font-semibold whitespace-nowrap text-[var(--gray-13)]'
                            key={colIndex}
                          >
                            {row[column.id]}
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (control.type === 'DYNAMIC_TABLE') {
      const data = formModel[control.id] ? formModel[control.id] : []

      let columns: any[] = []
      if (data.length > 0) {
        columns = Object.keys(data[0])
      }

      if (columns.length === 0) return null
      return (
        <div className='mt-2 w-full pr-4 pb-4'>
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>
            {control.label}
          </div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-surface'>
            <table className='w-full text-left text-xs'>
              <thead className='border-b border-[var(--gray-3)] bg-[var(--gray-0)]'>
                <tr>
                  {columns?.map((column: any, index: number) => (
                    <th
                      className='px-5 py-4 text-[10px] font-bold tracking-widest whitespace-nowrap text-[var(--gray-10)] uppercase'
                      key={index}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-[var(--gray-3)]'>
                {(data || []).map((row: any, rowIndex: number) => (
                  <tr
                    className='transition-colors hover:bg-[var(--gray-1)]'
                    key={rowIndex}
                  >
                    {columns?.map((column: any, colIndex: number) => (
                      // <td key={colIndex} className="px-5 py-4 font-semibold text-[var(--gray-13)] whitespace-nowrap text-[12px]">
                      //   {row[column]}
                      // </td>
                      <td className='px-2 py-2' key={colIndex}>
                        <InputText
                          className='w-full'
                          value={row[column] || ''}
                          styles={{
                            input: {
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border-default)',
                              borderRadius: '0.5rem',
                              color: 'var(--text-primary)',
                              height: '38px',
                            },
                          }}
                          onChange={(value: string) =>
                            (formModel[control.id][rowIndex][column] = value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (control.type === 'PARAGRAPH') {
      return (
        <div
          className='w-full pr-4 pb-4 text-[13px] text-[var(--gray-13)]'
          dangerouslySetInnerHTML={{
            __html: control.settings?.specific?.textContent,
          }}
        />
      )
    }

    if (control.type === 'LABEL') {
      return (
        <div className='w-full pr-4 pb-4 text-[13px] font-bold text-[var(--gray-13)]'>
          {control.label}
        </div>
      )
    }

    if (control.type === 'DIVIDER') {
      return <div className='my-2 mr-4 h-px w-full bg-[var(--gray-3)]'></div>
    }

    return null
  }

  return (
    <ScrollArea height='calc(100dvh - 278px)'>
      <div className='max-w-2xl'>
        <Accordion
          defaultValue='panel-0'
          radius='md'
          variant='separated'
          classNames={{
            chevron: 'text-[var(--gray-10)]',
            content: 'p-0',
            control:
              'rounded-[12px] px-4 py-2 transition-colors hover:bg-[var(--gray-1)]',
            item: 'mb-3 rounded-[12px] border border-[var(--gray-3)] bg-[var(--gray-0)] shadow-sm',
            label: 'text-[14px] font-bold tracking-tight text-[var(--gray-13)]',
            panel: 'px-6 pt-2 pb-6',
          }}
        >
          {/* shadow-[0_1px_2px_rgba(0,0,0,0.02)] */}
          {panels?.map((panel: any, panelIndex: number) => (
            <Accordion.Item key={panelIndex} value={`panel-${panelIndex}`}>
              <Accordion.Control>
                {panel.settings?.title || `Section ${panelIndex + 1}`}
              </Accordion.Control>
              <Accordion.Panel>
                <div className='-mx-2 flex flex-wrap'>
                  {panel.fields?.map((control: any, controlIndex: number) => (
                    <div
                      className={`${getColumnSize(control.settings?.general?.size)} pl-2`}
                      key={controlIndex}
                    >
                      {renderField(control)}
                    </div>
                  ))}
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </ScrollArea>
  )
}

Form.displayName = 'Form'
export default Form
