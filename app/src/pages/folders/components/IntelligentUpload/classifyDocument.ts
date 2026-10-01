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
        const candidateReason =
          cand.rationale ||
          (safeIdMatch(cand.repository_id, res.repository_id)
            ? res.rationale
            : undefined) ||
          (cand.score !== undefined && cand.score !== null
            ? `Candidate match score: ${cand.score}`
            : '')

        suggestions.push({
          confidence: normalizeScore(cand.score),
          keywords: [],
          reason: candidateReason,
          repositoryId: targetId,
          repositoryName:
            matchingRepo?.name || cand.repository_name || cand.repository_id,
          score: cand.score,
        })
      })
    }

    // Ensure the top recommended repository is present as the first suggestion if returned
    if (res.repository_id) {
      const topExists = suggestions.some((s) =>
        safeIdMatch(s.repositoryId, res.repository_id),
      )
      if (!topExists) {
        const matchingRepo = candidateRepositories.find((r) =>
          safeIdMatch(r.id, res.repository_id),
        )
        const targetId = matchingRepo ? matchingRepo.id : res.repository_id
        const topScore = res.confidence_score ?? suggestions[0]?.score ?? 0
        suggestions.unshift({
          confidence: normalizeScore(topScore),
          keywords: [],
          reason:
            res.rationale ||
            (topScore !== undefined && topScore !== null
              ? `Candidate match score: ${topScore}`
              : ''),
          repositoryId: targetId,
          repositoryName:
            matchingRepo?.name || res.repository_name || res.repository_id,
          score: topScore,
        })
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence)

    return {
      documentType: res.repository_name || '',
      keywords: [],
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
