// Meeting BaaS environment prefix for app URLs. For lower environments, it would be something like pre-prod-
// It would be empty for prod.
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || ""

// Meeting BaaS base domain for external app URLs (Without protocol or leading dot)
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "meetingbaas.com"

// Helper to construct environment-aware URLs
const createUrl = (subdomain: string) => {
  if (environment) {
    return `https://${subdomain}.${environment}${BASE_DOMAIN}`
  }
  return `https://${subdomain}.${BASE_DOMAIN}`
}

// Chat App
export const AI_CHAT_URL = createUrl("chat")

// Main app URLs
export const MEETING_BAAS_HOMEPAGE_URL = "https://meetingbaas.com"
export const TERMS_AND_CONDITIONS_URL = `${MEETING_BAAS_HOMEPAGE_URL}/terms-and-conditions`
export const PRIVACY_POLICY_URL = `${MEETING_BAAS_HOMEPAGE_URL}/privacy`

// Utility
export const SETTINGS_URL = createUrl("settings")
export const LOGS_URL = createUrl("logs")
export const CREDENTIALS_URL = `${SETTINGS_URL}/credentials`
export const BILLING_URL = `${createUrl("pricing")}/billing`
export const USAGE_URL = `${createUrl("analytics")}/usage`

// Github
export const GITHUB_REPO_URL = "https://github.com/Meeting-Baas/status"
