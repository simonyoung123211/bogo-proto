import { useEffect, useState } from 'react'
import type { ActivityStatus } from '../types'

interface ActivityTiming {
  status: ActivityStatus
  endTime?: string
}

const EXPIRY_REMINDER_TIERS = [
  { maxDays: 3, level: 'urgent', label: '紧急' },
  { maxDays: 7, level: 'warning', label: '预警' },
  { maxDays: 15, level: 'notice', label: '提醒' },
] as const

export function getActivityExpiryReminder({ status, endTime }: ActivityTiming, now: number) {
  if (status !== 'in_progress' || !endTime) return null
  const end = new Date(endTime.replace(/-/g, '/'))
  const remainingMs = end.getTime() - now
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null

  const days = Math.ceil(remainingMs / 86_400_000)
  const tier = EXPIRY_REMINDER_TIERS.find(({ maxDays }) => days <= maxDays)
  const remaining = end.toDateString() === new Date(now).toDateString() ? '今日到期' : `剩余 ${days} 天`
  return { level: tier?.level ?? 'normal', label: tier ? `${tier.label} · ${remaining}` : remaining }
}

export function useActivityListClock(activities: readonly ActivityTiming[]) {
  const [now, setNow] = useState(() => Date.now())
  const hasPaused = activities.some(({ status }) => status === 'paused')
  const hasExpiry = activities.some(({ status, endTime }) => status === 'in_progress' && Boolean(endTime))

  useEffect(() => {
    if (!hasPaused && !hasExpiry) return
    const timer = window.setInterval(() => setNow(Date.now()), hasPaused ? 1000 : 60_000)
    return () => window.clearInterval(timer)
  }, [hasPaused, hasExpiry])

  return now
}
