import type { ColumnDef } from "@tanstack/react-table"
import { SortableHeader } from "@/components/ui/sortable-header"
import { getErrorMessageColor } from "@/lib/utils"

export interface ErrorTableData {
  type: string
  message: string
  category?: string
  priority?: string
  platforms: Record<string, number>
  count: number
}

type Priority = "critical" | "high" | "medium" | "low"
const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
}

export const errorTableColumns: ColumnDef<ErrorTableData>[] = [
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} title="Error Type" />,
    cell: ({ row }) => {
      const { type, category, priority } = row.original
      return (
        <div className="flex flex-col">
          <span className="mb-1">{type}</span>
          {category && <span className="text-muted-foreground text-xs">Category: {category}</span>}
          {priority && (
            <span className="text-muted-foreground text-xs capitalize">Priority: {priority}</span>
          )}
        </div>
      )
    }
  },
  // These two columns are hidden by default
  // They are used for sorting
  {
    accessorKey: "category",
    header: "Category"
  },
  {
    accessorKey: "priority",
    header: "Priority",
    sortingFn: (rowA, rowB) => {
      const priorityA = (rowA.original.priority || "medium") as Priority
      const priorityB = (rowB.original.priority || "medium") as Priority
      return priorityOrder[priorityB] - priorityOrder[priorityA]
    }
  },
  {
    accessorKey: "message",
    header: ({ column }) => <SortableHeader column={column} title="Aggregated Error Message" />,
    cell: ({ row }) => {
      const { message, priority, category } = row.original
      return (
        <span className="whitespace-normal break-words text-sm">
          <span className={getErrorMessageColor(message, priority, category)}>{message}</span>
        </span>
      )
    }
  },
  {
    accessorKey: "platforms",
    header: ({ column }) => <SortableHeader column={column} title="Platform" />,
    cell: ({ row }) => {
      const { platforms } = row.original
      return (
        <div className="flex flex-wrap gap-1">
          {Object.entries(platforms).map(([platform, count]) => (
            <span
              key={platform}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize"
              style={{
                backgroundColor:
                  platform === "zoom"
                    ? "rgba(14, 113, 235, 0.1)"
                    : platform === "teams"
                      ? "rgba(98, 100, 167, 0.1)"
                      : platform === "google meet"
                        ? "rgba(0, 172, 71, 0.1)"
                        : "rgba(100, 116, 139, 0.1)",
                color:
                  platform === "zoom"
                    ? "#0E71EB"
                    : platform === "teams"
                      ? "#6264A7"
                      : platform === "google meet"
                        ? "#00AC47"
                        : "#64748B"
              }}
            >
              {platform}: {count}
            </span>
          ))}
        </div>
      )
    }
  },
  {
    accessorKey: "count",
    header: ({ column }) => <SortableHeader column={column} title="Count" isNumber centered />,
    cell: ({ row }) => {
      return <div className="text-center">{row.original.count}</div>
    }
  }
]
