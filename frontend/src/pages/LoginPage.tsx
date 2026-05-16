import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useAuthContext } from '../auth/AuthContext'
import { getAxiosMessage } from '../api/client'
import { useLocation, useNavigate } from 'react-router-dom'

export function LoginPage(): React.ReactElement {
  const { login, isAuthenticated } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/turbines'

  const [email, setEmail] = useState('viewer@example.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const submit = async () => {
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(getAxiosMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        TurbineOps Lite
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sign in with your assigned role. Engineers can create data; admins can delete protected resources.
      </Typography>
      <Card elevation={0} variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
            <Button fullWidth size="large" disabled={loading} onClick={() => void submit()}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Seeded accounts: viewer@example.com / viewer123 · eng@example.com / engineer123 · admin@example.com / admin123
        </Typography>
      </Box>
    </Container>
  )
}
