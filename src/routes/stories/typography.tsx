import { createFileRoute } from '@tanstack/react-router'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/typography')({
    component: RouteComponent,
})

function RouteComponent() {
    const fontScales = [
        { name: 'text-11', size: '11px', weight: 'normal' },
        { name: 'text-12', size: '12px', weight: 'normal' },
        { name: 'text-13', size: '13px', weight: 'normal' },
        { name: 'text-14', size: '14px', weight: 'normal' },
        { name: 'text-15', size: '15px', weight: 'normal' },
        { name: 'text-16', size: '16px', weight: 'normal' },
        { name: 'text-17', size: '17px', weight: 'normal' },
        { name: 'text-18', size: '18px', weight: 'normal' },
        { name: 'text-19', size: '19px', weight: 'normal' },
        { name: 'text-20', size: '20px', weight: 'normal' },
        { name: 'text-21', size: '21px', weight: 'normal' },
    ]

    return (
        <div className='max-w-5xl p-6'>
            <StoryTitle>Typography</StoryTitle>
            <p className='text-15 text-gray-11 mb-10'>
                Our typography system is designed for readability and hierarchy across complex dashboard interfaces.
                It utilizes two primary typefaces: **Inter** for UI elements and data, and **Poppins** for headings and branding.
            </p>

            <div className='space-y-16'>
                {/* Font Families */}
                <section>
                    <StorySubTitle>Font Families</StorySubTitle>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-8 mt-6'>
                        <div className='p-6 bg-gray-2 border border-gray-3 rounded-xl'>
                            <p className='text-12 text-gray-9 uppercase tracking-wider mb-4 font-semibold'>Primary / UI</p>
                            <h3 className='font-inter text-20 font-semibold mb-2'>Inter (Default)</h3>
                            <p className='font-inter text-14 text-gray-11 leading-relaxed'>
                                The quick brown fox jumps over the lazy dog.
                                Used for labels, inputs, table data, and most interface text.
                            </p>
                            <div className='mt-6'>
                                <StoryCode>font-family: var(--font-inter);</StoryCode>
                            </div>
                        </div>

                        <div className='p-6 bg-gray-2 border border-gray-3 rounded-xl'>
                            <p className='text-12 text-gray-9 uppercase tracking-wider mb-4 font-semibold'>Secondary / Decorative</p>
                            <h3 className='font-poppins text-20 font-semibold mb-2'>Poppins</h3>
                            <p className='font-poppins text-14 text-gray-11 leading-relaxed'>
                                The quick brown fox jumps over the lazy dog.
                                Used for headings, brand elements, and featured statistics.
                            </p>
                            <div className='mt-6'>
                                <StoryCode>font-family: var(--font-poppins);</StoryCode>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Headings */}
                <section>
                    <StorySubTitle>Headings</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-6'>
                        Standard heading hierarchy using the Poppins typeface for distinction.
                    </p>
                    <div className='flex flex-col gap-8 mt-6'>
                        <div className='space-y-3 pb-6 border-b border-gray-2'>
                            <span className='text-12 text-gray-9 uppercase tracking-wider font-semibold ml-1'>H1 / Page Title</span>
                            <div className="bg-white p-4 rounded-lg border border-gray-2">
                                <h1 className='text-21 font-semibold font-poppins text-gray-12'>The quick brown fox jumps over the lazy dog</h1>
                            </div>
                            <StoryCode>font-poppins text-21 font-semibold text-gray-12</StoryCode>
                        </div>

                        <div className='space-y-3 pb-6 border-b border-gray-2'>
                            <span className='text-12 text-gray-9 uppercase tracking-wider font-semibold ml-1'>H2 / Section Title</span>
                            <div className="bg-white p-4 rounded-lg border border-gray-2">
                                <h2 className='text-19 font-semibold font-poppins text-gray-12'>The quick brown fox jumps over the lazy dog</h2>
                            </div>
                            <StoryCode>font-poppins text-19 font-semibold text-gray-12</StoryCode>
                        </div>

                        <div className='space-y-3 pb-6 border-b border-gray-2'>
                            <span className='text-12 text-gray-9 uppercase tracking-wider font-semibold ml-1'>H3 / Subsection Title</span>
                            <div className="bg-white p-4 rounded-lg border border-gray-2">
                                <h3 className='text-17 font-semibold font-poppins text-gray-12'>The quick brown fox jumps over the lazy dog</h3>
                            </div>
                            <StoryCode>font-poppins text-17 font-semibold text-gray-12</StoryCode>
                        </div>

                        <div className='space-y-3'>
                            <span className='text-12 text-gray-9 uppercase tracking-wider font-semibold ml-1'>H4 / Card Title</span>
                            <div className="bg-white p-4 rounded-lg border border-gray-2">
                                <h4 className='text-15 font-semibold font-inter text-gray-12'>The quick brown fox jumps over the lazy dog</h4>
                            </div>
                            <StoryCode>font-inter text-15 font-semibold text-gray-12</StoryCode>
                        </div>
                    </div>
                </section>

                {/* Content Styles */}
                <section>
                    <StorySubTitle>Content Styles</StorySubTitle>
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6'>
                        {/* Example 1: Header + Description */}
                        <div>
                            <p className='text-12 text-gray-9 uppercase tracking-wider font-semibold mb-4'>Page Header</p>
                            <div className='p-6 bg-white border border-gray-3 rounded-xl space-y-2'>
                                <h2 className='text-18 font-semibold text-gray-12'>Account Settings</h2>
                                <p className='text-15 text-gray-11 font-medium'>Manage your profile and security preferences</p>
                            </div>
                            <div className='mt-4 space-y-2'>
                                <StoryCode>Title: text-18 font-semibold text-gray-12</StoryCode>
                                <StoryCode>Subtitle: text-15 text-gray-11 font-medium</StoryCode>
                            </div>
                        </div>

                        {/* Example 2: Card Content */}
                        <div>
                            <p className='text-12 text-gray-9 uppercase tracking-wider font-semibold mb-4'>Body Content</p>
                            <div className='p-6 bg-white border border-gray-3 rounded-xl space-y-3'>
                                <h4 className='text-15 font-semibold text-gray-12'>About this project</h4>
                                <p className='text-14 text-gray-11 leading-relaxed'>
                                    This dashboard is designed to provide a comprehensive overview of your data.
                                    The typography system ensures that information is legible and hierarchically structured.
                                </p>
                            </div>
                            <div className='mt-4 space-y-2'>
                                <StoryCode>Body: text-14 text-gray-11 leading-relaxed</StoryCode>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Font Weights */}
                <section>
                    <StorySubTitle>Font Weights</StorySubTitle>
                    <div className='space-y-4 mt-6'>
                        <div className='flex items-center gap-8 py-2 border-b border-gray-2'>
                            <span className='text-13 text-gray-9 w-24'>Normal (450)</span>
                            <p className='text-18 font-normal'>The quick brown fox jumps over the lazy dog</p>
                        </div>
                        <div className='flex items-center gap-8 py-2 border-b border-gray-2'>
                            <span className='text-13 text-gray-9 w-24'>Medium (500)</span>
                            <p className='text-18 font-medium'>The quick brown fox jumps over the lazy dog</p>
                        </div>
                        <div className='flex items-center gap-8 py-2 border-b border-gray-2'>
                            <span className='text-13 text-gray-9 w-24'>Semibold (600)</span>
                            <p className='text-18 font-semibold'>The quick brown fox jumps over the lazy dog</p>
                        </div>
                        <div className='flex items-center gap-8 py-2 border-b border-gray-2'>
                            <span className='text-13 text-gray-9 w-24'>Bold (700)</span>
                            <p className='text-18 font-bold'>The quick brown fox jumps over the lazy dog</p>
                        </div>
                    </div>
                </section>

                {/* Text Scale */}
                <section>
                    <StorySubTitle>Text Scale</StorySubTitle>
                    <p className='text-14 text-gray-11 mb-6'>
                        Consistent text scaling from 11px to 21px using utility classes.
                    </p>
                    <div className='space-y-6 bg-gray-2 border border-gray-3 rounded-xl overflow-hidden'>
                        <table className='w-full text-left'>
                            <thead>
                                <tr className='bg-gray-3 border-b border-gray-3'>
                                    <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>Utility Class</th>
                                    <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>Size</th>
                                    <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>Sample</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-2'>
                                {fontScales.map((scale) => (
                                    <tr key={scale.name} className='hover:bg-gray-1/50 transition-colors'>
                                        <td className='px-6 py-4'>
                                            <code className='text-13 text-primary-11'>{scale.name}</code>
                                        </td>
                                        <td className='px-6 py-4 text-13 text-gray-11'>{scale.size}</td>
                                        <td className='px-6 py-4'>
                                            <p className={`${scale.name}`}>Typography scale example</p>
                                        </td>
                                    </tr>
                                )).reverse()}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}
