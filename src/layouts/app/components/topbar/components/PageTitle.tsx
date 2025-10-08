import { useLocation } from '@tanstack/react-router'

const PageTitle = () => {
  const pathname = useLocation({
    select: (location) => location.pathname,
  })
  const replacedPathname = pathname.replace('/', '').replace('-', ' ')

  return (
    <h1 className='m-0 font-poppins text-base font-semibold text-gray-13 capitalize'>
      {replacedPathname || 'Dashboard'}
    </h1>
  )
}

PageTitle.displayName = 'PageTitle'
export default PageTitle
