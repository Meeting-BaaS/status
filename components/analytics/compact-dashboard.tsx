"use client"

import Filters from "@/components/filters"
import { LIMIT_STORAGE_KEY, limitOptions } from "@/components/filters/limit-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelectedBotsButton, useSelectedBots } from "@/contexts/selected-bots-context"
import { useBotStats } from "@/hooks/use-bot-stats"
import { chartColors } from "@/lib/chart-colors"
import { genericError } from "@/lib/errors"
import { updateSearchParams, validateDateRange, validateFilterValues } from "@/lib/search-params"
import type { FilterState, FormattedBotData } from "@/lib/types"
import { formatNumber, formatPercentage, statusColors } from "@/lib/utils"
import dayjs from "dayjs"
import { Loader2, RefreshCw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { DateValueType } from "react-tailwindcss-datepicker"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BotErrorAnalysis } from "./bot-error-analysis"
import { BotErrorTimeline } from "./bot-error-timeline"
import { BotLogsTable } from "./bot-logs-table"

export const DEFAULT_LIMIT = limitOptions[0].value

export function CompactDashboard() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { selectedBots, toggleBotSelection, setHoveredBots, selectBotsByCategory } = useSelectedBots()

    // Add distinct colors for charts
    const distinctColors = [
        "#0EA5E9", // Sky blue
        "#F97316", // Orange
        "#14B8A6", // Teal
        "#A855F7", // Purple
        "#EC4899", // Pink
        "#EAB308", // Yellow
        "#22C55E", // Green
        "#EF4444", // Red
        "#8B5CF6", // Violet
        "#06B6D4"  // Cyan
    ];

    // Platform-specific colors
    const platformColors = {
        "zoom": "#0E71EB",    // Zoom blue
        "teams": "#6264A7",   // Teams purple
        "google meet": "#00AC47", // Google Meet green
        "unknown": "#64748B"  // Slate gray for unknown
    };

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

    // Define notable error patterns that should be highlighted
    const notableErrorPatterns = [
        "meeting ended before",
        "could not participate",
        "bot was removed",
        "timed out",
        "permission denied"
    ];

    // Function to determine if an error message should be highlighted
    const shouldHighlightError = (message: string, priority?: string, category?: string) => {
        // Check for high priority errors
        if (priority === "high" || priority === "critical") return true;

        // Check for notable errors by pattern
        if (message && typeof message === 'string') {
            return notableErrorPatterns.some(pattern =>
                message.toLowerCase().includes(pattern.toLowerCase())
            );
        }

        return false;
    };

    // Get color for error message based on priority or pattern
    const getErrorMessageColor = (message: string, priority?: string, category?: string) => {
        if (priority === "critical") return "text-red-600";
        if (priority === "high") return "text-amber-600";

        // Check for notable patterns even if priority is not high/critical
        if (message && typeof message === 'string' &&
            notableErrorPatterns.some(pattern =>
                message.toLowerCase().includes(pattern.toLowerCase())
            )) {
            return "text-amber-600";
        }

        return "";
    };

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
                                    <span className="text-lg font-bold" style={{ color: statusColors.success }}>{formatNumber(getSuccessfulBots())}</span>
                                    <span className="text-sm text-muted-foreground">Successful ({formatPercentage(getSuccessRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-destructive/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold" style={{ color: statusColors.error }}>{formatNumber(getErrorBots())}</span>
                                    <span className="text-sm text-muted-foreground">Errors ({formatPercentage(getErrorRate())})</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/5">
                            <CardContent className="pt-6">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold">{data.dailyStats[data.dailyStats.length - 1]?.totalBots || 0}</span>
                                        <span className="text-xs" style={{ color: trend.isPositive ? statusColors.success : statusColors.error }}>
                                            {trend.isPositive ? "↑" : "↓"} {formatPercentage(trend.percentage)}
                                        </span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">Most Recent Day</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main dashboard tabs - simplified to focus on error analysis */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="errors">Error Analysis</TabsTrigger>
                            <TabsTrigger value="duration">Duration</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {/* Platform Distribution Pie Chart */}
                                <Card className="md:col-span-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle>Platform Distribution</CardTitle>
                                        <CardDescription>
                                            <div className="flex justify-between items-center">
                                                <span>All bots by platform</span>
                                                <span className="font-medium">{formatNumber(getTotalBots())}</span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Legend
                                                        layout="horizontal"
                                                        verticalAlign="bottom"
                                                        align="center"
                                                        wrapperStyle={{
                                                            paddingTop: '10px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                        formatter={(value, entry) => {
                                                            return <span style={{ color: 'var(--foreground)', opacity: 0.8 }}>{value}</span>;
                                                        }}
                                                    />
                                                    <Pie
                                                        data={data.platformDistribution.map((platform, idx) => ({
                                                            name: platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1),
                                                            value: platform.count,
                                                            color: chartColors[`chart${(idx % 10) + 1}` as keyof typeof chartColors],
                                                            platform: platform.platform,
                                                            percentage: platform.percentage
                                                        }))}
                                                        cx="50%"
                                                        cy="45%"
                                                        innerRadius={55}
                                                        outerRadius={75}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="#1e1e22"
                                                        strokeWidth={2}
                                                        label={({ name, percent, value }) => (
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                fill="#000"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 500,
                                                                    textShadow: '0px 0px 2px rgba(255, 255, 255, 0.5)'
                                                                }}
                                                            >
                                                                {`${name}: ${formatNumber(value)} (${(percent * 100).toFixed(1)}%)`}
                                                            </text>
                                                        )}
                                                        labelLine={true}
                                                        onClick={(entry, index) => {
                                                            // Find bots with this platform and select them
                                                            const platform = entry.platform;
                                                            const matchingBots = data.allBots.filter(bot => bot.platform === platform);
                                                            selectBotsByCategory(matchingBots);
                                                        }}
                                                        onMouseEnter={(entry, index) => {
                                                            // Find bots with this platform on hover
                                                            const platform = entry.platform;
                                                            const matchingBots = data.allBots.filter(bot => bot.platform === platform);
                                                            setHoveredBots(matchingBots);
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredBots([]);
                                                        }}
                                                    >
                                                        {data.platformDistribution.map((platform, idx) => {
                                                            const color = platformColors[platform.platform as keyof typeof platformColors] ||
                                                                distinctColors[idx % distinctColors.length];

                                                            return (
                                                                <Cell
                                                                    key={`cell-${idx}`}
                                                                    fill={color}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                                                                        zIndex: 5 - idx
                                                                    }}
                                                                    stroke="#1e1e22"
                                                                    strokeWidth={1}
                                                                />
                                                            );
                                                        })}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value, name, props: any) => {
                                                            // Display formatted values based on the error count
                                                            let displayValue;
                                                            let displayName = props.payload.platform || name || "";

                                                            try {
                                                                // Try to convert to number and format
                                                                const numValue = Number(value);
                                                                if (!isNaN(numValue)) {
                                                                    // Calculate percentage
                                                                    const totalBots = getTotalBots();
                                                                    const percentage = totalBots > 0 ?
                                                                        (numValue / totalBots) * 100 : 0;

                                                                    // Custom JSX for tooltip content
                                                                    displayValue = (
                                                                        <div className="flex flex-col text-white">
                                                                            <span className="font-medium text-white">{formatNumber(numValue)} bots</span>
                                                                            <span className="text-xs text-white opacity-90">{percentage.toFixed(1)}% of total</span>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    displayValue = String(value);
                                                                }
                                                            } catch (e) {
                                                                displayValue = String(value);
                                                            }

                                                            return [displayValue, displayName];
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                                            color: 'white',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                                                            zIndex: 50
                                                        }}
                                                        itemStyle={{
                                                            color: 'white'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Error Type Summary Chart */}
                                <Card className="md:col-span-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle>Error Type Summary</CardTitle>
                                        <CardDescription>
                                            <div className="flex justify-between items-center">
                                                <span>Click to select errors</span>
                                                <span className="font-medium text-destructive">{formatNumber(getErrorBots())}</span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Legend
                                                        layout="horizontal"
                                                        verticalAlign="bottom"
                                                        align="center"
                                                        wrapperStyle={{
                                                            paddingTop: '10px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                        formatter={(value, entry) => {
                                                            return <span style={{ color: 'var(--foreground)', opacity: 0.8 }}>{value}</span>;
                                                        }}
                                                    />
                                                    <Pie
                                                        data={data.errorTypes.slice(0, 5).map((error, idx) => ({
                                                            name: error.type.replace(/([A-Z])/g, ' $1').trim(),
                                                            value: error.count,
                                                            color: chartColors[`chart${(idx % 10) + 1}` as keyof typeof chartColors],
                                                            errorType: error.type,
                                                            category: error.category,
                                                            priority: error.priority
                                                        }))}
                                                        cx="50%"
                                                        cy="45%"
                                                        innerRadius={55}
                                                        outerRadius={75}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="#1e1e22"
                                                        strokeWidth={2}
                                                        label={({ name, percent, value }) => (
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                fill="#000"
                                                                textAnchor="middle"
                                                                dominantBaseline="central"
                                                                style={{
                                                                    fontSize: '11px',
                                                                    fontWeight: 500,
                                                                    textShadow: '0px 0px 2px rgba(255, 255, 255, 0.5)'
                                                                }}
                                                            >
                                                                {`${name.length > 10 ? name.substring(0, 8) + '...' : name}: ${value}`}
                                                            </text>
                                                        )}
                                                        labelLine={true}
                                                        onClick={(entry, index) => {
                                                            // Find bots with this error type and select them
                                                            const errorType = entry.errorType;
                                                            const matchingBots = data.errorBots.filter(bot => bot.status.value === errorType);
                                                            // Toggle selection - if all matching bots are already selected, deselect them
                                                            // otherwise add them to selection
                                                            const allAlreadySelected = matchingBots.every(bot =>
                                                                selectedBots.some(selected => selected.uuid === bot.uuid));

                                                            selectBotsByCategory(matchingBots, !allAlreadySelected);
                                                        }}
                                                        onMouseEnter={(entry, index) => {
                                                            // Find bots with this error type on hover
                                                            const errorType = entry.errorType;
                                                            const matchingBots = data.errorBots.filter(bot => bot.status.value === errorType);
                                                            setHoveredBots(matchingBots);
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredBots([]);
                                                        }}
                                                    >
                                                        {data.errorTypes.slice(0, 5).map((error, idx) => (
                                                            <Cell
                                                                key={`cell-${idx}`}
                                                                fill={distinctColors[idx % distinctColors.length]}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                                                                    zIndex: 5 - idx
                                                                }}
                                                                stroke="#1e1e22"
                                                                strokeWidth={1}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value, name, props: any) => {
                                                            // Display formatted values based on the error count
                                                            let displayValue;
                                                            let displayName = props.payload.errorType || name || "";

                                                            try {
                                                                // Try to convert to number and format
                                                                const numValue = Number(value);
                                                                if (!isNaN(numValue)) {
                                                                    // Calculate percentage
                                                                    const totalErrors = getErrorBots();
                                                                    const percentage = totalErrors > 0 ?
                                                                        (numValue / totalErrors) * 100 : 0;

                                                                    // Custom JSX for tooltip content
                                                                    displayValue = (
                                                                        <div className="flex flex-col text-white">
                                                                            <span className="font-medium text-white">{formatNumber(numValue)} bots</span>
                                                                            <span className="text-xs text-white opacity-90">{percentage.toFixed(1)}% of errors</span>
                                                                            {props.payload.category && <span className="text-xs text-white opacity-90">Category: {props.payload.category}</span>}
                                                                            {props.payload.priority && <span className="text-xs text-white opacity-90">Priority: {props.payload.priority}</span>}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    displayValue = String(value);
                                                                }
                                                            } catch (e) {
                                                                displayValue = String(value);
                                                            }

                                                            return [displayValue, displayName];
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                                            color: 'white',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                                                            zIndex: 50
                                                        }}
                                                        itemStyle={{
                                                            color: 'white'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-sm font-medium text-destructive">{formatPercentage(getErrorRate())}</span>
                                                <span className="text-xs text-muted-foreground">Error Rate</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Errors by Platform Distribution Chart */}
                                <Card className="md:col-span-1">
                                    <CardHeader className="pb-2">
                                        <CardTitle>Errors by Platform</CardTitle>
                                        <CardDescription>
                                            <div className="flex justify-between items-center">
                                                <span>Distribution by platform</span>
                                                <span className="font-medium text-success">{formatNumber(getSuccessfulBots())}</span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex items-center justify-center">
                                        <div className="w-full h-full relative">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Legend
                                                        layout="horizontal"
                                                        verticalAlign="bottom"
                                                        align="center"
                                                        wrapperStyle={{
                                                            paddingTop: '10px',
                                                            fontSize: '12px',
                                                            fontWeight: 500
                                                        }}
                                                        formatter={(value, entry) => {
                                                            return <span style={{ color: 'var(--foreground)', opacity: 0.8 }}>{value}</span>;
                                                        }}
                                                    />
                                                    {(() => {
                                                        // Prepare data for errors by platform
                                                        const errorsByPlatform: Record<string, number> = {};
                                                        data.errorBots.forEach(bot => {
                                                            errorsByPlatform[bot.platform] = (errorsByPlatform[bot.platform] || 0) + 1;
                                                        });

                                                        const errorPlatformData = Object.entries(errorsByPlatform).map(([platform, count], idx) => ({
                                                            name: platform,
                                                            value: count,
                                                            color: chartColors[`chart${(idx % 10) + 1}` as keyof typeof chartColors],
                                                            platform,
                                                            percentage: (count / data.errorBots.length) * 100
                                                        }));

                                                        return (
                                                            <Pie
                                                                data={errorPlatformData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={55}
                                                                outerRadius={75}
                                                                paddingAngle={4}
                                                                dataKey="value"
                                                                stroke="#1e1e22"
                                                                strokeWidth={2}
                                                                label={({ name, percent, value }) => (
                                                                    <text
                                                                        x={0}
                                                                        y={0}
                                                                        fill="#000"
                                                                        textAnchor="middle"
                                                                        dominantBaseline="central"
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: 500,
                                                                            textShadow: '0px 0px 2px rgba(255, 255, 255, 0.5)'
                                                                        }}
                                                                    >
                                                                        {`${name}: ${value}`}
                                                                    </text>
                                                                )}
                                                                labelLine={true}
                                                                onClick={(entry, index) => {
                                                                    // Find error bots with this platform and select them
                                                                    const platform = entry.platform;
                                                                    const matchingBots = data.errorBots.filter(bot => bot.platform === platform);
                                                                    selectBotsByCategory(matchingBots);
                                                                }}
                                                                onMouseEnter={(entry, index) => {
                                                                    const platform = entry.platform;
                                                                    const matchingBots = data.errorBots.filter(bot => bot.platform === platform);
                                                                    setHoveredBots(matchingBots);
                                                                }}
                                                                onMouseLeave={() => {
                                                                    setHoveredBots([]);
                                                                }}
                                                            >
                                                                {errorPlatformData.map((item, idx) => {
                                                                    const color = platformColors[item.platform as keyof typeof platformColors] ||
                                                                        distinctColors[idx % distinctColors.length];

                                                                    return (
                                                                        <Cell
                                                                            key={`error-platform-cell-${idx}`}
                                                                            fill={color}
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                                                                                zIndex: 5 - idx
                                                                            }}
                                                                            stroke="#1e1e22"
                                                                            strokeWidth={1}
                                                                        />
                                                                    );
                                                                })}
                                                            </Pie>
                                                        )
                                                    })()}
                                                    <Tooltip
                                                        formatter={(value, name, props: any) => {
                                                            // Display formatted values based on the error count
                                                            let displayValue;
                                                            let displayName = props.payload.platform || name || "";

                                                            try {
                                                                // Try to convert to number and format
                                                                const numValue = Number(value);
                                                                if (!isNaN(numValue)) {
                                                                    // Calculate percentage
                                                                    const totalErrors = getErrorBots();
                                                                    const percentage = totalErrors > 0 ?
                                                                        (numValue / totalErrors) * 100 : 0;

                                                                    // Custom JSX for tooltip content
                                                                    displayValue = (
                                                                        <div className="flex flex-col text-white">
                                                                            <span className="font-medium text-white">{formatNumber(numValue)} errors</span>
                                                                            <span className="text-xs text-white opacity-90">{percentage.toFixed(1)}% of errors</span>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    displayValue = String(value);
                                                                }
                                                            } catch (e) {
                                                                displayValue = String(value);
                                                            }

                                                            return [displayValue, displayName];
                                                        }}
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                                            color: 'white',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                                                            zIndex: 50
                                                        }}
                                                        itemStyle={{
                                                            color: 'white'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-sm font-medium text-success">{formatPercentage(getSuccessRate())}</span>
                                                <span className="text-xs text-muted-foreground">Success Rate</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Error Details Table */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Error Details</CardTitle>
                                            <CardDescription>Click on errors to select/filter</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Sort by:</span>
                                            <select
                                                className="h-10 rounded-md border border-input bg-background px-4 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                onChange={(e) => {
                                                    // Store sort preference in localStorage
                                                    if (typeof window !== 'undefined') {
                                                        localStorage.setItem('errorTableSort', e.target.value);
                                                    }
                                                    // Force a re-render
                                                    handleRefresh();
                                                }}
                                                defaultValue={typeof window !== 'undefined' ? localStorage.getItem('errorTableSort') || 'count' : 'count'}
                                            >
                                                <option value="count">Count (Highest)</option>
                                                <option value="priority">Priority</option>
                                                <option value="type">Error Type</option>
                                                <option value="platform">Platform</option>
                                            </select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-auto max-h-[600px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <th className="w-12 text-center h-12 px-4 text-left align-middle font-medium text-muted-foreground">Select</th>
                                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Error Type</th>
                                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Error Message</th>
                                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Platform</th>
                                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-right">Count</th>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(() => {
                                                    // Group bots by error types and specific error messages
                                                    const errorGroups: Record<string, {
                                                        type: string,
                                                        message: string,
                                                        category: string | undefined,
                                                        priority: string | undefined,
                                                        bots: FormattedBotData[],
                                                        platforms: Record<string, number>
                                                    }> = {};

                                                    // Process all error bots
                                                    data.errorBots.forEach(bot => {
                                                        const errorType = bot.status.value;
                                                        const errorMessage = bot.status.details || `${bot.status.category || "Unknown"} error`;

                                                        // Create a unique key that combines type and message
                                                        // This ensures we separate out unknown errors with different messages
                                                        const groupKey = `${errorType}:::${errorMessage}`;

                                                        if (!errorGroups[groupKey]) {
                                                            errorGroups[groupKey] = {
                                                                type: errorType,
                                                                message: errorMessage,
                                                                category: bot.status.category,
                                                                priority: data.errorTypes.find(t => t.type === errorType)?.priority,
                                                                bots: [],
                                                                platforms: {}
                                                            };
                                                        }

                                                        // Add bot to this group
                                                        errorGroups[groupKey].bots.push(bot);

                                                        // Update platform counts
                                                        errorGroups[groupKey].platforms[bot.platform] =
                                                            (errorGroups[groupKey].platforms[bot.platform] || 0) + 1;
                                                    });

                                                    // Get sort preference from localStorage
                                                    const sortPreference = typeof window !== 'undefined' ?
                                                        localStorage.getItem('errorTableSort') || 'count' : 'count';

                                                    // Convert to array and sort based on user preference
                                                    const sortedGroups = Object.values(errorGroups).sort((a, b) => {
                                                        switch (sortPreference) {
                                                            case 'count':
                                                                // Sort by number of occurrences (descending)
                                                                return b.bots.length - a.bots.length;

                                                            case 'priority':
                                                                // Sort by priority (critical > high > medium > low)
                                                                const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, undefined: 4 };
                                                                const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
                                                                const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 4;

                                                                // First by priority, then by count if same priority
                                                                return priorityA !== priorityB ?
                                                                    priorityA - priorityB :
                                                                    b.bots.length - a.bots.length;

                                                            case 'type':
                                                                // Sort by error type alphabetically
                                                                return a.type.localeCompare(b.type) || b.bots.length - a.bots.length;

                                                            case 'platform':
                                                                // Get primary platform for each error
                                                                const getPrimaryPlatform = (group: typeof a) => {
                                                                    const platforms = Object.entries(group.platforms);
                                                                    if (!platforms.length) return '';

                                                                    // Sort platforms by count and return the one with most occurrences
                                                                    platforms.sort((a, b) => b[1] - a[1]);
                                                                    return platforms[0][0];
                                                                };

                                                                const platformA = getPrimaryPlatform(a);
                                                                const platformB = getPrimaryPlatform(b);

                                                                // First by platform, then by count
                                                                return platformA.localeCompare(platformB) || b.bots.length - a.bots.length;

                                                            default:
                                                                return b.bots.length - a.bots.length;
                                                        }
                                                    });

                                                    // For debugging - log the sorted results
                                                    if (process.env.NODE_ENV === 'development') {
                                                        console.log('Sorted error groups:',
                                                            sortedGroups.map(g => ({
                                                                type: g.type,
                                                                message: g.message.substring(0, 30) + (g.message.length > 30 ? '...' : ''),
                                                                count: g.bots.length
                                                            }))
                                                        );
                                                    }

                                                    return sortedGroups.map((group, idx) => {
                                                        const allSelected = group.bots.every(bot =>
                                                            selectedBots.some(selected => selected.uuid === bot.uuid));

                                                        return (
                                                            <TableRow
                                                                key={`${group.type}-${idx}`}
                                                                className={allSelected ? 'bg-primary/10' : ''}
                                                            >
                                                                <TableCell className="text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={allSelected}
                                                                        onChange={() => {
                                                                            if (allSelected) {
                                                                                selectBotsByCategory(group.bots, false);
                                                                            } else {
                                                                                selectBotsByCategory(group.bots, true);
                                                                            }
                                                                        }}
                                                                        className="h-4 w-4 rounded border-gray-300"
                                                                    />
                                                                </TableCell>
                                                                <TableCell
                                                                    className="font-medium"
                                                                    onClick={() => {
                                                                        if (allSelected) {
                                                                            selectBotsByCategory(group.bots, false);
                                                                        } else {
                                                                            selectBotsByCategory(group.bots, true);
                                                                        }
                                                                    }}
                                                                    onMouseEnter={() => setHoveredBots(group.bots)}
                                                                    onMouseLeave={() => setHoveredBots([])}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span>{group.type}</span>
                                                                        {group.category && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Category: {group.category}
                                                                            </span>
                                                                        )}
                                                                        {group.priority && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Priority: {group.priority}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="text-sm whitespace-normal break-words">
                                                                        <span className={getErrorMessageColor(group.message, group.priority, group.category)}>
                                                                            {group.message}
                                                                        </span>
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {Object.entries(group.platforms).map(([platform, count]) => (
                                                                            <span
                                                                                key={platform}
                                                                                className="px-2 py-0.5 text-xs rounded-full bg-primary/10"
                                                                                style={{
                                                                                    backgroundColor: platform === 'zoom' ? 'rgba(14, 113, 235, 0.1)' :
                                                                                        platform === 'teams' ? 'rgba(98, 100, 167, 0.1)' :
                                                                                            platform === 'google meet' ? 'rgba(0, 172, 71, 0.1)' :
                                                                                                'rgba(100, 116, 139, 0.1)',
                                                                                    color: platform === 'zoom' ? '#0E71EB' :
                                                                                        platform === 'teams' ? '#6264A7' :
                                                                                            platform === 'google meet' ? '#00AC47' :
                                                                                                '#64748B'
                                                                                }}
                                                                            >
                                                                                {platform}: {count}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">{group.bots.length}</TableCell>
                                                            </TableRow>
                                                        );
                                                    });
                                                })()}
                                            </TableBody>
                                        </Table>
                                    </div>
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
                                        errorBots={data.errorBots}
                                    />
                                </CardContent>
                            </Card>

                            {data.errorsByDate && data.errorsByDate.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Error Timeline</CardTitle>
                                        <CardDescription>
                                            Error trends over time
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

                        {/* New Duration Tab */}
                        <TabsContent value="duration" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Average Duration Over Time</CardTitle>
                                    <CardDescription>
                                        Bot duration trends across the selected time period
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-[400px]">
                                        {data && data.dailyStats && data.dailyStats.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={data.dailyStats.map(day => {
                                                        // Calculate average duration for each day
                                                        // Filter the bots for this day
                                                        const dayDate = new Date(day.date).toISOString().split('T')[0];
                                                        const botsForDay = data.allBots.filter(bot => {
                                                            const botDate = new Date(bot.created_at).toISOString().split('T')[0];
                                                            return botDate === dayDate;
                                                        });

                                                        // Calculate average duration
                                                        const totalDuration = botsForDay.reduce((sum, bot) => sum + (bot.duration || 0), 0);
                                                        const avgDuration = botsForDay.length > 0 ? totalDuration / botsForDay.length : 0;

                                                        // Convert to minutes
                                                        const avgDurationMinutes = avgDuration / 60;

                                                        return {
                                                            date: day.date,
                                                            avgDuration: avgDurationMinutes,
                                                            totalBots: day.totalBots
                                                        };
                                                    })}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="date"
                                                        angle={-45}
                                                        textAnchor="end"
                                                        height={60}
                                                        tickFormatter={(date) => {
                                                            return new Date(date).toLocaleDateString(undefined, {
                                                                month: 'short',
                                                                day: 'numeric'
                                                            });
                                                        }}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        label={{
                                                            value: 'Average Duration (minutes)',
                                                            angle: -90,
                                                            position: 'insideLeft',
                                                            style: { textAnchor: 'middle' }
                                                        }}
                                                    />
                                                    <YAxis
                                                        yAxisId="right"
                                                        orientation="right"
                                                        label={{
                                                            value: 'Number of Bots',
                                                            angle: 90,
                                                            position: 'insideRight',
                                                            style: { textAnchor: 'middle' }
                                                        }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value, name) => {
                                                            if (name === 'avgDuration') {
                                                                const numValue = Number(value);
                                                                return [`${!isNaN(numValue) ? numValue.toFixed(1) : '0.0'} minutes`, 'Avg Duration'];
                                                            }
                                                            return [String(value), 'Total Bots'];
                                                        }}
                                                        labelFormatter={(label) => {
                                                            return new Date(label).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            });
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Line
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="avgDuration"
                                                        stroke={chartColors.chart1}
                                                        name="Avg Duration"
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                    <Line
                                                        yAxisId="right"
                                                        type="monotone"
                                                        dataKey="totalBots"
                                                        stroke={chartColors.chart5}
                                                        name="Total Bots"
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                        strokeDasharray="5 5"
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <p className="text-muted-foreground">No duration data available for the selected period.</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Duration Distribution</CardTitle>
                                    <CardDescription>
                                        Distribution of bot durations across different platforms
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-[400px]">
                                        {data && data.allBots && data.allBots.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={(() => {
                                                        // Group bots by platform and calculate average durations
                                                        const platformData: Record<string, { count: number, totalDuration: number }> = {};

                                                        data.allBots.forEach(bot => {
                                                            if (!platformData[bot.platform]) {
                                                                platformData[bot.platform] = { count: 0, totalDuration: 0 };
                                                            }
                                                            platformData[bot.platform].count += 1;
                                                            platformData[bot.platform].totalDuration += (bot.duration || 0);
                                                        });

                                                        return Object.entries(platformData).map(([platform, data]) => ({
                                                            platform,
                                                            avgDuration: data.count > 0 ? (data.totalDuration / data.count) / 60 : 0, // Convert to minutes
                                                            botCount: data.count
                                                        }));
                                                    })()}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="platform" />
                                                    <YAxis
                                                        label={{
                                                            value: 'Average Duration (minutes)',
                                                            angle: -90,
                                                            position: 'insideLeft',
                                                            style: { textAnchor: 'middle' }
                                                        }}
                                                    />
                                                    <Tooltip
                                                        formatter={(value) => {
                                                            const numValue = typeof value === 'number' ? value : 0;
                                                            return [`${numValue.toFixed(1)} minutes`, 'Avg Duration'];
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Bar
                                                        dataKey="avgDuration"
                                                        name="Avg Duration (minutes)"
                                                        fill={chartColors.chart3}
                                                        background={{ fill: '#eee' }}
                                                    >
                                                        {(() => {
                                                            const platforms = Object.keys(data.allBots.reduce((acc, bot) => {
                                                                acc[bot.platform] = true;
                                                                return acc;
                                                            }, {} as Record<string, boolean>));

                                                            return platforms.map((platform, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={chartColors[`chart${(index % 10) + 1}` as keyof typeof chartColors]}
                                                                    onClick={() => {
                                                                        // Select all bots for this platform
                                                                        const platformBots = data.allBots.filter(bot => bot.platform === platform);
                                                                        selectBotsByCategory(platformBots);
                                                                    }}
                                                                    style={{ cursor: 'pointer' }}
                                                                />
                                                            ));
                                                        })()}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <p className="text-muted-foreground">No duration data available for the selected period.</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}

            {/* Error logs table */}
            {data && (
                <BotLogsTable
                    bots={data.allBots}
                    dateRange={{
                        startDate: dateRange?.startDate ?? null,
                        endDate: dateRange?.endDate ?? null
                    }}
                    onBotSelect={toggleBotSelection}
                />
            )}

            {/* Floating UI for selected bots */}
            <SelectedBotsButton
                dateRange={{
                    startDate: dateRange?.startDate ?? null,
                    endDate: dateRange?.endDate ?? null
                }}
            />
        </div>
    )
}