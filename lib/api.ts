import type { BotPaginated } from "@/lib/types"

export interface FetchLogsParams {
  offset: number
  limit: number
  start_date?: string
  end_date?: string
  meeting_url_contains?: string
  status_type?: string
  user_reported_error_json?: string
  bot_uuid?: string
}

/**
 * Fetches paginated bot stats from the API.
 * Returns { bots: BotData[], has_more: boolean }
 */
export async function fetchBotStats(params: FetchLogsParams): Promise<BotPaginated> {
  const queryParams = new URLSearchParams()

  queryParams.append("offset", String(params.offset))
  queryParams.append("limit", String(params.limit))

  // Add optional filters if they exist
  if (params.start_date) queryParams.append("start_date", params.start_date)
  if (params.end_date) queryParams.append("end_date", params.end_date)
  if (params.meeting_url_contains)
    queryParams.append("meeting_url_contains", params.meeting_url_contains)
  if (params.status_type) queryParams.append("status_type", params.status_type)
  if (params.user_reported_error_json)
    queryParams.append("user_reported_error_json", params.user_reported_error_json)
  if (params.bot_uuid) queryParams.append("bot_uuid", params.bot_uuid)

  const response = await fetch(`/api/bots/all?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
