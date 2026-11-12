import { getDiscountAreas, storeHasDiscountTag } from '../mockLimitDiscountAreas'
import type { LimitDiscountActivityForm } from '../types'
import { getResolvedStores } from './storeRegistry'

type Activity = LimitDiscountActivityForm

export function eligibleDiscountStores(activity: Activity) {
  return getResolvedStores().filter((store) => {
    if (store.status === 'closed') return false
    switch (activity.storeMode) {
      case 'include': return activity.storeIds.includes(store.id)
      case 'exclude': return !activity.storeIds.includes(store.id)
      case 'tag_include': return activity.storeTagIds.some((tag) => storeHasDiscountTag(store.id, tag))
      case 'tag_exclude': return !activity.storeTagIds.some((tag) => storeHasDiscountTag(store.id, tag))
      default: return true
    }
  })
}

export function selectedDiscountAreas(activity: Activity, storeId: string) {
  const selected = activity.areaIdsByStore?.[storeId] ?? []
  return getDiscountAreas(storeId).filter((area) => selected.includes(area.id) && area.allowsDiscount)
}

export function discountAreaRows(activity: Activity) {
  return eligibleDiscountStores(activity).map((store) => ({
    store,
    areas: selectedDiscountAreas(activity, store.id),
  })).filter((row) => row.areas.length > 0)
}

export type DiscountAreaRows = ReturnType<typeof discountAreaRows>

export function updateAreaSelection(previous: Activity['areaIdsByStore'], groups: DiscountAreaRows, checked: boolean) {
  const next = { ...previous }
  for (const { store, areas } of groups) {
    const ids = new Set(previous[store.id])
    for (const area of areas) {
      if (!area.allowsDiscount) continue
      if (checked) ids.add(area.id)
      else ids.delete(area.id)
    }
    if (ids.size) next[store.id] = [...ids]
    else delete next[store.id]
  }
  return next
}

export function matchesDiscountEntry(activity: Activity, storeId: string, areaId: string | null) {
  if (!eligibleDiscountStores(activity).some((store) => store.id === storeId)) return false
  if (areaId === null) return activity.areaMode !== 'specified'
  const areas = activity.areaMode === 'specified' ? selectedDiscountAreas(activity, storeId) : getDiscountAreas(storeId)
  return areas.some((area) => area.id === areaId && area.allowsDiscount)
}

/** 门店范围改变时移除超出新范围的点位。 */
export function retainEligibleAreaIds(activity: Activity): Activity {
  const rows = activity.areaMode === 'specified' ? discountAreaRows(activity) : []
  return {
    ...activity,
    areaIdsByStore: Object.fromEntries(rows.map(({ store, areas }) => [store.id, areas.map((area) => area.id)])),
  }
}
