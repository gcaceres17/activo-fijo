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
