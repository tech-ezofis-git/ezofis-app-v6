import { useEffect, useState } from 'react'
import { folderApi } from '../api/folderApi'
import type { WorkflowData } from '../types/folderTypes'
import { Button, Card, PrimaryButton } from './Ui'
import { DynamicIcon } from './icons'

export function StartWorkflowView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<WorkflowData | null>(null)
  const [selected, setSelected] = useState('ap2')

  const [l1Approver, setL1Approver] = useState('')
  const [l2Approver, setL2Approver] = useState('')
  const [dueDate, setDueDate] = useState('2024-11-20')
  const [priority, setPriority] = useState('Low')
  const [note, setNote] = useState('')

  useEffect(() => {
    folderApi.getWorkflowData().then((res) => {
      setData(res)
      setL1Approver(res.approvers[0]?.name || '')
      setL2Approver(res.approvers[1]?.name || '')
    })
  }, [])

  if (!data) {
    return <div className="p-6 text-[13px] text-gray-10">Loading workflow...</div>
  }

  const approverOptions = data.approvers.map((x) => x.name)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 animate-in fade-in duration-300">
      <div className="flex h-[52px] shrink-0 items-center border-b border-gray-3 bg-surface-primary px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-gray-13 transition-all hover:bg-gray-4 active:scale-95"
        >
          <DynamicIcon name="arrowLeft" className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] space-y-5 px-6 py-6">
          <Card className="flex items-center justify-between rounded-xl border border-gray-3 bg-surface-primary p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-3 text-[12px] font-bold text-red-9">
                PDF
              </span>

              <div>
                <h2 className="text-[15px] font-semibold text-gray-13">
                  {data.document.name}
                </h2>
                <p className="text-[12px] text-gray-10">
                  {data.document.supplier} · {data.document.amount} · {data.document.date}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-lg border border-gray-3 px-3 py-1 text-[12px] font-semibold text-gray-11">
              <DynamicIcon name="clock" className="h-3.5 w-3.5 text-orange-10" />
              {data.document.status}
            </span>
          </Card>

          <Card className="rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-gray-13">
              <DynamicIcon name="zap" className="h-4 w-4 text-blue-11" />
              Select Workflow Template
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelected(template.id)}
                  className={`rounded-xl border p-4 text-left transition-all hover:bg-gray-2 active:scale-[0.99] ${
                    selected === template.id
                      ? 'border-blue-9 bg-blue-3 ring-1 ring-blue-9'
                      : 'border-gray-3 bg-surface-primary'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <b className="text-[13px] font-semibold text-gray-13">{template.title}</b>

                    {template.recommended && (
                      <span className="rounded-full bg-blue-9 px-2 py-0.5 text-[10px] font-bold text-white">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="mb-3 text-[12px] leading-5 text-gray-10">
                    {template.description}
                  </p>

                  <div className="flex gap-5 text-[12px] text-gray-10">
                    <span className="inline-flex items-center gap-1.5">
                      <DynamicIcon name="users" className="h-3.5 w-3.5 text-blue-11" />
                      {template.levels}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <DynamicIcon name="clock" className="h-3.5 w-3.5 text-orange-10" />
                      {template.eta}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="rounded-xl border border-gray-3 bg-surface-primary p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-gray-13">
              <DynamicIcon name="users" className="h-4 w-4 text-blue-11" />
              Configure Approvers
            </h2>

            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-gray-2 p-3">
              <WorkflowStep tone="blue" icon="zap" label="AI Extract" />
              <StepArrow />
              <WorkflowStep tone="orange" icon="user" label={`L1: ${l1Approver || '-'}`} />
              <StepArrow />
              <WorkflowStep tone="blue" icon="user" label={`L2: ${l2Approver || '-'}`} />
              <StepArrow />
              <WorkflowStep tone="green" icon="check" label="Complete" />
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field
                label="L1 Approver *"
                value={l1Approver}
                dot
                options={approverOptions}
                onChange={setL1Approver}
              />

              <Field
                label="L2 Approver"
                value={l2Approver}
                dot
                options={approverOptions}
                onChange={setL2Approver}
              />

              <Field
                label="Due Date"
                value={dueDate}
                icon="calendar"
                type="date"
                onChange={setDueDate}
              />

              <Field
                label="Priority"
                value={priority}
                icon="flag"
                dot
                options={['Low', 'Medium', 'High', 'Critical']}
                onChange={setPriority}
              />
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-gray-12">
                <DynamicIcon name="messageSquare" className="h-3.5 w-3.5 text-gray-10" />
                Note to Approver
              </span>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-20 w-full resize-none rounded-lg border border-gray-3 bg-white p-3 text-[13px] leading-5 text-gray-13 outline-none transition-all placeholder:text-gray-8 focus:border-blue-8 focus:ring-2 focus:ring-blue-3"
                placeholder="Add a note for the approver..."
              />
            </label>
          </Card>

          <div className="flex justify-end gap-3 pb-2">
            <Button className="h-9 px-4 text-[13px]">Cancel</Button>

            <PrimaryButton className="h-9 px-4 text-[13px]">
              <DynamicIcon name="check" className="h-4 w-4" />
              Launch Workflow
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkflowStep({
  tone,
  icon,
  label,
}: {
  tone: 'blue' | 'orange' | 'green'
  icon: string
  label: string
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-3 text-blue-11'
      : tone === 'orange'
        ? 'bg-orange-3 text-orange-11'
        : 'bg-green-3 text-green-11'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ${toneClass}`}
    >
      <DynamicIcon name={icon} className="h-3.5 w-3.5" />
      <span className="max-w-[130px] truncate">{label}</span>
    </span>
  )
}

function StepArrow() {
  return <DynamicIcon name="chevronRight" className="h-3.5 w-3.5 text-gray-9" />
}

function Field({
  label,
  value,
  icon = 'chevronDown',
  type = 'select',
  dot = false,
  options = [],
  onChange,
}: {
  label: string
  value: string
  icon?: string
  type?: 'select' | 'date'
  dot?: boolean
  options?: string[]
  onChange?: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-gray-12">
        {icon !== 'chevronDown' && (
          <DynamicIcon name={icon} className="h-3.5 w-3.5 text-gray-10" />
        )}
        {label}
      </span>

      <div className="relative">
        {type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-3 bg-white px-3 pr-9 text-[13px] font-medium text-gray-13 shadow-sm outline-none transition-all hover:border-gray-5 focus:border-blue-8 focus:ring-2 focus:ring-blue-3"
          />
        ) : (
          <>
            {dot && (
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-green-9" />
            )}

            <select
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              className={`h-9 w-full appearance-none rounded-lg border border-gray-3 bg-white ${
                dot ? 'pl-8' : 'pl-3'
              } pr-9 text-[13px] font-medium text-gray-13 shadow-sm outline-none transition-all hover:border-gray-5 focus:border-blue-8 focus:ring-2 focus:ring-blue-3`}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </>
        )}

        <DynamicIcon
          name={type === 'date' ? 'calendar' : 'chevronDown'}
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-9"
        />
      </div>
    </label>
  )
}