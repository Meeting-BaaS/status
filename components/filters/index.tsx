import { AdditionalFilters } from "@/components/filters/additional-filters"
import { DateRangeFilter } from "@/components/filters/date-range-filter"
import type { FilterState } from "@/lib/types"
import { Loader2, RefreshCw } from "lucide-react"
import type { DateRangeType } from "react-tailwindcss-datepicker"
import { LimitSelector } from "./limit-selector"
import { Button } from "../ui/button"

interface FiltersProps {
  filters: FilterState
  setFilters: (filters: FilterState) => void
  dateRange: DateRangeType | null
  setDateRange: (dateRange: DateRangeType | null) => void
  limit: number
  setLimit: (limit: number) => void
  refetch: () => void
  isRefetching: boolean
}

export default function Filters({
  filters,
  setFilters,
  dateRange,
  setDateRange,
  limit,
  setLimit,
  refetch,
  isRefetching
}: FiltersProps) {
  return (
    <div className="my-4 flex flex-col justify-between gap-4 md:flex-row">
      <div className="flex w-full items-center gap-2 md:w-1/2">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label={isRefetching ? "Refreshing data" : "Refresh data"}
        >
          {isRefetching ? <Loader2 className="animate-spin text-primary" /> : <RefreshCw />}
        </Button>
      </div>
      <div className="flex w-full items-center gap-2 md:w-1/3 lg:w-1/4 xl:w-1/5">
        <LimitSelector value={limit} onChange={setLimit} />
        <AdditionalFilters filters={filters} setFilters={setFilters} />
      </div>
    </div>
  )
}
