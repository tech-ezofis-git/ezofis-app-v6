import { createFileRoute } from '@tanstack/react-router'
import {
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  MenuLabel,
  MenuSub,
} from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/menu')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>7. Menu</StoryTitle>

      <div className='grid grid-cols-3'>
        <div className='col-span-1'>
          <StorySubTitle># Default</StorySubTitle>
          <div className='flex'>
            <Menu
              position='bottom-start'
              width={200}
              defaultOpened
              target={
                <Button
                  color='gray'
                  label='Menu'
                  suffixIcon='tabler:chevron-down'
                  suffixIconClass='size-4 text-gray-500'
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
        </div>

        <div className='col-span-1'>
          <StorySubTitle># Menu Group</StorySubTitle>
          <div className='flex'>
            <Menu
              position='bottom-start'
              width={200}
              defaultOpened
              target={
                <Button
                  color='gray'
                  label='Menu'
                  suffixIcon='tabler:chevron-down'
                  suffixIconClass='size-4 text-gray-500'
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
                iconClass='text-red'
                label='Log out'
              />
            </Menu>
          </div>
        </div>

        <div className='col-span-1'>
          <StorySubTitle># Submenu</StorySubTitle>
          <div className='flex'>
            <Menu
              position='bottom-start'
              width={200}
              defaultOpened
              target={
                <Button
                  color='gray'
                  label='Menu'
                  suffixIcon='tabler:chevron-down'
                  suffixIconClass='size-4 text-gray-500'
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
                iconClass='text-red'
                label='Delete'
              />
            </Menu>
          </div>
        </div>
      </div>
    </div>
  )
}
