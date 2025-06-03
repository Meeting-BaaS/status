import { DurationTimelineCard } from "@/components/analytics/duration/duration-timeline-card"
import { DurationPlatformCard } from "@/components/analytics/duration/duration-platform-card"
import { DurationDistributionCard } from "@/components/analytics/duration/duration-distribution-card"
import type {
  DurationTimelineEntry,
  PlatformDurationEntry,
  DurationDistributionEntry,
  ErrorDistribution
} from "@/lib/types"
import { ErrorDistributionPopover } from "@/components/analytics/error-distribution-popover"

interface DurationProps {
  durationTimelineData: DurationTimelineEntry[]
  platformDurationData: PlatformDurationEntry[]
  durationDistributionData: DurationDistributionEntry[]
  errorDistributionData: ErrorDistribution[]
}

export default function Duration({
  durationTimelineData,
  platformDurationData,
  durationDistributionData,
  errorDistributionData
}: DurationProps) {
  return (
    <>
      <div className="flex md:justify-end">
        <ErrorDistributionPopover errorDistributionData={errorDistributionData} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DurationTimelineCard durationTimelineData={durationTimelineData} />
        <DurationPlatformCard platformDurationData={platformDurationData} />
        <DurationDistributionCard distributionData={durationDistributionData} />
      </div>
    </>
  )
}
