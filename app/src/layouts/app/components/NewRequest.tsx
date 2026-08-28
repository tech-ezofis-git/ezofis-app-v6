// import Drawer from '@/components/base/Drawer'

import NewRequestSheet from '../../../pages/requests/components/request/NewRequestSheet'
// import { SCREEN_XL } from '@/constants'
import requestStore from '../../../pages/requests/stores/useRequestStore'
const NewRequest = () => {
  const newRequest = requestStore((state) => state.newRequest)
  const closeNewRequest = requestStore((state) => state.closeNewRequest)

  // if (width >= SCREEN_XL && newRequest) {

  return (
    <div className='flex h-full min-w-0 flex-1 flex-col overflow-hidden border-l border-gray-3 bg-surface-muted'>
      {newRequest && <NewRequestSheet onClose={closeNewRequest} />}
    </div>
  )
  // }

  // return (
  //     <Drawer opened={newRequest} onClose={closeNewRequest}>
  //         <NewRequestSheet onClose={closeNewRequest} />
  //     </Drawer>
  // )
}

NewRequest.displayName = 'NewRequest'
export default NewRequest
