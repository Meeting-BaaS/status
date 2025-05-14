/* (1) Import { getAuthSession } from '@/lib/auth/session' (or your custom auth session getter) if it's exported (or update the import accordingly). (If your auth session getter is exported as "getAuthSession" (or another name), update accordingly.) */
import { getAuthSession } from "@/lib/auth/session";

/* (2) Import { Providers } from './providers' (which we created) so that the module is resolved. (Ensure that app/providers.tsx is present.) */
import { Providers } from "./providers";

import "@/app/globals.css"
import Footer from "@/components/footer"
import Header from "@/components/header"
import { Toaster } from "@/components/ui/sonner"
import { Metadata, Viewport } from "next"
import { Sofia_Sans } from "next/font/google"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { AUTH_APP_URL } from "@/lib/external-urls"

const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "Analytics | Meeting BaaS",
  description: "Meeting BaaS analytics dashboard for monitoring bot performance"
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
  const requestHeaders = await headers()
  const session = await getAuthSession(requestHeaders)

  if (!session) {
    const redirectTo = requestHeaders.get("x-redirect-to")
    const redirectionUrl = redirectTo
      ? `${AUTH_APP_URL}/sign-in?redirectTo=${redirectTo}`
      : `${AUTH_APP_URL}/sign-in`
    redirect(redirectionUrl)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sofiaSans.className} flex min-h-screen flex-col antialiased`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <Header user={session.user} />
            <main className="flex-1"> {children}</main>
            <Footer />
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
