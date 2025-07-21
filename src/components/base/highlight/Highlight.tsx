import { Highlight as Primitive } from '@mantine/core'

interface Props {
  children: string
  words: string[]
}

const Highlight: React.FC<Props> = ({ children, words }) => {
  return (
    <Primitive
      highlight={words}
      inherit
      highlightStyles={{
        backgroundColor: 'var(--primary)',
        borderRadius: '1px',
        color: 'var(--gray-50)',
      }}
    >
      {children}
    </Primitive>
  )
}

export default Highlight
