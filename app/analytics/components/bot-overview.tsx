"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatPercentage } from "@/lib/utils";

interface BotOverviewProps {
    totalBots: number;
    successfulBots: number;
    errorBots: number;
}

export function BotOverview({ totalBots, successfulBots, errorBots }: BotOverviewProps) {
    const errorRate = (errorBots / totalBots) * 100;
    const successRate = (successfulBots / totalBots) * 100;

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
                    <CardDescription>All deployed meeting bots</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(totalBots)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Last 30 days
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Successful Bots</CardTitle>
                    <CardDescription>Bots completed without errors</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-success">{formatNumber(successfulBots)}</div>
                    <div className="flex items-center mt-1">
                        <span className="text-xs text-success">
                            {formatPercentage(successRate)} success rate
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Error Bots</CardTitle>
                    <CardDescription>Bots that encountered errors</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">{formatNumber(errorBots)}</div>
                    <div className="flex items-center mt-1">
                        <span className="text-xs text-destructive">
                            {formatPercentage(errorRate)} error rate
                        </span>
                    </div>
                </CardContent>
            </Card>
        </>
    );
} 