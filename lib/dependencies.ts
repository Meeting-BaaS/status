export type DependencyStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "unknown"

export interface Dependency {
  id: string
  label: string
  provider: string
  statusUrl: string
  pageUrl: string
}

export interface DependencyHealth extends Dependency {
  status: DependencyStatus
  description: string | null
}

/**
 * Third-party services the platform depends on. Each provider exposes an
 * Atlassian Statuspage-compatible endpoint at /api/v2/status.json.
 */
export const dependencies: Dependency[] = [
  {
    id: "infrastructure",
    label: "Infrastructure",
    provider: "Scaleway",
    statusUrl: "https://status.scaleway.com/api/v2/status.json",
    pageUrl: "https://status.scaleway.com"
  },
  {
    id: "transcription",
    label: "Transcription",
    provider: "Gladia",
    statusUrl: "https://status.gladia.io/api/v2/status.json",
    pageUrl: "https://status.gladia.io"
  }
]

const STATUS_BY_INDICATOR: Record<string, DependencyStatus> = {
  none: "operational",
  minor: "degraded",
  major: "partial_outage",
  critical: "major_outage"
}

export function mapIndicator(indicator: unknown): DependencyStatus {
  if (typeof indicator !== "string") return "unknown"
  return STATUS_BY_INDICATOR[indicator] ?? "unknown"
}

export async function getDependencyHealth(dependency: Dependency): Promise<DependencyHealth> {
  try {
    const response = await fetch(dependency.statusUrl, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`Status request failed with ${response.status}`)
    }

    const body = (await response.json()) as {
      status?: { indicator?: unknown; description?: unknown }
    }

    return {
      ...dependency,
      status: mapIndicator(body.status?.indicator),
      description: typeof body.status?.description === "string" ? body.status.description : null
    }
  } catch {
    return { ...dependency, status: "unknown", description: null }
  }
}
