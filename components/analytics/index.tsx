"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { limitOptions } from "@/components/filters/limit-selector"
import { useRouter } from "next/navigation"
import { LIMIT_STORAGE_KEY } from "@/components/filters/limit-selector"
import type { DateValueType } from "react-tailwindcss-datepicker"
import type { FilterState } from "@/lib/types"
import { validateFilterValues, validateDateRange, updateSearchParams } from "@/lib/search-params"
import { useBotStats } from "@/hooks/use-bot-stats"
import { Loader2 } from "lucide-react"
import { genericError } from "@/lib/errors"
import dayjs from "dayjs"
import Filters from "@/components/filters"
import { BotPlatformDistribution } from "@/components/analytics/bot-platform-distribution"
import { BotOverview } from "@/components/analytics/bot-overview"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { TabsList } from "@/components/ui/tabs"
import { BotPerformanceChart } from "./bot-performance-chart"
import { BotErrorAnalysis } from "./bot-error-analysis"
import { formatPercentage } from "@/lib/utils"

export const DEFAULT_LIMIT = limitOptions[0].value

export default function Analytics() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pagination state
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(() => {
    // Initialize from localStorage if available, otherwise use default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LIMIT_STORAGE_KEY)
      return stored && limitOptions.some((option) => option.value === Number(stored))
        ? Number(stored)
        : DEFAULT_LIMIT
    }
    return DEFAULT_LIMIT
  })

  // Initialize date range from URL params or default to last 14 days
  const [dateRange, setDateRange] = useState<DateValueType>(() =>
    validateDateRange(searchParams.get("startDate"), searchParams.get("endDate"))
  )

  // Initialize filters from URL params or empty arrays
  const [filters, setFilters] = useState<FilterState>(() =>
    validateFilterValues(
      searchParams.get("platformFilters"),
      searchParams.get("statusFilters"),
      searchParams.get("userReportedErrorStatusFilters")
    )
  )

  // Update URL when date range or filters change
  useEffect(() => {
    const params = updateSearchParams(searchParams, dateRange, filters)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [dateRange, filters, router, searchParams])

  const { data, isLoading, isError, error, isRefetching } = useBotStats({
    offset: offset * limit,
    limit,
    startDate: dateRange?.startDate ?? null,
    endDate: dateRange?.endDate ?? null,
    filters
  })

  return (
    <div className="relative">
      {/* Loading state - only show full screen loader on initial load */}
      {isLoading && !data ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="flex h-96 items-center justify-center text-destructive">
          Error: {error instanceof Error ? error.message : genericError}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-bold text-2xl">Meeting Bot Analytics</h1>
            <p className="text-muted-foreground text-sm">
              Monitor your meeting bot performance and statistics
            </p>
          </div>
          <Filters
            filters={filters}
            setFilters={setFilters}
            dateRange={dateRange}
            setDateRange={setDateRange}
            limit={limit}
            setLimit={setLimit}
            isRefetching={isRefetching}
          />
          {!data ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No bots found. Please try a different date range or filter.
              </p>
            </div>
          ) : (
            <>
              <BotPlatformDistribution platformDistribution={data.platformDistribution} />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <BotOverview
                  totalBots={data.allBots.length}
                  successfulBots={data.successfulBots.length}
                  errorBots={data.errorBots.length}
                  duration={
                    dateRange?.startDate && dateRange?.endDate
                      ? `${dayjs(dateRange.startDate).format("MMM D")} - ${dayjs(dateRange.endDate).format("MMM D, YYYY")}`
                      : "All time"
                  }
                />
              </div>
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="mb-6 grid grid-cols-2">
                  <TabsTrigger value="performance">Bot Performance</TabsTrigger>
                  <TabsTrigger value="error-analysis">Error Analysis</TabsTrigger>
                </TabsList>
                <TabsContent value="performance" className="space-y-6">
                  <div className="rounded-lg border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Bot Performance</h2>
                      <div className="text-muted-foreground text-sm">
                        Last {data.dailyStats.length} days
                      </div>
                    </div>
                    <div>
                      <BotPerformanceChart dailyStats={data.dailyStats} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="error-analysis" className="space-y-6">
                  <div className="rounded-lg border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Error Distribution</h2>
                      <div className="rounded-full bg-destructive/10 px-3 py-1 text-destructive text-sm">
                        {formatPercentage(
                          data.errorTypes.reduce((acc, error) => acc + error.percentage, 0)
                        )}{" "}
                        Error Rate
                      </div>
                    </div>
                    <BotErrorAnalysis errorTypes={data.errorTypes} />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}
    </div>
  )
}
