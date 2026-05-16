import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { LoginPage } from '../pages/LoginPage'
import { TurbinesPage } from '../pages/TurbinesPage'
import { InspectionsPage } from '../pages/InspectionsPage'
import { InspectionDetailPage } from '../pages/InspectionDetailPage'
import { FindingsPage } from '../pages/FindingsPage'
import { RepairPlansPage } from '../pages/RepairPlansPage'

export function AppRouter(): React.ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/turbines" replace />} />
          <Route path="/turbines" element={<TurbinesPage />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="/findings" element={<FindingsPage />} />
          <Route path="/repair-plans" element={<RepairPlansPage />} />
          <Route path="*" element={<Navigate to="/turbines" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
