export type ActivityCredit = {
  activityType: string
  creditUsed: number
  id: string
}

export type MonthlyCredit = {
  details: MonthlyCreditDetail[]
  month: string
  total: number
}

export type MonthlyCreditDetail = {
  activityType: string
  creditUsed: number
}

export type RepositoryUsage = {
  creditUsed: number
  repositoryName: string
  usageCount: number
}

export type SubActivityCredit = {
  id: string
  repositoryDetails: RepositoryUsage[]
  subActivityName: string
  totalCreditUsed: number
}

export type TimelineData = {
  label: string
  value: number
}

export const selectedYear = '2026'
export const selectedMonth = 'Jun'

export const totalCredit = 12580

export const activityCredits: ActivityCredit[] = [
  { activityType: 'AP Agent', creditUsed: 4850, id: 'act-1' },
  { activityType: 'OCR Agent', creditUsed: 3920, id: 'act-2' },
  { activityType: 'Document Summary', creditUsed: 1680, id: 'act-3' },
  { activityType: 'Supplier Validation', creditUsed: 980, id: 'act-4' },
  { activityType: 'Duplicate Detection', creditUsed: 760, id: 'act-5' },
  { activityType: 'Back Order Detection', creditUsed: 390, id: 'act-6' },
]

export const topSubActivityCredits: SubActivityCredit[] = [
  {
    id: 'sub-1',
    repositoryDetails: [
      { creditUsed: 1860, repositoryName: 'AP Invoices', usageCount: 286 },
      { creditUsed: 910, repositoryName: 'Vendor Bills', usageCount: 148 },
      { creditUsed: 350, repositoryName: 'Trial AP', usageCount: 55 },
    ],
    subActivityName: 'Invoice OCR Extraction',
    totalCreditUsed: 3120,
  },
  {
    id: 'sub-2',
    repositoryDetails: [
      { creditUsed: 1210, repositoryName: 'PO Master', usageCount: 180 },
      { creditUsed: 640, repositoryName: 'MSP Testing', usageCount: 96 },
      { creditUsed: 410, repositoryName: 'AP Agent Trial', usageCount: 70 },
    ],
    subActivityName: 'PO Line Matching',
    totalCreditUsed: 2260,
  },
  {
    id: 'sub-3',
    repositoryDetails: [
      { creditUsed: 750, repositoryName: 'Contracts', usageCount: 84 },
      { creditUsed: 510, repositoryName: 'Policies', usageCount: 58 },
      { creditUsed: 420, repositoryName: 'SOW Documents', usageCount: 49 },
    ],
    subActivityName: 'Document Summary',
    totalCreditUsed: 1680,
  },
  {
    id: 'sub-4',
    repositoryDetails: [
      { creditUsed: 610, repositoryName: 'Vendor Master', usageCount: 102 },
      { creditUsed: 370, repositoryName: 'Supplier Audit', usageCount: 44 },
    ],
    subActivityName: 'Supplier Master Validation',
    totalCreditUsed: 980,
  },
  {
    id: 'sub-5',
    repositoryDetails: [
      { creditUsed: 520, repositoryName: 'AP Invoices', usageCount: 120 },
      { creditUsed: 240, repositoryName: 'Archive', usageCount: 46 },
    ],
    subActivityName: 'Duplicate Invoice Check',
    totalCreditUsed: 760,
  },
]

export const monthlyCredits: MonthlyCredit[] = [
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 2600 },
      { activityType: 'OCR Agent', creditUsed: 2180 },
      { activityType: 'Document Summary', creditUsed: 920 },
      { activityType: 'Supplier Validation', creditUsed: 720 },
    ],
    month: 'Jan - 2026',
    total: 6420,
  },
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 2980 },
      { activityType: 'OCR Agent', creditUsed: 2360 },
      { activityType: 'Document Summary', creditUsed: 1080 },
      { activityType: 'Supplier Validation', creditUsed: 760 },
    ],
    month: 'Feb - 2026',
    total: 7180,
  },
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 3500 },
      { activityType: 'OCR Agent', creditUsed: 2980 },
      { activityType: 'Document Summary', creditUsed: 1380 },
      { activityType: 'Supplier Validation', creditUsed: 980 },
    ],
    month: 'Mar - 2026',
    total: 8840,
  },
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 3860 },
      { activityType: 'OCR Agent', creditUsed: 3140 },
      { activityType: 'Document Summary', creditUsed: 1620 },
      { activityType: 'Supplier Validation', creditUsed: 1040 },
    ],
    month: 'Apr - 2026',
    total: 9660,
  },
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 4420 },
      { activityType: 'OCR Agent', creditUsed: 3560 },
      { activityType: 'Document Summary', creditUsed: 1960 },
      { activityType: 'Supplier Validation', creditUsed: 1300 },
    ],
    month: 'May - 2026',
    total: 11240,
  },
  {
    details: [
      { activityType: 'AP Agent', creditUsed: 4850 },
      { activityType: 'OCR Agent', creditUsed: 3920 },
      { activityType: 'Document Summary', creditUsed: 1680 },
      { activityType: 'Supplier Validation', creditUsed: 980 },
      { activityType: 'Duplicate Detection', creditUsed: 760 },
      { activityType: 'Back Order Detection', creditUsed: 390 },
    ],
    month: 'Jun - 2026',
    total: 12580,
  },
]

export const timelineData: TimelineData[] = [
  { label: 'Week 1', value: 2100 },
  { label: 'Week 2', value: 2850 },
  { label: 'Week 3', value: 3350 },
  { label: 'Week 4', value: 4280 },
]
