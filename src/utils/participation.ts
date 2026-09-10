import type { ActivityParticipationRecord, ParticipationFilters } from '../types'
import { participationRecords } from '../participationData'

export function createEmptyParticipationFilters(): ParticipationFilters {
  return {
    activityIds: [],
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
  // 活动范围为空表示全部活动
  if (filters.activityIds.length > 0 && !filters.activityIds.includes(record.activityId)) return false

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

/** 全量参与记录，跨活动查询的数据来源 */
export function getAllParticipationRecords(): ActivityParticipationRecord[] {
  return participationRecords
}

/** 各活动的参与记录条数，用于活动选择器提示哪些活动有数据 */
export function countRecordsByActivity(): Map<string, number> {
  const map = new Map<string, number>()
  participationRecords.forEach((r) => {
    map.set(r.activityId, (map.get(r.activityId) ?? 0) + 1)
  })
  return map
}

export interface ParticipationActivitySummary {
  activityId: string
  /** 参与人次 = 记录条数 */
  records: number
  /** 参与用户数，按手机号去重 */
  users: number
  /** 优惠总额 */
  discountTotal: number
  /** 其中已退款笔数 */
  refunds: number
  /** 最近一次参与时间 */
  lastParticipatedAt: string
}

/**
 * 按活动汇总参与记录。活动数量多时，运营先看哪些活动有量，
 * 再下钻到明细，避免直接翻几千条记录。
 */
export function summarizeByActivity(
  records: ActivityParticipationRecord[],
): ParticipationActivitySummary[] {
  const grouped = new Map<string, ActivityParticipationRecord[]>()
  records.forEach((r) => {
    const list = grouped.get(r.activityId)
    if (list) list.push(r)
    else grouped.set(r.activityId, [r])
  })

  return [...grouped.entries()]
    .map(([activityId, list]) => ({
      activityId,
      records: list.length,
      users: new Set(list.map((r) => r.userPhone)).size,
      discountTotal: list.reduce((sum, r) => sum + r.discountAmount, 0),
      refunds: list.filter((r) => r.status === 'refunded').length,
      lastParticipatedAt: list.reduce((max, r) => (r.participatedAt > max ? r.participatedAt : max), ''),
    }))
    .sort((a, b) => b.records - a.records)
}

export interface ParticipationTotals {
  records: number
  activities: number
  users: number
  discountTotal: number
}

/** 当前筛选结果的合计，展示在列表上方 */
export function sumParticipation(records: ActivityParticipationRecord[]): ParticipationTotals {
  return {
    records: records.length,
    activities: new Set(records.map((r) => r.activityId)).size,
    users: new Set(records.map((r) => r.userPhone)).size,
    discountTotal: records.reduce((sum, r) => sum + r.discountAmount, 0),
  }
}
