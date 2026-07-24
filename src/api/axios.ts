import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import authUserStore from '../stores/authUserStore'
import { decrypt, encrypt } from '../utils/crypto'

// Environment variable handling (Vite uses import.meta.env, CRA uses process.env)
const API_URL = import.meta.env?.VITE_BASE_URL || process.env.REACT_APP_API_URL
const V6_API_URL =
  import.meta.env?.VITE_V6_BASE_URL || 'https://demo.ezofis.com/v6api/api'

// --- 1. Standard Axios Instance (No Crypto) ---
export const _axios = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- 2. Secure Axios Instance (With Crypto) ---
export const axiosCrypto = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- 3. V6 Axios Instance (Unencrypted) ---
export const axiosV6 = axios.create({
  baseURL: V6_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Helper type to extend Axios config with metadata for timing and crypto bypass
interface CustomConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: Date }
  skipDecryption?: boolean
  skipEncryption?: boolean
  skipCancellation?: boolean
}

// --- Request Cancellation Logic ---
const pendingRequests = new Map<string, AbortController>()

const generateRequestKey = (config: InternalAxiosRequestConfig) => {
  return [config.method, config.url, JSON.stringify(config.params || {})].join('&')
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

axiosCrypto.interceptors.request.use(
  async (config: CustomConfig) => {
    const store = authUserStore.getState()
    const iv = store?.identity?.iv
    const token: any = store?.identity?.token
    const key = store?.identity?.key

    if (token) {
      config.headers.set('Token', token)
    }

    if (config.data && key && iv && !config.skipEncryption) {
      const encrypted = await encrypt(JSON.stringify(config.data), key, iv)
      config.data = encrypted
    }

    config.metadata = { startTime: new Date() }
    addPendingRequest(config)
    return config
  },
  (error) => Promise.reject(error),
)

// --- Response Interceptor ---
axiosCrypto.interceptors.response.use(
  async (response: AxiosResponse) => {
    removePendingRequest(response.config as CustomConfig)
    const config = response.config as CustomConfig
    const store = authUserStore.getState()
    const key = store?.identity?.key
    const iv = store?.identity?.iv

    if (
      typeof response.data === 'string' &&
      key &&
      iv &&
      !config.skipDecryption
    ) {
      try {
        const decryptedString = await decrypt(response.data, key, iv)
        try {
          response.data = JSON.parse(decryptedString)
        } catch (parseError) {
          response.data = decryptedString
        }
      } catch (e) {
        console.error('Failed to decrypt response', e)
      }
    }

    return response
  },
  async (error: AxiosError) => {
    if (error.config) {
      removePendingRequest(error.config as CustomConfig)
    }

    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    const store = authUserStore.getState()
    const key = store?.identity?.key
    const iv = store?.identity?.iv

    if (
      error.response?.data &&
      typeof error.response.data === 'string' &&
      key &&
      iv
    ) {
      try {
        const decryptedString = await decrypt(error.response.data, key, iv)
        try {
          error.response.data = JSON.parse(decryptedString)
        } catch {
          error.response.data = decryptedString
        }
      } catch (e) {
        console.error('Could not decrypt error response', e)
      }
    }

    if (error.response?.status === 401) {
      store.resetAuthState()
      if (
        globalThis.window !== undefined &&
        window.location.pathname !== '/sign-in'
      ) {
        window.location.href = '/sign-in'
      }
    }

    return Promise.reject(error)
  },
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
    store.resetAuthState()
    if (
      globalThis.window !== undefined &&
      window.location.pathname !== '/sign-in'
    ) {
      window.location.href = '/sign-in'
    }
  }
  return Promise.reject(error)
}

_axios.interceptors.response.use(handleResponseSuccess, handleResponseError)

axiosV6.interceptors.response.use(handleResponseSuccess, handleResponseError)
