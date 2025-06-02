"use client"

import { ErrorTimelineCard } from "@/components/analytics/error-analysis/error-timeline-card"
import type { TimelineEntry, ErrorDistribution } from "@/lib/types"
import { ErrorDistributionPopover } from "@/components/analytics/error-distribution-popover"

interface ErrorAnalysisProps {
  timelineData: TimelineEntry[]
  errorDistributionData: ErrorDistribution[]
}

export default function ErrorAnalysis({ timelineData, errorDistributionData }: ErrorAnalysisProps) {
  return (
    <>
      <div className="flex md:justify-end">
        <ErrorDistributionPopover errorDistributionData={errorDistributionData} />
      </div>
      <ErrorTimelineCard timelineData={timelineData} />
    </>
  )
}
