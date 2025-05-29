import { DurationTimelineCard } from "./duration-timeline-card"
import { DurationPlatformCard } from "./duration-platform-card"
import { DurationDistributionCard } from "./duration-distribution-card"

interface DurationProps {
  durationTimelineData: Array<{
    date: string
    averageDuration: number
    totalDuration: number
    botCount: number
  }>
  platformDurationData: Array<{
    name: string
    value: number
    count: number
  }>
  durationDistributionData: Array<{
    range: string
    count: number
    percentage: number
  }>
  averageDuration: number
}

export default function Duration({
  durationTimelineData,
  platformDurationData,
  durationDistributionData,
  averageDuration
}: DurationProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <DurationTimelineCard durationTimelineData={durationTimelineData} />
      <DurationPlatformCard platformDurationData={platformDurationData} />
      <DurationDistributionCard
        distributionData={durationDistributionData}
        averageDuration={averageDuration}
      />
    </div>
  )
}
