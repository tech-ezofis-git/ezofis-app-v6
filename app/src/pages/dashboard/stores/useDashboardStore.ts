import { create } from 'zustand'

type DashboardState = {
  currency: string
  drillAgingBucket: string | null
  drillStatus: string | null
  drillSupplier: string | null
  invoiceStatus: string
  repositoryId: string
  role: 'management' | 'ap'
  searchQuery: string
  supplierCategory: string
  /** Preset key (today, week, month, …) or custom:YYYY-MM-DD_YYYY-MM-DD */
  timeframe: string

  resetFilters: () => void
  setCurrency: (currency: string) => void
  setDrillAgingBucket: (bucket: string | null) => void
  setDrillStatus: (status: string | null) => void
  setDrillSupplier: (supplier: string | null) => void
  setInvoiceStatus: (status: string) => void
  setRepositoryId: (repositoryId: string) => void
  setRole: (role: 'management' | 'ap') => void
  setSearchQuery: (query: string) => void
  setSupplierCategory: (category: string) => void
  setTimeframe: (timeframe: string) => void
}

const useDashboardStore = create<DashboardState>()((set) => ({
  currency: '',
  drillAgingBucket: null,
  drillStatus: null,
  drillSupplier: null,
  invoiceStatus: '',
  repositoryId: 'ap',
  role: 'management',
  searchQuery: '',
  supplierCategory: '',
  timeframe: 'month', // "This Month"

  resetFilters: () =>
    set({
      currency: '',
      drillAgingBucket: null,
      drillStatus: null,
      drillSupplier: null,
      invoiceStatus: '',
      searchQuery: '',
      supplierCategory: '',
      timeframe: 'month',
    }),
  setCurrency: (currency) => set({ currency }),
  setDrillAgingBucket: (drillAgingBucket) =>
    set({ drillAgingBucket, drillStatus: null, drillSupplier: null }),
  setDrillStatus: (drillStatus) =>
    set({ drillAgingBucket: null, drillStatus, drillSupplier: null }),
  setDrillSupplier: (drillSupplier) =>
    set({ drillAgingBucket: null, drillStatus: null, drillSupplier }),
  setInvoiceStatus: (invoiceStatus) => set({ invoiceStatus }),
  setRepositoryId: (repositoryId) => set({ repositoryId }),
  setRole: (role) =>
    set({
      drillAgingBucket: null,
      drillStatus: null,
      drillSupplier: null,
      role,
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSupplierCategory: (supplierCategory) => set({ supplierCategory }),
  setTimeframe: (timeframe) => set({ timeframe }),
}))

export default useDashboardStore
