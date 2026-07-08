import type { GiftType, Order, OrderListFilters } from '../types'

export function createEmptyOrderFilters(): OrderListFilters {
  return {
    keyword: '',
    storeId: 'all',
    status: 'all',
    datePreset: 'all',
    startDate: '',
    endDate: '',
    marketingType: 'all',
    activityId: 'all',
    giftType: 'all',
  }
}

function dateRangeFromPreset(filters: OrderListFilters): { start: string; end: string } | null {
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
  // last7
  const s = new Date(now)
  s.setDate(s.getDate() - 6)
  return { start: fmt(s), end: fmt(now) }
}

export function matchesOrderFilters(order: Order, filters: OrderListFilters): boolean {
  const kw = filters.keyword.trim().toLowerCase()
  if (kw) {
    const haystack = `${order.id} ${order.buyerName} ${order.buyerPhone} ${order.pickupNo}`.toLowerCase()
    if (!haystack.includes(kw)) return false
  }

  if (filters.storeId !== 'all' && order.storeId !== filters.storeId) return false
  if (filters.status !== 'all' && order.status !== filters.status) return false

  const range = dateRangeFromPreset(filters)
  if (range) {
    const day = order.businessDay
    if (day < range.start || day > range.end) return false
  }

  if (filters.marketingType === 'bogo' && !order.hasBogo) return false
  if (filters.marketingType === 'multi_item' && !order.hasMultiItem) return false

  if (filters.activityId !== 'all') {
    const activityIds = [order.activityId, order.multiItemActivityId].filter(Boolean)
    if (!activityIds.includes(filters.activityId)) return false
  }

  if (filters.giftType !== 'all') {
    const types = collectGiftTypes(order)
    if (!types.includes(filters.giftType)) return false
  }

  return true
}

export function collectGiftTypes(order: Order): GiftType[] {
  const set = new Set<GiftType>()
  order.items.forEach((it) => {
    if (it.isGift && it.giftType) set.add(it.giftType)
  })
  order.discounts.forEach((d) => d.giftTypes.forEach((t) => set.add(t)))
  return [...set]
}

export function hasActiveOrderFilters(filters: OrderListFilters): boolean {
  return (
    filters.keyword.trim() !== '' ||
    filters.storeId !== 'all' ||
    filters.status !== 'all' ||
    filters.datePreset !== 'all' ||
    filters.marketingType !== 'all' ||
    filters.activityId !== 'all' ||
    filters.giftType !== 'all'
  )
}

export function formatMoney(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(2)
}

/** 统计订单中实物赠品的优惠金额小计（原价×数量，不含寄存券） */
export function calcPhysicalGiftDiscountAmount(items: Order['items']): number {
  return items
    .filter((it) => it.isGift && it.giftType === 'physical')
    .reduce((sum, it) => sum + it.originalPrice * it.quantity, 0)
}

/** 统计订单中多件优惠金额小计 */
export function calcMultiItemDiscountAmount(discounts: Order['discounts']): number {
  return discounts
    .filter((d) => d.kind === 'multi_item')
    .reduce((sum, d) => sum + (d.discountAmount ?? 0), 0)
}
