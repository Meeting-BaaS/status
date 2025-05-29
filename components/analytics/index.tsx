"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { LIMIT_STORAGE_KEY, limitOptions } from "@/components/filters/limit-selector"
import { updateSearchParams, validateDateRange } from "@/lib/search-params"
import { validateFilterValues } from "@/lib/search-params"
import type { FilterState } from "@/lib/types"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { useBotStats } from "@/hooks/use-bot-stats"
import { Loader2 } from "lucide-react"
import { genericError } from "@/lib/errors"
import Filters from "@/components/filters"
import { ErrorDistributionCard } from "@/components/analytics/error-distribution-card"
import { PlatformDistributionCard } from "@/components/analytics/platform-distribution-card"
import { PlatformPerformanceCard } from "@/components/analytics/platform-performance-card"
import { ErrorTableCard } from "@/components/analytics/error-table-card"
import { MainTabs } from "@/components/ui/main-tabs"
import ErrorAnalysis from "@/components/analytics/error-analysis"
import Duration from "@/components/analytics/duration"

export const DEFAULT_LIMIT = limitOptions[0].value

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "error-analysis", label: "Error Analysis" },
  { id: "duration", label: "Duration" },
  { id: "issue-reports", label: "Issue Reports" }
]

export function Analytics() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pagination state
  const [offset, setOffset] = useState(0)
  const [currentTab, setCurrentTab] = useState(tabs[0].id)
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
      searchParams.get("userReportedErrorStatusFilters"),
      searchParams.get("errorCategoryFilters"),
      searchParams.get("errorPriorityFilters")
    )
  )

  // Update URL when date range or filters change
  useEffect(() => {
    const params = updateSearchParams(searchParams, dateRange, filters)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [dateRange, filters, router, searchParams])

  const { data, isLoading, isError, error, isRefetching, refetch } = useBotStats({
    offset: offset * limit,
    limit,
    startDate: dateRange?.startDate ?? null,
    endDate: dateRange?.endDate ?? null,
    filters
  })

  const renderTabContent = useMemo(() => {
    if (!data) return null

    switch (currentTab) {
      case "overview":
        return (
          <>
            <div className="flex flex-col gap-4 md:flex-row">
              <PlatformDistributionCard
                platformDistribution={data.platformDistribution}
                totalBots={data.allBots.length}
              />
              <PlatformPerformanceCard platformDistribution={data.platformDistribution} />
            </div>
            <ErrorDistributionCard
              errorDistributionData={data.errorDistributionData}
              totalErrors={data.errorBots.length}
            />
            <ErrorTableCard data={data.errorTableData} />
          </>
        )
      case "error-analysis":
        return <ErrorAnalysis timelineData={data.timelineData} />
      case "duration":
        return (
          <Duration
            durationTimelineData={data.durationTimelineData}
            platformDurationData={data.platformDurationData}
            durationDistributionData={data.durationDistributionData}
            averageDuration={data.averageDuration}
          />
        )
      default:
        return null
    }
  }, [currentTab, data])

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
            <h1 className="font-bold text-3xl">Meeting Bot Analytics</h1>
            <p className="text-muted-foreground">
              Monitor your meeting bot performance and statistics - Change this description
            </p>
          </div>
          <Filters
            filters={filters}
            setFilters={setFilters}
            dateRange={dateRange}
            setDateRange={setDateRange}
            limit={limit}
            setLimit={setLimit}
            refetch={refetch}
            isRefetching={isRefetching}
          />
          {!data || data.allBots.length === 0 ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-muted-foreground text-sm">
                No bots found. Please try a different date range or filter.
              </p>
            </div>
          ) : (
            <>
              <MainTabs
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                tabs={tabs}
                containerClassName="mb-4"
              />
              <div className="space-y-4">{renderTabContent}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
