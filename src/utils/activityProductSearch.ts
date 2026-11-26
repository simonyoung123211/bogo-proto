import { products } from '../mockData'
import type { Product } from '../types'

interface ProductRange {
  productScope: 'all' | 'partial'
  productSelectionMode?: 'include' | 'exclude'
  productIds: string[]
}

interface ProductFilters {
  productName: string
  productId: string
}

/** 将全部、正选和反选商品范围统一展开为实际参与商品。 */
export function resolveActivityProducts(range: ProductRange): Product[] {
  if (range.productScope === 'all') return products
  const selected = new Set(range.productIds)
  return products.filter((product) =>
    range.productSelectionMode === 'exclude' ? !selected.has(product.id) : selected.has(product.id),
  )
}

/** 名称和 ID 同时填写时，必须由同一件参与商品命中。 */
export function matchesActivityProductFilters(candidates: Product[], filters: ProductFilters): boolean {
  const name = filters.productName.trim().toLowerCase()
  const id = filters.productId.trim().toLowerCase()
  if (!name && !id) return true
  return candidates.some((product) =>
    (!name || product.name.toLowerCase().includes(name))
    && (!id || product.id.toLowerCase().includes(id) || product.skuId.toLowerCase().includes(id)),
  )
}
