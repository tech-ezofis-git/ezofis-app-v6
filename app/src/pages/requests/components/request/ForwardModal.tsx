import React, { useState } from 'react'
import Modal from '@/components/base/Modal'
import IconButton from '@/components/base/button/IconButton'
import { t } from '@lingui/macro'
import Button from '@/components/base/button/Button'
import Avatar from '@/components/base/Avatar'
import { Icon } from '@iconify/react'

const getInitials = (name: string): string => {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface ForwardModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (userId: string) => void
  users: any[]
}

const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  users,
}) => {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const filteredUsers = users?.filter((u) => {
    const term = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.loginName?.toLowerCase().includes(term)
    )
  }) || []

  return (
    <Modal opened={isOpen} width={400} onClose={onClose}>
      <div className='flex flex-col h-[500px] bg-surface'>
        <div className='flex items-center justify-between border-b border-[var(--gray-3)] px-4 py-3'>
          <h3 className='text-sm font-semibold text-[var(--gray-12)]'>{t`Forward Request`}</h3>
          <IconButton icon='tabler:x' size='sm' variant='ghost' onClick={onClose} />
        </div>
        
        <div className='p-4 border-b border-[var(--gray-3)]'>
          <input
            autoFocus
            className='w-full rounded-md border border-[var(--gray-4)] bg-transparent px-3 py-2 text-sm text-[var(--gray-12)] focus:border-[var(--primary-9)] focus:outline-none'
            placeholder={t`Search users...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='flex-1 overflow-y-auto p-2'>
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
                    isSelected ? 'bg-[var(--primary-3)]' : 'hover:bg-[var(--gray-2)]'
                  }`}
                  onClick={() => setSelectedUserId(id)}
                >
                  <Avatar initials={getInitials(name)} size={32} />
                  <div className='flex-1 overflow-hidden'>
                    <div className='truncate text-sm font-medium text-[var(--gray-12)]'>
                      {name}
                    </div>
                    {user.email && (
                      <div className='truncate text-xs text-[var(--gray-11)]'>
                        {user.email}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className='text-[var(--primary-11)]'>
                      <Icon icon='tabler:check' className='h-5 w-5' />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className='border-t border-[var(--gray-3)] p-4 flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            {t`Cancel`}
          </Button>
          <Button
            disabled={!selectedUserId}
            onClick={() => {
              onConfirm(selectedUserId)
              onClose()
            }}
          >
            {t`Forward`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ForwardModal
