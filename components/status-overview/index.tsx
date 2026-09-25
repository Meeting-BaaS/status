import { type StatusLevel, getStatusFeed } from "@/lib/status"
import { cn } from "@/lib/utils"

const LEVEL_STYLES: Record<
  StatusLevel | "unavailable",
  { headline: string; dot: string; text: string }
> = {
  operational: {
    headline: "All Systems Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  maintenance: {
    headline: "Scheduled Maintenance",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400"
  },
  degraded: {
    headline: "Degraded Performance",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400"
  },
  partial_outage: {
    headline: "Partial Outage",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400"
  },
  major_outage: {
    headline: "Major Outage",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400"
  },
  unavailable: {
    headline: "Status Unavailable",
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

function LevelBadge({ level, className }: { level: StatusLevel; className?: string }) {
  const style = LEVEL_STYLES[level]

  return (
    <span className={cn("flex items-center gap-2 font-medium text-xs", style.text, className)}>
      <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
      {style.headline}
    </span>
  )
}

export async function StatusOverview() {
  const feed = await getStatusFeed()
  const style = LEVEL_STYLES[feed.status ?? "unavailable"]

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-gradient-to-r from-muted/30 to-background p-5 shadow-sm">
        <span className={cn("size-3 shrink-0 rounded-full", style.dot)} />
        <div>
          <p className={cn("font-semibold", style.text)}>{style.headline}</p>
          {feed.updatedAt ? (
            <p className="text-muted-foreground text-xs">
              Last update {formatDate(feed.updatedAt)}
            </p>
          ) : null}
        </div>
      </div>

      {feed.updates.length > 0 ? (
        <section>
          <h2 className="mb-2 font-semibold text-sm">Updates</h2>
          <ul className="space-y-3">
            {feed.updates.map((update) => (
              <li
                key={update.id}
                className="rounded-lg border border-border/70 bg-gradient-to-r from-muted/30 to-background p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-sm">{update.title}</p>
                  <LevelBadge level={update.status} />
                </div>
                <p className="mt-1 text-muted-foreground text-xs">{formatDate(update.createdAt)}</p>
                <p className="mt-2 whitespace-pre-line text-sm">{update.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
