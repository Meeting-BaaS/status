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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSelectedBots } from "@/contexts/selected-bots-context"
import { chartColors } from "@/lib/chart-colors"
import type { ErrorCategory, ErrorCategoryDistribution, ErrorType, FormattedBotData, UserReportedErrorDistribution } from "@/lib/types"
import { formatNumber, formatPercentage } from "@/lib/utils"
import { Check, ExternalLink, SortAsc, SortDesc } from "lucide-react"
import { useMemo, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

interface BotErrorAnalysisProps {
  errorTypes: ErrorType[]
  userReportedErrors?: UserReportedErrorDistribution[]
  errorBots?: FormattedBotData[]
}

// Map error categories to more readable names
const categoryLabels: Record<ErrorCategory, string> = {
  "system_error": "System Errors",
  "auth_error": "Authentication",
  "capacity_error": "Capacity Issues",
  "connection_error": "Connection Issues",
  "permission_error": "Permission Issues",
  "input_error": "Input Validation",
  "duplicate_error": "Duplicates",
  "webhook_error": "Webhook Issues",
  "api_error": "API Issues",
  "unknown_error": "Unclassified",
  "stalled_error": "Stalled Bots",
  "success": "Success States",
  "pending": "Pending States"
}

// Map priority levels to colors and labels
const priorityColors: Record<string, string> = {
  "critical": "#FE1B4E",    // Error 500
  "high": "#FE809C",        // Error 300
  "medium": "#FFFF93",      // Warning 500
  "low": "#78FFF0",         // Primary 500
  "none": "#5A5A5A"         // Neutral 400
}

export function BotErrorAnalysis({ errorTypes, userReportedErrors = [], errorBots = [] }: BotErrorAnalysisProps) {
  const { selectedBots, toggleBotSelection, isSelected, generateLogsUrl } = useSelectedBots()
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedError, setSelectedError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"type" | "category" | "priority" | "user">("type")

  // Sort error types by count
  const sortedErrorTypes = [...errorTypes].sort((a, b) => {
    return sortOrder === "desc"
      ? b.count - a.count
      : a.count - b.count
  })

  // Filter by selection if needed
  const filteredErrorTypes = useMemo(() => {
    let filtered = sortedErrorTypes

    if (selectedError) {
      filtered = filtered.filter(error => error.type === selectedError)
    }

    if (selectedCategory) {
      filtered = filtered.filter(error => error.category === selectedCategory)
    }

    if (selectedPriority) {
      filtered = filtered.filter(error => error.priority === selectedPriority)
    }

    return filtered
  }, [sortedErrorTypes, selectedError, selectedCategory, selectedPriority])

  // Calculate totals
  const totalErrors = errorTypes.reduce((sum, type) => sum + type.count, 0)

  // Group by category
  const errorsByCategory = useMemo(() => {
    const categories = new Map<ErrorCategory, ErrorType[]>()

    errorTypes.forEach(error => {
      const category = error.category || 'unknown_error'
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)?.push(error)
    })

    // Calculate totals for each category
    return Array.from(categories.entries()).map(([category, errors]) => {
      const count = errors.reduce((sum, e) => sum + e.count, 0)
      return {
        category,
        count,
        percentage: (count / totalErrors) * 100,
        types: errors.sort((a, b) => b.count - a.count)
      } as ErrorCategoryDistribution
    }).sort((a, b) => b.count - a.count)
  }, [errorTypes, totalErrors])

  // Group by priority
  const errorsByPriority = useMemo(() => {
    const priorities = new Map<string, number>()

    errorTypes.forEach(error => {
      const priority = error.priority || 'none'
      const currentCount = priorities.get(priority) || 0
      priorities.set(priority, currentCount + error.count)
    })

    return Array.from(priorities.entries())
      .map(([priority, count]) => ({
        name: priority,
        value: count,
        percentage: (count / totalErrors) * 100
      }))
      .sort((a, b) => b.value - a.value)
  }, [errorTypes, totalErrors])

  // Create chart config for visualization
  const chartConfig = useMemo(() => {
    return errorTypes.reduce(
      (acc, error, index) => {
        const key = error.type.toLowerCase().replace(/\s+/g, "_")
        return Object.assign(acc, {
          [key]: {
            label: error.type,
            color: error.priority ? priorityColors[error.priority] :
              chartColors[`chart${(index % 10) + 1}` as keyof typeof chartColors]
          }
        })
      }, {} as ChartConfig
    )
  }, [errorTypes])

  // Create category chart config with marine/teal colors
  const categoryChartConfig = useMemo(() => {
    return errorsByCategory.reduce(
      (acc, cat, index) => {
        const key = cat.category.toLowerCase().replace(/\s+/g, "_")
        return Object.assign(acc, {
          [key]: {
            label: categoryLabels[cat.category] || cat.category,
            color: chartColors[`chart${(index % 10) + 1}` as keyof typeof chartColors]
          }
        })
      }, {} as ChartConfig
    )
  }, [errorsByCategory])

  // Create priority chart config
  const priorityChartConfig = useMemo(() => {
    return errorsByPriority.reduce(
      (acc, priority) => {
        const key = priority.name.toLowerCase().replace(/\s+/g, "_")
        return Object.assign(acc, {
          [key]: {
            label: priority.name.charAt(0).toUpperCase() + priority.name.slice(1),
            color: priorityColors[priority.name] || 'hsl(var(--muted))'
          }
        })
      }, {} as ChartConfig
    )
  }, [errorsByPriority])

  // Transform data for recharts
  const chartData = errorTypes.map((error) => ({
    name: error.type.toLowerCase().replace(/\s+/g, "_"),
    value: error.count,
    label: error.type,
    category: error.category,
    priority: error.priority,
    percentage: error.percentage
  }))

  // Transform category data for recharts
  const categoryChartData = errorsByCategory.map((cat) => ({
    name: cat.category.toLowerCase().replace(/\s+/g, "_"),
    value: cat.count,
    label: categoryLabels[cat.category] || cat.category,
    percentage: cat.percentage
  }))

  // Transform priority data for recharts
  const priorityChartData = errorsByPriority.map((priority) => ({
    name: priority.name.toLowerCase().replace(/\s+/g, "_"),
    value: priority.value,
    label: priority.name.charAt(0).toUpperCase() + priority.name.slice(1),
    percentage: priority.percentage
  }))

  // Transform user reported error data
  const userChartData = userReportedErrors.map((status) => ({
    name: status.status.toLowerCase().replace(/\s+/g, "_"),
    value: status.count,
    label: status.status === 'in_progress' ? 'In Progress' :
      status.status.charAt(0).toUpperCase() + status.status.slice(1),
    percentage: status.percentage
  }))

  // Create user error chart config with marine/teal theme
  const userChartConfig = useMemo(() => {
    return {
      open: {
        label: "Open",
        color: chartColors.error
      },
      in_progress: {
        label: "In Progress",
        color: chartColors.warning
      },
      closed: {
        label: "Closed",
        color: chartColors.chart1
      }
    } as ChartConfig
  }, [])

  const toggleSort = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc")
  }

  // Get current chart data and config based on view mode
  const getCurrentChartData = () => {
    switch (viewMode) {
      case 'category':
        return categoryChartData
      case 'priority':
        return priorityChartData
      case 'user':
        return userChartData
      default:
        return chartData
    }
  }

  const getCurrentChartConfig = () => {
    switch (viewMode) {
      case 'category':
        return categoryChartConfig
      case 'priority':
        return priorityChartConfig
      case 'user':
        return userChartConfig
      default:
        return chartConfig
    }
  }

  // Get current selection count
  const getSelectionCount = () => {
    if (viewMode === 'type' && selectedError) {
      return errorTypes.find(e => e.type === selectedError)?.count || 0
    }
    if (viewMode === 'category' && selectedCategory) {
      return errorsByCategory.find(c => c.category === selectedCategory)?.count || 0
    }
    if (viewMode === 'priority' && selectedPriority) {
      return errorsByPriority.find(p => p.name === selectedPriority)?.value || 0
    }

    if (viewMode === 'type') return totalErrors
    if (viewMode === 'category') return totalErrors
    if (viewMode === 'priority') return totalErrors
    if (viewMode === 'user') {
      return userReportedErrors.reduce((sum, status) => sum + status.count, 0)
    }

    return totalErrors
  }

  // Get current selection label
  const getSelectionLabel = () => {
    if (viewMode === 'type' && selectedError) return selectedError
    if (viewMode === 'category' && selectedCategory) {
      return categoryLabels[selectedCategory] || selectedCategory
    }
    if (viewMode === 'priority' && selectedPriority) {
      return selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)
    }

    if (viewMode === 'type') return "Total Errors"
    if (viewMode === 'category') return "All Categories"
    if (viewMode === 'priority') return "All Priorities"
    if (viewMode === 'user') return "User Reported"

    return "Total Errors"
  }

  // Function to handle clicking on an error type to select all matching bots
  const selectBotsWithErrorType = (errorType: string) => {
    const matchingBots = errorBots.filter(bot => bot.status.value === errorType)
    matchingBots.forEach(bot => {
      toggleBotSelection(bot, true)
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg font-medium">Error Distribution</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Showing {formatNumber(totalErrors)} errors across {errorTypes.length} categories
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(selectedError || selectedCategory || selectedPriority) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedError(null)
                          setSelectedCategory(null)
                          setSelectedPriority(null)
                        }}
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
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-medium">Error Types</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {sortedErrorTypes.slice(0, 5).map((error) => {
                  const matchingBots = errorBots.filter(bot => bot.status.value === error.type)
                  const allSelected = matchingBots.length > 0 && matchingBots.every(bot => isSelected(bot.uuid))

                  return (
                    <div
                      key={error.type}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="truncate font-medium">{error.type}</span>
                          <Badge variant="outline">{error.category}</Badge>
                          {error.priority && (
                            <Badge
                              className="capitalize"
                              style={{
                                backgroundColor: `${priorityColors[error.priority]}20`,
                                color: priorityColors[error.priority],
                                borderColor: priorityColors[error.priority]
                              }}
                            >
                              {error.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-2xl font-semibold">{error.count}</span>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(error.percentage)}
                          </div>
                        </div>
                        {matchingBots.length > 0 && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className={allSelected ? "bg-primary/10" : ""}
                              onClick={() => selectBotsWithErrorType(error.type)}
                            >
                              <Check className={`h-4 w-4 ${allSelected ? "text-primary" : "text-muted-foreground"}`} />
                            </Button>
                            {allSelected && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(generateLogsUrl(null, null), '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(value) => {
          setViewMode(value as "type" | "category" | "priority" | "user")
          setSelectedError(null)
          setSelectedCategory(null)
          setSelectedPriority(null)
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="type">By Error Type</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="priority">By Priority</TabsTrigger>
          <TabsTrigger value="user">User Reported</TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Error Types</h4>
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
                              backgroundColor: error.priority ? priorityColors[error.priority] :
                                chartConfig[error.type.toLowerCase().replace(/\s+/g, "_")]?.color
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
        </TabsContent>

        <TabsContent value="category" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Error Categories</h4>
                    <span className="text-xs text-muted-foreground">Count</span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {errorsByCategory.map((category) => (
                      <button
                        key={category.category}
                        className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors ${selectedCategory === category.category ? "bg-secondary" : ""
                          }`}
                        onClick={() => setSelectedCategory(category.category === selectedCategory ? null : category.category)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: categoryChartConfig[category.category.toLowerCase().replace(/\s+/g, "_")]?.color
                            }}
                          />
                          <span className="text-sm truncate max-w-[150px]" title={categoryLabels[category.category] || category.category}>
                            {categoryLabels[category.category] || category.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {formatNumber(category.count)}
                          </Badge>
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {formatPercentage(category.percentage)}
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
                  <ChartContainer config={categoryChartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            selectedCategory
                              ? categoryChartData.filter(d => d.label === (categoryLabels[selectedCategory] || selectedCategory))
                              : categoryChartData
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
                          {categoryChartData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={`var(--color-${entry.name})`}
                              opacity={selectedCategory && categoryLabels[selectedCategory] !== entry.label ? 0.3 : 1}
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
                        {formatNumber(getSelectionCount())}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {getSelectionLabel()}
                      </span>
                    </div>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="priority" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Error Priorities</h4>
                    <span className="text-xs text-muted-foreground">Count</span>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {errorsByPriority.map((priority) => (
                      <button
                        key={priority.name}
                        className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors ${selectedPriority === priority.name ? "bg-secondary" : ""
                          }`}
                        onClick={() => setSelectedPriority(priority.name === selectedPriority ? null : priority.name)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: priorityColors[priority.name] || 'hsl(var(--muted))'
                            }}
                          />
                          <span className="text-sm truncate max-w-[150px]" title={priority.name}>
                            {priority.name.charAt(0).toUpperCase() + priority.name.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {formatNumber(priority.value)}
                          </Badge>
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {formatPercentage(priority.percentage)}
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
                  <ChartContainer config={priorityChartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            selectedPriority
                              ? priorityChartData.filter(d => d.name === selectedPriority)
                              : priorityChartData
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
                          {priorityChartData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={`var(--color-${entry.name})`}
                              opacity={selectedPriority && selectedPriority !== entry.name ? 0.3 : 1}
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
                        {formatNumber(getSelectionCount())}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {getSelectionLabel()}
                      </span>
                    </div>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="user" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">User Reported Status</h4>
                    <span className="text-xs text-muted-foreground">Count</span>
                  </div>
                  {userReportedErrors.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No user reported errors found
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {userReportedErrors.map((status) => (
                        <div key={status.status} className="w-full flex items-center justify-between p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{
                                backgroundColor: status.status === 'open' ? 'hsl(var(--destructive))' :
                                  status.status === 'in_progress' ? 'hsl(var(--warning))' :
                                    'hsl(var(--success))'
                              }}
                            />
                            <span className="text-sm truncate max-w-[150px]">
                              {status.status === 'in_progress' ? 'In Progress' :
                                status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              {formatNumber(status.count)}
                            </Badge>
                            <span className="text-xs text-muted-foreground w-16 text-right">
                              {formatPercentage(status.percentage)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="h-80">
                  {userReportedErrors.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No user reported errors found in this time period
                    </div>
                  ) : (
                    <ChartContainer config={userChartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={userChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            labelLine={false}
                          >
                            {userChartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={`var(--color-${entry.name})`}
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
                          {formatNumber(userReportedErrors.reduce((sum, status) => sum + status.count, 0))}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          Total User Reports
                        </span>
                      </div>
                    </ChartContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
