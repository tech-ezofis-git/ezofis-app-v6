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
        backgroundColor: 'var(--primary-9)',
        borderRadius: '1px',
        color: 'white',
      }}
    >
      {children}
    </Base>
  )
}

Highlight.displayName = 'Highlight'
export default Highlight
