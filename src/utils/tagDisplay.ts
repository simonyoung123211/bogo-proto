import type { MemberPriceGeneralSettings } from '../types'

export type TagPart = 'price' | 'marketing'
export type TagOrder = 'price_left' | 'label_left'

export function sideOf(part: TagPart, order: TagOrder): 'left' | 'right' {
  const priceSide = order === 'price_left' ? 'left' : 'right'
  if (part === 'price') return priceSide
  return priceSide === 'left' ? 'right' : 'left'
}

type ReorderableTag = Pick<MemberPriceGeneralSettings,
  'tagTextPosition' | 'leftBackgroundColor' | 'rightBackgroundColor' |
  'leftTextColor' | 'rightTextColor' | 'leftBackgroundImage' | 'rightBackgroundImage'>

export function withTagOrder<T extends ReorderableTag>(settings: T, order: MemberPriceGeneralSettings['tagTextPosition']): T {
  return order === settings.tagTextPosition ? settings : {
    ...settings,
    tagTextPosition: order,
    leftBackgroundColor: settings.rightBackgroundColor,
    rightBackgroundColor: settings.leftBackgroundColor,
    leftTextColor: settings.rightTextColor,
    rightTextColor: settings.leftTextColor,
    leftBackgroundImage: settings.rightBackgroundImage,
    rightBackgroundImage: settings.leftBackgroundImage,
  }
}
