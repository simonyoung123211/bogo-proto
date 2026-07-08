import { useMemo, useState } from 'react'
import { products } from '../mockData'
import type { Product } from '../types'

export const GIFT_PRODUCT_MAX = 50

interface GiftProductTableProps {
  productIds: string[]
  readOnly?: boolean
  onChange: (ids: string[]) => void
  onAdd: () => void
  /** 嵌入赠品组时使用，不包裹外层 FormRow */
  embedded?: boolean
  label?: string
}

export function GiftProductTable({
  productIds,
  readOnly,
  onChange,
  onAdd,
  embedded = false,
  label = '赠送商品',
}: GiftProductTableProps) {
  const [checked, setChecked] = useState<string[]>([])

  const items = useMemo(
    () => products.filter((p) => productIds.includes(p.id)),
    [productIds],
  )

  const allChecked = items.length > 0 && checked.length === items.length

  const toggleAll = () => {
    setChecked(allChecked ? [] : items.map((p) => p.id))
  }

  const toggleOne = (id: string) => {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const removeOne = (id: string) => {
    onChange(productIds.filter((x) => x !== id))
    setChecked((prev) => prev.filter((x) => x !== id))
  }

  const batchRemove = () => {
    if (checked.length === 0) return
    onChange(productIds.filter((id) => !checked.includes(id)))
    setChecked([])
  }

  const table = (
    <div className="gift-product-block">
      {!readOnly && (
        <div className="gift-product-toolbar">
          <div className="gift-product-toolbar__left">
            <button type="button" className="btn btn--primary" onClick={onAdd}>
              添加商品
            </button>
            <span className="gift-product-hint">
              赠送商品最多可添加{GIFT_PRODUCT_MAX}个SKU
            </span>
          </div>
          <button
            type="button"
            className="link-btn gift-product-batch"
            disabled={checked.length === 0}
            onClick={batchRemove}
          >
            批量移除
          </button>
        </div>
      )}

      <table className="table table--gift">
        <thead>
          <tr>
            {!readOnly && (
              <th style={{ width: 40 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              </th>
            )}
            <th>商品名称</th>
            <th>规格</th>
            <th>商品标识</th>
            <th>商品条码</th>
            <th>商品规格码</th>
            <th>销售价</th>
            {!readOnly && <th>操作</th>}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={readOnly ? 6 : 8} className="table-empty">暂无数据</td>
            </tr>
          ) : (
            items.map((p) => (
              <GiftProductRow
                key={p.id}
                product={p}
                readOnly={readOnly}
                checked={checked.includes(p.id)}
                onToggle={() => toggleOne(p.id)}
                onRemove={() => removeOne(p.id)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )

  if (embedded) return table

  return (
    <FormRow label={label} required>
      {table}
    </FormRow>
  )
}

function GiftProductRow({
  product: p,
  readOnly,
  checked,
  onToggle,
  onRemove,
}: {
  product: Product
  readOnly?: boolean
  checked: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  return (
    <tr>
      {!readOnly && (
        <td>
          <input type="checkbox" checked={checked} onChange={onToggle} />
        </td>
      )}
      <td>
        <div>{p.name}</div>
        <div className="text-secondary mono">{p.id}</div>
      </td>
      <td>
        <div>{p.spec || '--'}</div>
        <div className="text-secondary mono">SKU_ID: {p.skuId}</div>
      </td>
      <td>{p.identifier || '--'}</td>
      <td>{p.barcode || '--'}</td>
      <td>{p.specCode || '--'}</td>
      <td>{p.price}</td>
      {!readOnly && (
        <td>
          <button type="button" className="link-btn" onClick={onRemove}>移除</button>
        </td>
      )}
    </tr>
  )
}

function FormRow({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="form-row form-row--top">
      <label className="form-label">
        {required && <span className="required">*</span>}
        {label}
      </label>
      <div className="form-control">{children}</div>
    </div>
  )
}
