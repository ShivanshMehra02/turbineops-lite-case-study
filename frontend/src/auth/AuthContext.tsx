import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { configureApiClient } from '../api/client'
import { loginRequest } from '../api/auth'
import type { AuthUser } from '../types/domain'

const TOKEN_KEY = 'turbineops_access_token'
const USER_KEY = 'turbineops_user'

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthUser
    } catch {
      return null
    }
  })

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    configureApiClient({
      getToken: () => token,
      onUnauthorized: logout,
    })
  }, [token, logout])

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password)
    sessionStorage.setItem(TOKEN_KEY, res.accessToken)
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setToken(res.accessToken)
    setUser(res.user)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [token, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
