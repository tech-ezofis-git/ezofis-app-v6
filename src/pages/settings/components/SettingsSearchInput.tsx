import { Search } from 'lucide-react'
import InputText from '@/components/base/inputs/InputText'

type SettingsSearchInputProps = {
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export default function SettingsSearchInput({
  placeholder,
  value,
  onChange,
}: SettingsSearchInputProps) {
  return (
    <InputText
      leftSection={<Search className='text-[var(--gray-10)]' size={15} />}
      leftSectionPointerEvents='none'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )
}
