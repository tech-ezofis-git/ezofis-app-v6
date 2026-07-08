import { create } from 'zustand'

type DashboardState = {
  role: 'management' | 'ap'
  timeframe: 'today' | 'week' | 'month' | 'lastmonth' | 'quarter' | 'fy'
  supplierCategory: string
  invoiceStatus: string
  currency: string
  searchQuery: string
  drillSupplier: string | null
  drillAgingBucket: string | null
  drillStatus: string | null

  setRole: (role: 'management' | 'ap') => void
  setTimeframe: (timeframe: 'today' | 'week' | 'month' | 'lastmonth' | 'quarter' | 'fy') => void
  setSupplierCategory: (category: string) => void
  setInvoiceStatus: (status: string) => void
  setCurrency: (currency: string) => void
  setSearchQuery: (query: string) => void
  setDrillSupplier: (supplier: string | null) => void
  setDrillAgingBucket: (bucket: string | null) => void
  setDrillStatus: (status: string | null) => void
  resetFilters: () => void
}

const useDashboardStore = create<DashboardState>()((set) => ({
  role: 'ap', // default to match screenshot and ap team focus
  timeframe: 'month', // "This Month"
  supplierCategory: '',
  invoiceStatus: '',
  currency: '',
  searchQuery: '',
  drillSupplier: null,
  drillAgingBucket: null,
  drillStatus: null,

  setRole: (role) => set({ role, drillSupplier: null, drillAgingBucket: null, drillStatus: null }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setSupplierCategory: (supplierCategory) => set({ supplierCategory }),
  setInvoiceStatus: (invoiceStatus) => set({ invoiceStatus }),
  setCurrency: (currency) => set({ currency }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDrillSupplier: (drillSupplier) => set({ drillSupplier, drillAgingBucket: null, drillStatus: null }),
  setDrillAgingBucket: (drillAgingBucket) => set({ drillAgingBucket, drillSupplier: null, drillStatus: null }),
  setDrillStatus: (drillStatus) => set({ drillStatus, drillSupplier: null, drillAgingBucket: null }),
  resetFilters: () => set({
    timeframe: 'month',
    supplierCategory: '',
    invoiceStatus: '',
    currency: '',
    searchQuery: '',
    drillSupplier: null,
    drillAgingBucket: null,
    drillStatus: null,
  }),
}))

export default useDashboardStore
