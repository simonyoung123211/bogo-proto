type ProductSearchField = 'productName' | 'productId'

interface ActivityProductSearchFieldsProps {
  values: Record<ProductSearchField, string>
  onChange: (field: ProductSearchField, value: string) => void
}

/** 活动列表共用的商品筛选项。 */
export function ActivityProductSearchFields({ values, onChange }: ActivityProductSearchFieldsProps) {
  return (
    <>
      <div className="filter-item">
        <label htmlFor="activity-product-name">活动商品名称</label>
        <input
          id="activity-product-name"
          className="input input--filter"
          value={values.productName}
          onChange={(event) => onChange('productName', event.target.value)}
          placeholder="请输入活动商品名称"
        />
      </div>
      <div className="filter-item">
        <label htmlFor="activity-product-id">活动商品 ID</label>
        <input
          id="activity-product-id"
          className="input input--filter"
          value={values.productId}
          onChange={(event) => onChange('productId', event.target.value)}
          placeholder="请输入商品 ID 或 SKU ID"
        />
      </div>
    </>
  )
}
