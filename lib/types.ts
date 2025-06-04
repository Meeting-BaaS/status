export type PlatformName = "zoom" | "teams" | "google meet" | "unknown"
export type StatusType = "success" | "error" | "pending" | "warning"
export type UserReportedErrorStatus = "open" | "closed" | "in_progress"

// Error categories from Rust implementation
export type ErrorCategory =
  | "system_error"
  | "auth_error"
  | "capacity_error"
  | "connection_error"
  | "permission_error"
  | "input_error"
  | "duplicate_error"
  | "webhook_error"
  | "api_error"
  | "user_reported_error"
  | "unknown_error"
  | "stalled_error"
  | "success"
  | "pending"

// Error priorities from Rust implementation
export type ErrorPriority = "critical" | "high" | "medium" | "low" | "none"

export type Status = {
  value: string
  type: StatusType
  details?: string | null
  sort_priority: number
  category: ErrorCategory
}

export type BotData = {
  meeting_platform: PlatformName
  created_at: string
  duration: number
  status: Status
  user_reported_error_status: UserReportedErrorStatus | null
  user_reported_error_messages: string | null
}

export type FilterState = {
  platformFilters: string[]
  statusFilters: string[]
  userReportedErrorStatusFilters: string[]
  errorCategoryFilters: string[]
  errorPriorityFilters: string[]
}

export type PlatformDistribution = {
  platform: PlatformName
  count: number
  statusDistribution: {
    success: { count: number; percentage: number }
    error: { count: number; percentage: number }
    warning: { count: number; percentage: number }
    pending: { count: number; percentage: number }
  }
}

export type ErrorDistribution = {
  name: string
  value: number
  percentage: number
}

export type ErrorTableEntry = {
  type: string
  originalType: string
  message: string
  category: string
  priority: ErrorPriority
  platforms: Record<PlatformName, number>
  count: number
}

export type WebhookErrorGroup = {
  count: number
  messages: string[]
  bots: BotData[]
}

export type StalledErrorGroup = {
  values: number[]
  bots: BotData[]
}

export type NormalizedErrorGroup = {
  type: string
  message: string
  bots: BotData[]
}

export type TimelineEntry = {
  date: string
  total: number
  priorities: Array<{
    priority: string
    count: number
  }>
}

export type DurationTimelineEntry = {
  date: string
  averageDuration: number
  totalDuration: number
  botCount: number
}

export type PlatformDurationEntry = {
  name: string
  value: number
  count: number
}

export type DurationDistributionEntry = {
  range: string
  count: number
  percentage: number
}

export type IssueReportTimelineEntry = {
  date: string
  open: number
  in_progress: number
  closed: number
}

export type IssueReportData = {
  statusCounts: {
    open: number
    in_progress: number
    closed: number
  }
  timelineData: IssueReportTimelineEntry[]
}
