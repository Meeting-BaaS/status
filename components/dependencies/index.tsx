import { type DependencyStatus, dependencies, getDependencyHealth } from "@/lib/dependencies"
import { cn } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

const STATUS_STYLES: Record<DependencyStatus, { label: string; dot: string; text: string }> = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400"
  },
  degraded: {
    label: "Degraded",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400"
  },
  partial_outage: {
    label: "Partial Outage",
    dot: "bg-orange-500",
    text: "text-orange-600 dark:text-orange-400"
  },
  major_outage: {
    label: "Major Outage",
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400"
  },
  unknown: {
    label: "Unknown",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground"
  }
}

function StatusPill({ status, compact }: { status: DependencyStatus; compact?: boolean }) {
  const style = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        "flex items-center gap-2 font-medium",
        compact ? "text-xs" : "text-sm",
        style.text
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
      {style.label}
    </span>
  )
}

export async function Dependencies() {
  const healths = await Promise.all(dependencies.map(getDependencyHealth))

  return (
    <section className="mb-6 grid items-start gap-4 sm:grid-cols-2">
      {healths.map((health) => (
        <div
          key={health.id}
          className="rounded-lg border border-border/70 bg-gradient-to-r from-muted/30 to-background p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {health.label}
              </p>
              <p className="font-semibold text-sm">
                {health.provider}
                {health.note ? (
                  <span className="font-normal text-muted-foreground"> · {health.note}</span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusPill status={health.status} />
              <Link
                href={health.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${health.provider} status page`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
          {health.capabilities.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t pt-3">
              {health.capabilities.map((capability) => (
                <li key={capability.label} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground text-xs">{capability.label}</span>
                  <StatusPill status={capability.status} compact />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  )
}
