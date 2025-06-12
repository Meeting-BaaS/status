"use client"

import type { Session } from "@/lib/auth/types"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useSession } from "@/hooks/use-session"

interface LayoutRootProps {
  session: Session | null
  children: React.ReactNode
}

export default function LayoutRoot({ children, session: initialSession }: LayoutRootProps) {
  const session = useSession(initialSession)

  return (
    <>
      <Header user={session?.user} />
      <main className="flex grow flex-col">{children}</main>
      <Footer />
    </>
  )
}
