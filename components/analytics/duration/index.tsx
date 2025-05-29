import { DurationTimelineCard } from "@/components/analytics/duration/duration-timeline-card"
import { DurationPlatformCard } from "@/components/analytics/duration/duration-platform-card"
import { DurationDistributionCard } from "@/components/analytics/duration/duration-distribution-card"
import type {
  DurationTimelineEntry,
  PlatformDurationEntry,
  DurationDistributionEntry
} from "@/lib/types"

interface DurationProps {
  durationTimelineData: DurationTimelineEntry[]
  platformDurationData: PlatformDurationEntry[]
  durationDistributionData: DurationDistributionEntry[]
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
