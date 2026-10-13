import { stores as baseStores } from '../mockData'
import type { Store } from '../types'

const STORE_STATUS_KEY = 'promo-store-status-overrides-v1'

type StoreStatus = Store['status']

function readOverrides(): Record<string, StoreStatus> {
  try {
    const raw = localStorage.getItem(STORE_STATUS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, StoreStatus>
  } catch {
    return {}
  }
}

function writeOverrides(map: Record<string, StoreStatus>) {
  localStorage.setItem(STORE_STATUS_KEY, JSON.stringify(map))
}

/** 解析后的门店列表（含演示用的已停业覆盖） */
export function getResolvedStores(): Store[] {
  const overrides = readOverrides()
  return baseStores.map((s) => ({
    ...s,
    status: overrides[s.id] ?? s.status,
  }))
}

export function getResolvedStore(id: string): Store | undefined {
  return getResolvedStores().find((s) => s.id === id)
}

export function isStoreClosed(id: string): boolean {
  return getResolvedStore(id)?.status === 'closed'
}

/** 标记门店已停业（演示用，持久化） */
export function markStoreClosed(storeId: string): Store | undefined {
  const store = baseStores.find((s) => s.id === storeId)
  if (!store) return undefined
  const overrides = readOverrides()
  overrides[storeId] = 'closed'
  writeOverrides(overrides)
  return { ...store, status: 'closed' }
}

/** 恢复演示门店为营业中（去掉本地停业覆盖） */
export function reopenStoresForDemo(storeIds: string[]) {
  const overrides = readOverrides()
  let changed = false
  for (const id of storeIds) {
    if (overrides[id] === 'closed') {
      delete overrides[id]
      changed = true
    }
  }
  if (changed) writeOverrides(overrides)
}

export function clearStoreStatusOverrides() {
  localStorage.removeItem(STORE_STATUS_KEY)
}
