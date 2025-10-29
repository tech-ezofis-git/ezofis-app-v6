import AIChatHeader from './components/header/AIChatHeader'
import AIChatInput from './components/input/AIChatInput'
import AIChatSuggestions from './components/suggestions/AIChatSuggestions'

interface Props {
  onClose: () => void
}

const AIChat = ({ onClose }: Props) => {
  return (
    <>
      <AIChatHeader onClose={onClose} />
      <div style={{ height: 'calc(100svh - 540px)' }}></div>
      <AIChatSuggestions />
      <AIChatInput />
    </>
  )
}

AIChat.displayName = 'AIChat'
export default AIChat
