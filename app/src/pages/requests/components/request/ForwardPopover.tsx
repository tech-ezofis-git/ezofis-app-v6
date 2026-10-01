import { t } from '@lingui/macro'
import { Popover, Textarea } from '@mantine/core'
import React, { useState } from 'react'
import Avatar from '@/components/base/Avatar'
import Button from '@/components/base/button/Button'
import Icon from '@/components/base/icon/Icon'
import authUserStore from '@/stores/authUserStore'

const getInitials = (fullNameOrEmail: string): string => {
  const clean = String(fullNameOrEmail || '').trim()
  if (!clean) return 'U'
  if (clean.includes('@')) {
    const part = clean.split('@')[0]
    const parts = part.split(/[._-]/).filter(Boolean)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : part.slice(0, 2).toUpperCase()
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase()
}

interface ForwardPopoverProps {
  target: React.ReactNode
  users: any[]
  onConfirm: (userId: string, comments: string) => void
}

const ForwardPopover: React.FC<ForwardPopoverProps> = ({
  target,
  users,
  onConfirm,
}) => {
  const [opened, setOpened] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [comments, setComments] = useState('')

  const currentUserEmail = authUserStore.getState().session?.email
  const currentUserId = authUserStore.getState().session?.id

  const filteredUsers =
    users?.filter((u) => {
      if (
        (currentUserEmail &&
          u.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
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
      position='bottom-end'
      width={320}
      withinPortal={true}
      zIndex={5000}
      classNames={{
        dropdown:
          'rounded-lg border border-[var(--gray-3)] bg-surface-raised p-0 shadow-md',
      }}
      onChange={(isOpen) => {
        setOpened(isOpen)
        if (!isOpen) {
          // Reset state when closing without confirming
          setSearch('')
          setSelectedUserId(null)
          setComments('')
        }
      }}
    >
      <Popover.Target>
        <div
          className='inline-block cursor-pointer'
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpened((o) => !o)
          }}
        >
          {target}
        </div>
      </Popover.Target>
      <Popover.Dropdown>
        <div className='flex max-h-[400px] flex-col overflow-hidden rounded-lg bg-surface'>
          <div className='border-b border-[var(--gray-3)] p-3'>
            <input
              className='w-full rounded-md border border-[var(--gray-4)] bg-transparent px-3 py-1.5 text-sm text-[var(--gray-12)] focus:border-[var(--primary-9)] focus:outline-none'
              placeholder={t`Search users...`}
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className='max-h-[250px] min-h-[200px] flex-1 overflow-y-auto p-2'>
            {filteredUsers.length === 0 ? (
              <div className='py-8 text-center text-sm text-[var(--gray-11)]'>
                {t`No users found`}
              </div>
            ) : (
              filteredUsers.map((user, index) => {
                const id = String(
                  user.id ??
                    user.userId ??
                    user.value ??
                    user.email ??
                    user.loginName ??
                    `user-${index}`,
                )
                const name =
                  user.name ||
                  user.value ||
                  user.loginName ||
                  user.email ||
                  `User ${id}`
                const isSelected = selectedUserId === id

                const showEmailSubline = Boolean(
                  user.email &&
                  name &&
                  user.email.toLowerCase().trim() !== name.toLowerCase().trim(),
                )

                return (
                  <div
                    key={id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-all ${
                      isSelected
                        ? 'border-[var(--primary-4)] bg-[var(--primary-2)] text-[var(--primary-11)] shadow-xs'
                        : 'border-transparent bg-transparent text-[var(--gray-12)] hover:bg-[var(--gray-2)]'
                    }`}
                    onClick={() =>
                      setSelectedUserId((prev) => (prev === id ? null : id))
                    }
                  >
                    <Avatar initials={getInitials(name)} size={32} />
                    <div className='flex-1 overflow-hidden'>
                      <div className='flex items-center justify-between gap-2'>
                        <div
                          className={`truncate text-sm font-medium ${
                            isSelected
                              ? 'font-semibold text-[var(--primary-11)]'
                              : 'text-[var(--gray-12)]'
                          }`}
                        >
                          {name}
                        </div>
                        {isSelected && (
                          <div className='flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary-9)] text-white'>
                            <Icon
                              className='size-3 stroke-[3]'
                              name='tabler:check'
                            />
                          </div>
                        )}
                      </div>
                      {showEmailSubline && (
                        <div
                          className={`truncate text-xs ${
                            isSelected
                              ? 'text-[var(--primary-10)]'
                              : 'text-[var(--gray-11)]'
                          }`}
                        >
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
          <div className='flex justify-end gap-2 border-t border-[var(--gray-3)] bg-[var(--gray-1)] p-3'>
            <Button
              color='gray'
              label={t`Cancel`}
              size='sm'
              variant='subtle'
              onClick={() => {
                setOpened(false)
                setSearch('')
                setSelectedUserId(null)
              }}
            />
            <Button
              color='primary'
              disabled={!selectedUserId}
              label={t`Forward`}
              size='sm'
              variant='solid'
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
