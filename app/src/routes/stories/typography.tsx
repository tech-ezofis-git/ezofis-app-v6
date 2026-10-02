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
      <p className='mb-10 text-15 text-gray-11'>
        Our typography system is designed for readability and hierarchy across
        complex dashboard interfaces. It utilizes two primary typefaces:
        **Inter** for UI elements and data, and **Poppins** for headings and
        branding.
      </p>

      <div className='space-y-16'>
        {/* Font Families */}
        <section>
          <StorySubTitle>Font Families</StorySubTitle>
          <div className='mt-6 grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div className='rounded-xl border border-gray-3 bg-gray-2 p-6'>
              <p className='mb-4 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                Primary / UI
              </p>
              <h3 className='mb-2 font-inter text-20 font-semibold'>
                Inter (Default)
              </h3>
              <p className='font-inter text-14 leading-relaxed text-gray-11'>
                The quick brown fox jumps over the lazy dog. Used for labels,
                inputs, table data, and most interface text.
              </p>
              <div className='mt-6'>
                <StoryCode>font-family: var(--font-inter);</StoryCode>
              </div>
            </div>

            <div className='rounded-xl border border-gray-3 bg-gray-2 p-6'>
              <p className='mb-4 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                Secondary / Decorative
              </p>
              <h3 className='mb-2 font-poppins text-20 font-semibold'>
                Poppins
              </h3>
              <p className='font-poppins text-14 leading-relaxed text-gray-11'>
                The quick brown fox jumps over the lazy dog. Used for headings,
                brand elements, and featured statistics.
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
          <p className='mb-6 text-14 text-gray-11'>
            Standard heading hierarchy using the Poppins typeface for
            distinction.
          </p>
          <div className='mt-6 flex flex-col gap-8'>
            <div className='space-y-3 border-b border-gray-2 pb-6'>
              <span className='ml-1 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                H1 / Page Title
              </span>
              <div className='rounded-lg border border-gray-2 bg-surface p-4'>
                <h1 className='font-poppins text-21 font-semibold text-gray-12'>
                  The quick brown fox jumps over the lazy dog
                </h1>
              </div>
              <StoryCode>
                font-poppins text-21 font-semibold text-gray-12
              </StoryCode>
            </div>

            <div className='space-y-3 border-b border-gray-2 pb-6'>
              <span className='ml-1 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                H2 / Section Title
              </span>
              <div className='rounded-lg border border-gray-2 bg-surface p-4'>
                <h2 className='font-poppins text-19 font-semibold text-gray-12'>
                  The quick brown fox jumps over the lazy dog
                </h2>
              </div>
              <StoryCode>
                font-poppins text-19 font-semibold text-gray-12
              </StoryCode>
            </div>

            <div className='space-y-3 border-b border-gray-2 pb-6'>
              <span className='ml-1 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                H3 / Subsection Title
              </span>
              <div className='rounded-lg border border-gray-2 bg-surface p-4'>
                <h3 className='font-poppins text-17 font-semibold text-gray-12'>
                  The quick brown fox jumps over the lazy dog
                </h3>
              </div>
              <StoryCode>
                font-poppins text-17 font-semibold text-gray-12
              </StoryCode>
            </div>

            <div className='space-y-3'>
              <span className='ml-1 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                H4 / Card Title
              </span>
              <div className='rounded-lg border border-gray-2 bg-surface p-4'>
                <h4 className='font-inter text-15 font-semibold text-gray-12'>
                  The quick brown fox jumps over the lazy dog
                </h4>
              </div>
              <StoryCode>
                font-inter text-15 font-semibold text-gray-12
              </StoryCode>
            </div>
          </div>
        </section>

        {/* Content Styles */}
        <section>
          <StorySubTitle>Content Styles</StorySubTitle>
          <div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2'>
            {/* Example 1: Header + Description */}
            <div>
              <p className='mb-4 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                Page Header
              </p>
              <div className='space-y-2 rounded-xl border border-gray-3 bg-surface p-6'>
                <h2 className='text-18 font-semibold text-gray-12'>
                  Account Settings
                </h2>
                <p className='text-15 font-medium text-gray-11'>
                  Manage your profile and security preferences
                </p>
              </div>
              <div className='mt-4 space-y-2'>
                <StoryCode>Title: text-18 font-semibold text-gray-12</StoryCode>
                <StoryCode>
                  Subtitle: text-15 text-gray-11 font-medium
                </StoryCode>
              </div>
            </div>

            {/* Example 2: Card Content */}
            <div>
              <p className='mb-4 text-12 font-semibold tracking-wider text-gray-9 uppercase'>
                Body Content
              </p>
              <div className='space-y-3 rounded-xl border border-gray-3 bg-surface p-6'>
                <h4 className='text-15 font-semibold text-gray-12'>
                  About this project
                </h4>
                <p className='text-14 leading-relaxed text-gray-11'>
                  This dashboard is designed to provide a comprehensive overview
                  of your data. The typography system ensures that information
                  is legible and hierarchically structured.
                </p>
              </div>
              <div className='mt-4 space-y-2'>
                <StoryCode>
                  Body: text-14 text-gray-11 leading-relaxed
                </StoryCode>
              </div>
            </div>
          </div>
        </section>

        {/* Font Weights */}
        <section>
          <StorySubTitle>Font Weights</StorySubTitle>
          <div className='mt-6 space-y-4'>
            <div className='flex items-center gap-8 border-b border-gray-2 py-2'>
              <span className='w-24 text-13 text-gray-9'>Normal (450)</span>
              <p className='text-18 font-normal'>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
            <div className='flex items-center gap-8 border-b border-gray-2 py-2'>
              <span className='w-24 text-13 text-gray-9'>Medium (500)</span>
              <p className='text-18 font-medium'>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
            <div className='flex items-center gap-8 border-b border-gray-2 py-2'>
              <span className='w-24 text-13 text-gray-9'>Semibold (600)</span>
              <p className='text-18 font-semibold'>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
            <div className='flex items-center gap-8 border-b border-gray-2 py-2'>
              <span className='w-24 text-13 text-gray-9'>Bold (700)</span>
              <p className='text-18 font-bold'>
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
          </div>
        </section>

        {/* Text Scale */}
        <section>
          <StorySubTitle>Text Scale</StorySubTitle>
          <p className='mb-6 text-14 text-gray-11'>
            Consistent text scaling from 11px to 21px using utility classes.
          </p>
          <div className='space-y-6 overflow-hidden rounded-xl border border-gray-3 bg-gray-2'>
            <table className='w-full text-left'>
              <thead>
                <tr className='border-b border-gray-3 bg-gray-3'>
                  <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>
                    Utility Class
                  </th>
                  <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>
                    Size
                  </th>
                  <th className='px-6 py-3 text-12 font-semibold text-gray-9 uppercase'>
                    Sample
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-2'>
                {fontScales
                  .map((scale) => (
                    <tr
                      className='transition-colors hover:bg-gray-1/50'
                      key={scale.name}
                    >
                      <td className='px-6 py-4'>
                        <code className='text-13 text-primary-11'>
                          {scale.name}
                        </code>
                      </td>
                      <td className='px-6 py-4 text-13 text-gray-11'>
                        {scale.size}
                      </td>
                      <td className='px-6 py-4'>
                        <p className={`${scale.name}`}>
                          Typography scale example
                        </p>
                      </td>
                    </tr>
                  ))
                  .reverse()}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
