import Icon from '@/components/base/icon/Icon'
import IconAI from '@/components/base/icon/IconAI'
import HeroText from '@/components/common/HeroText'

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
        <IconAI className='size-8' />

        <HeroText
          className='mt-6 block text-left'
          description='Here are a few things I can do, or ask me anything!'
          title='How can I assist you?'
        />
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
