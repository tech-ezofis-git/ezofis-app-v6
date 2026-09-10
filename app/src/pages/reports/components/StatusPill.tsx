import cn from '@/utils/cn'

const COLOR_CLASS: Record<string, string> = {
  blue: 'border-blue-5 bg-blue-3 text-blue-11',
  gray: 'border-gray-4 bg-gray-2 text-gray-10',
  green: 'border-green-5 bg-green-3 text-green-11',
  orange: 'border-orange-5 bg-orange-3 text-orange-11',
  red: 'border-red-5 bg-red-3 text-red-11',
}

interface Props {
  color: string
  label: string
}

const StatusPill = ({ color, label }: Props) => (
  <span
    className={cn(
      'inline-flex items-center rounded-[10px] border px-2.5 py-0.5 text-xs font-normal',
      COLOR_CLASS[color] || COLOR_CLASS.gray,
    )}
  >
    {label}
  </span>
)

StatusPill.displayName = 'StatusPill'
export default StatusPill
