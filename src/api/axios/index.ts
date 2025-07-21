import axios from 'axios'
import { env } from '@/env'

const instance = axios.create({
  baseURL: env.VITE_API_URL,
})

export { instance }
