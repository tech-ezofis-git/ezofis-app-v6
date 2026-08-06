import type { AiSummaryData } from '../types/folderTypes'

type SummaryOutput = {
  ai_recommendations?: unknown
  compliance_and_risk_assessment?: unknown
  confidence_score?: unknown
  document_summary?: unknown
  key_facts_extracted?: unknown
  ocr_text?: unknown
  recommendations?: unknown
  supplier_trend_insight?: unknown
  [key: string]: unknown
}

const COMPLIANCE_ICONS = ['shield', 'check', 'zap', 'bot'] as const

const humanizeKey = (key: string) =>
  key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const asText = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter(Boolean)
      .join('\n')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }
  return String(value)
}

const parseOutput = (raw: unknown): SummaryOutput => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as SummaryOutput

  const text = String(raw).trim()
  if (!text) return {}

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') {
      try {
        return JSON.parse(parsed) as SummaryOutput
      } catch {
        return { document_summary: parsed }
      }
    }
    return (parsed || {}) as SummaryOutput
  } catch {
    return { document_summary: text }
  }
}

const mapFacts = (
  facts: unknown,
): Array<{ label: string; value: string }> => {
  if (!facts) return []

  if (Array.isArray(facts)) {
    return facts
      .map((item, index) => {
        if (item == null) return null
        if (typeof item === 'string' || typeof item === 'number') {
          return { label: `Fact ${index + 1}`, value: String(item) }
        }
        if (typeof item === 'object') {
          const record = item as Record<string, unknown>
          const label = asText(
            record.label ?? record.key ?? record.name ?? `Fact ${index + 1}`,
          )
          const value = asText(
            record.value ?? record.text ?? record.description ?? item,
          )
          if (!value) return null
          return { label: label || `Fact ${index + 1}`, value }
        }
        return null
      })
      .filter(Boolean) as Array<{ label: string; value: string }>
  }

  if (typeof facts === 'string') {
    const text = facts.trim()
    if (!text) return []
    try {
      return mapFacts(JSON.parse(text))
    } catch {
      return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const split = line.split(/[:：]/)
          if (split.length > 1) {
            return {
              label: split[0].trim(),
              value: split.slice(1).join(':').trim(),
            }
          }
          return { label: 'Fact', value: line }
        })
    }
  }

  if (typeof facts === 'object') {
    return Object.entries(facts as Record<string, unknown>)
      .map(([key, value]) => {
        const text = asText(value)
        if (!text) return null
        return { label: humanizeKey(key), value: text }
      })
      .filter(Boolean) as Array<{ label: string; value: string }>
  }

  return []
}

const mapChecks = (
  assessment: unknown,
): Array<{ iconKey: string; label: string; status: string }> => {
  if (!assessment) return []

  if (Array.isArray(assessment)) {
    return assessment
      .map((item, index) => {
        if (item == null) return null
        if (typeof item === 'string') {
          return {
            iconKey: COMPLIANCE_ICONS[index % COMPLIANCE_ICONS.length],
            label: item,
            status: 'Reviewed',
          }
        }
        if (typeof item === 'object') {
          const record = item as Record<string, unknown>
          const label = asText(
            record.label ?? record.name ?? record.check ?? `Check ${index + 1}`,
          )
          const status = asText(
            record.status ?? record.result ?? record.value ?? 'Reviewed',
          )
          if (!label) return null
          return {
            iconKey:
              asText(record.iconKey) ||
              COMPLIANCE_ICONS[index % COMPLIANCE_ICONS.length],
            label,
            status: status || 'Reviewed',
          }
        }
        return null
      })
      .filter(Boolean) as Array<{
      iconKey: string
      label: string
      status: string
    }>
  }

  if (typeof assessment === 'object') {
    return Object.entries(assessment as Record<string, unknown>)
      .map(([key, value], index) => {
        const status = asText(value)
        if (!status) return null
        return {
          iconKey: COMPLIANCE_ICONS[index % COMPLIANCE_ICONS.length],
          label: humanizeKey(key),
          status,
        }
      })
      .filter(Boolean) as Array<{
      iconKey: string
      label: string
      status: string
    }>
  }

  const text = asText(assessment)
  if (!text) return []

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      iconKey: COMPLIANCE_ICONS[index % COMPLIANCE_ICONS.length],
      label: line,
      status: 'Reviewed',
    }))
}

const mapRecommendations = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean)
  }
  const text = asText(value)
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    return mapRecommendations(parsed)
  } catch {
    return text
      .split(/\n+/)
      .map((line) => line.replace(/^[-•›]\s*/, '').trim())
      .filter(Boolean)
  }
}

export const mapAiSummaryResponse = (payload: {
  creditConsumed?: boolean
  documentId?: string
  output?: unknown
}): AiSummaryData & { creditConsumed: boolean; rawOutput: string } => {
  const parsed = parseOutput(payload.output)
  const summary = asText(parsed.document_summary)
  const confidenceRaw = Number(parsed.confidence_score)
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
    : 0

  const facts = mapFacts(parsed.key_facts_extracted)
  const assessment = parsed.compliance_and_risk_assessment
  const assessmentText = asText(assessment)
  const useComplianceText =
    typeof assessment === 'string' &&
    !assessment.trim().startsWith('{') &&
    !assessment.trim().startsWith('[')
  const checks = useComplianceText ? [] : mapChecks(assessment)
  const recommendations = mapRecommendations(
    parsed.ai_recommendations ?? parsed.recommendations,
  )
  const insight = asText(parsed.supplier_trend_insight)
  const rawOutput =
    typeof payload.output === 'string'
      ? payload.output
      : JSON.stringify(payload.output ?? parsed, null, 2)

  return {
    checks,
    complianceText: useComplianceText ? assessmentText : '',
    confidence,
    creditConsumed: Boolean(payload.creditConsumed),
    documentId: payload.documentId || '',
    // Leave chrome strings empty so the view can localize via Lingui.
    engineSubtitle: '',
    engineTitle: '',
    facts,
    insight,
    rawOutput,
    recommendations,
    summary,
  }
}
