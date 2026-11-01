interface WorkflowAiInsightRow {
  aiInsight?: null | { nextAction?: null | string; summary?: null | string }
}

/** Plain text only: the agent can return highlight tags such as <mark>. */
const toPlainText = (value: unknown): string =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * AI Insight generated for the step a workflow ticket is on (API: row.aiInsight).
 * Short on purpose: a summary line plus the recommended next action.
 */
export function getWorkflowAiInsightText(
  row: null | undefined | WorkflowAiInsightRow,
): string {
  const insight = row?.aiInsight
  if (!insight || typeof insight !== 'object') return ''

  return [toPlainText(insight.summary), toPlainText(insight.nextAction)]
    .filter(Boolean)
    .join(' ')
}
