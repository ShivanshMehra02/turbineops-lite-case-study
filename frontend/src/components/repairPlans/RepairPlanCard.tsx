import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import type { RepairPlan } from '../../types/domain'
import { parseRepairPlanSnapshot } from '../../utils/repairPlanSnapshot'

function priorityColor(p: RepairPlan['priority']): 'default' | 'success' | 'warning' | 'error' {
  if (p === 'HIGH') return 'error'
  if (p === 'MEDIUM') return 'warning'
  return 'success'
}

export function RepairPlanCard({
  plan,
  liveHint,
}: {
  plan: RepairPlan | null | undefined
  /** Shown when SSE may refresh data */
  liveHint?: boolean
}): React.ReactElement {
  if (!plan) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            No repair plan yet
          </Typography>
          <Typography variant="body2">Generate a plan from current findings.</Typography>
        </CardContent>
      </Card>
    )
  }

  const snap = parseRepairPlanSnapshot(plan.snapshotJson)

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="h6">Repair plan</Typography>
            <Chip size="small" label={plan.priority} color={priorityColor(plan.priority)} />
            {liveHint ? <Chip size="small" variant="outlined" label="Live updates enabled" /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Total estimated cost:{' '}
            <strong>{Number(plan.totalEstimatedCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </Typography>
          <Divider />
          <Typography variant="subtitle2">Summary</Typography>
          <Typography variant="body2">{snap?.summary.text ?? 'See raw snapshot for legacy plans.'}</Typography>
          {snap ? (
            <Box sx={{ typography: 'caption', color: 'text.secondary' }}>
              Findings in snapshot: {snap.summary.findingCount} · Max severity: {snap.summary.maxSeverity}
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
