"use client";

import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatDate, formatNumber, platformColors } from "@/lib/utils";
import { Fragment } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface DailyStats {
    date: string;
    totalBots: number;
    errorBots: number;
    platforms: {
        [key: string]: number;
    };
}

interface BotPerformanceChartProps {
    dailyStats: DailyStats[];
}

export function BotPerformanceChart({ dailyStats }: BotPerformanceChartProps) {
    // Process data for the charts
    const chartData = dailyStats.map((day) => ({
        date: day.date,
        formattedDate: formatDate(day.date),
        total: day.totalBots,
        errors: day.errorBots,
        success: day.totalBots - day.errorBots,
        ...day.platforms,
    }));

    // Config for success/error chart
    const statusChartConfig: ChartConfig = {
        total: {
            label: "Total Bots",
            color: "hsl(var(--chart-1))",
        },
        success: {
            label: "Successful",
            color: "hsl(var(--success))",
        },
        errors: {
            label: "Errors",
            color: "hsl(var(--destructive))",
        },
    };

    // Config for platform distribution chart
    const platformChartConfig: ChartConfig = {
        "google_meet": {
            label: "Google Meet",
            color: platformColors["Google Meet"],
        },
        "zoom": {
            label: "Zoom",
            color: platformColors["Zoom"],
        },
        "teams": {
            label: "Teams",
            color: platformColors["Teams"],
        },
    };

    return (
        <div className="space-y-8">
            {/* Success vs. Error Chart */}
            <div className="h-80">
                <h3 className="text-lg font-medium mb-4">Success vs. Error Rate</h3>
                <ChartContainer config={statusChartConfig} className="h-full">
                    <Fragment>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="formattedDate"
                                    tickLine={false}
                                    axisLine={false}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={35}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value: any) => formatNumber(value)}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area
                                    type="monotone"
                                    dataKey="success"
                                    stackId="1"
                                    stroke="hsl(var(--success))"
                                    fillOpacity={1}
                                    fill="url(#colorSuccess)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="errors"
                                    stackId="1"
                                    stroke="hsl(var(--destructive))"
                                    fillOpacity={1}
                                    fill="url(#colorErrors)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Fragment>
                </ChartContainer>
            </div>

            {/* Platform Distribution Chart */}
            <div className="h-80">
                <h3 className="text-lg font-medium mb-4">Platform Distribution</h3>
                <ChartContainer config={platformChartConfig} className="h-full">
                    <Fragment>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="formattedDate"
                                    tickLine={false}
                                    axisLine={false}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={35}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value: any) => formatNumber(value)}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Line
                                    type="monotone"
                                    dataKey="Google Meet"
                                    stroke={platformColors["Google Meet"]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Zoom"
                                    stroke={platformColors["Zoom"]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Teams"
                                    stroke={platformColors["Teams"]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Fragment>
                </ChartContainer>
            </div>
        </div>
    );
} 