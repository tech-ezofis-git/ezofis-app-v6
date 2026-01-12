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
            width={160}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='lucide:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuItem icon='lucide:edit' label='Rename' />
            <MenuItem icon='lucide:copy' label='Duplicate' />
            <MenuItem icon='lucide:archive' label='Archive' />
            <MenuItem icon='lucide:share-2' label='Share' />
          </Menu>
        </div>

        <StorySubTitle>Menu Group</StorySubTitle>
        <div className='flex'>
          <Menu
            position='bottom-start'
            width={160}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='lucide:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuLabel>Security</MenuLabel>
            <MenuItem icon='lucide:shield' label='Authentication' />
            <MenuItem icon='lucide:lock' label='Sessions' />
            <MenuDivider />
            <MenuLabel>Developers</MenuLabel>
            <MenuItem icon='lucide:key-round' label='API Keys' />
            <MenuItem icon='lucide:webhook' label='Webhooks' />
            <MenuItem icon='lucide:circle-help' label='Documentation' />
            <MenuDivider />
            <MenuItem
              icon='lucide:log-out'
              iconClass='text-red-11'
              label='Log out'
            />
          </Menu>
        </div>

        <StorySubTitle>Submenu</StorySubTitle>
        <div className='flex'>
          <Menu
            position='bottom-start'
            width={160}
            target={
              <Button
                color='gray'
                label='Menu'
                suffixIcon='lucide:chevron-down'
                suffixIconClass='text-gray-9'
                variant='outline'
              />
            }
          >
            <MenuItem icon='lucide:edit' label='Rename' />
            <MenuItem icon='lucide:copy' label='Duplicate' />
            <MenuSub icon='lucide:shapes' label='More'>
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
      </div>
    </div>
  )
}
