import type { ActivityParticipationRecord, ParticipationFilters } from '../types'
import { participationRecords } from '../participationData'

export function createEmptyParticipationFilters(): ParticipationFilters {
  return {
    keyword: '',
    storeId: 'all',
    status: 'all',
    datePreset: 'all',
    startDate: '',
    endDate: '',
    giftType: 'all',
  }
}

function dateRangeFromPreset(filters: ParticipationFilters): { start: string; end: string } | null {
  const { datePreset, startDate, endDate } = filters
  if (datePreset === 'all') return null
  if (datePreset === 'custom') {
    if (!startDate && !endDate) return null
    return { start: startDate || '0000-00-00', end: endDate || '9999-12-31' }
  }
  const now = new Date('2026-06-22T23:59:59')
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (datePreset === 'today') {
    return { start: fmt(now), end: fmt(now) }
  }
  if (datePreset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return { start: fmt(y), end: fmt(y) }
  }
  const s = new Date(now)
  s.setDate(s.getDate() - 6)
  return { start: fmt(s), end: fmt(now) }
}

export function matchesParticipationFilters(
  record: ActivityParticipationRecord,
  filters: ParticipationFilters,
): boolean {
  const kw = filters.keyword.trim().toLowerCase()
  if (kw) {
    const haystack = `${record.orderId} ${record.userName} ${record.userPhone} ${record.pickupNo}`.toLowerCase()
    if (!haystack.includes(kw)) return false
  }
  if (filters.storeId !== 'all' && record.storeId !== filters.storeId) return false
  if (filters.status !== 'all' && record.status !== filters.status) return false

  const range = dateRangeFromPreset(filters)
  if (range) {
    if (record.businessDay < range.start || record.businessDay > range.end) return false
  }

  if (filters.giftType !== 'all' && !record.giftTypes.includes(filters.giftType)) return false

  return true
}

export function hasActiveParticipationFilters(filters: ParticipationFilters): boolean {
  return (
    filters.keyword.trim() !== '' ||
    filters.storeId !== 'all' ||
    filters.status !== 'all' ||
    filters.datePreset !== 'all' ||
    filters.giftType !== 'all'
  )
}

/** 取某活动的全部参与记录（未过滤） */
export function getActivityParticipationRecords(activityId: string): ActivityParticipationRecord[] {
  return participationRecords.filter((r) => r.activityId === activityId)
}
