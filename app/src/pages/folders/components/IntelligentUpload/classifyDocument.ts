import type {
  CandidateRepository,
  ClassificationResult,
  ClassificationSuggestion,
} from './types'

export const CLASSIFICATION_STAGES = [
  'Reading document content...',
  'Analyzing entity and metadata...',
  'Matching repository schemas...',
  'Evaluating classification confidence...',
  'Finalizing AI recommendations...',
] as const

interface DocProfile {
  defaultKeywords: string[]
  matchKeywords: string[]
  reason: string
  type: string
}

const DOCUMENT_PROFILES: DocProfile[] = [
  {
    defaultKeywords: ['Invoice #', 'Total Amount', 'Vendor Name', 'Tax ID'],
    matchKeywords: ['invoice', 'inv', 'bill', 'receipt', 'payment', 'po'],
    reason:
      'Detected structured tax invoice headers, supplier information, and itemized line amounts.',
    type: 'Invoice',
  },
  {
    defaultKeywords: [
      'Parties',
      'Effective Date',
      'Terms & Conditions',
      'Signatures',
    ],
    matchKeywords: [
      'contract',
      'agreement',
      'nda',
      'mou',
      'lease',
      'amendment',
    ],
    reason:
      'Identified binding contract clauses, signatory blocks, and effective duration periods.',
    type: 'Contract / Agreement',
  },
  {
    defaultKeywords: [
      'Account No.',
      'Ending Balance',
      'Transaction Date',
      'Fiscal Period',
    ],
    matchKeywords: [
      'statement',
      'bank',
      'financial',
      'ledger',
      'balance',
      'audit',
    ],
    reason:
      'Matched financial account statements with debit/credit transactions and reconciliation dates.',
    type: 'Financial Statement',
  },
  {
    defaultKeywords: ['Employee ID', 'Department', 'Job Title', 'Credentials'],
    matchKeywords: [
      'hr',
      'resume',
      'cv',
      'employee',
      'offer',
      'appraisal',
      'onboarding',
    ],
    reason:
      'Recognized personnel identification data, qualifications, and HR department records.',
    type: 'HR & Personnel Record',
  },
  {
    defaultKeywords: [
      'Executive Summary',
      'Key Metrics',
      'Quarterly Trends',
      'Insights',
    ],
    matchKeywords: ['report', 'analysis', 'summary', 'deck', 'review', 'kpi'],
    reason:
      'Extracted analytical report structure, KPI scorecards, and performance findings.',
    type: 'Report & Analysis',
  },
  {
    defaultKeywords: ['Tracking #', 'Consignee', 'Carrier', 'Delivery Date'],
    matchKeywords: [
      'shipping',
      'delivery',
      'bill-of-lading',
      'waybill',
      'bol',
      'dispatch',
    ],
    reason:
      'Matched logistics waybill numbering, carrier details, and consignment destinations.',
    type: 'Shipping & Delivery Note',
  },
]

const FALLBACK_PROFILE: DocProfile = {
  defaultKeywords: [
    'Document ID',
    'Creation Date',
    'Subject',
    'Classification',
  ],
  matchKeywords: [],
  reason:
    'Matched general corporate document structure and organizational metadata criteria.',
  type: 'General Business Document',
}

const FALLBACK_CANDIDATE_REPOSITORIES: CandidateRepository[] = [
  { id: 'repo-finance', name: 'Finance & Invoices' },
  { id: 'repo-legal', name: 'Legal & Contracts' },
  { id: 'repo-hr', name: 'Human Resources' },
  { id: 'repo-operations', name: 'Operations & Logistics' },
  { id: 'repo-general', name: 'General Documents' },
]

function detectProfile(fileName: string): DocProfile {
  const lowerName = fileName.toLowerCase()
  for (const profile of DOCUMENT_PROFILES) {
    if (profile.matchKeywords.some((keyword) => lowerName.includes(keyword))) {
      return profile
    }
  }
  return FALLBACK_PROFILE
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Classifies a document against candidate repositories.
 * Currently backed by a simulated multi-stage AI service layer with realistic delays.
 * When real backend endpoints are ready, only this function's body needs replacement.
 */
export async function classifyDocument(
  file: File,
  candidateRepositories: CandidateRepository[] = [],
  onStageChange?: (stage: string) => void,
): Promise<ClassificationResult> {
  const pool =
    candidateRepositories.length > 0
      ? candidateRepositories
      : FALLBACK_CANDIDATE_REPOSITORIES

  // Cycle through progressive classification stages
  for (const stage of CLASSIFICATION_STAGES) {
    onStageChange?.(stage)
    const stageDuration = Math.floor(250 + Math.random() * 250)
    await sleep(stageDuration)
  }

  const profile = detectProfile(file.name)

  // Rank candidate repositories by matching name semantics with profile
  const ranked = [...pool].sort((a, b) => {
    const aMatch = profile.matchKeywords.some((k) =>
      a.name.toLowerCase().includes(k),
    )
    const bMatch = profile.matchKeywords.some((k) =>
      b.name.toLowerCase().includes(k),
    )
    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return 0
  })

  // Build realistic confidence scores: top ≥ 0.85, 2nd ~0.65-0.78, 3rd ~0.35-0.48
  const baseConfidences = [
    0.88 + Math.round(Math.random() * 8) / 100, // 0.88 - 0.96
    0.64 + Math.round(Math.random() * 12) / 100, // 0.64 - 0.76
    0.36 + Math.round(Math.random() * 12) / 100, // 0.36 - 0.48
    0.22 + Math.round(Math.random() * 8) / 100, // 0.22 - 0.30
    0.12 + Math.round(Math.random() * 6) / 100, // 0.12 - 0.18
  ]

  const suggestions: ClassificationSuggestion[] = ranked
    .slice(0, Math.min(ranked.length, 6))
    .map((repo, idx) => {
      const confidence = Math.min(
        0.98,
        Math.max(0.1, Number((baseConfidences[idx] ?? 0.15).toFixed(2))),
      )

      const reason =
        idx === 0
          ? profile.reason
          : idx === 1
            ? `Partial schema overlap with secondary attributes in ${repo.name}.`
            : `Contains secondary reference tokens loosely matching ${repo.name}.`

      const keywords =
        idx === 0
          ? profile.defaultKeywords
          : profile.defaultKeywords.slice(0, Math.max(2, 4 - idx))

      return {
        confidence,
        keywords,
        reason,
        repositoryId: repo.id,
        repositoryName: repo.name,
      }
    })
    .sort((a, b) => b.confidence - a.confidence)

  return {
    documentType: profile.type,
    keywords: profile.defaultKeywords,
    suggestions,
  }
}
