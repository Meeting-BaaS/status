"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"
import type { ErrorType } from "@/lib/types"
import { formatNumber, formatPercentage } from "@/lib/utils"
import { SortAsc, SortDesc } from "lucide-react"
import { useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

interface BotErrorAnalysisProps {
  errorTypes: ErrorType[]
}

export function BotErrorAnalysis({ errorTypes }: BotErrorAnalysisProps) {
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedError, setSelectedError] = useState<string | null>(null)

  // Sort error types by count
  const sortedErrorTypes = [...errorTypes].sort((a, b) => {
    return sortOrder === "desc"
      ? b.count - a.count
      : a.count - b.count
  })

  // Filter by selection if needed
  const filteredErrorTypes = selectedError
    ? sortedErrorTypes.filter(error => error.type === selectedError)
    : sortedErrorTypes

  // Calculate totals
  const totalErrors = errorTypes.reduce((sum, type) => sum + type.count, 0)

  // Create chart config for visualization
  const chartConfig = errorTypes.reduce(
    (acc, error, index) => {
      return Object.assign(acc, {
        [error.type.toLowerCase().replace(/\s+/g, "_")]: {
          label: error.type,
          color: `hsl(var(--chart-${(index % 10) + 1}))`
        }
      })
    },
    {} as ChartConfig
  )

  // Transform data for recharts
  const chartData = errorTypes.map((error) => ({
    name: error.type.toLowerCase().replace(/\s+/g, "_"),
    value: error.count,
    label: error.type,
    percentage: error.percentage
  }))

  const toggleSort = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Error Distribution</h3>
          <p className="text-muted-foreground text-sm">
            Showing {formatNumber(totalErrors)} errors across {errorTypes.length} categories
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedError(null)}
              className="text-xs"
            >
              Clear Filter
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
            className="gap-1 text-xs"
          >
            Sort {sortOrder === "desc" ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Error Categories</h4>
                <span className="text-xs text-muted-foreground">Count</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {sortedErrorTypes.map((error) => (
                  <button
                    key={error.type}
                    className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors ${selectedError === error.type ? "bg-secondary" : ""
                      }`}
                    onClick={() => setSelectedError(error.type === selectedError ? null : error.type)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: chartConfig[error.type.toLowerCase().replace(/\s+/g, "_")]?.color
                        }}
                      />
                      <span className="text-sm truncate max-w-[150px]" title={error.type}>
                        {error.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {formatNumber(error.count)}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {formatPercentage(error.percentage)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="h-80">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        selectedError
                          ? chartData.filter(d => d.label === selectedError)
                          : chartData
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={`var(--color-${entry.name})`}
                          opacity={selectedError && selectedError !== entry.label ? 0.3 : 1}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: unknown) => formatNumber(Number(value))}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-4xl">
                    {formatNumber(selectedError
                      ? errorTypes.find(e => e.type === selectedError)?.count || 0
                      : totalErrors
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {selectedError || "Total Errors"}
                  </span>
                </div>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
