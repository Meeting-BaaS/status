export type Option = {
  label: string
  value: string
  searchParam: string
}

export const allPlatforms: Option[] = [
  { label: "Zoom", value: "zoom.us", searchParam: "zoom" },
  { label: "Google Meet", value: "meet.google.com", searchParam: "meet" },
  { label: "Teams", value: "teams.microsoft.com,teams.live.com", searchParam: "teams" }
]

export const allStatuses: Option[] = [
  { label: "Success", value: "success", searchParam: "success" },
  { label: "Error", value: "error", searchParam: "error" },
  { label: "Pending", value: "pending", searchParam: "pending" },
  { label: "Warning", value: "warning", searchParam: "warning" }
]

export const allUserReportedErrorStatuses: Option[] = [
  { label: "Open", value: JSON.stringify({ status: "open" }), searchParam: "open" },
  { label: "Closed", value: JSON.stringify({ status: "closed" }), searchParam: "closed" },
  {
    label: "In Progress",
    value: JSON.stringify({ status: "in_progress" }),
    searchParam: "in_progress"
  }
]
