import "@/app/globals.css"
import Footer from "@/components/footer"
import Header from "@/components/header"
import { Toaster } from "@/components/ui/sonner"
import { getAuthSession } from "@/lib/auth/session"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import { Sofia_Sans } from "next/font/google"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

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

const authAppUrl = process.env.NEXT_PUBLIC_AUTH_APP_URL
if (!authAppUrl) {
  throw new Error("NEXT_PUBLIC_AUTH_APP_URL environment variable is not defined")
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
      ? `${authAppUrl}/sign-in?redirectTo=${redirectTo}`
      : `${authAppUrl}/sign-in`
    redirect(redirectionUrl)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sofiaSans.className} flex min-h-screen flex-col antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <Header user={session.user} />
          <main className="flex-1"> {children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
