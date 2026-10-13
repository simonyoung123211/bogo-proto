import { useMemo, useState } from 'react'
import { REGION_TREE } from '../mockDeliveryFeeData'

interface CityRegionPickerProps {
  selectedIds: string[]
  /** 已被其他规则组占用、不可再选的城市 */
  occupiedIds?: string[]
  onConfirm: (cityIds: string[]) => void
  onClose: () => void
}

export function CityRegionPicker({
  selectedIds,
  occupiedIds = [],
  onConfirm,
  onClose,
}: CityRegionPickerProps) {
  const [draft, setDraft] = useState<string[]>([...selectedIds])
  const occupied = useMemo(() => new Set(occupiedIds.filter((id) => !selectedIds.includes(id))), [occupiedIds, selectedIds])

  const toggleCity = (cityId: string) => {
    if (occupied.has(cityId)) return
    setDraft((prev) => (prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]))
  }

  const provinceState = (provinceId: string): 'all' | 'partial' | 'none' => {
    const province = REGION_TREE.find((p) => p.id === provinceId)
    if (!province) return 'none'
    const selectable = province.cities.filter((c) => !occupied.has(c.id))
    if (selectable.length === 0) return 'none'
    const selectedCount = selectable.filter((c) => draft.includes(c.id)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === selectable.length) return 'all'
    return 'partial'
  }

  /** 勾选省 = 批量选中该省下全部可选城市 */
  const toggleProvince = (provinceId: string) => {
    const province = REGION_TREE.find((p) => p.id === provinceId)
    if (!province) return
    const selectable = province.cities.map((c) => c.id).filter((id) => !occupied.has(id))
    const state = provinceState(provinceId)
    setDraft((prev) => {
      if (state === 'all') {
        return prev.filter((id) => !selectable.includes(id))
      }
      const set = new Set(prev)
      selectable.forEach((id) => set.add(id))
      return [...set]
    })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">选择收货城市</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal__body">
          <div className="city-picker-tree">
            {REGION_TREE.map((province) => {
              const state = provinceState(province.id)
              return (
                <div key={province.id} className="city-picker-province">
                  <label className="checkbox city-picker-province__head">
                    <input
                      type="checkbox"
                      checked={state === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = state === 'partial'
                      }}
                      onChange={() => toggleProvince(province.id)}
                    />
                    <strong>{province.name}</strong>
                    <span className="text-secondary">（批选全省）</span>
                  </label>
                  <div className="city-picker-cities">
                    {province.cities.map((city) => {
                      const blocked = occupied.has(city.id)
                      return (
                        <label
                          key={city.id}
                          className={`checkbox ${blocked ? 'is-disabled' : ''}`}
                          title={blocked ? '已被其他规则组占用' : undefined}
                        >
                          <input
                            type="checkbox"
                            disabled={blocked}
                            checked={draft.includes(city.id)}
                            onChange={() => toggleCity(city.id)}
                          />
                          {city.name}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-secondary" style={{ marginTop: 12 }}>
            已选 {draft.length} 个城市
          </div>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onConfirm(draft)
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
