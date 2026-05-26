/* eslint-disable prettier/prettier */
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import authUserStore from '../stores/authUserStore'
import { decrypt, encrypt } from '../utils/crypto'

// Environment variable handling (Vite uses import.meta.env, CRA uses process.env)
const API_URL = import.meta.env?.VITE_BASE_URL || process.env.REACT_APP_API_URL
const V6_API_URL = import.meta.env?.VITE_V6_BASE_URL || 'https://demo.ezofis.com/v6api/api'

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
}

// --- Request Interceptor ---
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
    return config
  },
  (error) => Promise.reject(error),
)

// --- Response Interceptor ---
axiosCrypto.interceptors.response.use(
  async (response: AxiosResponse) => {
    const config = response.config as CustomConfig
    const store = authUserStore.getState()
    const key = store?.identity?.key
    const iv = store?.identity?.iv

    if (typeof response.data === 'string' && key && iv && !config.skipDecryption) {
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
    const store = authUserStore.getState()
    const key = store?.identity?.key
    const iv = store?.identity?.iv

    if (error.response?.data && typeof error.response.data === 'string' && key && iv) {
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

    return Promise.reject(error)
  },
)

// --- V6 Request Interceptor (Auth Token) ---
axiosV6.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const store = authUserStore.getState()
    const accessToken = store?.identity?.accessToken

    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return config
  },
  (error) => Promise.reject(error),
)

