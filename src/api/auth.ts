// import store from '../stores/authUserStore'
import authUserStore from '../stores/authUserStore'
import { setToLocalStorage } from '../utils/local-storage'
// src/api/authApi.ts
import { _axios, axiosCrypto } from './axios'

// Vite-style env (adjust name to your setup)
const API_URL = import.meta.env.VITE_API_URL || ''
interface IdentityKeys {
  iv: string
  key: string
  token: string
}

const decodeBase64Json = (data: string) => {
  const json = atob(data) // base64 -> string
  return JSON.parse(json) // string -> object
}

// ... (rest of authApi.ts)

const login = async (payload: any, tenantId?: number | string) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      headers: {
        Token: tenantId ? `tenantId ${tenantId}` : `email ${payload.email}`,
      },
      method: 'POST',
      url: `${API_URL}/authentication/login`,
    })

    if (status !== 200) {
      throw 'invalid status code'
    }

    const identity = decodeBase64Json(data) as unknown

    // --- START: FIXING TYPE ERROR AND RACE CONDITION ---

    // 1. Assert the type needed for token, key, iv access
    const assertedIdentity = identity as IdentityKeys

    setToLocalStorage(assertedIdentity, 'identity')

    // 2. Update the store
    const { setIdentity } = authUserStore.getState()
    setIdentity(assertedIdentity)
    response.data = 'Success'

    // 3. Call getSession, relying on the store being updated for the interceptor.
    // NOTE: Because the interceptors now read directly from the store,
    // we don't strictly *need* to pass the keys, but it's often a good practice
    // to pass fresh data between sequential requests.
    const { error } = await getSession() // Removed redundant key passing

    // If you need the key/iv/token immediately for logging before state is finalized:
    // const { error } = await getSession({
    //    key: assertedIdentity.key,
    //    iv: assertedIdentity.iv,
    //    token: assertedIdentity.token
    // });

    response.error = error
    // --- END: FIXING TYPE ERROR AND RACE CONDITION ---
  } catch (e: any) {
    console.error(e)

    if (e?.response?.status === 300) {
      response.data = e.response.data
      response.status = e.response.status
    } else if (e?.response?.status === 404) {
      response.error = 'user account not found'
    } else if (typeof e?.response?.data === 'string') {
      response.error = e.response.data
    } else {
      response.error = 'error logging in'
    }
  }

  return response
}

// Define a type for the identity keys you need for authentication/crypto
interface IdentityKeys {
  iv: string
  key: string
  token: string
}

// ... (rest of imports)

// The original getSession function now accepts the fresh keys
const getSession = async (identityKeys?: IdentityKeys) => {
  console.log(identityKeys)
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await axiosCrypto.get(
      '/authentication/userSession',
      {
        // Optional: you could pass the token here for immediate use,
        // but the Request Interceptor should already read it from the store.
        // This is primarily for future proofing if you remove store dependency in interceptors.
      },
    )

    if (status !== 200) {
      throw 'invalid status code'
    }
    console.log(data)

    setToLocalStorage(data, 'session')
    const { setSession } = authUserStore.getState()
    setSession(data)
  } catch (e) {
    console.error(e)
    response.error = 'error fetching session'
  }

  return response
}

const authentication = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      headers: {
        Token: `tenantId ${payload.tenantId}`,
      },
      method: 'POST',
      url: `${API_URL}/portal/validateOTP`,
    })

    if (status !== 201 && status !== 200) {
      throw 'invalid status code'
    }

    if (data === 'Invalid OTP') {
      response.error = data
    } else if (payload.otp) {
      const identity = decodeBase64Json(data)

      setToLocalStorage(identity, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(identity)
      response.data = 'Success'

      const { error } = await getSession()
      response.error = error
    }
  } catch (e: any) {
    console.error(e)
    response.error = 'error logging in'

    if (e?.response?.status === 404) {
      response.error = e.response.data
    }
  }

  return response
}

const socialLogin = async (payload: any, tenantId?: number | string) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      headers: {
        Token: tenantId ? `tenantId ${tenantId}` : `email ${payload.email}`,
      },
      method: 'POST',
      url: `${API_URL}/authentication/socialLogin`,
    })

    if (status !== 200) {
      throw 'invalid status code'
    }

    const identity = decodeBase64Json(data)
    setToLocalStorage(identity, 'identity')
    const { setIdentity } = authUserStore.getState()
    setIdentity(identity)
    response.data = 'Success'

    const { error } = await getSession()
    response.error = error
  } catch (e: any) {
    console.error(e)

    if (e?.response?.status === 300) {
      response.data = e.response.data
      response.status = e.response.status
    } else if (e?.response?.status === 404) {
      response.error = 'user account not found'
    } else if (typeof e?.response?.data === 'string') {
      response.error = e.response.data
      response.status = e.response.status
    } else {
      response.error = 'error logging in'
    }
  }

  return response
}

