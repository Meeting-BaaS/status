import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import {
  errorTableColumns,
  type ErrorTableData
} from "@/components/analytics/overview/error-table-columns"
import { useSelectedErrorContext } from "@/hooks/use-selected-error-context"
import { useState } from "react"
import { useEffect } from "react"
import { filterAndGroupErrorBots, getErrorTable } from "@/lib/format-bot-stats"
import { SelectedErrorBadge } from "@/components/analytics/selected-error-badge"

interface ErrorTableCardProps {
  data: ErrorTableData[]
}

const sortOptions = [
  { label: "Count (Highest)", value: "count-desc" },
  { label: "Category (A-Z)", value: "category-asc" },
  { label: "Category (Z-A)", value: "category-desc" },
  { label: "Priority (Highest)", value: "priority-desc" },
  { label: "Priority (Lowest)", value: "priority-asc" }
]

export function ErrorTableCard({ data }: ErrorTableCardProps) {
  const { filteredBots } = useSelectedErrorContext()
  const [filteredData, setFilteredData] = useState(data)

  useEffect(() => {
    const { errorDistribution } = filterAndGroupErrorBots(filteredBots)
    const errorTableData = getErrorTable(errorDistribution)
    setFilteredData(errorTableData)
  }, [filteredBots])

  return (
    <Card className="dark:bg-baas-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Error Details
          <SelectedErrorBadge />
        </CardTitle>
        <CardDescription>Detailed breakdown of errors across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={errorTableColumns}
          data={filteredData}
          defaultSort={[{ id: "count", desc: true }]}
          defaultColumnVisibility={{
            category: false,
            priority: false
          }}
          sortOptions={sortOptions}
        />
      </CardContent>
    </Card>
  )
}
