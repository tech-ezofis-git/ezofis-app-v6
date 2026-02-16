import { createFileRoute } from '@tanstack/react-router'
import BarLoader from '@/components/base/BarLoader'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/bar-loader')({
    component: BarLoaderStory,
})

function BarLoaderStory() {
    return (
        <div className='max-w-4xl p-6'>
            <StoryTitle>BarLoader</StoryTitle>
            <p className='text-15 text-gray-11 mb-10'>
                The BarLoader is a sleek, horizontal loading indicator used for indeterminate wait times.
                It provides a modern alternative to traditional spinners, especially for page transitions or background process feedback.
            </p>

            <p className='text-14 text-gray-11 mb-4'>Before using BarLoader, import it from its location:</p>
            <StoryCode>
                {`import BarLoader from '@/components/base/BarLoader'`}
            </StoryCode>

            <div className='space-y-16'>
                {/* Basic Usage */}
                <section>
                    <StorySubTitle>Indeterminate State</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-8'>
                        The bar animates continuously to show that a process is active.
                    </p>
                    <div className='space-y-12 rounded-2xl border border-gray-3 bg-gray-1 p-10'>
                        <div className='space-y-2'>
                            <p className='text-12 font-medium text-gray-9'>Fetching data...</p>
                            <BarLoader />
                        </div>

                        <div className='space-y-2'>
                            <p className='text-12 font-medium text-gray-9'>Processing records...</p>
                            <BarLoader />
                        </div>
                    </div>
                    <div className='mt-6'>
                        <StoryCode>{`<BarLoader />`}</StoryCode>
                    </div>
                </section>

                {/* Integration */}
                <section>
                    <StorySubTitle>Dashboard Placement</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-6'>
                        Commonly placed at the very top of a container or content block.
                    </p>
                    <div className='overflow-hidden rounded-xl border border-gray-3 bg-white dark:bg-black'>
                        {/* <BarLoader /> */}
                        <div className='space-y-4 p-8'>
                            <div className='h-6 w-1/3 rounded bg-gray-3 dark:bg-gray-8 transition-colors duration-300' />
                            <div className='space-y-2'>
                                <div className='h-3 w-full rounded bg-gray-3 dark:bg-gray-8 transition-colors duration-300' />
                                <div className='h-3 w-5/6 rounded bg-gray-3 dark:bg-gray-8 transition-colors duration-300' />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
