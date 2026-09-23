import React, { useState } from 'react'
import { Popover } from '@mantine/core'
import { t } from '@lingui/macro'
import Avatar from '@/components/base/Avatar'
import Button from '@/components/base/button/Button'

const getInitials = (name: string): string => {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface ForwardPopoverProps {
  target: React.ReactNode
  onConfirm: (userId: string) => void
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

  const filteredUsers = users?.filter((u) => {
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
      <div className='flex flex-col max-h-[400px] bg-surface rounded-lg overflow-hidden'>
        <div className='p-3 border-b border-[var(--gray-3)]'>
          <input
            autoFocus
            className='w-full rounded-md border border-[var(--gray-4)] bg-transparent px-3 py-1.5 text-sm text-[var(--gray-12)] focus:border-[var(--primary-9)] focus:outline-none'
            placeholder={t`Search users...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='flex-1 overflow-y-auto p-2 min-h-[200px] max-h-[250px]'>
          {filteredUsers.length === 0 ? (
            <div className='py-8 text-center text-sm text-[var(--gray-11)]'>
              {t`No users found`}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const id = String(user.id || user.value)
              const name = user.name || user.value || user.loginName
              const isSelected = selectedUserId === id

              return (
                <div
                  key={id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                    isSelected
                      ? 'bg-[var(--primary-1)]'
                      : 'hover:bg-[var(--gray-2)]'
                  }`}
                  onClick={() => setSelectedUserId(id)}
                >
                  <Avatar initials={getInitials(name)} size={32} />
                  <div className='flex-1 overflow-hidden'>
                    <div className='flex items-center justify-between'>
                      <div className={`truncate text-sm font-medium ${isSelected ? 'text-[var(--primary-11)]' : 'text-[var(--gray-12)]'}`}>
                        {name}
                      </div>
                      {isSelected && (
                        <div className='text-[var(--primary-9)]'>
                          {/* Selected checkmark could go here, but background color is enough */}
                        </div>
                      )}
                    </div>
                    {user.email && (
                      <div className={`truncate text-xs ${isSelected ? 'text-[var(--primary-9)]' : 'text-[var(--gray-11)]'}`}>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
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
                onConfirm(selectedUserId)
                setOpened(false)
                setSearch('')
                setSelectedUserId(null)
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
