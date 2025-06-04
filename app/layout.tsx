import "@/app/globals.css"
import LayoutRoot from "@/app/layout-root"
import Providers from "@/components/providers"
import { Toaster } from "@/components/ui/sonner"
import { getAuthSession } from "@/lib/auth/session"
import type { Metadata, Viewport } from "next"
import { Sofia_Sans } from "next/font/google"
import { cookies } from "next/headers"

const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "Status | Meeting BaaS",
  description: "Track Meeting BaaS bots status across Zoom, Google Meet, and Microsoft Teams",
  keywords: [
    "meeting bot status",
    "bot monitoring",
    "error tracking",
    "Meeting BaaS",
    "Zoom",
    "Google Meet",
    "Microsoft Teams"
  ],
  authors: [{ name: "Meeting BaaS" }],
  openGraph: {
    type: "website",
    title: "Status | Meeting BaaS",
    description: "Track Meeting BaaS bots status across Zoom, Google Meet, and Microsoft Teams",
    siteName: "Meeting BaaS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Meeting BaaS Status"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Status | Meeting BaaS",
    description: "Track Meeting BaaS bots status across Zoom, Google Meet, and Microsoft Teams",
    images: ["/og-image.png"]
  },
  category: "Developer Tools",
  applicationName: "Meeting BaaS",
  creator: "Meeting BaaS",
  publisher: "Meeting BaaS",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const requestCookies = await cookies()
  // RSCs need to pass cookies to getAuthSession
  const session = await getAuthSession(requestCookies.toString())

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sofiaSans.className} flex min-h-screen flex-col antialiased`}>
        <Providers>
          <LayoutRoot session={session}>{children}</LayoutRoot>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
