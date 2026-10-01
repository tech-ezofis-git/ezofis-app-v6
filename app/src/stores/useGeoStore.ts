import { create } from 'zustand'

interface GeoState {
  countryCode: string | null
  countryName: string | null
  isLoading: boolean
  isRestricted: boolean // true if INDIA or CANADA
  fetchLocation: () => Promise<void>
}

const useGeoStore = create<GeoState>((set) => ({
  countryCode: null,
  countryName: null,
  isLoading: true,
  isRestricted: false,
  fetchLocation: async () => {
    try {
      const r = await fetch('https://ipapi.co/json/')
      const data = await r.json()

      const country = data?.country_name?.toUpperCase() || ''
      const isRestricted = country !== 'INDIA'

      set({
        countryCode: data.country,
        countryName: data.country_name,
        isLoading: false,
        isRestricted,
      })
      console.log(
        '[GeoStore] Location fetched:',
        data.country_name,
        'Restricted:',
        isRestricted,
      )
    } catch (error) {
      console.error('[GeoStore] Failed to fetch location data:', error)
      set({ isLoading: false })
    }
  },
}))

export default useGeoStore
