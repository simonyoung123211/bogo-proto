import { DISCOUNT_STORE_POLICY_REASONS, getDiscountAreas, storeHasDiscountTag } from '../mockLimitDiscountAreas'
import type { LimitDiscountActivityForm, Store } from '../types'
import { getResolvedStores } from './storeRegistry'

type Activity = LimitDiscountActivityForm

export function isDiscountAreaScene(sceneId: string) {
  return sceneId === 'dine_in' || sceneId === 'pack'
}

export function hasSpecifiedDiscountAreas(activity: Pick<Activity, 'storeMode' | 'areaMode' | 'orderTypes'>) {
  return activity.storeMode === 'include' && activity.areaMode === 'specified' && activity.orderTypes.some(isDiscountAreaScene)
}

export function discountStoreScopeError(activity: Activity) {
  switch (activity.storeMode) {
    case 'include': return activity.storeIds.length ? undefined : '请先选择参与门店'
    case 'exclude': return activity.storeIds.length ? undefined : '请先选择不参与门店'
    case 'tag_include': return activity.storeTagIds.length ? undefined : '请先选择参与活动的门店标签'
    case 'tag_exclude': return activity.storeTagIds.length ? undefined : '请先选择不参与活动的门店标签'
  }
}

export function resolveDiscountStoreScope(activity: Activity) {
  const openStores = getResolvedStores().filter((store) => store.status === 'open')
  const scopeError = discountStoreScopeError(activity)
  const tagsApply = activity.storeMode === 'tag_include' || activity.storeMode === 'tag_exclude'
  const tagMatches = tagsApply
    ? openStores.filter((store) => activity.storeTagIds.some((tag) => storeHasDiscountTag(store.id, tag)))
    : []
  const taggedIds = new Set(tagMatches.map((store) => store.id))
  const selectedIds = new Set(activity.storeIds)
  const matchedStores = scopeError ? [] : openStores.filter(({ id }) => {
    switch (activity.storeMode) {
      case 'include': return selectedIds.has(id)
      case 'exclude': return !selectedIds.has(id)
      case 'tag_include': return taggedIds.has(id)
      case 'tag_exclude': return !taggedIds.has(id)
      default: return true
    }
  })
  const policyExcludedStores = matchedStores.filter((store) => DISCOUNT_STORE_POLICY_REASONS[store.id])
  const eligibleStores = matchedStores.filter((store) => !DISCOUNT_STORE_POLICY_REASONS[store.id])
  return { scopeError, openStores, tagMatches, matchedStores, policyExcludedStores, eligibleStores }
}

export function eligibleDiscountStores(activity: Activity) {
  return resolveDiscountStoreScope(activity).eligibleStores
}

function discountAreaCatalog(stores: Store[]) {
  return stores.map((store) => ({ store, areas: getDiscountAreas(store.id) }))
}

export type DiscountAreaRows = ReturnType<typeof discountAreaCatalog>

export function selectedDiscountAreas(activity: Activity, storeId: string, areas = getDiscountAreas(storeId)) {
  const selected = activity.areaIdsByStore?.[storeId] ?? []
  return areas.filter((area) => selected.includes(area.id) && area.allowsDiscount)
}

export function discountAreaRows(activity: Activity, catalog = discountAreaCatalog(eligibleDiscountStores(activity))) {
  return catalog.map(({ store, areas }) => ({
    store,
    areas: selectedDiscountAreas(activity, store.id, areas),
  })).filter((row) => row.areas.length > 0)
}

export function discountAreaCoverage(activity: Activity, stores: Store[]) {
  const specified = hasSpecifiedDiscountAreas(activity)
  const coversWholeStores = !specified || activity.orderTypes.some((scene) => !isDiscountAreaScene(scene))
  const catalog = specified ? discountAreaCatalog(stores) : []
  const availableStoreCount = catalog.filter(({ areas }) => areas.some((area) => area.allowsDiscount)).length
  const selected = discountAreaRows(activity, catalog)
  const selectedAreaCount = selected.reduce((total, row) => total + row.areas.length, 0)
  const coveredStoreCount = coversWholeStores ? stores.length : selected.length
  return { specified, coversWholeStores, catalog, availableStoreCount, selected, selectedAreaCount, coveredStoreCount }
}

export type DiscountAreaCoverage = ReturnType<typeof discountAreaCoverage>

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

export function matchesDiscountEntry(activity: Activity, storeId: string, areaId: string | null, sceneId = activity.orderTypes[0]) {
  if (!activity.orderTypes.includes(sceneId)) return false
  if (!eligibleDiscountStores(activity).some((store) => store.id === storeId)) return false
  if (!isDiscountAreaScene(sceneId)) return true
  const specified = hasSpecifiedDiscountAreas(activity)
  if (areaId === null) return !specified
  const areas = specified ? selectedDiscountAreas(activity, storeId) : getDiscountAreas(storeId)
  return areas.some((area) => area.id === areaId && area.allowsDiscount)
}

/** 已完成的门店配置在保存时移除超出范围的点位。 */
export function retainEligibleAreaIds(activity: Activity): Activity {
  if (!hasSpecifiedDiscountAreas(activity)) return { ...activity, areaMode: 'all', areaIdsByStore: {} }
  if (discountStoreScopeError(activity)) return activity
  const rows = discountAreaRows(activity)
  return {
    ...activity,
    areaIdsByStore: Object.fromEntries(rows.map(({ store, areas }) => [store.id, areas.map((area) => area.id)])),
  }
}
