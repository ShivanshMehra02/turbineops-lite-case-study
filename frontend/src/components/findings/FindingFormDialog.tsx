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
import type { Finding, FindingCategory } from '../../types/domain'

const categories: FindingCategory[] = ['BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN']

type Props = {
  open: boolean
  onClose: () => void
  lockedInspectionId?: string
  initial?: Finding | null
  onSubmitCreate: (values: {
    inspection_id: string
    category: FindingCategory
    severity: number
    estimated_cost: number
    notes?: string | null
  }) => Promise<void>
  onSubmitUpdate?: (
    id: string,
    values: Partial<{
      category: FindingCategory
      severity: number
      estimated_cost: number
      notes: string | null
    }>,
  ) => Promise<void>
}

export function FindingFormDialog({
  open,
  onClose,
  lockedInspectionId,
  initial,
  onSubmitCreate,
  onSubmitUpdate,
}: Props): React.ReactElement {
  const [inspectionId, setInspectionId] = useState('')
  const [category, setCategory] = useState<FindingCategory>('UNKNOWN')
  const [severity, setSeverity] = useState('2')
  const [estimatedCost, setEstimatedCost] = useState('0')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setInspectionId(lockedInspectionId ?? initial?.inspectionId ?? '')
    setCategory(initial?.category ?? 'UNKNOWN')
    setSeverity(initial ? String(initial.severity) : '2')
    setEstimatedCost(initial ? String(initial.estimatedCost) : '0')
    setNotes(initial?.notes ?? '')
  }, [open, initial, lockedInspectionId])

  const handleSave = async () => {
    setError(null)
    const ins = lockedInspectionId ?? inspectionId.trim()
    if (!ins) {
      setError('Inspection id is required')
      return
    }
    const sev = Number(severity)
    const cost = Number(estimatedCost)
    if (!Number.isFinite(sev) || sev < 1 || sev > 5) {
      setError('Severity must be 1–5')
      return
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError('Estimated cost must be ≥ 0')
      return
    }
    setLoading(true)
    try {
      if (initial && onSubmitUpdate) {
        await onSubmitUpdate(initial.id, {
          category,
          severity: sev,
          estimated_cost: cost,
          notes: notes.trim() || null,
        })
      } else {
        await onSubmitCreate({
          inspection_id: ins,
          category,
          severity: sev,
          estimated_cost: cost,
          notes: notes.trim() || null,
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
      <DialogTitle>{initial ? 'Edit finding' : 'New finding'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <TextField error label="Message" value={error} fullWidth InputProps={{ readOnly: true }} /> : null}
          {!lockedInspectionId ? (
            <TextField
              label="Inspection ID"
              fullWidth
              required
              value={inspectionId}
              onChange={(e) => setInspectionId(e.target.value)}
              disabled={Boolean(initial)}
            />
          ) : null}
          <TextField select label="Category" fullWidth value={category} onChange={(e) => setCategory(e.target.value as FindingCategory)}>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Severity (1–5)" fullWidth value={severity} onChange={(e) => setSeverity(e.target.value)} />
          <TextField label="Estimated cost" fullWidth value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
          <TextField label="Notes" fullWidth multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
