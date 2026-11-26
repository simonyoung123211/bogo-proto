import type { ActivityPerspective, LimitDiscountActivityForm } from './types'

const brandPerspective = { id: 'demo-brand', type: 'brand', name: '餐饮2.0', code: 'BRAND01', parentId: 'demo-group' } as const
const eastPerspective = { id: 'demo-east', type: 'store_group', name: '华东组', code: 'EAST01', parentId: brandPerspective.id } as const

export const DEFAULT_LIMIT_DISCOUNT_PERSPECTIVE: ActivityPerspective = brandPerspective
export const LIMIT_DISCOUNT_PERSPECTIVES: readonly ActivityPerspective[] = [
  { id: 'demo-group', type: 'group', name: '餐饮集团', code: 'GROUP01' },
  brandPerspective,
  eastPerspective,
  { id: 'demo-north', type: 'store_group', name: '华北组', code: 'NORTH01', parentId: brandPerspective.id },
  { id: 'demo-store', type: 'store', name: '上海静安寺店', code: 'SH001', parentId: eastPerspective.id },
]

const EAST_DEMO_ACTIVITY_IDS = new Set(['XSZK20261111001', 'XSZK20261001001'])

export function getLegacyLimitDiscountPerspective(id?: string): ActivityPerspective {
  return id && EAST_DEMO_ACTIVITY_IDS.has(id) ? eastPerspective : brandPerspective
}

// This prototype catalog contains one brand. Its brand perspective can manage
// its own activities and those created by a store group or store.
export function canManageLimitDiscountActivity(activity: LimitDiscountActivityForm, perspective: ActivityPerspective): boolean {
  const ownerId = activity.creatorPerspectiveId ?? getLegacyLimitDiscountPerspective(activity.id).id
  if (ownerId === perspective.id) return true
  return perspective.id === brandPerspective.id && LIMIT_DISCOUNT_PERSPECTIVES.some(
    (option) => option.id === ownerId && (option.type === 'store_group' || option.type === 'store'),
  )
}
