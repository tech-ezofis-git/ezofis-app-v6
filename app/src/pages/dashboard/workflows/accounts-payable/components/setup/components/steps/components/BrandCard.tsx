import { motion } from 'motion/react'
import Skeleton from '@/components/base/Skeleton'
import Icon from '@/components/base/icon/Icon'
import cn from '@/utils/cn'

interface Props {
  checked: boolean
  name: string
  value: string
  /** When false while checked, shows selected (not connected) styling. Defaults to checked. */
  connected?: boolean
  description?: string
  icon?: string
  loading?: boolean
  logo?: string
  onClick: () => void
}

const BrandCard = ({
  checked,
  connected,
  description,
  icon,
  loading,
  logo,
  name,
  onClick,
}: Props) => {
  const isConnected = connected ?? checked
  const isSelectedOnly = checked && !isConnected

  let cardClass =
    'border-gray-4 bg-surface hover:border-gray-5 hover:bg-gray-2'
  if (isConnected) {
    cardClass = 'border-green-9 bg-green-1 shadow-sm ring-2 ring-green-9/25'
  } else if (isSelectedOnly) {
    cardClass =
      'border-primary-9 bg-primary-1 shadow-sm ring-2 ring-primary-9/20'
  }

  let titleClass = 'text-gray-13'
  if (isConnected) titleClass = 'text-green-11'
  else if (isSelectedOnly) titleClass = 'text-primary-12'

  return (
    <motion.button
      aria-pressed={checked}
      disabled={loading}
      type='button'
      whileHover={{ scale: loading ? 1 : 1.01 }}
      whileTap={{ scale: loading ? 1 : 0.99 }}
      className={cn(
        'group relative flex h-full min-h-[76px] w-full flex-row items-center justify-between gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200',
        loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        cardClass,
      )}
      onClick={onClick}
    >
      <div className='flex flex-1 items-center gap-3'>
        <div
          className={cn(
            'relative flex size-9 shrink-0 items-center justify-center rounded-md p-1.5 transition-all duration-200',
            isConnected || isSelectedOnly
              ? 'bg-white shadow-sm'
              : 'bg-gray-2 group-hover:bg-gray-3',
          )}
        >
          {icon ? (
            <Icon
              name={icon}
              className={cn(
                'size-5',
                isConnected ? 'text-green-11' : 'text-primary-11',
              )}
            />
          ) : logo ? (
            <img alt={name} className='size-full object-contain' src={logo} />
          ) : null}
        </div>
        <div className='min-w-0 flex-1'>
          <div
            className={cn(
              'truncate text-14/5 font-medium transition-colors',
              titleClass,
            )}
          >
            {name}
          </div>
          {description && (
            <p className='mt-0.5 line-clamp-2 text-12/4.5 text-pretty text-gray-10'>
              {description}
            </p>
          )}
        </div>
      </div>
      {loading ? (
        <Skeleton className='h-4 w-12 rounded' />
      ) : (
        isConnected && (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className='flex size-5 shrink-0 items-center justify-center rounded-full bg-green-9'
            initial={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, type: 'spring' }}
          >
            <Icon className='size-3 text-white' name='tabler:check' />
          </motion.div>
        )
      )}
    </motion.button>
  )
}

BrandCard.displayName = 'BrandCard'
export default BrandCard
