'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type LiveQueryOptions = {
  /** Table name to watch for changes */
  table: string
  /** Event filter (default: '*' — any change) */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  /** Optional filter on a specific column value (e.g. { teacher_id: user.id }) */
  filter?: Record<string, string>
  /** Polling interval in ms as fallback (default: 10000, set 0 to disable polling) */
  pollInterval?: number
  /** Disable the subscription */
  enabled?: boolean
}

/**
 * A hook that fetches data and keeps it live via Supabase Realtime + polling fallback.
 *
 * The `fetcher` callback is called:
 *   1. On mount
 *   2. When a matching Realtime event fires
 *   3. On a polling interval (default 10s) as fallback
 *
 * Returns `{ data, loading, error, refresh }`.
 */
export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  options: LiveQueryOptions,
) {
  const {
    table,
    event = '*',
    filter,
    pollInterval = 10000,
    enabled = true,
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and whenever enabled changes
  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    doFetch()
  }, [doFetch, enabled])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `live-${table}-${event}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    let channel: ReturnType<typeof supabase.channel>

    try {
      const filterConfig: Record<string, unknown> = {
        event,
        schema: 'public',
        table,
      }
      if (filter && Object.keys(filter).length > 0) {
        // For column-level filtering, Supabase expects event-specific filter
        // We'll handle this by doing a generic subscription
      }

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event, schema: 'public', table } as {
            event: string
            schema: string
            table: string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            doFetch()
          },
        )
        .subscribe()
    } catch {
      // Realtime not available — polling fallback will handle it
    }

    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel)
        }
      } catch {
        // cleanup
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, enabled])

  // Polling fallback
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return

    const interval = setInterval(() => {
      doFetch()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [doFetch, pollInterval, enabled])

  return { data, loading, error, refresh: doFetch }
}
