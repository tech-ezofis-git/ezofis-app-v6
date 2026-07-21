import { create } from 'zustand'

type DashboardState = {
  currency: string
  drillAgingBucket: string | null
  drillStatus: string | null
  drillSupplier: string | null
  invoiceStatus: string
  role: 'management' | 'ap'
  searchQuery: string
  supplierCategory: string
  timeframe: 'today' | 'week' | 'month' | 'lastmonth' | 'quarter' | 'fy'

  resetFilters: () => void
  setCurrency: (currency: string) => void
  setDrillAgingBucket: (bucket: string | null) => void
  setDrillStatus: (status: string | null) => void
  setDrillSupplier: (supplier: string | null) => void
  setInvoiceStatus: (status: string) => void
  setRole: (role: 'management' | 'ap') => void
  setSearchQuery: (query: string) => void
  setSupplierCategory: (category: string) => void
  setTimeframe: (
    timeframe: 'today' | 'week' | 'month' | 'lastmonth' | 'quarter' | 'fy',
  ) => void
}

const useDashboardStore = create<DashboardState>()((set) => ({
  currency: '',
  drillAgingBucket: null,
  drillStatus: null,
  drillSupplier: null,
  invoiceStatus: '',
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
