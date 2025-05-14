import type { BotPaginated } from "@/lib/types"

export interface FetchLogsParams {
  offset: number
  limit: number
  start_date?: string
  end_date?: string
  bot_id?: number
  meeting_url?: string
  meeting_url_contains?: string
  account_id?: number
  reserved?: boolean
  diarization_v2?: boolean
  extra_contains?: string
  creator_email_contains?: string
  user_reported_error_contains?: string
  user_reported_error_json?: Record<string, unknown>
  status?: string[]
}

export async function fetchBotStats(params: FetchLogsParams): Promise<BotPaginated> {
  const queryParams = new URLSearchParams()

  // Handle legacy params
  if ("bot_id" in params) {
    queryParams.append("bot_id", String(params.bot_id ?? ""))
    queryParams.append("offset", String(params.offset))
    queryParams.append("limit", String(params.limit))
  } else if ("start_date" in params && "end_date" in params) {
    queryParams.append("offset", String(params.offset))
    queryParams.append("limit", String(params.limit))
    if (params.start_date) queryParams.append("start_date", params.start_date)
    if (params.end_date) queryParams.append("end_date", params.end_date)
  } else {
    // New params
    queryParams.append("offset", String(params.offset))
    queryParams.append("limit", String(params.limit))

    // Add optional filters if they exist
    if (params.start_date) queryParams.append("start_date", params.start_date)
    if (params.end_date) queryParams.append("end_date", params.end_date)
    if (params.bot_id) queryParams.append("bot_id", String(params.bot_id))
    if (params.meeting_url) queryParams.append("meeting_url", params.meeting_url)
    if (params.meeting_url_contains)
      queryParams.append("meeting_url_contains", params.meeting_url_contains)
    if (params.account_id) queryParams.append("account_id", String(params.account_id))
    if (params.reserved !== undefined) queryParams.append("reserved", String(params.reserved))
    if (params.diarization_v2 !== undefined)
      queryParams.append("diarization_v2", String(params.diarization_v2))
    if (params.extra_contains) queryParams.append("extra_contains", params.extra_contains)
    if (params.creator_email_contains)
      queryParams.append("creator_email_contains", params.creator_email_contains)
    if (params.user_reported_error_contains)
      queryParams.append("user_reported_error_contains", params.user_reported_error_contains)
    if (params.user_reported_error_json)
      queryParams.append(
        "user_reported_error_json",
        JSON.stringify(params.user_reported_error_json)
      )
    if (params.status?.length) queryParams.append("status", JSON.stringify(params.status))
  }

  const response = await fetch(`/api/bots/all?${queryParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`)
  }
  return response.json()
}
