import type { ActivityForm, GeneralSettings, MultiItemActivityForm } from '../types'
import { initialActivities } from '../mockData'
import { initialMultiItemActivities } from '../mockMultiItemData'
import { migrateActivity } from './activity'
import { migrateMultiItemActivity } from './multiItemActivity'

const STORAGE_KEY = 'bogo-activities-v1'
const MULTI_ITEM_STORAGE_KEY = 'multi-item-activities-v1'
const GENERAL_SETTINGS_KEY = 'bogo-general-settings-v1'

export const MAX_GIFT_STORAGE_PER_ORDER_LIMIT = 99

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  maxGiftStoragePerOrder: 99,
}

export function loadActivities(): ActivityForm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migrateActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialActivities]
}

export function saveActivities(activities: ActivityForm[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
}

export function loadGeneralSettings(): GeneralSettings {
  try {
    const raw = localStorage.getItem(GENERAL_SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GeneralSettings>
      const max = Number(parsed.maxGiftStoragePerOrder)
      return {
        maxGiftStoragePerOrder: Number.isFinite(max) && max >= 1 && max <= MAX_GIFT_STORAGE_PER_ORDER_LIMIT
          ? max
          : DEFAULT_GENERAL_SETTINGS.maxGiftStoragePerOrder,
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_GENERAL_SETTINGS }
}

export function saveGeneralSettings(settings: GeneralSettings): void {
  localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings))
}

export function loadMultiItemActivities(): MultiItemActivityForm[] {
  try {
    const raw = localStorage.getItem(MULTI_ITEM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migrateMultiItemActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialMultiItemActivities]
}

export function saveMultiItemActivities(activities: MultiItemActivityForm[]): void {
  localStorage.setItem(MULTI_ITEM_STORAGE_KEY, JSON.stringify(activities))
}
