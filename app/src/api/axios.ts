import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { isAuthEntryPath, resolveSignInPath } from '../lib/branding/session'
import authUserStore from '../stores/authUserStore'

// Dynamic Base URL Resolution based on environment and hostname
export const getApiBaseUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname?.includes('cloud.ezofis.com')
  ) {
    return 'https://cloud.ezofis.com/api'
  }
  return (
    import.meta.env?.VITE_BASE_URL ||
    process.env.REACT_APP_API_URL ||
    'https://demo.ezofis.com/v6api/api'
  )
}

export const getV6ApiBaseUrl = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname?.includes('cloud.ezofis.com')
  ) {
    return 'https://cloud.ezofis.com/api'
  }
  return (
    import.meta.env?.VITE_V6_BASE_URL || 'https://demo.ezofis.com/v6api/api'
  )
}

const API_URL = getApiBaseUrl()
const V6_API_URL = getV6ApiBaseUrl()

// --- 1. Standard Axios Instance ---
export const _axios = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- 2. V6 Axios Instance ---
export const axiosV6 = axios.create({
  baseURL: V6_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Helper type to extend Axios config with metadata for timing and cancellation
declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: { startTime: Date }
    skipCancellation?: boolean
  }
}

interface CustomConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: Date }
  skipCancellation?: boolean
}

// --- Request Cancellation Logic ---
const pendingRequests = new Map<string, AbortController>()

const generateRequestKey = (config: InternalAxiosRequestConfig) => {
  return [config.method, config.url, JSON.stringify(config.params || {})].join(
    '&',
  )
}

const addPendingRequest = (config: CustomConfig) => {
  if (config.skipCancellation) return
  const requestKey = generateRequestKey(config)

  if (pendingRequests.has(requestKey)) {
    const previousController = pendingRequests.get(requestKey)
    previousController?.abort('Cancelled by new identical request')
  }

  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(requestKey, controller)
}

const removePendingRequest = (config: CustomConfig) => {
  if (config.skipCancellation) return
  const requestKey = generateRequestKey(config)
  const controller = pendingRequests.get(requestKey)
  // Only clear if this response/error belongs to the controller still tracked
  // for the key (a superseded request must not drop the newer in-flight one).
  if (controller && config.signal === controller.signal) {
    pendingRequests.delete(requestKey)
  }
}

// --- Request Interceptor ---
_axios.interceptors.request.use(
  (config: CustomConfig) => {
    addPendingRequest(config)
    return config
  },
  (error) => Promise.reject(error),
)

// --- V6 Request Interceptor (Auth Token) ---
axiosV6.interceptors.request.use(
  (config: CustomConfig) => {
    const store = authUserStore.getState()
    const accessToken = store?.identity?.accessToken

    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }

    addPendingRequest(config)
    return config
  },
  (error) => Promise.reject(error),
)

// --- Shared Response Interceptors for unencrypted instances ---
const handleResponseSuccess = (response: AxiosResponse) => {
  removePendingRequest(response.config as CustomConfig)
  return response
}

const handleResponseError = (error: AxiosError) => {
  if (error.config) {
    removePendingRequest(error.config as CustomConfig)
  }

  if (axios.isCancel(error)) {
    return Promise.reject(error)
  }

  if (error.response?.status === 401) {
    const store = authUserStore.getState()
    const signInPath = resolveSignInPath()
    store.resetAuthState()
    if (
      globalThis.window !== undefined &&
      !isAuthEntryPath(window.location.pathname) &&
      !window.location.pathname.startsWith('/sign-request')
    ) {
      window.location.href = signInPath
    }
  }
  return Promise.reject(error)
}

_axios.interceptors.response.use(handleResponseSuccess, handleResponseError)

axiosV6.interceptors.response.use(handleResponseSuccess, handleResponseError)
