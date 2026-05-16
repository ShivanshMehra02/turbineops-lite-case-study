import React, { useCallback, useEffect, useState } from 'react'

type Turbine = { id: string; name: string }

const TOKEN_KEY = 'turbineops_access_token'

export const App: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_BASE as string
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [email, setEmail] = useState('viewer@example.com')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [turbines, setTurbines] = useState<Turbine[]>([])
  const [name, setName] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

  const authHeaders = useCallback(
    (base?: HeadersInit): HeadersInit => ({
      ...Object.fromEntries(new Headers(base ?? {})),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  useEffect(() => {
    if (!token) {
      setTurbines([])
      return
    }
    setApiError(null)
    fetch(`${apiBase}/api/turbines`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error((j as { error?: string }).error ?? r.statusText)
        }
        return r.json()
      })
      .then(setTurbines)
      .catch((e: Error) => {
        setTurbines([])
        setApiError(e.message)
      })
  }, [apiBase, authHeaders, token])

  const login = async () => {
    setLoginError(null)
    const r = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      setLoginError((data as { error?: string }).error ?? 'Login failed')
      return
    }
    const accessToken = (data as { accessToken?: string }).accessToken
    if (!accessToken) {
      setLoginError('No token in response')
      return
    }
    sessionStorage.setItem(TOKEN_KEY, accessToken)
    setToken(accessToken)
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
  }

  const create = async () => {
    if (!name || !token) return
    setApiError(null)
    const r = await fetch(`${apiBase}/api/turbines`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      setApiError((data as { error?: string }).error ?? 'Create failed')
      return
    }
    const t = data as Turbine
    setTurbines((prev) => [t, ...prev])
    setName('')
  }

  if (!token) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 420 }}>
        <h1>TurbineOps Lite</h1>
        <p>Sign in to access the API (viewer = read-only; engineer/admin can create turbines).</p>
        {loginError ? <p style={{ color: 'crimson' }}>{loginError}</p> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          <button type="button" onClick={() => void login()}>
            Login
          </button>
        </div>
        <p style={{ marginTop: 16, fontSize: 13, color: '#444' }}>
          Seeded: viewer@example.com / viewer123 · eng@example.com / engineer123 · admin@example.com / admin123
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>TurbineOps Lite</h1>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
      <p>List/create turbines via REST (requires Bearer token — stored in session for this demo).</p>
      {apiError ? <p style={{ color: 'crimson' }}>{apiError}</p> : null}

      <div style={{ marginBottom: 16 }}>
        <input placeholder="New turbine name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="button" onClick={() => void create()} style={{ marginLeft: 8 }}>
          Create
        </button>
      </div>

      <ul>
        {turbines.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    </div>
  )
}
