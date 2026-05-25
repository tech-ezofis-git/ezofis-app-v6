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

export const sendMailOTP = async (payload: any) => {
  return await authApiV6.sendMailOTP(payload)
}

export const verifyMailOTP = async (payload: any) => {
  return await authApiV6.verifyMailOTP(payload)
}

export const login = async (payload: any, tenantId?: string | number) => {
  // Fallback/Default to V5
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
