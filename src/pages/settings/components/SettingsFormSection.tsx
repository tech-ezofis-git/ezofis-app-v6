import type { ReactNode } from 'react'

type SettingsFormSectionProps = {
  children: ReactNode
}

export default function SettingsFormSection({
  children,
}: SettingsFormSectionProps) {
  return <div className='flex flex-col gap-6 md:gap-7'>{children}</div>
}
