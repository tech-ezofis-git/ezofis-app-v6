import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import MenuSub from '@/components/base/menu/MenuSub'
import StoryCode from './-components/StoryCode'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/menu')({
  component: RouteComponent,
})

function RouteComponent() {
  const targetBtn = (
    <Button
      color='gray'
      label='Actions'
      suffixIcon='lucide:chevron-down'
      suffixIconClass='text-gray-9'
      variant='outline'
    />
  )

  return (
    <div className='max-w-4xl p-6'>
      <StoryTitle>Menu</StoryTitle>
      <p className='text-15 text-gray-11 mb-10'>
        The Menu component provides a versatile dropdown for listing actions, categories, or secondary navigation. It supports icons, dividers, labels for grouping, and nested submenus for complex hierarchies.
      </p>

      <p className='text-14 text-gray-11 mb-4'>Before using Menu, import the core component and its sub-components:</p>
      <StoryCode>
        {`import Menu from '@/components/base/menu/Menu'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuSub from '@/components/base/menu/MenuSub'`}
      </StoryCode>

      <div className='space-y-16'>
        {/* Default Section */}
        <section>
          <StorySubTitle>Default Usage</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            A simple list of actions triggered by a button.
          </p>
          <StoryCode>
            {`<Menu target={<Button label='Actions' />} width={160}>
  <MenuItem icon='lucide:edit' label='Rename' />
  <MenuItem icon='lucide:copy' label='Duplicate' />
</Menu>`}
          </StoryCode>
          <div className='flex ml-1 mt-4'>
            <Menu position='bottom-start' width={160} target={targetBtn}>
              <MenuItem icon='lucide:edit' label='Rename' />
              <MenuItem icon='lucide:copy' label='Duplicate' />
              <MenuItem icon='lucide:archive' label='Archive' />
              <MenuItem icon='lucide:share-2' label='Share' />
            </Menu>
          </div>
        </section>

        {/* Groups Section */}
        <section>
          <StorySubTitle>Grouping with Labels & Dividers</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Organize complex menus into logical sections using <code>MenuLabel</code> and <code>MenuDivider</code>.
          </p>
          <StoryCode>
            {`<Menu target={...}>
  <MenuLabel>Security</MenuLabel>
  <MenuItem icon='lucide:shield' label='Authentication' />
  <MenuDivider />
  <MenuItem icon='lucide:log-out' label='Log out' />
</Menu>`}
          </StoryCode>
          <div className='flex ml-1 mt-4'>
            <Menu position='bottom-start' width={180} target={targetBtn}>
              <MenuLabel>Security</MenuLabel>
              <MenuItem icon='lucide:shield' label='Authentication' />
              <MenuItem icon='lucide:lock' label='Sessions' />
              <MenuDivider />
              <MenuLabel>Developers</MenuLabel>
              <MenuItem icon='lucide:key-round' label='API Keys' />
              <MenuItem icon='lucide:webhook' label='Webhooks' />
              <MenuDivider />
              <MenuItem
                icon='lucide:log-out'
                iconClass='text-red-11'
                label='Log out'
              />
            </Menu>
          </div>
        </section>

        {/* Submenu Section */}
        <section>
          <StorySubTitle>Nested Menus (Submenu)</StorySubTitle>
          <p className='text-14 text-gray-11 mb-4'>
            Use <code>MenuSub</code> to create hierarchical menus for deeper interaction layers.
          </p>
          <StoryCode>
            {`<Menu target={...}>
  <MenuSub icon='lucide:shapes' label='More'>
    <MenuItem icon='lucide:archive' label='Archive' />
  </MenuSub>
</Menu>`}
          </StoryCode>
          <div className='flex ml-1 mt-4'>
            <Menu position='bottom-start' width={160} target={targetBtn}>
              <MenuItem icon='lucide:edit' label='Rename' />
              <MenuItem icon='lucide:copy' label='Duplicate' />
              <MenuSub icon='lucide:shapes' label='Advanced'>
                <MenuItem icon='lucide:archive' label='Archive' />
                <MenuItem icon='lucide:share-2' label='Share' />
                <MenuItem icon='lucide:heart' label='Favourites' />
              </MenuSub>
              <MenuDivider />
              <MenuItem
                icon='lucide:trash-2'
                iconClass='text-red-11'
                label='Delete'
              />
            </Menu>
          </div>
        </section>
      </div>
    </div>
  )
}
