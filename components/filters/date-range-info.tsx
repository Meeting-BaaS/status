import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { Skeleton } from "@/components/ui/skeleton"

dayjs.extend(utc)

interface DateRangeInfoProps {
  firstBotDate: string
  lastBotDate: string
  limit: number
  isRefetching: boolean
}

export function DateRangeInfo({
  firstBotDate,
  lastBotDate,
  limit,
  isRefetching
}: DateRangeInfoProps) {
  if (isRefetching) {
    return <Skeleton className="h-4 w-96" />
  }
  return (
    <div className="text-muted-foreground text-sm">
      Results from {limit} bots between {dayjs(lastBotDate).utc().format("D MMM YYYY")} to{" "}
      {dayjs(firstBotDate).utc().format("D MMM YYYY")}
    </div>
  )
}
