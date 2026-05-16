import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import type { DataSource, Inspection, Turbine } from '../../types/domain'

type Props = {
  open: boolean
  onClose: () => void
  turbines: Turbine[]
  initial?: Inspection | null
  onSubmitCreate: (values: {
    turbine_id: string
    date: string
    data_source: DataSource
    inspector_name?: string | null
    raw_package_url?: string | null
  }) => Promise<void>
  onSubmitUpdate?: (
    id: string,
    values: Partial<{
      turbine_id: string
      date: string
      data_source: DataSource
      inspector_name: string | null
      raw_package_url: string | null
    }>,
  ) => Promise<void>
}

export function InspectionFormDialog({ open, onClose, turbines, initial, onSubmitCreate, onSubmitUpdate }: Props): React.ReactElement {
  const [turbineId, setTurbineId] = useState('')
  const [date, setDate] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('DRONE')
  const [inspectorName, setInspectorName] = useState('')
  const [rawUrl, setRawUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setTurbineId(initial?.turbineId ?? '')
    if (initial?.date) {
      const d = new Date(initial.date)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setDate(local)
    } else {
      setDate('')
    }
    setDataSource(initial?.dataSource ?? 'DRONE')
    setInspectorName(initial?.inspectorName ?? '')
    setRawUrl(initial?.rawPackageUrl ?? '')
  }, [open, initial])

  const handleSave = async () => {
    setError(null)
    if (!turbineId) {
      setError('Turbine is required')
      return
    }
    if (!date) {
      setError('Date is required')
      return
    }
    const iso = new Date(date).toISOString()
    setLoading(true)
    try {
      if (initial && onSubmitUpdate) {
        await onSubmitUpdate(initial.id, {
          turbine_id: turbineId,
          date: iso,
          data_source: dataSource,
          inspector_name: inspectorName.trim() || null,
          raw_package_url: rawUrl.trim() || null,
        })
      } else {
        await onSubmitCreate({
          turbine_id: turbineId,
          date: iso,
          data_source: dataSource,
          inspector_name: inspectorName.trim() || null,
          raw_package_url: rawUrl.trim() || null,
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit inspection' : 'New inspection'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <TextField error label="Message" value={error} fullWidth InputProps={{ readOnly: true }} /> : null}
          <TextField
            select
            label="Turbine"
            fullWidth
            required
            value={turbineId}
            onChange={(e) => setTurbineId(e.target.value)}
            disabled={Boolean(initial)}
          >
            {turbines.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date / time"
            type="datetime-local"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField select label="Data source" fullWidth value={dataSource} onChange={(e) => setDataSource(e.target.value as DataSource)}>
            <MenuItem value="DRONE">DRONE</MenuItem>
            <MenuItem value="MANUAL">MANUAL</MenuItem>
          </TextField>
          <TextField label="Inspector name" fullWidth value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} />
          <TextField label="Raw package URL" fullWidth value={rawUrl} onChange={(e) => setRawUrl(e.target.value)} />
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
