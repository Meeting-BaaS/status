"use client"

import { createContext, useState, useEffect, type ReactNode, useCallback, useMemo } from "react"
import type { ErrorDistribution, BotData } from "@/lib/types"
export const SELECTED_ERROR_STORAGE_KEY = "status-selected-errors"

// Critical errors that are part of the default selection; all others are non-critical and excluded by default
const CRITICAL_ERRORS = ["Unknown Error", "Stalled"]

interface SelectedErrorContextType {
  selectedErrorValues: string[]
  setSelectedErrorValues: (values: string[]) => void
  reset: () => void
  addErrorValue: (value: string) => void
  removeErrorValue: (value: string) => void
  selectAll: (values: string[]) => void
  selectNone: () => void
  selectDefault: () => void
  filteredBots: BotData[]
  botsFilteredByError: boolean
  defaultErrorValues: string[]
}

export const SelectedErrorContext = createContext<SelectedErrorContextType | undefined>(undefined)

interface SelectedErrorProviderProps {
  children: ReactNode
  initialErrorDistribution: ErrorDistribution[]
  allBots: BotData[]
}

export function SelectedErrorProvider({
  children,
  initialErrorDistribution,
  allBots
}: SelectedErrorProviderProps) {
  const allErrorValues = useMemo(
    () => initialErrorDistribution.map((item) => item.name),
    [initialErrorDistribution]
  )

  // Default selection: only critical errors (Unknown Error, Stalled); all others are non-critical and excluded
  const defaultErrorValues = useMemo(() => {
    return allErrorValues.filter((value) => CRITICAL_ERRORS.includes(value))
  }, [allErrorValues])

  // Initialize from localStorage if available, otherwise use defaultErrorValues
  const [selectedErrorValues, setSelectedErrorValues] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultErrorValues

    const stored = localStorage.getItem(SELECTED_ERROR_STORAGE_KEY)
    if (!stored) return defaultErrorValues

    try {
      const parsed = JSON.parse(stored) as string[]
      // Validate stored values against available error types
      return parsed.filter((value) => allErrorValues.includes(value))
    } catch {
      return defaultErrorValues
    }
  })

  const [filteredBots, setFilteredBots] = useState<BotData[]>(allBots)

  const getFilteredBots = useCallback(
    (errorValues: string[]) => {
      return allBots.filter((bot) => {
        // Always include pending and success statuses
        if (bot.status.type === "pending" || bot.status.type === "success") {
          return true
        }
        // For error and warning statuses, check against error values
        return errorValues.includes(bot.status.value)
      })
    },
    [allBots]
  )

  // Helper function to update selected values
  const updateSelectedValues = useCallback(
    (newValues: string[]) => {
      setSelectedErrorValues(newValues)
      setFilteredBots(getFilteredBots(newValues))
      localStorage.setItem(SELECTED_ERROR_STORAGE_KEY, JSON.stringify(newValues))
    },
    [getFilteredBots]
  )

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SELECTED_ERROR_STORAGE_KEY && e.newValue) {
        try {
          const newValues = JSON.parse(e.newValue) as string[]
          // Validate the new values against available error types
          const validValues = newValues.filter((value) => allErrorValues.includes(value))
          updateSelectedValues(validValues)
        } catch {
          // If parsing fails, reset to all values
          updateSelectedValues(allErrorValues)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [allErrorValues, updateSelectedValues])

  // Update filtered bots when allBots changes
  useEffect(() => {
    setFilteredBots(getFilteredBots(selectedErrorValues))
  }, [getFilteredBots, selectedErrorValues])

  // Update selected values when initial distribution changes
  useEffect(() => {
    const availableErrorTypes = initialErrorDistribution.map((item) => item.name)
    const validSelectedValues = selectedErrorValues.filter((value) =>
      availableErrorTypes.includes(value)
    )

    if (validSelectedValues.length !== selectedErrorValues.length) {
      updateSelectedValues(validSelectedValues)
    }
  }, [initialErrorDistribution, selectedErrorValues, updateSelectedValues])

  const addErrorValue = (value: string) => {
    const newSelectedValues = [...selectedErrorValues, value]
    updateSelectedValues(newSelectedValues)
  }

  const removeErrorValue = (value: string) => {
    const newSelectedValues = selectedErrorValues.filter((v) => v !== value)
    updateSelectedValues(newSelectedValues)
  }

  const reset = () => {
    updateSelectedValues(allErrorValues)
  }

  const selectAll = (values: string[]) => {
    updateSelectedValues(values)
  }

  const selectNone = () => {
    updateSelectedValues([])
  }

  const selectDefault = () => {
    updateSelectedValues(defaultErrorValues)
  }

  const botsFilteredByError = useMemo(
    () =>
      selectedErrorValues.length !== allErrorValues.length ||
      !selectedErrorValues.every((value) => allErrorValues.includes(value)),
    [selectedErrorValues, allErrorValues]
  )

  return (
    <SelectedErrorContext.Provider
      value={{
        selectedErrorValues,
        setSelectedErrorValues,
        reset,
        addErrorValue,
        removeErrorValue,
        selectAll,
        selectNone,
        selectDefault,
        filteredBots,
        botsFilteredByError,
        defaultErrorValues
      }}
    >
      {children}
    </SelectedErrorContext.Provider>
  )
}
