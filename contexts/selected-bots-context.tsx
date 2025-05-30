"use client"

import type { FormattedBotData } from "@/lib/types"
import { createContext, type ReactNode, useState } from "react"

interface SelectedBotsContextType {
  selectedBots: FormattedBotData[]
  toggleBotSelection: (bot: FormattedBotData, selected?: boolean) => void
  clearSelectedBots: () => void
  isSelected: (botId: string) => boolean
  generateLogsUrl: (startDate: Date | null, endDate: Date | null, botIds?: string[]) => string
  hoveredBots: FormattedBotData[]
  setHoveredBots: (bots: FormattedBotData[]) => void
  selectBotsByCategory: (bots: FormattedBotData[], selected?: boolean) => void
}

export const SelectedBotsContext = createContext<SelectedBotsContextType | undefined>(undefined)

export function SelectedBotsProvider({ children }: { children: ReactNode }) {
  const [selectedBots, setSelectedBots] = useState<FormattedBotData[]>([])
  const [hoveredBots, setHoveredBots] = useState<FormattedBotData[]>([])

  const toggleBotSelection = (bot: FormattedBotData, selected?: boolean) => {
    const isCurrentlySelected = selectedBots.some((selected) => selected.uuid === bot.uuid)

    // If selected is explicitly provided, use that value
    const shouldBeSelected = selected !== undefined ? selected : !isCurrentlySelected

    if (shouldBeSelected && !isCurrentlySelected) {
      setSelectedBots([...selectedBots, bot])
    } else if (!shouldBeSelected && isCurrentlySelected) {
      setSelectedBots(selectedBots.filter((selected) => selected.uuid !== bot.uuid))
    }
  }

  // Add a function to select all bots in a category at once
  const selectBotsByCategory = (bots: FormattedBotData[], selected?: boolean) => {
    if (bots.length === 0) return

    // Check if all bots in this category are already selected
    const allAlreadySelected = bots.every((bot) =>
      selectedBots.some((selected) => selected.uuid === bot.uuid)
    )

    // If selected state is provided, use that, otherwise toggle based on current state
    const shouldSelect = selected !== undefined ? selected : !allAlreadySelected

    if (shouldSelect) {
      // Add all bots that aren't already selected
      const botsToAdd = bots.filter(
        (bot) => !selectedBots.some((selected) => selected.uuid === bot.uuid)
      )

      if (botsToAdd.length > 0) {
        setSelectedBots([...selectedBots, ...botsToAdd])
      }
    } else {
      // Remove all bots in this category
      const botUuids = new Set(bots.map((bot) => bot.uuid))
      setSelectedBots(selectedBots.filter((bot) => !botUuids.has(bot.uuid)))
    }
  }

  const clearSelectedBots = () => {
    setSelectedBots([])
  }

  const isSelected = (botId: string) => {
    return selectedBots.some((bot) => bot.uuid === botId)
  }

  const generateLogsUrl = (startDate: Date | null, endDate: Date | null, botIds?: string[]) => {
    // Format start and end dates
    const startDateParam = startDate ? `${startDate.toISOString().split(".")[0]}Z` : ""

    const endDateParam = endDate ? `${endDate.toISOString().split(".")[0]}Z` : ""

    // Use provided botIds or take from selectedBots
    const botUuids = botIds || selectedBots.map((bot) => bot.uuid)

    // Return URL with bot UUIDs, if any
    return botUuids.length > 0
      ? `https://logs.meetingbaas.com/?startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}&bot_uuid=${botUuids.join("%2C")}`
      : `https://logs.meetingbaas.com/?startDate=${encodeURIComponent(startDateParam)}&endDate=${encodeURIComponent(endDateParam)}`
  }

  return (
    <SelectedBotsContext.Provider
      value={{
        selectedBots,
        toggleBotSelection,
        clearSelectedBots,
        isSelected,
        generateLogsUrl,
        hoveredBots,
        setHoveredBots,
        selectBotsByCategory
      }}
    >
      {children}
    </SelectedBotsContext.Provider>
  )
}
