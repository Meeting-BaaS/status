"use client";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatNumber, formatPercentage, platformColors } from "@/lib/utils";
import { Fragment } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface PlatformDistribution {
    platform: string;
    count: number;
    percentage: number;
}

interface BotPlatformDistributionProps {
    platformDistribution: PlatformDistribution[];
}

// Type guard for platform names
function isPlatformKey(key: string): key is keyof typeof platformColors {
    return key === "Google Meet" || key === "Zoom" || key === "Teams";
}

export function BotPlatformDistribution({ platformDistribution }: BotPlatformDistributionProps) {
    const totalBots = platformDistribution.reduce((sum, item) => sum + item.count, 0);

    // Create chart config
    const chartConfig = platformDistribution.reduce((acc, platform) => {
        const platformKey = platform.platform;
        return {
            ...acc,
            [platformKey.toLowerCase().replace(/\s+/g, "_")]: {
                label: platformKey,
                color: isPlatformKey(platformKey)
                    ? platformColors[platformKey]
                    : `hsl(var(--chart-${(Object.keys(acc).length % 5) + 1}))`,
            },
        };
    }, {} as ChartConfig);

    // Transform data for recharts
    const chartData = platformDistribution.map((platform) => ({
        name: platform.platform.toLowerCase().replace(/\s+/g, "_"),
        value: platform.count,
        label: platform.platform,
        percentage: platform.percentage,
    }));

    return (
        <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="h-80 w-full md:w-1/2 relative">
                <ChartContainer config={chartConfig} className="h-full">
                    {/* Wrap in Fragment to satisfy type requirements */}
                    <Fragment>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
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
                                        />
                                    ))}
                                </Pie>
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value: any) => formatNumber(value)}
                                        />
                                    }
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-4xl font-bold">{formatNumber(totalBots)}</span>
                            <span className="text-sm text-muted-foreground">Total Bots</span>
                        </div>
                    </Fragment>
                </ChartContainer>
            </div>

            <div className="w-full md:w-1/2 space-y-6">
                <h3 className="text-lg font-medium">Platform Breakdown</h3>
                <div className="grid grid-cols-1 gap-4">
                    {platformDistribution.map((platform) => {
                        const platformKey = platform.platform;
                        const backgroundColor = isPlatformKey(platformKey)
                            ? platformColors[platformKey]
                            : `hsl(var(--chart-${(platformDistribution.indexOf(platform) % 5) + 1}))`;

                        return (
                            <div
                                key={platformKey}
                                className="p-4 border rounded-lg bg-card flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor }}
                                    />
                                    <span>{platformKey}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="font-medium">{formatNumber(platform.count)}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatPercentage(platform.percentage)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
} 