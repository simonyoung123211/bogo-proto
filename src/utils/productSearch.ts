import type { Product } from '../types'

/**
 * 已选商品列表的关键词检索。检索维度与「选择商品」弹窗保持一致：
 * 商品名称 / 商品 ID / 商品编码，忽略大小写与首尾空格。
 */
export function matchesProductKeyword(product: Product, keyword: string): boolean {
  const k = keyword.trim().toLowerCase()
  if (!k) return true
  return (
    product.name.toLowerCase().includes(k) ||
    product.id.toLowerCase().includes(k) ||
    product.code.toLowerCase().includes(k)
  )
}

export function filterProductsByKeyword(list: Product[], keyword: string): Product[] {
  if (!keyword.trim()) return list
  return list.filter((p) => matchesProductKeyword(p, keyword))
}
