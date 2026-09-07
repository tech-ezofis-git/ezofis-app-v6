import { useEffect, useState } from 'react'
import authUserStore from '@/stores/authUserStore'

export default function useProfileImage() {
  const session = authUserStore((state) => state.session)
  const API_URI = import.meta.env?.VITE_BASE_URL
  const defaultUrl = session
    ? `${API_URI}/user/avatar/${session.tenantId}/${session.id}`
    : ''

  const [imageUrl, setImageUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('custom-profile-image') || localStorage.getItem('custom-profile-image') || defaultUrl
    }
    return defaultUrl
  })

  useEffect(() => {
    // Keep standard fallback updated if session changes
    const customImage = sessionStorage.getItem('custom-profile-image') || localStorage.getItem('custom-profile-image')
    setImageUrl(customImage || defaultUrl)
  }, [defaultUrl])

  useEffect(() => {
    const handleUpdate = () => {
      const customImage = sessionStorage.getItem('custom-profile-image') || localStorage.getItem('custom-profile-image')
      setImageUrl(customImage || defaultUrl)
    }

    window.addEventListener('storage', handleUpdate)
    window.addEventListener('custom-preferences-updated', handleUpdate)

    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('custom-preferences-updated', handleUpdate)
    }
  }, [defaultUrl])

  return imageUrl
}
