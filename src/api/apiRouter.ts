import { authApi as v5AuthApi } from './auth'
import { authApiV6 } from './v6/auth'

/**
 * Helper to determine API version based on origin or other configs.
 * Modify this logic to suit your specific tenant check.
 */
export const getApiVersion = (): 'v5' | 'v6' => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    // Example logic: if the origin contains 'localhost:3000', use the V6 API
    // Adjust this to your actual condition
    if (origin.includes('localhost:3001')) {
      return 'v6'
    }
  }
  return 'v5' // Default to V5
}

// --- AUTH ROUTER ---

export const signUp = async (payload: any) => {
  const version = getApiVersion()

  if (version === 'v6') {
    // Map the generic/v5 payload to the specific V6 payload interface
    const v6Payload = {
      appVersion: '1.0.0',
      databaseName: null,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      licenseType: payload.licenseType || 3,
      loginType: payload.loginType,
      name: payload.firstName + ' ' + payload.lastName,
      organizationName: payload.organisation, // Note the 'z' vs 's'
      password: payload.password,
      platform: 'Windows',
      signupSource: 'Web',
      tenantId: null,
    }
    return await authApiV6.signUp(v6Payload)
  }

  // Default to V5 encrypted signUp
  return await v5AuthApi.signUp(payload)
}

export const sendMailOTP = async (payload: any) => {
  const version = getApiVersion()
  if (version === 'v6') return await authApiV6.sendMailOTP(payload)
  return await v5AuthApi.sendMailOTP(payload)
}

export const verifyMailOTP = async (payload: any) => {
  const version = getApiVersion()
  if (version === 'v6') return await authApiV6.verifyMailOTP(payload)
  return await v5AuthApi.verifyMailOTP(payload)
}

export const login = async (payload: any, tenantId?: string | number) => {
  const version = getApiVersion()

  if (version === 'v6') {
    // If tenantId is already provided (from selection UI), go straight to login
    if (tenantId) {
      return await authApiV6.login({
        email: payload.email,
        password: payload.password,
        tenantId: String(tenantId),
      })
    }

    // Otherwise, first fetch tenants for this email
    const tenantRes = await authApiV6.getTenants(payload.email)
    if (tenantRes.error) return tenantRes

    const tenants = tenantRes.data?.tenants || []

    if (tenants.length === 0) {
      return { data: null, error: 'No organizations found for this email.' }
    }

    if (tenants.length > 1) {
      // Return 300 to trigger the tenant selection UI in SignInForm.tsx
      // Map V6 tenant structure to what the UI expects (id, name, email)
      return {
        data: tenants.map((t: any) => ({
          email: payload.email,
          id: t.tenantId,
          name: t.name,
        })),
        status: 300,
      }
    }

    // Only one tenant, proceed to login automatically
    return await authApiV6.login({
      email: payload.email,
      password: payload.password,
      tenantId: tenants[0].tenantId,
    })
  }

  // Fallback to V5
  return await v5AuthApi.login(payload, tenantId)
}

export const apiRouter = {
  login,
  sendMailOTP,
  signUp,
  verifyMailOTP,
  getApiVersion,
}

export default apiRouter
