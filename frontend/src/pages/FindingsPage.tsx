import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFinding, deleteFinding, fetchFindings, updateFinding } from '../api/findings'
import { getAxiosMessage } from '../api/client'
import { FindingFormDialog } from '../components/findings/FindingFormDialog'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState, ErrorAlert, LoadingState } from '../components/common/Feedback'
import { useRbac } from '../hooks/useRbac'
import type { Finding, FindingCategory } from '../types/domain'

const ROWS = 10
const categories: FindingCategory[] = ['BLADE_DAMAGE', 'LIGHTNING', 'EROSION', 'UNKNOWN']

export function FindingsPage(): React.ReactElement {
  const qc = useQueryClient()
  const { canWrite, canAdmin } = useRbac()
  const [page, setPage] = useState(0)
  const [inspectionId, setInspectionId] = useState('')
  const [category, setCategory] = useState<FindingCategory | ''>('')
  const [severity, setSeverity] = useState('')
  const [notesContains, setNotesContains] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRow, setEditRow] = useState<Finding | null>(null)
  const [deleteRow, setDeleteRow] = useState<Finding | null>(null)

  const listQ = useQuery({
    queryKey: ['findings', page + 1, ROWS, inspectionId, category, severity, notesContains],
    queryFn: () =>
      fetchFindings({
        page: page + 1,
        limit: ROWS,
        ...(inspectionId.trim() ? { inspection_id: inspectionId.trim() } : {}),
        ...(category ? { category } : {}),
        ...(severity ? { severity: Number(severity) } : {}),
        ...(notesContains.trim() ? { notes_contains: notesContains.trim() } : {}),
      }),
  })

  const createMut = useMutation({
    mutationFn: createFinding,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['findings'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateFinding>[1] }) => updateFinding(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['findings'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFinding(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['findings'] }),
  })

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Findings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cross-inspection view with filters. Link opens parent inspection.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" alignItems={{ md: 'center' }}>
        <TextField
          size="small"
          label="Inspection ID"
          value={inspectionId}
          onChange={(e) => { setInspectionId(e.target.value); setPage(0) }}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Category</InputLabel>
          <Select
            label="Category"
            value={category}
            onChange={(e) => { setCategory(e.target.value as FindingCategory | ''); setPage(0) }}
          >
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Severity"
          type="number"
          value={severity}
          onChange={(e) => { setSeverity(e.target.value); setPage(0) }}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          label="Notes contains"
          value={notesContains}
          onChange={(e) => { setNotesContains(e.target.value); setPage(0) }}
          sx={{ minWidth: 200 }}
        />
        {canWrite ? (
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              setEditRow(null)
              setDialogOpen(true)
            }}
          >
            New finding
          </Button>
        ) : null}
      </Stack>

      {listQ.isLoading ? <LoadingState /> : null}
      {listQ.isError ? <ErrorAlert message={getAxiosMessage(listQ.error)} /> : null}

      {!listQ.isLoading && listQ.data?.items.length === 0 ? (
        <EmptyState title="No findings" description="Relax filters or log a finding against an inspection." />
      ) : null}

      {listQ.data && listQ.data.items.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Inspection</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listQ.data.items.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell>
                    <Button component={RouterLink} size="small" to={`/inspections/${f.inspectionId}`}>
                      {f.inspectionId.slice(0, 8)}…
                    </Button>
                  </TableCell>
                  <TableCell>{f.category}</TableCell>
                  <TableCell>{f.severity}</TableCell>
                  <TableCell align="right">{f.estimatedCost}</TableCell>
                  <TableCell>{f.notes ?? '—'}</TableCell>
                  <TableCell align="right">
                    {canWrite ? (
                      <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditRow(f); setDialogOpen(true) }}>
                        Edit
                      </Button>
                    ) : null}
                    {canAdmin ? (
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteRow(f)}>
                        Delete
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={listQ.data.totalCount}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={ROWS}
            rowsPerPageOptions={[ROWS]}
          />
        </TableContainer>
      ) : null}

      <FindingFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRow(null) }}
        lockedInspectionId={undefined}
        initial={editRow}
        onSubmitCreate={async (body) => {
          try {
            await createMut.mutateAsync(body)
          } catch (e) {
            throw new Error(getAxiosMessage(e))
          }
        }}
        onSubmitUpdate={
          editRow
            ? async (fid, body) => {
                try {
                  await updateMut.mutateAsync({ id: fid, body })
                } catch (e) {
                  throw new Error(getAxiosMessage(e))
                }
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete finding?"
        loading={deleteMut.isPending}
        onClose={() => setDeleteRow(null)}
        onConfirm={async () => {
          if (!deleteRow) return
          try {
            await deleteMut.mutateAsync(deleteRow.id)
            setDeleteRow(null)
          } catch {
            /* noop */
          }
        }}
      />
    </Box>
  )
}
