"use client"

import { useQuery } from "@tanstack/react-query"
import { getAuthSession } from "@/lib/auth/session"
import type { Session } from "@/lib/auth/types"

export function useSession(initialSession?: Session | null) {
  const { data: session } = useQuery<Session | null>({
    queryKey: ["session"],
    queryFn: () => getAuthSession(),
    initialData: initialSession,
    staleTime: 0,
    gcTime: 0,
    // Refetch session on window focus, to ensure session is up to date
    refetchOnWindowFocus: true,
    // Don't refetch on mount since layout already has the initial session
    refetchOnMount: false,
    retry: false
  })

  return session
}
