import {
  type StatusFeed,
  type StatusIncident,
  type StatusLevel,
  formatDuration,
  getIncidentPhase,
  getIncidentStatus,
  getStatusFeed,
  groupIncidents,
  partitionIncidents
} from "@/lib/status"
import { cn } from "@/lib/utils"
import { Fragment, type ReactNode } from "react"

const LEVEL_STYLES: Record<
  StatusLevel | "unavailable",
  { headline: string; label: string; dot: string; text: string }
> = {
  operational: {
    headline: "All Systems Operational",
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  maintenance: {
    headline: "Scheduled Maintenance",
    label: "Maintenance",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400"
  },
  degraded: {
    headline: "Degraded Performance",
    label: "Degraded Performance",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400"
  },
  partial_outage: {
    headline: "Partial Outage",
    label: "Partial Outage",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400"
  },
  major_outage: {
    headline: "Major Outage",
    label: "Major Outage",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400"
  },
  unavailable: {
    headline: "Status Unavailable",
    label: "Unavailable",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground"
  }
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC"
})

function formatDate(iso: string): string {
  return `${DATE_FORMATTER.format(new Date(iso))} UTC`
}

const DAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC"
})

function formatDay(date: string): string {
  return DAY_FORMATTER.format(new Date(`${date}T00:00:00Z`))
}