const portalLogin = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      headers: {
        Token: `tenantId ${payload.tenantId}`,
      },
      method: 'POST',
      url: `${API_URL}/portal/validateMaster`,
    })

    if (status === 200) {
      const identity = decodeBase64Json(data)
      setToLocalStorage(identity, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(identity)
      response.data = 'Success'

      const { error } = await getSession()
      response.error = error
    } else if (status !== 201) {
      throw 'invalid status code'
    }
  } catch (e: any) {
    console.error(e)
    response.error = 'error logging in'

    if (e?.response?.status === 404) {
      response.error = e.response.data
    }
  }

  return response
}

const testDBConnection = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { status } = await axiosCrypto.post(
      '/authentication/testConnection',
      JSON.stringify(payload),
    )

    if (status !== 200) {
      throw 'invalid status code'
    }
  } catch (e) {
    console.error(e)
    response.error = 'error fetching connection'
  }

  return response
}

const updateDBConnection = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { status } = await axiosCrypto.post(
      '/authentication/updateConnection',
      JSON.stringify(payload),
    )

    if (status !== 200) {
      throw 'invalid status code'
    }
  } catch (e) {
    console.error(e)
    response.error = 'error saving connection'
  }

  return response
}

const validatePassword = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { status } = await axiosCrypto.post(
      '/authentication/validatePassword',
      JSON.stringify(payload),
    )

    if (status !== 200) {
      throw 'invalid status code'
    }
  } catch (e) {
    console.error(e)
    response.error = 'invalid password'
  }

  return response
}

const emailValidate = async (tenantId: number | string, payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `${API_URL}/activeDirectory/verifyUser/${tenantId}`,
    })

    if (status !== 200) {
      throw 'invalid status code'
    }

    response.data = data
  } catch (e: any) {
    console.error(e)
    response.error = 'error logging in'

    if (e?.response?.status === 404) {
      response.error = 'user account not found'
    }
  }

  return response
}

const signUp = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `${API_URL}/tenant/signup`,
    })

    if (status !== 201 && status !== 200) {
      throw 'invalid status code'
    }

    if (data) {
      const identity = decodeBase64Json(data)
      setToLocalStorage(identity, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(identity)
      const { error } = await getSession()
      response.error = error
      response.data = 'Success'
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = 'error in verify mail'

    if (e?.response?.status === 404) {
      response.error = e.response.data
    }
  }

  return response
}

const verifyMailOTP = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `${API_URL}/tenant/validateOTP`,
    })

    if (status !== 201 && status !== 200) {
      throw 'invalid status code'
    }

    if (data === 'success') {
      response.data = 'Success'
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = 'error in verify mail'

    if (e?.response?.status === 404) {
      response.error = e.response.data
    }
  }

  return response
}

const sendMailOTP = async (payload: any) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      method: 'POST',
      url: `${API_URL}/tenant/checkAuthenticate`,
    })

    if (status !== 201 && status !== 200 && status !== 400) {
      throw 'invalid status code'
    }

    if (data === 'OTP sent succeeded' || data === 'success') {
      response.data = 'success'
    } else {
      response.error = 'error in verify mail'
    }
  } catch (e: any) {
    console.error(e)
    response.error = e?.response?.data || 'error in verify mail'
  }

  return response
}

const externalLogin = async (
  tenantId: number | string,
  userId: number | string,
) => {
  const response: any = {
    data: '',
    error: '',
  }

  try {
    const { data, status } = await _axios({
      method: 'GET',
      url: `${API_URL}/authentication/loginById/${tenantId}/WEB/${userId}`,
    })

    if (status !== 200) {
      throw 'invalid status code'
    }

    const identity = decodeBase64Json(data)
    setToLocalStorage(identity, 'identity')
    const { setIdentity } = authUserStore.getState()
    setIdentity(identity)
    response.data = 'Success'

    const { error } = await getSession()
    response.error = error
  } catch (e) {
    console.error(e)
    response.error = 'error in external login'
  }

  return response
}

const auth0Login = async (payload: any, tenantId: number | string) => {
  const response: any = {
    error: '',
    payload: '',
  }

  try {
    const { data, status } = await _axios({
      data: JSON.stringify(payload),
      headers: {
        Token: `tenantId ${tenantId}`,
      },
      method: 'POST',
      url: `${API_URL}/authentication/loginAuthO`,
    })

    if (status === 200) {
      const identity = decodeBase64Json(data)
      setToLocalStorage(identity, 'identity')
      const { setIdentity } = authUserStore.getState()
      setIdentity(identity)
      response.data = 'Success'

      const { error } = await getSession()
      response.error = error
    } else if (status !== 201) {
      throw 'invalid status code'
    }
  } catch (e: any) {
    console.error(e)
    response.error = 'error logging in'

    if (e?.response?.status === 404) {
      response.error = e.response.data
    }
  }

  return response
}

export const authApi = {
  auth0Login,
  authentication,
  emailValidate,
  externalLogin,
  login,
  portalLogin,
  sendMailOTP,
  signUp,
  socialLogin,
  testDBConnection,
  updateDBConnection,
  validatePassword,
  verifyMailOTP,
  getSession,
}

export default authApi
