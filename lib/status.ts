export type StatusLevel =
  | "operational"
  | "maintenance"
  | "degraded"
  | "partial_outage"
  | "major_outage"

export interface StatusUpdateEntry {
  id: number
  status: StatusLevel
  title: string
  body: string
  createdAt: string
}

export interface StatusDay {
  /** YYYY-MM-DD (UTC) */
  date: string
  status: StatusLevel
}

export interface StatusFeed {
  /** Current overall status, null when the feed could not be loaded. */
  status: StatusLevel | null
  updatedAt: string | null
  updates: StatusUpdateEntry[]
  /** Daily status for the last 30 days, oldest first. */
  history: StatusDay[]
}

const STATUS_LEVELS: readonly StatusLevel[] = [
  "operational",
  "maintenance",
  "degraded",
  "partial_outage",
  "major_outage"
]

const UNAVAILABLE_FEED: StatusFeed = {
  status: null,
  updatedAt: null,
  updates: [],
  history: []
}

/** Feed size the API returns; kept in sync with the endpoint's PUBLIC_FEED_LIMIT. */
const FEED_LIMIT = 20

/** History size the API returns; kept in sync with the endpoint's HISTORY_DAYS. */
const HISTORY_DAYS = 30

function isStatusLevel(value: unknown): value is StatusLevel {
  return typeof value === "string" && STATUS_LEVELS.includes(value as StatusLevel)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function isUtcDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  // Round-trip so impossible dates ("2026-13-01") are rejected instead of
  // reaching Intl.DateTimeFormat, which throws on Invalid Date.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * Reads the manually published status feed from the v2 api-server.
 * Falls back to an "unavailable" feed (null status) on any failure so the page
 * renders instead of rejecting.
 */
export async function getStatusFeed(): Promise<StatusFeed> {
  const baseUrl = process.env.API_SERVER_BASEURL
  if (!baseUrl) return UNAVAILABLE_FEED

  try {
    const response = await fetch(`${baseUrl}/public/status`, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return UNAVAILABLE_FEED

    const body = (await response.json()) as {
      status?: unknown
      updated_at?: unknown
      updates?: unknown
      history?: unknown
    }

    // An unrecognised overall status must not render as "All Systems
    // Operational" — fall back to the unavailable state instead.
    if (!isStatusLevel(body.status)) {
      return UNAVAILABLE_FEED
    }

    const updates = Array.isArray(body.updates)
      ? body.updates
          .filter(
            (entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object"
          )
          .filter(
            (entry) =>
              typeof entry.id === "number" &&
              isStatusLevel(entry.status) &&
              typeof entry.title === "string" &&
              typeof entry.body === "string" &&
              isIsoDate(entry.created_at)
          )
          .slice(0, FEED_LIMIT)
          .map((entry) => ({
            id: entry.id as number,
            status: entry.status as StatusLevel,
            title: entry.title as string,
            body: entry.body as string,
            createdAt: entry.created_at as string
          }))
      : []

    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object"
          )
          .filter((entry) => isUtcDay(entry.date) && isStatusLevel(entry.status))
          .slice(-HISTORY_DAYS)
          .map((entry) => ({
            date: entry.date as string,
            status: entry.status as StatusLevel
          }))
      : []

    return {
      status: body.status,
      updatedAt: isIsoDate(body.updated_at) ? body.updated_at : null,
      updates,
      history
    }
  } catch {
    return UNAVAILABLE_FEED
  }
}