function HistoryCalendar({ days }: { days: StatusFeed["history"] }) {
  if (days.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-muted-foreground text-xs">Last {days.length} days</p>
      <div className="flex gap-1">
        {days.map((day) => {
          const label = `${formatDay(day.date)} — ${LEVEL_STYLES[day.status].headline}`

          return (
            <button
              key={day.date}
              type="button"
              aria-label={label}
              title={label}
              className={cn(
                "h-6 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                LEVEL_STYLES[day.status].dot
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

const BADGE_TONES = {
  resolved: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  scheduled: {
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400"
  }
}

function StateBadge({ label, dot, text }: { label: string; dot: string; text: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-0.5 font-medium text-xs",
        text
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {label}
    </span>
  )
}

function DateTime({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDate(iso)}</time>
}

function DateRange({ from, to }: { from: string; to: string }) {
  return (
    <span>
      <DateTime iso={from} />
      <span aria-hidden="true"> → </span>
      <span className="sr-only"> to </span>
      <DateTime iso={to} />
    </span>
  )
}

function MetaRow({ items }: { items: ReactNode[] }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground text-xs">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span>{item}</span>
        </Fragment>
      ))}
    </p>
  )
}

interface TimelineEntry {
  key: string
  label: string
  at: string
  dot: string
  text: string
  title?: string
  body?: string
}

/** The incident's story, newest first: resolution, follow-ups, initial report. */
function buildTimeline(incident: StatusIncident, isResolved: boolean): TimelineEntry[] {
  const { root, followUps } = incident
  if (followUps.length === 0 && !isResolved) return []

  const entries: TimelineEntry[] = []

  if (isResolved && root.resolvedAt) {
    entries.push({
      key: "resolved",
      label: "Resolved",
      at: root.resolvedAt,
      ...BADGE_TONES.resolved
    })
  }

  for (const followUp of [...followUps].reverse()) {
    const style = LEVEL_STYLES[followUp.status]
    entries.push({
      key: `follow-up-${followUp.id}`,
      label: style.label,
      at: followUp.effectiveAt,
      dot: style.dot,
      text: style.text,
      // A follow-up inherits the incident's title unless it was given its own.
      title: followUp.title !== root.title ? followUp.title : undefined,
      body: followUp.body
    })
  }

  // The report's own message is the card body, so it is not repeated here.
  entries.push({
    key: "reported",
    label: `Reported · ${LEVEL_STYLES[root.status].label}`,
    at: root.effectiveAt,
    dot: "bg-muted-foreground",
    text: "text-muted-foreground"
  })

  // Entries can be backdated either way, so order by time; the stable sort keeps "Resolved" first and the report last on ties.
  entries.sort((first, second) => Date.parse(second.at) - Date.parse(first.at))

  return entries
}

function Timeline({ entries, quiet }: { entries: TimelineEntry[]; quiet: boolean }) {
  if (entries.length === 0) return null

  return (
    <ol className="mt-4 border-border/70 border-t pt-4">
      {entries.map((entry, index) => (
        <li key={entry.key} className="relative pb-4 pl-5 last:pb-0">
          {index < entries.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-0 left-[3px] w-px bg-border"
            />
          ) : null}
          <span
            aria-hidden="true"
            className={cn("absolute top-1 left-0 size-[7px] rounded-full", entry.dot)}
          />
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            <span className={cn("font-medium", entry.text)}>{entry.label}</span>
            <span className="text-muted-foreground">
              <DateTime iso={entry.at} />
            </span>
          </p>
          {entry.title ? (
            <p className={cn("mt-1 font-medium text-sm", quiet && "text-muted-foreground")}>
              {entry.title}
            </p>
          ) : null}
          {entry.body ? (
            <p className={cn("mt-1 whitespace-pre-line text-sm", quiet && "text-muted-foreground")}>
              {entry.body}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function IncidentCard({ incident, now }: { incident: StatusIncident; now: number }) {
  const { root } = incident
  const phase = getIncidentPhase(incident, now)
  const isResolved = phase === "resolved"
  const quiet = isResolved || phase === "informational"
  const levelStyle = LEVEL_STYLES[getIncidentStatus(incident, now)]

  const badge = isResolved
    ? { label: "Resolved", ...BADGE_TONES.resolved }
    : phase === "scheduled"
      ? { label: "Scheduled", ...BADGE_TONES.scheduled }
      : levelStyle

  const meta: ReactNode[] = []
  if (isResolved && root.resolvedAt) {
    meta.push(<DateRange key="range" from={root.effectiveAt} to={root.resolvedAt} />)
    const duration = Date.parse(root.resolvedAt) - Date.parse(root.effectiveAt)
    if (duration > 0) meta.push(`Lasted ${formatDuration(duration)}`)
  } else if (phase === "scheduled") {
    meta.push(
      <>
        Scheduled for{" "}
        {root.resolvedAt ? (
          <DateRange from={root.effectiveAt} to={root.resolvedAt} />
        ) : (
          <DateTime iso={root.effectiveAt} />
        )}
      </>
    )
  } else {
    meta.push(
      <>
        {phase === "informational" ? "Posted" : "Started"} <DateTime iso={root.effectiveAt} />
      </>
    )
    if (root.resolvedAt) {
      meta.push(
        <>
          Expected end <DateTime iso={root.resolvedAt} />
        </>
      )
    }
  }

  return (
    <li
      className={cn(
        "rounded-lg border p-4",
        quiet
          ? "border-border/50"
          : "border-border/70 bg-gradient-to-r from-muted/30 to-background shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-sm">{root.title}</h3>
        <StateBadge label={badge.label} dot={badge.dot} text={badge.text} />
      </div>
      <MetaRow items={meta} />
      <p className={cn("mt-3 whitespace-pre-line text-sm", quiet && "text-muted-foreground")}>
        {root.body}
      </p>
      <Timeline entries={buildTimeline(incident, isResolved)} quiet={quiet} />
    </li>
  )
}

/** `children` (the service health cards) sit between the overall status and the incidents. */
export async function StatusOverview({ children }: { children?: ReactNode }) {
  const feed = await getStatusFeed()
  const style = LEVEL_STYLES[feed.status ?? "unavailable"]
  const now = Date.now()
  const { active, resolved } = partitionIncidents(groupIncidents(feed.updates), now)

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-gradient-to-r from-muted/30 to-background p-5 shadow-sm">
        <span className={cn("size-3 shrink-0 rounded-full", style.dot)} />
        <div>
          <p className={cn("font-semibold", style.text)}>{style.headline}</p>
          {feed.updatedAt ? (
            <p className="text-muted-foreground text-xs">
              Status effective since {formatDate(feed.updatedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <HistoryCalendar days={feed.history} />

      {children}

      {feed.status !== null ? (
        <>
          <section>
            <h2 className="mb-2 font-semibold text-sm">Active incidents</h2>
            {active.length > 0 ? (
              <ul className="space-y-3">
                {active.map((incident) => (
                  <IncidentCard key={incident.root.id} incident={incident} now={now} />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No active incidents.</p>
            )}
          </section>

          {resolved.length > 0 ? (
            <section>
              <h2 className="mb-2 font-semibold text-sm">Resolved incidents</h2>
              <ul className="space-y-3">
                {resolved.map((incident) => (
                  <IncidentCard key={incident.root.id} incident={incident} now={now} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
