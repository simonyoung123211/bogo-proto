import type {
  ActivityForm,
  FullReductionActivityForm,
  GeneralSettings,
  MemberPriceActivityForm,
  MemberPriceGeneralSettings,
  MultiItemActivityForm,
  PaidMemberCardTemplate,
  PaidMemberPriceActivityForm,
  StoredValuePayActivityForm,
  StoredValuePayGeneralSettings,
} from '../types'
import { initialActivities } from '../mockData'
import { initialFullReductionActivities } from '../mockFullReductionData'
import { initialMemberPriceActivities } from '../mockMemberPriceData'
import { initialMultiItemActivities } from '../mockMultiItemData'
import {
  initialPaidMemberCards,
  initialPaidMemberPriceActivities,
} from '../mockPaidMemberPriceData'
import { initialStoredValuePayActivities } from '../mockStoredValuePayData'
import { migrateActivity } from './activity'
import { migrateFullReductionActivity } from './fullReductionActivity'
import { migrateMemberPriceActivity } from './memberPriceActivity'
import { migrateMultiItemActivity } from './multiItemActivity'
import { migratePaidMemberPriceActivity } from './paidMemberPriceActivity'
import { migrateStoredValuePayActivity } from './storedValuePayActivity'

const STORAGE_KEY = 'bogo-activities-v1'
const MULTI_ITEM_STORAGE_KEY = 'multi-item-activities-v1'
const MEMBER_PRICE_STORAGE_KEY = 'member-price-activities-v1'
const FULL_REDUCTION_STORAGE_KEY = 'full-reduction-activities-v1'
const PAID_MEMBER_PRICE_STORAGE_KEY = 'paid-member-price-activities-v1'
const PAID_MEMBER_CARD_STORAGE_KEY = 'paid-member-cards-v1'
const STORED_VALUE_PAY_STORAGE_KEY = 'stored-value-pay-activities-v1'
const GENERAL_SETTINGS_KEY = 'bogo-general-settings-v1'
const MEMBER_PRICE_GENERAL_SETTINGS_KEY = 'member-price-general-settings-v1'
const STORED_VALUE_PAY_GENERAL_SETTINGS_KEY = 'stored-value-pay-general-settings-v1'

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
      return ensureStoreClosureDemoActivities(parsed.map((a) => migrateActivity(a)))
    }
  } catch {
    /* ignore */
  }
  return [...initialActivities]
}

/** 为已有本地缓存补齐「已停业清理」演示活动，避免清缓存才能看到 */
function ensureStoreClosureDemoActivities(list: ActivityForm[]): ActivityForm[] {
  const demos = initialActivities.filter(
    (a) => a.id === 'ACT20240924010' || a.id === 'ACT20240924011',
  )
  let next = list
  for (const demo of demos) {
    if (!next.some((a) => a.id === demo.id)) {
      next = [migrateActivity(demo as unknown as Record<string, unknown>), ...next]
    }
  }
  return next
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

export function loadPaidMemberPriceActivities(): PaidMemberPriceActivityForm[] {
  try {
    const raw = localStorage.getItem(PAID_MEMBER_PRICE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migratePaidMemberPriceActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialPaidMemberPriceActivities]
}

export function savePaidMemberPriceActivities(activities: PaidMemberPriceActivityForm[]): void {
  localStorage.setItem(PAID_MEMBER_PRICE_STORAGE_KEY, JSON.stringify(activities))
}

export function loadPaidMemberCards(): PaidMemberCardTemplate[] {
  try {
    const raw = localStorage.getItem(PAID_MEMBER_CARD_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PaidMemberCardTemplate[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    /* ignore */
  }
  return [...initialPaidMemberCards]
}

export function savePaidMemberCards(cards: PaidMemberCardTemplate[]): void {
  localStorage.setItem(PAID_MEMBER_CARD_STORAGE_KEY, JSON.stringify(cards))
}

export const DEFAULT_STORED_VALUE_PAY_GENERAL_SETTINGS: StoredValuePayGeneralSettings = {
  customPromotionTagEnabled: false,
  tagContentMode: 'default',
  customTagText: '',
  styleMode: 'default',
  backgroundStyle: 'solid',
  leftBackgroundImage: '',
  rightBackgroundImage: '',
  leftBackgroundColor: '#010000',
  leftTextColor: '#EEEDED',
  rightBackgroundColor: '#E20303',
  rightTextColor: '#FFFFFF',
  fullOrderBalanceThreshold: 'payable_after_activity',
}

export function loadStoredValuePayActivities(): StoredValuePayActivityForm[] {
  try {
    const raw = localStorage.getItem(STORED_VALUE_PAY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map((a) => migrateStoredValuePayActivity(a))
    }
  } catch {
    /* ignore */
  }
  return [...initialStoredValuePayActivities]
}

export function saveStoredValuePayActivities(activities: StoredValuePayActivityForm[]): void {
  localStorage.setItem(STORED_VALUE_PAY_STORAGE_KEY, JSON.stringify(activities))
}

export function loadStoredValuePayGeneralSettings(): StoredValuePayGeneralSettings {
  try {
    const raw = localStorage.getItem(STORED_VALUE_PAY_GENERAL_SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredValuePayGeneralSettings>
      return { ...DEFAULT_STORED_VALUE_PAY_GENERAL_SETTINGS, ...parsed }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_STORED_VALUE_PAY_GENERAL_SETTINGS }
}

export function saveStoredValuePayGeneralSettings(settings: StoredValuePayGeneralSettings): void {
  localStorage.setItem(STORED_VALUE_PAY_GENERAL_SETTINGS_KEY, JSON.stringify(settings))
}
