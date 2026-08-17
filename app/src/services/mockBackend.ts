export interface DocumentVerificationState {
  supplierVerification: {
    data?: SupplierVerificationData
    status: 'not_run' | 'pending' | 'complete'
  }
}

export interface MockDatabase {
  credits: number
  documents: Record<string, DocumentVerificationState>
}

export interface SupplierVerificationData {
  status: string
  statusType: 'success' | 'warning' | 'danger' | 'info' | 'default'
  value: string
}

const DB_KEY = 'v6_mock_credits_database'

const DEFAULT_DB: MockDatabase = {
  credits: 100,
  documents: {},
}

export const getMockDB = (): MockDatabase => {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) {
      localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB))
      return DEFAULT_DB
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_DB
  }
}

export const saveMockDB = (db: MockDatabase) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
  // Disseminate to other tabs via storage event if they want to update
  window.dispatchEvent(new Event('storage'))
}

/**
 * Atomic helper to execute credit check, status check and deduction synchronously
 * to prevent double-charging / race conditions across tabs/clicks.
 */
const acquireDeduction = (
  documentId: string,
  feature: 'supplierVerification',
): { db: MockDatabase; docState: DocumentVerificationState } => {
  const db = getMockDB()

  if (!db.documents[documentId]) {
    db.documents[documentId] = {
      supplierVerification: { status: 'not_run' },
    }
  }

  const docState = db.documents[documentId]

  if (docState[feature].status === 'pending') {
    throw new Error('This operation is already in progress.')
  }

  if (docState[feature].status === 'complete') {
    throw new Error('This operation has already been completed.')
  }

  if (db.credits < 1) {
    throw new Error('Insufficient credits. 1 credit is required.')
  }

  // Deduct 1 credit and mark as pending
  db.credits -= 1
  docState[feature].status = 'pending'
  saveMockDB(db)

  return { db, docState }
}

export const startSupplierVerification = async (
  documentId: string,
  realApiResult: SupplierVerificationData,
): Promise<SupplierVerificationData> => {
  // Synchronous checks & credit deduction
  acquireDeduction(documentId, 'supplierVerification')

  // Simulate server-side API call (1.5 seconds loading state)
  return new Promise<SupplierVerificationData>((resolve, reject) => {
    setTimeout(() => {
      // 10% failure chance to test auto-refund / error handling
      const isFailure = Math.random() < 0.1

      if (isFailure) {
        // Auto-refund credit and reset status to 'not_run'
        const db = getMockDB()
        db.credits += 1
        if (db.documents[documentId]) {
          db.documents[documentId].supplierVerification.status = 'not_run'
        }
        saveMockDB(db)
        reject(new Error('Verification service connection timed out.'))
      } else {
        // Mark as completed and save real payload
        const db = getMockDB()
        if (db.documents[documentId]) {
          db.documents[documentId].supplierVerification.status = 'complete'
          db.documents[documentId].supplierVerification.data = realApiResult
        }
        saveMockDB(db)
        resolve(realApiResult)
      }
    }, 1500)
  })
}
