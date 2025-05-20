import { ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import type { PlatformName } from "./types"

/**
 * Combines class names with Tailwind CSS using clsx and twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number with commas as thousands separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

/**
 * Formats a percentage value with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Formats a date in a human-readable format (May 1, 2024)
 */
export function formatDate(dateString: string): string {
  return dayjs(dateString).format("MMM D, YYYY")
}

/**
 * Formats a date range as a string (May 1 - May 21, 2024)
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${dayjs(startDate).format("MMM D")} - ${dayjs(endDate).format("MMM D, YYYY")}`
}

/**
 * Formats a date string to be used in URL parameters (YYYY-MM-DD)
 */
export function formatDateString(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD")
}

/**
 * Color values for different meeting platforms
 */
export const platformColors: Record<PlatformName | string, string> = {
  "google meet": "hsl(var(--chart-1))",
  zoom: "hsl(var(--chart-2))",
  teams: "hsl(var(--chart-3))",
  unknown: "hsl(var(--chart-4))"
}

/**
 * Capitalizes the first letter of each word in a string
 */
export function capitalize(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Creates a random ID string
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * Returns a color based on status type
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "success":
      return "hsl(var(--success))"
    case "error":
      return "hsl(var(--destructive))"
    case "warning":
      return "hsl(var(--warning))"
    case "pending":
      return "hsl(var(--muted))"
    default:
      return "hsl(var(--muted-foreground))"
  }
}

// Chart utility functions
export function getChartColorVars(config: Record<string, { color: string }>) {
  return Object.entries(config).reduce((acc, [key, value]) => {
    return Object.assign(acc, {
      [`--color-${key}`]: value.color
    })
  }, {})
}

// Status colors
export const statusColors = {
  success: "hsl(var(--success))",
  error: "hsl(var(--destructive))"
}
