import React, { useState } from 'react'
import {
  Box,
  Button,
  Paper,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTurbine, deleteTurbine, fetchTurbines, updateTurbine } from '../api/turbines'
import { getAxiosMessage } from '../api/client'
import { TurbineFormDialog } from '../components/turbines/TurbineFormDialog'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState, ErrorAlert, LoadingState } from '../components/common/Feedback'
import { useRbac } from '../hooks/useRbac'
import type { Turbine } from '../types/domain'

const ROWS = 10

export function TurbinesPage(): React.ReactElement {
  const qc = useQueryClient()
  const { canWrite, canAdmin } = useRbac()
  const [page, setPage] = useState(0)
  const [nameFilter, setNameFilter] = useState('')
  const [appliedName, setAppliedName] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRow, setEditRow] = useState<Turbine | null>(null)
  const [deleteRow, setDeleteRow] = useState<Turbine | null>(null)

  const query = useQuery({
    queryKey: ['turbines', page + 1, appliedName, ROWS],
    queryFn: () =>
      fetchTurbines({
        page: page + 1,
        limit: ROWS,
        ...(appliedName.trim() ? { name: appliedName.trim() } : {}),
      }),
  })

  const saveMutation = useMutation({
    mutationFn: async (v: { mode: 'create' | 'edit'; values: Parameters<typeof createTurbine>[0]; id?: string }) => {
      if (v.mode === 'create') return createTurbine(v.values)
      return updateTurbine(v.id!, v.values)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['turbines'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTurbine(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['turbines'] }),
  })

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Turbines
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage turbine registry. Viewer: read-only.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          label="Search name contains"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <Button variant="outlined" onClick={() => { setAppliedName(nameFilter); setPage(0) }}>
          Apply filter
        </Button>
        {canWrite ? (
          <Button startIcon={<AddIcon />} onClick={() => { setEditRow(null); setDialogOpen(true) }}>
            New turbine
          </Button>
        ) : null}
      </Stack>

      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorAlert message={getAxiosMessage(query.error)} /> : null}

      {!query.isLoading && query.data?.items.length === 0 ? (
        <EmptyState title="No turbines" description="Adjust filters or create a turbine (engineer+)." />
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell align="right">MW</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.manufacturer ?? '—'}</TableCell>
                  <TableCell align="right">{t.mwRating ?? '—'}</TableCell>
                  <TableCell align="right">
                    {canWrite ? (
                      <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditRow(t); setDialogOpen(true) }}>
                        Edit
                      </Button>
                    ) : null}
                    {canAdmin ? (
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteRow(t)}>
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
            count={query.data.totalCount}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={ROWS}
            rowsPerPageOptions={[ROWS]}
          />
        </TableContainer>
      ) : null}

      <TurbineFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRow(null) }}
        initial={editRow}
        onSubmit={async (values) => {
          try {
            if (editRow) {
              await saveMutation.mutateAsync({ mode: 'edit', id: editRow.id, values })
            } else {
              await saveMutation.mutateAsync({ mode: 'create', values })
            }
          } catch (e) {
            throw new Error(getAxiosMessage(e))
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete turbine?"
        description={deleteRow ? `Remove ${deleteRow.name}? Inspections may block deletion.` : undefined}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteRow(null)}
        onConfirm={async () => {
          if (!deleteRow) return
          try {
            await deleteMutation.mutateAsync(deleteRow.id)
            setDeleteRow(null)
          } catch {
            /* surfaced via query refresh */
          }
        }}
      />
    </Box>
  )
}
