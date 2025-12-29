import Button from '@/components/base/button/Button'
import OverlayFooterWrapper from '@/components/base/overlay/OverlayFooterWrapper'

const Footer = () => {
  return (
    <OverlayFooterWrapper className='justify-end gap-3 px-4 py-3'>
      <Button
        color='red'
        label='Reject'
        variant='outline'
        className='text-15 px-4 py-4'
      />
      <Button
        label='Approve'
        className='text-15 px-4 py-4'
      />
    </OverlayFooterWrapper>
  )
}

Footer.displayName = 'Footer'
export default Footer
