/* eslint-disable prettier/prettier */
const base64ToBytes = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

const bytesToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
const importKey = async (base64Key: string): Promise<CryptoKey> => {
  return window.crypto.subtle.importKey(
    'raw',
    base64ToBytes(base64Key),
    { name: 'AES-CBC' },
    false, // extractable: false means the key cannot be exported again for security
    ['encrypt', 'decrypt'],
  )
}
export const encrypt = async (
  data: string,
  key: string,
  iv: string,
): Promise<string> => {
  try {
    const cryptoKey = await importKey(key)
    const encodedData = new TextEncoder().encode(data)

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        iv: base64ToBytes(iv),
        name: 'AES-CBC',
      },
      cryptoKey,
      encodedData,
    )

    return bytesToBase64(encryptedBuffer)
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Encryption failed:', error)
    throw new Error('Encryption failed')
  }
}
export const decrypt = async (
  data: string,
  key: string,
  iv: string,
): Promise<string> => {
  try {
    const cryptoKey = await importKey(key)

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        iv: base64ToBytes(iv),
        name: 'AES-CBC',
      },
      cryptoKey,
      base64ToBytes(data),
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Decryption failed:', error)
    throw new Error('Decryption failed')
  }
}
export const cryptoSanityTest = async <T = unknown>(
  data: T,
  key: string,
  iv: string,
  type: 'OBJECT' | 'STRING' = 'OBJECT',
): Promise<T | string> => {
  const _data = type === 'OBJECT' ? JSON.stringify(data) : (data as string)

  // 1. Encrypt
  const encrypted = await encrypt(_data, key, iv)

  // 2. Decrypt
  const decrypted = await decrypt(encrypted, key, iv)

  // 3. Parse and Return
  if (type === 'OBJECT') {
    return JSON.parse(decrypted) as T
  }
  return decrypted
}
