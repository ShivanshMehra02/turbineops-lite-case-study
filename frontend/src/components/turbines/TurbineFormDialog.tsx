import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
} from '@mui/material'
import type { Turbine } from '../../types/domain'

type Props = {
  open: boolean
  onClose: () => void
  initial?: Turbine | null
  onSubmit: (values: {
    name: string
    manufacturer?: string | null
    mwRating?: number | null
    lat?: number | null
    lng?: number | null
  }) => Promise<void>
}

export function TurbineFormDialog({ open, onClose, initial, onSubmit }: Props): React.ReactElement {
  const [name, setName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [mwRating, setMwRating] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(initial?.name ?? '')
    setManufacturer(initial?.manufacturer ?? '')
    setMwRating(initial?.mwRating != null ? String(initial.mwRating) : '')
    setLat(initial?.lat != null ? String(initial.lat) : '')
    setLng(initial?.lng != null ? String(initial.lng) : '')
  }, [open, initial])

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        manufacturer: manufacturer.trim() || null,
        mwRating: mwRating === '' ? null : Number(mwRating),
        lat: lat === '' ? null : Number(lat),
        lng: lng === '' ? null : Number(lng),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit turbine' : 'New turbine'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? (
            <TextField error label="Error" value={error} fullWidth InputProps={{ readOnly: true }} />
          ) : null}
          <TextField label="Name" required fullWidth value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Manufacturer" fullWidth value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          <TextField label="MW rating" fullWidth value={mwRating} onChange={(e) => setMwRating(e.target.value)} />
          <TextField label="Latitude" fullWidth value={lat} onChange={(e) => setLat(e.target.value)} />
          <TextField label="Longitude" fullWidth value={lng} onChange={(e) => setLng(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
