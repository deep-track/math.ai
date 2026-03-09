type ManualUser = {
  sub?: string
  email?: string
  name?: string
}

const ACCESS_TOKEN_KEY = 'auth0_access_token'
const ID_TOKEN_KEY = 'auth0_id_token'
const USER_KEY = 'manual_auth_user'

function safeParseJwtPayload(token?: string): any | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function storeManualSession(accessToken: string, idToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (idToken) {
    localStorage.setItem(ID_TOKEN_KEY, idToken)
    const claims = safeParseJwtPayload(idToken)
    const user: ManualUser = {
      sub: claims?.sub,
      email: claims?.email,
      name: claims?.name,
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearManualSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(ID_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getManualAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getManualUser(): ManualUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function hasManualSession(): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (!token) return false
  const claims = safeParseJwtPayload(token)
  if (!claims?.exp) return true
  return Date.now() < claims.exp * 1000
}
