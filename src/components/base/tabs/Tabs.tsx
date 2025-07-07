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
        list: 'before:border-0 before:border-b before:border-gray-100',
        tab: 'group h-9 gap-2 px-4 py-2 font-medium text-gray-600 outline-0 hover:border-gray-100 hover:bg-gray-100 focus-visible:bg-gray-100 data-[active]:border-primary data-[active]:text-primary data-[active]:transition-colors data-[disabled]:pointer-events-none',
        tabSection: 'm-0 text-gray-500 group-data-[active]:text-primary',
      }}
      onChange={onChange}
    >
      <Primitive.List>{children}</Primitive.List>
    </Primitive>
  )
}

export default Tabs
