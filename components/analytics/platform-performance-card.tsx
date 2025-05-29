"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { cn, formatNumber, formatPercentage } from "@/lib/utils"
import { useMemo } from "react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps as RechartsTooltipProps
} from "recharts"
import { AnimatedNumber } from "../ui/animated-number"

interface PlatformPerformanceCardProps {
  platformDistribution: Array<{
    platform: string
    count: number
    percentage: number
    statusDistribution: {
      success: { count: number; percentage: number }
      error: { count: number; percentage: number }
      warning: { count: number; percentage: number }
      other: { count: number; percentage: number }
    }
  }>
}

const platformColors = {
  zoom: "#4d8cff",
  teams: "#7a7fd1",
  "google meet": "#22c55e",
  unknown: "#76b7b2"
}

const otherStatus = "#a0a0a0"

export function PlatformPerformanceCard({ platformDistribution }: PlatformPerformanceCardProps) {
  const chartData = useMemo(() => {
    const data = platformDistribution.map((item) => ({
      platform: item.platform,
      data: [
        {
          name: "success",
          value: item.statusDistribution.success.count,
          platform: item.platform,
          statusDistribution: item.statusDistribution
        },
        {
          name: "other",
          value:
            item.statusDistribution.error.count +
            item.statusDistribution.warning.count +
            item.statusDistribution.other.count,
          platform: item.platform,
          statusDistribution: item.statusDistribution
        }
      ]
    }))
    return data
  }, [platformDistribution])

  // Create chart configuration
  const chartConfig = useMemo(() => {
    return platformDistribution.reduce(
      (acc, item) => {
        acc[item.platform] = {
          label: item.platform,
          color:
            platformColors[item.platform.toLowerCase() as keyof typeof platformColors] ||
            otherStatus
        }
        return acc
      },
      {} as Record<string, { label: string; color: string }>
    )
  }, [platformDistribution])

  function PlatformPerformanceTooltip(props: RechartsTooltipProps<number, string>) {
    const { active, payload } = props

    if (!active || !payload?.length) return null

    const data = payload[0].payload
    if (!data.statusDistribution) return null

    const total = Object.values(data.statusDistribution).reduce(
      (sum: number, stats) => sum + (stats as { count: number }).count,
      0
    )

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="mb-2 font-medium text-sm capitalize">{data.platform}</p>
        <div className="space-y-1">
          {Object.entries(data.statusDistribution).map(([status, stats]) => {
            const typedStats = stats as { count: number; percentage: number }
            return (
              <div key={status} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      status === "success"
                        ? platformColors[data.platform.toLowerCase() as keyof typeof platformColors]
                        : "transparent"
                  }}
                />
                <span className="capitalize">{status}</span>
                <span className="ml-auto font-medium">{formatNumber(typedStats.count)}</span>
              </div>
            )
          })}
          <div className="mt-2 border-t pt-1">
            <div className="flex items-center justify-between font-medium text-xs">
              <span>Total</span>
              <span>{formatNumber(total)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full md:w-1/2 dark:bg-baas-black">
      <CardHeader>
        <CardTitle>Bot Performance</CardTitle>
        <CardDescription>Success rate across platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-64">
          <ChartContainer config={chartConfig} className="h-full">
            <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
              {chartData.map((platform) => (
                <div key={platform.platform} className="relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platform.data}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={2}
                        animationDuration={400}
                        strokeWidth={0}
                        dataKey="value"
                        nameKey="name"
                      >
                        {platform.data.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              entry.name === "success"
                                ? platformColors[
                                    platform.platform.toLowerCase() as keyof typeof platformColors
                                  ]
                                : otherStatus
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={PlatformPerformanceTooltip}
                        cursor={false}
                        wrapperStyle={{ outline: "none", zIndex: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="flex items-center font-bold text-xs">
                        <AnimatedNumber
                          value={Number(
                            platform.data[0].statusDistribution.success.percentage.toFixed(1)
                          )}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                  <div className="-top-2 absolute right-0 left-0 text-center font-medium text-sm capitalize">
                    {platform.platform}
                  </div>
                </div>
              ))}
            </div>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
