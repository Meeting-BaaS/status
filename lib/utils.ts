import { type ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"
import type { BotData, PlatformName } from "@/lib/types"
import utc from "dayjs/plugin/utc"
import { countBy } from "lodash-es"
dayjs.extend(utc)

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
 * Formats a duration in minutes
 */
export const formatDuration = (value: number) => {
  const minutes = Math.round(value / 60)
  return `${formatNumber(minutes)}m`
}

export function getErrorMessageColor(priority?: string) {
  if (priority === "critical") return "text-destructive"
  if (priority === "high") return "text-amber-500"
  return "text-foreground"
}

export function getPriorityForError(category?: string): string {
  switch (category) {
    case "system_error":
    case "stalled_error":
    case "user_reported_error":
      return "critical"
    case "auth_error":
    case "capacity_error":
    case "connection_error":
      return "high"
    case "permission_error":
    case "input_error":
    case "duplicate_error":
    case "unknown_error":
      return "medium"
    case "webhook_error":
    case "api_error":
      return "low"
    default:
      return "medium"
  }
}

export function getErrorPlatformDistribution(bots: BotData[]): Record<PlatformName, number> {
  const platformCounts = countBy(bots, "meeting_platform")
  return Object.fromEntries(
    Object.entries(platformCounts).map(([platform, count]) => [platform as PlatformName, count])
  ) as Record<PlatformName, number>
}

export function extractWebhookStatus(details?: string | null): string | null {
  if (!details) return null
  const statusMatch = details.match(/Status: (\d+)/)
  return statusMatch?.[1] || null
}

export function extractStalledHours(details?: string | null): number | null {
  if (!details) return null
  const hoursMatch = details.match(/pending for (\d+\.?\d*) hours/)
  return hoursMatch?.[1] ? Number.parseFloat(hoursMatch[1]) : null
}

export function getStalledErrorType(hours: number): string {
  if (hours < 24) return "Stalled (< 24h)"
  if (hours < 48) return "Stalled (24-48h)"
  return "Stalled (> 48h)"
}

/**
 * Get all unique dates from an array of bots
 */
export function getUniqueDates(bots: BotData[]): string[] {
  return Array.from(new Set(bots.map((bot) => dayjs(bot.created_at).format("YYYY-MM-DD")))).sort()
}

/**
 * Get all unique priorities from error bots
 */
export function getUniquePriorities(bots: BotData[]): string[] {
  return Array.from(
    new Set(
      bots
        .filter((bot) => ["error", "warning"].includes(bot.status.type.toLowerCase()))
        .map((bot) => getPriorityForError(bot.status.category || "unknown_error"))
    )
  )
}

/**
 * Get bots with valid duration
 */
export function getBotsWithDuration(bots: BotData[]): BotData[] {
  return bots.filter((bot) => bot.duration && bot.duration > 0)
}

export const platformGradients = {
  zoom: {
    start: "var(--platform-zoom-start)",
    middle: "var(--platform-zoom-middle)",
    end: "var(--platform-zoom-end)"
  },
  teams: {
    start: "var(--platform-teams-start)",
    middle: "var(--platform-teams-middle)",
    end: "var(--platform-teams-end)"
  },
  "google-meet": {
    start: "var(--platform-google-meet-start)",
    middle: "var(--platform-google-meet-middle)",
    end: "var(--platform-google-meet-end)"
  },
  unknown: {
    start: "var(--platform-unknown-start)",
    middle: "var(--platform-unknown-middle)",
    end: "var(--platform-unknown-end)"
  }
}

export const platformColors = {
  zoom: platformGradients.zoom.middle,
  teams: platformGradients.teams.middle,
  "google meet": platformGradients["google-meet"].middle,
  unknown: platformGradients.unknown.middle
}

export function isMeetingBaasUser(email?: string) {
  const domain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "meetingbaas.com"
  if (!email) return false
  return email.endsWith(`@${domain}`)
}
