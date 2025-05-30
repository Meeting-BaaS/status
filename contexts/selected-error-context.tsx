"use client"

import { createContext, useState, useEffect, type ReactNode, useCallback, useMemo } from "react"
import type { ErrorDistribution, FormattedBotData } from "@/lib/types"
import { isEqual } from "lodash-es"

interface SelectedErrorContextType {
  selectedErrorValues: string[]
  setSelectedErrorValues: (values: string[]) => void
  reset: () => void
  addErrorValue: (value: string) => void
  removeErrorValue: (value: string) => void
  selectAll: (values: string[]) => void
  selectNone: () => void
  filteredBots: FormattedBotData[]
  botsFilteredByError: boolean
}

export const SelectedErrorContext = createContext<SelectedErrorContextType | undefined>(undefined)

interface SelectedErrorProviderProps {
  children: ReactNode
  initialErrorDistribution: ErrorDistribution[]
  allBots: FormattedBotData[]
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
  const [selectedErrorValues, setSelectedErrorValues] = useState<string[]>(allErrorValues)
  const [filteredBots, setFilteredBots] = useState<FormattedBotData[]>(allBots)

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
      setSelectedErrorValues(validSelectedValues)
      setFilteredBots(getFilteredBots(validSelectedValues))
    }
  }, [initialErrorDistribution, selectedErrorValues, getFilteredBots])

  const addErrorValue = (value: string) => {
    const newSelectedValues = [...selectedErrorValues, value]
    setSelectedErrorValues(newSelectedValues)
    setFilteredBots(getFilteredBots(newSelectedValues))
  }

  const removeErrorValue = (value: string) => {
    const newSelectedValues = selectedErrorValues.filter((v) => v !== value)
    setSelectedErrorValues(newSelectedValues)
    setFilteredBots(getFilteredBots(newSelectedValues))
  }

  const reset = () => {
    setSelectedErrorValues(allErrorValues)
    setFilteredBots(getFilteredBots(allErrorValues))
  }

  const selectAll = (values: string[]) => {
    setSelectedErrorValues(values)
    setFilteredBots(getFilteredBots(values))
  }

  const selectNone = () => {
    setSelectedErrorValues([])
    setFilteredBots(getFilteredBots([]))
  }

  const botsFilteredByError = useMemo(
    () => !isEqual(selectedErrorValues.sort(), allErrorValues.sort()),
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
        filteredBots,
        botsFilteredByError
      }}
    >
      {children}
    </SelectedErrorContext.Provider>
  )
}
