import type { ReactNode } from 'react'

type SettingsFormSectionProps = {
  children: ReactNode
}

export default function SettingsFormSection({
  children,
}: SettingsFormSectionProps) {
  return <div className='space-y-6'>{children}</div>
}
