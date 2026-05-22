import { useEffect, useState } from 'react'
import type { ShareData } from '../types/folderTypes'
import { folderApi } from '../api/folderApi'
import { DynamicIcon } from './icons'
import { Button, Card, Input, PrimaryButton } from './Ui'

export function ShareView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ShareData | null>(null)

  useEffect(() => {
    folderApi.getShareData().then(setData)
  }, [])

  if (!data) {
    return (
      <div className='p-6 text-[13px] text-gray-10'>
        Loading share options...
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface-secondary text-[13px] text-gray-11 duration-300'>
      {/* <div className="flex h-[74px] shrink-0 items-center justify-between border-b border-gray-3 bg-surface-primary px-6">
        <div>
          <h1 className="text-[22px] font-semibold leading-7 text-gray-13">Share Document</h1>
          <p className="mt-0.5 text-[13px] text-gray-10">{data.documentId}.pdf</p>
        </div>
      </div> */}

      <div className='flex h-[56px] shrink-0 items-center border-b border-gray-3 bg-surface-primary px-6'>
        <button
          className='inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-semibold text-gray-13 transition-all hover:bg-gray-4 hover:text-gray-12 active:scale-95'
          type='button'
          onClick={onBack}
        >
          <DynamicIcon className='h-4 w-4' name='arrowLeft' />
          Backs
        </button>
      </div>

      <div className='ez-share-scroll min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[780px] space-y-5 px-6 py-8'>
          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-5 flex items-center gap-2 text-[16px] font-semibold text-gray-13'>
              <DynamicIcon className='h-5 w-5 text-blue-11' name='mail' />
              Invite People
            </h2>

            <div className='grid grid-cols-[1fr_180px_108px] gap-3'>
              <Input
                className='h-11 rounded-lg border-gray-3 px-4 text-[14px]'
                placeholder='Enter email address...'
              />

              <select className='h-11 rounded-lg border border-gray-3 bg-surface-primary px-4 text-[14px] text-gray-13 shadow-sm transition-all outline-none hover:bg-gray-2 focus:border-blue-8'>
                {data.invitePermissions.map((permission) => (
                  <option key={permission}>{permission}</option>
                ))}
              </select>

              <PrimaryButton className='h-11 rounded-lg px-4 text-[14px] shadow-sm'>
                <DynamicIcon className='h-4 w-4' name='send' />
                Invite
              </PrimaryButton>
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-6 flex items-center justify-between text-[16px] font-semibold text-gray-13'>
              <span className='flex items-center gap-2'>
                <DynamicIcon className='h-5 w-5 text-blue-11' name='users' />
                Currently Shared With
              </span>

              <span className='inline-flex h-6 w-fit items-center rounded-full bg-gray-2 px-3 text-[12px] font-semibold whitespace-nowrap text-gray-13'>
                {data.sharedWith.length} people
              </span>
            </h2>

            <div className='space-y-5'>
              {data.sharedWith.map((person) => (
                <div
                  className='grid grid-cols-[1fr_145px_100px] items-center gap-4'
                  key={person.email}
                >
                  <div className='flex items-center gap-3'>
                    <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-3 text-[13px] font-semibold text-blue-11'>
                      {person.initials}
                    </span>

                    <div>
                      <b className='block text-[14px] leading-5 font-semibold text-gray-13'>
                        {person.name}
                      </b>
                      <p className='text-[13px] leading-5 text-gray-10'>
                        {person.email}
                      </p>
                    </div>
                  </div>

                  <Button className='h-9 justify-between px-4 text-[14px] shadow-sm'>
                    {person.permission}
                    <DynamicIcon className='h-4 w-4' name='chevronDown' />
                  </Button>

                  <span className='inline-flex items-center gap-2 text-[13px] text-gray-10'>
                    <DynamicIcon className='h-4 w-4' name='clock' />
                    {person.date}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-surface-primary p-6 shadow-none'>
            <h2 className='mb-5 flex items-center gap-2 text-[16px] font-semibold text-gray-13'>
              <DynamicIcon className='h-5 w-5 text-blue-11' name='link' />
              Shareable Link
            </h2>

            <div className='grid grid-cols-[1fr_132px] gap-3'>
              <div className='flex h-11 min-w-0 items-center rounded-lg bg-gray-2 px-4 font-mono text-[13px] text-gray-10'>
                <DynamicIcon
                  className='mr-2 h-4 w-4 shrink-0 text-green-11'
                  name='shield'
                />
                <span className='truncate'>{data.link}</span>
              </div>

              <Button className='h-11 px-4 text-[14px] shadow-sm'>
                <DynamicIcon className='h-4 w-4' name='copy' />
                Copy Link
              </Button>
            </div>

            <div className='mt-4 flex gap-6 text-[14px] text-gray-13'>
              <label className='inline-flex items-center gap-2'>
                <input
                  className='h-4 w-4 accent-blue-9'
                  type='checkbox'
                  defaultChecked
                />
                Require login to view
              </label>

              <label className='inline-flex items-center gap-2'>
                <input className='h-4 w-4 accent-blue-9' type='checkbox' />
                Expire in 7 days
              </label>
            </div>
          </Card>

          <Card className='rounded-xl border border-gray-3 bg-gray-2 p-5 shadow-none'>
            <h3 className='mb-3 text-[13px] font-semibold text-gray-10'>
              Permission Levels
            </h3>

            <div className='grid grid-cols-3 gap-5 text-[13px]'>
              {data.permissions.map((permission, index) => {
                const iconColor =
                  index === 0
                    ? 'text-blue-11'
                    : index === 1
                      ? 'text-orange-10'
                      : 'text-green-11'

                return (
                  <div
                    className='flex gap-2 text-gray-13'
                    key={permission.label}
                  >
                    <DynamicIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`}
                      name={permission.iconKey}
                    />
                    <span>
                      <b>{permission.label}:</b> {permission.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
