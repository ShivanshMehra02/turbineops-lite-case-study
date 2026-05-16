export type Role = 'ADMIN' | 'ENGINEER' | 'VIEWER'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
}

export type Turbine = {
  id: string
  name: string
  manufacturer?: string | null
  mwRating?: number | null
  lat?: number | null
  lng?: number | null
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = {
  items: T[]
  totalCount: number
  page: number
  limit: number
}

export type DataSource = 'DRONE' | 'MANUAL'

export type Inspection = {
  id: string
  date: string
  inspectionDay: string
  inspectorName?: string | null
  dataSource: DataSource
  rawPackageUrl?: string | null
  turbineId: string
  turbine?: Turbine
  findings?: Finding[]
  repairPlan?: RepairPlan | null
  createdAt: string
  updatedAt: string
}

export type FindingCategory = 'BLADE_DAMAGE' | 'LIGHTNING' | 'EROSION' | 'UNKNOWN'

export type Finding = {
  id: string
  inspectionId: string
  inspection?: Inspection
  category: FindingCategory
  severity: number
  estimatedCost: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH'

export type RepairPlan = {
  id: string
  inspectionId: string
  priority: Priority
  totalEstimatedCost: number
  snapshotJson: unknown
  createdAt: string
  updatedAt: string
}

export type LoginResponse = {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: string
  user: AuthUser
}

export type ApiErrorBody = {
  error?: string
  code?: string
  details?: unknown
}
