import { useState } from 'react'
import Button from '@/components/base/button/Button'
import Divider from '@/components/base/Divider'
import InputText from '@/components/base/inputs/InputText'

// --- TYPES ---
type DroppedField = {
  id: string
  type: string
  label: string
  icon?: string
}

type FormPage = {
  id: string
  fields: DroppedField[]
}

const Form = () => {
  // Initialize with one empty page
  const [pages, setPages] = useState<FormPage[]>([
    { id: crypto.randomUUID(), fields: [] }
  ])

  // --- ACTIONS ---

  const handleAddPage = () => {
    setPages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), fields: [] }
    ])
  }

  const onDropHandler = (e: React.DragEvent<HTMLDivElement>, pageId: string) => {
    e.preventDefault()

    const raw = e.dataTransfer.getData('application/x-form-field')
    if (!raw) return

    const payload = JSON.parse(raw) as Omit<DroppedField, 'id'>
    const newField: DroppedField = {
      id: crypto.randomUUID(),
      ...payload,
    }

    // Add field to the specific page where it was dropped
    setPages((prev) =>
      prev.map((page) => {
        if (page.id === pageId) {
          return { ...page, fields: [...page.fields, newField] }
        }
        return page
      })
    )
  }

  // --- RENDER HELPERS ---

  const renderFieldInput = (field: DroppedField) => {
    switch (field.type) {
      case 'heading': return <h2 className="text-xl font-semibold text-gray-12">Heading Text</h2>
      case 'paragraph': return <p className="text-sm text-gray-11">Enter your text here...</p>
      case 'divider': return <Divider className="my-2" />
      case 'spacer': return <div className="h-8 w-full border border-dashed border-gray-3 bg-gray-2 opacity-50 flex items-center justify-center text-xs text-gray-9">Spacer</div>

      case 'short_text':
      case 'full_name': return <InputText placeholder="Type here..." value="" onChange={() => { }} />
      case 'email': return <InputText type="email" placeholder="example@email.com" value="" onChange={() => { }} />
      case 'phone_number': return <InputText type="tel" placeholder="+1 (555) 000-0000" value="" onChange={() => { }} />
      case 'number': return <InputText type="number" placeholder="0" value="" onChange={() => { }} />

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9">$</span>
            <input className="w-full rounded border border-gray-3 bg-white py-2 pl-7 pr-3 text-13 outline-none focus:border-primary" placeholder="0.00" type="number" />
          </div>
        )

      case 'long_text':
      case 'address':
        return <textarea className="w-full rounded border border-gray-3 bg-white p-3 text-13 outline-none focus:border-primary min-h-[80px]" placeholder="Type answer..." />

      case 'date': return <input type="date" className="w-full rounded border border-gray-3 bg-white p-2 text-13 text-gray-11 outline-none" />
      case 'time': return <input type="time" className="w-full rounded border border-gray-3 bg-white p-2 text-13 text-gray-11 outline-none" />

      case 'single_select':
      case 'multiple_select':
        return (
          <select className="w-full rounded border border-gray-3 bg-white p-2 text-13 text-gray-11 outline-none">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        )

      case 'single_choice':
        return (
          <div className="space-y-2">
            {['Option 1', 'Option 2'].map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={field.id} className="accent-black" />
                <span className="text-13 text-gray-12">{opt}</span>
              </div>
            ))}
          </div>
        )

      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {['Option 1', 'Option 2'].map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" className="accent-black rounded" />
                <span className="text-13 text-gray-12">{opt}</span>
              </div>
            ))}
          </div>
        )

      case 'star_rating':
        return <div className="flex gap-1 text-2xl text-gray-300">{'★★★★★'}</div>

      case 'file_upload':
        return <div className="flex h-16 items-center justify-center rounded border border-dashed border-gray-3 bg-gray-1 text-xs text-gray-9">Upload File</div>

      default: return <div className="text-xs text-red-500">Unknown: {field.type}</div>
    }
  }

  return (
    <div className='mx-auto w-2xl py-8 pb-32'>

      {/* Map through all pages */}
      {pages.map((page, pageIndex) => (
        <div key={page.id} className="mb-8 relative group/page">

          {/* Page Label (Optional) */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-gray-9 uppercase tracking-wider">
              Page {pageIndex + 1}
            </span>
            {pages.length > 1 && (
              <button
                onClick={() => setPages(p => p.filter(x => x.id !== page.id))}
                className="cursor-pointer text-xs text-red-500 hover:underline opacity-0 group-hover/page:opacity-100 transition-opacity"
              >
                Delete Page
              </button>
            )}
          </div>

          {/* Drop Zone Area */}
          <div
            className='rounded border border-gray-3 bg-surface p-4 min-h-[150px] shadow-sm'
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropHandler(e, page.id)}
          >
            {page.fields.length === 0 ? (
              <div className='flex h-32 w-full flex-col items-center justify-center gap-2 text-gray-9'>
                <p className="text-sm">Empty Page</p>
                <p className="text-xs text-gray-7">Drag fields here</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {page.fields.map((field) => {
                  const isDisplayType = ['heading', 'paragraph', 'divider', 'spacer'].includes(field.type)
                  return (
                    <div key={field.id} className='group relative rounded border border-transparent p-3 hover:border-gray-3 hover:bg-gray-1/50 transition-all'>
                      {!isDisplayType && (
                        <div className='mb-2 text-13 font-medium text-gray-11'>
                          {field.label}
                        </div>
                      )}
                      {renderFieldInput(field)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Footer Actions */}
      <div className='mt-8 flex items-center gap-4'>
        <Divider className='flex-1' />
        <Button
          onClick={handleAddPage}
          color='gray'
          icon='lucide:plus'
          label='Add Page'
          variant='subtle'
        />
        <Divider className='flex-1' />
      </div>
    </div>
  )
}

export default Form