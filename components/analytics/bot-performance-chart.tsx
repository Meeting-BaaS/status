"use client"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import { formatDate, formatNumber, platformColors } from "@/lib/utils"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts"
import type { DailyStats } from "@/lib/types"

interface BotPerformanceChartProps {
  dailyStats: DailyStats[]
}

export function BotPerformanceChart({ dailyStats }: BotPerformanceChartProps) {
  // Process data for the charts
  const chartData = dailyStats.map((day) => ({
    date: day.date,
    formattedDate: formatDate(day.date),
    total: day.totalBots,
    errors: day.errorBots,
    success: day.totalBots - day.errorBots,
    ...day.platforms
  }))

  // Config for success/error chart
  const statusChartConfig: ChartConfig = {
    total: {
      label: "Total Bots",
      color: "hsl(var(--chart-1))"
    },
    success: {
      label: "Successful",
      color: "hsl(var(--success))"
    },
    errors: {
      label: "Errors",
      color: "hsl(var(--destructive))"
    }
  }

  // Config for platform distribution chart
  const platformChartConfig: ChartConfig = {
    google_meet: {
      label: "Google Meet",
      color: platformColors["google meet"]
    },
    zoom: {
      label: "Zoom",
      color: platformColors.zoom
    },
    teams: {
      label: "Teams",
      color: platformColors.teams
    }
  }

  return (
    <div className="space-y-8">
      {/* Success vs. Error Chart */}
      <div className="h-80">
        <h3 className="text-lg font-medium mb-4">Success vs. Error Rate</h3>
        <ChartContainer config={statusChartConfig} className="h-full">
          <div className="h-full w-full">
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
                <YAxis tickLine={false} axisLine={false} width={35} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: unknown) => formatNumber(Number(value))}
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
          </div>
        </ChartContainer>
      </div>

      {/* Platform Distribution Chart */}
      <div className="h-80">
        <h3 className="mb-4 font-medium text-lg">Platform Distribution</h3>
        <ChartContainer config={platformChartConfig} className="h-full">
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis tickLine={false} axisLine={false} width={35} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: unknown) => formatNumber(Number(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="google meet"
                  stroke={platformColors["google meet"]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="zoom"
                  stroke={platformColors.zoom}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="teams"
                  stroke={platformColors.teams}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>
    </div>
  )
}
