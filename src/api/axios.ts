/* eslint-disable prettier/prettier */
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { decrypt, encrypt } from '../utils/crypto'
import authUserStore from '../stores/authUserStore'

// Environment variable handling (Vite uses import.meta.env, CRA uses process.env)
const API_URL = import.meta.env?.VITE_BASE_URL || process.env.REACT_APP_API_URL
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

// Helper type to extend Axios config with metadata for timing
interface CustomConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: Date }
}

// --- Request Interceptor ---
axiosCrypto.interceptors.request.use(
  async (config: CustomConfig) => {
    const store = authUserStore.getState()
    // 1. Get Key/IV/Token from Redux Store
    const iv = store?.identity?.iv
    const token: any = store?.identity?.token
    const key = store?.identity?.key

    // 2. Attach Token
    if (token) {
      config.headers.set('Token', token)
    }
    console.log(key, iv, token)

    // 3. Encrypt Payload (Async)
    if (config.data && key && iv) {
      const encrypted = await encrypt(JSON.stringify(config.data), key, iv)
      config.data = encrypted
    }

    // 4. Metadata for timing
    config.metadata = { startTime: new Date() }
    console.table(config)
    // 5. Logging (omitted for brevity)

    return config
  },
  (error) => Promise.reject(error),
)

// --- Response Interceptor ---
axiosCrypto.interceptors.response.use(
  async (response: AxiosResponse) => {
    // const config = response.config as CustomConfig
    const store = authUserStore.getState() // ⬅️ Get fresh state on response

    // ⭐️ Use the actual keys from the store!
    const key = store?.identity?.key // ⬅️ FIX: Reading key from store
    const iv = store?.identity?.iv // ⬅️ FIX: Reading IV from store

    // 1. Calculate Duration
    // const startTime = config.metadata?.startTime || new Date()
    // const duration = new Date().getTime() - startTime.getTime()
    // const durationSec = (duration / 1000).toFixed(2)

    // 3. Decrypt Data (Async)
    if (response.data && key && iv) {
      try {
        const decryptedString = await decrypt(response.data, key, iv)
        console.log(decryptedString)
        // Important: Native decrypt returns a string. We must parse it back to JSON.
        response.data = JSON.parse(decryptedString)
      } catch (e) {
        console.error('Failed to decrypt response', e)
      }
    }

    // 4. Logging (omitted for brevity)
    console.table(response)

    return response
  },
  async (error: AxiosError) => {
    const store = authUserStore.getState() // ⬅️ Get fresh state on error
    const key = store?.identity?.key // ⬅️ FIX: Reading key from store
    const iv = store?.identity?.iv // ⬅️ FIX: Reading IV from store

    // Handle Error Logging
    if (error.config) {
      const config = error.config as CustomConfig
      const startTime = config.metadata?.startTime || new Date()
      const duration = new Date().getTime() - startTime.getTime()
      console.log(duration)
    }

    // Attempt to decrypt error response body
    if (error.response?.data && key && iv) {
      try {
        const decryptedString = await decrypt(
          error.response.data as string,
          key,
          iv,
        )
        error.response.data = JSON.parse(decryptedString)

        // Log decrypted error
        // ... (Error logging omitted for brevity)
      } catch (e) {
        console.error('Could not decrypt error response', e)
      }
    }

    return Promise.reject(error)
  },
)