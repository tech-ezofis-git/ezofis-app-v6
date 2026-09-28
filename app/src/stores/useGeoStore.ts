import { create } from 'zustand'

interface GeoState {
  countryName: string | null
  countryCode: string | null
  isRestricted: boolean // true if INDIA or CANADA
  isLoading: boolean
  fetchLocation: () => Promise<void>
}

const useGeoStore = create<GeoState>((set) => ({
  countryName: null,
  countryCode: null,
  isRestricted: false,
  isLoading: true,
  fetchLocation: async () => {
    try {
      const r = await fetch('https://ipapi.co/json/')
      const data = await r.json()

      const country = data?.country_name?.toUpperCase() || ''
      const isRestricted = country !== 'INDIA'

      set({
        countryName: data.country_name,
        countryCode: data.country,
        isRestricted,
        isLoading: false
      })
      console.log('[GeoStore] Location fetched:', data.country_name, 'Restricted:', isRestricted)
    } catch (error) {
      console.error('[GeoStore] Failed to fetch location data:', error)
      set({ isLoading: false })
    }
  }
}))

export default useGeoStore
