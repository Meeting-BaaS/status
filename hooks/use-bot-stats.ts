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
import { groupBy, map } from "lodash-es"
import { getPriorityForError } from "@/lib/utils"
import { allErrorCategories } from "@/lib/filter-options"

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

      const successfulBots = formattedBots.filter(
        (bot) => bot.status.type.toLowerCase() === "success"
      )
      const errorBots = formattedBots.filter((bot) =>
        ["error", "warning"].includes(bot.status.type)
      )

      const distribution = groupBy(formattedBots, "platform")

      const platformDistribution: PlatformDistribution[] = Object.entries(distribution).map(
        ([key, value]) => {
          const successCount = value.filter(
            (bot) => bot.status.type.toLowerCase() === "success"
          ).length
          const errorCount = value.filter((bot) => bot.status.type.toLowerCase() === "error").length
          const warningCount = value.filter(
            (bot) => bot.status.type.toLowerCase() === "warning"
          ).length
          const otherCount = value.length - successCount - errorCount - warningCount

          return {
            platform: key,
            count: value.length,
            percentage: (value.length / formattedBots.length) * 100,
            statusDistribution: {
              success: {
                count: successCount,
                percentage: (successCount / value.length) * 100
              },
              error: {
                count: errorCount,
                percentage: (errorCount / value.length) * 100
              },
              warning: {
                count: warningCount,
                percentage: (warningCount / value.length) * 100
              },
              other: {
                count: otherCount,
                percentage: (otherCount / value.length) * 100
              }
            }
          }
        }
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

      // Transform error distribution data
      const errorDistribution = groupBy(errorBots, "status.value")
      const errorDistributionData = map(errorDistribution, (bots, value) => ({
        name: value,
        value: bots.length,
        percentage: (bots.length / errorBots.length) * 100
      }))

      // Transform data for error table
      const errorTableData = map(errorDistribution, (bots, value) => {
        const platforms = groupBy(bots, "platform")
        const platformCounts = Object.fromEntries(
          Object.entries(platforms).map(([platform, platformBots]) => [
            platform,
            platformBots.length
          ])
        )

        // Get status information from the first bot in the group as they all would have the same status
        const { status } = bots[0]
        const category = status.category || "unknown_error"
        const details = status.details || `${category} error`

        // Normalize error message and type for webhook and stalled errors
        let normalizedType = value
        let normalizedMessage = details

        if (category === "webhook_error") {
          // Group webhook errors by their status codes
          const webhookGroups: Record<string, { count: number; messages: string[] }> = {
            other: { count: 0, messages: [] }
          }

          // Extract status codes from each bot's details
          for (const bot of bots) {
            const statusMatch = bot.status.details?.match(/Status: (\d+)/)
            if (statusMatch?.[1]) {
              const statusCode = statusMatch[1]
              if (!webhookGroups[statusCode]) {
                webhookGroups[statusCode] = { count: 0, messages: [] }
              }
              webhookGroups[statusCode].count++
              webhookGroups[statusCode].messages.push(bot.status.details || "")
            } else {
              // Handle webhook errors without status codes
              webhookGroups.other.count++
              webhookGroups.other.messages.push(bot.status.details || "Webhook Error")
            }
          }

          // Create separate entries for each status code group
          const groups = Object.entries(webhookGroups)
            .filter(([_, { count }]) => count > 0) // Only include groups with errors
            .map(([statusCode, { count, messages }]) => {
              const type =
                statusCode === "other" ? "Webhook Error (Other)" : `Webhook Error (${statusCode})`
              const message =
                statusCode === "other"
                  ? messages[0] // Use the actual error message for other errors
                  : `Status: ${statusCode} - ${messages[0]}` // Use first message as template for status errors

              return {
                type,
                message,
                count,
                platforms: platformCounts
              }
            })

          // If we have multiple groups, we need to split this into multiple entries
          if (groups.length > 1) {
            return groups.map((group) => ({
              ...group,
              category: allErrorCategories.find((c) => c.value === category)?.label || category,
              priority: getPriorityForError(category)
            }))
          }

          // If we only have one group, use its data
          if (groups.length === 1) {
            normalizedType = groups[0].type
            normalizedMessage = groups[0].message
          }
        } else if (category === "stalled_error") {
          // Group stalled errors by their time ranges
          const stalledGroups = {
            under24h: [] as number[],
            under48h: [] as number[],
            over48h: [] as number[]
          }

          // Extract hours from each bot's details
          for (const bot of bots) {
            const hoursMatch = bot.status.details?.match(/pending for (\d+\.?\d*) hours/)
            if (hoursMatch?.[1]) {
              const hours = Number.parseFloat(hoursMatch[1])
              if (hours < 24) {
                stalledGroups.under24h.push(hours)
              } else if (hours < 48) {
                stalledGroups.under48h.push(hours)
              } else {
                stalledGroups.over48h.push(hours)
              }
            }
          }

          // Create separate entries for each non-empty group
          const groups = Object.entries(stalledGroups)
            .filter(([_, values]) => values.length > 0)
            .map(([key, values]) => {
              const avgHours = values.reduce((sum, hours) => sum + hours, 0) / values.length
              const formattedHours = avgHours.toFixed(1)
              let type: string

              switch (key) {
                case "under24h":
                  type = "Stalled (< 24h)"
                  break
                case "under48h":
                  type = "Stalled (24-48h)"
                  break
                case "over48h":
                  type = "Stalled (> 48h)"
                  break
                default:
                  type = "Stalled"
              }

              const message = `Bot${values.length > 1 ? "s" : ""} has been pending for an average of ${formattedHours} hours`

              return {
                type,
                message,
                count: values.length,
                platforms: platformCounts
              }
            })

          // If we have multiple groups, we need to split this into multiple entries
          if (groups.length > 1) {
            return groups.map((group) => ({
              ...group,
              category: allErrorCategories.find((c) => c.value === category)?.label || category,
              priority: getPriorityForError(category)
            }))
          }

          // If we only have one group, use its data
          if (groups.length === 1) {
            normalizedType = groups[0].type
            normalizedMessage = groups[0].message
          }
        }

        // Determine priority based on category
        const priority = getPriorityForError(category)

        return {
          type: normalizedType,
          message: normalizedMessage,
          category: allErrorCategories.find((c) => c.value === category)?.label || category,
          priority,
          platforms: platformCounts,
          count: bots.length
        }
      }).flat() // Flatten the array in case we have multiple stalled error entries

      return {
        has_more: data.has_more,
        allBots: formattedBots,
        successfulBots,
        errorBots,
        platformDistribution,
        dailyStats,
        errorTypes,
        errorDistributionData,
        errorTableData
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
