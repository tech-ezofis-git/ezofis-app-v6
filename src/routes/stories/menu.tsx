import { createFileRoute } from '@tanstack/react-router'
import Button from '@/components/base/button/Button'
import Menu from '@/components/base/menu/Menu'
import MenuDivider from '@/components/base/menu/MenuDivider'
import MenuItem from '@/components/base/menu/MenuItem'
import MenuLabel from '@/components/base/menu/MenuLabel'
import MenuSub from '@/components/base/menu/MenuSub'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/menu')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>7. Menu</StoryTitle>

      <div className='space-y-16'>
        <StorySubTitle>Default</StorySubTitle>
        <div className='flex'>
          <Menu
            position='bottom-start'
            width={200}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='tabler:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuItem icon='tabler:edit' label='Rename' />
            <MenuItem icon='tabler:copy' label='Duplicate' />
            <MenuItem icon='tabler:archive' label='Archive' />
            <MenuItem icon='tabler:share' label='Share' />
          </Menu>
        </div>

        <StorySubTitle>Menu Group</StorySubTitle>
        <div className='flex'>
          <Menu
            position='bottom-start'
            width={200}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='tabler:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuLabel>Security</MenuLabel>
            <MenuItem icon='tabler:shield' label='Authentication' />
            <MenuItem icon='tabler:lock' label='Sessions' />
            <MenuDivider />
            <MenuLabel>Developers</MenuLabel>
            <MenuItem icon='tabler:key' label='API Keys' />
            <MenuItem icon='tabler:webhook' label='Webhooks' />
            <MenuItem icon='tabler:help' label='Documentation' />
            <MenuDivider />
            <MenuItem
              icon='tabler:logout'
              iconClass='text-red-11'
              label='Log out'
            />
          </Menu>
        </div>

        <StorySubTitle>Submenu</StorySubTitle>
        <div className='flex'>
          <Menu
            position='bottom-start'
            width={200}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='tabler:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuItem icon='tabler:edit' label='Rename' />
            <MenuItem icon='tabler:copy' label='Duplicate' />
            <MenuSub icon='tabler:brand-asana' label='More'>
              <MenuItem icon='tabler:archive' label='Archive' />
              <MenuItem icon='tabler:share' label='Share' />
              <MenuItem icon='tabler:heart' label='Favourites' />
            </MenuSub>
            <MenuDivider />
            <MenuItem
              icon='tabler:trash'
              iconClass='text-red-11'
              label='Delete'
            />
          </Menu>
        </div>
      </div>
    </div>
  )
}
