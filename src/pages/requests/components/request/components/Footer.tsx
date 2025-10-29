import Button from '@/components/base/button/Button'
import OverlayFooterWrapper from '@/components/base/overlay/OverlayFooterWrapper'

const Footer = () => {
  return (
    <OverlayFooterWrapper className='justify-end gap-2'>
      <Button color='red' label='Reject' variant='outline' />
      <Button label='Approve' />
    </OverlayFooterWrapper>
  )
}

Footer.displayName = 'Footer'
export default Footer
