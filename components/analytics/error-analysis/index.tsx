"use client"

import { ErrorTimelineCard } from "@/components/analytics/error-analysis/error-timeline-card"
import type { TimelineEntry } from "@/lib/types"

interface ErrorAnalysisProps {
  timelineData: TimelineEntry[]
}

export default function ErrorAnalysis({ timelineData }: ErrorAnalysisProps) {
  return <ErrorTimelineCard timelineData={timelineData} />
}
