"use client";

// NOTE: Make sure to install @tanstack/react-query if not already: pnpm add @tanstack/react-query
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBotStats } from "@/lib/api";
import { BotOverview } from "./analytics/components/bot-overview";
import { BotPerformanceChart } from "./analytics/components/bot-performance-chart";
import { BotErrorAnalysis } from "./analytics/components/bot-error-analysis";
import { BotPlatformDistribution } from "./analytics/components/bot-platform-distribution";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber, formatPercentage } from "@/lib/utils";

export default function AnalyticsPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["zoom", "google", "teams"]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["botStats", { offset: pageIndex * pageSize, limit: pageSize }],
    queryFn: () => fetchBotStats({ offset: pageIndex * pageSize, limit: pageSize }),
  });

  if (isLoading) return <div>Loading…</div>;
  if (isError) return <div>Error: {error instanceof Error ? error.message : "Unknown error"}</div>;

  // Assume API returns { totalBots, successfulBots, errorBots, dailyStats, platformDistribution, errorTypes }
  const { totalBots, successfulBots, errorBots, dailyStats, platformDistribution, errorTypes } = data;

  const errorRate = (errorBots / totalBots) * 100;
  const successRate = (successfulBots / totalBots) * 100;

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    // Don't allow deselecting all platforms
    if (selectedPlatforms.length === 1 && selectedPlatforms.includes(platform)) {
      return;
    }

    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header section */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Meeting Bot Analytics</h1>
            <p className="text-muted-foreground text-sm">
              Monitor your meeting bot performance and statistics
            </p>
          </div>
          <div>
            <select
              className="border rounded px-3 py-1.5 text-sm bg-background"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <option value="day">Last 7 Days</option>
              <option value="week">Last 3 Weeks</option>
              <option value="month">Last Month</option>
            </select>
          </div>
        </div>

        {/* Platform Distribution & Filters - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="border rounded-lg p-6 bg-card h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Platform Distribution</h2>
                <div className="text-sm font-medium">
                  Total: <span className="font-bold">{formatNumber(totalBots)}</span> bots
                </div>
              </div>
              <div className="h-[250px]">
                <BotPlatformDistribution
                  platformDistribution={platformDistribution}
                />
              </div>
            </div>
          </div>

          {/* Platform Selection Toggles */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-lg font-semibold mb-4">Platform Filters</h2>
            <div className="space-y-3">
              {platformDistribution.map((platform: { platform: string; count: number; percentage: number }) => (
                <div
                  key={platform.platform}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer border ${selectedPlatforms.includes(platform.platform.toLowerCase())
                    ? 'border-primary bg-primary/10'
                    : 'border-border'
                    }`}
                  onClick={() => togglePlatform(platform.platform.toLowerCase())}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: platform.platform === 'Zoom'
                          ? 'hsl(var(--chart-1))'
                          : platform.platform === 'Google Meet'
                            ? 'hsl(var(--chart-2))'
                            : 'hsl(var(--chart-3))'
                      }}
                    />
                    <span className="font-medium">{platform.platform}</span>
                  </div>
                  <span className="text-sm">{formatNumber(platform.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BotOverview totalBots={totalBots} successfulBots={successfulBots} errorBots={errorBots} />
        </div>
      </div>

      {/* Tabbed interface */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="performance">Bot Performance</TabsTrigger>
          <TabsTrigger value="error-analysis">Error Analysis</TabsTrigger>
        </TabsList>

        {/* Bot Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Bot Performance</h2>
              <div className="text-sm text-muted-foreground">
                Last {dailyStats.length} days
              </div>
            </div>
            <div className="h-[400px]">
              <BotPerformanceChart dailyStats={dailyStats} />
            </div>
          </div>
        </TabsContent>

        {/* Error Analysis Tab */}
        <TabsContent value="error-analysis" className="space-y-6">
          <div className="border rounded-lg p-6 bg-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Error Distribution</h2>
              <div className="rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                {formatPercentage(errorRate)} Error Rate
              </div>
            </div>
            <BotErrorAnalysis errorTypes={errorTypes} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

