import Icon from '@/components/base/icon/Icon'
import useRequestDemoStore from '@/layouts/app/stores/useRequestDemoStore'
import useSidebarStore from '@/layouts/app/stores/useSidebarStore'

const SidebarCTA = () => {
  const openDemoForm = useRequestDemoStore((s) => s.openDemoForm)
  const closeSidebar = useSidebarStore((s) => s.closeSidebar)

  const handleRequestDemo = () => {
    openDemoForm()
    closeSidebar()
  }

  return (
    <div className='mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary-9 to-primary-11 p-4 shadow-md transition-all duration-300 hover:shadow-lg'>
      {/* Header */}
      <div className='mb-2 flex items-center gap-2'>
        <Icon
          className='size-4 shrink-0 text-yellow-3'
          name='lucide:workflow'
        />
        <span className='text-[12px] font-bold tracking-wider text-white uppercase'>
          EZOFIS AP Automation
        </span>
      </div>

      {/* Description */}
      <p className='mb-4 text-xs leading-relaxed text-primary-2 opacity-95'>
        Streamline your Accounts Payable with intelligent PO matching, automated
        invoice routing, and seamless integrations.
      </p>

      {/* CTA Button */}
      <button
        className='flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-primary-11 shadow-sm transition-all duration-200 hover:bg-primary-1 active:scale-95'
        type='button'
        onClick={handleRequestDemo}
      >
        <Icon className='size-3.5' name='lucide:calendar-check' />
        Request a Demo
      </button>
    </div>
  )
}

SidebarCTA.displayName = 'SidebarCTA'
export default SidebarCTA
