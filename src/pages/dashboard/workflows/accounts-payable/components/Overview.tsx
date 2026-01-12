import { useState, useEffect } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useViewportSize } from '@mantine/hooks'
import Icon from '@/components/base/icon/Icon'
import { motion } from 'motion/react'
import {
  AnimateBounce,
  // AnimateFadeIn,
  AnimateRotate,
  AnimateScale,
  AnimateSlideUp,
} from '@/components/common/animations'
import { SkeletonCard } from '@/components/common/skeletons'
import { SCREEN_XL } from '@/constants'
import cn from '@/utils/cn'
import Section from '../../shared/components/Section'

const Overview = () => {
  const { t } = useLingui()
  const { width } = useViewportSize()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const items = [
    {
      change: '+23%',
      icon: 'tabler:file-description',
      iconColor: 'bg-blue-2 text-blue-9',
      name: t`Invoices Processed`,
      value: '240',
    },
    {
      change: '-67%',
      icon: 'tabler:clock',
      iconColor: 'bg-orange-2 text-orange-9',
      name: t`Average Processing Time`,
      value: '3.6 Minutes',
    },
    {
      change: '+156%',
      icon: 'tabler:currency-dollar',
      iconColor: 'bg-green-2 text-green-9',
      name: t`Cost Savings`,
      value: '$24.5K',
    },
    {
      change: '+0.5%',
      icon: 'tabler:focus-2',
      iconColor: 'bg-purple-2 text-purple-9',
      name: t`Accuracy Rate`,
      value: '99.9%',
    },
  ]

  const animationVariants = [
    AnimateSlideUp,
    AnimateScale,
    AnimateBounce,
    AnimateRotate,
  ]

  return (
    <Section title='Overview'>
      <div
        className={cn(
          'grid grid-cols-1 gap-3',
          width >= SCREEN_XL
            ? '@xl:grid-cols-2 @5xl:grid-cols-4'
            : 'md:grid-cols-2 xl:grid-cols-4',
        )}
      >
        {isLoading ? (
          <>
            {items.map((_, index) => (
              <SkeletonCard key={`skeleton-${index}`} />
            ))}
          </>
        ) : (
          items.map((item, index) => {
            const AnimationComponent = animationVariants[index % animationVariants.length]
            return (
              <AnimationComponent
                key={item.name}
                delay={0.1 + index * 0.1}
              >
                <div className='rounded border border-gray-3 bg-surface p-4'>
                  <div className='mb-4 flex items-center justify-between gap-2'>
                    <motion.div
                      animate={{ opacity: 1, x: 0 }}
                      initial={{ opacity: 0, x: -10 }}
                      transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                    >
                      <div className='mb-1'>{item.name}</div>
                      <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className='text-18 font-semibold text-gray-13'
                        initial={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                      >
                        {item.value}
                      </motion.div>
                    </motion.div>

                    <motion.div
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      className={cn('flex size-10 items-center justify-center rounded', item.iconColor)}
                      initial={{ opacity: 0, rotate: -180, scale: 0 }}
                      transition={{ delay: 0.25 + index * 0.1, duration: 0.5, type: 'spring' }}
                    >
                      <Icon className='size-5' name={item.icon} />
                    </motion.div>
                  </div>

                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className='flex items-center justify-between gap-1 border-t border-gray-3 pt-4'
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                  >
                    <div className='flex items-center gap-1'>
                      <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn('font-medium text-green-11', {
                          'text-red-11': item.change.startsWith('-'),
                        })}
                        initial={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.45 + index * 0.1, duration: 0.3 }}
                      >
                        {item.change}
                      </motion.div>
                      <div className='text-gray-10'>
                        vs <Trans>yesterday</Trans>
                      </div>
                    </div>

                    <motion.div
                      animate={{ opacity: 1, rotate: 0 }}
                      className='flex w-13 items-center justify-center'
                      initial={{ opacity: 0, rotate: -90 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                    >
                      <Icon
                        className={cn('size-5 text-green-11', {
                          'text-red-11': item.change.startsWith('-'),
                        })}
                        name={
                          item.change.startsWith('+')
                            ? 'tabler:trending-up'
                            : 'tabler:trending-down'
                        }
                      />
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

Overview.displayName = 'Overview'
export default Overview