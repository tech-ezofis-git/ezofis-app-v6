import { useMemo } from 'react'
import Alert from '@/components/base/Alert'
import Discrepancies from './components/discrepancies/Discrepancies'
// import LineItems from './components/line-items/LineItems'
// import Properties from './components/properties/Properties'
import PropertiesCards from './components/properties/PropertiesCards'
import LineItemsCards from './components/line-items/LineItemsCards'
interface OverviewProps {
  agentData: any // The raw JSON object from the backend
}

const Overview = ({ agentData }: OverviewProps) => {

  // Logic to determine Alert content based on Agent Data
  const alertStatus = useMemo(() => {
    const score = Number(agentData?.score || 0)
    const decision = agentData?.decision || (score >= 90 ? 'APPROVED' : score >= 70 ? 'PARTIALLY APPROVED' : 'REJECTED')
    const reason = agentData?.reason || 'Review the details below.'

    if (decision === 'APPROVED') {
      return {
        text: `Success: ${reason}`,
        variant: 'green' as const,
        icon: 'tabler:circle-check'
      }
    }
    if (decision === 'REJECTED') {
      return {
        text: `Critical: ${reason}`,
        variant: 'red' as const,
        icon: 'tabler:alert-triangle'
      }
    }
    // Partial / Pending
    return {
      text: `Attention Needed: ${reason}`,
      variant: 'primary' as const,
      icon: 'tabler:info-circle'
    }
  }, [agentData])

  if (!agentData) return <div className="p-6">Loading Overview...</div>

  return (
    <div className='space-y-8 p-6'>
      <Alert
        text={alertStatus.text}
        variant={alertStatus.variant}
      // Assuming your Alert component supports an icon prop based on your prompt description
      // icon={alertStatus.icon}
      />

      {/* <Properties data={agentData} /> */}
      <PropertiesCards data={agentData} />

      {/* Only show sections if relevant data exists */}
      <Discrepancies data={agentData} />

      <LineItemsCards data={agentData} />
    </div>
  )
}

Overview.displayName = 'Overview'
export default Overview