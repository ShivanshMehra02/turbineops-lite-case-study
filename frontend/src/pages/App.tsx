import React, { useCallback, useEffect, useState } from 'react'

type Turbine = {
  id: string
  name: string
  manufacturer?: string | null
  mwRating?: number | null
  lat?: number | null
  lng?: number | null
}

type TurbineListResponse = {
  items: Turbine[]
  totalCount: number
  page: number
  limit: number
}

type AuthUser = { id: string; email: string; name: string; role: 'ADMIN' | 'ENGINEER' | 'VIEWER' }

const TOKEN_KEY = 'turbineops_access_token'
const USER_KEY = 'turbineops_user'

export const App: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_BASE as string
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  })
  const [email, setEmail] = useState('viewer@example.com')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [list, setList] = useState<TurbineListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [nameFilter, setNameFilter] = useState('')
  const [appliedFilter, setAppliedFilter] = useState('')
  const limit = 10
  const [name, setName] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)
  const [sseLines, setSseLines] = useState<string[]>([])

  const authHeaders = useCallback(
    (base?: HeadersInit): HeadersInit => ({
      ...Object.fromEntries(new Headers(base ?? {})),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token],
  )

  useEffect(() => {
    if (!token || !apiBase) return
    const url = `${apiBase}/api/events?access_token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    const onGenerated = (ev: MessageEvent<string>) => {
      try {
        const d = JSON.parse(ev.data) as Record<string, unknown>
        const line = `[repair_plan_generated] inspection=${String(d.inspectionId ?? '')} plan=${String(d.repairPlanId ?? '')} ${String(d.priority ?? '')}`
        setSseLines((prev) => [line, ...prev].slice(0, 20))
      } catch {
        setSseLines((prev) => [ev.data, ...prev].slice(0, 20))
      }
    }
    es.addEventListener('repair_plan_generated', onGenerated as EventListener)
    return () => {
      es.removeEventListener('repair_plan_generated', onGenerated as EventListener)
      es.close()
    }
  }, [token, apiBase])

  const loadTurbines = useCallback(async () => {
    if (!token) return
    setApiError(null)
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (appliedFilter.trim()) qs.set('name', appliedFilter.trim())
    const r = await fetch(`${apiBase}/api/turbines?${qs.toString()}`, { headers: authHeaders() })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      setList(null)
      setApiError((data as { error?: string }).error ?? r.statusText)
      return
    }
    setList(data as TurbineListResponse)
  }, [apiBase, appliedFilter, authHeaders, limit, page, token])

  useEffect(() => {
    if (!token) {
      setList(null)
      return
    }
    void loadTurbines()
  }, [loadTurbines, token])

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
    const u = (data as { user?: AuthUser }).user
    if (!accessToken || !u) {
      setLoginError('No token/user in response')
      return
    }
    sessionStorage.setItem(TOKEN_KEY, accessToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(accessToken)
    setUser(u)
    setPage(1)
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken('')
    setUser(null)
  }

  const create = async () => {
    if (!name || !token || user?.role === 'VIEWER') return
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
    setName('')
    setPage(1)
    await loadTurbines()
  }

  const remove = async (id: string) => {
    if (!token || user?.role !== 'ADMIN') return
    setApiError(null)
    const r = await fetch(`${apiBase}/api/turbines/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!r.ok && r.status !== 204) {
      const data = await r.json().catch(() => ({}))
      setApiError((data as { error?: string }).error ?? 'Delete failed')
      return
    }
    await loadTurbines()
  }

  const applyFilter = () => {
    setAppliedFilter(nameFilter)
    setPage(1)
  }

  const totalPages = list ? Math.max(1, Math.ceil(list.totalCount / list.limit)) : 1

  if (!token || !user) {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 420 }}>
        <h1>TurbineOps Lite</h1>
        <p>Sign in to access turbines (viewer read-only; engineer/admin can create; admin can delete).</p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>TurbineOps Lite</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#444' }}>
            Signed in as {user.email} ({user.role})
          </p>
        </div>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Filter name contains…"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button type="button" onClick={applyFilter}>
          Apply filter
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
        <span style={{ fontSize: 13, color: '#444' }}>
          Page {page} / {totalPages}
          {list ? ` · ${list.totalCount} total` : null}
        </span>
      </div>

      {apiError ? <p style={{ color: 'crimson' }}>{apiError}</p> : null}

      <section style={{ marginTop: 20, padding: 12, background: '#f7f7fb', borderRadius: 8, maxWidth: 720 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>Realtime · repair plans (SSE)</h2>
        <p style={{ marginTop: 0, fontSize: 13, color: '#444' }}>
          Subscribes to <code>/api/events</code> with your token (query param required for browser EventSource).
          When an engineer generates a plan, you should see a <code>repair_plan_generated</code> event.
        </p>
        {sseLines.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666' }}>No events yet.</p>
        ) : (
          <ul style={{ fontSize: 12, fontFamily: 'monospace', margin: 0, paddingLeft: 18 }}>
            {sseLines.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      {user.role !== 'VIEWER' ? (
        <div style={{ marginTop: 16 }}>
          <input placeholder="New turbine name" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" onClick={() => void create()} style={{ marginLeft: 8 }}>
            Create
          </button>
        </div>
      ) : (
        <p style={{ marginTop: 16, fontSize: 13, color: '#444' }}>Viewer role: read-only.</p>
      )}

      <ul style={{ marginTop: 16 }}>
        {(list?.items ?? []).map((t) => (
          <li key={t.id} style={{ marginBottom: 8 }}>
            <strong>{t.name}</strong>
            {user.role === 'ADMIN' ? (
              <button type="button" style={{ marginLeft: 12 }} onClick={() => void remove(t.id)}>
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
