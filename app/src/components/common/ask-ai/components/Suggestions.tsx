import Icon from '@/components/base/icon/Icon'
import useAskAIStore from '../stores/useAskAIStore'

const Suggestions = () => {
  const suggestions = useAskAIStore((state) => state.suggestions)
  const setSuggestion = useAskAIStore((state) => state.setSuggestion)

  return (
    <ul className='mt-6 px-2'>
      {suggestions.map((suggestion, index) => (
        <li
          className='flex cursor-pointer items-center gap-2 rounded p-2 font-medium hover:bg-gray-4'
          key={index}
          onClick={() => setSuggestion(suggestion)}
        >
          <Icon className='text-gray-9' name='lucide:arrow-right' />
          {suggestion}
        </li>
      ))}
    </ul>
  )
}

Suggestions.displayName = 'Suggestions'
export default Suggestions
