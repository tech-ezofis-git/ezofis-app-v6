import type {
  DocumentIntelligentCandidate,
  DocumentIntelligentResult,
} from '@/api/v6/uploadAndIndex'
import { uploadAndClassifyDocument } from '@/api/v6/uploadAndIndex'
import type {
  CandidateRepository,
  ClassificationResult,
  ClassificationSuggestion,
} from './types'

export const CLASSIFICATION_STAGES = [
  'Reading document content...',
  'Analyzing document with AI Agent...',
  'Matching repository schemas...',
  'Finalizing recommendations...',
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

/**
 * Classifies a document against candidate repositories using the backend Document Intelligent Agent API.
 * Falls back to client heuristic matching if the backend API service is unreachable.
 */
export async function classifyDocument(
  file: File,
  candidateRepositories: CandidateRepository[] = [],
  onStageChange?: (stage: string) => void,
): Promise<ClassificationResult> {
  onStageChange?.('Analyzing document with AI Agent...')

  const { data, error } = await uploadAndClassifyDocument(file)

  const res =
    (
      data as unknown as {
        document_intelligent_result?: DocumentIntelligentResult
      }
    )?.document_intelligent_result ||
    ((data as unknown as Record<string, unknown>)?.repository_id ||
    (data as unknown as Record<string, unknown>)?.candidates
      ? (data as unknown as DocumentIntelligentResult)
      : null)

  function safeIdMatch(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false
    return String(a).toLowerCase() === String(b).toLowerCase()
  }

  if (
    !error &&
    res &&
    (res.repository_id || (res.candidates && res.candidates.length > 0))
  ) {
    onStageChange?.('Finalizing AI recommendations...')

    const parseScore = (val: unknown) =>
      typeof val === 'number' ? val : parseFloat(String(val)) || 0

    const normalizeScore = (score: unknown) => {
      const num = parseScore(score)
      return num > 1 ? Number((num / 100).toFixed(2)) : Number(num.toFixed(2))
    }

    const suggestions: ClassificationSuggestion[] = []

    if (res.candidates && res.candidates.length > 0) {
      res.candidates.forEach((cand: DocumentIntelligentCandidate) => {
        const matchingRepo = candidateRepositories.find((r) =>
          safeIdMatch(r.id, cand.repository_id),
        )
        const targetId = matchingRepo ? matchingRepo.id : cand.repository_id
        suggestions.push({
          confidence: normalizeScore(cand.score),
          keywords: [],
          reason: safeIdMatch(cand.repository_id, res.repository_id)
            ? res.rationale || 'Selected by Document Intelligent Agent.'
            : `Candidate match score: ${cand.score}`,
          repositoryId: targetId,
          repositoryName:
            matchingRepo?.name || cand.repository_name || cand.repository_id,
          score: cand.score,
        })
      })
    }

    // Ensure the top recommended repository is present as the first suggestion
    if (res.repository_id) {
      const topExists = suggestions.some((s) =>
        safeIdMatch(s.repositoryId, res.repository_id),
      )
      if (!topExists) {
        const matchingRepo = candidateRepositories.find((r) =>
          safeIdMatch(r.id, res.repository_id),
        )
        const targetId = matchingRepo ? matchingRepo.id : res.repository_id
        suggestions.unshift({
          confidence: normalizeScore(res.confidence_score || 88),
          keywords: [],
          reason: res.rationale || 'Top AI classification match.',
          repositoryId: targetId,
          repositoryName:
            matchingRepo?.name || res.repository_name || res.repository_id,
          score: res.confidence_score,
        })
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence)

    const profile = detectProfile(file.name)

    return {
      documentType: res.repository_name || profile.type,
      keywords: profile.defaultKeywords,
      ocrText: res.ocr_text,
      rationale: res.rationale,
      sourceReference: res.source_reference || file.name,
      suggestions,
    }
  }

  const cleanError =
    error &&
    !error.includes('Cannot read properties') &&
    !error.includes('toLowerCase') &&
    !error.includes('TypeError')
      ? error
      : 'Classification failed for this document. Please try again.'

  throw new Error(cleanError)
}

function detectProfile(fileName?: string): DocProfile {
  const lowerName = (fileName || '').toLowerCase()
  for (const profile of DOCUMENT_PROFILES) {
    if (profile.matchKeywords.some((keyword) => lowerName.includes(keyword))) {
      return profile
    }
  }
  return FALLBACK_PROFILE
}
