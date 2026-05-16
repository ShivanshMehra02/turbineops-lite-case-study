import React, { useMemo, useState } from 'react'
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
  Typography,
  useTheme,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInspection,
  deleteInspection,
  fetchInspections,
  updateInspection,
} from '../api/inspections'
import { fetchTurbines } from '../api/turbines'
import { getAxiosMessage } from '../api/client'
import { InspectionFormDialog } from '../components/inspections/InspectionFormDialog'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState, ErrorAlert, LoadingState } from '../components/common/Feedback'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import type { Dayjs } from 'dayjs'
import { useRbac } from '../hooks/useRbac'
import type { DataSource, Inspection } from '../types/domain'

const ROWS = 10

export function InspectionsPage(): React.ReactElement {
  const qc = useQueryClient()
  const theme = useTheme()
  const { canWrite, canAdmin } = useRbac()
  const [page, setPage] = useState(0)
  const [turbineId, setTurbineId] = useState('')
  const [from, setFrom] = useState<Dayjs | null>(null)
  const [to, setTo] = useState<Dayjs | null>(null)
  const [dataSource, setDataSource] = useState<DataSource | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRow, setEditRow] = useState<Inspection | null>(null)
  const [deleteRow, setDeleteRow] = useState<Inspection | null>(null)

  const turbinesQ = useQuery({
    queryKey: ['turbines', 'dropdown'],
    queryFn: () => fetchTurbines({ page: 1, limit: 100 }),
  })

  const listQ = useQuery({
    queryKey: ['inspections', page + 1, ROWS, turbineId, from?.valueOf() ?? null, to?.valueOf() ?? null, dataSource],
    queryFn: () =>
      fetchInspections({
        page: page + 1,
        limit: ROWS,
        ...(turbineId ? { turbine_id: turbineId } : {}),
        ...(from ? { from: from.toDate().toISOString() } : {}),
        ...(to ? { to: to.toDate().toISOString() } : {}),
        ...(dataSource ? { data_source: dataSource } : {}),
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInspection(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspections'] }),
  })

  const createMutation = useMutation({
    mutationFn: createInspection,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspections'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateInspection>[1] }) =>
      updateInspection(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspections'] }),
  })

  const dateTimePickersSlotProps = useMemo(
    () => ({
      textField: {
        size: 'small' as const,
        sx: {
          width: '100%',
          minWidth: { xs: undefined, md: 272 },
          maxWidth: { xs: '100%', md: 320 },
        },
      },
      popper: {
        placement: 'bottom-start' as const,
        sx: {
          zIndex: theme.zIndex.modal,
        },
      },
    }),
    [theme.zIndex.modal],
  )

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Inspections
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Filter by turbine, instant range, or data source. Open detail for findings & repair plans.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        sx={{
          mb: 2,
          alignItems: 'flex-start',
          flexWrap: { md: 'wrap' },
          position: 'relative',
          isolation: 'isolate',
          overflow: 'visible',
        }}
      >
        <FormControl size="small" sx={{ width: '100%', minWidth: { md: 200 }, maxWidth: { md: 280 }, flexShrink: 0 }}>
          <InputLabel>Turbine</InputLabel>
          <Select
            label="Turbine"
            value={turbineId}
            onChange={(e) => { setTurbineId(e.target.value as string); setPage(0) }}
            MenuProps={{ disableScrollLock: true }}
          >
            <MenuItem value="">All</MenuItem>
            {(turbinesQ.data?.items ?? []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ width: '100%', minWidth: { md: 272 }, maxWidth: { md: 320 }, flexShrink: 0, overflow: 'visible' }}>
          <DateTimePicker
            label="From"
            value={from}
            onChange={(v) => {
              setFrom(v)
              setPage(0)
            }}
            format="MMM D, YYYY h:mm A"
            slotProps={dateTimePickersSlotProps}
          />
        </Box>
        <Box sx={{ width: '100%', minWidth: { md: 272 }, maxWidth: { md: 320 }, flexShrink: 0, overflow: 'visible' }}>
          <DateTimePicker
            label="To"
            value={to}
            onChange={(v) => {
              setTo(v)
              setPage(0)
            }}
            format="MMM D, YYYY h:mm A"
            slotProps={dateTimePickersSlotProps}
          />
        </Box>
        <FormControl size="small" sx={{ width: '100%', minWidth: { md: 160 }, maxWidth: { md: 220 }, flexShrink: 0 }}>
          <InputLabel>Data source</InputLabel>
          <Select
            label="Data source"
            value={dataSource}
            onChange={(e) => { setDataSource(e.target.value as DataSource | ''); setPage(0) }}
            MenuProps={{ disableScrollLock: true }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DRONE">DRONE</MenuItem>
            <MenuItem value="MANUAL">MANUAL</MenuItem>
          </Select>
        </FormControl>
        {canWrite ? (
          <Button
            startIcon={<AddIcon />}
            onClick={() => {
              setEditRow(null)
              setDialogOpen(true)
            }}
            sx={{ flexShrink: 0 }}
          >
            New inspection
          </Button>
        ) : null}
      </Stack>

      {listQ.isLoading ? <LoadingState /> : null}
      {listQ.isError ? <ErrorAlert message={getAxiosMessage(listQ.error)} /> : null}

      {!listQ.isLoading && listQ.data?.items.length === 0 ? (
        <EmptyState title="No inspections" description="Relax filters or record a new inspection." />
      ) : null}

      {listQ.data && listQ.data.items.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Turbine</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Day (UTC)</TableCell>
                <TableCell>Source</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listQ.data.items.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.turbine?.name ?? row.turbineId}</TableCell>
                  <TableCell>{new Date(row.date).toLocaleString()}</TableCell>
                  <TableCell>{row.inspectionDay}</TableCell>
                  <TableCell>{row.dataSource}</TableCell>
                  <TableCell align="right">
                    <Button size="small" component={RouterLink} to={`/inspections/${row.id}`} startIcon={<VisibilityIcon />}>
                      Detail
                    </Button>
                    {canWrite ? (
                      <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditRow(row); setDialogOpen(true) }}>
                        Edit
                      </Button>
                    ) : null}
                    {canAdmin ? (
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteRow(row)}>
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

      <InspectionFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRow(null) }}
        turbines={turbinesQ.data?.items ?? []}
        initial={editRow}
        onSubmitCreate={async (body) => {
          try {
            await createMutation.mutateAsync(body)
          } catch (e) {
            throw new Error(getAxiosMessage(e))
          }
        }}
        onSubmitUpdate={
          editRow
            ? async (id, body) => {
                try {
                  await updateMutation.mutateAsync({ id, body })
                } catch (e) {
                  throw new Error(getAxiosMessage(e))
                }
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="Delete inspection?"
        description={deleteRow ? `Permanently remove inspection ${deleteRow.id}?` : undefined}
        loading={deleteMutation.isPending}
        onClose={() => setDeleteRow(null)}
        onConfirm={async () => {
          if (!deleteRow) return
          try {
            await deleteMutation.mutateAsync(deleteRow.id)
            setDeleteRow(null)
          } catch {
            /* noop */
          }
        }}
      />
    </Box>
  )
}
