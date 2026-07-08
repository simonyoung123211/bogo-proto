import { useMemo, useState } from 'react'
import { categories, products } from '../mockData'

interface ProductPickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onClose: () => void
  title?: string
  maxCount?: number
}

export function ProductPicker({
  selectedIds,
  onChange,
  onClose,
  title = '选择商品',
  maxCount,
}: ProductPickerProps) {
  const [categoryId, setCategoryId] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIds)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false
      if (keyword && !p.name.includes(keyword) && !p.code.includes(keyword)) return false
      return true
    })
  }, [categoryId, keyword])

  const toggle = (id: string) => {
    setLocalSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (maxCount !== undefined && prev.length >= maxCount) return prev
      return [...prev, id]
    })
  }

  const selectedProducts = products.filter((p) => localSelected.includes(p.id))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="picker-layout">
          <aside className="picker-sidebar">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`picker-sidebar__item ${categoryId === c.id ? 'is-active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </aside>
          <div className="picker-main">
            <div className="picker-toolbar">
              <input
                className="input"
                placeholder="请输入商品名称/编码"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>商品名称</th>
                  <th>规格</th>
                  <th>类目</th>
                  <th>编码</th>
                  <th>销售价</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => toggle(p.id)} className="table-row--clickable">
                    <td>
                      <input type="checkbox" checked={localSelected.includes(p.id)} readOnly />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.spec}</td>
                    <td>{p.categoryName}</td>
                    <td>{p.code}</td>
                    <td>¥{p.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="picker-selected">
            <div className="picker-selected__title">
              已选 ({localSelected.length}{maxCount !== undefined ? `/${maxCount}` : ''})
            </div>
            <div className="picker-selected__list">
              {selectedProducts.map((p) => (
                <div key={p.id} className="picker-selected__item">
                  <span>{p.name}</span>
                  <button type="button" onClick={() => toggle(p.id)}>×</button>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onChange(localSelected)
              onClose()
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
