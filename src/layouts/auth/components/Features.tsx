import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import IconButton from '@/components/base/button/IconButton'
import cn from '@/utils/cn'

const features = [
  {
    description:
      'Transform complex manual processes into efficient, AI-driven automated workflows, enhancing operational speed and reducing human error across your organization.',
    title: 'Smart Workflow Automation',
  },
  {
    description:
      'Create highly dynamic and intuitive forms with AI assistance, enabling effortless data collection, seamless integration, and improved user experience for all your needs.',
    title: 'Intelligent Form Builder',
  },
  {
    description:
      'Securely store, manage, and retrieve all your crucial documents with intelligent organization and AI capabilities, ensuring easy access and robust data governance.',
    title: 'AI-Enhanced Document Management',
  },
  {
    description:
      'Organize and visualize your projects with smart, adaptable Kanban-style task boards, leveraging AI to prioritize, assign, and track progress efficiently for your team.',
    title: 'AI-Driven Task Management',
  },
  {
    description:
      'Launch custom web portals or mini-sites effortlessly with AI-assisted layout, branding, and content suggestions tailored to your audience.',
    title: 'Smart Portal Builder',
  },
]

const Features = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const nextIndex = activeIndex + 1
    const lastIndex = features.length - 1
    const index = nextIndex > lastIndex ? 0 : nextIndex
    const timeout = setTimeout(() => setActiveIndex(index), 6000)
    return () => clearTimeout(timeout)
  }, [activeIndex])

  return (
    <div className='mt-18 w-130'>
      <AnimatePresence mode='wait'>
        <motion.div
          className='flex h-28 flex-col items-center text-center'
          exit={{ opacity: 0, scale: 0.9 }}
          initial={{ opacity: 0, scale: 0.9 }}
          key={activeIndex}
          transition={{ ease: 'easeInOut' }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
        >
          <h1 className='mb-2 font-poppins text-17 font-semibold text-gray-13'>
            {features[activeIndex].title}
          </h1>
          <div className='text-13/6 font-[400] text-pretty text-gray-11'>
            {features[activeIndex].description}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className='mt-6 flex items-center justify-center gap-1'>
        {features.map((_, index) => (
          <IconButton
            ariaLabel='change'
            color={activeIndex === index ? 'primary' : 'gray'}
            icon='tabler:point-filled'
            key={index}
            size='xs'
            variant='ghost'
            className={cn(
              'rounded-full',
              activeIndex === index
                ? 'text-primary-9 hover:text-primary-9'
                : 'text-gray-8 hover:text-gray-9',
            )}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

Features.displayName = 'Features'
export default Features
