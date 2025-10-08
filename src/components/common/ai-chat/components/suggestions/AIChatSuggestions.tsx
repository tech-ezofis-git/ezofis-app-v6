import Icon from '@/components/base/icon/Icon'
import IconAI from '@/components/base/icon/IconAI'

const suggestions = [
  'Show recent documents.',
  'Create an approval workflow.',
  'Suggest a form template.',
  'Summarize project progress.',
  'Generate an HR portal layout.',
]

const AIChatSuggestions = () => {
  return (
    <div className='p-2'>
      <div className='px-2'>
        <IconAI className='size-10' />

        <div className='mt-6 font-poppins text-lg font-semibold text-gray-12'>
          How can I assist you?
        </div>
        <div className='mt-2 text-sm text-gray-9'>
          Here are a few things I can do, or ask me anything!
        </div>
      </div>

      <ul className='mt-6'>
        {suggestions.map((suggestion, index) => (
          <li
            className='flex cursor-pointer items-center gap-2 rounded p-2 font-medium hover:bg-gray-4'
            key={index}
          >
            <Icon className='text-gray-9' name='tabler:arrow-narrow-right' />
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  )
}

AIChatSuggestions.displayName = 'Suggestions'
export default AIChatSuggestions
