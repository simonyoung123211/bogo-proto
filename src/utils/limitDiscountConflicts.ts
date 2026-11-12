import calendar from 'chinese-days/dist/chinese-days.json' with { type: 'json' }
import type { LimitDiscountActivityForm as Activity } from '../types'
import { resolveActivityProducts } from './activityProductSearch'
import { eligibleDiscountStores, selectedDiscountAreas } from './limitDiscountScope'

const DAY = 86_400_000

function common<T>(left: T[], right: T[]) {
  const allowed = new Set(right)
  return left.filter((value) => allowed.has(value))
}

function goods(activity: Activity) {
  return resolveActivityProducts({
    productScope: activity.goodsScope === 'all' ? 'all' : 'partial',
    productSelectionMode: activity.goodsScope === 'exclude' ? 'exclude' : 'include',
    productIds: activity.productItems.map((item) => item.productId),
  }).map((product) => product.id)
}

// 日历按门店本地的日期/钟点比较，使用 UTC 算术避免浏览器时区改变周期。
function civilTime(value: string) {
  return Date.parse(value.replace(' ', 'T') + 'Z')
}

function clockTime(value: string) {
  const [hour, minute, second = 0] = value.split(':').map(Number)
  return ((hour * 60 + minute) * 60 + second) * 1000
}

function windows(activity: Activity) {
  if (activity.timeSlotType === 'all_day') return [{ start: 0, end: DAY }]
  return activity.timeSlots.filter((slot) => slot.start && slot.end)
    .map((slot) => ({ start: clockTime(slot.start), end: clockTime(slot.end) }))
}

function activeDay(activity: Activity, date: Date, day: string) {
  if (activity.cycleType === 'weekly' && !activity.weekDays.includes(date.getUTCDay() || 7)) return false
  if (activity.cycleType === 'monthly' && !activity.monthDays.includes(date.getUTCDate())) return false
  if (activity.holidayInactive && Object.hasOwn(calendar.holidays, day)) return false
  return !activity.inactiveRanges.some((range) => range.start && range.end && range.start <= day && day <= range.end)
}

function overlappingTime(a: Activity, b: Activity) {
  const start = Math.max(civilTime(a.startTime), civilTime(b.startTime))
  const end = Math.min(civilTime(a.endTime), civilTime(b.endTime))
  if (!(start < end)) return null
  if (a.cycleType === 'weekly' && b.cycleType === 'weekly' && !common(a.weekDays, b.weekDays).length) return null
  if (a.cycleType === 'monthly' && b.cycleType === 'monthly' && !common(a.monthDays, b.monthDays).length) return null
  const slots = windows(a).flatMap((left) => windows(b).map((right) => ({
    start: Math.max(left.start, right.start), end: Math.min(left.end, right.end),
  }))).filter((slot) => slot.start < slot.end).sort((l, r) => l.start - r.start)
  if (!slots.length) return null
  for (let midnight = Math.floor(start / DAY) * DAY; midnight < end; midnight += DAY) {
    const date = new Date(midnight)
    const day = date.toISOString().slice(0, 10)
    if (!activeDay(a, date, day) || !activeDay(b, date, day)) continue
    for (const slot of slots) {
      const from = Math.max(midnight + slot.start, start)
      const to = Math.min(midnight + slot.end, end)
      if (from < to) {
        const time = (value: number) => new Date(value).toISOString().slice(11, 19)
        return `${day} ${time(from)}–${to === midnight + DAY ? '24:00:00' : time(to)}`
      }
    }
  }
  return null
}

export interface DiscountConflict {
  activity: Activity
  time: string
  stores: { id: string; name: string; areas: string[] | null }[]
}

export function findDiscountConflicts(target: Activity, activities: Activity[]): DiscountConflict[] {
  const results: DiscountConflict[] = []
  const storeIds = new Set(eligibleDiscountStores(target).map((store) => store.id))
  const targetGoods = goods(target)
  for (const other of activities) {
    if (target.id === other.id || ['draft', 'ended', 'voided'].includes(other.status)) continue
    if (other.status === 'paused' && new Date(other.endTime.replace(' ', 'T')).getTime() <= Date.now()) continue
    if (!common(target.channels, other.channels).length || !common(target.orderTypes, other.orderTypes).length) continue
    if (!common(targetGoods, goods(other)).length) continue
    const stores: DiscountConflict['stores'] = []
    for (const store of eligibleDiscountStores(other)) {
      if (!storeIds.has(store.id)) continue
      const left = target.areaMode === 'specified' ? selectedDiscountAreas(target, store.id) : null
      const right = other.areaMode === 'specified' ? selectedDiscountAreas(other, store.id) : null
      const areas = left && right ? left.filter((area) => right.some((r) => r.id === area.id)) : left ?? right
      if (areas?.length === 0) continue
      stores.push({ id: store.id, name: store.name, areas: areas?.map((area) => area.name) ?? null })
    }
    if (!stores.length) continue
    const time = overlappingTime(target, other)
    if (time) results.push({ activity: other, stores, time })
  }
  return results
}
