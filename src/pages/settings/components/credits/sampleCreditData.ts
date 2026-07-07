export type RepositoryUsage = {
  repositoryName: string;
  usageCount: number;
  creditUsed: number;
};

export type ActivityCredit = {
  id: string;
  activityType: string;
  creditUsed: number;
};

export type SubActivityCredit = {
  id: string;
  subActivityName: string;
  totalCreditUsed: number;
  repositoryDetails: RepositoryUsage[];
};

export type MonthlyCreditDetail = {
  activityType: string;
  creditUsed: number;
};

export type MonthlyCredit = {
  month: string;
  total: number;
  details: MonthlyCreditDetail[];
};

export type TimelineData = {
  label: string;
  value: number;
};

export const selectedYear = "2026";
export const selectedMonth = "Jun";

export const totalCredit = 12580;

export const activityCredits: ActivityCredit[] = [
  { id: "act-1", activityType: "AP Agent", creditUsed: 4850 },
  { id: "act-2", activityType: "OCR Agent", creditUsed: 3920 },
  { id: "act-3", activityType: "Document Summary", creditUsed: 1680 },
  { id: "act-4", activityType: "Supplier Validation", creditUsed: 980 },
  { id: "act-5", activityType: "Duplicate Detection", creditUsed: 760 },
  { id: "act-6", activityType: "Back Order Detection", creditUsed: 390 },
];

export const topSubActivityCredits: SubActivityCredit[] = [
  {
    id: "sub-1",
    subActivityName: "Invoice OCR Extraction",
    totalCreditUsed: 3120,
    repositoryDetails: [
      { repositoryName: "AP Invoices", usageCount: 286, creditUsed: 1860 },
      { repositoryName: "Vendor Bills", usageCount: 148, creditUsed: 910 },
      { repositoryName: "Trial AP", usageCount: 55, creditUsed: 350 },
    ],
  },
  {
    id: "sub-2",
    subActivityName: "PO Line Matching",
    totalCreditUsed: 2260,
    repositoryDetails: [
      { repositoryName: "PO Master", usageCount: 180, creditUsed: 1210 },
      { repositoryName: "MSP Testing", usageCount: 96, creditUsed: 640 },
      { repositoryName: "AP Agent Trial", usageCount: 70, creditUsed: 410 },
    ],
  },
  {
    id: "sub-3",
    subActivityName: "Document Summary",
    totalCreditUsed: 1680,
    repositoryDetails: [
      { repositoryName: "Contracts", usageCount: 84, creditUsed: 750 },
      { repositoryName: "Policies", usageCount: 58, creditUsed: 510 },
      { repositoryName: "SOW Documents", usageCount: 49, creditUsed: 420 },
    ],
  },
  {
    id: "sub-4",
    subActivityName: "Supplier Master Validation",
    totalCreditUsed: 980,
    repositoryDetails: [
      { repositoryName: "Vendor Master", usageCount: 102, creditUsed: 610 },
      { repositoryName: "Supplier Audit", usageCount: 44, creditUsed: 370 },
    ],
  },
  {
    id: "sub-5",
    subActivityName: "Duplicate Invoice Check",
    totalCreditUsed: 760,
    repositoryDetails: [
      { repositoryName: "AP Invoices", usageCount: 120, creditUsed: 520 },
      { repositoryName: "Archive", usageCount: 46, creditUsed: 240 },
    ],
  },
];

export const monthlyCredits: MonthlyCredit[] = [
  {
    month: "Jan - 2026",
    total: 6420,
    details: [
      { activityType: "AP Agent", creditUsed: 2600 },
      { activityType: "OCR Agent", creditUsed: 2180 },
      { activityType: "Document Summary", creditUsed: 920 },
      { activityType: "Supplier Validation", creditUsed: 720 },
    ],
  },
  {
    month: "Feb - 2026",
    total: 7180,
    details: [
      { activityType: "AP Agent", creditUsed: 2980 },
      { activityType: "OCR Agent", creditUsed: 2360 },
      { activityType: "Document Summary", creditUsed: 1080 },
      { activityType: "Supplier Validation", creditUsed: 760 },
    ],
  },
  {
    month: "Mar - 2026",
    total: 8840,
    details: [
      { activityType: "AP Agent", creditUsed: 3500 },
      { activityType: "OCR Agent", creditUsed: 2980 },
      { activityType: "Document Summary", creditUsed: 1380 },
      { activityType: "Supplier Validation", creditUsed: 980 },
    ],
  },
  {
    month: "Apr - 2026",
    total: 9660,
    details: [
      { activityType: "AP Agent", creditUsed: 3860 },
      { activityType: "OCR Agent", creditUsed: 3140 },
      { activityType: "Document Summary", creditUsed: 1620 },
      { activityType: "Supplier Validation", creditUsed: 1040 },
    ],
  },
  {
    month: "May - 2026",
    total: 11240,
    details: [
      { activityType: "AP Agent", creditUsed: 4420 },
      { activityType: "OCR Agent", creditUsed: 3560 },
      { activityType: "Document Summary", creditUsed: 1960 },
      { activityType: "Supplier Validation", creditUsed: 1300 },
    ],
  },
  {
    month: "Jun - 2026",
    total: 12580,
    details: [
      { activityType: "AP Agent", creditUsed: 4850 },
      { activityType: "OCR Agent", creditUsed: 3920 },
      { activityType: "Document Summary", creditUsed: 1680 },
      { activityType: "Supplier Validation", creditUsed: 980 },
      { activityType: "Duplicate Detection", creditUsed: 760 },
      { activityType: "Back Order Detection", creditUsed: 390 },
    ],
  },
];

export const timelineData: TimelineData[] = [
  { label: "Week 1", value: 2100 },
  { label: "Week 2", value: 2850 },
  { label: "Week 3", value: 3350 },
  { label: "Week 4", value: 4280 },
];