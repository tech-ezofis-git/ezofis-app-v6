import { useLocation } from '@tanstack/react-router'

const PageTitle = () => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const replacedPathname = pathname.replace('/', '').replace('-', ' ')

  return (
    <div className='flex items-center gap-4'>
      <h1 className='m-0 font-poppins text-large font-semibold text-gray-13 capitalize'>
        {replacedPathname || 'Dashboard'}
      </h1>
    </div>
  )
}

PageTitle.displayName = 'PageTitle'
export default PageTitle
