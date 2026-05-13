export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}

export function logout() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}

export function saveToken(token: string) {
  localStorage.setItem('token', token)
}

export interface JWTUser {
  user_id: string
  tenant_id: string
  email: string
  nombre: string
  rol: string
}

export function getUser(): JWTUser | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      email: payload.email,
      nombre: payload.nombre ?? payload.email,
      rol: payload.rol ?? 'operador',
    }
  } catch {
    return null
  }
}
