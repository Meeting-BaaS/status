import { useQuery } from "@tanstack/react-query"
import { fetchBotStats } from "@/lib/api"
import dayjs from "dayjs"
import type { FilterState, FormattedBotData } from "@/lib/types"
import {
  getErrorDistribution,
  getErrorTable,
  getPlatformDistribution,
  getPlatformFromUrl,
  getTimelineData,
  getDurationTimelineData,
  getPlatformDurationData,
  getDurationDistributionData,
  getIssueReportData
} from "@/lib/format-bot-stats"
import { groupBy } from "lodash-es"
import { calculateAverageDuration } from "@/lib/utils"

interface UseBotStatsParams {
  offset: number
  limit: number
  startDate: Date | null
  endDate: Date | null
  filters: FilterState
}

export function useBotStats({ offset, limit, startDate, endDate, filters }: UseBotStatsParams) {
  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["bot-stats", { offset, limit, startDate, endDate, filters }],
    queryFn: () => {
      const {
        platformFilters,
        statusFilters,
        userReportedErrorStatusFilters,
        errorCategoryFilters,
        errorPriorityFilters
      } = filters
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
        }),
        ...(errorCategoryFilters.length && {
          status_category: errorCategoryFilters.join(",")
        }),
        ...(errorPriorityFilters.length && {
          status_priority: errorPriorityFilters.join(",")
        })
      }

      return fetchBotStats(queryParams)
    },
    select: (data) => {
      const formattedBots: FormattedBotData[] = data.bots.map((bot) => ({
        ...bot,
        platform: getPlatformFromUrl(bot.meeting_url)
      }))
      // Get bots with errors and warnings
      const errorBots = formattedBots.filter((bot) =>
        ["error", "warning"].includes(bot.status.type)
      )

      // Group bots by status value
      const errorDistribution = groupBy(errorBots, "status.value")

      // Bot distribution by platform
      const platformDistribution = getPlatformDistribution(formattedBots)

      // Bot distribution by error status
      const errorDistributionData = getErrorDistribution(errorDistribution, errorBots)

      // Transform data for error table
      const errorTableData = getErrorTable(errorDistribution)

      // Transform data for error timeline
      const timelineData = getTimelineData(formattedBots)

      // Transform data for average duration timeline
      const durationTimelineData = getDurationTimelineData(formattedBots)

      // Duration distribution by platform
      const platformDurationData = getPlatformDurationData(formattedBots)

      // Duration distribution by duration buckets (15m, 30m, 45m, 60m, 60m+)
      const durationDistributionData = getDurationDistributionData(formattedBots)

      // Issue reports
      const issueReportData = getIssueReportData(formattedBots)

      return {
        has_more: data.has_more,
        allBots: formattedBots,
        errorBots,
        platformDistribution,
        errorDistributionData,
        errorTableData,
        timelineData,
        durationTimelineData,
        platformDurationData,
        durationDistributionData,
        issueReportData,
        averageDuration: calculateAverageDuration(formattedBots)
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    placeholderData: (previousData) => previousData
  })

  return {
    data,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch
  }
}
