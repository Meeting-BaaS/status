import { useQuery } from "@tanstack/react-query"
import { fetchBotStats } from "@/lib/api"
import dayjs from "dayjs"
import type {
  DailyStats,
  ErrorType,
  FilterState,
  FormattedBotData,
  PlatformDistribution
} from "@/lib/types"
import { getPlatformFromUrl } from "@/lib/format-bot-stats"
import { groupBy } from "lodash"

interface UseBotStatsParams {
  offset: number
  limit: number
  startDate: Date | null
  endDate: Date | null
  filters: FilterState
}

export function useBotStats({ offset, limit, startDate, endDate, filters }: UseBotStatsParams) {
  const { data, isLoading, isError, error, isRefetching } = useQuery({
    queryKey: ["bot-stats", { offset, limit, startDate, endDate, filters }],
    queryFn: () => {
      const { platformFilters, statusFilters, userReportedErrorStatusFilters } = filters
      const queryParams = {
        offset,
        limit,
        start_date: startDate ? `${dayjs(startDate).format("YYYY-MM-DD")}T00:00:00` : "",
        end_date: endDate ? `${dayjs(endDate).format("YYYY-MM-DD")}T23:59:59` : "",
        ...(platformFilters.length && {
          meeting_url_contains: filters.platformFilters.join(",")
        }),
        ...(statusFilters.length && { status_type: statusFilters.join(",") }),
        ...(userReportedErrorStatusFilters.length && {
          user_reported_error_json: `${userReportedErrorStatusFilters.join(",")}`
        })
      }

      return fetchBotStats(queryParams)
    },
    select: (data) => {
      const formattedBots: FormattedBotData[] = data.bots.map((bot) => ({
        ...bot,
        platform: getPlatformFromUrl(bot.meeting_url)
      }))

      const successfulBots = formattedBots.filter(
        (bot) => bot.status.type.toLowerCase() === "success"
      )
      const errorBots = formattedBots.filter((bot) => bot.status.type.toLowerCase() === "error")

      const distribution = groupBy(formattedBots, "platform")

      const platformDistribution: PlatformDistribution[] = Object.entries(distribution).map(
        ([key, value]) => ({
          platform: key,
          count: value.length,
          percentage: (value.length / formattedBots.length) * 100
        })
      )

      const statsByDate = groupBy(formattedBots, (bot) =>
        dayjs(bot.created_at).format("YYYY-MM-DD")
      )

      const dailyStats: DailyStats[] = Object.entries(statsByDate).map(([date, bots]) => {
        const platformCounts = groupBy(bots, "platform")
        return {
          date,
          totalBots: bots.length,
          errorBots: bots.filter((bot) => bot.status.type.toLowerCase() === "error").length,
          platforms: Object.fromEntries(
            Object.entries(platformCounts).map(([platform, bots]) => [platform, bots.length])
          )
        }
      })

      const errorCategories = groupBy(errorBots, "status.category")
      const errorTypes: ErrorType[] = Object.entries(errorCategories).map(([key, value]) => ({
        type: key,
        count: value.length,
        percentage: (value.length / errorBots.length) * 100
      }))

      return {
        has_more: data.has_more,
        allBots: formattedBots,
        successfulBots,
        errorBots,
        platformDistribution,
        dailyStats,
        errorTypes
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData
  })

  return {
    data,
    isLoading,
    isError,
    error,
    isRefetching
  }
}
