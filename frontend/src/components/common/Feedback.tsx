import React from 'react'
import { Alert, AlertTitle, Box, Typography } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}): React.ReactElement {
  return (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <InboxIcon sx={{ fontSize: 48, opacity: 0.35, mb: 1 }} />
      <Typography variant="subtitle1" color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  )
}

export function ErrorAlert({ title, message }: { title?: string; message: string }): React.ReactElement {
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {message}
    </Alert>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }): React.ReactElement {
  return (
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  )
}
