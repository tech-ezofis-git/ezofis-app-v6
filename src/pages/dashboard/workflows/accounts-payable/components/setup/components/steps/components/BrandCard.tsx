import { motion } from 'motion/react'
import Icon from '@/components/base/icon/Icon'
import InputRadioCard from '@/components/base/inputs/InputRadioCard'
import cn from '@/utils/cn'

interface Props {
  checked: boolean
  logo?: string
  icon?: string
  name: string
  value: string
  onClick: () => void
  description?: string
}

const BrandCard = ({ checked, logo, icon, name, value, onClick, description }: Props) => {
  return (
    <InputRadioCard
      checked={checked}
      className={cn(
        'group relative flex h-full min-h-[72px] flex-row items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 transition-all duration-200 cursor-pointer',
        checked
          ? 'border-green-9 bg-green-1 shadow-sm'
          : 'border-gray-4 bg-surface hover:border-gray-5 hover:bg-gray-2'
      )}
      value={value}
      onClick={onClick}
    >
      <div className='flex flex-1 items-center gap-3'>
        <div
          className={cn(
            'relative flex size-9 shrink-0 items-center justify-center rounded-md p-1.5 transition-all duration-200',
            checked
              ? 'bg-white shadow-sm'
              : 'bg-gray-2 group-hover:bg-gray-3'
          )}
        >
          {icon ? (
            <Icon className={cn('size-5', checked ? 'text-green-11' : 'text-primary-11')} name={icon} />
          ) : logo ? (
            <img
              alt={name}
              className='size-full object-contain'
              src={logo}
            />
          ) : null}
        </div>
        <div className='flex-1 min-w-0'>
          <div
            className={cn(
              'text-14 font-medium transition-colors truncate',
              checked ? 'text-green-11' : 'text-gray-13'
            )}
          >
            {name}
          </div>
          {description && (
            <div className='text-12 text-gray-10 mt-0.5'>
              {description}
            </div>
          )}
        </div>
      </div>
      {checked && (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2, type: 'spring' }}
          className='flex size-5 shrink-0 items-center justify-center rounded-full bg-green-9'
        >
          <Icon className='size-3 text-white' name='tabler:check' />
        </motion.div>
      )}
    </InputRadioCard>
  )
}

BrandCard.displayName = 'BrandCard'
export default BrandCard