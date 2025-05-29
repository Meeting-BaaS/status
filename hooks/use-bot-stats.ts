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
        // Get status information from the first bot in the group as they all would have the same status
        const { status } = bots[0]
        const category = status.category || "unknown_error"
        const details = status.details || `${category} error`

        // Normalize error message and type for webhook and stalled errors
        let normalizedType = value
        let normalizedMessage = details
        let normalizedGroups: Array<{
          type: string
          message: string
          bots: typeof bots
        }> = []
        let finalBots = bots

        if (category === "webhook_error") {
          // Group webhook errors by their status codes
          const webhookGroups: Record<
            string,
            { count: number; messages: string[]; bots: typeof bots }
          > = {
            other: { count: 0, messages: [], bots: [] }
          }

          // Extract status codes from each bot's details
          for (const bot of bots) {
            const statusMatch = bot.status.details?.match(/Status: (\d+)/)
            if (statusMatch?.[1]) {
              const statusCode = statusMatch[1]
              if (!webhookGroups[statusCode]) {
                webhookGroups[statusCode] = { count: 0, messages: [], bots: [] }
              }
              webhookGroups[statusCode].count++
              webhookGroups[statusCode].messages.push(bot.status.details || "")
              webhookGroups[statusCode].bots.push(bot)
            } else {
              // Handle webhook errors without status codes
              webhookGroups.other.count++
              webhookGroups.other.messages.push(bot.status.details || "Webhook Error")
              webhookGroups.other.bots.push(bot)
            }
          }

          // Create separate entries for each status code group
          normalizedGroups = Object.entries(webhookGroups)
            .filter(([_, { count }]) => count > 0) // Only include groups with errors
            .map(([statusCode, { count, messages, bots }]) => {
              const type =
                statusCode === "other" ? "Webhook Error (Other)" : `Webhook Error (${statusCode})`
              const message =
                statusCode === "other"
                  ? messages[0] // Use the actual error message for other errors
                  : `Status: ${statusCode} - ${messages[0]}` // Use first message as template for status errors

              return {
                type,
                message,
                bots
              }
            })

          // If we have multiple groups, we need to split this into multiple entries
          if (normalizedGroups.length > 1) {
            return normalizedGroups.map((group) => {
              const platforms = groupBy(group.bots, "platform")
              const platformCounts = Object.fromEntries(
                Object.entries(platforms).map(([platform, platformBots]) => [
                  platform,
                  platformBots.length
                ])
              )

              return {
                ...group,
                originalType: value,
                category: allErrorCategories.find((c) => c.value === category)?.label || category,
                priority: getPriorityForError(category),
                platforms: platformCounts,
                count: group.bots.length
              }
            })
          }

          // If we only have one group, use its data
          if (normalizedGroups.length === 1) {
            normalizedType = normalizedGroups[0].type
            normalizedMessage = normalizedGroups[0].message
            finalBots = normalizedGroups[0].bots
          }
        } else if (category === "stalled_error") {
          // Group stalled errors by their time ranges
          const stalledGroups: Record<string, { values: number[]; bots: typeof bots }> = {
            under24h: { values: [], bots: [] },
            under48h: { values: [], bots: [] },
            over48h: { values: [], bots: [] }
          }

          // Extract hours from each bot's details
          for (const bot of bots) {
            const hoursMatch = bot.status.details?.match(/pending for (\d+\.?\d*) hours/)
            if (hoursMatch?.[1]) {
              const hours = Number.parseFloat(hoursMatch[1])
              if (hours < 24) {
                stalledGroups.under24h.values.push(hours)
                stalledGroups.under24h.bots.push(bot)
              } else if (hours < 48) {
                stalledGroups.under48h.values.push(hours)
                stalledGroups.under48h.bots.push(bot)
              } else {
                stalledGroups.over48h.values.push(hours)
                stalledGroups.over48h.bots.push(bot)
              }
            }
          }

          // Create separate entries for each non-empty group
          normalizedGroups = Object.entries(stalledGroups)
            .filter(([_, { values }]) => values.length > 0)
            .map(([key, { values, bots }]) => {
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
                bots
              }
            })

          // If we have multiple groups, we need to split this into multiple entries
          if (normalizedGroups.length > 1) {
            return normalizedGroups.map((group) => {
              const platforms = groupBy(group.bots, "platform")
              const platformCounts = Object.fromEntries(
                Object.entries(platforms).map(([platform, platformBots]) => [
                  platform,
                  platformBots.length
                ])
              )

              return {
                ...group,
                originalType: value,
                category: allErrorCategories.find((c) => c.value === category)?.label || category,
                priority: getPriorityForError(category),
                platforms: platformCounts,
                count: group.bots.length
              }
            })
          }

          // If we only have one group, use its data
          if (normalizedGroups.length === 1) {
            normalizedType = normalizedGroups[0].type
            normalizedMessage = normalizedGroups[0].message
            finalBots = normalizedGroups[0].bots
          }
        }

        // Calculate platform distribution for the final group of bots
        const platforms = groupBy(finalBots, "platform")
        const platformCounts = Object.fromEntries(
          Object.entries(platforms).map(([platform, platformBots]) => [
            platform,
            platformBots.length
          ])
        )

        // Determine priority based on category
        const priority = getPriorityForError(category)

        return {
          type: normalizedType,
          originalType: value,
          message: normalizedMessage,
          category: allErrorCategories.find((c) => c.value === category)?.label || category,
          priority,
          platforms: platformCounts,
          count: finalBots.length
        }
      }).flat() // Flatten the array in case we have multiple stalled error entries

      // Transform data for timeline
      const transformTimelineData = () => {
        // Get all unique dates from the data
        const allDates = Array.from(
          new Set(formattedBots.map((bot) => dayjs(bot.created_at).format("YYYY-MM-DD")))
        ).sort()

        // Get all unique priorities
        const allPriorities = Array.from(
          new Set(
            formattedBots
              .filter((bot) => ["error", "warning"].includes(bot.status.type.toLowerCase()))
              .map((bot) => getPriorityForError(bot.status.category || "unknown_error"))
          )
        )

        // Create a map of dates to error counts by priority
        const dateMap = new Map(
          allDates.map((date) => [
            date,
            allPriorities.reduce(
              (acc, priority) => {
                acc[priority] = 0
                return acc
              },
              {} as Record<string, number>
            )
          ])
        )

        // Fill in the actual counts
        const errorBots = formattedBots.filter((bot) =>
          ["error", "warning"].includes(bot.status.type.toLowerCase())
        )

        for (const bot of errorBots) {
          const date = dayjs(bot.created_at).format("YYYY-MM-DD")
          const priority = getPriorityForError(bot.status.category || "unknown_error")
          const dateData = dateMap.get(date)
          if (dateData) {
            dateData[priority] = (dateData[priority] || 0) + 1
          }
        }

        // Convert to array format for the chart
        return Array.from(dateMap.entries()).map(([date, priorities]) => {
          const total = Object.values(priorities).reduce((sum, count) => sum + count, 0)
          return {
            date,
            total,
            priorities: Object.entries(priorities).map(([priority, count]) => ({
              priority,
              count
            }))
          }
        })
      }

      // Transform data for duration timeline
      const transformDurationTimelineData = () => {
        // Group bots by date
        const botsByDate = groupBy(formattedBots, (bot) =>
          dayjs(bot.created_at).format("YYYY-MM-DD")
        )

        // Calculate average duration and total bot time for each date
        return Object.entries(botsByDate)
          .map(([date, bots]) => {
            // Filter bots with valid durations
            const botsWithDuration = bots.filter((bot) => bot.duration && bot.duration > 0)

            // If no bots have duration for this date, return null
            if (botsWithDuration.length === 0) {
              return null
            }

            const totalDuration = botsWithDuration.reduce((sum, bot) => sum + bot.duration, 0)
            const averageDuration = totalDuration / botsWithDuration.length

            return {
              date,
              averageDuration,
              totalDuration,
              botCount: botsWithDuration.length
            }
          })
          .filter((data): data is NonNullable<typeof data> => data !== null) // Remove null entries
          .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
      }

      // Transform data for platform duration
      const transformPlatformDurationData = () => {
        // Get bots with valid durations
        const botsWithDuration = formattedBots.filter((bot) => bot.duration && bot.duration > 0)

        // Group by platform
        const platformGroups = groupBy(botsWithDuration, "platform")

        // Calculate average duration for each platform
        return Object.entries(platformGroups).map(([platform, bots]) => {
          const totalDuration = bots.reduce((sum, bot) => sum + bot.duration, 0)
          const averageDuration = totalDuration / bots.length

          return {
            name: platform,
            value: averageDuration,
            count: bots.length
          }
        })
      }

      // Transform data for duration distribution
      const transformDurationDistributionData = () => {
        // Get bots with valid durations
        const botsWithDuration = formattedBots.filter((bot) => bot.duration && bot.duration > 0)

        // Define duration ranges in seconds
        const ranges = [
          { min: 0, max: 15 * 60, label: "0-15m" },
          { min: 15 * 60, max: 30 * 60, label: "15-30m" },
          { min: 30 * 60, max: 45 * 60, label: "30-45m" },
          { min: 45 * 60, max: 60 * 60, label: "45-60m" },
          { min: 60 * 60, max: Number.POSITIVE_INFINITY, label: "60m+" }
        ]

        // Count bots in each range
        return ranges.map((range) => {
          const count = botsWithDuration.filter(
            (bot) => bot.duration >= range.min && bot.duration < range.max
          ).length

          return {
            range: range.label,
            count,
            percentage: (count / botsWithDuration.length) * 100
          }
        })
      }

      return {
        has_more: data.has_more,
        allBots: formattedBots,
        successfulBots,
        errorBots,
        platformDistribution,
        dailyStats,
        errorTypes,
        errorDistributionData,
        errorTableData,
        timelineData: transformTimelineData(),
        durationTimelineData: transformDurationTimelineData(),
        platformDurationData: transformPlatformDurationData(),
        durationDistributionData: transformDurationDistributionData(),
        averageDuration:
          formattedBots
            .filter((bot) => bot.duration && bot.duration > 0)
            .reduce((sum, bot) => sum + bot.duration, 0) /
          formattedBots.filter((bot) => bot.duration && bot.duration > 0).length
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
