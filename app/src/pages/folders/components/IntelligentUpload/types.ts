export interface CandidateRepository {
  id: string
  name: string
}

export interface ClassificationResult {
  documentType: string
  keywords: string[]
  suggestions: ClassificationSuggestion[]
}

export interface ClassificationSuggestion {
  confidence: number
  keywords: string[]
  reason: string
  repositoryId: string
  repositoryName: string
}

export interface ClassifiedFile {
  file: File
  id: string
  status: ClassifiedFileStatus
  currentStage?: string
  documentType?: string
  elapsedSeconds?: number
  error?: string
  keywords?: string[]
  selectedRepositoryId?: string
  suggestions?: ClassificationSuggestion[]
}

export type ClassifiedFileStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'uploaded'
  | 'error'
