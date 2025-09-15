import { Highlight as Base } from '@mantine/core'

interface Props {
  children: string
  words: string[]
}

const Highlight = ({ children, words }: Props) => {
  return (
    <Base
      highlight={words}
      inherit
      highlightStyles={{
        backgroundColor: 'var(--primary-11)',
        borderRadius: '1px',
        color: 'var(--gray-0)',
      }}
    >
      {children}
    </Base>
  )
}

Highlight.displayName = 'Highlight'
export default Highlight
