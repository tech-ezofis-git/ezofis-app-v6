import IconButton from '@/components/base/button/IconButton'
import useAskAIStore from '@/components/common/ask-ai/stores/useAskAIStore'

const AskAITrigger = () => {
  const open = useAskAIStore((state) => state.open)

  return (
    <IconButton
      className='fixed right-4 bottom-4 size-10 rounded-full'
      icon='mingcute:ai-fill'
      iconClass='size-5'
      onClick={open}
    />
  )
}

AskAITrigger.displayName = 'AskAITrigger'
export default AskAITrigger
