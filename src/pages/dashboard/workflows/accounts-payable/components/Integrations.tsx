import { useState, useEffect } from 'react'
import { useViewportSize } from '@mantine/hooks'
import Badge from '@/components/base/Badge'
import Icon from '@/components/base/icon/Icon'
import { motion } from 'motion/react'
import {
  // AnimateBounce,
  AnimateFadeIn,
  // AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import { SkeletonIntegrationCard } from '@/components/common/skeletons'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

const items = [
  {
    account: 'example@gmail.com',
    icon: 'tabler:mail',
    iconColor: 'bg-red-2 text-red-9',
    name: 'Email Integration',
    platform: 'Gmail',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'tabler:database',
    iconColor: 'bg-blue-2 text-blue-9',
    name: 'ERP System',
    platform: 'Quickbooks',
    status: 'connected',
  },
  {
    account: 'example@gmail.com',
    icon: 'tabler:cloud',
    iconColor: 'bg-cyan-2 text-cyan-9',
    name: 'Document Storage',
    platform: 'Google Drive',
    status: 'connected',
  },
]

const Integrations = () => {
  const { width } = useViewportSize()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const animationVariants = [
    AnimateFadeIn,
    AnimateSlideUp,
    AnimateScale,
  ]

  return (
    <Section title='Integrations'>
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-3'
            : 'md:grid-cols-2 xl:grid-cols-3',
        )}
      >
        {isLoading ? (
          <>
            {items.map((_, index) => (
              <SkeletonIntegrationCard key={`skeleton-${index}`} />
            ))}
          </>
        ) : (
          items.map((item, index) => {
            const AnimationComponent = animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent
                key={item.name}
                delay={0.15 + index * 0.12}
              >
                <div className='rounded border border-gray-3 p-4'>
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className='mb-4 flex items-center gap-4 border-b border-gray-3 pb-4'
                    initial={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.2 + index * 0.12, duration: 0.4 }}
                  >
                    <motion.div
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      className={cn('flex size-10 items-center justify-center rounded', item.iconColor)}
                      initial={{ opacity: 0, scale: 0, rotate: -180 }}
                      transition={{ delay: 0.25 + index * 0.12, duration: 0.5, type: 'spring' }}
                    >
                      <Icon className='size-5' name={item.icon} />
                    </motion.div>

                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className='text-15 font-semibold text-gray-13'
                      initial={{ opacity: 0, x: -10 }}
                      transition={{ delay: 0.3 + index * 0.12, duration: 0.4 }}
                    >
                      {item.name}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    animate={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    transition={{ delay: 0.35 + index * 0.12, duration: 0.4 }}
                  >
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className='flex h-8 items-center justify-between gap-3'
                      initial={{ opacity: 0, x: -5 }}
                      transition={{ delay: 0.4 + index * 0.12, duration: 0.3 }}
                    >
                      <div>Status:</div>
                      <Badge
                        className='capitalize'
                        color='green'
                        label={item.status}
                      />
                    </motion.div>

                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className='flex h-8 items-center justify-between gap-3'
                      initial={{ opacity: 0, x: -5 }}
                      transition={{ delay: 0.45 + index * 0.12, duration: 0.3 }}
                    >
                      <div>Platform:</div>
                      <div className='truncate font-medium text-gray-12 capitalize'>
                        {item.platform}
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      className='flex h-8 items-center justify-between gap-3'
                      initial={{ opacity: 0, x: -5 }}
                      transition={{ delay: 0.5 + index * 0.12, duration: 0.3 }}
                    >
                      <div>Account:</div>
                      <div className='truncate font-medium text-gray-12'>
                        {item.account}
                      </div>
                    </motion.div>
                  </motion.div>
                </div>
              </AnimationComponent>
            )
          })
        )}
      </div>
    </Section>
  )
}

Integrations.displayName = 'Integrations'
export default Integrations