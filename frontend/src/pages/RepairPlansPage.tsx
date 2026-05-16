import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import HandymanIcon from '@mui/icons-material/Handyman'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchInspections } from '../api/inspections'
import { fetchRepairPlanByInspectionMaybe, generateRepairPlan } from '../api/repairPlans'
import { getAxiosMessage } from '../api/client'
import { RepairPlanCard } from '../components/repairPlans/RepairPlanCard'
import { ErrorAlert, LoadingState } from '../components/common/Feedback'
import { useRbac } from '../hooks/useRbac'

export function RepairPlansPage(): React.ReactElement {
  const qc = useQueryClient()
  const { canWrite } = useRbac()
  const [selectedInspectionId, setSelectedInspectionId] = useState('')

  const inspectionsQ = useQuery({
    queryKey: ['inspections', 'repair-plan-picker'],
    queryFn: () => fetchInspections({ page: 1, limit: 100 }),
  })

  const planQ = useQuery({
    queryKey: ['repairPlan', selectedInspectionId],
    queryFn: () => fetchRepairPlanByInspectionMaybe(selectedInspectionId),
    enabled: Boolean(selectedInspectionId),
  })

  const genMutation = useMutation({
    mutationFn: () => generateRepairPlan(selectedInspectionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['repairPlan', selectedInspectionId] })
      void qc.invalidateQueries({ queryKey: ['inspection', selectedInspectionId] })
      void qc.invalidateQueries({ queryKey: ['inspections'] })
    },
  })

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Repair plans
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Inspect aggregated plans per inspection. Events from SSE refresh open queries automatically when plans are generated.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems={{ md: 'center' }}>
        <FormControl sx={{ minWidth: 320 }} size="small">
          <InputLabel>Inspection</InputLabel>
          <Select
            label="Inspection"
            value={selectedInspectionId}
            onChange={(e) => setSelectedInspectionId(e.target.value)}
          >
            <MenuItem value="">
              <em>Select inspection…</em>
            </MenuItem>
            {(inspectionsQ.data?.items ?? []).map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.turbine?.name ?? i.turbineId} · {new Date(i.date).toLocaleDateString()} · {i.dataSource}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedInspectionId ? (
          <Button component={RouterLink} to={`/inspections/${selectedInspectionId}`} endIcon={<OpenInNewIcon />}>
            Open inspection workspace
          </Button>
        ) : null}
        {canWrite && selectedInspectionId ? (
          <Button
            variant="contained"
            startIcon={<HandymanIcon />}
            disabled={genMutation.isPending}
            onClick={() => void genMutation.mutateAsync()}
          >
            {genMutation.isPending ? 'Generating…' : 'Generate / refresh plan'}
          </Button>
        ) : null}
      </Stack>

      {inspectionsQ.isLoading ? <LoadingState label="Loading inspections…" /> : null}
      {inspectionsQ.isError ? <ErrorAlert message={getAxiosMessage(inspectionsQ.error)} /> : null}

      {!selectedInspectionId ? (
        <Typography variant="body2" color="text.secondary">
          Choose an inspection to view priority, total cost, and generated summary.
        </Typography>
      ) : null}

      {selectedInspectionId ? (
        <>
          {planQ.isLoading ? <LoadingState label="Loading plan…" /> : null}
          {planQ.isError ? <ErrorAlert message={getAxiosMessage(planQ.error)} /> : null}
          <RepairPlanCard plan={planQ.data ?? null} liveHint />
          {genMutation.isError ? (
            <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
              {getAxiosMessage(genMutation.error)}
            </Typography>
          ) : null}
        </>
      ) : null}
    </Box>
  )
}
