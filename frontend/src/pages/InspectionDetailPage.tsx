import React, { useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Breadcrumbs,
  Button,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import HandymanIcon from '@mui/icons-material/Handyman'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchInspection } from '../api/inspections'
import { createFinding, deleteFinding, updateFinding } from '../api/findings'
import { fetchRepairPlanByInspectionMaybe, generateRepairPlan } from '../api/repairPlans'
import { getAxiosMessage } from '../api/client'
import { FindingFormDialog } from '../components/findings/FindingFormDialog'
import { RepairPlanCard } from '../components/repairPlans/RepairPlanCard'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState, ErrorAlert, LoadingState } from '../components/common/Feedback'
import { useRbac } from '../hooks/useRbac'
import type { Finding } from '../types/domain'

export function InspectionDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { canWrite, canAdmin } = useRbac()
  const [findingDialog, setFindingDialog] = useState(false)
  const [editFinding, setEditFinding] = useState<Finding | null>(null)
  const [deleteFindingRow, setDeleteFindingRow] = useState<Finding | null>(null)

  const inspectionQ = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => fetchInspection(id!),
    enabled: Boolean(id),
  })

  const planQ = useQuery({
    queryKey: ['repairPlan', id],
    queryFn: () => fetchRepairPlanByInspectionMaybe(id!),
    enabled: Boolean(id),
  })

  const genMutation = useMutation({
    mutationFn: () => generateRepairPlan(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['repairPlan', id] })
      void qc.invalidateQueries({ queryKey: ['inspection', id] })
    },
  })

  const findingCreate = useMutation({
    mutationFn: createFinding,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspection', id] }),
  })

  const findingUpdate = useMutation({
    mutationFn: ({ fid, body }: { fid: string; body: Parameters<typeof updateFinding>[1] }) =>
      updateFinding(fid, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspection', id] }),
  })

  const findingDelete = useMutation({
    mutationFn: (fid: string) => deleteFinding(fid),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inspection', id] }),
  })

  if (!id) {
    return <Typography>Missing inspection id</Typography>
  }

  const findings = inspectionQ.data?.findings ?? []

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/inspections" underline="hover" color="inherit">
          Inspections
        </Link>
        <Typography color="text.primary">Detail</Typography>
      </Breadcrumbs>

      <Button component={RouterLink} to="/inspections" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to list
      </Button>

      {inspectionQ.isLoading ? <LoadingState /> : null}
      {inspectionQ.isError ? <ErrorAlert message={getAxiosMessage(inspectionQ.error)} /> : null}

      {inspectionQ.data ? (
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Inspection · {inspectionQ.data.turbine?.name ?? inspectionQ.data.turbineId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(inspectionQ.data.date).toLocaleString()} · Day {inspectionQ.data.inspectionDay} ·{' '}
              {inspectionQ.data.dataSource}
            </Typography>
            {inspectionQ.data.inspectorName ? (
              <Typography variant="body2">Inspector: {inspectionQ.data.inspectorName}</Typography>
            ) : null}
          </Paper>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <RepairPlanCard plan={planQ.data ?? null} liveHint />
              {planQ.isError ? <ErrorAlert message={getAxiosMessage(planQ.error)} /> : null}
            </Box>
            <Stack spacing={1} sx={{ minWidth: 200 }}>
              {canWrite ? (
                <Button
                  variant="contained"
                  startIcon={<HandymanIcon />}
                  disabled={genMutation.isPending}
                  onClick={() => void genMutation.mutateAsync()}
                >
                  {genMutation.isPending ? 'Generating…' : 'Generate repair plan'}
                </Button>
              ) : null}
              {genMutation.isError ? (
                <Typography variant="caption" color="error">
                  {getAxiosMessage(genMutation.error)}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Findings</Typography>
              {canWrite ? (
                <Button startIcon={<AddIcon />} onClick={() => { setEditFinding(null); setFindingDialog(true) }}>
                  Add finding
                </Button>
              ) : null}
            </Stack>

            {findings.length === 0 ? (
              <EmptyState title="No findings" description="Add findings before generating a meaningful repair plan." />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell align="right">Est. cost</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {findings.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>{f.category}</TableCell>
                        <TableCell>{f.severity}</TableCell>
                        <TableCell align="right">{f.estimatedCost}</TableCell>
                        <TableCell>{f.notes ?? '—'}</TableCell>
                        <TableCell align="right">
                          {canWrite ? (
                            <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditFinding(f); setFindingDialog(true) }}>
                              Edit
                            </Button>
                          ) : null}
                          {canAdmin ? (
                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteFindingRow(f)}>
                              Delete
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      ) : null}

      <FindingFormDialog
        open={findingDialog}
        onClose={() => { setFindingDialog(false); setEditFinding(null) }}
        lockedInspectionId={id}
        initial={editFinding}
        onSubmitCreate={async (body) => {
          try {
            await findingCreate.mutateAsync(body)
          } catch (e) {
            throw new Error(getAxiosMessage(e))
          }
        }}
        onSubmitUpdate={
          editFinding
            ? async (fid, body) => {
                try {
                  await findingUpdate.mutateAsync({ fid, body })
                } catch (e) {
                  throw new Error(getAxiosMessage(e))
                }
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(deleteFindingRow)}
        title="Delete finding?"
        loading={findingDelete.isPending}
        onClose={() => setDeleteFindingRow(null)}
        onConfirm={async () => {
          if (!deleteFindingRow) return
          try {
            await findingDelete.mutateAsync(deleteFindingRow.id)
            setDeleteFindingRow(null)
          } catch {
            /* noop */
          }
        }}
      />
    </Box>
  )
}
