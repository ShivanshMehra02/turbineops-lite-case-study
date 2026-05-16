import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'

/** Must match `AuthContext` storage keys so we exercise real hydration behavior. */
const TOKEN_KEY = 'turbineops_access_token'
const USER_KEY = 'turbineops_user'

function Harness(): React.ReactElement {
  return (
    <AuthProvider>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/login" element={<div>Sign in</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/secret" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('sends unauthenticated visitors to the login route', () => {
    render(<Harness />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('renders nested routes when session already holds token and user', () => {
    sessionStorage.setItem(TOKEN_KEY, 'test-token')
    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: 'user-1',
        email: 'viewer@example.com',
        name: 'Viewer',
        role: 'VIEWER',
      }),
    )

    render(<Harness />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })
})
