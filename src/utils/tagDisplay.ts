export type TagPart = 'price' | 'marketing'
export type TagOrder = 'price_left' | 'label_left'

export function sideOf(part: TagPart, order: TagOrder): 'left' | 'right' {
  const priceSide = order === 'price_left' ? 'left' : 'right'
  if (part === 'price') return priceSide
  return priceSide === 'left' ? 'right' : 'left'
}
