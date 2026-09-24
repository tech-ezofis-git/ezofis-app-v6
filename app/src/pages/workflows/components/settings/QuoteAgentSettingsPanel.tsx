import type { Node } from '@xyflow/react'
import AgentKnowledgeSkillPanel from './common/AgentKnowledgeSkillPanel'

export default function QuoteAgentSettingsPanel({ node }: { node?: Node }) {
  return (
    <AgentKnowledgeSkillPanel
      node={node}
      config={{
        instructionPlaceholder:
          'Discount limits, margin floor, tax, currency, and how long the quote stays valid.',
        knowledgeHint:
          'Upload the price list, rate card, or discount policy. The quote request comes from the previous step.',
        skillPlaceholder:
          'Describe how this agent should price and build the quote.',
      }}
    />
  )
}
