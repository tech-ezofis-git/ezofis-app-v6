import { useMatches } from '@tanstack/react-router'
import Title from '@/components/base/Title'

const PageTitle = () => {
  const matches = useMatches()
  const current = matches[matches.length - 1]
  const pageTitle = current?.staticData?.pageTitle ?? 'Untitled'

  return (
    <div className='flex items-center gap-4'>
      <Title level={3} title={pageTitle} />
    </div>
  )
}

PageTitle.displayName = 'PageTitle'
export default PageTitle
