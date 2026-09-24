import React, { useState } from 'react'
import { Popover } from '@mantine/core'
import { t } from '@lingui/macro'
import Icon from '@/components/base/icon/Icon'
import Button from '@/components/base/button/Button'
import { Textarea } from '@mantine/core'
import authUserStore from '@/stores/authUserStore'

interface ForwardPopoverProps {
  target: React.ReactNode
  onConfirm: (userId: string, comments: string) => void
  users: any[]
}

const ForwardPopover: React.FC<ForwardPopoverProps> = ({
  target,
  onConfirm,
  users,
}) => {
  const [opened, setOpened] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [comments, setComments] = useState('')

  const currentUserEmail = authUserStore.getState().session?.email
  const currentUserId = authUserStore.getState().session?.id

  const filteredUsers = users?.filter((u) => {
    if (
      (currentUserEmail && u.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
      u.id === currentUserId ||
      u.value === currentUserId
    ) {
      return false
    }

    const term = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.loginName?.toLowerCase().includes(term)
    )
  }) || []

  return (
    <Popover
      opened={opened}
      onChange={(isOpen) => {
        setOpened(isOpen)
        if (!isOpen) {
          // Reset state when closing without confirming
          setSearch('')
          setSelectedUserId(null)
          setComments('')
        }
      }}
      width={320}
      position='bottom-end'
      zIndex={5000}
      withinPortal={true}
      classNames={{
        dropdown: 'bg-surface-raised p-0 shadow-md border border-[var(--gray-3)] rounded-lg'
      }}
    >
      <Popover.Target>
        <div 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpened((o) => !o)
          }}
          className="inline-block cursor-pointer"
        >
          {target}
        </div>
      </Popover.Target>
      <Popover.Dropdown>
      <div className='flex flex-col max-h-[500px] bg-surface rounded-lg overflow-hidden'>
        <div className='p-3 border-b border-[var(--gray-3)]'>
          <input
            autoFocus
            className='w-full rounded-md border border-[var(--gray-4)] bg-transparent px-3 py-1.5 text-sm text-[var(--gray-12)] focus:border-[var(--primary-9)] focus:outline-none'
            placeholder={t`Search users...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[200px]'>
          {filteredUsers.length === 0 ? (
            <div className='py-8 text-center text-sm text-[var(--gray-11)]'>
              {t`No users found`}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const id = String(user.id || user.value)
              const displayValue = user.email || user.name || user.loginName || user.value
              const isSelected = selectedUserId === id

              return (
                <div
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                    isSelected
                      ? 'bg-primary-1'
                      : 'hover:bg-gray-2'
                  }`}
                  onClick={() => setSelectedUserId(id)}
                >
                  <Icon 
                    name='tabler:user-circle' 
                    className={`size-6 shrink-0 ${isSelected ? 'text-primary-9' : 'text-gray-11'}`} 
                  />
                  <div className='flex-1 overflow-hidden'>
                    <div className={`truncate text-[13px] font-medium ${isSelected ? 'text-primary-11' : 'text-gray-12'}`}>
                      {displayValue}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* Comments Input */}
        <div className='p-3 border-t border-[var(--gray-3)]'>
          <Textarea
            placeholder={t`Add a comment (optional)`}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            minRows={2}
            maxRows={4}
            size="sm"
            styles={{
              input: {
                backgroundColor: 'transparent',
                borderColor: 'var(--gray-4)',
                color: 'var(--gray-12)',
                '&:focus': {
                  borderColor: 'var(--primary-9)',
                }
              }
            }}
          />
        </div>

        {/* Footer with Forward Button */}
        <div className='border-t border-[var(--gray-3)] p-3 flex justify-end gap-2 bg-[var(--gray-1)]'>
          <Button
            variant='subtle'
            color='gray'
            size='sm'
            label={t`Cancel`}
            onClick={() => {
              setOpened(false)
              setSearch('')
              setSelectedUserId(null)
              setComments('')
            }}
          />
          <Button
            variant='solid'
            color='primary'
            size='sm'
            label={t`Forward`}
            disabled={!selectedUserId}
            onClick={() => {
              if (selectedUserId) {
                onConfirm(selectedUserId, comments)
                setOpened(false)
                setSearch('')
                setSelectedUserId(null)
                setComments('')
              }
            }}
          />
        </div>
      </div>
    </Popover.Dropdown>
  </Popover>
  )
}

export default ForwardPopover
