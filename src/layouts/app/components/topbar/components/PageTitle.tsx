import { useMatches } from '@tanstack/react-router'

const PageTitle = () => {
  const matches = useMatches()
  const current = matches[matches.length - 1]
  const pageTitle = current?.staticData?.pageTitle ?? 'Untitled'

  return (
    <div className='flex items-center gap-4'>
      <h1 className='m-0 font-poppins text-16 font-semibold text-gray-13'>
        {pageTitle}
      </h1>
    </div>
  )
}

PageTitle.displayName = 'PageTitle'
export default PageTitle