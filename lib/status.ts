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

export interface StatusFeed {
  /** Current overall status, null when the feed could not be loaded. */
  status: StatusLevel | null
  updatedAt: string | null
  updates: StatusUpdateEntry[]
}

const STATUS_LEVELS: readonly StatusLevel[] = [
  "operational",
  "maintenance",
  "degraded",
  "partial_outage",
  "major_outage"
]

const UNAVAILABLE_FEED: StatusFeed = { status: null, updatedAt: null, updates: [] }

/** Feed size the API returns; kept in sync with the endpoint's PUBLIC_FEED_LIMIT. */
const FEED_LIMIT = 20

function isStatusLevel(value: unknown): value is StatusLevel {
  return typeof value === "string" && STATUS_LEVELS.includes(value as StatusLevel)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
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

    return {
      status: isStatusLevel(body.status) ? body.status : "operational",
      updatedAt: isIsoDate(body.updated_at) ? body.updated_at : null,
      updates
    }
  } catch {
    return UNAVAILABLE_FEED
  }
}
