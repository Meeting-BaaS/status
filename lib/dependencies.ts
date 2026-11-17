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
  /** Regions we operate in, matched against AZ component names ("fr-par-1" -> "fr-par"). */
  regions?: string[]
  /** Unresolved-incidents endpoint, used to tell whether a degraded component is actually our region's problem. */
  incidentsUrl?: string
  capabilities: DependencyCapability[]
  /** Our own zone(s) — only surfaced when not operational, since a healthy zone adds nothing. */
  zone?: DependencyCapability
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
 * Relevance is region-gated: providers sometimes mark a product component as
 * degraded for an incident that only affects another region (e.g. Object
 * Storage degraded by a pl-waw incident). The unresolved incidents tell us
 * which regions are affected, and the product only counts against us when our
 * region is in that set (or the incident is global).
 *
 * Capabilities only map to the components that back them:
 * - Object Storage -> artifacts, recordings, logs, audio chunks, logos
 *   (s3.fr-par.scw.cloud buckets)
 * - Messaging and Queuing -> bot job queues (sqs.mnq.fr-par.scaleway.com)
 * - Kubernetes Kapsule -> API server and bot hosting
 * - Container Registry -> image pulls for deploys (rg.fr-par.scw.cloud)
 *
 * Providers expose Atlassian Statuspage APIs: /api/v2/status.json,
 * /api/v2/components.json and /api/v2/incidents/unresolved.json.
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
    incidentsUrl: "https://status.scaleway.com/api/v2/incidents/unresolved.json",
    regions: ["fr-par"],
    capabilities: [
      { label: "Artifacts & recordings", components: ["Object Storage"] },
      { label: "Bot job queue", components: ["Messaging and Queuing"] },
      { label: "Hosting (API & bots)", components: ["Kubernetes Kapsule"] },
      { label: "Deployments", components: ["Container Registry"] }
    ],
    zone: { label: "Zone fr-par-1", components: ["fr-par-1"] }
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

/** AZ component names look like "fr-par-1" or "pl-waw-2". */
const AZ_COMPONENT_PATTERN = /^([a-z]{2}-[a-z]{3})-\d+$/

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

/** Regions (e.g. "fr-par") mentioned by the AZ components of an incident. */
export function componentRegions(componentNames: string[]): Set<string> {
  const regions = new Set<string>()
  for (const name of componentNames) {
    const match = AZ_COMPONENT_PATTERN.exec(name)
    if (match) regions.add(match[1])
  }
  return regions
}

interface StatuspageStatusResponse {
  status?: { indicator?: unknown }
}

interface StatuspageComponentsResponse {
  components?: Array<{ name?: unknown; status?: unknown }>
}

interface StatuspageIncidentsResponse {
  incidents?: Array<{ components?: Array<{ name?: unknown }> }>
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

/**
 * True when an incident affects one of our regions.
 *
 * Regions are derived only from the incident's *non-operational* AZ components:
 * an AZ that is already operational (e.g. recovered while the incident is still
 * under monitoring) does not count against us, and neither do foreign AZs. An
 * incident with no AZ components at all is global and always counts.
 */
export function isIncidentAffectingRegions(params: {
  componentNames: string[]
  componentStatuses: Map<string, DependencyStatus>
  regions: string[]
}): boolean {
  const { componentNames, componentStatuses, regions } = params
  const azNames = componentNames.filter((name) => AZ_COMPONENT_PATTERN.test(name))
  if (azNames.length === 0) return true

  const affectedRegions = componentRegions(
    azNames.filter((name) => componentStatuses.get(name) !== "operational")
  )
  return regions.some((region) => affectedRegions.has(region))
}

/** Component names of an incident entry, ignoring malformed shapes. */
function incidentComponentNames(incident: unknown): string[] {
  if (incident === null || typeof incident !== "object") return []

  const components = (incident as { components?: unknown }).components
  if (!Array.isArray(components)) return []

  return components
    .map((component) =>
      component !== null &&
      typeof component === "object" &&
      typeof (component as { name?: unknown }).name === "string"
        ? (component as { name: string }).name
        : null
    )
    .filter((name): name is string => name !== null)
}

/**
 * Demotes components whose degradation is only caused by incidents in regions
 * we don't operate in — the provider marks the product degraded globally while
 * the incident itself names just the foreign AZs.
 *
 * Malformed incident payloads (null entries, non-array components) are ignored,
 * and components degraded without any matching incident keep their status, so a
 * missing or broken incident feed errs on the side of showing it.
 */
export function applyRegionScoping(params: {
  componentStatuses: Map<string, DependencyStatus>
  incidents: StatuspageIncidentsResponse
  regions: string[]
}): void {
  const { componentStatuses, incidents, regions } = params
  const outsideOnly = new Map<string, boolean>()
  const incidentList: unknown[] = Array.isArray(incidents.incidents) ? incidents.incidents : []

  for (const incident of incidentList) {
    const names = incidentComponentNames(incident)
    if (names.length === 0) continue

    const relevant = isIncidentAffectingRegions({
      componentNames: names,
      componentStatuses,
      regions
    })
    for (const name of names) {
      if (relevant) {
        outsideOnly.set(name, false)
      } else if (!outsideOnly.has(name)) {
        outsideOnly.set(name, true)
      }
    }
  }

  for (const [name, onlyOutside] of outsideOnly) {
    if (onlyOutside) componentStatuses.set(name, "operational")
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

  const regions = dependency.regions ?? []
  const wantIncidents = Boolean(dependency.incidentsUrl) && regions.length > 0

  const [statusBody, componentsBody, incidentsBody] = await Promise.all([
    fetchStatuspage<StatuspageStatusResponse>(dependency.statusUrl),
    fetchStatuspage<StatuspageComponentsResponse>(dependency.componentsUrl),
    wantIncidents
      ? fetchStatuspage<StatuspageIncidentsResponse>(dependency.incidentsUrl as string)
      : Promise.resolve(null)
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

  if (incidentsBody && regions.length > 0) {
    applyRegionScoping({ componentStatuses, incidents: incidentsBody, regions })
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

  // Our own zone only earns a row when it is not operational.
  if (dependency.zone) {
    const zoneStatuses = dependency.zone.components
      .map((name) => componentStatuses.get(name))
      .filter((status): status is DependencyStatus => status !== undefined)
    const zoneStatus = zoneStatuses.length > 0 ? worstStatus(zoneStatuses) : "unknown"

    if (zoneStatus !== "operational") {
      capabilities.push({ label: dependency.zone.label, status: zoneStatus })
    }
  }

  return {
    ...base,
    status: worstStatus(capabilities.map((capability) => capability.status)),
    capabilities
  }
}
