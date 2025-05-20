"use client"

import { BotOverview } from "@/components/analytics/bot-overview"
import { BotPlatformDistribution } from "@/components/analytics/bot-platform-distribution"
import Filters from "@/components/filters"
import { LIMIT_STORAGE_KEY, limitOptions } from "@/components/filters/limit-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBotStats } from "@/hooks/use-bot-stats"
import { genericError } from "@/lib/errors"
import { updateSearchParams, validateDateRange, validateFilterValues } from "@/lib/search-params"
import type { FilterState } from "@/lib/types"
import { formatNumber, formatPercentage } from "@/lib/utils"
import dayjs from "dayjs"
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { BotErrorAnalysis } from "./bot-error-analysis"
import { BotErrorTimeline } from "./bot-error-timeline"
import { BotPerformanceChart } from "./bot-performance-chart"

export const DEFAULT_LIMIT = limitOptions[0].value

export function CompactDashboard() {
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
            searchParams.get("userReportedErrorStatusFilters"),
            searchParams.get("errorCategoryFilters"),
            searchParams.get("errorPriorityFilters")
        )
    )

    // Tab state for the main dashboard view
    const [activeTab, setActiveTab] = useState("overview")

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

    // Manual refresh handler
    const handleRefresh = () => {
        // Trigger a refetch by toggling a filter and then toggling it back
        const currentFilters = { ...filters };
        setFilters({ ...filters, statusFilters: [] });
        setTimeout(() => setFilters(currentFilters), 10);
    };

    // Calculate change between last two days for trend indicators
    const calculateTrend = () => {
        if (!data || data.dailyStats.length < 2) return { percentage: 0, isPositive: true }

        const lastDay = data.dailyStats[data.dailyStats.length - 1]
        const previousDay = data.dailyStats[data.dailyStats.length - 2]

        const change = lastDay.totalBots - previousDay.totalBots
        const percentage = (change / previousDay.totalBots) * 100

        return {
            percentage: Math.abs(percentage),
            isPositive: change >= 0
        }
    }

    const trend = calculateTrend()

    // Compute totals from the arrays
    const getTotalBots = () => data?.allBots.length || 0;
    const getSuccessfulBots = () => data?.successfulBots.length || 0;
    const getErrorBots = () => data?.errorBots.length || 0;
    const getSuccessRate = () => {
        const total = getTotalBots();
        return total ? (getSuccessfulBots() / total) * 100 : 0;
    };
    const getErrorRate = () => {
        const total = getTotalBots();
        return total ? (getErrorBots() / total) * 100 : 0;
    };

    // Define time range options for the quick filters
    const timeRanges = [
        { value: "7d", label: "7 Days" },
        { value: "14d", label: "14 Days" },
        { value: "30d", label: "30 Days" },
        { value: "90d", label: "90 Days" }
    ]

    // Handler for time range changes
    const handleTimeRangeChange = (value: string) => {
        const now = dayjs()
        const days = parseInt(value.replace('d', ''))

        setDateRange({
            startDate: now.subtract(days, 'day').toDate(),
            endDate: now.toDate()
        })
    }

    return (
        <div className="relative space-y-4">
            {/* Header with filters */}
            <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Meeting Bot Analytics</h1>
                        <p className="text-sm text-muted-foreground">
                            Monitor performance across {data?.platformDistribution.length || 0} platforms
                        </p>
                    </div>

                    {data && (
                        <div className="hidden items-center gap-2 md:flex">
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Total Bots:</span>
                                <span className="font-medium">{formatNumber(getTotalBots())}</span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Success Rate:</span>
                                <span className="font-medium text-success">
                                    {formatPercentage(getSuccessRate())}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-sm">
                                <span className="text-muted-foreground">Error Rate:</span>
                                <span className="font-medium text-destructive">
                                    {formatPercentage(getErrorRate())}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters component */}
            <div className="flex items-center justify-between">
                <Filters
                    filters={filters}
                    setFilters={setFilters}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    limit={limit}
                    setLimit={setLimit}
                    isRefetching={isRefetching}
                />

                <div className="flex gap-2 ml-2">
                    {/* Quick time range filters */}
                    <div className="hidden md:flex items-center gap-1">
                        {timeRanges.map((range) => (
                            <Button
                                key={range.value}
                                variant="outline"
                                size="sm"
                                className={`text-xs ${dateRange?.startDate && dateRange.endDate &&
                                    dayjs(dateRange.endDate).diff(dayjs(dateRange.startDate), 'day') === parseInt(range.value.replace('d', '')) - 1
                                    ? 'bg-primary/10'
                                    : ''}`}
                                onClick={() => handleTimeRangeChange(range.value)}
                            >
                                {range.label}
                            </Button>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefetching}
                        className="ml-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Loading and error states */}
            {isLoading && !data ? (
                <div className="flex h-80 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : isError ? (
                <div className="flex h-80 items-center justify-center text-destructive">
                    Error: {error instanceof Error ? error.message : genericError}
                </div>
            ) : !data ? (
                <div className="flex h-80 items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                        No data found. Try adjusting your filters.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary section - key metrics */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 mb-4">
                        <Card className="bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold">{formatNumber(getTotalBots())}</span>
                                    <span className="text-sm text-muted-foreground">Total Bots</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-success/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-success">{formatNumber(getSuccessfulBots())}</span>
                                    <span className="text-sm text-muted-foreground">Successful ({formatPercentage(getSuccessRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-destructive/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold text-destructive">{formatNumber(getErrorBots())}</span>
                                    <span className="text-sm text-muted-foreground">Errors ({formatPercentage(getErrorRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold">{data.dailyStats[data.dailyStats.length - 1]?.totalBots || 0}</span>
                                        <span className={`text-xs ${trend.isPositive ? "text-success" : "text-destructive"}`}>
                                            {trend.isPositive ? "↑" : "↓"} {formatPercentage(trend.percentage)}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">Most Recent Day</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main dashboard tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            {/* Key metrics cards */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <BotOverview
                                    totalBots={getTotalBots()}
                                    successfulBots={getSuccessfulBots()}
                                    errorBots={getErrorBots()}
                                    duration={
                                        dateRange?.startDate && dateRange?.endDate
                                            ? `${dayjs(dateRange.startDate).format("MMM D")} - ${dayjs(dateRange.endDate).format("MMM D, YYYY")}`
                                            : "All time"
                                    }
                                />
                            </div>

                            {/* Doughnut Charts Dashboard Metrics */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>Success vs Error Ratio</CardTitle>
                                        <CardDescription>Bot completion status breakdown</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[220px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: "Successful", value: getSuccessfulBots(), color: "hsl(var(--success))" },
                                                            { name: "Error", value: getErrorBots(), color: "hsl(var(--destructive))" }
                                                        ]}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {[
                                                            { name: "Successful", value: getSuccessfulBots(), color: "hsl(var(--success))" },
                                                            { name: "Error", value: getErrorBots(), color: "hsl(var(--destructive))" }
                                                        ].map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value: number) => [`${formatNumber(value)} bots`, ""]}
                                                        labelFormatter={() => ""}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-semibold">{formatPercentage(getSuccessRate())}</span>
                                                <span className="text-xs text-muted-foreground">Success Rate</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>Error Category Distribution</CardTitle>
                                        <CardDescription>Top error categories</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[220px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={data.errorTypes.slice(0, 5).map((error, idx) => ({
                                                            name: error.type,
                                                            value: error.count,
                                                            color: `hsl(var(--chart-${(idx % 10) + 1}))`
                                                        }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {data.errorTypes.slice(0, 5).map((error, idx) => (
                                                            <Cell key={`cell-${idx}`} fill={`hsl(var(--chart-${(idx % 10) + 1}))`} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value: number) => [`${formatNumber(value)} occurrences`, ""]}
                                                        labelFormatter={(name: string) => data.errorTypes.find(e => e.type === name)?.type || ""}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-semibold">{formatNumber(getErrorBots())}</span>
                                                <span className="text-xs text-muted-foreground">Total Errors</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle>User Reported Issues</CardTitle>
                                        <CardDescription>User feedback status</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[220px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={data.userReportedErrors.map((status, idx) => ({
                                                            name: status.status,
                                                            value: status.count,
                                                            color: status.status === 'open' ? 'hsl(var(--destructive))' :
                                                                status.status === 'in_progress' ? 'hsl(var(--warning))' :
                                                                    'hsl(var(--success))'
                                                        }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {data.userReportedErrors.map((status, idx) => (
                                                            <Cell
                                                                key={`cell-${idx}`}
                                                                fill={status.status === 'open' ? 'hsl(var(--destructive))' :
                                                                    status.status === 'in_progress' ? 'hsl(var(--warning))' :
                                                                        'hsl(var(--success))'}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value: number) => [`${formatNumber(value)} reports`, ""]}
                                                        labelFormatter={(name: string) =>
                                                            name === 'open' ? 'Open' :
                                                                name === 'in_progress' ? 'In Progress' :
                                                                    'Closed'
                                                        }
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-lg font-semibold">{formatNumber(data.userReportedErrors.reduce((sum, item) => sum + item.count, 0))}</span>
                                                <span className="text-xs text-muted-foreground">User Reports</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Platform Distribution */}
                            <BotPlatformDistribution platformDistribution={data.platformDistribution} />

                            {/* Daily trend card */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg font-medium">Daily Trend</CardTitle>
                                    <CardDescription>
                                        Showing data for the last {data.dailyStats.length} days
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-2xl font-bold">
                                                {formatNumber(data.dailyStats[data.dailyStats.length - 1]?.totalBots || 0)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Bots on {dayjs(data.dailyStats[data.dailyStats.length - 1]?.date).format("MMM D, YYYY")}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 rounded-md px-2 py-1 ${trend.isPositive ? "text-success" : "text-destructive"}`}>
                                            {trend.isPositive ? (
                                                <ArrowUpRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4" />
                                            )}
                                            <span className="text-sm font-medium">
                                                {formatPercentage(trend.percentage)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Performance Tab */}
                        <TabsContent value="performance" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Bot Performance</CardTitle>
                                    <CardDescription>
                                        Daily performance metrics across platforms
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <BotPerformanceChart dailyStats={data.dailyStats} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Error Analysis Tab */}
                        <TabsContent value="errors" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Error Distribution</CardTitle>
                                    <CardDescription>
                                        Analysis of {formatNumber(getErrorBots())} errors ({formatPercentage(getErrorRate())} of total)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <BotErrorAnalysis
                                        errorTypes={data.errorTypes}
                                        userReportedErrors={data.userReportedErrors}
                                    />
                                </CardContent>
                            </Card>

                            {data.errorsByDate && data.errorsByDate.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Error Timeline</CardTitle>
                                        <CardDescription>
                                            Error trends over time by category and priority
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <BotErrorTimeline
                                            dailyStats={data.dailyStats}
                                            errorsByDate={data.errorsByDate}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    )
}