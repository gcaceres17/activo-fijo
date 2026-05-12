'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { api } from '@/lib/api'
import { saveToken } from '@/lib/auth'

const FONT = 'var(--clt-font-display)'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('giovanni.caceres@clt.com.py')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post<{ access_token: string }>('/v1/auth/login', { email, password })
      saveToken(res.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1520', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(104,116,181,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,190,218,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, margin: '0 16px' }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Image src="/assets/logo_clt_on_dark.png" alt="CLT S.A." width={120} height={30} style={{ objectFit: 'contain', height: 'auto' }} priority />
            <div>
              <p style={{ fontFamily: FONT, fontWeight: 500, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>Plataforma CLT</p>
              <h1 style={{ fontFamily: FONT, fontWeight: 900, fontSize: 22, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>Activo Fijo</h1>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', padding: 32 }}>
          <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '0 0 24px' }}>
            Iniciar sesión
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="usuario@clt.com.py" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#6874B5'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div>
              <label style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Contraseña</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--clt-font-body)', fontSize: 13, padding: '10px 12px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#6874B5'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', padding: '8px 12px' }}>
                <p style={{ fontFamily: 'var(--clt-font-body)', fontSize: 12, color: '#F87171', margin: 0 }}>{error}</p>
              </div>
            )}
            <button
              type="submit" disabled={loading}
              style={{ background: 'linear-gradient(135deg,#6874B5 0%,#65A0D3 50%,#6CBEDA 100%)', border: 'none', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'var(--clt-font-body)', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>
          Activo Fijo v1.0 · CLT S.A. © 2026
        </p>
      </div>
    </div>
  )
}
