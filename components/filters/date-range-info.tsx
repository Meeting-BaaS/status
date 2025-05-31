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
    return <Skeleton className="h-5 w-full max-w-96" />
  }
  return (
    <div className="text-muted-foreground text-sm">
      Results from {limit} bots between {dayjs(lastBotDate).utc().local().format("D MMM YYYY")} to{" "}
      {dayjs(firstBotDate).utc().local().format("D MMM YYYY")}
    </div>
  )
}
