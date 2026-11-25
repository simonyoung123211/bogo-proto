import calendar from 'chinese-days/dist/chinese-days.json' with { type: 'json' }
import type { LimitDiscountActivityForm as Activity } from '../types'
import { resolveActivityProducts } from './activityProductSearch'
import {
  discountAreaCoverage, eligibleDiscountStores, hasSpecifiedDiscountAreas, isDiscountAreaScene,
  selectedDiscountAreas, updateAreaSelection,
} from './limitDiscountScope'

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
        const dateTime = (value: number) => new Date(value).toISOString().slice(0, 19).replace('T', ' ')
        return {
          time: `${day} ${time(from)}–${to === midnight + DAY ? '24:00:00' : time(to)}`,
          dateRange: { start: dateTime(start), end: dateTime(end) },
        }
      }
    }
  }
  return null
}

export interface DiscountConflict {
  activity: Activity
  time: string
  dateRange: { start: string; end: string }
  channels: string[]
  scenes: string[]
  productIds: string[]
  stores: {
    id: string
    name: string
    areas: string[] | null
    areaIds: string[] | null
    storeWideScenes: string[]
  }[]
}

export function findDiscountConflicts(target: Activity, activities: Activity[]): DiscountConflict[] {
  const results: DiscountConflict[] = []
  const storeIds = new Set(eligibleDiscountStores(target).map((store) => store.id))
  const targetGoods = goods(target)
  for (const other of activities) {
    if (target.id === other.id || ['draft', 'ended', 'voided'].includes(other.status)) continue
    if (other.status === 'paused' && new Date(other.endTime.replace(' ', 'T')).getTime() <= Date.now()) continue
    const channels = common(target.channels, other.channels)
    const scenes = common(target.orderTypes, other.orderTypes)
    if (!channels.length || !scenes.length) continue
    const productIds = common(targetGoods, goods(other))
    if (!productIds.length) continue
    const areaScenes = scenes.filter(isDiscountAreaScene)
    const storeScenes = scenes.filter((scene) => !isDiscountAreaScene(scene))
    const targetSpecifiesAreas = areaScenes.length > 0 && hasSpecifiedDiscountAreas(target)
    const otherSpecifiesAreas = areaScenes.length > 0 && hasSpecifiedDiscountAreas(other)
    const overlappingScenes = new Set(storeScenes)
    const stores: DiscountConflict['stores'] = []
    for (const store of eligibleDiscountStores(other)) {
      if (!storeIds.has(store.id)) continue
      const left = targetSpecifiesAreas ? selectedDiscountAreas(target, store.id) : null
      const right = otherSpecifiesAreas ? selectedDiscountAreas(other, store.id) : null
      const areas = left && right ? left.filter((area) => right.some((r) => r.id === area.id)) : left ?? right
      const hasAreaSceneOverlap = areaScenes.length > 0 && areas?.length !== 0
      if (!hasAreaSceneOverlap && !storeScenes.length) continue
      if (hasAreaSceneOverlap) areaScenes.forEach((scene) => overlappingScenes.add(scene))
      stores.push({
        id: store.id, name: store.name,
        areas: areas?.length ? areas.map((area) => area.name) : null,
        areaIds: areas?.length ? areas.map((area) => area.id) : null,
        storeWideScenes: hasAreaSceneOverlap && areas === null ? scenes : storeScenes,
      })
    }
    if (!stores.length) continue
    const time = overlappingTime(target, other)
    if (time) results.push({ activity: other, stores, ...time, channels, scenes: scenes.filter((scene) => overlappingScenes.has(scene)), productIds })
  }
  return results
}

export function discountConflictCoverage(activity: Activity) {
  const { coveredStoreCount, selectedAreaCount } = discountAreaCoverage(activity, eligibleDiscountStores(activity))
  return { stores: coveredStoreCount, areas: selectedAreaCount }
}

export function planDiscountConflictRemoval(activity: Activity, conflicts: DiscountConflict[]) {
  if (!conflicts.length) return undefined
  const overlapping = conflicts.flatMap((conflict) => conflict.stores)
  const specified = hasSpecifiedDiscountAreas(activity)
  if (specified && overlapping.some((store) => store.storeWideScenes.length > 0)) {
    return { kind: 'unavailable', message: '有业务在整店范围内重叠，请调整参与门店或活动时间。' } as const
  }
  if (!specified && (activity.storeMode === 'tag_include' || activity.storeMode === 'tag_exclude')) {
    return { kind: 'unavailable', message: '标签范围可返回「参与门店」调整。' } as const
  }
  let next: Activity
  if (specified) {
    const idsByStore = new Map<string, Set<string>>()
    for (const store of overlapping) {
      const ids = idsByStore.get(store.id) ?? new Set<string>()
      for (const id of store.areaIds ?? []) ids.add(id)
      idsByStore.set(store.id, ids)
    }
    const groups = discountAreaCoverage(activity, eligibleDiscountStores(activity)).selected
      .map(({ store, areas }) => ({ store, areas: areas.filter((area) => idsByStore.get(store.id)?.has(area.id)) }))
      .filter(({ areas }) => areas.length > 0)
    next = { ...activity, areaIdsByStore: updateAreaSelection(activity.areaIdsByStore, groups, false) }
  } else {
    const storeIds = new Set(overlapping.map(({ id }) => id))
    next = activity.storeMode === 'include'
      ? { ...activity, storeIds: activity.storeIds.filter((id) => !storeIds.has(id)) }
      : { ...activity, storeMode: 'exclude', storeIds: [...new Set([
        ...(activity.storeMode === 'exclude' ? activity.storeIds : []), ...storeIds,
      ])] }
  }
  const after = discountConflictCoverage(next)
  const canApply = after.stores > 0 && (!specified || after.areas > 0)
  return { kind: 'ready', next, before: discountConflictCoverage(activity), after, canApply } as const
}
