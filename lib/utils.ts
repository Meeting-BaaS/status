import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

// Chart utility functions
export function getChartColorVars(config: Record<string, { color: string }>) {
  return Object.entries(config).reduce((acc, [key, value]) => {
    return {
      ...acc,
      [`--color-${key}`]: value.color,
    };
  }, {});
}

// Platform colors
export const platformColors = {
  "Google Meet": "hsl(var(--chart-1))",
  Zoom: "hsl(var(--chart-2))",
  Teams: "hsl(var(--chart-3))",
};

// Status colors
export const statusColors = {
  success: "hsl(var(--success))",
  error: "hsl(var(--destructive))",
};
