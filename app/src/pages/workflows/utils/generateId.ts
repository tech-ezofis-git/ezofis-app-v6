import { customAlphabet } from 'nanoid'

// Generates a 21-character alphanumeric ID (without special characters like - or _)
export const generateId = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  21,
)
