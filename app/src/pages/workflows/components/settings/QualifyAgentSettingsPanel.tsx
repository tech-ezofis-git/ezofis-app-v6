import type { Node } from '@xyflow/react'
import AgentKnowledgeSkillPanel from './common/AgentKnowledgeSkillPanel'

export default function QualifyAgentSettingsPanel({ node }: { node?: Node }) {
  return (
    <AgentKnowledgeSkillPanel
      node={node}
      config={{
        instructionPlaceholder:
          'Must-have fields, disqualify conditions, and the score required to qualify.',
        knowledgeHint:
          'Upload the qualification policy, ICP, or product sheet. The lead itself comes from the previous step.',
        skillPlaceholder: 'Describe how this agent should qualify the lead.',
      }}
    />
  )
}
