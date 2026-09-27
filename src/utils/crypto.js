/**
 * Crypto utilities for encrypting/decrypting localStorage data
 * Uses Web Crypto API with AES-GCM encryption
 */

// Encryption key derived from a secret (in production, this should be more secure)
const SECRET_PHRASE = 'nest-property-management-2026'

/**
 * Derive an encryption key from a password/phrase
 */
async function deriveKey(password) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  // Use a fixed salt for consistent key derivation
  const salt = encoder.encode('nest-salt-v1')
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data for localStorage storage
 * @param {any} data - Data to encrypt (will be JSON stringified)
 * @returns {string} - Base64 encoded encrypted data
 */
export async function encryptData(data) {
  try {
    const key = await deriveKey(SECRET_PHRASE)
    const encoder = new TextEncoder()
    const plaintext = encoder.encode(JSON.stringify(data))
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    )
    
    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)
    
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Encryption failed:', error)
    // Fallback to base64 encoding if crypto fails
    return btoa(JSON.stringify(data))
  }
}

/**
 * Decrypt data from localStorage
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @returns {any} - Decrypted and parsed data
 */
export async function decryptData(encryptedData) {
  try {
    const key = await deriveKey(SECRET_PHRASE)
    
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(plaintext))
  } catch (error) {
    console.error('Decryption failed:', error)
    // Try fallback base64 decoding
    try {
      return JSON.parse(atob(encryptedData))
    } catch {
      return null
    }
  }
}

/**
 * Secure storage wrapper that encrypts data before storing
 */
export const secureStorage = {
  async setItem(key, value) {
    try {
      const encrypted = await encryptData(value)
      localStorage.setItem(key, encrypted)
    } catch (error) {
      console.error('secureStorage.setItem failed:', error)
    }
  },
  
  async getItem(key) {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      return await decryptData(encrypted)
    } catch (error) {
      console.error('secureStorage.getItem failed:', error)
      return null
    }
  },
  
  removeItem(key) {
    localStorage.removeItem(key)
  },
  
  clear() {
    localStorage.clear()
  }
}

/**
 * Simple hash function for non-sensitive data
 */
export function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}
