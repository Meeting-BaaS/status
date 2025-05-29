import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { errorTableColumns, type ErrorTableData } from "./error-table-columns"

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
  return (
    <Card className="dark:bg-baas-black">
      <CardHeader>
        <CardTitle>Error Details</CardTitle>
        <CardDescription>Detailed breakdown of errors across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={errorTableColumns}
          data={data}
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
