import { authApi as v5AuthApi } from './auth';
import { authApiV6 } from './v6/auth';

/**
 * Helper to determine API version based on origin or other configs.
 * Modify this logic to suit your specific tenant check.
 */
export const getApiVersion = (): 'v5' | 'v6' => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Example logic: if the origin contains 'localhost:3000', use the V6 API
    // Adjust this to your actual condition
    if (origin.includes('localhost:3000')) {
      return 'v6';
    }
  }
  return 'v5'; // Default to V5
};

// --- AUTH ROUTER ---

export const signUp = async (payload: any) => {
  const version = getApiVersion();
  
  if (version === 'v6') {
    // Map the generic/v5 payload to the specific V6 payload interface
    const v6Payload = {
      tenantId: null,
      name: payload.firstName + ' ' + payload.lastName,
      organizationName: payload.organisation, // Note the 'z' vs 's'
      email: payload.email,
      password: payload.password,
      loginType: payload.loginType,
      licenseType: payload.licenseType || 3,
      firstName: payload.firstName,
      lastName: payload.lastName,
      databaseName: null,
      signupSource: 'Web',
      platform: 'Windows',
      appVersion: '1.0.0'
    };
    return await authApiV6.signUp(v6Payload);
  }
  
  // Default to V5 encrypted signUp
  return await v5AuthApi.signUp(payload);
};

export const sendMailOTP = async (payload: any) => {
  const version = getApiVersion();
  if (version === 'v6') return await authApiV6.sendMailOTP(payload);
  return await v5AuthApi.sendMailOTP(payload);
};

export const verifyMailOTP = async (payload: any) => {
  const version = getApiVersion();
  if (version === 'v6') return await authApiV6.verifyMailOTP(payload);
  return await v5AuthApi.verifyMailOTP(payload);
};

export const login = async (payload: any, tenantId?: string | number) => {
  const version = getApiVersion();

  if (version === 'v6') {
    // If tenantId is already provided (from selection UI), go straight to login
    if (tenantId) {
      return await authApiV6.login({
        email: payload.email,
        password: payload.password,
        tenantId: String(tenantId)
      });
    }

    // Otherwise, first fetch tenants for this email
    const tenantRes = await authApiV6.getTenants(payload.email);
    if (tenantRes.error) return tenantRes;

    const tenants = tenantRes.data?.tenants || [];

    if (tenants.length === 0) {
      return { data: null, error: 'No organizations found for this email.' };
    }

    if (tenants.length > 1) {
      // Return 300 to trigger the tenant selection UI in SignInForm.tsx
      // Map V6 tenant structure to what the UI expects (id, name, email)
      return {
        status: 300,
        data: tenants.map((t: any) => ({
          id: t.tenantId,
          name: t.name,
          email: payload.email
        }))
      };
    }

    // Only one tenant, proceed to login automatically
    return await authApiV6.login({
      email: payload.email,
      password: payload.password,
      tenantId: tenants[0].tenantId
    });
  }

  // Fallback to V5
  return await v5AuthApi.login(payload, tenantId);
};

export const apiRouter = {
  signUp,
  sendMailOTP,
  verifyMailOTP,
  login,
  getApiVersion
};

export default apiRouter;
