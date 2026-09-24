export type DependencyStatus =
  | "operational"
  | "maintenance"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "unknown"

export interface DependencyCapability {
  label: string
  /** Exact component names on the provider's status page that back this capability. */
  components: string[]
}

export interface Dependency {
  id: string
  label: string
  provider: string
  pageUrl: string
  statusUrl: string
  componentsUrl: string
  note?: string
  capabilities: DependencyCapability[]
}

export interface CapabilityHealth {
  label: string
  status: DependencyStatus
}

export interface DependencyHealth {
  id: string
  label: string
  provider: string
  pageUrl: string
  note?: string
  status: DependencyStatus
  capabilities: CapabilityHealth[]
}

/**
 * Third-party services the platform depends on, limited to what we actually use
 * and where we use it. All prod workloads run in Scaleway fr-par / fr-par-1
 * (10 nodes, API + bots), so a degraded product we don't use — or another
 * region/AZ — is not our incident.
 *
 * Capabilities only map to the components that back them:
 * - Object Storage -> artifacts, recordings, logs, audio chunks, logos
 *   (s3.fr-par.scw.cloud buckets)
 * - Messaging and Queuing -> bot job queues (sqs.mnq.fr-par.scaleway.com)
 * - Kubernetes Kapsule -> API server and bot hosting
 * - Container Registry -> image pulls for deploys (rg.fr-par.scw.cloud)
 * - fr-par-1 -> the only AZ our nodes run in
 *
 * Providers expose Atlassian Statuspage APIs: /api/v2/status.json and
 * /api/v2/components.json.
 */
export const dependencies: Dependency[] = [
  {
    id: "infrastructure",
    label: "Infrastructure",
    provider: "Scaleway",
    note: "fr-par",
    pageUrl: "https://status.scaleway.com",
    statusUrl: "https://status.scaleway.com/api/v2/status.json",
    componentsUrl: "https://status.scaleway.com/api/v2/components.json",
    capabilities: [
      { label: "Artifacts & recordings", components: ["Object Storage"] },
      { label: "Bot job queue", components: ["Messaging and Queuing"] },
      { label: "Hosting (API & bots)", components: ["Kubernetes Kapsule"] },
      { label: "Deployments", components: ["Container Registry"] },
      { label: "Zone fr-par-1", components: ["fr-par-1"] }
    ]
  },
  {
    id: "transcription",
    label: "Transcription",
    provider: "Gladia",
    pageUrl: "https://status.gladia.io",
    statusUrl: "https://status.gladia.io/api/v2/status.json",
    componentsUrl: "https://status.gladia.io/api/v2/components.json",
    capabilities: [
      { label: "API", components: ["API"] },
      { label: "Batch transcription", components: ["Pre-Recorded v2"] },
      { label: "Live transcription", components: ["Real-Time v2"] }
    ]
  }
]

const STATUS_BY_INDICATOR: Record<string, DependencyStatus> = {
  none: "operational",
  minor: "degraded",
  major: "partial_outage",
  critical: "major_outage"
}

const STATUS_BY_COMPONENT: Record<string, DependencyStatus> = {
  operational: "operational",
  degraded_performance: "degraded",
  partial_outage: "partial_outage",
  major_outage: "major_outage",
  under_maintenance: "maintenance"
}

const SEVERITY: Record<DependencyStatus, number> = {
  operational: 0,
  maintenance: 1,
  unknown: 2,
  degraded: 3,
  partial_outage: 4,
  major_outage: 5
}

export function mapIndicator(indicator: unknown): DependencyStatus {
  if (typeof indicator !== "string") return "unknown"
  return STATUS_BY_INDICATOR[indicator] ?? "unknown"
}

export function worstStatus(statuses: DependencyStatus[]): DependencyStatus {
  return statuses.reduce<DependencyStatus>(
    (worst, status) => (SEVERITY[status] > SEVERITY[worst] ? status : worst),
    "operational"
  )
}

interface StatuspageStatusResponse {
  status?: { indicator?: unknown }
}

interface StatuspageComponentsResponse {
  components?: Array<{ name?: unknown; status?: unknown }>
}

async function fetchStatuspage<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return null

    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getDependencyHealth(dependency: Dependency): Promise<DependencyHealth> {
  const base = {
    id: dependency.id,
    label: dependency.label,
    provider: dependency.provider,
    pageUrl: dependency.pageUrl,
    note: dependency.note
  }

  const [statusBody, componentsBody] = await Promise.all([
    fetchStatuspage<StatuspageStatusResponse>(dependency.statusUrl),
    fetchStatuspage<StatuspageComponentsResponse>(dependency.componentsUrl)
  ])

  // Fall back to the provider-wide indicator when the component list is
  // unavailable or malformed (not an array, or containing null/non-object
  // entries) rather than showing every capability as unknown — an unexpected
  // shape must not reject the render.
  const rawComponents = componentsBody?.components
  if (
    !Array.isArray(rawComponents) ||
    rawComponents.some((component) => component === null || typeof component !== "object")
  ) {
    return { ...base, status: mapIndicator(statusBody?.status?.indicator), capabilities: [] }
  }

  const componentStatuses = new Map<string, DependencyStatus>()
  for (const component of rawComponents) {
    if (typeof component.name === "string") {
      componentStatuses.set(
        component.name,
        STATUS_BY_COMPONENT[String(component.status)] ?? "unknown"
      )
    }
  }

  const capabilities: CapabilityHealth[] = dependency.capabilities.map((capability) => {
    const matched = capability.components
      .map((name) => componentStatuses.get(name))
      .filter((status): status is DependencyStatus => status !== undefined)

    return {
      label: capability.label,
      status: matched.length > 0 ? worstStatus(matched) : "unknown"
    }
  })

  return {
    ...base,
    status: worstStatus(capabilities.map((capability) => capability.status)),
    capabilities
  }
}
