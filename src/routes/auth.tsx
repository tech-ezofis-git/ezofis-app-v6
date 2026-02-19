import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

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
                    <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-1 text-green-9 animate-in zoom-in duration-300'>
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
                            <path d='M20 6 9 17l-5-5' />
                        </svg>
                    </div>
                    <h1 className='text-xl font-semibold text-gray-12'>
                        Connection Successful!
                    </h1>
                    <p className='text-gray-11'>
                        You can close this tab and return to the editor.
                    </p>
                </>
            ) : (
                <>
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
                    <h1 className='text-xl font-semibold text-gray-12'>
                        Connection Failed
                    </h1>
                    <p className='text-gray-11 text-center max-w-md'>
                        Something went wrong while connecting. Please try again.
                    </p>
                </>
            )}
        </div>
    )
}
