import { unzlibSync, strFromU8 } from 'fflate'

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Backend sends the JWT deflated + base64url-encoded; plain JWTs are accepted as well. */
function toJwt(token) {
  if (token.split('.').length === 3) return token
  return strFromU8(unzlibSync(base64UrlToBytes(token)))
}

/**
 * Decodes the stored token's payload for UI decisions only; the backend verifies the signature.
 * @returns {Object|null}
 */
export function readTokenClaims(token = localStorage.getItem('token')) {
  if (!token) return null
  try {
    const payload = toJwt(token).split('.')[1]
    return JSON.parse(strFromU8(base64UrlToBytes(payload)))
  } catch {
    return null
  }
}
