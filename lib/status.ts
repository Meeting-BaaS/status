export type StatusLevel =
  | "operational"
  | "maintenance"
  | "degraded"
  | "partial_outage"
  | "major_outage"

export interface StatusUpdateEntry {
  id: number
  /** Id of the incident this entry follows up on, null for the incident itself. */
  parentId: number | null
  status: StatusLevel
  title: string
  body: string
  /** When the incident/status change took effect (may be backdated). */
  effectiveAt: string
  /** When the incident was resolved, null while ongoing. */
  resolvedAt: string | null
  /** When the update was actually published. */
  createdAt: string
}

export interface StatusIncident {
  root: StatusUpdateEntry
  /** Follow-ups of the root, oldest first. */
  followUps: StatusUpdateEntry[]
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
 * Groups the flat feed into incidents, in the feed's order (by root position).
 * A follow-up whose root is not in the feed becomes its own incident.
 */
export function groupIncidents(entries: StatusUpdateEntry[]): StatusIncident[] {
  const rootIds = new Set(
    entries.filter((entry) => entry.parentId === null).map((entry) => entry.id)
  )
  const byRootId = new Map<number, StatusIncident>()
  const incidents: StatusIncident[] = []

  for (const entry of entries) {
    if (entry.parentId !== null && rootIds.has(entry.parentId)) continue
    const incident: StatusIncident = { root: entry, followUps: [] }
    incidents.push(incident)
    if (entry.parentId === null) byRootId.set(entry.id, incident)
  }

  for (const entry of entries) {
    if (entry.parentId === null) continue
    byRootId.get(entry.parentId)?.followUps.push(entry)
  }

  for (const incident of incidents) {
    incident.followUps.sort(
      (a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt) || a.id - b.id
    )
  }

  return incidents
}

/**
 * State of an incident at `now`: the root's status once its resolution time has
 * passed, otherwise the status of the latest entry already in effect.
 */
export function getIncidentStatus(incident: StatusIncident, now: number): StatusLevel {
  const { root } = incident
  if (root.resolvedAt && Date.parse(root.resolvedAt) <= now) return root.status

  let latest = root
  for (const followUp of incident.followUps) {
    const at = Date.parse(followUp.effectiveAt)
    // A follow-up dated in the future has not taken effect yet.
    if (at <= now && at >= Date.parse(latest.effectiveAt)) latest = followUp
  }
  return latest.status
}

export type IncidentPhase = "scheduled" | "ongoing" | "resolved" | "informational"

/**
 * Where an incident stands at `now`: resolved once its resolution time has
 * passed, scheduled while its start is in the future, informational when it is
 * operational now with no resolution time at all, ongoing otherwise.
 */
export function getIncidentPhase(incident: StatusIncident, now: number): IncidentPhase {
  const { root } = incident
  if (root.resolvedAt && Date.parse(root.resolvedAt) <= now) return "resolved"
  if (Date.parse(root.effectiveAt) > now) return "scheduled"
  const status = getIncidentStatus(incident, now)
  return status === "operational" && !root.resolvedAt ? "informational" : "ongoing"
}

/** When an incident last changed: its resolution time, else its latest entry. */
function getLastChangeAt(incident: StatusIncident, now: number): number {
  const { root } = incident
  if (root.resolvedAt && Date.parse(root.resolvedAt) <= now) return Date.parse(root.resolvedAt)
  return Math.max(
    Date.parse(root.effectiveAt),
    ...incident.followUps.map((followUp) => Date.parse(followUp.effectiveAt))
  )
}

/**
 * Splits incidents into active (ongoing first, then scheduled by soonest start)
 * and resolved (resolved and informational, most recent change first).
 */
export function partitionIncidents(
  incidents: StatusIncident[],
  now: number
): { active: StatusIncident[]; resolved: StatusIncident[] } {
  const ongoing: StatusIncident[] = []
  const scheduled: StatusIncident[] = []
  const resolved: StatusIncident[] = []

  for (const incident of incidents) {
    const phase = getIncidentPhase(incident, now)
    if (phase === "ongoing") ongoing.push(incident)
    else if (phase === "scheduled") scheduled.push(incident)
    else resolved.push(incident)
  }

  scheduled.sort((a, b) => Date.parse(a.root.effectiveAt) - Date.parse(b.root.effectiveAt))
  resolved.sort((a, b) => getLastChangeAt(b, now) - getLastChangeAt(a, now))

  return { active: [...ongoing, ...scheduled], resolved }
}

/** Formats a duration as "45m", "2h 14m" or "3d 4h" (rounded down to the minute). */
export function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000)
  if (totalMinutes < 1) return "less than a minute"

  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  return `${minutes}m`
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
            parentId: typeof entry.parent_id === "number" ? entry.parent_id : null,
            status: entry.status as StatusLevel,
            title: entry.title as string,
            body: entry.body as string,
            effectiveAt: isIsoDate(entry.effective_at)
              ? entry.effective_at
              : (entry.created_at as string),
            resolvedAt: isIsoDate(entry.resolved_at) ? entry.resolved_at : null,
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
