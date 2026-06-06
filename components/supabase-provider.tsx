'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export type SupabaseContextValue = {
  supabase: SupabaseClient<Database>
  user: User | null
  profile: Profile | null
  isLoading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
}

const Context = createContext<SupabaseContextValue | undefined>(undefined)

/**
 * Hook that fetches a user's profile from the 'profiles' table.
 */
function useProfileFetcher(supabase: SupabaseClient<Database>) {
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      setProfileLoading(true)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        return data
      } finally {
        setProfileLoading(false)
      }
    },
    [supabase],
  )

  return { fetchProfile, profileLoading }
}

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { fetchProfile, profileLoading } = useProfileFetcher(supabase)

  const refreshProfile = useCallback(async () => {
    if (user) {
      const result = await fetchProfile(user.id)
      setProfile(result)
    }
  }, [user, fetchProfile])

  // Initial auth check
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      setUser(user)

      if (user) {
        const result = await fetchProfile(user.id)
        if (!cancelled) setProfile(result)
      }

      if (!cancelled) setIsLoading(false)
    }

    init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)

      if (newUser) {
        const result = await fetchProfile(newUser.id)
        setProfile(result)
      } else {
        setProfile(null)
      }

      router.refresh()
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Context.Provider
      value={{
        supabase,
        user,
        profile,
        isLoading,
        profileLoading,
        refreshProfile,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export function useSupabase(): SupabaseContextValue {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}
