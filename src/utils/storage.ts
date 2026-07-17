import type {
  ActivityForm,
  FullReductionActivityForm,
  GeneralSettings,
  MemberPriceActivityForm,
  MemberPriceGeneralSettings,
  MultiItemActivityForm,
} from '../types'
import { initialActivities } from '../mockData'
import { initialFullReductionActivities } from '../mockFullReductionData'
import { initialMemberPriceActivities } from '../mockMemberPriceData'
import { initialMultiItemActivities } from '../mockMultiItemData'
import { migrateActivity } from './activity'
import { migrateFullReductionActivity } from './fullReductionActivity'
import { migrateMemberPriceActivity } from './memberPriceActivity'
import { migrateMultiItemActivity } from './multiItemActivity'

const STORAGE_KEY = 'bogo-activities-v1'
const MULTI_ITEM_STORAGE_KEY = 'multi-item-activities-v1'
const MEMBER_PRICE_STORAGE_KEY = 'member-price-activities-v1'
const FULL_REDUCTION_STORAGE_KEY = 'full-reduction-activities-v1'
const GENERAL_SETTINGS_KEY = 'bogo-general-settings-v1'
const MEMBER_PRICE_GENERAL_SETTINGS_KEY = 'member-price-general-settings-v1'

export const MAX_GIFT_STORAGE_PER_ORDER_LIMIT = 99

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  maxGiftStoragePerOrder: 99,
}

export const DEFAULT_MEMBER_PRICE_GENERAL_SETTINGS: MemberPriceGeneralSettings = {
  customPromotionTagEnabled: true,
  tagContentMode: 'default',
  customTagText: '',
  styleMode: 'custom',
  backgroundStyle: 'solid',
  leftBackgroundImage: '',
  rightBackgroundImage: '',
  leftBackgroundColor: '#F9EDC0',
  leftTextColor: '#6B5215',
  rightBackgroundColor: '#33302B',
  rightTextColor: '#F5D890',
  tagPosition: 'default',
  showOriginalPrice: false,
  activityPriceColor: '#FF4D4F',
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

export function loadMemberPriceActivities(): MemberPriceActivityForm[] {
  try {
    const raw = localStorage.getItem(MEMBER_PRICE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migrateMemberPriceActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialMemberPriceActivities]
}

export function saveMemberPriceActivities(activities: MemberPriceActivityForm[]): void {
  localStorage.setItem(MEMBER_PRICE_STORAGE_KEY, JSON.stringify(activities))
}

export function loadMemberPriceGeneralSettings(): MemberPriceGeneralSettings {
  try {
    const raw = localStorage.getItem(MEMBER_PRICE_GENERAL_SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MemberPriceGeneralSettings> &
        Record<string, unknown>
      // 旧版本字段迁移：原 left* 控制文案段、price* 控制价格段，
      // 新版本 left* 为左侧价格段、right* 为右侧文案段
      if (typeof parsed.priceBackgroundColor === 'string') {
        parsed.rightBackgroundColor = parsed.leftBackgroundColor as string
        parsed.rightTextColor = parsed.leftTextColor as string
        parsed.rightBackgroundImage = (parsed.leftBackgroundImage as string) ?? ''
        parsed.leftBackgroundColor = parsed.priceBackgroundColor as string
        parsed.leftTextColor = parsed.priceTextColor as string
        parsed.leftBackgroundImage = (parsed.priceBackgroundImage as string) ?? ''
        delete parsed.priceBackgroundColor
        delete parsed.priceTextColor
        delete parsed.priceBackgroundImage
      }
      return { ...DEFAULT_MEMBER_PRICE_GENERAL_SETTINGS, ...parsed }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_MEMBER_PRICE_GENERAL_SETTINGS }
}

export function saveMemberPriceGeneralSettings(settings: MemberPriceGeneralSettings): void {
  localStorage.setItem(MEMBER_PRICE_GENERAL_SETTINGS_KEY, JSON.stringify(settings))
}

export function loadFullReductionActivities(): FullReductionActivityForm[] {
  try {
    const raw = localStorage.getItem(FULL_REDUCTION_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migrateFullReductionActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialFullReductionActivities]
}

export function saveFullReductionActivities(activities: FullReductionActivityForm[]): void {
  localStorage.setItem(FULL_REDUCTION_STORAGE_KEY, JSON.stringify(activities))
}
