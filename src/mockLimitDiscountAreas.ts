/** 演示门店的点餐区目录。区域编号只在所属门店内唯一。 */
const areaNames: Record<string, string> = {
  library: '图书馆', cafe: '网吧', spa: '按摩店', park: '产业园', gym: '健身房', books: '书店',
}

const areaIds: Record<string, string[]> = {
  s1: ['library'], s2: ['library', 'cafe'], s3: ['library', 'spa'], s4: ['park', 'books'],
  s5: ['library', 'cafe', 'spa'], s6: ['gym', 'park'], s7: ['books'], s8: ['spa', 'gym'],
  s9: ['books', 'cafe'], s10: ['gym', 'spa'], s11: ['library'], s12: ['park', 'books'],
  s13: ['cafe'], s14: ['gym', 'spa'], s15: ['park'], s16: ['library', 'books'],
  s17: ['library', 'books'], s18: ['library', 'cafe'], s19: ['cafe', 'gym'],
  s21: ['spa', 'cafe'], s22: ['books', 'spa'], s23: ['gym', 'park'],
}

const storesByTag: Record<string, string[]> = {
  flagship: ['s5', 's6', 's7', 's8'],
  mall: ['s9', 's10', 's11', 's12', 's21', 's22', 's23', 's24'],
  campus: ['s17', 's18', 's19', 's20'],
}

export function storeHasDiscountTag(storeId: string, tagId: string) {
  return storesByTag[tagId]?.includes(storeId) ?? false
}

export function getDiscountAreas(storeId: string) {
  return (areaIds[storeId] ?? []).map((id) => ({
    id, name: areaNames[id], allowsDiscount: !(storeId === 's6' && id === 'gym'),
  }))
}
