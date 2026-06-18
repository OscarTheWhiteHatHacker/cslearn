import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, string> = {}

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('subjects').select('id', { count: 'exact', head: true }).limit(1)
    if (error) {
      checks.database = `error: ${error.message}`
    } else {
      checks.database = 'healthy'
    }
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : 'unknown'}`
  }

  const duration = Date.now() - start
  const allHealthy = Object.values(checks).every((v) => v === 'healthy')

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    duration_ms: duration,
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allHealthy ? 200 : 503 })
}
