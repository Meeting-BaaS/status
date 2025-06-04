import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { errorTableColumns } from "@/components/analytics/overview/error-table-columns"
import { useSelectedErrorContext } from "@/hooks/use-selected-error-context"
import { useState, useEffect } from "react"
import { filterAndGroupErrorBots, getErrorTable } from "@/lib/format-bot-stats"
import { SelectedErrorBadge } from "@/components/analytics/selected-error-badge"
import type { SortingState } from "@tanstack/react-table"
import type { ErrorTableEntry } from "@/lib/types"

export const ERROR_TABLE_SORT_STORAGE_KEY = "analytics-error-table-sort"

interface ErrorTableCardProps {
  data: ErrorTableEntry[]
}

const sortOptions = [
  { label: "Count (Highest)", value: "count-desc" },
  { label: "Category (A-Z)", value: "category-asc" },
  { label: "Category (Z-A)", value: "category-desc" },
  { label: "Priority (Highest)", value: "priority-asc" },
  { label: "Priority (Lowest)", value: "priority-desc" }
]

// Convert sort option string to SortingState
const getSortState = (sortOption: string): SortingState => {
  const [id, direction] = sortOption.split("-")
  return [{ id, desc: direction === "desc" }]
}

// Convert SortingState to sort option string
const getSortOption = (sorting: SortingState): string => {
  if (!sorting.length) return "count-desc"
  const { id, desc } = sorting[0]
  return `${id}-${desc ? "desc" : "asc"}`
}

export function ErrorTableCard({ data }: ErrorTableCardProps) {
  const { filteredBots } = useSelectedErrorContext()
  const [filteredData, setFilteredData] = useState(data)
  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === "undefined") return getSortState("count-desc")

    const stored = localStorage.getItem(ERROR_TABLE_SORT_STORAGE_KEY)
    if (!stored) return getSortState("count-desc")

    // Validate that the stored value is a valid sort option
    return sortOptions.some((option) => option.value === stored)
      ? getSortState(stored)
      : getSortState("count-desc")
  })

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ERROR_TABLE_SORT_STORAGE_KEY && e.newValue) {
        // Validate that the new value is a valid sort option
        if (sortOptions.some((option) => option.value === e.newValue)) {
          setSorting(getSortState(e.newValue))
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  useEffect(() => {
    const { errorDistribution } = filterAndGroupErrorBots(filteredBots)
    const errorTableData = getErrorTable(errorDistribution)
    setFilteredData(errorTableData)
  }, [filteredBots])

  // Handle sort changes from the table
  const handleSortingChange = (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState)
  ) => {
    const newSorting =
      typeof updaterOrValue === "function" ? updaterOrValue(sorting) : updaterOrValue
    setSorting(newSorting)
    const sortOption = getSortOption(newSorting)
    try {
      localStorage.setItem(ERROR_TABLE_SORT_STORAGE_KEY, sortOption)
    } catch (error) {
      console.warn("Failed to save sort preference:", error)
    }
  }

  return (
    <Card className="dark:bg-baas-black">
      <CardHeader className="z-10 md:mr-36">
        <CardTitle className="flex items-center gap-2">
          Error Details
          <SelectedErrorBadge />
        </CardTitle>
        <CardDescription className="-mt-1.5">
          Detailed breakdown of errors across platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={errorTableColumns}
          data={filteredData}
          defaultSort={sorting}
          defaultColumnVisibility={{
            category: false,
            priority: false
          }}
          sortOptions={sortOptions}
          onSortingChange={handleSortingChange}
        />
      </CardContent>
    </Card>
  )
}
