import Button from '@/components/base/button/Button'
import OverlayFooterWrapper from '@/components/base/overlay/OverlayFooterWrapper'

const Footer = ({ submitting, onSubmit }: any) => {
  return (
    <OverlayFooterWrapper className='justify-end gap-3 px-4 py-3'>
      {/* <Button
        color='red'
        label='Reject'
        variant='outline'
        className='text-15 px-4 py-4'
      /> */}
      <Button
        className='px-4 py-4 text-15'
        disabled={submitting}
        label='Approve'
        loading={submitting}
        onClick={onSubmit}
      />
    </OverlayFooterWrapper>
  )
}

Footer.displayName = 'Footer'
export default Footer
