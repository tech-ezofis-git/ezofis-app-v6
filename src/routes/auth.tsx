import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { AnimateFadeIn, AnimateScale, AnimateSlideUp } from '@/components/common/animations'

const Sparkles = () => {
    const sparkles = [
        { id: 1, angle: 0, delay: 0.2, scale: 0.8, distance: 40 },
        { id: 2, angle: 45, delay: 0.3, scale: 0.6, distance: 35 },
        { id: 3, angle: 90, delay: 0.1, scale: 0.9, distance: 45 },
        { id: 4, angle: 135, delay: 0.4, scale: 0.7, distance: 38 },
        { id: 5, angle: 180, delay: 0.2, scale: 0.8, distance: 42 },
        { id: 6, angle: 225, delay: 0.3, scale: 0.6, distance: 36 },
        { id: 7, angle: 270, delay: 0.1, scale: 0.9, distance: 44 },
        { id: 8, angle: 315, delay: 0.4, scale: 0.7, distance: 39 },
    ]

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {sparkles.map((sparkle) => (
                <motion.div
                    key={sparkle.id}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, sparkle.scale, 0],
                        x: Math.cos(sparkle.angle * (Math.PI / 180)) * sparkle.distance,
                        y: Math.sin(sparkle.angle * (Math.PI / 180)) * sparkle.distance,
                    }}
                    transition={{
                        duration: 0.8,
                        delay: sparkle.delay,
                        ease: "easeOut",
                        repeat: Infinity,
                        repeatDelay: 1.5
                    }}
                    className="absolute"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="orange"
                        className="text-yellow-400"
                    >
                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                    </svg>
                </motion.div>
            ))}
        </div>
    )
}

export const Route = createFileRoute('/auth')({
    component: AuthPage,
})

function AuthPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { grant, provider, connector } = Route.useSearch() as any

    const hasSentMessage = useRef(false)

    useEffect(() => {
        if (grant === 'success' && !hasSentMessage.current) {
            hasSentMessage.current = true
            // Send message to parent window
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: 'CONNECTION_SUCCESS',
                        provider,
                        connector,
                    },
                    window.location.origin,
                )
            }

            // Close the window after a short delay
            const timer = setTimeout(() => {
                window.close()
            }, 1500)

            return () => clearTimeout(timer)
        }
    }, [grant, provider, connector])

    return (
        <div className='flex h-screen w-full flex-col items-center justify-center gap-4 bg-gray-1'>
            {grant === 'success' ? (
                <>
                    <AnimateScale delay={0.1}>
                        <div className='relative flex items-center justify-center'>
                            <div className='relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-green-1 text-green-9 shadow-sm'>
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    width='32'
                                    height='32'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='3'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                >
                                    <path d='M20 6 9 17l-5-5' />
                                </svg>
                            </div>
                            <Sparkles />
                        </div>
                    </AnimateScale>
                    <AnimateSlideUp delay={0.2}>
                        <h1 className='text-xl font-semibold text-gray-12'>
                            Connection Successful!
                        </h1>
                    </AnimateSlideUp>
                    <AnimateFadeIn delay={0.3}>
                        <p className='text-gray-11'>
                            You can close this tab and return to the editor.
                        </p>
                    </AnimateFadeIn>
                </>
            ) : (
                <>
                    <AnimateScale delay={0.1}>
                        <div className='flex h-16 w-16 items-center justify-center rounded-full bg-red-1 text-red-9'>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='32'
                                height='32'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <circle cx='12' cy='12' r='10' />
                                <line x1='12' x2='12' y1='8' y2='12' />
                                <line x1='12' x2='12.01' y1='16' y2='16' />
                            </svg>
                        </div>
                    </AnimateScale>
                    <AnimateSlideUp delay={0.2}>
                        <h1 className='text-xl font-semibold text-gray-12'>
                            Connection Failed
                        </h1>
                    </AnimateSlideUp>
                    <AnimateFadeIn delay={0.3}>
                        <p className='text-gray-11 text-center max-w-md'>
                            Something went wrong while connecting. Please try again.
                        </p>
                    </AnimateFadeIn>
                </>
            )}
        </div>
    )
}
