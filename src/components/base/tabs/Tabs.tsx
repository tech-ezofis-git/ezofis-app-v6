import { Tabs as Primitive } from '@mantine/core'

interface Props {
  children: React.ReactNode
  value: string | null
  onChange: (value: string | null) => void
}

const Tabs: React.FC<Props> = ({ children, onChange, value }) => {
  return (
    <Primitive
      value={value}
      classNames={{
        list: 'before:border-0 before:border-b before:border-gray-600/10',
        tab: 'group h-9 gap-2 px-4 py-2 font-medium text-gray-500 outline-0 hover:border-surface-hover hover:bg-surface-hover hover:text-gray-600 hover:transition-colors focus-visible:bg-surface-hover data-[active]:border-primary data-[active]:text-primary data-[active]:transition-colors data-[disabled]:pointer-events-none',
        tabSection:
          'm-0 text-gray-400 group-hover:text-gray-500 group-hover:transition-colors group-data-[active]:text-primary',
      }}
      onChange={onChange}
    >
      <Primitive.List>{children}</Primitive.List>
    </Primitive>
  )
}

Tabs.displayName = 'Tabs'
export default Tabs
