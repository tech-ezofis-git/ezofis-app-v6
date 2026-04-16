import { useEffect } from 'react'
import InputDate from '@/components/base/inputs/InputDate'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import InputTextarea from '@/components/base/inputs/InputTextarea'
import requestStore from '@/pages/requests/stores/useRequestStore'
import ScrollArea from '@/components/base/scroll-area/ScrollArea'
import { Accordion } from '@mantine/core'


const Form = (props: any) => {
  const { formModel, setFormModel } = props

  const selectedWorkflow = requestStore((state) => state.selectedWorkflow)
  const selectedRequest = requestStore((state) => state.selectedItem)
  console.log(selectedWorkflow);
  //const formJsonList = JSON.parse(selectedWorkflow?.formJson?.formJson || '{}')
  const formJsonList = selectedWorkflow?.formJson?.formJson || {}
  let panels = formJsonList?.panels || []
  let fields = selectedWorkflow?.formJson?.controllist || []

  // const [formModel, setFormModel] = useState<any>({})

  useEffect(() => {
    if (fields && selectedRequest) {
      const initialForm = fields.reduce((acc: any, field: any) => {
        if (field.type !== 'PARAGRAPH' && field.type !== 'DIVIDER' && field.type !== 'LABEL') {
          if (field.type === "TABLE" || field.type === "MULTI_SELECT" || field.type === "FILE_UPLOAD" || field.type === "DYNAMIC_TABLE") {
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
      case "col-12": return "w-full"
      case "col-6": return "w-1/2"
      case "col-3": return "w-1/3"
      default: return "w-1/2"
    }
  }

  const getOptions = (control: any) => {
    let optionType = control.settings?.specific?.optionsType
    if (optionType === 'CUSTOM') {
      let splitType = control.settings.specific.separateOptionsUsing
      if (splitType === 'COMMA') {
        return control.settings.specific.customOptions.split(',').map((option: any) => ({ id: option, name: option }))
      } else if (splitType === 'NEWLINE') {
        return control.settings.specific.customOptions.split('\n').map((option: any) => ({ id: option, name: option }))
      }
      return []
    } else if (optionType === 'DYNAMIC') {
      return control.settings.specific.options || []
    }
    return []
  }

  console.log(formModel, "formModel")

  const renderField = (control: any) => {
    const isMatchedStatus = control.label?.toLowerCase().includes('matched status')

    if (control.type === 'SHORT_TEXT' && isMatchedStatus) {
      return (
        <div className="space-y-1.5 flex flex-col w-full pr-4 pb-4">
          <label className="text-[10px] font-bold text-[var(--gray-9)] ">{control.label}</label>
          <div className="h-[38px] px-3 flex items-center gap-2 bg-[var(--green-1)] border border-[var(--green-4)] rounded-lg w-full">
            <div className="w-2 h-2 rounded-full bg-[var(--green-9)]"></div>
            <span className="text-[13px] font-medium text-[var(--green-11)]">{formModel[control.id] || 'Fully Matched'}</span>
          </div>
        </div>
      )
    }

    if (control.type === 'SHORT_TEXT') {
      return (
        <div className="space-y-1.5 flex flex-col w-full pr-4 pb-4">
          <label className="text-[10px] font-bold text-[var(--gray-9)] ">{control.label}</label>
          <InputText
            value={formModel[control.id] || ''}
            onChange={(value) => handleFieldChange(control.id, value)}
            className="w-full"
            styles={{ input: { height: '38px', borderRadius: '0.5rem', borderColor: 'var(--gray-4)', backgroundColor: 'white', color: 'var(--gray-13)' } }}
          />
        </div>
      )
    }

    if (control.type === 'SINGLE_SELECT') {
      return (
        <div className="space-y-1.5 flex flex-col w-full pr-4 pb-4">
          <label className="text-[10px] font-bold text-[var(--gray-9)] ">{control.label}</label>
          <InputSelect
            value={getOptions(control)?.find((opt: any) => opt.id === formModel[control.id]) || null}
            options={getOptions(control)}
            onChange={(opt) => handleFieldChange(control.id, opt ? opt.id : null)}
            className="w-full"
            styles={{ input: { height: '38px', borderRadius: '0.5rem', borderColor: 'var(--gray-4)', backgroundColor: 'white', color: 'var(--gray-13)' } }}
          />
        </div>
      )
    }

    if (control.type === 'DATE') {
      return (
        <div className="space-y-1.5 flex flex-col w-full pr-4 pb-4">
          <label className="text-[10px] font-bold text-[var(--gray-9)] ">{control.label}</label>
          <InputDate
            value={formModel[control.id] || null}
            onChange={(value: string | null) => handleFieldChange(control.id, value)}
            className="w-full"
            styles={{ input: { height: '38px', borderRadius: '0.5rem', borderColor: 'var(--gray-4)', backgroundColor: 'white', color: 'var(--gray-13)' } }}
          />
        </div>
      )
    }

    if (control.type === 'LONG_TEXT') {
      return (
        <div className="space-y-1.5 flex flex-col w-full pr-4 pb-4">
          <label className="text-[10px] font-bold text-[var(--gray-9)] ">{control.label}</label>
          <InputTextarea
            value={formModel[control.id] || ''}
            onChange={(value) => handleFieldChange(control.id, value)}
            className="w-full"
            rows={3}
            styles={{ input: { borderRadius: '0.5rem', borderColor: 'var(--gray-4)', backgroundColor: 'white', color: 'var(--gray-13)' } }}
          />
        </div>
      )
    }

    if (control.type === 'TABLE') {
      return (
        <div className="w-full pr-4 pb-4 mt-2">
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>{control.label}</div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-white'>
            <table className="w-full text-left text-xs">
              <thead className='bg-[var(--gray-0)] border-b border-[var(--gray-3)]'>
                <tr>
                  {control.settings?.specific?.tableColumns?.map((column: any, index: number) => (
                    <th key={index} className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--gray-10)] whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-3)]">
                {(formModel[control.id] || []).map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="hover:bg-[var(--gray-1)] transition-colors">
                    {control.settings?.specific?.tableColumns?.map((column: any, colIndex: number) => (
                      <td key={colIndex} className="px-5 py-4 font-semibold text-[var(--gray-13)] whitespace-nowrap text-[12px]">
                        {row[column.id]}
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

    if (control.type === 'DYNAMIC_TABLE') {
      const data = formModel[control.id] ? (formModel[control.id]) : []

      let columns: any[] = []
      if (data.length > 0) {
        columns = Object.keys(data[0])
      }

      if (columns.length === 0) return null
      return (
        <div className="w-full pr-4 pb-4 mt-2">
          <div className='mb-3 text-[13px] font-bold text-[var(--gray-13)]'>{control.label}</div>
          <div className='overflow-x-auto rounded-lg border border-[var(--gray-3)] bg-white'>
            <table className="w-full text-left text-xs">
              <thead className='bg-[var(--gray-0)] border-b border-[var(--gray-3)]'>
                <tr>
                  {columns?.map((column: any, index: number) => (
                    <th key={index} className="px-5 py-4 font-bold uppercase tracking-widest text-[10px] text-[var(--gray-10)] whitespace-nowrap">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-3)]">
                {(data || []).map((row: any, rowIndex: number) => (
                  <tr key={rowIndex} className="hover:bg-[var(--gray-1)] transition-colors">
                    {columns?.map((column: any, colIndex: number) => (
                      // <td key={colIndex} className="px-5 py-4 font-semibold text-[var(--gray-13)] whitespace-nowrap text-[12px]">
                      //   {row[column]}
                      // </td>
                      <td key={colIndex} className='px-2 py-2'>
                        <InputText
                          value={row[column] || ''}
                          onChange={(value: string) => formModel[control.id][rowIndex][column] = value}
                          className="w-full"
                          styles={{ input: { height: '38px', borderRadius: '0.5rem', borderColor: 'var(--gray-4)', backgroundColor: 'white', color: 'var(--gray-13)' } }}
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
        <div className='w-full pr-4 pb-4 text-[13px] text-[var(--gray-13)]' dangerouslySetInnerHTML={{ __html: control.settings?.specific?.textContent }} />
      )
    }

    if (control.type === 'LABEL') {
      return (
        <div className='w-full pr-4 pb-4 text-[13px] font-bold text-[var(--gray-13)]'>{control.label}</div>
      )
    }

    if (control.type === 'DIVIDER') {
      return <div className='w-full h-px bg-[var(--gray-3)] my-2 mr-4'></div>
    }

    return null
  }

  return (
    <ScrollArea height='calc(100dvh - 278px)'>
      <div className='max-w-2xl'>
        <Accordion
          defaultValue="panel-0"
          variant="separated"
          radius="md"
          classNames={{
            item: 'bg-[var(--gray-0)] border border-[var(--gray-3)] rounded-[12px] mb-3 shadow-sm',
            control: 'px-4 py-2 hover:bg-[var(--gray-1)] transition-colors rounded-[12px]',
            label: 'font-bold text-[14px] text-[var(--gray-13)] tracking-tight',
            panel: 'px-6 pb-6 pt-2',
            content: 'p-0',
            chevron: 'text-[var(--gray-10)]'
          }}
        >
          {/* shadow-[0_1px_2px_rgba(0,0,0,0.02)] */}
          {panels?.map((panel: any, panelIndex: number) => (
            <Accordion.Item key={panelIndex} value={`panel-${panelIndex}`}>
              <Accordion.Control>
                {panel.settings?.title || `Section ${panelIndex + 1}`}
              </Accordion.Control>
              <Accordion.Panel>
                <div className='flex flex-wrap -mx-2'>
                  {panel.fields?.map((control: any, controlIndex: number) => (
                    <div key={controlIndex} className={`${getColumnSize(control.settings?.general?.size)} pl-2`}>
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