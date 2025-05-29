"use client"

import { ErrorTimelineCard } from "./error-timeline-card"

interface ErrorAnalysisProps {
  timelineData: Array<{
    date: string
    total: number
    priorities: Array<{
      priority: string
      count: number
    }>
  }>
}

export default function ErrorAnalysis({ timelineData }: ErrorAnalysisProps) {
  return (
    <>
      <ErrorTimelineCard timelineData={timelineData} />
    </>
  )
}
