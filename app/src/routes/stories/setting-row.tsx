import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import type { Option } from '@/types/option'
import InputSelect from '@/components/base/inputs/InputSelect'
import InputText from '@/components/base/inputs/InputText'
import SettingRow from '@/components/base/inputs/SettingRow'
import SettingSwitchRow from '@/components/base/inputs/SettingSwitchRow'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/setting-row')({
  component: RouteComponent,
})

const WIDTHS = [
  { id: 'third', name: 'One third' },
  { id: 'half', name: 'Half' },
  { id: 'full', name: 'Full width' },
]

function RouteComponent() {
  const [text, setText] = useState('')
  const [width, setWidth] = useState<Option | null>(WIDTHS[1])
  const [required, setRequired] = useState(true)
  const [hidden, setHidden] = useState(false)

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Setting Row</StoryTitle>
      <p className='mb-10 text-15 text-gray-11'>
        Setting Row and Setting Switch Row are the building blocks of every
        settings panel (for example the form builder&apos;s field settings).
        Every setting shows a label, the control, and one short plain sentence
        that explains it, in the same style whatever control it holds.
      </p>

      <p className='mb-4 text-14 text-gray-11'>Import them from:</p>
      <StoryCode>
        {`import SettingRow from '@/components/base/inputs/SettingRow'
import SettingSwitchRow from '@/components/base/inputs/SettingSwitchRow'`}
      </StoryCode>

      <div className='space-y-16'>
        <section>
          <StorySubTitle>Setting Row with a text box</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            The label, the control, then the help sentence. Use it around a
            control that has no label of its own.
          </p>
          <StoryCode>
            {`<SettingRow help='Grey example text shown inside an empty box.' label='Placeholder text'>
  <InputText value={text} onChange={setText} />
</SettingRow>`}
          </StoryCode>
          <div className='max-w-sm'>
            <SettingRow
              help='Grey example text shown inside an empty box.'
              label='Placeholder text'
            >
              <InputText value={text} onChange={setText} />
            </SettingRow>
          </div>
        </section>

        <section>
          <StorySubTitle>Setting Row with a select</StorySubTitle>
          <StoryCode>
            {`<SettingRow help='How much of the row this field takes.' label='Field width'>
  <InputSelect options={WIDTHS} value={width} onChange={...} />
</SettingRow>`}
          </StoryCode>
          <div className='max-w-sm'>
            <SettingRow
              help='How much of the row this field takes.'
              label='Field width'
            >
              <InputSelect options={WIDTHS} value={width} onChange={setWidth} />
            </SettingRow>
          </div>
        </section>

        <section>
          <StorySubTitle>Required, optional, hint and error</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            The same required star, &quot;(optional)&quot; text and hint icon as
            the other inputs. An error replaces the help sentence. Pass the
            error to the row only; the control should not print it again.
          </p>
          <StoryCode>
            {`<SettingRow label='Master form' required help='The master form to look up.'>…</SettingRow>
<SettingRow label='Row names' optional help='Leave empty to show numbers.'>…</SettingRow>
<SettingRow label='Master form' required error='Pick a master form.'>…</SettingRow>`}
          </StoryCode>
          <div className='grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3'>
            <SettingRow
              help='The master form to look up.'
              label='Master form'
              required
            >
              <InputText value='' onChange={() => {}} />
            </SettingRow>
            <SettingRow
              help='Leave empty to show numbers.'
              label='Row names'
              optional
            >
              <InputText value='' onChange={() => {}} />
            </SettingRow>
            <SettingRow
              error='Pick a master form.'
              help='The master form to look up.'
              label='Master form'
              required
            >
              <InputText
                classNames={{ input: 'border-red-8' }}
                value=''
                onChange={() => {}}
              />
            </SettingRow>
          </div>
        </section>

        <section>
          <StorySubTitle>Setting Switch Row</StorySubTitle>
          <p className='mb-4 text-14 text-gray-11'>
            An on/off setting: a bordered row with a title and a sentence on the
            left and the switch on the right. The whole row can be clicked.
          </p>
          <StoryCode>
            {`<SettingSwitchRow
  checked={required}
  help='Users must fill this in before they can submit.'
  title='Required'
  onChange={setRequired}
/>`}
          </StoryCode>
          <div className='max-w-sm space-y-3'>
            <SettingSwitchRow
              checked={required}
              help='Users must fill this in before they can submit.'
              title='Required'
              onChange={setRequired}
            />
            <SettingSwitchRow
              checked={hidden}
              help="Don't show the field name above this field."
              title='Hide the field name'
              onChange={setHidden}
            />
            <SettingSwitchRow
              help='This is locked for the current stage.'
              title='Disabled example'
              checked
              disabled
              onChange={() => {}}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
