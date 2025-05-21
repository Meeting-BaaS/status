"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { CompactDashboard } from "./compact-dashboard"
import { UsageDashboard } from "./usage-dashboard"

export function Analytics() {
  const [activeTab, setActiveTab] = useState("compact")

  return (
    <div className="px-6 mx-auto">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="compact">Compact View</TabsTrigger>
          <TabsTrigger value="usage">Usage & Tokens</TabsTrigger>
        </TabsList>
        <TabsContent value="compact" className="mt-4">
          <CompactDashboard />
        </TabsContent>
        <TabsContent value="usage" className="mt-4">
          <UsageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
